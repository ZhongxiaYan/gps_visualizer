import React, { Fragment } from "react";
import update from "immutability-helper";

import GoogleMap from "./map.jsx";
import ImageViewer from "./viewer.jsx"

const flatMap = (f, xs) => xs.map(f).reduce((x, y) => x.concat(y), [])

Array.prototype.flatMap = function(f) {
    return flatMap(f, this)
}

function processDataGps(resJson) {
    let tracks = resJson.tracks;
    let newTracks = Object.entries(tracks).map((trackEntry, trackIndex) => {
        let [trackKey, track] = trackEntry;
        track.index = trackIndex;
        track.key = trackKey;
        track.forEach((loc, locIndex) => {
            loc.index = locIndex;
            loc.time = new Date(loc.time);
        });
        return track;
    });
    resJson.tracks = newTracks;
}

function processDataImages(resJson) {
    var images = resJson["images"];
    images.forEach((image, imageIndex) => {
        image.index = imageIndex;
        image.time = new Date(image.time);
    });
}

function processData(resJson) {
    processDataGps(resJson);
    processDataImages(resJson);
    this.setState(resJson);
}

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            tracks: [],
            images: [],
            currImageIndex: 0,
            viewAll: false,
            selectedGps: {}
        };
    }

    componentDidMount() {
        let url = '/init'
        fetch(url).then(res => res.json()).then(processData.bind(this));
    }

    updateState(key, updateValue) {
        this.setState(update(this.state, {[key]: updateValue}));
    }

    render() {
        return (
            <Fragment>
                <div id="viewer" style={{float: "left", width: "30%", height: "100%"}} >
                    <ImageViewer
                        images={this.state.images}
                        currImageIndex={this.state.currImageIndex}
                        updateImageIndex={state => this.updateState("currImageIndex", state)}
                        updateViewAll={state => this.updateState("viewAll", state)} />
                </div>
                <div id="map" style={{float: "left"}} >
                    <GoogleMap
                        tracks={this.state.tracks}
                        images={this.state.images}
                        currImageIndex={this.state.currImageIndex}
                        viewAll={this.state.viewAll}
                        selectedGps={this.state.selectedGps}
                        updateGps={state => this.updateState("tracks", state)}
                        updateSelectedGps={state => this.updateState("selectedGps", state)} />
                </div>
            </Fragment>
        );
    }
}

export default App;