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
import * as utils from 'daa-displays/daa-utils';
import * as templates from './templates/daa-map-templates';
import * as WorldWind from './wwd/worldwind.min';
import * as serverInterface from './utils/daa-server'

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
    useTileCache: boolean = false;
    constructor(opt?: { useTileCache?: boolean }) {
        super();
        opt = opt || {};
        if (opt.useTileCache) {
            this.useTileCache = true;
        }
    }
    configureLayer(dc: WorldWind.DrawContext) {
        // this.layer = new WorldWind.WmtsLayer(wmtsConfig);
        // // Send an event to request a redraw.
        // var e = document.createEvent('Event');
        // e.initEvent(WorldWind.REDRAW_EVENT_TYPE, true, true);
        // dc.currentGlContext.canvas.dispatchEvent(e);
        if (!this.xhr) {
            const canvas = dc.currentGlContext.canvas;
            this.xhr = new XMLHttpRequest();
            // change the GET so that tiles are requested to the local server
            // this.xhr.open("GET", "https://tiles.maps.eox.at/wmts/1.0.0/WMTSCapabilities.xml", true);
            // this.xhr.open("GET", "http://localhost:10000/WMTSCapabilities.xml", true);
            const url: string = `${document.location.href}WMTSCapabilities.xml`;//"http://localhost:8082/WMTSCapabilities.xml";
            this.xhr.open("GET", url, true);
            this.xhr.onreadystatechange = () => {
                if (this.xhr.readyState === 4) {
                    if (this.xhr.status === 200) {
                        // Create a layer from the WMTS capabilities.
                        const wmtsCapabilities = new WorldWind.WmtsCapabilities(this.xhr.responseXML);

                        if (this.useTileCache) {
                            wmtsCapabilities.serviceProvider.providerSiteUrl = `${document.location.href}/daadisplays`; //"http://localhost:8082/daadisplays";
                            wmtsCapabilities.contents.layer[0].resourceUrl[0].template =
                                `${document.location.href}tiles.maps.eox.at/wmts/1.0.0/osm/default/WGS84/{TileMatrix}/{TileRow}/{TileCol}.jpg`;
                                // "http://localhost:8082/tiles.maps.eox.at/wmts/1.0.0/osm/default/WGS84/{TileMatrix}/{TileRow}/{TileCol}.jpg";
                        }

                        const wmtsLayerCapabilities = wmtsCapabilities.getLayer("osm");
                        const wmtsConfig = WorldWind.WmtsLayer.formLayerConfiguration(wmtsLayerCapabilities);
                        wmtsConfig.title = this.displayName;
                        this.layer = new WorldWind.WmtsLayer(wmtsConfig);

                        // Send an event to request a redraw.
                        const e: Event = document.createEvent('Event');
                        e.initEvent(WorldWind.REDRAW_EVENT_TYPE, true, true);
                        canvas.dispatchEvent(e);
                    } else {
                        console.warn(`OSM retrieval failed (${this.xhr.statusText}): ${url}`);
                    }
                }
            };
            this.xhr.onerror = function () {
                console.warn(`OSM retrieval failed: ${url}`);
            };
            this.xhr.ontimeout = function () {
                console.warn(`OSM retrieval timed out: ${url}`);
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
    "protected-jet": {
        fileName: "sc-protected-jet.dae", // this symbol is included for testing purposes, for the 3D view
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

// class WellClearVolume {
//     protected well_clear_volume: WorldWind.TriangleMesh;
//     /**
//      * @function <a name="WellClearVolume">WellClearVolume</a>
//      * @description Constructor. Renders a well-clear volume in 3D.
//      * @param layer {Object} wwd layer to be used for rendering the well-clear volume.
//      * @param lat {real} Latitude of the aircraft (degrees)
//      * @param lon {real} Longitude of the aircraft (degrees)
//      * @param alt {real} Altitude of the aircraft (meters)
//      * @memberof module:InteractiveMap
//      * @instance
//      * @inner
//      */
//     constructor(layer: WorldWind.RenderableLayer = null, lat: number = cities.hampton.lat, lon: number = cities.hampton.lon, alt: number = default_aircraft_altitude) {
//         const ZTHR: number = 4000;
//         // Create the mesh's positions.
//         let meshPositions = []; // Use a new positions array.
//         meshPositions.push(new WorldWind.Position(lat, lon, alt)); // the mesh center

//         const meshRadius: number = 0.1;
//         const numRadialPositions: number = 16;
//         const step: number = 360 / numRadialPositions;
//         for (let angle = 0; angle < 360; angle += step) {
//             // this code draws rectangles necessary for rendering the side of the cylinder
//             const angleRadians: number = angle * WorldWind.Angle.DEGREES_TO_RADIANS;
//             const latitude: number = meshPositions[0].latitude + Math.sin(angleRadians) * meshRadius;
//             const longitude: number = meshPositions[0].longitude + Math.cos(angleRadians) * meshRadius;
//             meshPositions.push(new WorldWind.Position(latitude, longitude, alt + ZTHR / 2));
//             meshPositions.push(new WorldWind.Position(latitude, longitude, alt - ZTHR / 2));
//             const next_angle: number = angle + step;
//             const next_angleRadians: number = next_angle * WorldWind.Angle.DEGREES_TO_RADIANS;
//             const next_latitude: number = meshPositions[0].latitude + Math.sin(next_angleRadians) * meshRadius;
//             const next_longitude: number = meshPositions[0].longitude + Math.cos(next_angleRadians) * meshRadius;
//             meshPositions.push(new WorldWind.Position(next_latitude, next_longitude, alt - ZTHR / 2));
//             meshPositions.push(new WorldWind.Position(next_latitude, next_longitude, alt + ZTHR / 2));
//             meshPositions.push(new WorldWind.Position(latitude, longitude, alt + ZTHR / 2));
//         }

//         // Use the same attributes as before, except for the image source, which is now the custom image.
//         const meshAttributes = new WorldWind.ShapeAttributes(null);
//         meshAttributes.outlineColor = new WorldWind.Color(0, 0, 1, 0.6); // transparent blue
//         meshAttributes.interiorColor = new WorldWind.Color(0, 0, 1, 0.4); // transparent blue
//         meshAttributes.applyLighting = true;
//         // meshAttributes.imageSource = new WorldWind.ImageSource(canvas);

//         // Create the mesh indices.
//         const numIndices: number = meshPositions.length - 1;
//         const meshIndices: number[] = [];
//         for (let i = 1; i < numIndices; i++) {
//             meshIndices.push(0);
//             meshIndices.push(i);
//             meshIndices.push(i + 1);
//         }
//         // Close the circle.
//         meshIndices.push(0);
//         meshIndices.push(numIndices);
//         meshIndices.push(1);

//         // Create the outline indices.
//         const outlineIndices: number[] = [];
//         for (let j = 1; j <= numIndices; j++) {
//             outlineIndices.push(j);
//         }
//         // Close the outline.
//         outlineIndices.push(1);

//         // Create the mesh.
//         const mesh: WorldWind.TriangleMesh = new WorldWind.TriangleMesh(meshPositions, meshIndices, meshAttributes);
//         mesh.outlineIndices = outlineIndices;

//         this.well_clear_volume = mesh;
//         // layer.addRenderable(this.well_clear_volume);
//     }
//     /**
//      * @function <a name="WellClearVolume_hide">hide</a>
//      * @description Hides the well clear volume.
//      * @memberof module:InteractiveMap
//      * @instance
//      * @inner
//      */
//     hide(): void {
//         this.well_clear_volume.enabled = false;
//     }
//     /**
//      * @function <a name="WellClearVolume_reveal">hide</a>
//      * @description Makes the well clear volume visible.
//      * @memberof module:InteractiveMap
//      * @instance
//      * @inner
//      */
//     reveal(): void {
//         this.well_clear_volume.enabled = true;
//     }
// }

class LosSector {
    protected sector: WorldWind.AbstractMesh;
    protected layer: WorldWind.RenderableLayer;
    protected getLosAltitude(altitude: number): number {
        return colladaAltitude(altitude - 100); // this is done to render los below the aircraft symbol
    }
    /**
     * @function <a name="LosSector">LosSector</a>
     * @description Constructor. Renders LoS regions.
     * @param layer { WorldWind.RenderableLayer } wwd layer to be used for rendering the LoS region.
     * @param pos { Position } Center of the conflict region
     * @param opt Optional attributes: nmi (size of the region, default is 1nmi), opacity (opacity of the region), color (region color)
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    constructor(layer: WorldWind.RenderableLayer, pos: utils.LatLonAlt | serverInterface.LatLonAlt, opt?: { nmi?: number, opacity?: number, color?: { r: number, g: number, b: number } }) {
        if (layer) {
            this.layer = layer;
            if (pos) {
                opt = opt || {};

                // 1 degree latitude is 69 miles and 60nmi
                // 1 degree longitude is ~69 miles and ~60nmi
                // 1 nautical mile is 1.15078 miles or 1.852km
                const nmi: number = (isNaN(opt.nmi)) ? 1 : opt.nmi;

                const opacity: number = (isNaN(opt.opacity)) ? 0.4 : opt.opacity;
                const color: { r: number, g: number, b: number } = opt.color || { r: 1, g: 0.54, b: 0 }; // default color is dark orange

                // const size: number = nmi / 60;
                // const boundaries: WorldWind.Location[] = [
                //     new WorldWind.Location(pos.lat + size, pos.lon + size),
                //     new WorldWind.Location(pos.lat + size, pos.lon - size),
                //     new WorldWind.Location(pos.lat - size, pos.lon - size),
                //     new WorldWind.Location(pos.lat - size, pos.lon + size)
                // ];

                // const attributes = new WorldWind.ShapeAttributes(null);
                // attributes.interiorColor = new WorldWind.Color(color.r, color.g, color.b, opacity);
                // attributes.applyLighting = false;

                // const conflictRegion: WorldWind.SurfacePolygon = new WorldWind.SurfacePolygon(boundaries, attributes);
                // this.layer.addRenderable(conflictRegion);

                const meshPositions = [];
                const meshIndices = [];
                const outlineIndices = [];
                const meshSegment = {
                    x: nmi / 2 / 60, // nmi
                    y: nmi / 2 / 60
                };

                const alt: number = (typeof pos.alt === "string")? +pos.alt : pos.alt;
                const altitude: number = this.getLosAltitude(alt);

                // flat piramid centered at the given position.
                const latitude: number = (typeof pos.lat === "string")? +pos.lat : pos.lat;
                const longitude: number = (typeof pos.lon === "string")? +pos.lon : pos.lon;
                const center: WorldWind.Position = new WorldWind.Position(latitude, longitude, altitude);
                meshPositions.push(center);
                const nodes: WorldWind.Position[] = [
                    new WorldWind.Position(meshPositions[0].latitude + meshSegment.y, meshPositions[0].longitude + meshSegment.x, altitude),
                    new WorldWind.Position(meshPositions[0].latitude + meshSegment.y, meshPositions[0].longitude - meshSegment.x, altitude),
                    new WorldWind.Position(meshPositions[0].latitude - meshSegment.y, meshPositions[0].longitude - meshSegment.x, altitude),
                    new WorldWind.Position(meshPositions[0].latitude - meshSegment.y, meshPositions[0].longitude + meshSegment.x, altitude)
                ];
                for (let i = 0; i < 4; i++) {
                    meshPositions.push(nodes[i]);
                    meshPositions.push(nodes[(i + 1) % 4]);
                    meshPositions.push(center);
                }

                const numRadialPositions: number = meshPositions.length - 1;
                // Create the mesh indices.
                for (var i = 1; i < numRadialPositions; i++) {
                    meshIndices.push(0);
                    meshIndices.push(i);
                    meshIndices.push(i + 1);
                }
                // Close the circle.
                meshIndices.push(0);
                meshIndices.push(numRadialPositions);
                meshIndices.push(1);

                // Create the outline indices.
                for (var j = 1; j <= numRadialPositions; j++) {
                    outlineIndices.push(j);
                }
                // Close the outline.
                outlineIndices.push(1);

                // Create the mesh's attributes. Light this mesh.
                var meshAttributes = new WorldWind.ShapeAttributes(null);
                // meshAttributes.outlineColor = WorldWind.Color.RED;
                meshAttributes.interiorColor = new WorldWind.Color(color.r, color.g, color.b, opacity);
                meshAttributes.applyLighting = false;

                // Create the mesh.
                var mesh = new WorldWind.TriangleMesh(meshPositions, meshIndices, meshAttributes);
                // mesh.outlineIndices = outlineIndices;
                mesh.enabled = true;
                mesh.displayName = `LoS Sector`;

                // Add the mesh to a layer and the layer to the WorldWindow's layer list.    
                this.sector = mesh;
                layer.addRenderable(this.sector);
            }
        }
    }
    /**
     * @function <a name="LosSector_hide">hide</a>
     * @description Hides the conflict region.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    hide(): void {
        if (this.sector) {
            this.sector.enabled = false;
        }
    }
    remove(): void {
        if (this.sector) {
            this.sector.enabled = false;
            this.layer.removeRenderable(this.sector);
        }
    }
    /**
     * @function <a name="LosSector_reveal">hide</a>
     * @description Makes the conflict region visible.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    reveal(): void {
        if (this.sector) {
            this.sector.enabled = true;
        }
    }
}

class LosRegion {
    protected region: LosSector[];
    protected layer: WorldWind.RenderableLayer;
    constructor (layer: WorldWind.RenderableLayer, region: utils.LatLonAlt[] | serverInterface.LatLonAlt[], opt?: { nmi?: number, opacity?: number, color?: { r: number, g: number, b: number } }) {
        if (layer) {
            opt = opt || {};
            this.layer = layer;
            if (region && region.length > 0) {
                this.region = [];
                for (let i = 0; i < region.length; i++) {
                    this.region.push(new LosSector(this.layer, region[i], opt));
                }
            }
        }
    }
    reveal () {
        if (this.region) {
            for (let i = 0; i < this.region.length; i++) {
                this.region[i].reveal();
            }
        }
    }
    hide () {
        if (this.region) {
            for (let i = 0; i < this.region.length; i++) {
                this.region[i].hide();
            }
        }
    }
    remove () {
        if (this.region) {
            for (let i = 0; i < this.region.length; i++) {
                this.region[i].remove();
            }
        }
    }
}

class Aircraft {
    protected position: utils.LatLonAlt;
    protected heading: number;
    protected velocity: utils.Vector3D;
    protected callSign: string;
    /**
     * @function <a name="Aircraft">Aircraft</a>
     * @description Constructor. Aircraft descriptor.
     * @param callSign {string} Unique aircraft name
     * @param lat {real} Latitude of the aircraft (degrees)
     * @param lon {real} Longitude of the aircraft (degrees)
     * @param alt {real} Altitude of the aircraft (meters)
     * @param vel {Object({x: real, y: real, z: real})} Velocity of the aircraft.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    constructor(callSign: string, s: utils.LatLonAlt | serverInterface.LatLonAlt) {
        this.callSign = callSign;
        this.position = {
            lat: +s.lat,
            lon: +s.lon,
            alt: +s.alt
        };
        this.velocity = null;
        this.heading = NaN;
    }
    /**
     * @function <a name="Aircraft_setPosition">setPosition</a>
     * @description Sets the current position of the aircraft.
     * @param pos {Object({ lat: real, lon: real, alt: real })} Earth location shown at the center of the map, given as { lat: real, lon: real, alt: real }
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setPosition(pos: utils.LatLonAlt | serverInterface.LatLonAlt): Aircraft {
        if (pos) {
            this.position.lat = +pos.lat; //(isNaN(+pos.lat)) ? this.position.lat: +pos.lat;
            this.position.lon = +pos.lon; //(isNaN(+pos.lon)) ? this.position.lon: +pos.lon;
            this.position.alt = +pos.alt; //(isNaN(+pos.alt)) ? this.position.alt: +pos.alt;
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
    setVelocity(vel: utils.Vector3D | serverInterface.Vector3D): Aircraft {
        if (vel) {
            this.velocity = this.velocity || { x: 0, y: 0, z: 0 };
            this.velocity.x = +vel.x; //(isNaN(+vel.x)) ? this.velocity.x : +vel.x;
            this.velocity.y = +vel.y; //(isNaN(+vel.y)) ? this.velocity.y : +vel.y;
            this.velocity.z = +vel.z; //(isNaN(+vel.z)) ? this.velocity.z : +vel.z;
            this.heading = utils.rad2deg(Math.atan2(this.velocity.x, this.velocity.y));
        }
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
    setAltitude(alt: number): Aircraft {
        if (!isNaN(alt)) {
            this.position.alt = alt;
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
    getPosition(): utils.LatLonAlt {
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
    protected getVelocity(): utils.Vector3D {
        return this.velocity;
    }
    getCallSign (): string {
        return this.callSign;
    }
    setCallSign (callSign: string): Aircraft {
        this.callSign = callSign;
        return this;
    }
    getHeading (): number {
        return this.heading;
    }
}

// utility function, used to offset the label for collada aircraft and convert feet to meters
// in 2D view, collada objects are artificially rendered closer to the ground otherwise they would not be rendered correctly in some scenarios,
// as they tend to fall outside the fov of the navigator
function colladaAltitude(alt: number) {
    return alt / 4;
}
class ColladaAircraft extends Aircraft {
    static readonly aircraftSymbols: string[] = [ "daa-ownship", "daa-alert", "daa-target", "daa-traffic-avoid", "daa-traffic-monitor" ];
    protected wwd: WorldWind.WorldWindow;
    protected colladaLoader: WorldWind.ColladaLoader;
    protected rotationOffset: { xRotation: number, yRotation: number, zRotation: number };
    protected renderable: WorldWind.ColladaScene;
    protected wwdLayer: WorldWind.RenderableLayer;
    protected nmiScale: number;
    protected symbol: string;
    /**
     * @function <a name="ColladaAircraft">ColladaAircraft</a>
     * @description Constructor. Uses a Collada model to creates an aircraft on the wwd map.
     * @param wwd {Object} Pointer to an instance of WorldWind.WorldWindow
     * @param lat {real} Latitude of the aircraft (degrees)
     * @param lon {real} Longitude of the aircraft (degrees)
     * @param alt {real} Altitude of the aircraft (meters)
     * @param heading {real} Heading of the aircraft (degrees)
     * @param symbol {String} DAA symbol to be used for the aircraft, one of "daa-target", "daa-alert", "daa-traffic-avoid", "daa-traffic-monitor", "daa-ownship" (default: daa-ownship).
     * @memberof module:InteractiveMap
     * @augments Aircraft
     * @instance
     * @inner
     */
    constructor(wwd: WorldWind.WorldWindow, desc: { lat: number, lon: number, alt: number, heading: number, callSign: string, symbol: string }, layers: { wwdLayer: WorldWind.RenderableLayer }) {
        super(desc.callSign, { lat: desc.lat, lon: desc.lon, alt: desc.alt });

        this.wwd = wwd;
        this.wwdLayer = layers.wwdLayer //new WorldWind.RenderableLayer("Aircraft"), // This layers is used to render the aircraft
        this.symbol = desc.symbol || "daa-target";

        this.colladaLoader = new WorldWind.ColladaLoader(new WorldWind.Position(desc.lat, desc.lon, desc.alt)); // WorldWind uses meters instead of feet
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

        delete this.velocity; // velocity vector is meaningless for collada objects -- here we use heading
        this.heading = desc.heading;

        // to load the objects, the caller needs to invoke setupRenderables
    }
    async setupRenderables (selectedSymbol: string): Promise<ColladaAircraft> {
        return new Promise ((resolve, reject) => {
            const obj = colladaObjects[this.symbol]; //colladaObjects.privateJet;
            this.colladaLoader.load(obj.fileName, (colladaScene: WorldWind.ColladaScene) => {
                if (colladaScene) {
                    this.renderable = colladaScene;
                    // set call sign and altitude data
                    this.renderable.displayName = this.callSign;
                    // this.renderableAircraft.useTexturePaths = false; // use this option to force loading textures from the same directory of the collada file
                    // set standard position and heading
                    this.renderable.altitudeMode = WorldWind.ABSOLUTE; // the alternative is RELATIVE_TO_GROUND;
                    this.renderable.xRotation = obj.xRotation || 0;
                    this.rotationOffset.xRotation = this.renderable.xRotation;
                    this.renderable.yRotation = obj.yRotation || 0;
                    this.rotationOffset.yRotation = this.renderable.yRotation;
                    this.renderable.zRotation = obj.zRotation || 0;
                    this.rotationOffset.zRotation = this.renderable.zRotation;
                    // this.renderable.position = new WorldWind.Position(this.position.lat, this.position.lon, colladaAltitude(this.position.alt));
                    this.setPosition({ lat: this.position.lat, lon: this.position.lon, alt: this.position.alt }); // the altitude is artificially reduced to so we have a wider field of view
                    this.setHeading(this.heading);
                    // set scale
                    this.setScale(this.nmiScale);
                    // make the object visible
                    this.renderable.enabled = (this.symbol === selectedSymbol);
                    // add renderable
                    this.wwdLayer.addRenderable(this.renderable); // Add the Collada model to the renderable layer within a callback.
                } else {
                    console.error("[ColladaAircraft] Warning: Could not load collada object :/");
                }
                // resolve promise
                resolve(this);
            });
        });
    }
    // setVelocity(vel: utils.Vector3D | serverInterface.Vector3D): ColladaAircraft {
    //     if (vel) {
    //         super.setVelocity(vel);
    //         // rotate the aircraft accordingly
    //         // const deg = utils.rad2deg(Math.atan2(this.velocity.x, this.velocity.y));
    //         this.setHeading();
    //     }
    //     return this;
    // }
    /**
     * @function <a name="ColladaAircraft_setPosition">setPosition</a>
     * @description Sets the current position of the aircraft.
     * @param pos {Object({ lat: real, lon: real, alt: real })} Earth location shown at the center of the map, given as { lat: real, lon: real, alt: real }. Lat Lon are in deg. Altitude is in feet.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setPosition(pos: utils.LatLonAlt | serverInterface.LatLonAlt): ColladaAircraft {
        if (this.renderable) {
            if (pos) {
                super.setPosition(pos);
                this.renderable.position = new WorldWind.Position(this.position.lat, this.position.lon, colladaAltitude(this.position.alt));
            }
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
    hide(): ColladaAircraft {
        if (this.renderable) {
            this.renderable.enabled = false;
        } else {
            console.error("[ColladaAircraft] Warning: collada object could not be made hidden");
        }
        return this;
    }
    // removes renderables
    remove(): ColladaAircraft {
        if (this.renderable) {
            this.renderable.enabled = false;
            this.wwdLayer.removeRenderable(this.renderable);
        } else {
            console.error("[ColladaAircraft] Warning: collada object could not be made removed");
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
    reveal(): ColladaAircraft {
        if (this.renderable) {
            this.renderable.enabled = true;
        } // else, renderable is still loading, scale will be adjusted when the renderable has completed loading, see setupRenderables()
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
    setHeading(deg: number) {
        if (!isNaN(deg) && this.renderable) {
            this.heading = deg;
            this.renderable.zRotation = this.rotationOffset.zRotation + deg;
        }
        return this;
    }
    /**
     * @function <a name="ColladaAircraft_autoScale">autoScale</a>
     * @desc Scales the aircraft symbol based on the map scale.
     *       This is necessary to keep the symbol size constant when zooming in/out the map
     *       (in wwd, zooming in results in larger collada objects, zooming out leads to smaller objects).
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setScale(nmiScale: number): ColladaAircraft {
        if (!isNaN(nmiScale)) {
            this.nmiScale = nmiScale;
            if (this.renderable) {
                this.renderable.scale = colladaScale / 5 * this.nmiScale;
            }
        }
        return this;
    }
}



class DAA_Aircraft extends Aircraft {
    readonly symbolColor = {
        "daa-ownship": WorldWind.Color.CYAN,
        "daa-alert": WorldWind.Color.RED, // this is also called "warning"
        "daa-target": WorldWind.Color.WHITE,
        "daa-traffic-avoid": WorldWind.Color.YELLOW, // this is also called "corrective"
        "daa-traffic-monitor": WorldWind.Color.YELLOW // this is also called "preventive"
    };
    protected renderableAircraft: { "daa-ownship": ColladaAircraft, "daa-alert": ColladaAircraft, "daa-target": ColladaAircraft, "daa-traffic-avoid": ColladaAircraft, "daa-traffic-monitor": ColladaAircraft };
    protected renderablePosition: WorldWind.GeographicText;
    protected renderableCallSign: WorldWind.GeographicText;
    protected callSignVisible: boolean;
    protected aircraftVisible: boolean;
    protected selectedSymbol: string;
    protected _own: Aircraft;
    protected nmiScale: number;
    protected textLayer: WorldWind.RenderableLayer;
    protected los: LosRegion;
    protected losLayer: WorldWind.RenderableLayer;
    protected aircraftLayer: WorldWind.RenderableLayer;
    protected wwd: WorldWind.WorldWindow;
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
     *          <li>callSign (String): name of the aircraft, currently used only for debugging purposes.</li>
     *          <li>s ({ lat:real, lon:real, alt:real }) position, lat lon are in degrees, alt is in feet</li>
     *          <li>v ({ x:real, y: real, z: real }) velocity vector (m/s)</li>
     *          <li>ownship (Object): pointer to the ownship descriptor, with information about position and speed.</li>
     * @param cb {Function} Optional callback function. The function is invoked when all renderables are loaded.
     * @memberof module:InteractiveMap
     * @augments Aircraft
     * @instance
     * @inner
     */
    constructor(wwd: WorldWind.WorldWindow, 
                desc: { s: utils.LatLonAlt | serverInterface.LatLonAlt, symbol?: string, callSign?: string, callSignVisible?: boolean, aircraftVisible?: boolean, v?: utils.Vector3D | serverInterface.Vector3D, ownship?: Aircraft }, 
                layers: { losLayer: WorldWind.RenderableLayer, aircraftLayer: WorldWind.RenderableLayer, textLayer: WorldWind.RenderableLayer }) {
        super(desc.callSign, desc.s);
        super.setVelocity(desc.v);
        desc.symbol = desc.symbol || "daa-ownship";
        desc.callSign = desc.callSign || "";
        this.callSignVisible = !!desc.callSignVisible;
        this.selectedSymbol = desc.symbol;
        this._own = desc.ownship; // this attribute is relevant only for traffic aircraft, it is used to compute the relative altitude wrt the ownship
        this.losLayer = layers.losLayer;
        this.aircraftLayer = layers.aircraftLayer; // this layer is used for rendering the aircraft symbol
        this.textLayer = layers.textLayer; // this layer is used for rendering call sign and position data
        this.aircraftVisible = !!desc.aircraftVisible;
        this.wwd = wwd; // pointer to WorldWind
        this.nmiScale = 1;

        // add labels
        this.addRenderableLabels();
        // add aircraft -- async call, the aircraft will be rendered when ready
        this.addRenderableAircraft();
    }
    protected async addRenderableAircraft (): Promise<DAA_Aircraft> {
        this.renderableAircraft = {
            "daa-ownship": new ColladaAircraft(this.wwd, { lat: this.position.lat, lon: this.position.lon, alt: this.position.alt, heading: this.heading, callSign: this.callSign, symbol: "daa-ownship" }, { wwdLayer: this.aircraftLayer }),
            "daa-alert": new ColladaAircraft(this.wwd, { lat: this.position.lat, lon: this.position.lon, alt: this.position.alt, heading: this.heading, callSign: this.callSign, symbol: "daa-alert" }, { wwdLayer: this.aircraftLayer }),
            "daa-target": new ColladaAircraft(this.wwd, { lat: this.position.lat, lon: this.position.lon, alt: this.position.alt, heading: this.heading, callSign: this.callSign, symbol: "daa-target" }, { wwdLayer: this.aircraftLayer }),
            "daa-traffic-avoid": new ColladaAircraft(this.wwd, { lat: this.position.lat, lon: this.position.lon, alt: this.position.alt, heading: this.heading, callSign: this.callSign, symbol: "daa-traffic-avoid" }, { wwdLayer: this.aircraftLayer }),
            "daa-traffic-monitor": new ColladaAircraft(this.wwd, { lat: this.position.lat, lon: this.position.lon, alt: this.position.alt, heading: this.heading, callSign: this.callSign, symbol: "daa-traffic-monitor" }, { wwdLayer: this.aircraftLayer })
        };
        // load all renderables
        const keys: string[] = Object.keys(this.renderableAircraft);
        for (let i = 0; i < keys.length; i++) {
            const aircraft: ColladaAircraft = this.renderableAircraft[keys[i]];
            await aircraft.setupRenderables(this.selectedSymbol); // load the collada object
        }
        if (this.aircraftVisible) {
            this.reveal();
        } else {
            this.hide();
        }
        // we need to refresh the map here, after all collada objects have been loaded
        this.wwd.redraw();
        return this;
    }
    // protected async setupRenderables (): Promise<DAA_Aircraft> {

    //     // make selected symbol visible
    //     const aircraft: ColladaAircraft = this.renderableAircraft[this.selectedSymbol];
    //     if (aircraft) {
    //         if (this.aircraftVisible) {
    //             aircraft.reveal();
    //         } else {
    //             aircraft.hide();
    //         }
    //     } else {
    //         console.error("[DAA_Aircraft] Warning: selected aircraft symbol could not be accessed");
    //     }



    //     // set heading
    //     const deg = this.getHeading();
    //     this.setHeading(deg);

    //     return this;
    // }
    // utility function, creates a label similar to that used in TCAS displays
    // The label includes:
    //  - relative altitude (reference altitude is the ownship altitude): 2 digits, units is 100 feet
    //  - velocity vector: represented using an arrow (arrow-up if aircraft is climbing, arrow-down if aircraft is descending, no arrow is shown if the aircraft is levelled)
    // The label color matches that of the daa symbol of the aircraft
    // The label is shown above the daa symbol if the altitude of the aircraft is greater than or equal the ownship's altitude, below otherwise.
    protected createLabel (): { text: string, position: WorldWind.Position, offsetX: number, offsetY: number } {
        function fixed2(val: number): string {
            if (val > 0) {
                return (val < 10) ? "0" + val : val.toString();
            }
            return (val > -10) ? "-0" + (-val) : val.toString();
        }
        let label = {
            text: "",
            position: new WorldWind.Position(this.position.lat, this.position.lon, colladaAltitude(this.position.alt)),
            offsetX: 18,
            offsetY: 0
        };
        // indicate altitude, in feet
        let val = Math.trunc((this.position.alt - this._own.getPosition().alt) / 100);
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
        const THRESHOLD: number = 50; // Any climb or descent smaller than this threshold show as level flight (no arrow)
        if (Math.abs(this.getVelocity().z) >= THRESHOLD) {
            if (this.getVelocity().z > 0) {
                // add arrow up before label
                label.text += arrows["white-up"];
            } else if (this.getVelocity().z < 0) {
                // add arrow down before label
                label.text += arrows["white-down"];
            }
        }
        // console.log(label);
        return label;
    }
    hideCallSign (): DAA_Aircraft {
        if (this.renderableCallSign) {
            this.renderableCallSign.enabled = false;
            this.callSignVisible = false;
        }
        return this;
    }
    revealCallSign (): DAA_Aircraft {
        if (this.renderableCallSign) {
            this.renderableCallSign.enabled = true;
            this.callSignVisible = true;
        }
        return this;
    }
    protected createCallSign (): { text: string, position: WorldWind.Position, offsetX: number, offsetY: number } {
        let label = {
            text: "",
            position: new WorldWind.Position(this.position.lat, this.position.lon, colladaAltitude(this.position.alt)),
            offsetX: 18,
            offsetY: 0
        };
        // indicate altitude, in feet
        const val = Math.trunc((this.position.alt - this._own.getPosition().alt) / 100);
        label.text = this.getCallSign();
        if (val < 0) {
            label.offsetY = -16; // text will at the top of the symbol (y axis points down in the canvas)
        } else {
            label.offsetY = 42; // text will at the bottom of the symbol (y axis points down in the canvas)
        }
        return label;
    }
    protected addRenderableLabels(): DAA_Aircraft {
        if (this.selectedSymbol && !(config.hideOwnshipLabel && this.selectedSymbol === "daa-ownship")) {
            const aircraftLabel = this.createLabel();
            this.renderablePosition = new WorldWind.GeographicText(aircraftLabel.position, aircraftLabel.text);
            this.renderablePosition.attributes = new WorldWind.TextAttributes(null);
            this.renderablePosition.attributes.color = this.symbolColor[this.selectedSymbol];
            this.renderablePosition.attributes.font.weight = "bold";
            this.renderablePosition.attributes.font.size = 18;
            this.renderablePosition.attributes.offset = new WorldWind.Offset(WorldWind.OFFSET_PIXELS, aircraftLabel.offsetX, WorldWind.OFFSET_PIXELS, aircraftLabel.offsetY);
            this.renderablePosition.attributes.depthTest = true;
            this.renderablePosition.declutterGroup = 0;
            this.renderablePosition.enabled = this.aircraftVisible;
            this.textLayer.addRenderable(this.renderablePosition);

            const aircraftCallSign = this.createCallSign();
            this.renderableCallSign = new WorldWind.GeographicText(aircraftCallSign.position, aircraftCallSign.text);
            this.renderableCallSign.attributes = new WorldWind.TextAttributes(null);
            this.renderableCallSign.attributes.color = this.symbolColor[this.selectedSymbol];
            this.renderableCallSign.attributes.font.weight = "bold";
            this.renderableCallSign.attributes.font.size = 14;
            this.renderableCallSign.attributes.offset = new WorldWind.Offset(WorldWind.OFFSET_PIXELS, aircraftCallSign.offsetX, WorldWind.OFFSET_PIXELS, aircraftCallSign.offsetY);
            this.renderableCallSign.attributes.depthTest = true;
            this.renderableCallSign.declutterGroup = 0;
            this.renderableCallSign.enabled = this.callSignVisible;
            this.renderableCallSign.text = this.callSign;
            this.textLayer.addRenderable(this.renderableCallSign);
        }
        return this;
    }
    setCallSign (callSign: string): DAA_Aircraft {
        super.setCallSign(callSign);
        if (callSign !== null && callSign !== undefined) {
            this.callSign = callSign;
            if (this.renderableCallSign) {
                this.renderableCallSign.text = callSign;
                this.refreshLabel();
            }
            // else, renderable is still loading, the text will be added by addLabels() when renderables are loaded
        }
        return this;
    }
    remove (): DAA_Aircraft {
        if (this.aircraftLayer && this.renderableAircraft) {
            Object.keys(this.renderableAircraft).forEach(symbol => {
                const ac: ColladaAircraft = this.renderableAircraft[symbol];
                if (ac) {
                    ac.remove();
                }
            });
        }
        if (this.textLayer) {
            this.renderablePosition.enabled = false;
            this.textLayer.removeRenderable(this.renderablePosition);
            this.renderableCallSign.enabled = false;
            this.textLayer.removeRenderable(this.renderableCallSign);
        }
        return this;
    }
    /**
     * @function <a name="DAA_Aircraft_setSymbol">setSymbol</a>
     * @description Sets the daa symbol to be used for the aircraft.
     * @param daaSymbol {String|number} string is for daa symbols, one of "daa-target", "daa-alert", "daa-traffic-avoid", "daa-traffic-monitor", "daa-ownship" (default: daa-ownship), number is for alert (0 = target, 1 = monitor, 2 = avoid, 3 = alert)</li>
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setSymbol(daaSymbol?: string | number): DAA_Aircraft {
        if (daaSymbol) {
            const symbol: string = (typeof daaSymbol === "string") ? daaSymbol : this._alert2symbol(+daaSymbol);
            if (symbol) {
                if (!this.renderableAircraft[this.selectedSymbol]) {
                    // console.log("Warning: still loading DAA_Aircraft symbols... :/");
                    // the symbol will be selected when the loading process completes --- see DAA_Aircraft.setupRenderables()
                    this.selectedSymbol = symbol;
                } else {
                    if (daaSymbol !== this.selectedSymbol) {
                        this.renderableAircraft[this.selectedSymbol].hide(); // hide old symbol
                        this.selectedSymbol = symbol;
                        this.renderableAircraft[this.selectedSymbol].reveal(); // reveal new symbol
                        this.refreshLabel();
                    } // else do nothing, the symbol is the same
                }
            } else {
                console.error("Error: unrecognised symbol name ", daaSymbol);
            }
        }
        return this;
    }
    setReferenceAircraft(ownship: Aircraft): DAA_Aircraft {
        this._own = ownship;
        return this;
    }
    _alert2symbol(daaAlert: number): string {
        switch (daaAlert) {
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
    selectSymbolByAlert(daaAlert: number): DAA_Aircraft {
        switch (daaAlert) {
            case 1:
                return this.setSymbol("daa-traffic-avoid");
            case 2:
                return this.setSymbol("daa-traffic-monitor");
            case 3:
                return this.setSymbol("daa-alert");
            default:
                //return this.setSymbol("daa-target");
        }
        return this.setSymbol("daa-target");
    }
    /**
     * @function <a name="DAA_Aircraft_refreshLabel">refreshLabel</a>
     * @description Triggers re-renderin of aircraft label.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    refreshLabel(): DAA_Aircraft {
        if (this.renderablePosition) {
            const aircraftLabel = this.createLabel();
            this.renderablePosition.position = aircraftLabel.position;
            this.renderablePosition.attributes.color = this.symbolColor[this.selectedSymbol];
            this.renderablePosition.attributes.offset = new WorldWind.Offset(WorldWind.OFFSET_PIXELS, aircraftLabel.offsetX, WorldWind.OFFSET_PIXELS, aircraftLabel.offsetY);
            this.renderablePosition.text = aircraftLabel.text;
        }
        if (this.renderableCallSign) {
            const aircraftCallSign = this.createCallSign();
            this.renderableCallSign.position = aircraftCallSign.position;
            this.renderableCallSign.attributes.color = this.symbolColor[this.selectedSymbol];
            this.renderableCallSign.attributes.offset = new WorldWind.Offset(WorldWind.OFFSET_PIXELS, aircraftCallSign.offsetX, WorldWind.OFFSET_PIXELS, aircraftCallSign.offsetY);
            this.renderableCallSign.text = aircraftCallSign.text;
        }
        if (this.velocity) {
            const deg = utils.rad2deg(Math.atan2(this.velocity.x, this.velocity.y));
            this.setHeading(deg);
        }
        return this;
    }
    /**
     * @function <a name="DAA_Aircraft_setPositionAndVelocity">setPositionAndVelocity</a>
     * @description Sets the current position and velocity of the aircraft. Position and velocity are optionals -- if they are not specified, the aircraft maintains its current position and velocity
     * @param pos {Object({ lat: real, lon: real, alt: real })} Earth location shown at the center of the map, given as { lat: real, lon: real, alt: real }
     * @param vel {Object({x: real, y:real, z:real})} Velocity vector, given as { x: real, y: real, z: real }
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setPositionAndVelocity(pos?: utils.LatLonAlt | serverInterface.LatLonAlt, vel?: utils.Vector3D | serverInterface.Vector3D): Aircraft {
        if (pos) {
            this.setPosition(pos);
        }
        if (vel) {
            this.setVelocity(vel);
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
    setPosition(pos: utils.LatLonAlt | serverInterface.LatLonAlt, reference?: Aircraft): DAA_Aircraft {
        super.setPosition(pos);
        // update aircraft symbol
        Object.keys(this.renderableAircraft).forEach(symbol => {
            const aircraft: ColladaAircraft = this.renderableAircraft[symbol];
            aircraft.setPosition(pos);
        });
        // update labels
        if (reference) { this._own = reference; }
        this.refreshLabel();
        // console.log(this.name, this.position);
        return this;
    }
    setVelocity(vel: utils.Vector3D | serverInterface.Vector3D): DAA_Aircraft {
        super.setVelocity(vel); // this function will automatically compute the heading
        Object.keys(this.renderableAircraft).forEach(symbol => {
            this.renderableAircraft[symbol].setHeading(this.heading);
        });
        this.refreshLabel();
        return this;
    }
    /**
     * @function <a name="DAA_Aircraft_hide">hide</a>
     * @description Hides the aircraft.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    hide(): DAA_Aircraft {
        this.aircraftVisible = false;
        const ac: ColladaAircraft = this.renderableAircraft[this.selectedSymbol];
        if (ac) {
            ac.hide();
        }
        // else, collada object is still loading, the object will be hidden by DAA_Aircraft.setupRenderables()
        if (this.renderablePosition) {
            this.renderablePosition.enabled = false;
        }
        if (this.renderableCallSign) {
            this.renderableCallSign.enabled = false;
        }
        return this;
    }
    /**
     * @function <a name="DAA_Aircraft_reveal">reveal</a>
     * @description Makes the aircraft visible on the map.
     * @param nmiScale Scale (in nautical miles) of the airspace where the aircraft is rendered. This optional parameter is useful in the case loading of the collada object takes a while, to update the zoom level of the collada object with the most recent zoom level.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    reveal(): DAA_Aircraft {
        this.aircraftVisible = true;
        const ac: ColladaAircraft = this.renderableAircraft[this.selectedSymbol];
        if (ac) {
            ac.reveal();
        }
        // else, collada object is still loading, the object will be revealed by DAA_Aircraft.setupRenderables()
        if (this.renderablePosition) {
            this.renderablePosition.enabled = true;
        }
        if (this.renderableCallSign) {
            this.renderableCallSign.enabled = this.callSignVisible;
        }
        if (this.velocity) {
            const deg = utils.rad2deg(Math.atan2(this.velocity.x, this.velocity.y));
            this.setHeading(deg);
        }
        return this;
    }
    /**
     * @function <a name="DAA_Aircraft_setHeading">setHeading</a>
     * @desc Ownship's heading, in degrees, clockwise, north is 0 deg.
     * @param deg (real) Heading degrees. If heading is not specified, the value is adjusted based on the velocity vector, if one is specified
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setHeading(deg?: number): DAA_Aircraft {
        deg = (deg === undefined || deg === null) ? this.getHeading() : deg;
        if (!isNaN(deg)) {
            Object.keys(this.renderableAircraft).forEach(symbol => {
                this.renderableAircraft[symbol].setHeading(-deg); // we are changing sign to the heading value because rotation of the aircraft is clockwise
            });
        } else {
            console.log(`[DAA_Aircraft] Warning: heading of ${this.callSign} is NaN`);
        }
        return this;
    }
    /**
     * @function <a name="DAA_Aircraft_setScale">setScale</a>
     * @desc Scales the aircraft symbol based on the map scale. This is useful to keep the symbol size constant when zooming in/out the map (in wwd, zooming in results in larger aircraft symbols, zooming out leads to smaller symbols).
     * @param nmiScale (real) Map scale, in nautical miles.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setScale(nmiScale: number): DAA_Aircraft {
        if (!isNaN(nmiScale)) {
            this.nmiScale = nmiScale;
            Object.keys(this.renderableAircraft).forEach((symbol: string) => {
                const ac: ColladaAircraft = this.renderableAircraft[symbol];
                ac.setScale(this.nmiScale);
            });
        } else {
            console.log("[DAA_Aircraft] Warning: scale is NaN");
        }
        return this;
    }
    /**
     * @function <a name="ColladaAircraft_setLoS">setLoS</a>
     * @description Renders conflict regions betweeen the current aircraft and the ownship. This function should be used only when the current aircraft is an intruder.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setLoS(region: utils.LatLonAlt[] | serverInterface.LatLonAlt[], opt?: { nmi?: number }): DAA_Aircraft {
        region = region || [];
        if (this.losLayer) {
            opt = opt || {};
            if (this.los) {
                // delete the old region, if any was rendered in the airspace
                this.los.hide();
                // delete this.los;
            }
            this.los = new LosRegion(this.losLayer, region, opt);
            this.los.reveal();
        } else {
            console.log("[DAA_Aircraft] Warning: LoS layer not present");
        }
        return this;
    }
    revealLoS(): DAA_Aircraft {
        this.los.reveal();
        return this;
    }
    hideLoS(): DAA_Aircraft {
        this.los.hide();
        return this;
    }
    removeLoS(): DAA_Aircraft {
        this.los.remove();
        return this;
    }
}

// utility function, creates a wwd terrain layer
function _get_terrain(t: string): WorldWind.RenderableLayer {
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
        return new OpenStreetMapRestLayer();
    } else if (t === "OpenStreetMap-Hampton") {
        return new OpenStreetMapRestLayer({ useTileCache: true });
    }
    return new WorldWind.BingRoadsLayer(); // plain map with labels
}

class DAA_Airspace {
    protected offlineMap: string;
    protected wwd: WorldWind.WorldWindow;
    protected nmi: number;
    protected _ownship: DAA_Aircraft;
    protected _traffic: DAA_Aircraft[];
    protected atmosphereLayer: WorldWind.RenderableLayer;
    protected losLayer: WorldWind.RenderableLayer;
    protected trafficLayer: WorldWind.RenderableLayer;
    protected ownshipLayer: WorldWind.RenderableLayer;
    protected textLayer: WorldWind.RenderableLayer;
    protected godsView: boolean;
    protected callSignVisible: boolean;
    protected trafficVisible: boolean;
    /**
     * @function <a name="DAA_Airspace">DAA_Airspace</a>
     * @description Constructor. Creates a virtual airspace, including a map and traffic information.
     * @param opt {Object} Configuration options for the airspace.
     *          <li>ownship (Object({ lat: real, lon: real, alt: real})): ownship position, given in the form { lat: real, lon: real, alt: real } (default lat/lon: Hampton, VA, USA; default altitude 0 meters) </li>
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
    constructor(opt?: { ownship?: utils.LatLonAlt | serverInterface.LatLonAlt, traffic?: { s: utils.LatLonAlt, v: utils.Vector3D, symbol: string, callSign: string }[], 
                        canvas?: string, shader?: number, godsView?: boolean, offlineMap?: string, terrain?: string, atmosphere?: boolean, 
                        los?: boolean, callSignVisible?: boolean, trafficVisible?: boolean }) {
        opt = opt || {};
        opt.ownship = opt.ownship || {
            lat: cities.hampton.lat,
            lon: cities.hampton.lon,
            alt: 0
        };
        opt.traffic = opt.traffic || [];
        opt.canvas = opt.canvas || "canvasOne";
        opt.shader = (isNaN(+opt.shader)) ? 0.4 : +opt.shader;
        this.godsView = !!opt.godsView;
        this.callSignVisible = !!opt.callSignVisible;
        this.trafficVisible = true;
        this.offlineMap = opt.offlineMap;

        // create worldwind view in the canvas
        this.wwd = new WorldWind.WorldWindow(opt.canvas);

        this.wwd.surfaceOpacity = 0.999; // this should reduce flickering when loading tiles, see https://github.com/NASAWorldWind/WebWorldWind/issues/353
        this.wwd.verticalExaggeration = (this.godsView) ? 1 : 0; // 0 is flat world. A value > 0 will make it 3D. Default in WorldWind is 1.
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
                let surfaceImageLayer = new WorldWind.RenderableLayer("Map Shader Layer");
                surfaceImageLayer.addRenderable(surfaceImage2);
                this.wwd.addLayer(surfaceImageLayer);
            }
        }

        // create LoS layer
        this.losLayer = new WorldWind.RenderableLayer(`LoS Layer`); // This layer is used to render the conflict regions between this aircraft and the ownship
        this.wwd.addLayer(this.losLayer);

        // create layer for rendering traffic aircraft symbol
        this.trafficLayer = new WorldWind.RenderableLayer(`Aicraft Layer`);
        this.wwd.addLayer(this.trafficLayer);

        // create lauer for rendering ownship
        this.ownshipLayer = new WorldWind.RenderableLayer(`Aicraft Layer`);
        this.wwd.addLayer(this.ownshipLayer);

        // create layer for rendering aircraft label
        this.textLayer = new WorldWind.RenderableLayer(`Aircraft Text Layer`);
        this.wwd.addLayer(this.textLayer);

        // Create ownship, and make it invisible because danti renders the ownship in overlay
        // Having the ownship in WWD is useful for adjusting the map location
        this._ownship = new DAA_Aircraft(this.wwd, {
            s: opt.ownship,
            symbol: "daa-ownship",
            callSign: "ownship",
            callSignVisible: this.callSignVisible,
            aircraftVisible: this.godsView
        }, {
            losLayer: this.losLayer,
            aircraftLayer: this.ownshipLayer,
            textLayer: this.textLayer
        });

        // Render traffic information
        this._traffic = [];
        if (opt.traffic && opt.traffic.length) {
            this.setTraffic(opt.traffic);
        }

        // Create atmosphere layer
        if (opt.atmosphere) {
            this.atmosphereLayer = new WorldWind.AtmosphereLayer();
            const timestamp = Date.now(); // The current date will be given to initialize the position of the sun.
            this.atmosphereLayer.time = new Date(timestamp); // Atmosphere layer requires a date to simulate the position of the Sun.
            this.wwd.addLayer(this.atmosphereLayer);
        }

        // show coordinates
        if (this.godsView) {
            this.wwd.addLayer(new WorldWind.CoordinatesDisplayLayer(this.wwd));
        }

        // this.wwd.addLayer(new WorldWind.CompassLayer());
        // this.wwd.addLayer(new WorldWind.ViewControlsLayer(this.wwd));

        // Center the view on the ownship.
        this.wwd.navigator.lookAtLocation.latitude = +opt.ownship.lat;
        this.wwd.navigator.lookAtLocation.longitude = +opt.ownship.lon;

        // attach autoscale
        this.wwd.addEventListener("wheel", () => {
            this.autoScale();
        });
        
        // set 2D view
        this.view2D();
    }
    resetLoS (): DAA_Airspace {
        if (this.losLayer) {
            for (let i = 0; i < this._traffic.length; i++) {
                this._traffic[i].removeLoS();
            }
        }
        this.redraw();
        return this;
    }
    godsViewOn (): DAA_Airspace {
        this.godsView = true;
        return this;
    }
    godsViewOff (): DAA_Airspace {
        this.godsView = false;
        return this;
    }
    /**
     * Utility function, returns scale for the renderables
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    protected getScale (): number {
        return this.wwd.navigator.range / scaleFactor;
    }
    /**
     * Utility function, adds event listener for mouse wheel events -- necessary for resizing traffic symbols when zooming the map
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    autoScale (): DAA_Airspace {
        const NMI = this.getScale();
        // console.log("updating scale factor to " + NMI + "NMI");
        if (this._traffic) {
            for (let i = 0; i < this._traffic.length; i++) {
                this._traffic[i].setScale(NMI);
            }
        }
        if (this._ownship) {
            this._ownship.setScale(NMI);
        }
        this.redraw();
        return this;
    }
    /**
     * Sets the zoom level of the airspace.
     * @param NMI {real} Zoom level, given in nautical miles. The map is resized so that the diagonal size of the map corresponds to the provided NMI value.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setZoomLevel (NMI: number): DAA_Airspace {
        this.nmi = NMI || this.nmi;
        // wwd.navigator.range is the diagonal size of the wwd map displayed in the canvas.
        this.wwd.navigator.range = NMI * scaleFactor;
        this._traffic.forEach(function (aircraft) {
            aircraft.setScale(NMI);
        });
        this._ownship.setScale(NMI);
        return this.redraw();
    }
    /**
     * @function <a name="DAA_Airspace_view2D">view2D</a>
     * @description Emulates 2D view by setting the ownship view perpendicular to the map.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    view2D (): DAA_Airspace {
        this.wwd.navigator.range = this.nmi; //64e4;//16e4;
        this.wwd.navigator.tilt = 0; // 0 degrees tilt
        // this.wwd.navigator.fieldOfView = 180;
        // console.log(this.wwd.navigator);
        return this.redraw();
    }
    /**
     * @function <a name="DAA_Airspace_view3D">view3D</a>
     * @description Emulates 3D view by tilting the ownship to 55 degrees.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    view3D (): DAA_Airspace {
        this.wwd.navigator.tilt = 55; // 55 degrees tilt
        this.wwd.navigator.range = this.nmi; // 6e4;
        return this.redraw();
    }
    /**
     * @function <a name="DAA_Airspace_recenter">recenter</a>
     * @description Centers the map on the ownship position.
     * @param pos {Object({ lat: real, lon: real })} Position where the map should be centered.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    recenter (pos: { lat: number, lon: number }): DAA_Airspace {
        if (pos) {
            if (pos.lat !== undefined) { this.wwd.navigator.lookAtLocation.latitude = pos.lat; }
            if (pos.lon !== undefined) { this.wwd.navigator.lookAtLocation.longitude = pos.lon; }
            this.redraw();
        } else {
            console.error("Unable to recenter map -- position is null :/");
        }
        return this;
    }
    redraw (): DAA_Airspace {
        this.wwd.redraw();
        return this;
    }

    /**
     * @function <a name="DAA_Airspace_goTo">goTo</a>
     * @description Centers the map to a given location. The ownship position is kept unchanged.
     * @param pos {Object({ lat: real, lon: real })} Position where the map should be centered.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    goTo (pos: { lat: number, lon: number }): DAA_Airspace {
        if (pos) {
            this.recenter(pos);
        } else {
            console.error("Incorrect position :/ ", pos);
        }
        return this;
    }
    /**
     * @function <a name="DAA_Airspace_setOwnshipPosition">setOwnshipPosition</a>
     * @description Sets the ownship position to a given location.
     * @param pos {Object({ lat: real, lon: real, alt: real })} New position of the ownship.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setOwnshipPosition (pos: string | utils.LatLonAlt | serverInterface.LatLonAlt): DAA_Airspace {
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
                const position: utils.LatLonAlt = {
                    alt: (typeof pos.alt === "string") ? +pos.alt : pos.alt,
                    lat: (typeof pos.lat === "string") ? +pos.lat : pos.lat,
                    lon: (typeof pos.lon === "string") ? +pos.lon : pos.lon,
                }
                this._ownship.setPosition(position);
            }
            this._ownship.refreshLabel();
            this.redraw();
        } else {
            console.error("Incorrect aircraft position :/ ", pos);
        }
        return this;
    }
    setOwnshipVelocity (v: utils.Vector3D | serverInterface.Vector3D): DAA_Airspace {
        if (v) {
            this._ownship.setVelocity(v);
            this._ownship.refreshLabel();
            this.redraw();
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
    setOwnshipHeading (deg: number, opt?: { nrthup?: boolean}): DAA_Airspace {
        opt = opt || {};
        this.wwd.navigator.heading = deg;
        if (!opt.nrthup) {
            this._ownship.setHeading(-deg);
        }
        this.redraw();
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
    getOwnshipHeading (): number {
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
    getTraffic (): DAA_Aircraft[] {
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
    setTraffic (traffic: { s: utils.LatLonAlt | serverInterface.LatLonAlt, v: utils.Vector3D | serverInterface.Vector3D, symbol: string, callSign: string }[]): DAA_Airspace {
        const len: number = (traffic) ? traffic.length : 0;
        if (len !== this._traffic.length) {
            // remove excess renderables, reuse the rest
            for (let i = len; i < this._traffic.length; i++) {
                this._traffic[i].remove();
            }
            this._traffic = this._traffic.slice(0, len);
        }
        if (len > 0) {
            const nmiScale: number = this.getScale();
            for (let i = 0; i < traffic.length; i++) {
                if (i < this._traffic.length) {
                    const aircraft: DAA_Aircraft = this._traffic[i]; 
                    aircraft.setPositionAndVelocity(traffic[i].s, traffic[i].v);
                    aircraft.setReferenceAircraft(this._ownship);
                    aircraft.setSymbol(traffic[i].symbol);
                    aircraft.setCallSign(traffic[i].callSign);
                    aircraft.setScale(nmiScale);
                    if (this.callSignVisible) {
                        aircraft.revealCallSign();
                    } else {
                        aircraft.hideCallSign();
                    }
                    if (this.trafficVisible) {
                        aircraft.reveal();
                    } else {
                        aircraft.hide();
                    }
                } else {
                    const aircraft = new DAA_Aircraft(this.wwd, {
                        s: traffic[i].s,
                        v: traffic[i].v,
                        symbol: (traffic[i].symbol !== null || traffic[i].symbol !== undefined) ? 
                            traffic[i].symbol : "daa-target",
                        callSign: (traffic[i].callSign !== null || traffic[i].callSign !== undefined) ?
                            traffic[i].callSign : `target-${i}`,
                        callSignVisible: this.callSignVisible,
                        aircraftVisible: this.trafficVisible,
                        ownship: this._ownship
                    }, {
                        losLayer: this.losLayer,
                        aircraftLayer: this.trafficLayer,
                        textLayer: this.textLayer
                    });
                    this._traffic.push(aircraft);
                }
            }
        }
        this.redraw();
        return this;
    }
    /**
     * @function <a name="DAA_Airspace_hideTraffic">hideTraffic</a>
     * @desc Hides traffic information.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    hideTraffic (): DAA_Airspace {
        this.trafficVisible = false;
        if (this._traffic && this._traffic.length) {
            for (let i = 0; i < this._traffic.length; i++) {
                this._traffic[i].hide();
            }
        }
        return this.redraw();
    }
    /**
     * @function <a name="DAA_Airspace_revealTraffic">revealTraffic</a>
     * @desc Reveals traffic information.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    revealTraffic (): DAA_Airspace {
        this.trafficVisible = true;
        if (this._traffic && this._traffic.length) {
            const nmiScale: number = this.getScale();
            for (let i = 0; i < this._traffic.length; i++) {
                this._traffic[i].reveal();
                this._traffic[i].setScale(nmiScale);
            }
        }
        return this.redraw();
    }
    /**
     * @function <a name="DAA_Airspace_hideCallSign">hideCallSign</a>
     * @desc Hides call sign (i.e. hides name of traffic aircraft)
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    hideCallSign (): DAA_Airspace {
        this.callSignVisible = false;
        if (this._traffic && this._traffic.length) {
            for (let i = 0; i < this._traffic.length; i++) {
                this._traffic[i].hideCallSign();
            };
        }
        return this.redraw();
    }
    /**
     * @function <a name="DAA_Airspace_revealCallSign">revealCallSign</a>
     * @desc Reveals call sign (i.e. hides name of traffic aircraft)
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    revealCallSign (): DAA_Airspace {
        this.callSignVisible = true;
        if (this._traffic && this._traffic.length) {
            for (let i = 0; i < this._traffic.length; i++) {
                this._traffic[i].revealCallSign();
            };
        }
        return this.redraw();
    }
    setLoS (regions: serverInterface.DAALosRegion[], opt?: { nmi?: number }): DAA_Airspace {
        opt = opt || {};
        if (this._traffic && this._traffic.length) {
            this._traffic.forEach((traffic, index) => {
                // FIXME: use aircraft ID to get the regions
                if (index < regions.length) {
                    const region: serverInterface.DAALosRegion = regions[index];
                    if (region && region.sectors) {
                        const reg: utils.LatLonAlt[] = region.sectors.filter(reg => {
                            return !!reg.los;
                        }).map(reg => {
                            return { lat: +reg.lat, lon: +reg.lon, alt: +reg.alt };
                        });
                        // console.log(traffic.getPosition());
                        // console.log(regions);
                        // console.log(reg);
                        traffic.setLoS(reg, opt);
                    } else {
                        traffic.setLoS(null, opt);
                    }
                }
            });
        }
        return this.redraw();
    }
}

export interface DAA_AircraftDescriptor {
    s: utils.LatLonAlt | serverInterface.LatLonAlt;
    v: utils.Vector3D | serverInterface.Vector3D;
    symbol: string;
    callSign: string;
}

export class InteractiveMap {
    id: string;
    heading: number;
    pos: utils.LatLonAlt;
    trafficDescriptor: DAA_AircraftDescriptor[];
    airspace: DAA_Airspace;
    div: HTMLElement;
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
    constructor(id: string, coords: { top?: number, left?: number, width?: number, height?: number},
                opt?: { parent?: string, pos?: utils.LatLonAlt, offlineMap?: string, terrain?: string, atmosphere?: boolean, 
                        godsView?: boolean, los?: boolean, callSignVisible?: boolean }) {
        opt = opt || {};
        this.id = id;
        this.heading = 0; // default heading is 0 deg (i.e., pointing north)
        this.pos = opt.pos || { lat: cities.hampton.lat, lon: cities.hampton.lon, alt: 0 };
        this.trafficDescriptor = [];
        
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
        this.airspace = new DAA_Airspace({
            canvas: this.id + "-canvas",
            offlineMap: opt.offlineMap,
            terrain: opt.terrain,
            atmosphere: opt.atmosphere,
            godsView: opt.godsView,
            los: opt.los,
            callSignVisible: opt.callSignVisible
        });
        this.airspace.setOwnshipHeading(this.heading);
        this.airspace.setZoomLevel(5); // NMI
    }
    resetLoS (): InteractiveMap {
        this.airspace.resetLoS();
        return this;
    }
    /**
     * @function <a name="setHeading">setHeading</a>
     * @description Rotates the map.
     * @param deg {real} Rotation value.
     * @param opt {Object} Visualization options:
     *           <li>nrthup (bool): The owship symbol rotates if nrthup = false. The entire map rotates if nrthup = true.</li>
     * @memberof module:InteractiveMap
     * @instance
     */
    setHeading(deg: number, opt?: { nrthup?: boolean }): InteractiveMap {
        this.heading = deg;
        this.airspace.setOwnshipHeading(deg, opt);
        return this;
    }
    /**
     * @function <a name="showTraffic">showTraffic</a>
     * @description Reveals/Hides traffic information on the map.
     * @param flag {Bool} Traffic is revealed when flag is True. Traffic is hidden otherwise.
     * @memberof module:InteractiveMap
     * @instance
     */
    showTraffic(flag: boolean): InteractiveMap {
        if (flag) {
            this.airspace.revealTraffic();
        } else { this.airspace.hideTraffic(); }
        return this;
    }
    /**
     * @function <a name="showCallSign">showCallSign</a>
     * @description Reveals/Hides call sign (i.e., name of the aircraft) on the map.
     * @param flag {Bool} Call sign is revealed when flag is True. Call sign is hidden otherwise.
     * @memberof module:InteractiveMap
     * @instance
     */
    showCallSign(flag: boolean): InteractiveMap {
        if (flag) {
            this.airspace.revealCallSign();
        } else { this.airspace.hideCallSign(); }
        return this;
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
    revealTraffic(): InteractiveMap {
        this.airspace.revealTraffic();
        return this;
    }
    /**
     * @function <a name="hideTraffic">hideTraffic</a>
     * @description Hides traffic information on the map.
     * @memberof module:InteractiveMap
     * @instance
     */
    hideTraffic(): InteractiveMap {
        this.airspace.hideTraffic();
        return this;
    }
    /**
     * @function <a name="setZoomLevel">setZoomLevel</a>
     * @description Sets the zoom level of the map.
     * @param NMI {real} Zoom level, given in nautical miles. The map is resized so that the diagonal size of the map corresponds to the provided NMI value.
     * @memberof module:InteractiveMap
     * @instance
     */
    setZoomLevel(NMI: number): InteractiveMap {
        this.airspace.setZoomLevel(NMI);
        return this;
    }
    /**
     * @function <a name="goTo">goTo</a>
     * @description Sets the current position of the map.
     * @param pos {Object} Earth location shown at the center of the map, given as { lat: (real), lon: (real), alt: (real) }
     * @memberof module:InteractiveMap
     * @instance
     */
    goTo(pos: string | utils.LatLonAlt | serverInterface.LatLonAlt): InteractiveMap {
        if (typeof pos === "string") {
            // remove white spaces in the name and make all small letters
            pos = pos.replace(/\s/g, "").toLowerCase();
            // look for the name of the city in the list of known destinations (array cities)
            pos = cities[pos];
        }
        if (typeof pos === "object" && pos && pos.lat && pos.lon) {
            this.pos = {
                lat: (typeof pos.lat === "string")? +pos.lat : pos.lat, 
                lon: (typeof pos.lon === "string")? +pos.lon : pos.lon, 
                alt: (typeof pos.alt === "string")? +pos.alt : pos.alt 
            };
            this.airspace.goTo({ lat: this.pos.lat, lon: this.pos.lon });
        } else {
            console.error("Incorrect aircraft position :/ ", pos);
        }
        return this;
    }
    /**
     * @function <a name="setOwnshipPosition">setOwnshipPosition</a>
     * @description Sets the ownship positions on the map.
     * @param pos {Object} Earth location shown at the center of the map, given as { lat: (real), lon: (real), alt: (real) }
     * @memberof module:InteractiveMap
     * @instance
     */
    setOwnshipPosition(pos: string | utils.LatLonAlt | serverInterface.LatLonAlt): InteractiveMap {
        if (typeof pos === "string") {
            // remove white spaces in the name and make all small letters
            pos = pos.replace(/\s/g, "").toLowerCase();
            // look for the name of the city in the list of known destinations (array cities)
            pos = cities[pos];
        }
        if (typeof pos === "object" && pos && pos.lat && pos.lon) {
            this.pos = {
                lat: (typeof pos.lat === "string") ? +pos.lat : pos.lat,
                lon: (typeof pos.lon === "string") ? +pos.lon : pos.lon,
                alt: (typeof pos.alt === "string") ? +pos.alt : pos.alt
            };
            this.airspace.setOwnshipPosition(this.pos);
        } else {
            console.error("Incorrect aircraft position :/ ", pos);
        }
        return this;
    }
    setOwnshipVelocity(v: utils.Vector3D | serverInterface.Vector3D): InteractiveMap {
        if (v) {
            const vel: utils.Vector3D = {
                x: (typeof v.x === "string") ? +v.x : v.x,
                y: (typeof v.y === "string") ? +v.y : v.y,
                z: (typeof v.z === "string") ? +v.z : v.z
            }
            this.airspace.setOwnshipVelocity(vel);
        } else {
            console.error("Incorrect aircraft velocity :/ ", v);
        }
        return this;
    }
    /**
     * @function <a name="recenter">recenter</a>
     * @description Recenters the map at the ownship location.
     * @param pos {Object({ lat: real, lon: real })} Position where the map should be centered.
     * @memberof module:InteractiveMap
     * @instance
     */
    recenter(pos: { lat: number, lon: number }): InteractiveMap {
        this.airspace.recenter(pos);
        return this;
    }
    /**
     * @function <a name="setPosition">setPosition</a>
     * @description Sets the current position of the map. This function is equivalent to <a href="#goTo">goTo</a>.
     * @param pos {Object} Earth location shown at the center of the map, given as { lat: (real), lon: (real) }
     * @memberof module:InteractiveMap
     * @instance
     */
    setPosition(pos: utils.LatLonAlt | serverInterface.LatLonAlt) {
        this.setOwnshipPosition(pos);
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
    setTrafficPosition(data: DAA_AircraftDescriptor[]) {
        this.trafficDescriptor = data;
        this.airspace.setTraffic(data);
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
    setTraffic(data: DAA_AircraftDescriptor[]): InteractiveMap {
        this.trafficDescriptor = data;
        this.airspace.setTraffic(data);
        return this;
    }
    /**
     * @function <a name="setTrafficSymbolsByAlert">setTrafficSymbolsByAlert</a>
     * @description Sets the daa symbol of an aircraft.
     * @param alertType {String} Name of the daa symbol to be used for the aircraft, one of "daa-target", "daa-alert", "daa-traffic-avoid", "daa-traffic-monitor" "daa-ownship".
     * @memberof module:InteractiveMap
     * @instance
     */
    // setTrafficSymbolsByAlert(alertType: string) {
    //     this.wwd.setTrafficSymbolsByAlert(alertType);
    //     return this;
    // }


    setLoS(regions: serverInterface.DAALosRegion[], opt?: { nmi?: number }) {
        this.airspace.setLoS(regions, opt);
    }
}