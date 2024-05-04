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
import * as math from './utils/daa-math';
import * as templates from './templates/daa-compass-templates';
import { InteractiveMap } from './daa-interactive-map';
import { WindIndicator } from './daa-wind-indicator';
import { fixed3 } from './daa-utils';
import { ResolutionElement, Vector3D } from './utils/daa-types';

export const SINGLE_STROKE: number = 8;
export const DOUBLE_STROKE: number = 16;

// internal class, renders a resolution bug over the compass
class ResolutionBug {
    protected id: string;
    protected compass: Compass;
    protected currentAngle: number = 0; // deg
    protected previousAngle: number = 0; // deg
    protected color: string = utils.bugColors["UNKNOWN"];
    protected maxWedgeAperture: number = 0; // degrees
    protected wedgeAperture: number = 0; // degrees
    protected wedgeSide: "left" | "right" = "right"; // side of the wedge wrt the resolution indicator
    protected wedgeConstraints: utils.FromTo[] = null;
    protected animate: boolean = true;
    protected duration: number = utils.DEFAULT_INSTRUMENT_ANIMATION_DURATION; // sec

    /**
     * @function <a name="ResolutionBug">ResolutionBug</a>
     * @description Constructor. Renders a resolution bug over a daa-compass widget.
     * @param id {String} Unique bug identifier.
     * @param daaCompass {Object} DAA Compass widget over which the resolution bug should be rendered.
     * @memberof module:ResolutionBug
     * @instance
     * @inner
     */
    constructor (id: string, daaCompass: Compass) {
        this.id = id;
        this.compass = daaCompass;
    }
    /**
     * @function <a name="ResolutionBug_setValue">setValue</a>
     * @desc Sets the bug position to a given heading angle, given in degrees, clockwise rotation, north is 0 deg.
     * @param deg (real) Heading degrees
     * @memberof module:ResolutionBug
     * @instance
     * @inner
     */
    setValue (deg: number | string, opt?: { wedgeAperture?: number, wedgeConstraints?: utils.FromTo[], wedgeTurning?: "left" | "right" }): void {
        opt = opt || {};
        if (isFinite(+deg)) {
            this.previousAngle = (isNaN(this.previousAngle)) ? +deg : this.currentAngle;
            const c_rotation: number = Math.abs((((+deg - this.previousAngle) % 360) + 360) % 360); // counter-clockwise rotation
            const cC_rotation: number = Math.abs((c_rotation - 360) % 360); // clockwise rotation
            this.currentAngle = (c_rotation < cC_rotation) ? this.previousAngle + c_rotation : this.previousAngle - cC_rotation;

            // update wedge info -- refresh will update the visual appearance
            this.wedgeConstraints = opt.wedgeConstraints;
            this.wedgeSide = opt.wedgeTurning;

            this.reveal();
            this.refresh(opt);
        } else {
            this.hide();
        }
    }

