/**
 * @module AirspeedTape
 * @version 2018.12.01
 * @description <div style="display:flex;"><div style="width:50%;">
 *              <b>Airspeed tape widget.</b>
 *              <p>The tape display consists of a graduated linear string that
 *              scrolls vertically when the display value changes and an indicator pointing at
 *              the current value. A framed box placed next to the indicator embeds a digital
 *              display showing the current value in numeric form. A small graduated linear
 *              string is used for the least significant digit of the digital display.
 *              The tape unit is 20 knot.</p>
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
import * as templates from './templates/daa-airspeed-templates';
import * as server from '../daa-server/utils/daa-server';

// internal class, renders a resolution bug over the tape
class SpeedBug {
    protected id: string;
    protected val: number = 0;
    protected zero: number = 0;
    protected tickHeight: number = 0;
    protected airspeedStep: number = 1;
    protected useColors: boolean = false;
    protected color: string = utils.bugColors["UNKNOWN"];
    protected tooltipActive: boolean = false;
    protected wedgeSide: "up" | "down" = "up";
    protected maxWedgeAperture: number = 0;
    protected wedgeAperture: number = 0;
    protected wedgeConstraints: utils.FromTo[] = null;
    /**
     * @function <a name="ResolutionBug">ResolutionBug</a>
     * @description Constructor. Renders a resolution bug over a daa-airspeed-tape widget.
     * @param id {String} Unique bug identifier.
     * @param daaCompass {Object} DAA widget over which the resolution bug should be rendered.
     * @memberof module:ResolutionBug
     * @instance
     * @inner
     */
    constructor (id: string) {
        this.id = id;
    }
    /**
     * @function <a name="ResolutionBug_setValue">setValue</a>
     * @desc Sets the bug position to a given value.
     * @param val (real) Airspeed value
     * @memberof module:ResolutionBug
     * @instance
     * @inner
     */
    setValue(val: number | string, opt?: { wedgeAperture?: number, wedgeConstraints?: utils.FromTo[], wedgeTurning?: "up" | "down" }): void {
        this.val = +val;
        opt = opt || {};
        if (isFinite(+val)) {
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
     * @function <a name="ResolutionBug_setMaxWedgeAperture">setMaxWedgeAperture</a>
     * @desc Sets the maximum aperture of the resolution wedge.
     * @param deg (real) Aperture of the wedge (in degrees)
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
        this.useColors = true;
        this.refresh();    
    }
    resetColor(): void {
        this.color = utils.bugColors["NONE"];
        this.refresh();
    }
    getColor(): string {
        return this.color;
    }
    /**
     * @function <a name="ResolutionBug_getValue">getValue</a>
     * @desc Returns the value of the bug.
     * @return {real} Airspeed value
     * @memberof module:ResolutionBug
     * @instance
     * @inner
     */
    getValue(): number {
        return this.val;
    }
    /**
     * Internal function, updates the visual appearance of the wedge resolution
     */
    protected refreshWedge (opt?: { wedgeAperture?: number }): void {
        opt = opt || {};
        this.wedgeAperture = (!isNaN(opt.wedgeAperture)) ? opt.wedgeAperture : this.maxWedgeAperture;
        if (this.wedgeConstraints && this.wedgeConstraints.length) {
            for (let i = 0; i < this.wedgeConstraints.length; i++) {
                if (Math.round(this.val) >= Math.round(this.wedgeConstraints[i].from) 
                        && Math.round(this.val) <= Math.round(this.wedgeConstraints[i].to)) {
                    const aperture1: number = Math.abs(this.val - this.wedgeConstraints[i].from);
                    const aperture2: number = Math.abs(this.val - this.wedgeConstraints[i].to);
                    const aperture: number = (this.wedgeSide === "up")? aperture2 : aperture1;
                    if (aperture < this.wedgeAperture) {
                        this.wedgeAperture = aperture;
                    }
                }
            }
        }
    }
    /**
     * @function <a name="ResolutionBug_refresh">refresh</a>
     * @desc Triggers re-rendering of the resolution bug.
     * @memberof module:ResolutionBug
     * @instance
     * @inner
     */
    refresh(opt?: { wedgeAperture?: number }): void {
        opt = opt || {};
        this.refreshWedge(opt);

        let bugPosition: number = this.zero - this.val * this.tickHeight / this.airspeedStep;
        if (this.color === "green" && (isNaN(opt.wedgeAperture) && this.maxWedgeAperture) || (!isNaN(opt.wedgeAperture) && opt.wedgeAperture > 0)) {
            $(`#${this.id}-notch`).css({ display: "block"});
            $(`#${this.id}-indicator`).css({ display: "none"});

            const notchHeight: number = this.wedgeAperture * this.tickHeight / this.airspeedStep;
            if (this.wedgeSide === "up") { bugPosition -= notchHeight; }
            $(`#${this.id}-notch`).css({ "height": notchHeight, "transition-duration": "100ms", "transform": `translateY(${bugPosition}px)`});
        } else {
            $(`#${this.id}-notch`).css({ display: "none"});
            $(`#${this.id}-indicator`).css({ display: "block"});

            $(`#${this.id}-indicator`).css({ "transition-duration": "100ms", "transform": `translateY(${bugPosition}px)`});
        }

        if (this.useColors) {
            $(`.${this.id}`).css({ "background-color": this.color });
            $(`#${this.id}-pointer`).css({ "border-bottom": `2px solid ${this.color}`, "border-right": `2px solid ${this.color}` });
            $(`#${this.id}-box`).css({ "border": `2px solid ${this.color}` });
        }
        
        //@ts-ignore
        $(`.${this.id}-tooltip`).tooltip("dispose");
        if (this.tooltipActive) {
            //@ts-ignore
            $(`.${this.id}-tooltip`).tooltip({ title: `<div>${Math.floor(this.val * 100) / 100}</div>` }).tooltip();
        }    
    }
    reveal (flag?: boolean): void {
        if (flag === false) {
            this.hide();
        } else {
            $(`#${this.id}`).css({ "display": "block"});
        }
    }
    hide (): void {
        $(`#${this.id}`).css({ "display": "none"});
    }
    setZero (zero: number): void {
        this.zero = zero;
    }
    setTickHeight (tickHeight: number): void {
        this.tickHeight = tickHeight;
    }
    setAirspeedStep (airspeedStep: number): void {
        if (airspeedStep) {
            // airspeed step should always be != 0
            this.airspeedStep = airspeedStep;
        }
    }
    setUseColors (flag: boolean): void {
        this.useColors = flag;
    }
    enableToolTip (flag?: boolean): void {
        this.tooltipActive = (flag === false) ? flag : true;
        //@ts-ignore
        $(`.${this.id}-tooltip`).tooltip("dispose");
        if (this.tooltipActive) {
            //@ts-ignore
            $(`.${this.id}-tooltip`).tooltip({ title: `<div>${this.val}</div>` }).tooltip();
        }
    }
    disableToolTip (): void {
        this.tooltipActive = false;
        //@ts-ignore
        $(`.${this.id}-tooltip`).tooltip("dispose");
    }
}

