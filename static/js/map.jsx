import React from "react";
import {Map, Marker, Polyline, GoogleApiWrapper} from "google-maps-react";
import update from "immutability-helper";

const colors = ["green", "blue", "cyan", "magenta", "violet", "brown"];
const imageNormalColor = "black";
const imageFaultColor = "red";

function get_dot_icon(color, scale) {
    return {
        path: window.google.maps.SymbolPath.CIRCLE,
        fill: true,
        fillColor: color,
        fillOpacity: 1.0,
        strokeColor: color,
        scale: scale
    };
}

function get_pin_icon(color) {
    return {
        path: "M0-48c-9.8 0-17.7 7.8-17.7 17.4 0 15.5 17.7 30.6 17.7 30.6s17.7-15.4 17.7-30.6c0-9.6-7.9-17.4-17.7-17.4z",
        fill: true,
        fillColor: color,
        fillOpacity: 0.7,
        strokeColor: color
    }
}

// hacky patches to fix https://github.com/fullstackreact/google-maps-react/tree/master/src/components
Marker.prototype.shouldComponentUpdate = function(nextProps, nextState) {
    return (this.props.map !== nextProps.map) ||
           (this.props.position.lat !== nextProps.position.lat) ||
           (this.props.position.lng !== nextProps.position.lng) ||
           ("scale" in this.props.icon && (this.props.icon.scale !== nextProps.icon.scale));
}

Marker.prototype.componentDidUpdate = function(prevProps) {
    if (this.marker) {
        this.marker.setMap(null);
    }
    this.renderMarker();
}

function processDataGps(resJson) {
    let gps = resJson.gps;
    let trackColors = {};
    let names = Object.keys(gps);
    for (var i = 0; i < names.length; i++) {
        let trackName = names[i];

        let track = {};
        gps[trackName].forEach(function(loc) {
            track[loc.key] = loc;
            loc.time = new Date(loc.time)
        });
        gps[trackName] = track;
        trackColors[trackName] = colors[i];
    }
    resJson.gps = gps;
    resJson.trackColors = trackColors;
}

class MapWrapper extends React.Component {
    constructor(props) {
        super(props);
        this.lastClickedGps = null;
    }

    gpsOnDragend(props, marker, e) {
        let lat = e.latLng.lat();
        let lng = e.latLng.lng();
        this.props.updateGps({[props.trackIndex]: {[props.index]: {latitude: {$set: lat}, longitude: {$set: lng}}}});
    }

    gpsOnLeftClick(props, marker, e) {
        let selectedGps = this.props.selectedGps;
        let lastClickedGps = this.lastClickedGps;
        let evt = e.va;

        var newSelectedGps;
        var setLastClickedGps = true;
        if (this.lastClickedGps !== null && props.trackIndex !== this.lastClickedGps.trackIndex) {
            this.lastClickedGps = null;
        }
        if (evt.shiftKey && this.lastClickedGps !== null) {
            let startIndex = Math.min(props.index, this.lastClickedGps.locIndex);
            let endIndex = Math.max(props.index, this.lastClickedGps.locIndex) + 1;
            let track = this.props.tracks[props.trackIndex];
            newSelectedGps = {}
            while (startIndex < endIndex) {
                let loc = track[startIndex];
                newSelectedGps[loc.key] = {
                    trackIndex: loc.trackIndex,
                    locIndex: loc.index
                };
                startIndex++;
            }
        } else if (evt.ctrlKey) {
            let loc = this.props.tracks[props.trackIndex][props.index];
            if (loc.key in selectedGps) {
                newSelectedGps = update(selectedGps, {$unset: [loc.key]});
                setLastClickedGps = false;
            } else {
                newSelectedGps = update(
                    selectedGps,
                    {[loc.key]: {$set: {trackIndex: loc.trackIndex, locIndex: loc.index}}}
                );
            }
        } else {
            let loc = this.props.tracks[props.trackIndex][props.index];
            newSelectedGps = {
                [loc.key]: {
                    trackIndex: loc.trackIndex,
                    locIndex: loc.index
                }
            };
        }
        if (setLastClickedGps) {
            this.lastClickedGps = {
                trackIndex: props.trackIndex,
                locIndex: props.index
            };
        }
        this.props.updateSelectedGps({$set: newSelectedGps});
    }

    gpsOnDblClick(props, marker, e) {
        let selectedGps = this.props.selectedGps;
        let clickLoc = this.props.tracks[props.trackIndex][props.index];
        if (clickLoc.key in selectedGps) {
            this.lastClickedGps = null;
            let tracks = this.props.tracks;
            let newTracks = this.props.tracks.map(track => {
                let newTrack = track.filter(loc => !(loc.key in selectedGps));
                newTrack.key = track.key;
                newTrack.index = track.index;
                newTrack.forEach((loc, locIndex) => {
                    loc.index = locIndex;
                });
                return newTrack;
            });
            
            this.props.updateGps({$set: newTracks});
            this.props.updateSelectedGps({$set: {}});
        }
    }

