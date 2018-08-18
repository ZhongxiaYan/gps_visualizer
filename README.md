# GPS Visualizer

This tool is used for modifying GPS data to match image data. GPS data collection can contain flaws or errors, so this tool helps the user fix the GPS errors interactively.

## Installation
Since this tool uses Google Maps Api, you must first get an access key at https://developers.google.com/maps/documentation/javascript/get-api-key. Then rename the .env-example file as .env and fill the value with your key.

This tool is implemented with React and Flask. You must clone thie repo and then run `pip install flask` and `npm install`.

## Build
`cd static` and run `npm run build` or `npm run watch` to build the React frontend.

## Data Structure
You must construct a data directory with subdirectories gps/ and images/. Refer to sample_data/ for examples of what the data should be like.

### gps/
This directory must contain gpx files (one track per gpx file).

### images/
This directory must contain the images you want to display, with the time of the image as file name.

## Running the Server
`cd server` and run `python run.py <path to data directory>`.

## Using the Server
* Different colored dots on lines represent different gps tracks
* Can drag dots to move the gps
* The pin represents the location of the current image (interpolated from the gpx according to the image time).
* Can drag on an image to create a new GPX pin at the image's time
* Can click a gps dot to select the dot. Ctrl-click selects additional dots, and shift-click selects all dots between the previously select dot and the current dot
* Can delete selected dots by double-clicking on any of the selected dots

## Issues
Currently there's no way to save the locations associated with the images.
Delete for multiple dots is buggy because the single-click triggers first (before the double-click), this needs to be fixed by changing the UI to something that does not conflict with selection.
