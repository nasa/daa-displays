/**
 * @module InteractiveMap
 * @version 2018.12.01
 * @description <div style="display:flex;"><div style="width:50%;">
 *              <b>Interactive Map Widget.</b>
 *              <p>This widget renders a geographic map with air traffic information.
 *              The map is interactive and shows actual geographical data based on the
 *              position of the ownship. The following datasets are supported:
 *              NASA Blue Marble (terrain map), Landsat (terrain), Bing (terrain/map), OpenStreet Map (terrain/map).
 *              Traffic information is indicated using chevron symbols.
 *              The direction of the chevrons is based on the heading of the aircraft. Different
 *              chevron symbols can be selected dynamically, e.g., to convey information about
 *              traffic alerts.
 *              The widget builds on <a href="https://worldwind.arc.nasa.gov/web/" target=_blank>WebWorldWind</a>,
 *              an open source virtual globe simulator developed by NASA.</p>
 *              <p>This implementation requires the installation of the pvsio-web toolkit
 *              (<a href="http://www.pvsioweb.org" target=_blank>www.pvsioweb.org</a>).</p>
 *              <p>Google Chrome is recommended for correct rendering of the widget.</p></div>
 *              <img src="images/daa-interactive-map.png" style="margin-left:8%; max-height:340px;" alt="DAA Interactive Map Widget (NASA Blue Matble)"></div>
 * @example
// file index.js (to be stored in pvsio-web/examples/demos/daa-displays/)
require.config({
    paths: {
        widgets: "../../client/app/widgets",
        text: "../../client/app/widgets/daa-displays/lib/text/text"
    }
});
require(["widgets/daa-displays/daa-interactive-map"], function (InteractiveMap) {
    "use strict";
    const map = new InteractiveMap("map", {
        top: 54, left: 108
    });
    map.setPosition({ lat: 40.7128, lon: -74.0060 }); // map centered over NYC
});

// file index.html (to be stored in pvsio-web/examples/demos/daa-displays/)
<!DOCTYPE HTML>
<html>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible">
        <title></title>
        <meta name="viewport" content="width=device-width">
        <link rel="stylesheet" href="../../client/app/widgets/daa-displays/lib/bootstrap/4.1.3/css/bootstrap.min.css">
        <link rel="stylesheet" href="../../client/app/widgets/daa-displays/lib/font-awesome/5.6.1/css/all.min.css">
        <link rel="stylesheet" href="../../client/app/widgets/daa-displays/css/daa-displays.css">
    </head>
    <script src="../../client/app/widgets/daa-displays/lib/underscore/underscore.js"></script>
    <script src="../../client/app/widgets/daa-displays/lib/jquery/jquery-3.3.1.slim.min.js"></script>
    <script src="../../client/app/widgets/daa-displays/lib/popper/popper-1.14.3.min.js"></script>
    <script src="../../client/app/widgets/daa-displays/lib/bootstrap/4.1.3/bootstrap.min.js"></script>
    <script src="../../client/app/widgets/daa-displays/lib/handlebars/handlebars-v4.0.12.js"></script>
    <script src="../../client/app/widgets/daa-displays/lib/requireJS/require.js" data-main="index.js"></script>
</html>

 * @author Paolo Masci
 * @date October 2018
 * @copyright
 * Copyright 2016 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration. No
 * copyright is claimed in the United States under Title 17,
 * U.S. Code. All Other Rights Reserved.
 * <br>
 * Disclaimers
 * <br>
 * No Warranty: THE SUBJECT SOFTWARE IS PROVIDED "AS IS" WITHOUT ANY
 * WARRANTY OF ANY KIND, EITHER EXPRESSED, IMPLIED, OR STATUTORY,
 * INCLUDING, BUT NOT LIMITED TO, ANY WARRANTY THAT THE SUBJECT SOFTWARE
 * WILL CONFORM TO SPECIFICATIONS, ANY IMPLIED WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR FREEDOM FROM
 * INFRINGEMENT, ANY WARRANTY THAT THE SUBJECT SOFTWARE WILL BE ERROR
 * FREE, OR ANY WARRANTY THAT DOCUMENTATION, IF PROVIDED, WILL CONFORM TO
 * THE SUBJECT SOFTWARE. THIS AGREEMENT DOES NOT, IN ANY MANNER,
 * CONSTITUTE AN ENDORSEMENT BY GOVERNMENT AGENCY OR ANY PRIOR RECIPIENT
 * OF ANY RESULTS, RESULTING DESIGNS, HARDWARE, SOFTWARE PRODUCTS OR ANY
 * OTHER APPLICATIONS RESULTING FROM USE OF THE SUBJECT SOFTWARE.
 * FURTHER, GOVERNMENT AGENCY DISCLAIMS ALL WARRANTIES AND LIABILITIES
 * REGARDING THIRD-PARTY SOFTWARE, IF PRESENT IN THE ORIGINAL SOFTWARE,
 * AND DISTRIBUTES IT "AS IS."
 * <br>
 * Waiver and Indemnity: RECIPIENT AGREES TO WAIVE ANY AND ALL CLAIMS
 * AGAINST THE UNITED STATES GOVERNMENT, ITS CONTRACTORS AND
 * SUBCONTRACTORS, AS WELL AS ANY PRIOR RECIPIENT.  IF RECIPIENT'S USE OF
 * THE SUBJECT SOFTWARE RESULTS IN ANY LIABILITIES, DEMANDS, DAMAGES,
 * EXPENSES OR LOSSES ARISING FROM SUCH USE, INCLUDING ANY DAMAGES FROM
 * PRODUCTS BASED ON, OR RESULTING FROM, RECIPIENT'S USE OF THE SUBJECT
 * SOFTWARE, RECIPIENT SHALL INDEMNIFY AND HOLD HARMLESS THE UNITED
 * STATES GOVERNMENT, ITS CONTRACTORS AND SUBCONTRACTORS, AS WELL AS ANY
 * PRIOR RECIPIENT, TO THE EXTENT PERMITTED BY LAW.  RECIPIENT'S SOLE
 * REMEDY FOR ANY SUCH MATTER SHALL BE THE IMMEDIATE, UNILATERAL
 * TERMINATION OF THIS AGREEMENT.
 **/
