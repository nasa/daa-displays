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
import * as utils from './daa-utils';
import * as templates from './templates/daa-map-templates';
import * as serverInterface from './utils/daa-server'
import { cities, DAA_Airspace } from './daa-map-components/daa-airspace';

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
                opt?: { parent?: string, pos?: utils.LatLonAlt, offlineMap?: string, terrainMap?: string, streetMap?: string, terrainMode?: boolean, atmosphere?: boolean, view3D?: boolean,
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
            terrainMap: opt.terrainMap,
            streetMap: opt.streetMap,
            terrainMode: opt.terrainMode,
            atmosphere: opt.atmosphere,
            godsView: opt.godsView,
            view3D: opt.view3D,
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
     * @function <a name="setLoS">setLoS</a>
     * @description Sets the LoS (loss of separation) Region.
     * @memberof module:InteractiveMap
     * @instance
     */
    setLoS(regions: serverInterface.DAALosRegion[], opt?: { nmi?: number }) {
        this.airspace.setLoS(regions, opt);
    }
    /**
     * @function <a name="setLoS">setLoS</a>
     * @description 3D view of the map.
     * @memberof module:InteractiveMap
     * @instance
     */
    view3D (): InteractiveMap {
        this.airspace.view3D();
        return this;
    }
    /**
     * @function <a name="view2D">view2D</a>
     * @description 2D view of the map.
     * @memberof module:InteractiveMap
     * @instance
     */
    view2D (): InteractiveMap {
        this.airspace.view2D();
        return this;
    }
    /**
     * @function <a name="setLoS">setLoS</a>
     * @description Shows satellite images in the map.
     * @memberof module:InteractiveMap
     * @instance
     */
    terrainMode (): InteractiveMap {
        this.airspace.terrainMode();
        return this;
    }
    /**
     * @function <a name="setLoS">setLoS</a>
     * @description Shows street names in the map.
     * @memberof module:InteractiveMap
     * @instance
     */
    streetMode (): InteractiveMap {
        this.airspace.streetMode();
        return this;
    }

    addGeoFence (id: string, outerBoundaries: utils.LatLonAlt[] | serverInterface.LatLonAlt[], opt?: { opacity?: number, color?: { r: number, g: number, b: number } }): InteractiveMap {
        this.airspace.addGeoFencePolygon(id, outerBoundaries, opt);
        return this;
    }
    removeGeoFence (id: string): InteractiveMap {
        this.airspace.removeGeoFencePolygon(id);
        return this;
    }
    showGeoFence (flag: boolean): InteractiveMap {
        if (flag) {
            this.airspace.revealGeoFence();
        } else { this.airspace.hideGeoFence(); }
        return this;
    }

}