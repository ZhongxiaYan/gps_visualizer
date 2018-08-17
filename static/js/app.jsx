import React from "react";
import {Map, Marker, InfoWindow, Polyline, GoogleApiWrapper} from "google-maps-react";
import update from "immutability-helper"

const colors = ["black", "green", "blue", "cyan", "magenta", "violet", "brown"];
const selectColor = "red";

const flatMap = (f, xs) => xs.map(f).reduce((x, y) => x.concat(y), [])

Array.prototype.flatMap = function(f) {
    return flatMap(f, this)
}

Marker.prototype.shouldComponentUpdate = function(nextProps, nextState) {
    return (this.props.map !== nextProps.map) || 
           (this.props.position.lat !== nextProps.position.lat) ||
           (this.props.position.lng !== nextProps.position.lng);
}

Marker.prototype.componentDidUpdate = function(prevProps) {
    if (this.marker) {
        this.marker.setMap(null);
    }
    this.renderMarker();
}

function get_icon(color, type) {
    if (type === "dot") {
        return {
            path: window.google.maps.SymbolPath.CIRCLE,
            fill: true,
            fillColor: color,
            fillOpacity: 1.0,
            strokeColor: color,
            scale: 2
        };
    } else if (type === "pin") {

    }
};

function processDataGps(resJson) {
    var gps = resJson["gps"];
    var trackColors = {};
    var names = Object.keys(gps);
    for (var i = 0; i < names.length; i++) {
        var trackName = names[i];

        var track = {};
        gps[trackName].forEach(function(loc) {
            track[loc.key] = loc;
            loc["time"] = new Date(loc["time"])
        });
        gps[trackName] = track;
        trackColors[trackName] = colors[i];
    }
    resJson["gps"] = gps;
    resJson["trackColors"] = trackColors;
}

function processDataImages(resJson) {
    var images = resJson["images"];
    for (var i = 0; i < images.length; i++) {
        let image = images[i];
        image["index"] = i;
        image["time"] = new Date(image["time"])
    }
}

function processData(resJson) {
    processDataGps(resJson);
    processDataImages(resJson);
    this.setState(resJson);
}

export class MapWrapper extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            gps: {},
            trackColors: {},
            images: [],
            currImageIndex: 0
        };
    }

    componentDidMount() {
        let url = '/init'
        fetch(url).then(res => res.json()).then(processData.bind(this));
    }

    markerMoved(props, marker, e) {
        let lat = e.latLng.lat();
        let lng = e.latLng.lng();
        let newState = update(
            this.state,
            {"gps": {[marker.trackName]: {[marker.name]: {latitude: {$set: lat}, longitude: {$set: lng}}}}}
        );
        this.setState(newState);
    }

    renderMarker(trackName, loc, color, icon_type) {
        let icon = get_icon(color, icon_type);
        let title = [trackName, loc.time, loc.latitude, loc.longitude].join(" | ");
        return <Marker 
            key={loc.key}
            trackName={trackName}
            name={loc.key}
            title={title}
            position={{
                lat: loc.latitude,
                lng: loc.longitude
            }}
            icon={icon}
            draggable={true}
            onDragend={this.markerMoved.bind(this)} />;
    }

    renderPolyline(trackName, gps, color) {
        let locs = gps.map(loc => ({lat: loc.latitude, lng: loc.longitude}));
        return <Polyline key={trackName} name={trackName} path={locs} strokeWeight={2} strokeColor={color} />;        
    }

    renderTrack(trackName) {
        let gps = this.state.gps[trackName];
        let color = this.state.trackColors[trackName];
        let gpsValues = Object.values(gps).sort((a, b) => ((a.time < b.time) ? -1 : 1));
        let markers = gpsValues.map(loc => this.renderMarker(trackName, loc, color, "dot"));
        return markers.concat([this.renderPolyline(trackName, gpsValues, color)]);
    }

    render() {
        let tracks = Object.keys(this.state.gps).flatMap(key => this.renderTrack(key));

        return (
            <Map
                google={this.props.google}
                initialCenter={{
                    lat: 37.872008,
                    lng: -122.260549
                }}
                zoom={16}>
                {tracks}
            </Map>
        );
    }
}

export default GoogleApiWrapper({
    apiKey: process.env.GAPI_KEY
})(MapWrapper)