export class AirspeedTape {
    protected id: string;
    protected top: number;
    protected left: number;
    protected airspeedStep: number;
    protected nAirspeedTicks: number;
    protected trailerTicks: number;
    protected tickHeight: number;
    protected tapeLength: number;
    protected zero: number;
    protected bands: utils.Bands;
    protected currentAirspeed: number;
    protected windSpeed: number;
    protected windDirection: number;
    protected trueAirspeed: number;
    protected div: HTMLElement;

    protected resolutionBug: SpeedBug;
    protected speedBug: SpeedBug; // this is visible when tapeCanSpin === false

    protected tapeCanSpin: boolean = true;
    protected range: { from: number, to: number };
    protected tapeUnits: string = "knots";
    static readonly defaultTapeUnits: string = "knots";
    static readonly defaultTapeStep: number = 20;

    static readonly units = {
        knots: "knots",
        msec: "msec",
        default: "knots"
    };

    static convert (val: number, unitsFrom: string, unitsTo: string): number {
        if (unitsFrom !== unitsTo) {
            if ((unitsFrom === "knot" || unitsFrom === "kn" || unitsFrom === "knots") && (unitsTo === "msec" || unitsTo === "ms" || unitsTo === "m/s")) { return parseFloat(utils.knots2msec(val).toFixed(2)); }
            if ((unitsFrom === "msec" || unitsFrom === "ms" || unitsFrom === "m/s") && (unitsTo === "knot" || unitsTo === "kn" || unitsTo === "knots")) { return parseFloat(utils.msec2knots(val).toFixed(2)) / 100; }
        }
        // return parseFloat(val.toFixed(2)); // [profiler] 12.7ms
        return Math.floor(val * 100) / 100; // [profiler] 0.1ms
    }

