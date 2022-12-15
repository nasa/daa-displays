/**
 * @module InteractiveMap
 * @date 2018.12.01
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
 * 
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
import * as utils from './daa-utils';
import * as templates from './templates/daa-map-templates';
import * as serverInterface from './utils/daa-types'
import { AirspaceInterface, cities, DAA_Airspace } from './daa-map-components/daa-airspace';
import { GeoFence } from './daa-map-components/daa-geofence';
import { LeafletAirspace } from './daa-map-components/leaflet-airspace';
import { LayeringMode } from './daa-map-components/leaflet-aircraft';
import { DAA_AircraftDescriptor, LatLon, LatLonAlt, Vector3D } from './utils/daa-types';

// useful constants
export const colors = GeoFence.geofenceColors;
export const MAP_WIDESCREEN_WIDTH: number = 1496; // 1334
export const DEFAULT_MAP_WIDTH: number = 1054;
export const DEFAULT_MAP_HEIGHT: number = 842;

/**
 * Moving map
 */
export class InteractiveMap {
    id: string;
    heading: number;
    pos: LatLonAlt<number>;
    trafficDescriptor: DAA_AircraftDescriptor[];
    airspace: AirspaceInterface;

    // parent DOM element where the aerospace will be created
    protected $div: JQuery<HTMLElement>;
 
    // inner div, used for map rotations
    protected $innerDiv: JQuery<HTMLElement>;

