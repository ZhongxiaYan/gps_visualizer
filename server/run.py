import os, sys

import gpxpy, datetime, bisect, io, json
from flask import Flask, render_template, request, jsonify, send_file
from util import *

static_dir = os.path.join(os.path.dirname(__file__), '../static')
app = Flask(__name__, static_folder=os.path.join(static_dir, 'dist'), template_folder=static_dir)

Time_format = '%Y-%m-%dT%H:%M:%S.%f'

@app.route('/')
def map_():
    return render_template('index.html')

def read_gpx(track_name, gpx_file):
    with open(gpx_file, 'r') as f:
        gpx = gpxpy.parse(f)
    gps = [{
        'track': track_name,
        'time': point.time.strftime(Time_format),
        'latitude': point.latitude,
        'longitude': point.longitude
    } for point in gpx.tracks[0].segments[0].points]
    for g in gps:
        g['key'] = g['track'] + '_' + g['time']
    return gps

def get_location(gps_track, gps_times, time):
    index_right = bisect.bisect_left(gps_times, time)
    if index_right == 0 or index_right == len(gps_times) or gps_times[index_right] == time:
        if index_right == len(gps_times):
            index_right -= 1
        point = gps_track[index_right]
        latitude = point['latitude']
        longitude = point['longitude']
        elevation = point['elevation']
        dop = point['dop']
    else:
        index_left = index_right - 1
        point_left = gps_track[index_left]
        point_right = gps_track[index_right]
        right_gap = (point_right['time'] - time).total_seconds()
        left_gap = (time - point_left['time']).total_seconds()
        weigh = lambda l, r: (left_gap * r + right_gap * l) / (left_gap + right_gap)
        latitude = weigh(point_left['latitude'], point_right['latitude'])
        longitude = weigh(point_left['longitude'], point_right['longitude'])
        elevation = weigh(point_left['elevation'], point_right['elevation'])
        if point_left['dop'] is None: dop = point_right['dop']
        elif point_right['dop'] is None: dop = point_left['dop']
        else: dop = weigh(point_left['dop'], point_right['dop'])
    return {
        'latitude' : latitude,
        'longitude' : longitude,
        'elevation' : elevation,
        'dop' : dop
    }

@app.route('/init')
def init():
    p = app.config['paths']

    gps_data = {}
    for name, path in list_dir(p.gps_dir, 'gpx', return_name=True):
        gps_data[name] = read_gpx(name, path)

    image_data = []
    for name, path in list_dir(p.preview_dir, 'jpg', return_name=True):
        image_data.append({
            'key': name,
            'time': name
        })

    return jsonify(gps=gps_data, images=image_data)

@app.route('/preview/<name>')
def get_preview(name):
    p = app.configs['paths']
    return send_file(os.path.join(p.preview_dir, name), mimetype='image/jpeg')

class P:
    def __init__(self, data_dir):
        self.dir = data_dir

    @property
    def gps_dir(self):
        return os.path.join(self.dir, 'gps')

    @property
    def preview_dir(self):
        return os.path.join(self.dir, 'previews')

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('data', default='./')
    args = parser.parse_args()

    app.config['paths'] = P(args.data)
    app.run(debug=True)
