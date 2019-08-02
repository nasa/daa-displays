/**
 * @module Compass
 * @version 2018.12.01
 * @description <div style="display:flex;"><div style="width:50%;">
 *              <b>Compass Widget.</b>
 *              <p>This widget presents the heading of the ownship with respect to the
 *              magnetic north. The ownship is indicated using a chevron symbol at the center of
 *              the compass. Two rendering modes are supported: standard, where the ownship
 *              always points up and the compass rotates when the ownship changes heading;
 *              north up, where the magnetic north always points up and the ownship rotates.</p>
 *              <p>This implementation requires the installation of the pvsio-web toolkit 
 *              (<a href="http://www.pvsioweb.org" target=_blank>www.pvsioweb.org</a>).</p>
 *              <p>Google Chrome is recommended for correct rendering of the widget.</p></div>
 *              <img src="images/daa-compass.png" style="margin-left:8%; max-height:280px;" alt="DAA Compass Widget"></div>
 * @example
// file index.js (to be stored in pvsio-web/examples/demos/daa-displays/)
require.config({
    paths: { 
        widgets: "../../client/app/widgets",
        text: "../../client/app/widgets/daa-displays/lib/text/text"
    }
});
require(["widgets/daa-displays/daa-compass"], function (Compass) {
    "use strict";
    const compass = new Compass("compass", {
        top: 54, left: 108
    });
    compass.setCompass(30);
    compass.setBug(0);
    compass.setBands({
        RECOVERY: [ { from: 0, to: 30 } ], 
        NEAR: [ { from: 30, to: 60 }, { from: -30, to: 0 } ] 
    });
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
import * as templates from './templates/daa-compass-templates';
import * as server from '../daa-server/utils/daa-server';
import { InteractiveMap } from './daa-interactive-map';

const strokeWidth = 8;
// const compassTemplate = require("text!widgets/daa-displays/templates/daa-compass.handlebars");
// const compassBandsTemplate = require("text!widgets/daa-displays/templates/daa-linear-bands-template.handlebars");

// internal class, renders a resolution bug over the compass
class ResolutionBug {
    id: string;
    compass: Compass;
    deg: number;
    /**
     * @function <a name="ResolutionBug">ResolutionBug</a>
     * @description Constructor. Renders a resolution bug over a daa-compass widget.
     * @param id {String} Unique bug identifier.
     * @param daaCompass {Object} DAA Compass widget over which the resolution bug should be rendered.
     * @memberof module:Compass
     * @instance
     * @inner
     */
    constructor (id: string, daaCompass: Compass) {
        this.id = id;
        this.compass = daaCompass;
        this.deg = 0;
    }
    /**
     * @function <a name="ResolutionBug_setAngle">setAngle</a>
     * @desc Sets the bug position to a given heading angle, given in degrees, clockwise rotation, north is 0 deg.
     * @param deg (real) Heading degrees
     * @memberof module:Compass
     * @instance
     * @inner
     */
    setAngle(deg: number): ResolutionBug {
        this.deg = deg;
        this.refresh();
        return this;
    }
    /**
     * @function <a name="ResolutionBug_getAngle">getAngle</a>
     * @desc Returns the heading angle of the bug, in degrees, clockwise rotation, north is 0 deg.
     * @return {real} Heading angle
     * @memberof module:Compass
     * @instance
     * @inner
     */
    getAngle(): number {
        return this.deg;
    }
    /**
     * @function <a name="ResolutionBug_refresh">refresh</a>
     * @desc Triggers re-rendering of the resolution bug.
     * @memberof module:Compass
     * @instance
     * @inner
     */
    refresh(): ResolutionBug {
        $(`#${this.id}`).css({ "transition-duration": "500ms", "transform": `rotate(${this.deg}deg)` });
        let alert = (this.compass) ? this.compass.getAlert(this.deg) : "NONE";
        $(`.${this.id}-bg`).css({ "background-color": utils.bugColors[alert] });
        $(`.${this.id}-bl`).css({ "border-left": `2px dashed ${utils.bugColors[alert]}` });
        return this;
    }
}