    setUnits (units: string): void {
        this.tapeUnits = units;
    }
    defaultUnits (): void {
        this.tapeUnits = AirspeedTape.defaultTapeUnits;
    }
    revealUnits (): void {
        $(".airspeed-units").css("display", "block");
    }
    hideUnits (): void {
        $(".airspeed-units").css("display", "none");
    }

    // utility function for creating airspeed tick marks
    protected create_airspeed_ticks (): void {
        let ticks: { top: number, label?: string, units?: string }[] = [];
        const n = this.nAirspeedTicks + this.trailerTicks;
        const maxAirspeedValue = (this.nAirspeedTicks - 1) * 2 * this.airspeedStep;
        for (let i = 0; i < n; i++) {
            let tickValue: string = "";
            if (i < this.nAirspeedTicks) {
                const val = maxAirspeedValue - i * 2 * this.airspeedStep;
                if (val === 0) {
                    tickValue = "00";
                    // update bugs
                    this.resolutionBug.setZero(this.tickHeight * 2 * i);
                    this.resolutionBug.setAirspeedStep(this.airspeedStep);
                    this.speedBug.setZero(this.tickHeight * 2 * i);
                    this.speedBug.setAirspeedStep(this.airspeedStep);
                } else {
                    tickValue = Math.round(val).toString();
                }
            }
            ticks.push({ top: this.tickHeight * 2 * i - 54, units: this.tapeUnits });
            ticks.push({ top: this.tickHeight * 2 * i, label: tickValue });
        }
        const airspeedTicks: string = Handlebars.compile(templates.airspeedTicksTemplate)({
            ticks,
            id: this.id
        });
        const airspeedValues: string = Handlebars.compile(templates.airspeedValuesTemplate)({
            ticks,
            id: this.id
        });
        $(`#${this.id}-ticks`).html(airspeedTicks);
        $(`#${this.id}-tick-values`).html(airspeedValues);
        $(`.${this.id}-rule`).each(() => {
            $(this).css("height", (n * this.tickHeight * 2) + "px");
        });
    }
    // utility function for creating airspeed spinner
    protected create_airspeed_spinner (): void {
        const tickHeight: number = 36;
        const base: string[] = [ "9", "8", "7", "6", "5", "4", "3", "2", "1", "0" ];
        const maxAirspeedValue: number = (this.nAirspeedTicks - 1) * this.airspeedStep;

        const reps: number = Math.floor(maxAirspeedValue / 10);
        let ticks: { top: number, label: string }[] = [];
        for (let i = 0; i < reps; i++) {
            for (let j = 0; j < 10; j++) {
                ticks = ticks.concat({
                    label: base[j],
                    top: tickHeight * i * 10 + tickHeight * (j + 1)
                });
            }
        }
        const spinner: string = Handlebars.compile(templates.airspeedIndicatorSpinnerTemplate)({
            ticks
        });
        $(`#${this.id}-indicator-spinner`).html(spinner);
    }
    // utility function for drawing resolution bands
    protected draw_bands(): void {
        let theHTML = "";
        // if wedge > 0 then band saturates red and notch is displayed on top
        // otherwise bands are displayed as usual
        const saturateRed: boolean = this.resolutionBug.getWedgeAperture() > 0
            && this.bands && this.bands.RECOVERY && this.bands.RECOVERY.length > 0;
        const keys: string[] = Object.keys(this.bands);
        for (let i = 0; i < keys.length; i++) {
            const alert: string = keys[i];
            const segments: utils.FromTo[] = this.bands[alert];
            // console.log(segments);
            let segs = [];
            for (let i = 0; i < segments.length; i++) {
                // compute the hight of the segment
                const height: number = (segments[i].to - segments[i].from) / this.airspeedStep * this.tickHeight;
                const zero: number = (this.nAirspeedTicks - 1) * this.tickHeight * 2;
                const offset: number = segments[i].from / this.airspeedStep * this.tickHeight;
                // place the segment in the right place on the tape
                segs.push({
                    top: zero - height - offset,
                    left: 84,
                    from: segments[i].from,
                    to: segments[i].to,
                    height: height,
                    id: `${this.id}-band-${alert}-${i}`
                });
            }
            // console.log(segs);
            theHTML += Handlebars.compile(templates.airspeedBandsTemplate)({
                segments: segs,
                color: (saturateRed) ? utils.bandColors.NEAR.color : utils.bandColors[alert].color,
                dash: (saturateRed) ? false : utils.bandColors[alert].style === "dash"
            });
            // console.log(theHTML);
        }
        $(`#${this.id}-bands`).html(theHTML);
    }
    // utility function for updating ground speed display (if any is rendered)
    protected updateGroundSpeed(): void {
        // ground speed is obtained from airspeed and windspeed (groundspeed = currentAirspeed + windspeed)
        let gs = utils.fixed3(Math.trunc(this.currentAirspeed + this.windSpeed)); // the indicator can render only integer numbers, and they have always 3 digits
        $(`#${this.id}-ground-speed`).html(gs);
    }
    // utility function for updating true airspeed display (if any is rendered)
    protected updateTAS(): void {
        let tas = utils.fixed3(Math.trunc(this.currentAirspeed + this.windSpeed)); // FIXME: what is the formula???
        $(`#${this.id}-tas`).html(tas);
    }
    // utility function for updating wind speed and direction (if any is rendered)
    protected updateWind(): void {
        $(`#${this.id}-wind-direction`).html(this.windDirection.toString());
        $(`#${this.id}-wind-speed`).html(this.windSpeed.toString());
    }