/*jslint esnext: true */
/*global _, createDiv, baseUrl, WorldWind, meters2feet */
define(function (require, exports, module) {
    "use strict";
    // require("daa-displays/wwd/worldwind.min");
    // require("daa-displays/daa-utils");

    require("daa-displays/wwd/worldwind.min");
    const utils = require('daa-displays/daa-utils');
    const Handlebars = require('node_modules/handlebars/dist/handlebars');
    const templates = require('./templates/daa-map-templates');


    // https://tiles.maps.eox.at/wmts/1.0.0/osm/default/WGS84/11/699/1129.jpg
    // class OpenStreetMapRestLayer extends WorldWind.OpenStreetMapImageLayer {
    //     doRender(dc) {
    //         super.doRender(dc);
    //         let resources = dc.gpuResourceCache.entries;
    //         let tileNames = Object.keys(resources.entries).filter(function (key) { return key.includes("tiles.maps.eox.at"); });
    //         tileNames = tileNames.map(function (key) {
    //             key = key.replace("{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpgosmdefault", "");
    //             key = key.replace("WGS84-layer", "WGS84");
    //             return key;
    //         });
    //         console.log("tiles", tileNames);
    //         // todo: send this info to the server, and create a command to download the tiles
    //     }
    // }


    // class OpenStreetMapRestLayer extends WorldWind.Layer {
    //     constructor () {
    //         super("Hampton-Roads");
    //         this.serverAddress = "http://localhost:8082/tiles.maps.eox.at"; //"http://localhost:10000";
    //         this.pathToData = "wmts/1.0.0/osm/default/WGS84"; //"data/v3";
    //         this.pickEnabled = false;
    //         this.layer = new WorldWind.RestTiledImageLayer(this.serverAddress, this.pathToData, this.displayName);

    //         // super("http://localhost:10000", // server address
    //         //         "data/v3/", // pathToData
    //         //         "Hampton-Roads", // displayName
    //         //         new Date("2004-01"));
    //         //         // {   // configuration
    //         //         //     imageFormat: "image/png",
    //         //         //     sector: new WorldWind.Sector(
    //         //         //         -76.663, // min latitude
    //         //         //         -75.918, // max latitude
    //         //         //         36.718, // min longitude
    //         //         //         37.208 // max longitude
    //         //         //     )
    //         //         // });
    //         //         console.log("OpenStreetMapRestLayer ready!");
    //     }
    //     // prePopulate(wwd) {
    //     //     this.layer.prePopulate(wwd);
    //     //     return this;
    //     // }
    //     // isPrePopulated(wwd) {
    //     //     return this.layer !== null && this.layer.isPrePopulated(wwd);
    //     // }
    //     doRender(dc) {
    //         this.layer.opacity = this.opacity;
    //         this.layer.doRender(dc);
    //     }
    // }

    // require("daa-displays/openMap/wmts-config");

    class OpenStreetMapRestLayer extends WorldWind.OpenStreetMapImageLayer {
        configureLayer(dc) {
            // this.layer = new WorldWind.WmtsLayer(wmtsConfig);
            // // Send an event to request a redraw.
            // var e = document.createEvent('Event');
            // e.initEvent(WorldWind.REDRAW_EVENT_TYPE, true, true);
            // dc.currentGlContext.canvas.dispatchEvent(e);
            if (!this.xhr) {
                var self = this;
                var canvas = dc.currentGlContext.canvas;
                this.xhr = new XMLHttpRequest();
                // change the GET so that tiles are requested to the local server
                // this.xhr.open("GET", "https://tiles.maps.eox.at/wmts/1.0.0/WMTSCapabilities.xml", true);
                // this.xhr.open("GET", "http://localhost:10000/WMTSCapabilities.xml", true);
                const url = "http://localhost:8082/osm/WMTSCapabilities.xml";
                this.xhr.open("GET", url, true);
                this.xhr.onreadystatechange = () => {
                    if (self.xhr.readyState === 4) {
                        if (self.xhr.status === 200) {
                            // Create a layer from the WMTS capabilities.
                            var wmtsCapabilities = new WorldWind.WmtsCapabilities(self.xhr.responseXML);
    
                            wmtsCapabilities.serviceProvider.providerSiteUrl = "http://localhost:8082/daadisplays";
                            wmtsCapabilities.contents.layer[0].resourceUrl[0].template =
                                "http://localhost:8082/tiles.maps.eox.at/wmts/1.0.0/osm/default/WGS84/{TileMatrix}/{TileRow}/{TileCol}.jpg";
    
                            var wmtsLayerCapabilities = wmtsCapabilities.getLayer("osm");
                            var wmtsConfig = WorldWind.WmtsLayer.formLayerConfiguration(wmtsLayerCapabilities);
                            wmtsConfig.title = self.displayName;
                            self.layer = new WorldWind.WmtsLayer(wmtsConfig);
    
                            // Send an event to request a redraw.
                            var e = document.createEvent('Event');
                            e.initEvent(WorldWind.REDRAW_EVENT_TYPE, true, true);
                            canvas.dispatchEvent(e);
                        } else {
                            console.warn("OSM retrieval failed (" + this.xhr.statusText + "): " + url);
                        }
                    }
                };
                this.xhr.onerror = function () {
                    console.warn("OSM retrieval failed: " + url);
                };
                this.xhr.ontimeout = function () {
                    console.warn("OSM retrieval timed out: " + url);
                };
                this.xhr.send(null);
            }
        }
    }
    
    // const black_pixel = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw== ";
    // const chevron = WorldWind.WWUtil.currentUrlSansFilePart() + "/images/chevron.svg";
    // const compass = WorldWind.WWUtil.currentUrlSansFilePart() + "/images/simple-compass.svg";
    
    // arrow symbols, useful for labels
    const arrows = {
        up: "↑",
        down: "↓",
        left: "←",
        right: "→",
        "white-up": "⇧",
        "white-down": "⇩",
        "white-left": "⇦",
        "white-right": "⇨"
    };
    // scale factor for the map, computed manually by inspecting the DOM, for a compass size of 634x634 pixels. FIXME: find a better way to match compass and map scale
    const scaleFactor = 32000 / 5; // if canvas size is 1054x842 and compass size is 634x634, then compass radius corresponds to 5NMI (9.26Km) when range is 32000
    // scale factor for collada objects
    const colladaScale = 1100;
    // configuration options -- the ownship is hidden by default (as the interactive map renders the ownship in overlay, using a separate DOM element)
    const config = {
        hideOwnshipSymbol: true,
        hideOwnshipLabel: true
    };
    // collada objects representing the daa symbols
    const colladaObjects = {
        "private-jet": {
            fileName: "sc-private-jet.dae", // this symbol is included for testing purposes, for the 3D view
            xRotation: 180,
            yRotation: 180,
            scale: colladaScale
        },
        "daa-ownship": {
            fileName: "daa-ownship.dae",
            zRotation: 0,
            scale: colladaScale
        },
        "daa-alert": {
            fileName: "daa-alert.dae",
            zRotation: 0,
            scale: colladaScale
        },
        "daa-target": {
            fileName: "daa-target.dae",
            zRotation: 0,
            scale: colladaScale
        },
        "daa-traffic-avoid": {
            fileName: "daa-traffic-avoid.dae",
            zRotation: 0,
            scale: colladaScale
        },
        "daa-traffic-monitor": {
            fileName: "daa-traffic-monitor.dae",
            zRotation: 0,
            scale: colladaScale
        }
    };
    // standard set of locations
    const cities = {
        hampton: {
            lat: 37.0298687,
            lon: -76.3452218
        },
        nyc: {
            lat: 40.7128,
            lon: -74.0060
        },
        norfolk: {
            lat: 36.8508,
            lon: -76.2859
        },
        newportnews: {
            lat: 37.0871,
            lon: -76.4730
        },
        fishermanisland: {
            lat: 37.0929,
            lon: -75.9635
        },
        virginiabeach: {
            lat: 36.8529,
            lon: -75.9780
        },
        poquoson: {
            lat: 37.1224,
            lon: -76.3458
        },
        chesapeake: {
            lat: 36.7682,
            lon: -76.2875
        },
        portsmouth: {
            lat: 36.8354,
            lon: -76.2983
        },
        suffolk: {
            lat: 36.7282,
            lon: -76.5836
        }
    };
    // default aircraft altitude
    const default_aircraft_altitude = 1000; // 1Km
    
    // hampton to newport news is 12.81 km (source: googlemaps)
    // const m2latlon = Math.sqrt((cities.newportnews.lat - cities.hampton.lat) * (cities.newportnews.lat - cities.hampton.lat)
    //     + (cities.newportnews.lon - cities.hampton.lon) * (cities.newportnews.lon - cities.hampton.lon)) / 12.81;
    
    class WellClearVolume {
        well_clear_volume;
        /**
         * @function <a name="WellClearVolume">WellClearVolume</a>
         * @description Constructor. Renders a well-clear volume in 3D.
         * @param layer {Object} wwd layer to be used for rendering the well-clear volume.
         * @param lat {real} Latitude of the aircraft (degrees)
         * @param lon {real} Longitude of the aircraft (degrees)
         * @param alt {real} Altitude of the aircraft (meters)
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        constructor(layer = null, lat = cities.hampton.lat, lon = cities.hampton.lon, alt = default_aircraft_altitude) {
            const ZTHR = 4000;
            // Create the mesh's positions.
            let meshPositions = []; // Use a new positions array.
            meshPositions.push(new WorldWind.Position(lat, lon, alt)); // the mesh center
    
            const meshRadius = 0.1;
            const numRadialPositions = 16;
            const step = 360 / numRadialPositions;
            for (let angle = 0; angle < 360; angle += step) {
                // this code draws rectangles necessary for rendering the side of the cylinder
                let angleRadians = angle * WorldWind.Angle.DEGREES_TO_RADIANS;
                let latitude = meshPositions[0].latitude + Math.sin(angleRadians) * meshRadius;
                let longitude = meshPositions[0].longitude + Math.cos(angleRadians) * meshRadius;
                meshPositions.push(new WorldWind.Position(latitude, longitude, alt + ZTHR / 2));
                meshPositions.push(new WorldWind.Position(latitude, longitude, alt - ZTHR / 2));
                let next_angle = angle + step;
                let next_angleRadians = next_angle * WorldWind.Angle.DEGREES_TO_RADIANS;
                let next_latitude = meshPositions[0].latitude + Math.sin(next_angleRadians) * meshRadius;
                let next_longitude = meshPositions[0].longitude + Math.cos(next_angleRadians) * meshRadius;
                meshPositions.push(new WorldWind.Position(next_latitude, next_longitude, alt - ZTHR / 2));
                meshPositions.push(new WorldWind.Position(next_latitude, next_longitude, alt + ZTHR / 2));
                meshPositions.push(new WorldWind.Position(latitude, longitude, alt + ZTHR / 2));
            }
    
            // Use the same attributes as before, except for the image source, which is now the custom image.
            const meshAttributes = new WorldWind.ShapeAttributes(null);
            meshAttributes.outlineColor = new WorldWind.Color(0, 0, 1, 0.6); // transparent blue
            meshAttributes.interiorColor = new WorldWind.Color(0, 0, 1, 0.4); // transparent blue
            meshAttributes.applyLighting = true;
            // meshAttributes.imageSource = new WorldWind.ImageSource(canvas);
    
            // Create the mesh indices.
            let numIndices = meshPositions.length - 1;
            let meshIndices = [];
            for (let i = 1; i < numIndices; i++) {
                meshIndices.push(0);
                meshIndices.push(i);
                meshIndices.push(i + 1);
            }
            // Close the circle.
            meshIndices.push(0);
            meshIndices.push(numIndices);
            meshIndices.push(1);
    
            // Create the outline indices.
            let outlineIndices = [];
            for (let j = 1; j <= numIndices; j++) {
                outlineIndices.push(j);
            }
            // Close the outline.
            outlineIndices.push(1);
    
            // Create the mesh.
            let mesh = new WorldWind.TriangleMesh(meshPositions, meshIndices, meshAttributes);
            mesh.outlineIndices = outlineIndices;
    
            this.well_clear_volume = mesh;
            // layer.addRenderable(this.well_clear_volume);
        }
        /**
         * @function <a name="WellClearVolume_hide">hide</a>
         * @description Hides the well clear volume.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        hide() {
            this.well_clear_volume.enabled = false;
        }
        /**
         * @function <a name="WellClearVolume_reveal">hide</a>
         * @description Makes the well clear volume visible.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        reveal() {
            this.well_clear_volume.enabled = true;
        }
    }
    
    class Aircraft {
        position;//: utils.LatLonAlt;
        velocity;//: utils.Vector3D;
        /**
         * @function <a name="Aircraft">Aircraft</a>
         * @description Constructor. Aircraft descriptor.
         * @param lat {real} Latitude of the aircraft (degrees)
         * @param lon {real} Longitude of the aircraft (degrees)
         * @param alt {real} Altitude of the aircraft (meters)
         * @param vel {Object({x: real, y: real, z: real})} Velocity of the aircraft.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        constructor(lat = cities.hampton.lat, lon = cities.hampton.lon, alt = default_aircraft_altitude, vel = {
            x: 0,
            y: 0,
            z: 0
        }) {
            this.position = {
                lat: lat,
                lon: lon,
                alt: alt
            };
            this.velocity = vel;
        }
        /**
         * @function <a name="Aircraft_setPosition">setPosition</a>
         * @description Sets the current position of the aircraft.
         * @param pos {Object({ lat: real, lon: real, alt: real })} Earth location shown at the center of the map, given as { lat: real, lon: real, alt: real }
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        setPosition(pos) {
            if (pos) {
                this.position.lat = (isNaN(parseFloat(pos.lat))) ? this.position.lat : parseFloat(pos.lat);
                this.position.lon = (isNaN(parseFloat(pos.lon))) ? this.position.lon : parseFloat(pos.lon);
                this.position.alt = (isNaN(parseFloat(pos.alt))) ? this.position.alt : parseFloat(pos.alt);
            }
            return this;
        }
        /**
         * @function <a name="Aircraft_setVelocity">setVelocity</a>
         * @description Sets the current velocity of the aircraft.
         * @param vel {Object({x: real, y:real, z:real})} Velocity vector, given as { x: real, y: real, z: real }
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        setVelocity(vel) {
            if (vel) {
                this.velocity.x = (isNaN(parseFloat(vel.x))) ? this.velocity.x : parseFloat(vel.x);
                this.velocity.y = (isNaN(parseFloat(vel.y))) ? this.velocity.y : parseFloat(vel.y);
                this.velocity.z = (isNaN(parseFloat(vel.z))) ? this.velocity.z : parseFloat(vel.z);
            }
            return this;
        }
        /**
         * @function <a name="Aircraft_setPositionAndVelocity">setPositionAndVelocity</a>
         * @description Sets the current position and velocity of the aircraft.
         * @param pos {Object({ lat: real, lon: real, alt: real })} Earth location shown at the center of the map, given as { lat: real, lon: real, alt: real }
         * @param vel {Object({x: real, y:real, z:real})} Velocity vector, given as { x: real, y: real, z: real }
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        setPositionAndVelocity(pos, vel) {
            this.setPosition(pos);
            this.setVelocity(vel);
            return this;
        }
        /**
         * @function <a name="Aircraft_setAltiude">setAltitude</a>
         * @description Sets the current altitude of the aircraft.
         * @param alt {real} The new altitude of the aircraft.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        setAltitude(alt) {
            if (alt && !isNaN(parseFloat(alt))) {
                this.position.alt = parseFloat(alt);
            }
            return this;
        }
        /**
         * @function <a name="Aircraft_getPosition">getPosition</a>
         * @description Returns the current aircraft position.
         * @return {real} The current aircraft position.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        getPosition() {
            return {
                lat: this.position.lat,
                lon: this.position.lon,
                alt: this.position.alt
            };
        }
        /**
         * @function <a name="Aircraft_getVelocity">getVelocity</a>
         * @description Returns the current velocity of the aircraft.
         * @return {Object({x: real, y: real, z: real})} The velocity vector of the aircraft.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        getVelocity() {
            return {
                x: this.velocity.x,
                y: this.velocity.y,
                z: this.velocity.z
            };
        }
    }
    
    // utility function, used to offset the label for collada aircraft
    // in 2D view, collada objects are artificially rendered closer to the ground otherwise they would not be rendered correctly in some scenarios,
    // as they tend to fall outside the fov of the navigator
    function colladaAltitude(alt) {
        return alt / 10;
    }
    class ColladaAircraft extends Aircraft {
        wwd;
        path;
        layers;
        colladaLoader;
        rotationOffset; //: { xRotation: number, yRotation: number, zRotation: number };
        flight;
        well_clear_volume;
        nmiScale;
        /**
         * @function <a name="ColladaAircraft">ColladaAircraft</a>
         * @description Constructor. Uses a Collada model to creates an aircraft on the wwd map.
         * @param wwd {Object} Pointer to an instance of WorldWind.WorldWindow
         * @param lat {real} Latitude of the aircraft (degrees)
         * @param lon {real} Longitude of the aircraft (degrees)
         * @param alt {real} Altitude of the aircraft (meters)
         * @param daaSymbol {String} DAA symbol to be used for the aircraft, one of "daa-target", "daa-alert", "daa-traffic-avoid", "daa-traffic-monitor", "daa-ownship" (default: daa-ownship).
         * @param cb {Function} callback function to be invoked when the constructor has completed loading the aircraft symbols
         * @memberof module:InteractiveMap
         * @augments Aircraft
         * @instance
         * @inner
         */
        constructor(wwd, lat, lon, alt, daaSymbol, cb) {
            super(lat, lon, alt);
            daaSymbol = daaSymbol || "daa-ownship";
    
            this.wwd = wwd;
            this.path = [];
            this.layers = {
                flight: new WorldWind.RenderableLayer("Ownship"), // Will render a cylinder representing the ownship well clear volume
                well_clear_volume: new WorldWind.RenderableLayer("Ownship WCV") // Will render a cylinder representing the ownship well clear volume
            };
            wwd.addLayer(this.layers.flight);
            wwd.addLayer(this.layers.well_clear_volume);
    
            this.colladaLoader = new WorldWind.ColladaLoader(new WorldWind.Position(lat, lon, alt));
            this.colladaLoader.init({
                dirPath: utils.baseUrl + 'ColladaModels/'
            });
    
            // rotationOffset is used for adjusting the direction of the icon, e.g., so that the arrow points to the north.
            this.rotationOffset = {
                xRotation: 0,
                yRotation: 0,
                zRotation: 0
            };

            this.nmiScale = 5; // default scale is 5NMI

            let colladaObj = colladaObjects[daaSymbol]; //colladaObjects.privateJet;
            this.colladaLoader.load(colladaObj.fileName, (colladaScene) => {
                if (colladaScene) {
                    this.flight = colladaScene;
                    this.flight.scale = colladaObj.scale || 1;
                    this.flight.displayName = "Aircraft";
                    // this.flight.useTexturePaths = false; // use this option to force loading textures from the same directory of the collada file
                    this.flight.altitudeMode = WorldWind.ABSOLUTE; // the alternative is RELATIVE_TO_GROUND;
                    this.flight.xRotation = colladaObj.xRotation || 0;
                    this.rotationOffset.xRotation = this.flight.xRotation;
                    this.flight.yRotation = colladaObj.yRotation || 0;
                    this.rotationOffset.yRotation = this.flight.yRotation;
                    this.flight.zRotation = colladaObj.zRotation || 0;
                    this.rotationOffset.zRotation = this.flight.zRotation;
                    this.flight.position = new WorldWind.Position(lat, lon, colladaAltitude(alt));
                    this.layers.flight.addRenderable(this.flight); // Add the Collada model to the renderable layer within a callback.
                    // set scale
                    this.setScale(this.nmiScale);
                    // execute callback function, if any was provided to the constructor
                    if (cb && typeof cb === "function") {
                        cb(this);
                    }
                } else {
                    console.error("Could not load collada object :/");
                }
            });
        }
        setVelocity(vel) {
            super.setVelocity(vel);
            // rotate the aircraft accordingly
            const deg = utils.rad2deg(Math.atan2(this.velocity.x, this.velocity.y));
            this.setHeading(deg);
            return this;
        }
        /**
         * @function <a name="ColladaAircraft_setPosition">setPosition</a>
         * @description Sets the current position of the aircraft.
         * @param pos {Object({ lat: real, lon: real, alt: real })} Earth location shown at the center of the map, given as { lat: real, lon: real, alt: real }
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        setPosition(pos) {
            if (this.flight) {
                pos.lat = (isNaN(parseFloat(pos.lat))) ? this.flight.position.lat : parseFloat(pos.lat);
                pos.lon = (isNaN(parseFloat(pos.lon))) ? this.flight.position.lon : parseFloat(pos.lon);
                pos.alt = (isNaN(parseFloat(pos.alt))) ? this.flight.position.alt : parseFloat(pos.alt);
                this.flight.position = new WorldWind.Position(pos.lat, pos.lon, colladaAltitude(pos.alt));
                if (isNaN(parseFloat(pos.lat)) || isNaN(parseFloat(pos.lon))) {
                    console.error("lat/lon is NaN");
                }
    
                if (this.well_clear_volume) {
                    this.well_clear_volume.hide();
                    this.path.push(this.well_clear_volume);
                }
                this.well_clear_volume = new WellClearVolume(this.layers.well_clear_volume, this.position.lat, this.position.lon, this.position.alt);
            }
            return this;
        }
        /**
         * @function <a name="ColladaAircraft_hide">hide</a>
         * @description Hides the aircraft.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        hide() {
            if (this.flight) {
                this.flight.enabled = false;
            }
            return this;
        }
        /**
         * @function <a name="ColladaAircraft_reveal">reveal</a>
         * @description Makes the aircraft visible on the map.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        reveal() {
            if (this.flight) {
                this.flight.enabled = true;
            }
            return this;
        }
        /**
         * @function <a name="ColladaAircraft_setHeading">setHeading</a>
         * @desc Sets the aircraft heading, in degrees, clockwise, north is 0 deg.
         * @param deg (real) Heading degrees
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        setHeading(deg) {
            if (deg) {
                let val = parseFloat(deg);
                if (!isNaN(val) && this.flight) {
                    this.flight.zRotation = this.rotationOffset.zRotation + val;
                    this.wwd.redraw();
                }
            }
            return this;
        }
        /**
         * @function <a name="ColladaAircraft_setScale">setScale</a>
         * @desc Scales the aircraft symbol based on the map scale.
         *       This is useful to keep the symbol size constant when zooming in/out the map
         *       (in wwd, zooming in results in larger collada objects, zooming out leads to smaller objects).
         * @param NMI (real) Map scale, in nautical miles.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        setScale(NMI) {
            this.nmiScale = NMI;
            if (this.flight) {
                this.flight.scale = colladaScale / 5 * NMI;
            }
            return this;
        }
    }
    
    // utility function, creates a label similar to that used in TCAS displays
    // The label includes:
    //  - relative altitude (reference altitude is the ownship altitude): 2 digits, units is 100 feet
    //  - velocity vector: represented using an arrow (arrow-up if aircraft is climbing, arrow-down if aircraft is descending, no arrow is shown if the aircraft is levelled)
    // The label color matches that of the daa symbol of the aircraft
    // The label is shown above the daa symbol if the altitude of the aircraft is greater than or equal the ownship's altitude, below otherwise.
    function createLabel(aircraft, ownship, opt) {
        function fixed2(val) {
            if (val > 0) {
                return (val < 10) ? "0" + val : val;
            }
            return (val > -10) ? "-0" + (-val) : val;
        }
        const THRESHOLD = 50; // Any climb or descent smaller than this threshold show as level flight (no arrow)
        opt = opt || {};
        let label = {
            text: "",
            position: new WorldWind.Position(aircraft.position.lat, aircraft.position.lon, aircraft.position.alt),
            offsetX: 18,
            offsetY: 0
        };
        // indicate altitude, in feet
        let val = (opt.units === "meters") ?
                        Math.trunc(utils.meters2feet(aircraft.position.alt - ownship.position.alt) / 100)
                        : Math.trunc((aircraft.position.alt - ownship.position.alt) / 100);
        if (val === 0) {
            label.text = " 00";
            label.offsetY = -16; // text will at the top of the symbol (y axis points down in the canvas)
        } else if (val > 0) {
            label.text = "+" + fixed2(val);
            label.offsetY = -16; // text will at the top of the symbol (y axis points down in the canvas)
        } else {
            label.text = fixed2(val);
            label.offsetY = 42; // text will at the bottom of the symbol (y axis points down in the canvas)
        }
        // indicate whether the aircraft is climbing or descending, based on the velocity vector
        if (Math.abs(aircraft.velocity.z) >= THRESHOLD) {
            if (aircraft.velocity.z > 0) {
                // add arrow up before label
                label.text += arrows["white-up"];
            } else if (aircraft.velocity.z < 0) {
                // add arrow down before label
                label.text += arrows["white-down"];
            }
        }
        // console.log(label);
        return label;
    }
    
    class DAA_Aircraft extends Aircraft {
        symbol;//: string;
        name;//: string;
        reference;
        _loaded;//: number;
        aircraft;
        aircraftSymbols;
        symbolColor;
        text;//: {
        //     text: string,
        //     position;
        //     attributes;
        //     enabled;
        // };
        /**
         * @function <a name="DAA_Aircraft">DAA_Aircraft</a>
         * @description Constructor. Creates an aircraft rendered using the standard daa symbols ("daa-target", "daa-alert", "daa-traffic-avoid", "daa-traffic-monitor", "daa-ownship").
         *              All aircraft (except the ownship) have a label. The label includes the following information:
         *              <li>relative altitude (reference altitude is the ownship altitude): 2 digits, units is 100 feet</li>
         *              <li>velocity vector: represented using an arrow (arrow-up if aircraft is climbing, arrow-down if aircraft is descending, no arrow is shown if the aircraft is levelled)</li>
         *              The label color matches that of the daa symbol of the aircraft.
         *              The label is shown above the daa symbol if the altitude of the aircraft is greater than or equal the ownship's altitude, below otherwise.
         * @param wwd {Object} Pointer to an instance of WorldWind.WorldWindow
         * @param desc {Object} Aircraft descriptor
         *          <li>symbol (String): daa symbol, one of "daa-target", "daa-alert", "daa-traffic-avoid", "daa-traffic-monitor", "daa-ownship" (default: daa-ownship)</li>
         *          <li>name (String): name of the aircraft, currently used only for debugging purposes.</li>
         *          <li>lat (real): latitude (degrees)</li>
         *          <li>lon (real): longitude (degrees)</li>
         *          <li>alt (real): altiutude (meters)</li>
         *          <li>reference (Object): pointer to the ownship descriptor, with information about position and speed.</li>
         * @param cb {Function} callback function to be invoked when the constructor has completed loading the aircraft symbols
         * @memberof module:InteractiveMap
         * @augments Aircraft
         * @instance
         * @inner
         */
        constructor(wwd, desc, cb) {
            desc = desc || {};
            desc.symbol = desc.symbol || "daa-ownship";
            desc.name = desc.name || "";
            super(desc.lat, desc.lon, desc.alt);
            this.symbol = desc.symbol;
            this.name = desc.name;
            this.reference = desc.reference;
            this._loaded = 0;
            let _this = this;
    
            function addLabel(_this) {
                if (_this.symbol && !(config.hideOwnshipLabel && _this.symbol === "daa-ownship")) {
                    _this.textLayer = new WorldWind.RenderableLayer("Aircraft data");
                    let aircraftLabel = createLabel(_this, _this.reference);
                    _this.text = new WorldWind.GeographicText(aircraftLabel.position, aircraftLabel.text);
                    _this.text.attributes = new WorldWind.TextAttributes(null);
                    _this.text.attributes.color = _this.symbolColor[_this.symbol];
                    _this.text.attributes.font.weight = "bold";
                    _this.text.attributes.font.size = 18;
                    _this.text.attributes.offset = new WorldWind.Offset(WorldWind.OFFSET_PIXELS, aircraftLabel.offsetX, WorldWind.OFFSET_PIXELS, aircraftLabel.offsetY);
                    _this.text.attributes.depthTest = true;
                    _this.text.declutterGroup = 0;
                    _this.textLayer.addRenderable(_this.text);
                    wwd.addLayer(_this.textLayer);
                }
            }
    
            function collada_cb(aircraft) {
                aircraft.hide();
                _this._loaded++;
                if (_this._loaded === 5) {
                    _this.aircraft = _this.aircraftSymbols[_this.symbol];
                    _this.aircraft.reveal();
                    addLabel(_this);
                    const deg = utils.rad2deg(Math.atan2(_this.velocity.x, _this.velocity.y));
                    _this.setHeading(deg);
                    if (cb && typeof cb === "function") {
                        cb(_this);
                    }
                }
            }
            this.aircraftSymbols = {
                "daa-ownship": new ColladaAircraft(wwd, desc.lat, desc.lon, desc.alt, "daa-ownship", collada_cb),
                "daa-alert": new ColladaAircraft(wwd, desc.lat, desc.lon, desc.alt, "daa-alert", collada_cb),
                "daa-target": new ColladaAircraft(wwd, desc.lat, desc.lon, desc.alt, "daa-target", collada_cb),
                "daa-traffic-avoid": new ColladaAircraft(wwd, desc.lat, desc.lon, desc.alt, "daa-traffic-avoid", collada_cb),
                "daa-traffic-monitor": new ColladaAircraft(wwd, desc.lat, desc.lon, desc.alt, "daa-traffic-monitor", collada_cb)
            };
            this.symbolColor = {
                "daa-ownship": WorldWind.Color.CYAN,
                "daa-alert": WorldWind.Color.RED, // this is also called "warning"
                "daa-target": WorldWind.Color.WHITE,
                "daa-traffic-avoid": WorldWind.Color.YELLOW, // this is also called "corrective"
                "daa-traffic-monitor": WorldWind.Color.YELLOW // this is also called "preventive"
            };
        }
        /**
         * @function <a name="DAA_Aircraft_selectSymbolByName">selectSymbolByName</a>
         * @description Sets the daa symbol to be used for the aircraft.
         * @param daaSymbol {String|number} string is for daa symbols, one of "daa-target", "daa-alert", "daa-traffic-avoid", "daa-traffic-monitor", "daa-ownship" (default: daa-ownship), number is for alert (0 = target, 1 = monitor, 2 = avoid, 3 = alert)</li>
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        setSymbol(daaSymbol) {
            if (daaSymbol) {
                if (!isNaN(parseInt(daaSymbol))) {
                    daaSymbol = this._alert2symbol(daaSymbol);
                }
                if (!this.aircraft) {
                    // console.log("Warning: still loading DAA_Aircraft symbols... :/");
                    this.symbol = daaSymbol; // the symbol will be selected when the loading process completes
                } else {
                    if (daaSymbol !== this.symbol) {
                        this.aircraft.hide(); // hide old symbol
                        this.aircraft = this.aircraftSymbols[daaSymbol];
                        this.aircraft.reveal(); // reveal new symbol
                        this.symbol = daaSymbol;
                        this.refreshLabel();
                    } // else do nothing, the symbol is the same
                }
            }
            return this;
        }
        setLabel(name, reference) {
            if (name) {
                this.name = name;
            }
            if (reference) {
                this._reference = reference;
            }
            this.refreshLabel();
            return this;
        }
        _alert2symbol(daaAlert) {
            let id = parseInt(daaAlert);
            switch (id) {
                case 1:
                    return "daa-traffic-avoid";
                case 2:
                    return "daa-traffic-monitor";
                case 3:
                    return "daa-alert";
                default: // return "daa-target"
            }
            return "daa-target";
        }
        // selectSymbolByName(daaSymbol = "daa-target") {
        //     if (!this.aircraft) {
        //         console.log("Warning: still loading DAA_Aircraft symbols... :/");
        //         this.symbol = daaSymbol; // the symbol will be selected when the loading process completes
        //     } else {
        //         if (daaSymbol !== this.symbol) {
        //             this.aircraft.hide(); // hide old symbol
        //             this.aircraft = this.aircraftSymbols[daaSymbol];
        //             this.aircraft.reveal(); // reveal new symbol
        //             this.symbol = daaSymbol;
        //             this.refreshLabel();
        //         } // else do nothing, the symbol is the same
        //     }
        //     return this;
        // }
        /**
         * @function <a name="DAA_Aircraft_selectSymbolByAlert">selectSymbolByAlert</a>
         * @description Sets the daa symbol of the aircraft based on the alert level.
         * @param selectSymbolByAlert {nat} daa alert:
         *                              <li>0 = daa-target</li>
         *                              <li>1 = daa-traffic-avoid</li>
         *                              <li>2 = daa-traffic-monitor</li>
         *                              <li>3 = daa-alert</li>
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        selectSymbolByAlert(daaAlert) {
            let id = parseInt(daaAlert);
            switch (id) {
                case 1:
                    return this.selectSymbolByName("daa-traffic-avoid");
                case 2:
                    return this.selectSymbolByName("daa-traffic-monitor");
                case 3:
                    return this.selectSymbolByName("daa-alert");
                default:
                    return this.selectSymbolByName("daa-target");
            }
            return this;
        }
        /**
         * @function <a name="DAA_Aircraft_refreshLabel">refreshLabel</a>
         * @description Triggers re-renderin of aircraft label.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        refreshLabel() {
            if (this.text) {
                let aircraftLabel = createLabel(this, this.reference);
                this.text.position = aircraftLabel.position;
                this.text.attributes.color = this.symbolColor[this.symbol];
                this.text.attributes.offset = new WorldWind.Offset(WorldWind.OFFSET_PIXELS, aircraftLabel.offsetX, WorldWind.OFFSET_PIXELS, aircraftLabel.offsetY);
                this.text.text = aircraftLabel.text;
            }
            if (this.velocity) {
                const deg = utils.rad2deg(Math.atan2(this.velocity.x, this.velocity.y));
                this.setHeading(deg);
            }
            return this;
        }
        /**
         * @function <a name="DAA_Aircraft_setPosition">setPosition</a>
         * @description Sets the current position of the aircraft.
         * @param pos {Object({ lat: real, lon: real, alt: real })} Earth location shown at the center of the map, given as { lat: real, lon: real, alt: real }
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        setPosition(pos) {
            super.setPosition(pos);
            Object.keys(this.aircraftSymbols).forEach(symbol => {
                this.aircraftSymbols[symbol].setPosition(pos);
            });
            this.refreshLabel();
            // console.log(this.name, this.position);
            return this;
        }
        /**
         * @function <a name="DAA_Aircraft_hide">hide</a>
         * @description Hides the aircraft.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        hide() {
            if (this.aircraft) {
                this.aircraft.hide();
                if (this.text) {
                    this.text.enabled = false;
                }
            }
            return this;
        }
        /**
         * @function <a name="DAA_Aircraft_reveal">reveal</a>
         * @description Makes the aircraft visible on the map.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        reveal() {
            if (this.aircraft) {
                this.aircraft.reveal();
                if (this.text) {
                    this.text.enabled = true;
                }
                if (this.velocity) {
                    const deg = utils.rad2deg(Math.atan2(this.velocity.x, this.velocity.y));
                    this.setHeading(deg);
                }
            }
            return this;
        }
        /**
         * @function <a name="DAA_Aircraft_setHeading">setHeading</a>
         * @desc Ownship's heading, in degrees, clockwise, north is 0 deg.
         * @param deg (real) Heading degrees
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        setHeading(deg) {
            Object.keys(this.aircraftSymbols).forEach(symbol => {
                this.aircraftSymbols[symbol].setHeading(-deg); // changing sign to the value because rotation of the aircraft is clockwise
            });
            return this;
        }
        /**
         * @function <a name="DAA_Aircraft_setScale">setScale</a>
         * @desc Scales the aircraft symbol based on the map scale. This is useful to keep the symbol size constant when zooming in/out the map (in wwd, zooming in results in larger aircraft symbols, zooming out leads to smaller symbols).
         * @param NMI (real) Map scale, in nautical miles.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        setScale(NMI) {
            Object.keys(this.aircraftSymbols).forEach(symbol => {
                this.aircraftSymbols[symbol].setScale(NMI);
            });
            return this;
        }
    }
    
    // utility function, creates a wwd terrain layer
    function _get_terrain(t) {
        if (t === "BMNG") {
            return new WorldWind.BMNGLayer(); // terrain, low res
        } else if (t === "BMNGOne") {
            return new WorldWind.BMNGOneImageLayer(); // terrain, low res
        } else if (t === "BMNGLandsat") {
            return new WorldWind.BMNGLandsatLayer(); // landsat image, low res
        } else if (t === "BingAerial") {
            return new WorldWind.BingAerialLayer(null); // terrain, high res
        } else if (t === "BingAerialWithLabels") {
            return new WorldWind.BingAerialWithLabelsLayer(null); // terrain, high res with labels
        } else if (t === "OpenStreetMap") {
            return new WorldWind.OpenStreetMapImageLayer();
        } else if (t === "OpenStreetMap-Hampton") {
            return new OpenStreetMapRestLayer();
        }
        return new WorldWind.BingRoadsLayer(); // plain map with labels
    }
    
    class DAA_Airspace {
        offlineMap;
        wwd;
        nmi;//: number;
        _ownship;
        _traffic;//: any[];
        atmosphereLayer;
        /**
         * @function <a name="DAA_Airspace">DAA_Airspace</a>
         * @description Constructor. Creates a virtual airspace, including a map and traffic information.
         * @param opt {Object} Configuration options for the airspace.
         *          <li>ownship (Object({ lat: real, lon: real, alt: real})): ownship position, given in the form { lat: real, lon: real, alt: real } (default lat/lon: Hampton, VA, USA; default altitude 1000 meters) </li>
         *          <li>traffic (Array of Object({ lat: real, lon: real, alt: real})): position of other aircraft (default is null)</li>
         *          <li>offlineMap (String): folder storing BMNG offline maps, downloaded from the <a href="http://worldwindserver.net/webworldwind/WebWorldWindStandaloneData.zip" target=_blank>http://worldwindserver.net</a></li>
         *          <li>terrain (String): terrain type, one of "BMNG" (terrain, low res), "BMNGOne" (terrain, low res), "BMNGLandsat" (terrain, low res), "BingAerial" (terrain, high res), "BingAerialWithLabels" (terrain, high res), "BingRoads" (map, high res)</li>
         *          <li>atmosphere (bool): whether the atmosphere layer is to be rendered (default: false)</li>
         *          <li>shader (real): semi-transparent overlay layer applied over the map. This layer is useful
         *                              for enhancing the visibility of traffic information over bright map colors.
         *                              A value of 0 means the shader is not applied. (default: 0.4)</li>
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        constructor(opt) {
            opt = opt || {};
            opt.ownship = opt.ownship || {};
            opt.ownship.lat = opt.ownship.lat || cities.hampton.lat;
            opt.ownship.lon = opt.ownship.lon || cities.hampton.lon;
            opt.ownship.alt = opt.ownship.alt || 1000;
            opt.traffic = opt.traffic || [];
            opt.canvas = opt.canvas || "canvasOne";
            opt.shader = (isNaN(+opt.shader)) ? 0.4 : +opt.shader;
            this.offlineMap = opt.offlineMap;
    
            // create worldwind view in the canvas
            this.wwd = new WorldWind.WorldWindow(opt.canvas);
    
            this.wwd.surfaceOpacity = 0.999; // this should reduce flickering when loading tiles, see https://github.com/NASAWorldWind/WebWorldWind/issues/353
            this.wwd.verticalExaggeration = 0; // 0 is flat world. A value of 1 will make it 3D
            this.nmi = 5; // default eye view
    
            // Add map layers to worldwind.
            if (this.offlineMap) {
                this.wwd.addLayer(new WorldWind.BMNGRestLayer(null, this.offlineMap));
            } else {
                let terrain = _get_terrain(opt.terrain);
                this.wwd.addLayer(terrain);
                if (opt.shader > 0) {
                    // Add shader, to enhance visibility of DAA symbols over Bing map
                    let surfaceImage2 = new WorldWind.SurfaceImage(WorldWind.Sector.FULL_SPHERE, utils.baseUrl + "images/black.png");
                    surfaceImage2.opacity = opt.shader;
                    let surfaceImageLayer = new WorldWind.RenderableLayer();
                    surfaceImageLayer.addRenderable(surfaceImage2);
                    this.wwd.addLayer(surfaceImageLayer);
                }
            }
    
            // Create ownship, and make it invisible because danti renders the ownship in overlay
            // Having the ownship in WWD is useful for adjusting the map location
            this._ownship = new DAA_Aircraft(this.wwd, {
                lat: opt.ownship.lat,
                lon: opt.ownship.lon,
                alt: opt.ownship.alt,
                symbol: "daa-ownship",
                name: "ownship"
            }, function (ownship) {
                if (config.hideOwnshipSymbol) {
                    ownship.hide();
                }
            });
    
            // Render traffic information
            this._traffic = [];
            if (opt.traffic) {
                this.setTraffic(opt.traffic);
            }
    
            // Create atmosphere layer
            if (opt.atmosphere) {
                this.atmosphereLayer = new WorldWind.AtmosphereLayer();
                let timestamp = Date.now(); // The current date will be given to initialize the simulation of the sun postion.
                this.atmosphereLayer.time = new Date(timestamp); // Atmosphere layer requires a date to simulate the Sun position at that time.
                this.wwd.addLayer(this.atmosphereLayer);
            }
    
            // show coordinates
            this.wwd.addLayer(new WorldWind.CoordinatesDisplayLayer(this.wwd));
            // this.wwd.addLayer(new WorldWind.CompassLayer());
            // this.wwd.addLayer(new WorldWind.ViewControlsLayer(this.wwd));
    
            // Center the view on the ownship.
            this.wwd.navigator.lookAtLocation.latitude = opt.ownship.lat;
            this.wwd.navigator.lookAtLocation.longitude = opt.ownship.lon;

            // attach autoscale
            this.wwd.addEventListener("wheel", () => {
                this.autoScale();
            });
            
            // set 2D view
            this.view2D();
        }
        /**
         * Utility function, adds event listener for mouse wheel events -- necessary for resizing traffic symbols when zooming the map
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        autoScale() {
            const NMI = this.wwd.navigator.range / scaleFactor;
            // console.log("updating scale factor to " + NMI + "NMI");
            if (this._traffic) {
                this._traffic.forEach(aircraft => {
                    aircraft.setScale(NMI);
                });
            }
            if (this._ownship) {
                this._ownship.setScale(NMI);
            }
        }
        /**
         * Sets the zoom level of the airspace.
         * @param NMI {real} Zoom level, given in nautical miles. The map is resized so that the diagonal size of the map corresponds to the provided NMI value.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        setZoomLevel(NMI) {
            this.nmi = NMI || this.nmi;
            // wwd.navigator.range is the diagonal size of the wwd map displayed in the canvas.
            this.wwd.navigator.range = NMI * scaleFactor;
            this._traffic.forEach(function (aircraft) {
                aircraft.setScale(NMI);
            });
            this._ownship.setScale(NMI);
            this.wwd.redraw();
            return this;
        }
        /**
         * @function <a name="DAA_Airspace_view2D">view2D</a>
         * @description Emulates 2D view by setting the ownship view perpendicular to the map.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        view2D() {
            this.wwd.navigator.range = this.nmi; //64e4;//16e4;
            this.wwd.navigator.tilt = 0; // 0 degrees tilt
            // this.wwd.navigator.fieldOfView = 180;
            // console.log(this.wwd.navigator);
            // this.wwd.redraw();
            return this;
        }
        /**
         * @function <a name="DAA_Airspace_view3D">view3D</a>
         * @description Emulates 3D view by tilting the ownship to 55 degrees.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        view3D() {
            this.wwd.navigator.tilt = 55; // 55 degrees tilt
            this.wwd.navigator.range = this.nmi; // 6e4;
            this.wwd.redraw();
            return this;
        }
        /**
         * @function <a name="DAA_Airspace_recenter">recenter</a>
         * @description Centers the map on the ownship position.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        recenter() {
            let pos = this._ownship.getPosition();
            this.wwd.navigator.lookAtLocation.latitude = pos.lat;
            this.wwd.navigator.lookAtLocation.longitude = pos.lon;
            this.wwd.redraw();
            return this;
        }
        /**
         * @function <a name="DAA_Airspace_render">render</a>
         * @description Triggers re-rendering of the map.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        render() {
            // redraw airspace
            this.wwd.redraw();
            return this;
        }
        /**
         * @function <a name="DAA_Airspace_goTo">goTo</a>
         * @description Moves the ownship to a given location and re-centers the map to that location.
         * @param pos {Object({ lat: real, lon: real })} New position of the ownship.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        goTo(pos) {
            if (pos) {
                if (typeof pos === "string") {
                    // remove white spaces in the name and make all small letters
                    pos = pos.replace(/\s/g, "").toLowerCase();
                    // look for the name of the city in the list of known destinations (array cities)
                    let loc = cities[pos];
                    if (loc && loc.lat && loc.lon) {
                        this._ownship.setPosition(loc);
                    } else {
                        console.error("Could not find location " + location + " :((");
                    }
                } else {
                    this._ownship.setPosition(pos);
                }
                return this.recenter();
            } else {
                console.error("Incorrect aircraft position :/ ", pos);
            }
            return this;
        }
        /**
         * @function <a name="DAA_Airspace_setHeading">setHeading</a>
         * @desc Ownship's heading, in degrees, clockwise, north is 0 deg.
         * @param deg (real) Heading degrees
         * @param opt {Object} Visualization options:
         *                      <li>nrthup (bool): The owship symbol rotates if nrthup = false. The entire map rotates if nrthup = true.</li>
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        setHeading(deg, opt) {
            opt = opt || {};
            this.wwd.navigator.heading = deg;
            if (!opt.nrthup) {
                this._ownship.setHeading(-deg);
            }
            this.wwd.redraw();
            return this;
        }
        /**
         * @function <a name="DAA_Airspace_getHeading">getHeading</a>
         * @desc Returns the current heading of the ownship.
         * @return {real} Heading, in degrees, clockwise, north is 0 deg.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        getHeading() {
            return this.wwd.navigator.heading;
        }
        /**
         * @function <a name="DAA_Airspace_getTraffic">getTraffic</a>
         * @desc Returns the current traffic information.
         * @return {Array(TrafficDescriptors)} Traffic information, as an array of traffic descriptors.
         *              Each traffic descriptor is an object with the following attributes:
         *              <li>lat (real): latitudes</li>
         *              <li>lon (real): longitude</li>
         *              <li>alt (real): altitude</li>
         *              <li>symbol (String): one of "daa-target", "daa-alert", "daa-traffic-avoid", "daa-traffic-monitor", "daa-ownship"</li>
         *              <li>name (String): unique traffic identifier</li>
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        getTraffic() {
            return this._traffic;
        }
        /**
         * @function <a name="DAA_Airspace_setTraffic">setTraffic</a>
         * @desc Updates traffic information.
         * @param traffic {Array(TrafficDescriptors)} Traffic information, as an array of traffic descriptors.
         *              Each traffic descriptor is an object with the following attributes:
         *              <li>s: {lat: real, lon: real, alt: real} position of the aircraft</li>
         *              <li>v: {x: real, y: real, z: real} velocity vector</li>
         *              <li>symbol (String): one of "daa-target", "daa-alert", "daa-traffic-avoid", "daa-traffic-monitor", "daa-ownship"</li>
         *              <li>name (String): unique traffic identifier</li>
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        setTraffic(traffic) {
            if (traffic.length !== this._traffic.length) {
                this._traffic.forEach((aircraft) => {
                    // TODO: is there a way to remove collada objects from the scene?
                    aircraft.hide();
                });
                this._traffic = [];
            }
            if (traffic && traffic.length > 0) {
                for (let i = 0; i < traffic.length; i++) {
                    if (i < this._traffic.length) {
                        this._traffic[i].setPositionAndVelocity(traffic[i].s, traffic[i].v);
                        this._traffic[i].setLabel(traffic[i].name);
                        this._traffic[i].setSymbol(traffic[i].symbol);
                    } else {
                        const aircraft = new DAA_Aircraft(this.wwd, {
                            lat: traffic[i].s.lat,
                            lon: traffic[i].s.lon,
                            alt: traffic[i].s.alt,
                            symbol: (traffic[i].symbol !== null || traffic[i].symbol !== undefined) ? 
                                traffic[i].symbol : "daa-target",
                            name: (traffic[i].name !== null || traffic[i].name !== undefined) ?
                                traffic[i].name : "traffic-" + i,
                            reference: this._ownship
                        });
                        aircraft.setVelocity(traffic[i].v)
                        this._traffic.push(aircraft);
                    }
                }
            }
            this.autoScale();
            return this;
        }
        /**
         * @function <a name="DAA_Airspace_setTrafficPosition">setTrafficPosition</a>
         * @desc Updates position and velocity of traffic.
         *       Aircraft that are already on the map keep their current symbol.
         *       If new aircraft enter map, they use a daa-target symbol.
         *       If a different symbol needs to be rendered, use <a href="DAA_Airspace_setTraffic">setTraffic</a>.
         * @param traffic {Array(TrafficDescriptors)} Traffic information, as an array of traffic descriptors.
         *              Each traffic descriptor is an object with the following attributes:
         *              <li>lat (real): latitudes</li>
         *              <li>lon (real): longitude</li>
         *              <li>alt (real): altitude</li>
         *              <li>symbol (String): one of "daa-target", "daa-alert", "daa-traffic-avoid", "daa-traffic-monitor", "daa-ownship"</li>
         *              <li>name (String): unique traffic identifier</li>
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        setTrafficPosition(traffic) {
            if (traffic && traffic.length > 0) {
                for (let i = 0; i < traffic.length; i++) {
                    if (i < this._traffic.length) {
                        if (typeof traffic[i].s === "object") {
                            this._traffic[i].setPosition(traffic[i].s, {
                                ownship: this._ownship
                            });
                        }
                        if (typeof traffic[i].v === "object") {
                            this._traffic[i].setVelocity(traffic[i].v);
                        }
                    } else {
                        const aircraft = new DAA_Aircraft(this.wwd, {
                            lat: traffic[i].s.lat,
                            lon: traffic[i].s.lon,
                            alt: traffic[i].s.alt,
                            symbol: "daa-target",
                            name: "target" + i,
                            reference: this._ownship
                        });
                        aircraft.setVelocity(traffic[i].v);
                        this._traffic.push(aircraft);
                    }
                }
            }
            return this;
        }
        /**
         * @function <a name="DAA_Airspace_setTrafficSymbolsByAlert">setTrafficSymbolsByAlert</a>
         * @desc Updates traffic symbols.
         * @param alerts {Array(symbols)} Alert information for each aircraft.
         *              The index of the alerts is used to identify the aircraft (i.e., alerts[i] is for traffic[i]).
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        setTrafficSymbolsByAlert(alerts) {
            if (alerts && alerts.length > 0) {
                for (let i = 0; i < alerts.length && i < this._traffic.length; i++) {
                    this._traffic[i].selectSymbolByAlert(alerts[i]);
                }
                this.render();
            }
            return this;
        }
        /**
         * @function <a name="DAA_Airspace_hideTraffic">hideTraffic</a>
         * @desc Hides traffic information.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        hideTraffic() {
            this._traffic.forEach(function (traffic) {
                traffic.hide();
            });
            return this.render();
        }
        /**
         * @function <a name="DAA_Airspace_revealTraffic">revealTraffic</a>
         * @desc Reveals traffic information.
         * @memberof module:InteractiveMap
         * @instance
         * @inner
         */
        revealTraffic() {
            this._traffic.forEach(function (traffic) {
                traffic.reveal();
            });
            return this.render();
        }
    }
    
    require("daa-displays/templates/daa-map-templates.js");
    // const mapTemplate = require("text!widgets/daa-displays/templates/daa-map.handlebars");
    
    class InteractiveMap {
        id;//: string;
        heading;//: number;
        pos;//: { lat: number, lon: number };
        trafficPosition;//: any[];
        wwd;
        div;//: HTMLDivElement;
        /**
         * @function <a name="InteractiveMap">InteractiveMap</a>
         * @description Constructor.
         * @param id {String} Unique widget identifier.
         * @param coords {Object} The four coordinates (top, left, width, height) of the widget, specifying
         *        the left/top corners, and the width/height of the (rectangular) widget area.
         * @param opt {Object} Style options defining the visual appearance of the widget.
         *          <li>pos (Object): Earth location shown at the center of the map. Location is given as { lat: (real), lon: (real) } (default: lat/lon of Hampton, VA, USA) </li>
         *          <li>offlineMap (String): path to a folder containing NASA Blue Marble (BMNG) offline maps</li>
         *          <li>terrain (String): terrain type, one of "BMNG" (terrain, low res), "BMNGOne" (terrain, low res), "BMNGLandsat" (terrain, low res), "BingAerial" (terrain, high res), "BingAerialWithLabels" (terrain, high res), "BingRoads" (map, high res)</li>
         *          <li>atmosphere (bool): whether the atmosphere layer is to be rendered (default: false)</li>
         *          <li>parent (String): the HTML element where the widget will be appended (default is "body")</li>
         * @memberof module:InteractiveMap
         * @instance
         */
        constructor(id, coords, opt) {
            opt = opt || {};
            this.id = id;
            this.heading = 0; // default heading is 0 deg (i.e., pointing north)
            this.pos = opt.pos || cities.hampton;
            this.trafficPosition = [];
    
            coords = coords || {};
            coords.top = (isNaN(+coords.top)) ? 0 : +coords.top;
            coords.left = (isNaN(+coords.left)) ? 0 : +coords.left;
    
            // create the DOM element
            this.div = utils.createDiv(id, {
                parent: opt.parent
            });
            let theHTML = Handlebars.compile(templates.mapTemplate)({
                id: this.id,
                top: coords.top,
                left: coords.left
            });
            $(this.div).html(theHTML);
            this.wwd = new DAA_Airspace({
                canvas: this.id + "-canvas",
                offlineMap: opt.offlineMap,
                terrain: opt.terrain,
                atmosphere: opt.atmosphere
            });
            this.wwd.setHeading(this.heading);
            this.wwd.setZoomLevel(5); // NMI
            this.wwd.setTrafficPosition(this.trafficPosition);
        }
        /**
         * @function <a name="setHeading">setHeading</a>
         * @description Rotates the map.
         * @param deg {real} Rotation value.
         * @memberof module:InteractiveMap
         * @instance
         */
        setHeading(deg) {
            this.heading = deg;
            this.wwd.setHeading(deg);
            return this;
        }
        /**
         * @function <a name="showTraffic">showTraffic</a>
         * @description Reveals/Hide traffic information on the map.
         * @param flag {Bool} Traffic is revealed when flat is True. Traffic is hidden otherwise.
         * @memberof module:InteractiveMap
         * @instance
         */
        showTraffic(flag) {
            return (flag) ? this.wwd.revealTraffic() : this.wwd.hideTraffic();
        }
        // getMap () {
        //     return this.wwd;
        // }
        /**
         * @function <a name="revealTraffic">revealTraffic</a>
         * @description Reveals traffic information on the map.
         * @memberof module:InteractiveMap
         * @instance
         */
        revealTraffic() {
            this.wwd.revealTraffic();
            return this;
        }
        /**
         * @function <a name="hideTraffic">hideTraffic</a>
         * @description Hides traffic information on the map.
         * @memberof module:InteractiveMap
         * @instance
         */
        hideTraffic() {
            this.wwd.hideTraffic();
            return this;
        }
        /**
         * @function <a name="setZoomLevel">setZoomLevel</a>
         * @description Sets the zoom level of the map.
         * @param NMI {real} Zoom level, given in nautical miles. The map is resized so that the diagonal size of the map corresponds to the provided NMI value.
         * @memberof module:InteractiveMap
         * @instance
         */
        setZoomLevel(NMI) {
            this.wwd.setZoomLevel(NMI);
            return this;
        }
        /**
         * @function <a name="goTo">goTo</a>
         * @description Sets the current position of the map.
         * @param pos {Object} Earth location shown at the center of the map, given as { lat: (real), lon: (real) }
         * @memberof module:InteractiveMap
         * @instance
         */
        goTo(pos) {
            if (typeof pos === "string") {
                // remove white spaces in the name and make all small letters
                pos = pos.replace(/\s/g, "").toLowerCase();
                // look for the name of the city in the list of known destinations (array cities)
                pos = cities[pos];
            }
            if (pos && pos.lat && pos.lon) {
                this.pos = pos;
                this.wwd.goTo(pos);
            } else {
                console.error("Incorrect aircraft position :/ ", pos);
            }
            return this;
        }
        /**
         * @function <a name="setPosition">setPosition</a>
         * @description Sets the current position of the map. This function is equivalent to <a href="#goTo">goTo</a>.
         * @param pos {Object} Earth location shown at the center of the map, given as { lat: (real), lon: (real) }
         * @memberof module:InteractiveMap
         * @instance
         */
        setPosition(pos) {
            return this.goTo(pos);
        }
        /**
         * @function <a name="setTrafficPosition">setTrafficPosition</a>
         * @description Sets the position of the traffic on the map.
         * @param data {Array(TrafficDescriptors)} Traffic information, as an array of traffic descriptors.
         *              Each traffic descriptor is an object with the following attributes:
         *              <li>s (Object) JSON object representing the position of the aircraft, in the form { lat: real, lon: real, alt: real } </li>
         *              <li>v (Object) JSON object representing the velocity of the aircraft, in the form { x: real, y: real, z: real } </li>
         *              <li>symbol (String): one of "daa-target", "daa-alert", "daa-traffic-avoid", "daa-traffic-monitor", "daa-ownship"</li>
         *              <li>name (String): unique traffic identifier</li>
         * @memberof module:InteractiveMap
         * @instance
         */
        setTrafficPosition(data) {
            this.trafficPosition = data;
            this.wwd.setTrafficPosition(data);
            return this;
        }
        /**
         * @function <a name="setTraffic">setTraffic</a>
         * @description Sets position and symbols of other aircraft.
         * @param data {Array(TrafficDescriptors)} Traffic information, as an array of traffic descriptors.
         *              Each traffic descriptor is an object with the following attributes:
         *              <li>s (Object) JSON object representing the position of the aircraft, in the form { lat: real, lon: real, alt: real } </li>
         *              <li>v (Object) JSON object representing the velocity of the aircraft, in the form { x: real, y: real, z: real } </li>
         *              <li>symbol (String): one of "daa-target", "daa-alert", "daa-traffic-avoid", "daa-traffic-monitor", "daa-ownship"</li>
         *              <li>name (String): unique traffic identifier</li>
         * @memberof module:InteractiveMap
         * @instance
         */
        setTraffic(data) {
            this.trafficPosition = data;
            this.wwd.setTraffic(data);
            return this;
        }
        /**
         * @function <a name="setTrafficSymbolsByAlert">setTrafficSymbolsByAlert</a>
         * @description Sets the daa symbol of an aircraft.
         * @param alertType {String} Name of the daa symbol to be used for the aircraft, one of "daa-target", "daa-alert", "daa-traffic-avoid", "daa-traffic-monitor" "daa-ownship".
         * @memberof module:InteractiveMap
         * @instance
         */
        setTrafficSymbolsByAlert(alertType) {
            this.wwd.setTrafficSymbolsByAlert(alertType);
            return this;
        }
    }

    module.exports = InteractiveMap;
});