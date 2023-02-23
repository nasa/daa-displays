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
 * 
 * Disclaimers
 * 
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
 * 
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
import * as serverInterface from '../utils/daa-types'
import { AircraftInterface, DAA_Aircraft } from './daa-aircraft';
import { GeoFence } from './daa-geofence';
import { DAA_FlightPlan } from './daa-flight-plan';
import { LatLon, LatLonAlt, Vector3D } from '../utils/daa-types';

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
    useOpenAIP: boolean = true;
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
            const origin: string = document?.location?.origin?.startsWith("file://") ? "http://0.0.0.0:8082" : document?.location?.origin;
            const url: string = `${origin}/WMTSCapabilities.xml`;//"http://localhost:8082/WMTSCapabilities.xml";
            this.xhr.open("GET", url, true);
            this.xhr.onreadystatechange = () => {
                if (this.xhr.readyState === 4) {
                    if (this.xhr.status === 200) {
                        // Create a layer from the WMTS capabilities.
                        const wmtsCapabilities = new WorldWind.WmtsCapabilities(this.xhr.responseXML);

                        // providerName: "EOX"
                        // providerSiteUrl: "https://maps.eox.at"
                        // FIXME -- tileCache server does not seem to be working
                        if (this.useTileCache) {
                            wmtsCapabilities.serviceProvider.providerSiteUrl = `${origin}/daadisplays`; //"http://localhost:8082/daadisplays";
                            wmtsCapabilities.contents.layer[0].resourceUrl[0].template =
                                `${origin}/tiles.maps.eox.at/wmts/1.0.0/osm/default/WGS84/{TileMatrix}/{TileRow}/{TileCol}.jpg`;
                                // "http://localhost:8082/tiles.maps.eox.at/wmts/1.0.0/osm/default/WGS84/{TileMatrix}/{TileRow}/{TileCol}.jpg";
                        }

                        // hi-res layers: osm
                        // low-res layers: terrain, bluemarble, blackmarble, coastline
                        const layerId: string = "osm";
                        const wmtsLayerCapabilities = wmtsCapabilities.getLayer(layerId);
                        const wmtsConfig = WorldWind.WmtsLayer.formLayerConfiguration(wmtsLayerCapabilities);
                        wmtsConfig.title = this.displayName;
                        this.layer = new WorldWind.WmtsLayer(wmtsConfig);

                        // Send an event to request a redraw.
                        // const e: Event = document.createEvent('Event');
                        // e.initEvent(WorldWind.REDRAW_EVENT_TYPE, true, true);
                        const e: Event = new CustomEvent(WorldWind.REDRAW_EVENT_TYPE, { bubbles: true, cancelable: true });
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
 * Airspace interface, provides information on ownship and traffic
 */
export declare interface AirspaceInterface {
    terrainMode (): AirspaceInterface;
    vfrMode (): AirspaceInterface;
    streetMode (): AirspaceInterface;
    godsViewOn (): AirspaceInterface;
    godsViewOff (): AirspaceInterface;
    autoScale (): AirspaceInterface;
    setZoomLevel (NMI: number): AirspaceInterface;
    trySetZoomLevel (NMI: number): boolean; // this is a variant of the setZoomLevel interface, returns true if the level was set correctly
    getZoomLevel (): number;
    view2D (): AirspaceInterface;
    view3D (): AirspaceInterface;
    recenter (pos: { lat: number, lon: number }): AirspaceInterface;
    goTo (pos: { lat: number, lon: number }, opt?: { animate?: boolean }): AirspaceInterface;
    setOwnshipPosition (pos: string | LatLonAlt<number | string>): AirspaceInterface;
    setOwnshipVelocity (v: Vector3D<number | string>): AirspaceInterface;
    setFlightPlan (flightPlan: utils.FlightPlan): AirspaceInterface;
    setOwnshipHeading (deg: number, opt?: { nrthup?: boolean, duration?: number }): AirspaceInterface;
    getOwnshipHeading (): number;
    getTraffic (): AircraftInterface[];
    setTraffic (traffic: { s: LatLonAlt<number | string>, v: Vector3D<number | string>, symbol: string, callSign: string }[]): AirspaceInterface;
    hideTraffic (): AirspaceInterface;
    revealTraffic (): AirspaceInterface;
    hideCallSign (): AirspaceInterface;
    revealCallSign (): AirspaceInterface;
    animationDuration (seconds: number): boolean;
    animation (flag: boolean): boolean;
    setMaxTraceLength (len: number): boolean;
    getMaxTraceLength (): number;
    addGeoFencePolygon (
        id: string,
        perimeter: LatLon<number | string>[], 
        floor: { top: number | string, bottom: number | string }, 
        opt?: {
            opacity?: number, 
            color?: { r: number, g: number, b: number },
            fontScale?: number,
            showLabel?: boolean
        }
    ) : AirspaceInterface;
    removeGeoFencePolygon (id?: string) : AirspaceInterface;
    removeTrafficTrace (ac?: string): AirspaceInterface;
    revealFlightPlan (): AirspaceInterface;
    hideFlightPlan (): AirspaceInterface;
    revealHazardZones (): AirspaceInterface;
    hideHazardZones (): AirspaceInterface
    revealContours (): AirspaceInterface;
    hideContours (): AirspaceInterface
    revealGeoFence () : AirspaceInterface;
    hideGeoFence () : AirspaceInterface;
    getCompassDivName (): string;
    getIndicatorsDivName (): string;
    getOwnshipDivName (): string;
    resetAirspace (): AirspaceInterface; // resets all data structures
};

/**
 * Airspace implemented with WWD 
 */
export class DAA_Airspace implements AirspaceInterface {
    protected offlineMap: string;
    protected wwd: WorldWind.WorldWindow;
    protected nmi: number;
    protected _ownship: DAA_Aircraft;
    protected _traffic: DAA_Aircraft[];
    protected flightPlan: DAA_FlightPlan;

    protected hazardZones: GeoFence;
    protected contours: GeoFence;

    // scale factor used for the conversion visual range <-> NMI
    // the scale is computed manually by inspecting the DOM, for a compass size of 634x634 pixels.
    // FIXME: find a better way to match compass and map scale
    // if canvas size is 1054x842 and compass size is 634x634, then compass radius corresponds to 5NMI (9.26Km) when range is 32000
    // if canvas size is 1496x842 and compass size is 634x634, then compass radius corresponds to 5NMI (9.26Km) when range is 45000
    protected scaleFactor: number = 32000 / 5; 

    // layers
    protected terrainLayer: WorldWind.RenderableLayer;
    protected streetLayer: WorldWind.RenderableLayer;
    protected atmosphereLayer: WorldWind.RenderableLayer;
    protected protectedAreasLayer: WorldWind.RenderableLayer;
    protected contoursLayer: WorldWind.RenderableLayer;
    protected losLayer: WorldWind.RenderableLayer;
    protected flightPathLayer: WorldWind.RenderableLayer;
    protected trafficLayer: WorldWind.RenderableLayer;
    protected ownshipLayer: WorldWind.RenderableLayer;
    protected textLayer: WorldWind.RenderableLayer;

    protected controlLayers: {
        view: WorldWind.RenderableLayer,
        compass: WorldWind.RenderableLayer,
        coords: WorldWind.RenderableLayer
    };

    protected godsView: boolean;
    protected callSignVisible: boolean = false;
    protected trafficVisible: boolean = true;
    protected hazardZonesVisible: boolean = false;
    protected contoursVisible: boolean = false;
    protected flightPlanVisible: boolean = false;
    protected _3dview: boolean;

    /**
     * Constructor
     */
    constructor (opt?: { 
        ownship?: LatLonAlt<number | string>, 
        traffic?: { s: LatLonAlt<number | string>, v: Vector3D<number | string>, symbol: string, callSign: string }[], 
        flightPlan?: utils.FlightPlan,
        canvas?: string, // canvas where the airspace will be rendered
        shader?: number, 
        godsView?: boolean, 
        offlineMap?: string, 
        terrainMap?: string, 
        streetMap?: string, 
        terrainMode?: boolean, 
        atmosphere?: boolean, 
        view3D?: boolean,
        los?: boolean, 
        callSignVisible?: boolean, 
        trafficVisible?: boolean, 
        flightPlanVisible?: boolean,
        widescreen?: boolean
    }) {
        opt = opt || {};
        opt.ownship = opt.ownship || {
            lat: cities.hampton.lat,
            lon: cities.hampton.lon,
            alt: 0
        };
        opt.traffic = opt.traffic || [];
        opt.canvas = opt.canvas || "canvasOne";
        opt.shader = (isNaN(+opt.shader)) ? 0.4 : +opt.shader;
        this.scaleFactor = opt?.widescreen ? 45000/5 : 32000/5;
        this.godsView = !!opt.godsView;
        this.callSignVisible = !!opt.callSignVisible;
        this.offlineMap = opt.offlineMap;

        // create worldwind view in the canvas
        this.wwd = new WorldWind.WorldWindow(opt.canvas);

        this.wwd.surfaceOpacity = 0.99; // this should reduce flickering when loading tiles, see https://github.com/NASAWorldWind/WebWorldWind/issues/353
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
        this.protectedAreasLayer = new WorldWind.RenderableLayer(`Hazard Zones Layer`);
        this.protectedAreasLayer.enabled = true;
        this.wwd.addLayer(this.protectedAreasLayer);
        this.hazardZones = new GeoFence(this.protectedAreasLayer);

        // create contours layer
        this.contoursLayer = new WorldWind.RenderableLayer(`Contours Layer`);
        this.contoursLayer.enabled = true;
        this.wwd.addLayer(this.contoursLayer);
        this.contours = new GeoFence(this.contoursLayer);

        // create LoS layer
        this.losLayer = new WorldWind.RenderableLayer(`LoS Layer`); // This layer is used to render the conflict regions between this aircraft and the ownship
        this.wwd.addLayer(this.losLayer);

        // create flight path layer
        this.flightPathLayer = new WorldWind.RenderableLayer(`Flight Path Layer`);
        this.flightPathLayer.opacity = 0.9;
        this.wwd.addLayer(this.flightPathLayer);

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

        // create flight path
        this.flightPlanVisible = !!opt.flightPlanVisible;
        this.flightPlan = new DAA_FlightPlan(this.flightPathLayer);
        if (opt?.flightPlan) {
            this.setFlightPlan(opt.flightPlan);
        }    

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
        if (opt?.traffic?.length) {
            this.setTraffic(opt.traffic);
        }

        // Create atmosphere layer
        if (opt?.atmosphere) {
            this.atmosphereLayer = new WorldWind.AtmosphereLayer();
            const timestamp = Date.now(); // The current date will be given to initialize the position of the sun.
            this.atmosphereLayer.time = new Date(timestamp); // Atmosphere layer requires a date to simulate the position of the Sun.
            this.atmosphereLayer.minActiveAltitude = 500; // meters above which the atmosphere layer is visible. We are disabling for lower altitudes so the terrain is brighter (atmosphere tends to make terrain brownish).
            this.wwd.addLayer(this.atmosphereLayer);
        }

        if (this.godsView) {
            // Controls for god's view
            this.controlLayers = {
                compass: new WorldWind.CompassLayer(),
                view: new WorldWind.ViewControlsLayer(this.wwd),
                coords: new WorldWind.CoordinatesDisplayLayer(this.wwd)
            }
            this.controlLayers.compass.enabled = true;
            this.controlLayers.view.enabled = true;
            this.controlLayers.coords.enabled = true;
            for (let i in this.controlLayers) {
                this.wwd.addLayer(this.controlLayers[i]);
            }
        }

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
    /**
     * Trace not available in wwd
     */
    setMaxTraceLength (len: number): boolean {
        // not available
        console.warn(`[daa-interactive-map] Warning: Trace not available in WWD, please use LeafletJS`);
        return false;
    }
    /**
     * Trace not available in wwd
     */
    getMaxTraceLength (): number {
        return 0;
    }
    /**
     * Animation duration not available in wwd
     */
    animationDuration (duration: number): boolean {
        // not available
        console.warn(`[daa-interactive-map] Warning: Animation duration not available in WWD, please use LeafletJS`);
        return false;
    }
    /**
     * Enables/disables animation
     */
    animation (flag: boolean): boolean {
        // not available
        console.warn(`[daa-interactive-map] Warning: Animation not available in WWD, please use LeafletJS`);
        return false;
    }
    /**
     * resets all data structures
     */
    resetAirspace (): AirspaceInterface {
        // not available
        console.warn(`[daa-interactive-map] Warning: Reset function not available in WWD, please use LeafletJS`);
        return this;        
    }
    /**
     * Compass div is not available in wwd
     */
    getCompassDivName (): string {
        return null;
    }
    /**
     * Indicators div is not supported in wwd
     */
    getIndicatorsDivName (): string {
        return null;
    }
    /**
     * Indicators div is not supported in wwd
     */
    getOwnshipDivName (): string {
        return null;
    }
    /**
     * Remove traffic traces
     */
    removeTrafficTrace(ac?: string): AirspaceInterface {
        // not available
        console.warn(`[daa-interactive-map] Warning: Traffic traces not available in WWD, please use LeafletJS`);
        return this;
    }
    /**
     * Switch to vfr mode
     */
    vfrMode (): DAA_Airspace {
        // not available
        console.warn(`[daa-interactive-map] Warning: VFR mode not available in WWD, please use LeafletJS`);
        return this;
    }
    /**
     * Switch to terrain mode
     */
    terrainMode (): DAA_Airspace {
        this.terrainLayer.enabled = true;
        this.streetLayer.enabled = false;
        this.redraw();
        return this;
    }
    /**
     * Switch to street mode
     */
    streetMode (): DAA_Airspace {
        this.terrainLayer.enabled = false;
        this.streetLayer.enabled = true;
        this.redraw();
        return this;
    }
    /**
     * Removes all protected areas
     */
    // resetLoS (): DAA_Airspace {
    //     if (this.losLayer) {
    //         for (let i = 0; i < this._traffic.length; i++) {
    //             this._traffic[i].removeLoS();
    //         }
    //     }
    //     this.redraw();
    //     return this;
    // }
    /**
     * airspace view
     */
    godsViewOn (): DAA_Airspace {
        this.godsView = true;
        return this;
    }
    /**
     * ownship view
     */
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
        return this.wwd.navigator.range / this.scaleFactor;
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
        if (this.hazardZones) {
            this.hazardZones.setScale(NMI);
        }
        if (this.contours) {
            this.contours.setScale(NMI);
        }
        this.redraw();
        return this;
    }
    /**
     * Tries to sets the zoom level to the given NMI.
     * Returns true if the level was set correctly, false otherwise
     */
    trySetZoomLevel (NMI: number): boolean {
        this.setZoomLevel(NMI);
        return true;
    }
    /**
     * Sets the zoom level of the airspace.
     * @param NMI {real} Zoom level, given in nautical miles. The map is resized so that the diagonal size of the map corresponds to the provided NMI value.
     */
    setZoomLevel (NMI: number): DAA_Airspace {
        this.nmi = NMI || this.nmi;
        // wwd.navigator.range is the diagonal size of the wwd map displayed in the canvas.
        this.wwd.navigator.range = NMI * this.scaleFactor;
        if (this._traffic) {
            for (let i = 0; i < this._traffic?.length; i++) {
                this._traffic[i].setScale(NMI);
            }
        }
        if (this._ownship) {
            this._ownship.setScale(NMI);
        }
        if (this.hazardZones) {
            this.hazardZones.setScale(NMI);
        }
        if (this.contours) {
            this.contours.setScale(NMI);
        }
        return this.redraw();
    }
    /**
     * Get current zoom level
     */
    getZoomLevel (): number {
        return this.nmi;
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
        this.wwd.navigator.range = 0.3; //this.nmi; // 6e4;
        this.wwd.verticalExaggeration = 1; // 0 is flat (2D) world. A value > 0 will make it 3D. Default in WorldWind is 1.
        return this.redraw();
    }
    /**
     * Centers the map on the ownship position.
     */
    recenter (pos: { lat: number, lon: number }): DAA_Airspace {
        if (pos) {
            if (!isNaN(+pos.lat)) { this.wwd.navigator.lookAtLocation.latitude = pos.lat; }
            if (!isNaN(+pos.lon)) { this.wwd.navigator.lookAtLocation.longitude = pos.lon; }
            this.redraw();
        } else {
            console.warn("[daa-airspace] Warning: Unable to recenter map -- position is null :/");
        }
        return this;
    }
    /**
     * Internal function, re-draws the view
     */
    protected redraw (): DAA_Airspace {
        this.wwd.redraw();
        return this;
    }

    /**
     * Centers the map to a given location. The ownship position is kept unchanged.
     */
    goTo (pos: { lat: number, lon: number }, opt?): DAA_Airspace {
        if (pos) {
            this.recenter(pos);
        } else {
            console.error("Incorrect position :/ ", pos);
        }
        return this;
    }
    /**
     * Set ownship position
     */
    setOwnshipPosition (pos: string | LatLonAlt<number | string>): DAA_Airspace {
        if (pos) {
            if (typeof pos === "string") {
                // remove white spaces in the name and make all small letters
                pos = pos.replace(/\s/g, "").toLowerCase();
                // look for the name of the city in the list of known destinations (array cities)
                const loc: LatLonAlt<number | string> = cities[pos];
                if (loc) {
                    this._ownship.setPosition(loc);
                } else {
                    console.error("Could not find location " + location + " :((");
                }
            } else {
                const position: LatLonAlt<number> = {
                    alt: +pos.alt,
                    lat: +pos.lat,
                    lon: +pos.lon,
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
    /**
     * Set ownship velocity
     */
    setOwnshipVelocity (v: Vector3D<number | string>): DAA_Airspace {
        if (v) {
            this._ownship.setVelocity(v);
            this._ownship.refreshLabel();
            this.redraw();
        }
        return this;
    }
    /**
     * Sets a flight path
     */
    setFlightPlan (flightPlan: utils.FlightPlan): DAA_Airspace {
        // delete old flight plan
        this.flightPlan.clearWaypoints();
        // add new waypoints
        for (let i = 0; i < flightPlan?.length; i++) {
            this.flightPlan.addWaypoint(flightPlan[i]);
        }
        this.flightPlanVisible ? this.revealFlightPlan() : this.hideFlightPlan();
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
     * Updates traffic information.
     */
    setTraffic (traffic: { s: LatLonAlt<number | string>, v: Vector3D<number | string>, symbol: string, callSign: string }[]): DAA_Airspace {
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
        (this.hazardZonesVisible) ? this.revealHazardZones() : this.hideHazardZones();
        (this.contoursVisible) ? this.revealContours() : this.hideContours();
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
                        const reg: LatLonAlt<number>[] = region.sectors.filter(reg => {
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
    /**
     * Adds a geofence polygon, where a geofence can be either a contour or a hazard zone
     * We use a convention to distinguish contours from hazard zones: the ID of a contour starts with "c-"
     */
    addGeoFencePolygon (
        id: string,
        perimeter: LatLon<number | string>[], 
        floor: { top: number | string, bottom: number | string }, 
        opt?: {
            opacity?: number, 
            color?: { r: number, g: number, b: number },
            fontScale?: number,
            showLabel?: boolean
        }
    ) : DAA_Airspace {
        if (id && id.startsWith("c-") && this.contours) {
            this.contours.addPolygon2D(id, perimeter, floor, opt);
            this.redraw();
        } else {
            if (this.hazardZones) {
                this.hazardZones.addPolygon2D(id, perimeter, floor, opt);
                this.redraw();
            }
        }
        return this;
    }
    /**
     * Removes geofence polygon identified by id
     * If id is not specified, all geofence polygons are removed
     */
    removeGeoFencePolygon (id?: string) : DAA_Airspace {
        if (this.hazardZones) {
            this.hazardZones.removePolygon(id);
            this.redraw();
        }
        if (this.contours) {
            this.contours.removePolygon(id);
            this.redraw();
        }
        return this;
    }
    /**
     * Reveals flight path
     */
    revealFlightPlan (): DAA_Airspace {
        this.flightPlanVisible = true;
        if (this.flightPlan) {
            this.flightPlan.reveal();
            this.redraw();
        }
        return this;
    }
    /**
     * Reveals hazard zones
     */
    revealHazardZones (): DAA_Airspace {
        this.hazardZonesVisible = true;
        if (this.hazardZones) {
            this.hazardZones.reveal();
            this.redraw();
        }
        return this;
    }
    revealContours (): DAA_Airspace {
        this.contoursVisible = true;
        if (this.contours) {
            this.contours.reveal();
            this.redraw();
        }
        return this;
    }
    revealGeoFence () : DAA_Airspace {
        this.revealHazardZones();
        this.revealContours();
        return this;
    }
    hideFlightPlan (): DAA_Airspace {
        this.flightPlanVisible = true;
        if (this.flightPlan) {
            this.flightPlan.hide();
            this.redraw();
        }
        return this;
    }
    hideHazardZones (): DAA_Airspace {
        this.hazardZonesVisible = false;
        if (this.hazardZones) {
            this.hazardZones.hide();
            this.redraw();
        }
        return this;
    }
    hideContours (): DAA_Airspace {
        this.contoursVisible = false;
        if (this.contours) {
            this.contours.hide();
            this.redraw();
        }
        return this;
    }
    hideGeoFence () : DAA_Airspace {
        this.hideHazardZones();
        this.hideContours();
        return this;
    }
}