    /**
     * Internal functions, updates the visual appearance of the wedge
     */
    protected refreshWedge (opt?: { wedgeAperture?: number }): void {
        opt = opt || {};
        this.wedgeAperture = (!isNaN(opt.wedgeAperture)) ? opt.wedgeAperture : this.maxWedgeAperture;
        if (this.wedgeConstraints) {
            // merge zero crossing in constraints -- e.g., the two constraints [0..200] [260, 360] be transformed into [260..560] and [-100,200]
            const constraints: utils.FromTo[] = [];
            for (let i = 0; i < this.wedgeConstraints.length; i++) {
                const ct: utils.FromTo = this.wedgeConstraints[i];
                if (ct.from === 0 || ct.to === 360) {
                    if (ct.from === 0) {
                        for (let j = 0; j < this.wedgeConstraints.length; j++) {
                            if (this.wedgeConstraints[j].to === 360) {
                                ct.from = this.wedgeConstraints[j].from - 360;
                            }
                        }
                    } else if (ct.to === 360) {
                        for (let j = 0; j < this.wedgeConstraints.length; j++) {
                            if (this.wedgeConstraints[j].from === 0) {
                                ct.to = 360 + this.wedgeConstraints[j].to;
                            }
                        }
                    }

                }
                constraints.push(ct);
            }
            // adjust aperture to satisfy the given constraints
            const currentAngle = Math.abs(((this.currentAngle % 360) + 360) % 360);
            for (let i = 0; i < constraints.length; i++) {
                const aperture1: number = Math.abs((((currentAngle - constraints[i].from) % 360) + 360) % 360);
                const aperture2: number = Math.abs((((currentAngle - constraints[i].to) % 360) + 360) % 360);
                const aperture: number = (this.wedgeSide === "right") ? aperture2 : aperture1;
                if (aperture < this.wedgeAperture) {
                    this.wedgeAperture = aperture;
                }
            }
        }
    }
    /**
     * @function <a name="ResolutionBug_setMaxWedgeAperture">setMaxWedgeAperture</a>
     * @desc Sets the maximum aperture of the resolution wedge.
     * @param deg (real) Maximum aperture of the wedge (in degrees)
     * @memberof module:ResolutionBug
     * @instance
     * @inner
     */
    setMaxWedgeAperture (deg: number | string): void {
        if (isFinite(+deg) && +deg >= 0) {
            this.maxWedgeAperture = +deg;
        }
    }
    /**
     * @function <a name="ResolutionBug_getWedgeAperture">getWedgeAperture</a>
     * @desc Returns the current aperture of the resolution wedge.
     * @param deg (real) Current aperture of the wedge (in degrees)
     * @memberof module:ResolutionBug
     * @instance
     * @inner
     */
    getWedgeAperture (): number {
        return this.wedgeAperture;
    }
    /**
     * @function <a name="ResolutionBug_setColor">setColor</a>
     * @desc Sets the bug color.
     * @param color (string) Bug color
     * @memberof module:ResolutionBug
     * @instance
     * @inner
     */
    setColor(color: string): void {
        this.color = (typeof color === "string") ? color : utils.bugColors["UNKNOWN"];
        this.refresh();         
    }
    /**
     * @function <a name="ResolutionBug_getAngle">getAngle</a>
     * @desc Returns the heading angle of the bug, in degrees, clockwise rotation, north is 0 deg.
     * @return {real} Heading angle
     * @memberof module:ResolutionBug
     * @instance
     * @inner
     */
    getAngle(): number {
        return this.currentAngle;
    }
    /**
     * @function <a name="ResolutionBug_refresh">refresh</a>
     * @desc Triggers re-rendering of the resolution bug.
     * @memberof module:ResolutionBug
     * @instance
     * @inner
     */
    refresh (opt?: { wedgeAperture?: number }): void {
        opt = opt || {};
        this.refreshWedge(opt);
        const animationDuration: string = this.animate ? `${this.duration}s` : "0s";
        $(`#${this.id}`).css({ "transition-duration": animationDuration, "transform": `rotate(${this.currentAngle}deg)` });
        $(`.${this.id}-bg`).css({ "background-color": this.color });
        $(`.${this.id}-bl`).css({ "border-left": `2px dashed ${this.color}` });
        if ((isNaN(opt.wedgeAperture) && this.maxWedgeAperture) || (!isNaN(opt.wedgeAperture) && opt.wedgeAperture > 0)) {
            $(`#${this.id}-wedge`).css({ "display": "block", "filter": "brightness(1.5)" });
            $(`#${this.id}-indicator`).css({ "display": "none"});
            const canvas: HTMLCanvasElement = <HTMLCanvasElement> document.getElementById(`${this.id}-wedge`);
            const ctx: CanvasRenderingContext2D = canvas.getContext("2d");
            const radius: number = canvas.width / 2;
            const centerX: number = canvas.width / 2;
            const centerY: number = canvas.width / 2;
            const from: number = (this.wedgeSide === "right") ? 0 : -math.deg2rad(this.wedgeAperture);
            const to: number = (this.wedgeSide === "right") ? math.deg2rad(this.wedgeAperture) : 0;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, from - Math.PI / 2, to - Math.PI / 2, false); // 0 degrees in the compass is -90 degrees in the canvas
            ctx.closePath();
            ctx.fillStyle = utils.bugColors["RECOVERY"]; // "green";
            ctx.fill();
        } else {
            $(`#${this.id}-wedge`).css({ "display": "none"});
            $(`#${this.id}-indicator`).css({ "display": "block"});
        }
    }
    reveal (): void {
        $(`#${this.id}`).css({ "display": "block"});
    }
    hide (): void {
        $(`#${this.id}`).css({ "display": "none"});
    }
}

