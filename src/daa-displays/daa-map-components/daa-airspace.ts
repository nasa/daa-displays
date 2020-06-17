/**
 * @module DAA_Airspace
 * @date 2018.12.01
 * @description <div style="display:flex;"><div style="width:50%;">
 *              <b>Airspace.</b>
 *              <p>This widget renders an airspace with layers suitable to show daa functions.</p>
 *              </div>
 *              </div>
 * 
 * @author Paolo Masci
 * @date December 2018
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

import * as utils from '../daa-utils';
import * as WorldWind from '../wwd/worldwind.min';
import * as serverInterface from '../utils/daa-server'
import { DAA_Aircraft } from './daa-aircraft';
import { GeoFence } from './daa-geofence';

// scale factor for the map, computed manually by inspecting the DOM, for a compass size of 634x634 pixels. FIXME: find a better way to match compass and map scale
const scaleFactor = 32000 / 5; // if canvas size is 1054x842 and compass size is 634x634, then compass radius corresponds to 5NMI (9.26Km) when range is 32000

// standard set of locations
export const cities = {
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
            const url: string = `${document.location.origin}/WMTSCapabilities.xml`;//"http://localhost:8082/WMTSCapabilities.xml";
            this.xhr.open("GET", url, true);
            this.xhr.onreadystatechange = () => {
                if (this.xhr.readyState === 4) {
                    if (this.xhr.status === 200) {
                        // Create a layer from the WMTS capabilities.
                        const wmtsCapabilities = new WorldWind.WmtsCapabilities(this.xhr.responseXML);

                        if (this.useTileCache) {
                            wmtsCapabilities.serviceProvider.providerSiteUrl = `${document.location.origin}/daadisplays`; //"http://localhost:8082/daadisplays";
                            wmtsCapabilities.contents.layer[0].resourceUrl[0].template =
                                `${document.location.origin}/tiles.maps.eox.at/wmts/1.0.0/osm/default/WGS84/{TileMatrix}/{TileRow}/{TileCol}.jpg`;
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

// utility function, creates a wwd terrain layer
function _get_terrainMap(t: string): WorldWind.RenderableLayer {
    if (t === "BMNG") {
        return new WorldWind.BMNGLayer(); // terrain, low res
    } else if (t === "BMNGOne") {
        return new WorldWind.BMNGOneImageLayer(); // terrain, low res
    } else if (t === "BMNGLandsat") {
        return new WorldWind.BMNGLandsatLayer(); // landsat image, low res
    } else if (t === "BingAerialWithLabels") {
        return new WorldWind.BingAerialWithLabelsLayer(null); // terrain, high res with labels 
    }
    // else if (t === "BingAerial") {
    return new WorldWind.BingAerialLayer(null); // terrain, high res
}

function _get_streetMap(t: string): WorldWind.RenderableLayer {
    if (t === "BingRoards") {
        return new WorldWind.BingRoadsLayer(); // plain map with labels
    } else if (t === "OpenStreetMap-Hampton") {
        return new OpenStreetMapRestLayer({ useTileCache: true });
    }
    // else if (t === "OpenStreetMap") {
    return new OpenStreetMapRestLayer();    
}

/**
 * DAA Airspace class
 */
export class DAA_Airspace {
    protected offlineMap: string;
    protected wwd: WorldWind.WorldWindow;
    protected nmi: number;
    protected _ownship: DAA_Aircraft;
    protected _traffic: DAA_Aircraft[];
    protected geofence: GeoFence;

    // layers
    protected terrainLayer: WorldWind.RenderableLayer;
    protected streetLayer: WorldWind.RenderableLayer;
    protected atmosphereLayer: WorldWind.RenderableLayer;
    protected geofenceLayer: WorldWind.RenderableLayer;
    protected losLayer: WorldWind.RenderableLayer;
    protected trafficLayer: WorldWind.RenderableLayer;
    protected ownshipLayer: WorldWind.RenderableLayer;
    protected textLayer: WorldWind.RenderableLayer;

    protected godsView: boolean;
    protected callSignVisible: boolean = false;
    protected trafficVisible: boolean = true;
    protected contoursVisible: boolean = false;
    protected _3dview: boolean;
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
                        canvas?: string, shader?: number, godsView?: boolean, offlineMap?: string, terrainMap?: string, streetMap?: string, terrainMode?: boolean, atmosphere?: boolean, view3D?: boolean,
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
        this.offlineMap = opt.offlineMap;

        // create worldwind view in the canvas
        this.wwd = new WorldWind.WorldWindow(opt.canvas);

        this.wwd.surfaceOpacity = 0.999; // this should reduce flickering when loading tiles, see https://github.com/NASAWorldWind/WebWorldWind/issues/353
        this.nmi = 5; // default eye view