// utility function, draws resolution bands over the compass
function _draw_bands (_this) {
    let theHTML = "";
    function _drawArc (ctx, from, to, alert) {
        ctx.beginPath();
        if (utils.bandColors[alert].style === "dash") {
            ctx.setLineDash([4, 8]);
        } else {
            ctx.setLineDash([]);
        }
        ctx.arc(_this.centerX, _this.centerY, _this.radius, (to - 90) / 180 * Math.PI, (from - 90) / 180 * Math.PI, 2 * Math.PI, false);
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = utils.bandColors[alert].color;
        ctx.stroke();
    }
    let ctx = _this.canvas.getContext("2d");
    ctx.clearRect(0, 0, _this.canvas.width, _this.canvas.height);
    Object.keys(_this.bands).forEach(alert => {
        const arcs: utils.FromTo[] = _this.bands[alert];
        let segs = [];
        // console.log(arcs);
        for (let i = 0; i < arcs.length; i++) {
            let from = arcs[i].from || 0;
            let to = arcs[i].to || 360;
            _drawArc(ctx, from, to, alert);
            // the following info is attached to the html to better support debugging
            segs.push({
                from: from,
                to: to,
                id: "compass-band-" + alert + "-" + i
            });                
        }
        theHTML += Handlebars.compile(templates.compassBandsTemplate)({
            segments: segs,
            color: utils.bandColors[alert].color
        });                        
    });
    $(`#${_this.id}-bands`).html(theHTML);
}

// utility function, updates the compass angle
function _update_compass(_this, opt?: {
    transitionDuration?: string
}) {
    opt = opt || {};
    opt.transitionDuration = opt.transitionDuration || "500ms";
    let angle = _this.currentCompassAngle;
    if (_this.nrthup) {
        $("#" + _this.id + "-circle").css({ "transition-duration": opt.transitionDuration, "transform": "rotate(0deg)" }); // compass needs counter-clockwise rotation
        //$("#" + this.id + "-value").html(0); // what do we do with the speed bug? does it rotate with the compass? do we just hide the pointer? The latter is implemented for now
        $("#" + _this.id + "-top-indicator-pointer").css({ "display": "none" });
        $("#" + _this.id + "-daa-ownship").css({ "transition-duration": opt.transitionDuration, "transform": "rotate(" + (angle) + "deg)" });
        if (_this.map) {
            // set map rotation based on speed vector
            _this.map.setHeading(0);
        }
    } else {
        $("#" + _this.id + "-circle").css({ "transition-duration": opt.transitionDuration, "transform": "rotate(" + (-angle) + "deg)" }); // compass needs counter-clockwise rotation
        $("#" + _this.id + "-top-indicator-pointer").css({ "display": "block" });
        let posangle = ((angle % 360) + 360) % 360; // the angle shown in the cockpit should always be between 0...360
        $("#" + _this.id + "-value").html(Math.trunc(posangle).toString());
        $("#" + _this.id + "-daa-ownship").css({ "transition-duration": opt.transitionDuration, "transform": "rotate(0deg)" });
        if (_this.map) {
            // set map rotation based on speed vector
            _this.map.setHeading(angle);
        }
    }
}

export class Compass {
    id: string;
    top: number;
    left: number;
    currentCompassAngle: number;
    nrthup: boolean;
    map: InteractiveMap;
    bands: utils.Bands;
    canvas: HTMLCanvasElement;
    radius: number;
    centerX: number;
    centerY: number;
    resolutionBug: ResolutionBug;
    div: HTMLElement;

