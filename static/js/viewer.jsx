import React, { Fragment } from "react";

class Viewer extends React.Component {
    imageIndexOnChange(e) {
        this.props.updateImageIndex({$set: e.target.value - 1});
    }

    viewAllOnChange(e) {
        this.props.updateViewAll({$set: e.target.checked});
    }

    render() {
        if (this.props.images.length === 0) {
            return null;
        }
        let imgKey = this.props.images[this.props.currImageIndex].key;
        let imgPath = "/images/" + imgKey;
        return (
            <Fragment>
                <form>
                    Frame Index (1 to {this.props.images.length}): <input
                        type="number"
                        value={this.props.currImageIndex + 1}
                        min="1" max={this.props.images.length}
                        onChange={this.imageIndexOnChange.bind(this)} />
                    <br></br>
                    View all: <input
                        type="checkbox"
                        onChange={this.viewAllOnChange.bind(this)} />
                </form>
                <img src={imgPath} style={{width: "100%"}} />
            </Fragment>
        );
    }
}

export default Viewer;