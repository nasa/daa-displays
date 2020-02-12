/**
 * @module AltitudeTape
 * @version 2018.12.01
 * @description <div style="display:flex;"><div style="width:50%;">
 *              <b>Altitude tape widget</b>
 *              <p>The tape display consists of a graduated linear string that
 *              scrolls vertically when the display value changes and an indicator pointing at
 *              the current value. A framed box placed next to the indicator embeds a digital
 *              display showing the current value in numeric form. A small graduated linear
 *              string is used for the least significant digit of the digital display.
 *              The tape unit is 100 feet.</p>
 *              <p>This implementation requires the installation of the pvsio-web toolkit 
 *              (<a href="http://www.pvsioweb.org" target=_blank>www.pvsioweb.org</a>).</p>
 *              <p>Google Chrome is recommended for correct rendering of the widget.</p></div>
 *              <img src="images/daa-altitude-tape.png" style="margin-left:8%; max-height:250px;" alt="DAA Altitude Tape Widget"></div>
 * @example
// file index.js (to be stored in pvsio-web/examples/demos/daa-displays/)
require.config({
    paths: { 
        widgets: "../../client/app/widgets",
        text: "../../client/app/widgets/daa-displays/lib/text/text"
    }
});
require(["widgets/daa-displays/daa-altitude-tape"], function (AltitudeTape) {
    "use strict";
    const altitudeTape = new AltitudeTape("altitude", {
        top: 100, left: 600
    });
    altitudeTape.setAltitude(4000);
    altitudeTape.setBands({
        RECOVERY: [ { from: 3800, to: 4000 } ], 
        NEAR: [ { from: 4000, to: 4200 } ] 
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
import * as templates from './templates/daa-altitude-templates';

// internal class, renders a resolution bug over the tape
class ResolutionBug {
    protected id: string;
    protected tape: AltitudeTape;
    protected val: number = 0;
    protected zero: number = 0;
    protected tickHeight: number = 0;
    protected altitudeStep: number = 1;
    protected useColors: boolean = false;
    protected color: string = utils.bugColors["UNKNOWN"];
    /**
     * @function <a name="ResolutionBug">ResolutionBug</a>
     * @description Constructor. Renders a resolution bug over a daa-airspeed-tape widget.
     * @param id {String} Unique bug identifier.
     * @param daaCompass {Object} DAA widget over which the resolution bug should be rendered.
     * @memberof module:ResolutionBug
     * @instance
     * @inner
     */
    constructor (id: string, tape: AltitudeTape) {
        this.id = id;
        this.tape = tape;
    }
    /**
     * @function <a name="ResolutionBug_setValue">setValue</a>
     * @desc Sets the bug position to a given value.
     * @param val (real) Airspeed value
     * @memberof module:ResolutionBug
     * @instance
     * @inner
     */
    setValue(val: number): void {
        this.val = val;
        if (isFinite(val)) {
            this.reveal();
            this.refresh();            
        } else {
            this.hide();
        }
    }
    /**
     * @function <a name="ResolutionBug_setColor">setColor</a>
     * @desc Sets the bug color.
     * @param color (string) Bug color
     * @memberof module:Compass
     * @instance
     * @inner
     */
    setColor(color: string): ResolutionBug {
        this.color = (typeof color === "string") ? color : utils.bugColors["UNKNOWN"];
        this.refresh();
        return this;          
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
     * @function <a name="ResolutionBug_refresh">refresh</a>
     * @desc Triggers re-rendering of the resolution bug.
     * @memberof module:ResolutionBug
     * @instance
     * @inner
     */
    refresh(): void {
        let bugPosition = this.zero - this.val * this.tickHeight / this.altitudeStep;
        $(`#${this.id}`).css({ "transition-duration": "100ms", "transform": `translateY(${bugPosition}px)`});
        if (this.useColors) {
            $(`.${this.id}`).css({ "background-color": this.color });
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
    setAltitudeStep (altitudeStep: number): void {
        if (altitudeStep) {
            // altitude step should always be != 0
            this.altitudeStep = altitudeStep;
        }
    }
    setUseColors (flag: boolean): void {
        this.useColors = flag;
    }
}

export class AltitudeTape {
    protected id: string;
    protected top: number;
    protected left: number;
    protected altitudeStep: number;
    protected nAltitudeTicks: number;
    protected currentAltitude: number;
    protected trailerTicks: number;
    protected tickHeight: number;
    protected tapeLength: number;
    protected zero: number;
    protected zeroPx: number = 0;
    protected bands: utils.Bands;
    protected div: HTMLElement;

    protected resolutionBug: ResolutionBug;
    protected speedBug: ResolutionBug; // this is visible when tapeCanSpin === false

    protected tapeCanSpin: boolean = true;
    protected range: { from: number, to: number };
    protected spinnerBox: boolean = true;
    protected tapeUnits: string = "feet";

    static readonly defaultTapeUnits: string = "feet";
    static readonly defaultTapeStep: number = 100;

    static readonly units = {
        meters: "meters",
        m: "meters",
        feet: "feet",
        ft: "feet"
    };

    setUnits (units: string): void {
        this.tapeUnits = units;
    }
    defaultUnits (): void {
        this.tapeUnits = AltitudeTape.defaultTapeUnits;
    }
    revealUnits (): void {
        $(".altitude-units").css("display", "block");
    }
    hideUnits (): void {
        $(".altitude-units").css("display", "none");
    }

    

    // utility function for drawing resolution bands
    protected draw_bands() {
        let theHTML = "";
        Object.keys(this.bands).forEach(alert => {
            const segments: utils.FromTo[] = this.bands[alert];
            // console.log(segments);
            let segs = [];
            for (let i = 0; i < segments.length; i++) {
                // compute the hight of the segment
                const height: number = (segments[i].to - segments[i].from) / this.altitudeStep * this.tickHeight;
                const zero: number = (this.nAltitudeTicks - 1) * this.tickHeight * 2 + this.tickHeight;
                const offset: number = segments[i].from / this.altitudeStep * this.tickHeight;
                // place the segment in the right place on the tape
                segs.push({
                    top: zero - height - offset,
                    left: 0,
                    from: segments[i].from,
                    to: segments[i].to,
                    height: height,
                    id: `${this.id}-band-${alert}-${i}`
                });
            }
            // console.log(segs);
            theHTML += Handlebars.compile(templates.altitudeBandsTemplate)({
                segments: segs,
                color: utils.bandColors[alert].color,
                dash: utils.bandColors[alert].style === "dash"
            });
            // console.log(theHTML);
        });
        $(`#${this.id}-bands`).html(theHTML);
    }
    // utility function for creating altitude tick marks
    protected create_altitude_ticks () {
        let ticks: { top: number, label?: string, units?: string }[] = [];
        let n = this.nAltitudeTicks + this.trailerTicks;
        let maxAltitudeValue = (this.nAltitudeTicks - 1) * 2 * this.altitudeStep;
        for (let i = 0; i < n; i++) {
            let tickValue: string = "";
            if (i < this.nAltitudeTicks) {
                const val = maxAltitudeValue - i * 2 * this.altitudeStep;
                if (val === 0) {
                    tickValue = "000";
                    this.zeroPx = this.tickHeight * 2 * i;
                    // update bugs
                    this.resolutionBug.setZero(this.tickHeight * 2 * i);
                    this.resolutionBug.setAltitudeStep(this.altitudeStep);
                    this.speedBug.setZero(this.tickHeight * 2 * i);
                    this.speedBug.setAltitudeStep(this.altitudeStep);
                } else {
                    tickValue = val.toString();
                }
            }
            ticks.push({ top: this.tickHeight * 2 * i - 82, units: this.tapeUnits });
            ticks.push({ top: this.tickHeight * 2 * i, label: tickValue });
        }
        const altitudeTicks: string = Handlebars.compile(templates.altitudeTicksTemplate)({
            ticks,
            id: this.id
        });
        const altitudeValues: string = Handlebars.compile(templates.altitudeValuesTemplate)({
            ticks,
            id: this.id
        });
        $(`#${this.id}-ticks`).html(altitudeTicks);
        $(`#${this.id}-tick-values`).html(altitudeValues);
        $(`.${this.id}-tape`).each(() => {
            $(this).css("height", (n * this.tickHeight * 2) + "px");
        });
    }
    // utility function for creating altiude spinner
    protected create_altitude_spinner (): boolean {
        const tickHeight: number = 36; //px
        const base: string[] = [ "90", "80", "70", "60", "50", "40", "30", "20", "10", "00" ];
        const maxAltitudeValue: number = (this.nAltitudeTicks - 1) * 2 * this.altitudeStep;
        const reps: number = Math.floor(maxAltitudeValue / 100);
        if (reps < 100) {
            let ticks: { top: number, label: string }[] = [];
            for (let i = 0; i < reps; i++) {
                for (let j = 0; j < 10; j++) {
                    ticks = ticks.concat({
                        label: base[j],
                        top: tickHeight * i * 10 + tickHeight * (j + 1)
                    });
                }
            }
            const spinner: string = Handlebars.compile(templates.altitudeIndicatorSpinnerTemplate)({
                ticks
            });
            $(`#${this.id}-indicator-spinner`).html(spinner);
            return true;
        } else {
            const spinner: string = Handlebars.compile(templates.altitudeIndicatorSpinnerTemplate)({
                ticks: [ { label: "00", top: 0 } ]
            });
            this.spinnerBox = false;
            $(`#${this.id}-indicator-spinner`).html(spinner);
        }
        return false; // could not create spinner, too many values -- need to change this and create a spinning cilinder
    }
    /**
     * @function <a name="AltitudeTape">AltitudeTape</a>
     * @description Constructor.
     * @param id {String} Unique widget identifier.
     * @param coords {Object} The four coordinates (top, left, width, height) of the widget, specifying
     *        the left/top corners, and the width/height of the (rectangular) widget area.
     *        Default is { top: 103, left: 274, width: 92, height: 650 }.
     *        FIXME: The current implementation support only a fixed size, 92x650. 
     * @param opt {Object} Style options defining the visual appearance of the widget.
     *          <li>airspeedStep (real): the airspeed step (default is 20 knots)</li>
     *          <li>parent (String): the HTML element where the widget will be appended (default is "body")</li>
     * @memberof module:AltitudeTape
     * @instance
     */
    constructor(id: string, coords: { top?: number, left?: number }, opt?: { parent?: string, altitudeStep?: number }) {
        opt = opt || {};
        this.id = id || "daa-altitude-tape";

        coords = coords || {};
        this.top = (isNaN(+coords.top)) ? 103 : +coords.top;
        this.left = (isNaN(+coords.left)) ? 274 : +coords.left;

        // altitudeStep is a parameter that can be specified using the options of the constructor
        this.altitudeStep = opt.altitudeStep || AltitudeTape.defaultTapeStep;

        // the following are constants, should not be modified (unless you know what you're doing!)
        this.nAltitudeTicks = 400;
        this.trailerTicks = 8;
        this.tickHeight = 81; //px
        this.tapeLength = (this.nAltitudeTicks + this.trailerTicks) * this.tickHeight * 2; //px, derived by inspecting the DOM for 400 ticks + 8 trailer ticks 81px height
        this.zero = -(this.nAltitudeTicks * this.tickHeight * 2) + 382; //px, number of pixels necessary to reach value 0 in the spinner; this number was obtained by manually inspecting the DOM. the offset 382 is due to the position/size of the indicator.

        // create structure for storing resolution bands
        this.bands = { NONE: [], FAR: [], MID: [], NEAR: [], RECOVERY: [], UNKNOWN: [] };
        
        // initialise altitude
        this.currentAltitude = 0; // feet

        // create DOM elements
        this.div = utils.createDiv(id, { parent: opt.parent, zIndex: 2 });
        const theHTML = Handlebars.compile(templates.altitudeTemplate)({
            id: this.id,
            zIndex: 2,
            top: this.top,
            height: (this.nAltitudeTicks + this.trailerTicks) * this.tickHeight * 2
        });
        $(this.div).html(theHTML);
        this.resolutionBug = new ResolutionBug(this.id + "-resolution-bug", this); // resolution bug
        this.resolutionBug.setTickHeight(this.tickHeight);
        this.resolutionBug.setUseColors(true);
        this.speedBug = new ResolutionBug(this.id + "-bug", this); // speed bug, visible when the tape cannot spin
        this.speedBug.setTickHeight(this.tickHeight);
        this.speedBug.reveal(this.tapeCanSpin);
        this.create_altitude_ticks();
        this.create_altitude_spinner();
        this.setAltitude(this.currentAltitude, this.tapeUnits, { transitionDuration: "0ms" });

        // set position of resolution bug
        this.resolutionBug.setValue(0);
        this.resolutionBug.hide();
    }

    /**
     * @function <a name="getAlert">getAlert</a>
     * @description Returns the alert indicated at a given angle on the compass.
     * @return {String} The alert type, one of "FAR", "MID", "NEAR", "RECOVERY", "UNKNOWN", "NONE"
     * @memberof module:AltitudeTape
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

    // utility function, converts values between units
    static convert (val: number, unitsFrom: string, unitsTo: string): number {
        if (unitsFrom !== unitsTo) {
            if ((unitsFrom === "meters" || unitsFrom === "m") && (unitsTo === "feet" || unitsTo === "ft")) { return parseFloat(utils.meters2feet(val).toFixed(2)); }
            if ((unitsFrom === "feet" || unitsFrom === "ft") && (unitsTo === "meters" || unitsTo === "m")) { return parseFloat(utils.feet2meters(val).toFixed(2)) / 100; }
        }
        // return parseFloat(val.toFixed(2)); // [profiler] 12.7ms
        return Math.floor(val * 100) / 100; // [profiler] 0.1ms
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
     *             <li>units (String): "meters", indicates that resolution bands are given in meters. 
     *                                 The widget will automatically convert the bands to feet.</li>
     * @memberof module:AltitudeTape
     * @instance
     */
    setBands(bands: utils.Bands, units: string): AltitudeTape {
        // opt = opt || {};
        const tapeUnits: string = this.tapeUnits;
        function normaliseAltitudeBand(b: utils.FromTo[]) {
            if (b && b.length > 0) {
                return b.map((range: utils.FromTo) => {
                    return {
                        from: AltitudeTape.convert(range.from, units, tapeUnits),
                        to: AltitudeTape.convert(range.to, units, tapeUnits),
                        units: tapeUnits
                    };
                    // if (opt.units === "meters") {
                    //     // if bands are given in metres, we need to convert in feet
                    //     return { from: utils.meters2feet(range.from), to: utils.meters2feet(range.to), units: "meters" };
                    // }
                    // return { from: range.from, to: range.to, units: range.units };
                });
            }
            return [];
        }
        this.bands.NONE = normaliseAltitudeBand(bands.NONE);
        this.bands.FAR = normaliseAltitudeBand(bands.FAR);
        this.bands.MID = normaliseAltitudeBand(bands.MID);
        this.bands.NEAR = normaliseAltitudeBand(bands.NEAR);
        this.bands.RECOVERY = normaliseAltitudeBand(bands.RECOVERY);
        this.bands.UNKNOWN = normaliseAltitudeBand(bands.UNKNOWN);
        // console.log(this.id + "-altitude-bands", this.bands);
        this.draw_bands();
        return this;
    }
    disableTapeSpinning (): void {
        this.tapeCanSpin = false;
        // move the tape to the middle of the range
        const val: number = (this.range.to - this.range.from) / 2 + this.range.from;
        this.spinTapeTo(val, "0ms");
        // remove indicator pointer
        $(`#${this.id}-indicator-pointer`).css("display", "none");
        // move indicator box to the left-top so tape display is entirely visible
        $(`#${this.id}-indicator-box`).animate({ "margin-left": "58px" }, 500);
        setTimeout(() => {
            $(`#${this.id}-indicator-box`).animate({ "top": "0px" }, 500);
        }, 800)
        // show speed bug
        this.speedBug.setValue(this.currentAltitude);
    }
    enableTapeSpinning (): void {
        this.tapeCanSpin = true;
        this.spinTapeTo(this.currentAltitude, "500ms");
        $(`#${this.id}-indicator-pointer`).css("display", "block");
        // move indicator box back to its place
        $(`#${this.id}-indicator-box`).animate({ "top": "281px" }, 500); // see DOM element in daa-altitude-templates.ts
        setTimeout(() => {
            $(`#${this.id}-indicator-box`).animate({ "margin-left": "0px" }, 500);
        }, 800);
        // hide speed bug
        this.speedBug.hide();
    }
    /**
     * @function <a name="setBug">setBug</a>
     * @description Sets the bug position.
     * @param info {real | Object(val: number | string, units: string )} Bug position value. Default units is degrees.
     * @memberof module:AltitudeTape
     * @instance
     */
    setBug(info: number | { val: number | string, units: string, alert: string }): void {
        if (info !== null && info !== undefined) {
            const d: number = (typeof info === "number") ? info : +info.val;
            const c: string = (typeof info === "object") ? utils.bugColors[`${info.alert}`] : utils.bugColors["UNKNOWN"];
            this.resolutionBug.setColor(c);
            this.resolutionBug.setValue(d);
        } else {
            this.resolutionBug.hide();
        }
    }
    protected spinTapeTo (val: number, transitionDuration: string): void {
        if (!isNaN(+val)) {
            transitionDuration = transitionDuration || "500ms";
            const spinValueTranslation: number = this.zero + val * this.tickHeight / this.altitudeStep;
            $(`#${this.id}-spinner`).css({ "transition-duration": transitionDuration, "transform": `translateY(${spinValueTranslation}px)`});
        }
    }
    /**
     * @function <a name="setAltitude">setAltitude</a>
     * @description Sets the altiude indicator to a given altitude value.
     * @param val {real} Altitude value. Default units is feet.
     * @param opt {Object} Options:
     *             <li>units (String): "meters", indicates that altitude value is given in meters. 
     *                                 The widget will automatically convert the value to feet.</li>
     *             <li>transitionDuration (real): duration of the scrolling animation of the display (default: 500ms)</li>
     * @memberof module:AltitudeTape
     * @instance
     */
    setAltitude(val: number, units: string, opt?: {
        transitionDuration?: string
    }): AltitudeTape {
        opt = opt || {};
        // val = utils.limit(-200, 60000, "altitude")(val);
        this.currentAltitude = AltitudeTape.convert(val, units, this.tapeUnits);

        if (this.tapeCanSpin) {
            const transitionDuration = opt.transitionDuration || "500ms";
            this.spinTapeTo(val, transitionDuration);
            this.speedBug.hide();
        } else {
            this.speedBug.setValue(val);
        }

        const firstStillDigit: number = Math.abs(Math.trunc(val / 10000) % 10);
        const secondStillDigit: number = Math.abs(Math.trunc(val / 1000) % 10);
        const thirdStillDigit: number = Math.abs(Math.trunc(val / 100) % 10);
        if (firstStillDigit === 0) {
            if (val < 0) {
                $(`#${this.id}-indicator-first-still-digit`).html("-").removeClass("green-stripes").css({ top: "0px"});
            } else {
                $(`#${this.id}-indicator-first-still-digit`).html("").addClass("green-stripes").css({ top: "28px" });
            }
        } else {
            $(`#${this.id}-indicator-first-still-digit`).html(firstStillDigit.toString()).removeClass("green-stripes").css({ top: "0px"});
        }
        $(`#${this.id}-indicator-second-still-digit`).html(secondStillDigit.toString());
        $(`#${this.id}-indicator-third-still-digit`).html(thirdStillDigit.toString());
        const spinIndicatorValue: number = Math.floor((val % 100) / 10);
        if (this.spinnerBox) {
            const ratio2: number = 36; // px, obtained by inspecting the DOM
            const spinGroup: number = Math.trunc(val / 100);
            const reps: number = Math.floor(((this.nAltitudeTicks - 1) * 2 * this.altitudeStep) / 100);
            const spinIndicatorTranslation: number = (-1 * reps * 10 * ratio2) + (spinGroup * ratio2 * 10) + spinIndicatorValue * ratio2; // -287579 is the number of pixels necessary to reach value 0 in the spinner; this number was obtained by manually inspecting the DOM
            $(`#${this.id}-indicator-spinner`).css({ "transition-duration": "500ms", "transform": `translateY(${spinIndicatorTranslation}px)`});
        } else {
            // static spinner
            const dispValue: string = (spinIndicatorValue < 10) ? `0${spinIndicatorValue}` : `${spinIndicatorValue}`;
            const spinner: string = Handlebars.compile(templates.altitudeIndicatorSpinnerTemplate)({
                ticks: [ { label: dispValue, top: 0 } ]
            });
            $(`#${this.id}-indicator-spinner`).html(spinner);
        }
        return this;
    }
    /**
     * @function <a name="setStep">setStep</a>
     * @description Sets the step value for the tape display.
     * @param val {real} Step size. Default units is feet. Default step size is 100 feet.
     * @memberof module:AltitudeTape
     * @instance
     */
    setStep(val: number): AltitudeTape {
        if (isNaN(val)) {
            console.error("Warning: trying to set an invalid altitude step", val);
            return this;
        }
        this.altitudeStep = val;
        if (this.altitudeStep > 10) {
            if (this.altitudeStep > 100) {
                if (this.altitudeStep > 1000) {
                    // make it a round number, multiple of 1000
                    this.altitudeStep = Math.floor(this.altitudeStep / 1000) * 1000;
                } else {
                    // make it a round number, multiple of 100
                    this.altitudeStep = Math.floor(this.altitudeStep / 100) * 100;
                }
            } else {
                // make it a round number, multiple of 100
                this.altitudeStep = Math.floor(this.altitudeStep / 10) * 10; 
            }
        } else if (this.altitudeStep < 1) {
            // make it 1
            this.altitudeStep = 1; 
        }
        this.create_altitude_ticks();
        this.create_altitude_spinner();
        this.draw_bands();
        return this.setAltitude(this.currentAltitude, this.tapeUnits, { transitionDuration: "0ms" });
    }
    /**
     * @function <a name="setRange">setRange</a>
     * @description Sets the range of the tape display.
     * @memberof module:AirspeedTape
     * @instance
     */
    setRange (range: { from: number | string, to: number | string, units: string }): AltitudeTape {
        if (range && !isNaN(+range.from) && !isNaN(+range.to) && +range.from < +range.to) {
            this.range = {
                from: +range.from,
                to: +range.to
            };
            const step: number = (this.range.to - this.range.from) / 6; // the displays can show 5 labelled ticks at the same time -- we want to have all labels visible when the tape is half way through the range
            this.setStep(step);
        } else {
            console.error("[daa-altitude-tape] Warning: could not autoscale altitude tape", range);
        }
        return this;
    }
    /**
     * @function <a name="getStep">getStep</a>
     * @description Returns the current step size.
     * @return {real} The current step size, in feet.
     * @memberof module:AltitudeTape
     * @instance
     */
    getStep(): number {
        return this.altitudeStep;
    }
    defaultStep(): void {
        this.setStep(AltitudeTape.defaultTapeStep);
    }
}