    /**
     * @function <a name="Compass">Compass</a>
     * @description Constructor.
     * @param id {String} Unique widget identifier.
     * @param coords {Object} The four coordinates (top, left, width, height) of the widget, specifying
     *        the left/top corners, and the width/height of the (rectangular) widget area.
     *        Default is { top: 111, left: 209, width: 634, height: 634 }.
     *        FIXME: The current implementation support only a fixed size, 634x634. 
     * @param opt {Object} Style options defining the visual appearance of the widget.
     *          <li>map (Object): DAA Interactive Map over which the compass is rendered</li>
     *          <li>parent (String): the HTML element where the widget will be appended (default is "body")</li>
     * @memberof module:Compass
     * @instance
     */
    constructor(id: string, coords: utils.Coords, opt?: { map?: InteractiveMap, parent?: string}) {
        opt = opt || {};
        this.id = id || "daa-compass";

        coords = coords || {};
        this.top = (isNaN(+coords.top)) ? 150 : (+coords.top);
        this.left = (isNaN(+coords.left)) ? 209 : +coords.left;

        // create structure for storing resolution bands
        this.bands = { NONE: [], FAR: [], MID: [], NEAR: [], RECOVERY: [], UNKNOWN: [] };

        // set compass angle and rotation mode
        this.currentCompassAngle = 0; //deg
        this.nrthup = false;

        // save pointer to a daa-interactive-map object, if provided
        this.map = opt.map;

        // create div element
        this.div = utils.createDiv(id, { parent: opt.parent, zIndex: 2 });
        const theHTML = Handlebars.compile(templates.compassTemplate)({
            id: this.id,
            zIndex: 2,
            baseUrl: utils.baseUrl,
            top: this.top,
            left: this.left
        });
        $(this.div).html(theHTML);
        this.canvas = <HTMLCanvasElement> document.getElementById(id + "-bands");
        this.radius = this.canvas.width / 2 - strokeWidth + 1;
        this.centerX = this.centerY = this.canvas.width / 2;

        // create resolution bug
        this.resolutionBug = new ResolutionBug(this.id + "-resolution-bug", this);
        this.resolutionBug.setAngle(0);
    }
    /**
     * @function <a name="setCompass">setCompass</a>
     * @description Sets the compass value.
     * @param val {real} Compass value. Default units is degrees.
     * @param opt {Object} Options:
     *             <li>units (String): "rad", indicates that resolution bands are given in radians.
     *                                 The widget will automatically convert the bands to degrees.</li>
     * @memberof module:Compass
     * @instance
     */
    setCompass(data: number | utils.Vector3D | server.Vector3D, opt?: { units?: string }): Compass {
        opt = opt || {};
        // x and y are swapped in atan2 because axes are inverted in the map view (x is the aircraft direction, and it's facing up)
        const deg = (typeof data === "number")? data : 
                        (opt && opt.units === "deg") ? 
                            utils.rad2deg(Math.atan2(utils.deg2rad(+data.x), utils.deg2rad(+data.y)))
                            : utils.rad2deg(Math.atan2(+data.x, +data.y));
        const angle: number = (opt.units === "rad") ? utils.rad2deg(deg) : +deg;
        const alt_angle: number = (angle % 360 + 360) % 360; // positive version of the angle
        this.currentCompassAngle = (this.currentCompassAngle - angle < this.currentCompassAngle - alt_angle) ? angle : alt_angle; // choose the least variation from the current angle
        _update_compass(this);
        return this;
    }
    /**
     * @function <a name="setBug">setBug</a>
     * @description Sets the bug position.
     * @param val {real} Bug position value. Default units is degrees.
     * @memberof module:Compass
     * @instance
     */
    setBug(deg: number): Compass {
        this.resolutionBug.setAngle(deg);
        return this;
    }
    /**
     * @function <a name="setBands">setBands</a>
     * @description Renders airspeed resolution bands.
     *              Six types of resolution bands are supported:
     *              <li>FAR (dash yellow)</li>
     *              <li>MID (yellow)</li>
     *              <li>NEAR (red)</li>
     *              <li>RECOVERY (dash green)</li>
     *              <li>UNKNOWN (grey)</li>
     *              <li>NONE (transparent)</li>
     *              Band colors are defined in daa-utils.js
     * @param bands {Object} Bands to be rendered. This parameter is an object in the form { bandName: ranges },
     *                       where bandName is one of FAR, MID, NEAR, RECOVERY, UNKNOWN, NONE
     *                       and ranges is an Array of objects in the { from: real, to: real }.
     *                       Band range is given in degrees.
     *                       Example bands: { RECOVERY: [ { from: 0, to: 300 } ], { NEAR: [ { from: 300, to: 600 } ] } 
     * @param opt {Object} Options:
     *             <li>units (String): "rad", indicates that resolution bands are given in radians.
     *                                 The widget will automatically convert the bands to degrees.</li>
     * @memberof module:Compass
     * @instance
     */
    setBands(bands, opt?: { units?: string }): Compass {
        opt = opt || {};
        function normaliseCompassBand(b) {
            // normaliseRange converts range in bands to positive degrees (e.g., -10..0 becomes 350..360), and range.from is always < range.to 
            function normaliseBand(rg) {
                let range = [];
                if (rg) {
                    for (let i = 0; i < rg.length; i++) {
                        let from = rg[i].from;
                        let to = rg[i].to;
                        // negative degrees are converted to positive values in the range 0..360
                        if (from < 0) { from = from % 360 + 360; }
                        // if range.from is greater than range.to (e.g., { from: 330, to: 20 }), we need to split the range in two sub-ranges (e.g., in this case [{ from: 330, to: 360 }, { from: 0, to: 20 } ] )
                        if (from > to) {
                            range.push({ from: from, to: 360 });
                            range.push({ from: 0, to: to });
                        } else {
                            range.push({ from: from, to: to });
                        }
                    }
                }
                return range;
            }
            if (b && b.length > 0) {
                let ans = b.map(function (range) {
                    if (opt.units === "rad") {
                        // if bands are given in radiants, we need to convert to degrees
                        return { from: utils.rad2deg(range.from), to: utils.rad2deg(range.to) };
                    }
                    return { from: range.from, to: range.to };
                });
                return normaliseBand(ans);
            }
            return [];
        }
        this.bands.NONE = normaliseCompassBand(bands.NONE);
        this.bands.FAR = normaliseCompassBand(bands.FAR);
        this.bands.MID = normaliseCompassBand(bands.MID);
        this.bands.NEAR = normaliseCompassBand(bands.NEAR);
        this.bands.RECOVERY = normaliseCompassBand(bands.RECOVERY);
        this.bands.UNKNOWN = normaliseCompassBand(bands.UNKNOWN);
        // console.log("danti-compass-bands", this.bands);
        _draw_bands(this);
        this.resolutionBug.refresh();
        return this;
    }
    /**
     * @function <a name="getAlert">getAlert</a>
     * @description Returns the alert indicated at a given angle on the compass.
     * @return {String} The alert type, one of "FAR", "MID", "NEAR", "RECOVERY", "UNKNOWN", "NONE"
     * @memberof module:VerticalSpeedTape
     * @instance
     */
    getAlert(deg: number): string {
        function normalise(deg: number) {
            return (deg % 360 + 360) % 360;
        }
        function isWithinBand(b) {
            for (let i = 0; i < b.length; i++) {
                if (deg >= b[i].from && deg <= b[i].to) {
                    return true;
                }
            }
            return false;
        }
        deg = normalise(deg);
        if (this.bands.FAR && isWithinBand(this.bands.FAR)) {
            return "FAR";
        } else if (this.bands.MID && isWithinBand(this.bands.MID)) {
            return "MID";
        } else if (this.bands.NEAR && isWithinBand(this.bands.NEAR)) {
            return "NEAR";
        } else if (this.bands.RECOVERY && isWithinBand(this.bands.RECOVERY)) {
            return "RECOVERY";
        } else if (this.bands.UNKNOWN && isWithinBand(this.bands.UNKNOWN)) {
            return "UNKNONW";
        }
        return "NONE";
    }
    /**
     * @function <a name="resetCompass">resetCompass</a>
     * @description Sets the compass value to 0.
     * @memberof module:Compass
     * @instance
     */
    resetCompass(): Compass {
        return this.setCompass(0);
    }
    /**
     * @function <a name="nrthupViewOn">nrthupViewOn</a>
     * @description Sets the mode of operation to north up.
     * @memberof module:Compass
     * @instance
     */
    nrthupView(on: boolean): Compass {
        this.nrthup = on;
        _update_compass(this, { transitionDuration: "0ms" });
        return this;
    }
    /**
     * @function <a name="getHeading">getHeading</a>
     * @description Returns the current compass value.
     * @return {real} The current compass value.
     * @memberof module:Compass
     * @instance
     */
    getHeading(): number {
        return this.currentCompassAngle;
    }
}