/**
 * Rotating compass
 */
export class Compass {
    static readonly units = {
        deg: "deg",
        rad: "rad"
    };

    protected id: string;
    protected top: number;
    protected left: number;
    protected currentCompassAngle: number;
    protected previousCompassAngle: number;
    protected nrthup: boolean;

    protected animate: boolean = false; // whether compass rotations should be animated
    protected duration: number = utils.DEFAULT_INSTRUMENT_ANIMATION_DURATION; // animation duration, in seconds

    protected map: InteractiveMap;
    protected wind: WindIndicator;
    protected magvar: number;
    protected magheading: boolean; // whether the compass is magnetic

    protected bands: utils.Bands;
    protected canvas: HTMLCanvasElement;
    protected strokeWidth: number = SINGLE_STROKE;
    protected radius: number;
    protected centerX: number;
    protected centerY: number;
    protected resolutionBug: ResolutionBug;
    protected div: HTMLElement;

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
    constructor(id: string, coords: utils.Coords, opt?: { 
        map?: InteractiveMap,
        wind?: WindIndicator,
        maxWedgeAperture?: number,
        animate?: boolean, // whether the compass should be animated when rotate, default: true
        duration?: number, // animation duration, in seconds
        parent?: string, // ID of the parent where the compass rose will be rendered
        indicatorsDiv?: string, // ID of the div element where indicators will be rendered
        ownshipDiv?: string //  ID of the div element where the ownship will be rendered
    }) {
        opt = opt || {};
        this.id = id || "daa-compass";

        coords = coords || {};
        this.top = (isNaN(+coords.top)) ? 150 : (+coords.top);
        this.left = (isNaN(+coords.left)) ? 209 : +coords.left;

        this.animate = opt.animate === undefined ? false : !!opt.animate;
        this.duration = isFinite(opt.duration) ? opt.duration : utils.DEFAULT_INSTRUMENT_ANIMATION_DURATION;

        // create structure for storing resolution bands
        this.bands = { NONE: [], FAR: [], MID: [], NEAR: [], RECOVERY: [], UNKNOWN: [] };

        // set compass angle and rotation mode
        this.currentCompassAngle = this.previousCompassAngle = 0; //deg
        this.nrthup = false;

        // save pointer to a daa-interactive-map and wind object, if provided
        this.map = opt.map;
        this.wind = opt.wind;
        this.magvar = 0;
        this.magheading = false;

        // create div element
        this.div = utils.createDiv(id, { parent: opt.parent, zIndex: 2 });
        const theHTML: string = Handlebars.compile(templates.compassTemplate)({
            id: this.id,
            zIndex: 2,
            baseUrl: utils.baseUrl,
            top: this.top,
            left: this.left,
            fullShade: true,
            indicators: opt.indicatorsDiv
        });
        $(this.div).html(theHTML);
        // render indicators in external div if opt.indicatorsDiv specifies a div ID
        if (opt.indicatorsDiv) {
            const indicatorsDiv: HTMLElement = utils.createDiv(`${this.id}-indicators-inner`, {
                parent: opt.indicatorsDiv, 
                zIndex: 2,
                top: this.top,
                left: this.left
            });
            const indicatorsHTML: string = Handlebars.compile(templates.indicatorsTemplate)({
                id: this.id
            });
            $(indicatorsDiv)?.html(indicatorsHTML);
        }
        // attach ownship
        const ownshipDiv: HTMLElement = utils.createDiv(`${this.id}-ownship-outer`, {
            parent: opt.ownshipDiv || $(this.div).attr("id"), 
            zIndex: 2,
            top: this.top,
            left: this.left
        });
        const ownshipHTML: string = Handlebars.compile(templates.ownshipTemplate)({
            id: this.id,
            baseUrl: utils.baseUrl
        });
        $(ownshipDiv)?.html(ownshipHTML);

        this.canvas = <HTMLCanvasElement> document.getElementById(id + "-bands");
        this.radius = this.canvas.width / 2 - this.strokeWidth + 1;
        this.centerX = this.centerY = this.canvas.width / 2;

        // create resolution bug
        this.resolutionBug = new ResolutionBug(this.id + "-resolution-bug", this);
        this.resolutionBug.setValue(0);
        this.resolutionBug.setMaxWedgeAperture(opt.maxWedgeAperture);
        this.resolutionBug.hide();
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
    setCompass (data: number | string | Vector3D<number | string>, opt?: { units?: string }): Compass {
        opt = opt || {};
        this.previousCompassAngle = this.currentCompassAngle;
        // x and y are swapped in atan2 because axes are inverted in the map view (x is the aircraft direction, and it's facing up)
        const deg = (typeof data === "number" || typeof data === "string")? +data : 
                        (opt && opt.units === "deg") ? 
                            math.rad2deg(Math.atan2(math.deg2rad(+data.x), math.deg2rad(+data.y)))
                                : math.rad2deg(Math.atan2(+data.x, +data.y));
        const targetAngle: number = (opt.units === "rad") ? math.rad2deg(deg) : +deg;
        const c_rotation: number = Math.abs((((targetAngle - this.previousCompassAngle) % 360) + 360) % 360); // counter-clockwise rotation
        const cC_rotation: number = Math.abs((c_rotation - 360) % 360); // clockwise rotation
        const newAngle: number = (c_rotation < cC_rotation) ? this.previousCompassAngle + c_rotation : this.previousCompassAngle - cC_rotation;
        this.currentCompassAngle = (isFinite(newAngle) ? newAngle : this.currentCompassAngle);
        this._update_compass();
        return this;
    }

    /**
     * Set animation duration
     */
    animationDuration (sec: number): Compass {
        if (sec >= 0 && this.duration !== sec) {
            this.duration = sec;
            this.map?.animationDuration(sec);
        }
        return this;
    }

    /**
     * @function <a name="setZoomLevel">setZoomLevel</a>
     * @description Sets the labels on the compass.
     * @param NMI {real} Zoom level, given in nautical miles.
     * @memberof module:Compass
     * @instance
     */
    setZoomLevel (NMI: number): void {
        // set compass labels
        $(`#${this.id}-compass-label-outer`).html(`${NMI}`);
        $(`#${this.id}-compass-label-mid`).html(`${Math.floor((NMI / 2) * 100) / 100}`);
        $(`#${this.id}-compass-label-inner`).html(`${(NMI <= 0.02) ? Math.floor((NMI / 4) * 1000) / 1000 : Math.floor((NMI / 4) * 100) / 100}`);
        $(`#${this.id}-compass-labels`).css({ display: "block" });
    }

    /**
     * Utility function, updates the compass angle
     **/
    protected _update_compass(opt?: {
        transitionDuration?: string
    }) {
        opt = opt || {};
        const animationDuration: number = this.animate ? this.duration : 0;
        const transitionDuration: string = opt.transitionDuration || `${animationDuration}s`;
        const duration: number = parseFloat(transitionDuration) / (transitionDuration.endsWith("ms") ? 1000 : 1); // sec
        const posangle: number = (((this.currentCompassAngle) % 360) + 360) % 360; // the angle shown in the cockpit should always be between 0...360
        // apply magnetic variation whem the compass is magnetic
        const magvar: number = this.magheading ? this.magvar : 0;
        $(`#${this.id}-quadrant`).css({ "transform": `rotate(-${magvar}deg)` });
        // top display indicator, round heading to the nearest integer and the value should always be between [0..360)
        const headingIndicator: number = ((Math.round(posangle + magvar) % 360) + 360) % 360;
        $(`#${this.id}-value`).html(`${fixed3(Math.round(headingIndicator))}`);
        // rotate compass track-up / north-up
        if (this.nrthup) {
            $(`#${this.id}-circle`).css({ "transition-duration": `${duration}s`, "transform": "rotate(0deg)" }); // compass needs counter-clockwise rotation
            $(`#${this.id}-top-indicator-pointer`).css({ "display": "none" });
            $(`#${this.id}-daa-ownship`).css({ "transition-duration": `${duration}s`, "transform": "rotate(" + this.currentCompassAngle + "deg)" });
            // rotate map and wind indicator accordingly
            if (this.map) { this.map.setHeading(0, { duration }); }
            if (this.wind) { this.wind.currentHeading(0); }
        } else {
            $(`#${this.id}-circle`).css({ "transition-duration": `${duration}s`, "transform": "rotate(" + -this.currentCompassAngle + "deg)" }); // the negative sign is because the compass rotation goes the other way (40 degrees on the compass requires a -40 degrees rotation)
            $(`#${this.id}-top-indicator-pointer`).css({ "display": "block" });
            $(`#${this.id}-daa-ownship`).css({ "transition-duration": `${duration}s`, "transform": "rotate(0deg)" });
            // rotate map and wind indicator accordingly
            if (this.map) { this.map.setHeading(this.currentCompassAngle, { duration }); }
            if (this.wind) { this.wind.currentHeading(this.currentCompassAngle); }
        }
    }

    /**
     * utility function, computes the ground speed based on a given velocity vector 
     */
    static v2deg(data: number | Vector3D<number | string>, opt?: { units?: string }): number {
        opt = opt || {};
        // x and y are swapped in atan2 because axes are inverted in the map view (x is the aircraft direction, and it's facing up)
        const deg = (typeof data === "number")? data : 
                        (opt && opt.units === "deg") ? 
                            math.rad2deg(Math.atan2(math.deg2rad(+data.x), math.deg2rad(+data.y)))
                                : math.rad2deg(Math.atan2(+data.x, +data.y));
        const angle: number = (opt.units === "rad") ? math.rad2deg(deg) : +deg;
        return (angle % 360 + 360) % 360;
    }
    setIndicatorColor (color: string): void {
        if (color) {
            $(`#${this.id}-top-indicator-pointer`).css({ "border-bottom": `2px solid ${color}`, "border-right": `2px solid ${color}` });
            $(`#${this.id}-top-indicator-box`).css({ "border": `2px solid ${color}` });
        }
    }
    resetIndicatorColor (): void {
        const color: string = utils.bugColors["NONE"];
        $(`#${this.id}-top-indicator-pointer`).css({ "border-bottom": `2px solid ${color}`, "border-right": `2px solid ${color}` });
        $(`#${this.id}-top-indicator-box`).css({ "border": `2px solid ${color}` });
    }
    /**
     * @function <a name="setBug">setBug</a>
     * @description Sets the bug position.
     * @param info {real | Object(val: number | string, units: string, alert: string )} Bug position value. Default units is degrees.
     * @memberof module:Compass
     * @instance
     */
    setBug(info: number | ResolutionElement, opt?: { 
        wedgeConstraints?: utils.FromTo[],
        resolutionBugColor?: string,
        wedgeAperture?: number
    }): void {
        opt = opt || {};
        if (info !== null && info !== undefined) {
            const d: number = (typeof info === "object") ? +info.preferred_resolution?.valunit?.val : info;
            const c: string = opt.resolutionBugColor ? opt.resolutionBugColor
                                : (typeof info === "object") ? utils.bugColors[`${info.preferred_resolution.region}`] : utils.bugColors["UNKNOWN"];
            this.resolutionBug.setColor(c);
            this.resolutionBug.setValue(d, {
                wedgeConstraints: opt.wedgeConstraints,
                wedgeTurning: (typeof info === "object") ? 
                    (info.flags && info.flags["preferred"]) ? "right" : "left"
                        : "right",
                wedgeAperture: opt.wedgeAperture
            });
            // if (typeof info === "object" && info.ownship && info.ownship.alert) {
            //     this.setIndicatorColor(utils.bugColors[info.ownship.alert]);
            // }
        } else {
            this.hideBug();
            // this.resetIndicatorColor();
        }
    }
    hideBug(): void {
        this.resolutionBug.hide();
        this.resetIndicatorColor();
    }
    /**
     * Utility function, sets max wedge aperture
     * @param aperture (deg)
     */
    setMaxWedgeAperture (aperture: number | string): void {
        this.resolutionBug.setMaxWedgeAperture(aperture);
        this.resolutionBug.refresh();
        this.draw_bands();
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
    setBands(bands: utils.Bands, opt?: { units?: string }): Compass {
        opt = opt || {};
        const normaliseCompassBand = (b: utils.FromTo[]) => {
            // normaliseRange converts range in bands to positive degrees (e.g., -10..0 becomes 350..360), and range.from is always < range.to 
            const normaliseBand = (rg: { from: number, to: number }[]) => {
                const range = [];
                if (rg) {
                    for (let i = 0; i < rg.length; i++) {
                        let from = rg[i].from;
                        const to = rg[i].to;
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
                const ans = b.map((range: utils.FromTo) => {
                    if (opt.units === "rad") {
                        // if bands are given in radiants, we need to convert to degrees
                        return { from: math.rad2deg(range.from), to: math.rad2deg(range.to) };
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
        this.resolutionBug.refresh(); // NB: the resolution bug needs to be updated before drawing bands
        this.draw_bands();
        return this;
    }
    /**
     * Utility function, draws resolution bands over the compass
     **/
    protected draw_bands () {
        let theHTML = "";
        // if wedge > 0 then band saturates red and notch is displayed on top
        // otherwise bands are displayed as usual
        const saturateRed: boolean = this.resolutionBug.getWedgeAperture() > 0
            && this.bands && this.bands.RECOVERY && this.bands.RECOVERY.length > 0;

        const drawArc = (ctx: CanvasRenderingContext2D, from: number, to: number, alert: string) => {
            ctx.beginPath();
            if (utils.bandColors[alert].style === "dash" && !saturateRed) {
                ctx.setLineDash([4, 8]);
            } else {
                ctx.setLineDash([]);
            }
            ctx.arc(this.centerX, this.centerY, this.radius, math.deg2rad(from) - Math.PI / 2, math.deg2rad(to) - Math.PI / 2); // 0 degrees in the compass is -90 degrees in the canvas
            ctx.lineWidth = (saturateRed) ? DOUBLE_STROKE : SINGLE_STROKE;
            ctx.strokeStyle = (saturateRed) ? utils.bandColors.NEAR.color : utils.bandColors[alert].color;
            ctx.stroke();
        }
        const ctx: CanvasRenderingContext2D = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const alerts: string[] = Object.keys(this.bands);
        for (let i = 0; i < alerts?.length; i++) {
            const alert: string = alerts[i];
            const arcs: utils.FromTo[] = this.bands[alert];
            const segs = [];
            // console.log(arcs);
            for (let i = 0; i < arcs.length; i++) {
                const from = arcs[i].from || 0;
                const to = arcs[i].to || 360;
                drawArc(ctx, from, to, alert);
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
        }
        $(`#${this.id}-bands`).html(theHTML);
    }
    /**
     * @function <a name="getAlert">getAlert</a>
     * @description Returns the alert indicated at a given angle on the compass.
     * @return {String} The alert type, one of "FAR", "MID", "NEAR", "RECOVERY", "UNKNOWN", "NONE"
     * @memberof module:Compass
     * @instance
     */
    getAlert(deg: number): string {
        function normalise(deg: number) {
            return (deg % 360 + 360) % 360;
        }
        function isWithinBand(b: { from: number, to: number }[]) {
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
    resetCompass (): Compass {
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
        this._update_compass({ transitionDuration: "0ms" });
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
    /**
     * Magnetic Variation (magvar)
     */
    magVar (val: number): Compass {
        this.magvar = isFinite(val) ? val : 0;
        // update compass
        this._update_compass();
        return this;
    }
    /**
     * Whether the compass is magnetic
     */
    magneticHeading (flag: boolean): Compass {
        this.magheading = !!flag;
        $(`#${this.id}-top-mag`).css("display", this.magheading ? "block" : "none");
        // update compass
        this._update_compass();
        return this;
    }
}