    renderMarker(track, loc, color, size) {
        let title = [track.name, loc.time, loc.latitude, loc.longitude].join(" | ");
        return <Marker 
            key={loc.key}
            trackIndex={track.index}
            index={loc.index}
            title={title}
            position={{lat: loc.latitude, lng: loc.longitude}}
            icon={get_dot_icon(color, size)}
            draggable={true}
            onDragend={this.gpsOnDragend.bind(this)}
            onClick={this.gpsOnLeftClick.bind(this)}
            onDblclick={this.gpsOnDblClick.bind(this)}
            zIndex={999} />;
    }

    renderPolyline(track, color) {
        let locs = track.map(loc => ({lat: loc.latitude, lng: loc.longitude}));
        return <Polyline key={track.key} name={track.key} path={locs} strokeWeight={2} strokeColor={color} />;
    }

    renderTrack(track) {
        let color = colors[track.index];
        let markers = track.map(loc => this.renderMarker(track, loc, color, (loc.key in this.props.selectedGps) ? 4 : 2));
        return markers.concat([this.renderPolyline(track, color)]);
    }

    interpolateImagePositions(images, tracks) {
        let mergedTrack = tracks.flatMap(t => t.map(loc => {
            loc.trackIndex = t.index;
            return loc;
        }));
        
        let imageIndex = 0;
        for (var i = 0; i < mergedTrack.length - 1; i++) { // iterate over pairs of locs
            let prev = mergedTrack[i];
            var next = mergedTrack[i + 1];
            let prevTime = prev.time.getTime();
            let nextTime = next.time.getTime();

            while (imageIndex < images.length) {
                let image = images[imageIndex];
                let imTime = image.time.getTime();
                if (imTime < prevTime) { // this should only happen if image is before the first loc in mergedTrack
                    image.position = {
                        lat: prev.latitude,
                        lng: prev.longitude
                    };
                    image.inTrack = false;
                    image.trackIndex = prev.trackIndex;
                } else if (imTime > nextTime) {
                    break;
                } else { // image is between prev and next
                    let weightPrev = nextTime - imTime;
                    let weightNext = imTime - prevTime;
                    image.position = {
                        lat: (weightPrev * prev.latitude + weightNext * next.latitude) / (weightPrev + weightNext),
                        lng: (weightPrev * prev.longitude + weightNext * next.longitude) / (weightPrev + weightNext)
                    }
                    if (prev.trackIndex === next.trackIndex) {
                        image.inTrack = true;
                        image.trackIndex = prev.trackIndex;
                    } else {
                        image.inTrack = false;
                        image.trackIndex = (weightPrev >= weightNext) ? prev.trackIndex : next.trackIndex;
                    }
                }
                imageIndex++;
            }
        }
        while (imageIndex < images.length) { // tail edge, image is after the last loc
            let image = images[imageIndex];
            image.position = {
                lat: next.latitude,
                lng: next.longitude
            };
            image.inTrack = false;
            image.trackIndex = next.trackIndex;
            imageIndex++;
        }
    }

    imageOnDragend(props, marker, e) {
        let track = this.props.tracks[props.trackIndex];
        var i = 0;
        if (props.time > track[0].time) {
            for (i = 1; i < track.length; i++) {
                if (props.time <= track[i].time) {
                    break;
                }
            }
        }
        if (props.time === track[i].time) {
            // move the existing gps marker
            let mockGpsMarkerProps = {
                trackIndex: props.trackIndex,
                index: i
            };
            this.gpsOnDragend(mockGpsMarkerProps, null, e);
        } else {
            // create a new marker at this time and place
            let newLoc = {
                key: props.time.toString(),
                time: props.time,
                latitude: e.latLng.lat(),
                longitude: e.latLng.lng()
            }
            this.props.updateGps({[props.trackIndex]: {$splice: [[i, 0, newLoc]]}});
        }
    }

    renderCurrImage(image) {
        return (<Marker 
            key={image.key}
            title={image.index + '_' + image.key}
            time={image.time}
            position={image.position}
            trackIndex={image.trackIndex}
            icon={get_pin_icon(image.inTrack ? imageNormalColor : imageFaultColor)}
            draggable={true}
            onDragend={this.imageOnDragend.bind(this)} />
        );
    }

    renderOtherImage(image) {
        return (<Marker 
            key={image.key}
            title={image.index + '_' + image.key}
            position={image.position}
            icon={get_dot_icon(image.inTrack ? imageNormalColor : imageFaultColor, 2)} />
        );
    }

    renderImageLocations(images, tracks, currImageIndex, viewAll) {
        this.interpolateImagePositions(images, tracks);
        let markers = images;
        if (!viewAll) {
            markers = markers.filter(img => (img.index === currImageIndex || img.trackIndex === null));
        }
        return markers.map(img => (img.index === currImageIndex) ? this.renderCurrImage(img) : this.renderOtherImage(img));
    }

    render() {
        let trackComponents = this.props.tracks.flatMap(track => this.renderTrack(track));
        let imageComponents = this.renderImageLocations(
            this.props.images,
            this.props.tracks,
            this.props.currImageIndex,
            this.props.viewAll
        );

        return (
            <Map
                google={this.props.google}
                initialCenter={{
                    lat: 37.872008,
                    lng: -122.260549
                }}
                zoom={16}>
                {trackComponents}
                {imageComponents}
            </Map>
        );
    }
}

export default GoogleApiWrapper({
    apiKey: process.env.GAPI_KEY
})(MapWrapper)