    /**
     * @function <a name="InteractiveMap">InteractiveMap</a>
     * @description Constructor.
     * @param id {String} Unique widget identifier.
     * @param coords {Object} The four coordinates (top, left) of the widget, specifying
     *        the left/top corners of the (rectangular) widget area.
     * @param opt {Object} Style options defining the visual appearance of the widget.
     *          <li>pos (Object): Earth location shown at the center of the map. Location is given as { lat: (real), lon: (real) } (default: lat/lon of Hampton, VA, USA) </li>
     *          <li>offlineMap (String): path to a folder containing NASA Blue Marble (BMNG) offline maps</li>
     *          <li>terrain (String): terrain type, one of "BMNG" (terrain, low res), "BMNGOne" (terrain, low res), "BMNGLandsat" (terrain, low res), "BingAerial" (terrain, high res), "BingAerialWithLabels" (terrain, high res), "BingRoads" (map, high res)</li>
     *          <li>atmosphere (bool): whether the atmosphere layer is to be rendered (default: false)</li>
     *          <li>parent (String): the HTML element where the widget will be appended (default is "body")</li>
     * @memberof module:InteractiveMap
     * @instance
     */
    constructor(
        id: string, 
        coords: { top?: number, left?: number },
        opt?: { 
            parent?: string, 
            pos?: LatLonAlt<number>, 
            offlineMap?: string, 
            terrainMap?: string, 
            streetMap?: string, 
            terrainMode?: boolean, 
            atmosphere?: boolean, 
            view3D?: boolean,
            godsView?: boolean, 
            los?: boolean, 
            callSignVisible?: boolean, // default: false
            trafficTraceVisible?: boolean, // default: false
            ownshipTraceVisible?: boolean, // default: false
            maxTraceLen?: number,
            widescreen?: boolean,
            layeringMode?: LayeringMode,
            scrollZoom?: boolean, // whether scroll and touch events can be used to zoom the map (default: false)
            dragging?: boolean, // whether dragging the map is enabled (default: false)
            animate?: boolean, //  whether to smooth animation of objects moving on the map, default: false
            duration?: number, // duration of the animation, in seconds, default: 0.25s
            engine?: "wwd" | "leafletjs" | "blank"
        }
    ) {
        opt = opt || {};
        this.id = id;
        this.heading = 0; // default heading is 0 deg (i.e., pointing north)
        this.pos = opt.pos || { lat: cities.hampton.lat, lon: cities.hampton.lon, alt: 0 };
        this.trafficDescriptor = [];
        
        coords = coords || {};
        coords.top = (isNaN(+coords.top)) ? 0 : +coords.top;
        coords.left = (isNaN(+coords.left)) ? 0 : +coords.left;
        const width: number = opt.widescreen ? MAP_WIDESCREEN_WIDTH : DEFAULT_MAP_WIDTH;
        const height: number = DEFAULT_MAP_HEIGHT;

        // parent div
        this.$div = $(`#${opt.parent}`);

        // create the DOM element
        const innerDiv: HTMLElement = utils.createDiv(id, {
            parent: opt.parent
        });
        this.$innerDiv = $(innerDiv);
        const theHTML = Handlebars.compile(templates.mapTemplate)({
            id: this.id,
            top: coords.top,
            left: coords.left,
            width: width,
            height: height
        });
        $(this.$innerDiv).html(theHTML);
        // default rendering engine is wwd, for backwards compatibility with other tools that might be using daa-displays
        // external tools using daa-displays need the following minor changes to use leafletjs:
        // - include leaflet.css in the html file, e.g., <link rel="stylesheet" href="node_modules/leaflet/dist/leaflet.css">
        // - if daa-server is not used, update the list of folders served by their server, so leaflet.js is provided to the client, see daa-server.ts
        // - update the dependencies with "leaflet": "^1.7.1"
        const engine: "leafletjs" | "wwd" | "blank" = opt?.engine || "wwd";
        this.airspace = 
            (engine === "leafletjs" && !opt.view3D) ? new LeafletAirspace({
                ...opt,
                div: this.id + "-div"
            }) : (engine === "wwd" && !opt.view3D) ? new DAA_Airspace({
                ...opt,
                canvas: this.id + "-canvas"
            }) : null;
        this.airspace?.setOwnshipHeading(this.heading, { nrthup: true });
        this.airspace?.setZoomLevel(5); // NMI
        // enable/disable pointer events based on the type of view
        (opt.godsView) ? this.enableMapPointerEvents() : this.disableMapPointerEvents();
    }
    /**
     * Resets all data structures
     */
    resetAirspace (): InteractiveMap {
        this.airspace?.resetAirspace();
        return this;
    }
    /**
     * Sets animation duration
     */
    animationDuration (sec: number): boolean {
        return this.airspace?.animationDuration(sec);
    }
    /**
     * Internal function enables pointer events on the map
     */
    protected enableMapPointerEvents (): void {
        this.$div.css({
            "pointer-events": "all",
            "touch-action": "auto",
            cursor: "grab"
        });
    }
    /**
     * Internal function disables pointer events on the map
     */
    protected disableMapPointerEvents (): void {
        this.$innerDiv.find(`#map-div`).css({
            "pointer-events": "none",
            "touch-action": "none",
            cursor: "auto"
        });
    }
    /**
     * @deprecated
     * @returns 
     */
    protected resetLoS (): InteractiveMap {
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
        this.airspace?.setOwnshipHeading(deg, opt);
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
            this.airspace?.revealTraffic();
        } else { this.airspace?.hideTraffic(); }
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
            this.airspace?.revealCallSign();
        } else { this.airspace?.hideCallSign(); }
        return this;
    }
    /**
     * Utility function, returns the if of a DOM element that can be used for rendering the compass
     * The returned div is designed to be placed above the map layer and below the traffic layer
     * A null pointer is returned if the map does not support the use of such div (e.g., wwd does not support this feature, while leaflet-js has it)
     */
    getCompassDivName (): string {
        return this.airspace?.getCompassDivName();
    }
    /**
     * Utility function, returns the if of a DOM element that can be used for rendering compass indicators
     * The returned div is designed to be placed above all other layers
     * A null pointer is returned if the map does not support the use of such div (e.g., wwd does not support this feature, while leaflet-js has it)
     */
    getIndicatorsDivName (): string {
        return this.airspace?.getIndicatorsDivName();
    }
    /**
     * @function <a name="revealTraffic">revealTraffic</a>
     * @description Reveals traffic information on the map.
     * @memberof module:InteractiveMap
     * @instance
     */
    revealTraffic(): InteractiveMap {
        this.airspace?.revealTraffic();
        return this;
    }
    /**
     * @function <a name="hideTraffic">hideTraffic</a>
     * @description Hides traffic information on the map.
     * @memberof module:InteractiveMap
     * @instance
     */
    hideTraffic(): InteractiveMap {
        this.airspace?.hideTraffic();
        return this;
    }
    /**
     * @function <a name="setZoomLevel">setZoomLevel</a>
     * @description Sets the zoom level of the map.
     * NOTE: nasa-worldwind seems to have rendering problems for areas next to lat lon (0,0) when using high zoom levels
     * (all rendering layers disappear in that region when the zoom level is below ~2.5NMI)
     * As a workaround, the java code implemented in the server applies a virtual relocation of the scenario 
     * (see commit https://github.com/nasa/daa-displays/commit/438dc96999bfa4d540edf84a94d8e13b935f088e)
     * @param NMI {real} Zoom level, given in nautical miles. The map is resized so that the diagonal size of the map corresponds to the provided NMI value.
     * @memberof module:InteractiveMap
     * @instance
     */
    setZoomLevel(NMI: number): InteractiveMap {
        this.airspace?.setZoomLevel(NMI);
        return this;
    }
    /**
     * Tries to set the zoom level to the given NMI
     * Returns true if the zoom level was set correctly, otherwise false
     */
    trySetZoomLevel (NMI: number): boolean {
        return this.airspace?.trySetZoomLevel(NMI);
    }
    /**
     * @function <a name="goTo">goTo</a>
     * @description Sets the current position of the map.
     * @param pos {Object} Earth location shown at the center of the map, given as { lat: (real), lon: (real), alt: (real) }
     * @memberof module:InteractiveMap
     * @instance
     */
    goTo (pos: string | LatLonAlt<number | string>, opt?: { animate?: boolean }): InteractiveMap {
        if (typeof pos === "string") {
            // remove white spaces in the name and make all small letters
            pos = pos.replace(/\s/g, "").toLowerCase();
            // look for the name of the city in the list of known destinations (array cities)
            pos = cities[pos];
        }
        if (typeof pos === "object") {
            this.pos = {
                lat: +pos?.lat, 
                lon: +pos?.lon, 
                alt: +pos?.alt 
            };
            this.airspace?.goTo({ lat: this.pos.lat, lon: this.pos.lon }, opt);
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
    setOwnshipPosition(pos: string | LatLonAlt<number | string>): InteractiveMap {
        if (typeof pos === "string") {
            // remove white spaces in the name and make all small letters
            pos = pos.replace(/\s/g, "").toLowerCase();
            // look for the name of the city in the list of known destinations (array cities)
            pos = cities[pos];
        }
        if (typeof pos === "object") {
            this.pos = {
                lat: +pos?.lat,
                lon: +pos?.lon,
                alt: +pos?.alt
            };
            this.airspace?.setOwnshipPosition(this.pos);
        } else {
            console.error("Incorrect aircraft position :/ ", pos);
        }
        return this;
    }
    setOwnshipVelocity(v: Vector3D<number | string>): InteractiveMap {
        if (v) {
            const vel: Vector3D<number> = {
                x: +v?.x,
                y: +v?.y,
                z: +v?.z
            }
            this.airspace?.setOwnshipVelocity(vel);
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
        this.airspace?.recenter(pos);
        return this;
    }
    /**
     * @function <a name="setPosition">setPosition</a>
     * @description Sets the current position of the map. This function is equivalent to <a href="#goTo">goTo</a>.
     * @param pos {Object} Earth location shown at the center of the map, given as { lat: (real), lon: (real) }
     * @memberof module:InteractiveMap
     * @instance
     */
    setPosition(pos: LatLonAlt<number | string>) {
        this.setOwnshipPosition(pos);
        return this.goTo(pos, { animate: true });
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
        this.airspace?.setTraffic(data);
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
        this.airspace?.setTraffic(data);
        return this;
    }
    /**
     * Sets the LoS (loss of separation) Region.
     * LoS regions are now implemented as geofence contours
     * @deprecated
     */
    protected setLoS(regions: serverInterface.DAALosRegion[], opt?: { nmi?: number }): InteractiveMap {
        if (this.airspace["setLoS"]) {
            this.airspace["setLoS"](regions, opt);
        }
        return this;
    }
    /**
     * @function <a name="setLoS">setLoS</a>
     * @description 3D view of the map.
     * @memberof module:InteractiveMap
     * @instance
     */
    view3D (): InteractiveMap {
        this.airspace?.view3D();
        return this;
    }
    /**
     * @function <a name="view2D">view2D</a>
     * @description 2D view of the map.
     * @memberof module:InteractiveMap
     * @instance
     */
    view2D (): InteractiveMap {
        this.airspace?.view2D();
        return this;
    }
    /**
     * @function <a name="setLoS">setLoS</a>
     * @description Shows satellite images in the map.
     * @memberof module:InteractiveMap
     * @instance
     */
    terrainMode (): InteractiveMap {
        this.airspace?.terrainMode();
        return this;
    }
    /**
     * VFR map mode
     */
    vfrMode (): InteractiveMap {
        this.airspace?.vfrMode();
        return this;
    }
    /**
     * @function <a name="setLoS">setLoS</a>
     * @description Shows street names in the map.
     * @memberof module:InteractiveMap
     * @instance
     */
    streetMode (): InteractiveMap {
        this.airspace?.streetMode();
        return this;
    }
    addGeoFence (
        id: string, 
        perimeter: LatLon<number | string>[], 
        floor: { top: number | string, bottom: number | string },
        opt?: { 
            opacity?: number, 
            color?: { r: number, g: number, b: number },
            fontScale?: number,
            showLabel?: boolean
        }
    ): InteractiveMap {
        this.airspace?.addGeoFencePolygon(id, perimeter, floor, opt);
        return this;
    }
    addContour (
        id: string, 
        perimeter: LatLon<number | string>[], 
        floor: { top: number | string, bottom: number | string },
        opt?: { 
            opacity?: number, 
            color?: { r: number, g: number, b: number },
            fontScale?: number,
            showLabel?: boolean
        }
    ): InteractiveMap {
        opt = opt || {};
        opt.color = opt.color || colors.darkyellow;
        return this.addGeoFence("c-" + id, perimeter, floor, opt);
    }
    addProtectedArea (
        id: string, 
        perimeter: LatLon<number | string>[], 
        floor: { top: number | string, bottom: number | string },
        opt?: { 
            opacity?: number, 
            color?: { r: number, g: number, b: number },
            fontScale?: number,
            showLabel?: boolean
        }
    ): InteractiveMap {
        opt = opt || {};
        opt.color = opt.color || colors.daayellow;
        opt.opacity = opt.opacity || 0.05;
        return this.addGeoFence("pa-" + id, perimeter, floor, opt);
    }
    removeGeoFence (id?: string): InteractiveMap {
        this.airspace?.removeGeoFencePolygon(id);
        return this;
    }
    showGeoFence (flag: boolean): InteractiveMap {
        this.showContours(flag);
        this.showHazardZones(flag);
        return this;
    }
    showHazardZones (reveal: boolean): InteractiveMap {
        (reveal) ? this.airspace?.revealHazardZones() : this.airspace?.hideHazardZones();
        return this;
    }
    showContours (reveal: boolean): InteractiveMap {
        (reveal) ? this.airspace?.revealContours() : this.airspace?.hideContours();
        return this;
    }
    /**
     * Sets a flight plan and displays it on the map
     */
    setFlightPlan (flightPlan: utils.FlightPlan): InteractiveMap {
        this.airspace?.setFlightPlan(flightPlan);
        return this;
    }
    /**
     * Reveals/Hides flight plan
     */
    showFlightPlan (reveal: boolean): InteractiveMap {
        (reveal) ? this.revealFlightPlan() : this.hideFlightPlan();
        return this;
    }
    /**
     * Reveals flight plan
     */
    revealFlightPlan (): InteractiveMap {
        this.airspace?.revealFlightPlan();
        return this;
    }
    /**
     * Hides flight plan
     */
    hideFlightPlan (): InteractiveMap {
        this.airspace?.hideFlightPlan();
        return this;
    }
}