        // Add map layers to worldwind.
        if (this.offlineMap) {
            this.terrainLayer = this.streetLayer = new WorldWind.BMNGRestLayer(null, this.offlineMap)
            this.wwd.addLayer(this.terrainLayer);
        } else {
            this.terrainLayer = _get_terrainMap(opt.terrainMap);
            this.wwd.addLayer(this.terrainLayer);
            this.terrainLayer.enabled = !!opt.terrainMode;
            this.streetLayer = _get_streetMap(opt.streetMap);
            this.wwd.addLayer(this.streetLayer);
            this.streetLayer.enabled = !opt.terrainMode;
            if (opt.shader > 0) {
                // Add shader, to enhance visibility of DAA symbols over Bing map
                let surfaceImage2 = new WorldWind.SurfaceImage(WorldWind.Sector.FULL_SPHERE, utils.baseUrl + "images/black.png");
                surfaceImage2.opacity = opt.shader;
                let surfaceImageLayer = new WorldWind.RenderableLayer("Map Shader Layer");
                surfaceImageLayer.addRenderable(surfaceImage2);
                this.wwd.addLayer(surfaceImageLayer);
            }
        }

        // create geofence layer
        this.geofenceLayer = new WorldWind.RenderableLayer(`GeoFence Layer`);
        this.geofenceLayer.enabled = true;
        this.wwd.addLayer(this.geofenceLayer);
        this.geofence = new GeoFence(this.geofenceLayer);

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

        this._3dview = !!opt.view3D;

        // Create ownship, and make it invisible because danti renders the ownship in overlay
        // Having the ownship in WWD is useful for adjusting the map location
        this._ownship = new DAA_Aircraft(this.wwd, {
            s: opt.ownship,
            symbol: "daa-ownship",
            callSign: "ownship",
            callSignVisible: this.callSignVisible,
            aircraftVisible: this.godsView,
            view3D: this._3dview
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
            this.atmosphereLayer.minActiveAltitude = 500; // meters above which the atmosphere layer is visible. We are disabling for lower altitudes so the terrain is brighter (atmosphere tends to make terrain brownish).
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
        
        if (opt.view3D) {
            // set 3D view
            this.view3D();
        } else {
            // set 2D view
            this.view2D();
        }
    }
    terrainMode (): DAA_Airspace {
        this.terrainLayer.enabled = true;
        this.streetLayer.enabled = false;
        this.redraw();
        return this;
    }
    streetMode (): DAA_Airspace {
        this.terrainLayer.enabled = false;
        this.streetLayer.enabled = true;
        this.redraw();
        return this;
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
        if (this.geofence) {
            this.geofence.setScale(NMI);
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
        if (this._traffic) {
            this._traffic.forEach(function (aircraft) {
                aircraft.setScale(NMI);
            });
        }
        if (this._ownship) {
            this._ownship.setScale(NMI);
        }
        if (this.geofence) {
            this.geofence.setScale(NMI);
        }
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
        this.wwd.verticalExaggeration = 0; // 0 is flat (2D) world. A value > 0 will make it 3D. Default in WorldWind is 1.
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
        this.wwd.navigator.range = 0.5; //this.nmi; // 6e4;
        this.wwd.verticalExaggeration = 1; // 0 is flat (2D) world. A value > 0 will make it 3D. Default in WorldWind is 1.
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
            if (!isNaN(+pos.lat)) { this.wwd.navigator.lookAtLocation.latitude = pos.lat; }
            if (!isNaN(+pos.lon)) { this.wwd.navigator.lookAtLocation.longitude = pos.lon; }
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
        if (len === undefined) {
            console.error("[daa-displays] Warning: traffic information should be an array of traffic descriptors.");
            return this;
        }
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
                    } else { aircraft.hideCallSign(); }
                    if (this.trafficVisible) {
                        aircraft.reveal();
                    } else { aircraft.hide(); }
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
                        ownship: this._ownship,
                        view3D: this._3dview
                    }, {
                        losLayer: this.losLayer,
                        aircraftLayer: this.trafficLayer,
                        textLayer: this.textLayer
                    });
                    this._traffic.push(aircraft);
                }
            }
        }
        if (this.callSignVisible) {
            this.revealGeoFence();
        } else {
            this.hideGeoFence();
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

    addGeoFencePolygon (
        id: string, 
        perimeter: utils.LatLon[] | serverInterface.LatLon[], 
        floor: { top: number | string, bottom: number | string }, 
        opt?: {
            opacity?: number, 
            color?: { r: number, g: number, b: number },
            fontScale?: number,
            showLabel?: boolean
        }
    ) : DAA_Airspace {
        if (this.geofence) {
            this.geofence.addPolygon2D(id, perimeter, floor, opt);
            this.redraw();
        }
        return this;
    }
    removeGeoFencePolygon (id?: string) : DAA_Airspace {
        if (this.geofence) {
            this.geofence.removePolygon(id);
            this.redraw();
        }
        return this;
    }
    revealGeoFence () : DAA_Airspace {
        if (this.geofence) {
            this.geofence.reveal();
            this.redraw();
        }
        return this;
    }
    hideGeoFence () : DAA_Airspace {
        if (this.geofence) {
            this.geofence.hide();
            this.redraw();
        }
        return this;
    }
}