    /**
     * @function <a name="AirspeedTape">AirspeedTape</a>
     * @description Constructor.
     * @param id {String} Unique widget identifier.
     * @param coords {Object} The four coordinates (top, left, width, height) of the widget, specifying
     *        the left/top corners, and the width/height of the (rectangular) widget area.
     *        Default is { top: 103, left: 74, width: 92, height: 650 }.
     *        FIXME: The current implementation support only a fixed size, 92x650. 
     * @param opt {Object} Style options defining the visual appearance of the widget.
     *          <li>airspeedStep (real): the airspeed step (default is 20 knots)</li>
     *          <li>parent (String): the HTML element where the widget will be appended (default is "body")</li>
     * @memberof module:AirspeedTape
     * @instance
     */
    constructor(id: string, coords: { top?: number, left?: number }, opt?: { airspeedStep?: number, parent?: string, maxWedgeAperture?: number }) {
        opt = opt || {};
        this.id = id || "daa-airspeed-tape";

        coords = coords || {};
        this.top = (isNaN(+coords.top)) ? 103 : +coords.top;
        this.left = (isNaN(+coords.left)) ? 74 : +coords.left;

        // airspeedStep is a parameter that can be specified using the options of the constructor
        this.airspeedStep = opt.airspeedStep || AirspeedTape.defaultTapeStep;

        // the following are constants, should not be modified (unless you know what you're doing!)
        this.nAirspeedTicks = 26;
        this.trailerTicks = 8;
        this.tickHeight = 54; //px
        this.tapeLength = (this.nAirspeedTicks + this.trailerTicks) * this.tickHeight * 2; //px, derived by inspecting the DOM for 400 ticks + 8 trailer ticks 81px height
        this.zero = -(this.nAirspeedTicks * this.tickHeight * 2) + 408; // px, number of pixels necessary to reach value 0 in the spinner; this number was obtained by manually inspecting the DOM.

        // create structure for storing resolution bands
        this.bands = { NONE: [], FAR: [], MID: [], NEAR: [], RECOVERY: [], UNKNOWN: [] };

        // initialise airspeed and windspeed
        this.currentAirspeed = 0; // knots
        this.windSpeed = 0;
        // NOTE: groundspeed can be derived from airspeed and windspeed: groundSpeed = currentAirspeed + windspeed 
        this.windDirection = 0;
        this.trueAirspeed = 0;

        // create DOM elements
        this.div = utils.createDiv(id, { parent: opt.parent, zIndex: 2 });
        const theHTML = Handlebars.compile(templates.airspeedTemplate)({
            id: this.id,
            zIndex: 2,
            top: this.top,
            left: this.left,
            height: (this.nAirspeedTicks + this.trailerTicks) * this.tickHeight * 2
        });
        $(this.div).html(theHTML);
        this.resolutionBug = new SpeedBug(this.id + "-resolution-bug"); // resolution bug
        this.resolutionBug.setTickHeight(this.tickHeight);
        this.resolutionBug.setUseColors(true);
        this.resolutionBug.enableToolTip(true);
        this.speedBug = new SpeedBug(this.id + "-bug"); // speed bug, visible when the tape cannot spin
        this.speedBug.setTickHeight(this.tickHeight);
        this.speedBug.reveal(!this.tapeCanSpin);
        this.speedBug.enableToolTip(true);
        this.create_airspeed_ticks();
        this.create_airspeed_spinner();
        this.setAirSpeed(this.currentAirspeed, this.tapeUnits);

        // set position of resolution bug
        this.resolutionBug.setValue(0);
        this.resolutionBug.setMaxWedgeAperture(opt.maxWedgeAperture);
        this.resolutionBug.hide();
    }
    /**
     * @function <a name="getAlert">getAlert</a>
     * @description Returns the alert indicated at a given angle on the compass.
     * @return {String} The alert type, one of "FAR", "MID", "NEAR", "RECOVERY", "UNKNOWN", "NONE"
     * @memberof module:AirspeedTape
     * @instance
     */
    getAlert(val: number): string {
        function isWithinBand(b: { from: number, to: number }[]) {
            for (let i = 0; i < b.length; i++) {
                if (val >= b[i].from && val <= b[i].to) {
                    return true;
                }
            }
            return false;
        }
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
     *                       Band range is given in knots.
     *                       Example bands: { RECOVERY: [ { from: 0, to: 300 } ], { NEAR: [ { from: 300, to: 600 } ] } 
     * @param opt {Object} Options:
     *             <li>units (String): "msec", indicates that resolution bands are given in meters per seconds. 
     *                                 The widget will automatically convert the bands to knots.</li>
     * @memberof module:AirspeedTape
     * @instance
     */
    setBands(bands: utils.Bands, units: string): AirspeedTape {
        // opt = opt || {};
        const tapeUnits: string = this.tapeUnits;
        const normaliseAirspeedBand = (b: utils.FromTo[]) => {
            if (b && b.length > 0) {
                return b.map((range: utils.FromTo) => {
                    return {
                        from: AirspeedTape.convert(range.from, units, tapeUnits),
                        to: AirspeedTape.convert(range.to, units, tapeUnits),
                        units: tapeUnits
                    };
                    // if (opt.units === "msec") {
                    //     // if bands are given in metres per second, we need to convert in knots
                    //     return { from: utils.msec2knots(range.from), to: utils.msec2knots(range.to), units: "msec" };
                    // }
                    // return { from: range.from, to: range.to, units: this.units.default };
                });
            }
            return [];
        }
        this.bands.NONE = normaliseAirspeedBand(bands.NONE);
        this.bands.FAR = normaliseAirspeedBand(bands.FAR);
        this.bands.MID = normaliseAirspeedBand(bands.MID);
        this.bands.NEAR = normaliseAirspeedBand(bands.NEAR);
        this.bands.RECOVERY = normaliseAirspeedBand(bands.RECOVERY);
        this.bands.UNKNOWN = normaliseAirspeedBand(bands.UNKNOWN);
        // console.log(this.id + "-horizontal-speed-bands", this.bands);
        this.resolutionBug.refresh();
        this.draw_bands();
        return this;
    }
    protected spinTapeTo (val: number, transitionDuration: string): void {
        if (!isNaN(+val)) {
            transitionDuration = transitionDuration || "500ms";
            let spinValueTranslation = this.zero + val * this.tickHeight / this.airspeedStep;
            spinValueTranslation = (spinValueTranslation > 0) ? 0 : spinValueTranslation;
            $(`#${this.id}-spinner`).css({ "transition-duration": transitionDuration, "transform": `translateY(${spinValueTranslation}px)`});
        }
    }
    disableTapeSpinning (): void {
        this.tapeCanSpin = false;
        // move the tape to the middle of the range
        const val: number = (this.range.to - this.range.from) / 2 + this.range.from;
        this.spinTapeTo(val, "0ms");
        // remove indicator pointer
        $(`#${this.id}-indicator-pointer`).css("display", "none");
        // move indicator box to the left-top so tape display is entirely visible
        $(`#${this.id}-indicator-box`).animate({ "margin-left": "-59px" }, 500);
        setTimeout(() => {
            $(`#${this.id}-indicator-box`).animate({ "top": "0px" }, 500);
        }, 800)
        // show speed bug
        this.speedBug.setValue(this.currentAirspeed);
    }
    enableTapeSpinning (): void {
        this.tapeCanSpin = true;
        this.spinTapeTo(this.currentAirspeed, "100ms");
        $(`#${this.id}-indicator-pointer`).css("display", "block");
        // move indicator box back to its place
        $(`#${this.id}-indicator-box`).animate({ "top": "281px" }, 500); // see the DOM element in daa-airspeed-templates.ts
        setTimeout(() => {
            $(`#${this.id}-indicator-box`).animate({ "margin-left": "0px" }, 500);
        }, 800);
        // hide speed bug
        this.speedBug.hide();
        this.setIndicatorColor(this.speedBug.getColor());
    }
    /**
     * @function <a name="setBug">setBug</a>
     * @description Sets the bug position.
     * @param info {real | Object(val: number | string, units: string, alert: string )} Bug position value. Default units is degrees.
     * @memberof module:AirspeedTape
     * @instance
     */
    setBug(info: number | server.ResolutionElement, opt?: { 
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
                    (info.flags && info.flags["preferred"]) ? "up" : "down"
                        : "up",
                wedgeAperture: opt.wedgeAperture
            });
            // if (typeof info === "object" && info.ownship && info.ownship.alert) {
            //     this.setIndicatorColor(utils.bugColors[info.ownship.alert]);
            //     this.speedBug.setColor(utils.bugColors[info.ownship.alert]);
            // }
        } else {
            this.hideBug(); // resolution bug
            // this.speedBug.resetColor();
        }
    }
    hideBug(): void {
        this.resolutionBug.hide();
        this.resetIndicatorColor();
    }
    setMaxWedgeAperture (aperture: number | string): void {
        this.resolutionBug.setMaxWedgeAperture(aperture);
        this.resolutionBug.refresh();
        this.draw_bands();
    }
    setIndicatorColor (color: string): void {
        if (color) {
            $(`#${this.id}-indicator-pointer`).css({ "border-bottom": `2px solid ${color}`, "border-right": `2px solid ${color}` });
            $(`#${this.id}-indicator-box`).css({ "border": `2px solid ${color}` });
        }
    }
    resetIndicatorColor (): void {
        const color: string = utils.bugColors["NONE"];
        $(`#${this.id}-indicator-pointer`).css({ "border-bottom": `2px solid ${color}`, "border-right": `2px solid ${color}` });
        $(`#${this.id}-indicator-box`).css({ "border": `2px solid ${color}` });
    }
    /**
     * @function <a name="setAirSpeed">setAirSpeed</a>
     * @description Sets the airspeed indicator to a given airspeed value.
     * @param val {real} Airspeed value. Default units is knots.
     * @param opt {Object} Options:
     *             <li>units (String): "msec", indicates that airspeed value is given in meters per seconds. 
     *                                 The widget will automatically convert the value to knots.</li>
     *             <li>transitionDuration (string): duration of the scrolling animation of the display (default: 500ms)</li>
     * @memberof module:AirspeedTape
     * @instance
     */
    setAirSpeed(val: number, units: string, opt?: { transitionDuration?: string }): AirspeedTape {
        opt = opt || {};
        // val = utils.limit(0, 300, "airspeed")(val); // the display range is 0..300
        this.currentAirspeed = AirspeedTape.convert(val, units, this.tapeUnits);

        if (this.tapeCanSpin) {
            const transitionDuration = opt.transitionDuration || "500ms";
            this.spinTapeTo(val, transitionDuration);
            this.speedBug.hide();
        } else {
            this.speedBug.setValue(val);
        }
        
        const stillDigits: number = Math.trunc(this.currentAirspeed / 10);
        const stillDigitsString: string = (stillDigits < 10) ? "0" + stillDigits : stillDigits.toString();
        $(`#${this.id}-indicator-still-digits`).html(stillDigitsString);
        const ratio: number = 36; // px, obtained by inspecting the DOM
        const spinIndicatorValue: number = this.currentAirspeed % 10;
        const spinGroup: number = Math.trunc(this.currentAirspeed / 10);
        const reps: number = Math.floor(((this.nAirspeedTicks - 1) * 2 * this.airspeedStep) / 100);
        const spinIndicatorTranslation: number = (-1 * reps * 100 * ratio / 2) + (spinGroup * ratio * 10) + spinIndicatorValue * ratio; // number of pixels necessary to reach value 0 in the spinner; this number was obtained by manually inspecting the DOM
        $(`#${this.id}-indicator-spinner`).css({ "transition-duration": "500ms", "transform": `translateY(${spinIndicatorTranslation}px)`});
        
        // ground speed and true airspeed need to be updated every time we set air speed
        this.updateGroundSpeed();
        this.updateTAS();

        return this;
    }
    /**
     * @function <a name="getAirSpeed">getAirSpeed</a>
     * @description Returns the current airspeed value.
     * @return {real} The current airspeed value, in knots.
     * @memberof module:AirspeedTape
     * @instance
     */
    getAirSpeed(): number {
        return this.currentAirspeed;
    }
    /**
     * @function <a name="setWindDirection">setWindDirection</a>
     * @description Sets the wind direction.
     * @param deg {real} Wind direction. Default units is degrees.
     * @param opt {Object} Options:
     *             <li>units (String): "rad", indicates that wind direction is given in radians. 
     *                                 The widget will automatically convert the value to degrees</li>
     * @memberof module:AirspeedTape
     * @instance
     */
    setWindDirection(deg: number, opt?: { units?: string }): AirspeedTape {
        opt = opt || {};
        this.windDirection = (opt.units === "rad") ? utils.rad2deg(deg) : deg;
        this.updateWind();
        // do we need to update airspeed??
        // return this.setAirSpeed(this.ground_speed - ???);
        return this;
    }
    /**
     * @function <a name="setWindSpeed">setWindSpeed</a>
     * @description Sets the wind speed value.
     * @param val {real} Wind speed. Default units is knots.
     * @param opt {Object} Options:
     *             <li>units (String): "msec", indicates that wind direction is given in meters per second. 
     *                                 The widget will automatically convert the value to knots</li>
     * @memberof module:AirspeedTape
     * @instance
     */
    setWindSpeed(val: number, opt?: { units?: string }): AirspeedTape {
        opt = opt || {};
        this.windSpeed = (opt.units === "msec") ? utils.msec2knots(val) : val;
        this.updateWind();
        // ground speed and true airspeed need to be updated every time wind speed changes
        this.updateGroundSpeed();
        this.updateTAS();
        return this;
    }
    /**
     * @function <a name="setStep">setStep</a>
     * @description Sets the step value for the tape display.
     * @param val {real} Step size. Default units is knots. Default step size is 20 knots.
     * @memberof module:AirspeedTape
     * @instance
     */
    setStep(val: number): AirspeedTape {
        if (isNaN(val)) {
            console.error("Warning: trying to set an invalid airspeed step", val);
            return this;
        }
        this.airspeedStep = val;
        if (this.airspeedStep > 10) {
            // make it a round number, multiple of 10
            this.airspeedStep = Math.floor(this.airspeedStep / 10) * 10;
        } else if (this.airspeedStep < 1) {
            // make it 1
            this.airspeedStep = 1;
        }
        this.create_airspeed_ticks();
        this.create_airspeed_spinner();
        this.draw_bands();
        return this.setAirSpeed(this.currentAirspeed, this.tapeUnits, { transitionDuration: "0ms" });
    }
    /**
     * @function <a name="getStep">getStep</a>
     * @description Returns the current step size.
     * @return {real} The current step size, in knots.
     * @memberof module:AirspeedTape
     * @instance
     */
    getStep(): number {
        return this.airspeedStep;
    }
    defaultStep(): void {
        this.setStep(AirspeedTape.defaultTapeStep);
    }
    /**
     * @function <a name="setRange">setRange</a>
     * @description Sets the range of the tape display.
     * @memberof module:AirspeedTape
     * @instance
     */
    setRange (range: { from: number | string, to: number | string, units: string }): AirspeedTape {
        if (range && isFinite(+range.from) && isFinite(+range.to) && +range.from < +range.to) {
            this.range = {
                from: +range.from,
                to: +range.to
            };
            const step: number = (this.range.to - this.range.from) / 8; // the displays can show 6 labelled ticks at the same time -- we want to have all labels visible when the tape is half way through the range
            this.setStep(step);
        } else {
            console.error("[daa-airspeed-tape] Warning: could not autoscale airspeed tape", range);
        }
        return this;
    }
    /**
     * @function <a name="v2gs">v2gs</a>
     * @description Utility function, computes horizontal speed value based on a given speed vector.
     * @return {real} Airspeed value, in knots.
     * @memberof module:AirspeedTape
     */
    static v2gs(v: utils.Vector3D | server.Vector3D): number {
        if (v) {
            return Math.sqrt((+v.x * +v.x) + (+v.y * +v.y));
        }
        console.error("[daa-airspeed-tape] Warning: v2gs invoked with null data");
        return 0;
    }
}

