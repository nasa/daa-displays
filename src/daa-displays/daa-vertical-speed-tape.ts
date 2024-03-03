/**
 * @module VerticalSpeedTape
 * @version 2018.12.01
 * @description <div style="display:flex;"><div style="width:50%;">
 *              <b>Vertical speed tape widget.</b>
 *              <p>This display uses a linear gauge.
 *              A graduated string shows the range of possible vertical speeds.
 *              An indicator on the tape points to the current vertical speed and moves up/down when the value change
 *              The tape unit is 100 feet per minute.</p>
 *              <p>This implementation requires the installation of the pvsio-web toolkit 
 *              (<a href="http://www.pvsioweb.org" target=_blank>www.pvsioweb.org</a>).</p>
 *              <p>Google Chrome is recommended for correct rendering of the widget.</p></div>
 *              <img src="images/daa-vertical-speed-tape.png" style="margin-left:8%; max-height:250px;" alt="DAA Vertical Speed Tape Widget"></div>
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
import * as conversions from './utils/daa-math';
import * as templates from './templates/daa-vertical-speed-templates';
import { ResolutionElement } from '../daa-server/utils/daa-types';

/**
 * internal class used by vertical speed tape, renders a resolution bug over the tape
 */
class SpeedBug {
    protected id: string;
    protected val: number = 0;
    protected zero: number = 0;
    protected tickHeight: number = 0;
    protected airspeedStep: number = 1;
    protected useColors: boolean = false;
    protected color: string = utils.bugColors["UNKNOWN"];
    protected tape: VerticalSpeedTape;
    protected tooltipActive: boolean = false;
    protected wedgeSide: "up" | "down" = "up";
    protected maxWedgeAperture: number = 0;
    protected wedgeAperture: number = 0;
    protected wedgeConstraints: utils.FromTo[] = null;
    // animation duration
    protected duration: number = utils.DEFAULT_INSTRUMENT_ANIMATION_DURATION;

    /**
     * @function <a name="ResolutionBug">ResolutionBug</a>
     * @description Constructor. Renders a resolution bug over a daa-airspeed-tape widget.
     * @param id {String} Unique bug identifier.
     * @param daaCompass {Object} DAA widget over which the resolution bug should be rendered.
     * @memberof module:ResolutionBug
     * @instance
     * @inner
     */
    constructor (id: string, tape: VerticalSpeedTape) {
        this.id = id;
        this.tape = tape;
    }
    /**
     * Utility function, sets the animation duration
     */
    animationDuration (sec: number): SpeedBug {
        if (sec >=0 && this.duration !== sec) {
            this.duration = sec < utils.DEFAULT_INSTRUMENT_ANIMATION_DURATION ? utils.DEFAULT_INSTRUMENT_ANIMATION_DURATION : sec;
        }
        return this;
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
     * @param fpm (real) Aperture of the wedge (in fpm)
     * @memberof module:ResolutionBug
     * @instance
     * @inner
     */
    setMaxWedgeAperture (fpm: number | string): void {
        if (isFinite(+fpm) && +fpm >= 0) {
            this.maxWedgeAperture = +fpm;
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
     * Internal function, computes the bug position in the DOM element for a given value
     */
    protected computeBugPosition (val: number): number {
        let bugPosition = this.zero;
        const verticalSpeedStep: number = this.tape.getVerticalSpeedStep();
        const tape_size: number[] = this.tape.getTapeSize();
        const range1 = verticalSpeedStep * 2;
        const range2 = range1 * 2;
        // let max = range2 * 3;
        if (val >= 0) {
            if (val <= range1) {
                bugPosition = this.zero - (val / verticalSpeedStep) * (tape_size[0] / 2); // the division by two is because the tape contains 2 ticks
            } else if (val <= range2) {
                bugPosition = 118 - ((val - verticalSpeedStep * 2) / verticalSpeedStep) * (tape_size[1] / 2);
            } else {
                bugPosition = 55 - ((val - verticalSpeedStep * 4) / verticalSpeedStep) * (tape_size[2] / 2);
            }
        } else {
            if (val >= -range1) {
                bugPosition = this.zero - (val / verticalSpeedStep) * (tape_size[0] / 2); // the division by two is because the tape contains 2 ticks
            } else if (this.val >= -range2) {
                bugPosition = 176 - ((val - verticalSpeedStep * 2) / verticalSpeedStep) * (tape_size[1] / 2);
            } else {
                bugPosition = 318 - ((val - verticalSpeedStep * 4) / verticalSpeedStep) * (tape_size[2] / 2);
            }
        }
        return bugPosition;
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

        let bugPosition: number = this.computeBugPosition(this.val);
        if (this.color === utils.bugColors["RECOVERY"] && (isNaN(opt.wedgeAperture) && this.maxWedgeAperture) || (!isNaN(opt.wedgeAperture) && opt.wedgeAperture > 0)) {
            $(`#${this.id}-notch`).css({ display: "block"});
            $(`#${this.id}-indicator`).css({ display: "none"});

            // FIXME: val is in x100fpm, and wedge aperture is in fpm -- make everything fpm
            const notchHeight: number = Math.abs(this.computeBugPosition(this.val + this.wedgeAperture / 100) - this.computeBugPosition(this.val));
            if (this.wedgeSide === "up") { bugPosition -= notchHeight; }
            $(`#${this.id}-notch`).css({ "height": notchHeight, "transition-duration": `${this.duration}s`, top: `${bugPosition}px` });

        } else {
            $(`#${this.id}-notch`).css({ display: "none"});
            $(`#${this.id}-indicator`).css({ display: "block"});

            $(`#${this.id}-indicator`).css({ "transition-duration": `${this.duration}s`, top: `${bugPosition}px` });
        }

        if (this.useColors) {
            $(`.${this.id}`).css({ "background-color": this.color });
            $(`#${this.id}-pointer`).css({ "border-bottom": `2px solid ${this.color}`, "border-right": `2px solid ${this.color}` });
            $(`#${this.id}-box`).css({ "border": `2px solid ${this.color}` });
        }

        $(`.${this.id}-tooltip`)["tooltip"]("dispose");
        if (this.tooltipActive) {
            $(`.${this.id}-tooltip`)["tooltip"]({ title: `<div>${Math.floor(this.val * 100 * 100) / 100}</div>` }).tooltip();
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
        $(`.${this.id}-tooltip`)["tooltip"]("dispose");
        if (this.tooltipActive) {
            $(`.${this.id}-tooltip`)["tooltip"]({ title: `<div>${this.val * 100}</div>` }).tooltip();
        }
    }
    disableToolTip (): void {
        this.tooltipActive = false;
        $(`.${this.id}-tooltip`)["tooltip"]("dispose");
    }
}

/**
 * Vertical speed tape class
 */
export class VerticalSpeedTape {
    protected id: string;
    protected top: number;
    protected left: number;
    protected verticalSpeedStep: number;
    protected range: { from: number, to: number } = { from: -24, to: 24 }; // x100fpm
    protected tape_size: number[];
    protected tickHeight: { r1: number, r2: number, r3: number };
    protected tapeLength: number;
    protected currentVerticalSpeed: number = 0;
    protected zero: number;
    protected bands: utils.Bands;
    protected div: HTMLElement;
    protected tapeUnits: string = VerticalSpeedTape.defaultTapeUnits;

    static readonly defaultTapeUnits: string = "fpm x100";
    static readonly defaultRange: { from: number, to: number, units: string } = { from: -24, to: 24, units: VerticalSpeedTape.defaultTapeUnits };
    protected resolutionBug: SpeedBug;
    protected speedBug: SpeedBug;

    readonly units = {
        mpm: "mpm",
        fpm: "fpm" // feet per minute
    };

    /**
     * @function <a name="VerticalSpeedTape">VerticalSpeedTape</a>
     * @description Constructor.
     * @param id {String} Unique widget identifier.
     * @param coords {Object} The four coordinates (top, left, width, height) of the widget, specifying
     *        the left/top corners, and the width/height of the (rectangular) widget area.
     *        Default is { top: 103, left: 300, width: 92, height: 432 }.
     *        FIXME: The current implementation support only a fixed size, 92x432. 
     * @param opt {Object} Style options defining the visual appearance of the widget.
     *          <li>airspeedStep (real): the airspeed step (default is 20 knots)</li>
     *          <li>parent (String): the HTML element where the display will be appended (default is "body")</li>
     * @memberof module:VerticalSpeedTape
     * @instance
     */
    constructor(id: string, coords: utils.Coords, opt?: {
        verticalSpeedRange?: number,
        parent?: string,
        maxWedgeAperture?: number
    }) {
        opt = opt || {};
        this.id = id || "daa-vertical-speed-tape";

        coords = coords || {};
        this.top = (isNaN(+coords.top)) ? 210 : +coords.top;
        this.left = (isNaN(+coords.left)) ? 981 : +coords.left;

        // step is a parameter that can be specified using the options of the constructor
        this.verticalSpeedStep = (opt.verticalSpeedRange) ? opt.verticalSpeedRange / 1000 : 0.5;

        // the following are constants, should not be modified (unless you know what you're doing!)
        this.zero = 210; // px, number of pixels necessary to reach value 0 in the spinner; this number was obtained by manually inspecting the DOM
        this.tape_size = [
            92, // px, size of the first piece of tape (i.e., that closer to 0)
            (118 - 55), // px, size of the second piece of tape
            (55 - 7) / 4 // px, size of the third piece of tape, where the scale doubles
        ];
        this.tickHeight = {
            r1: this.tape_size[0] / 2, // px
            r2: this.tape_size[1] / 2, // px
            r3: this.tape_size[2] / 2  // px
        };
        this.tapeLength = 40 * 24; //this.tickHeight * 24; // 12 positive ticks + 12 negative ticks
        this.range = VerticalSpeedTape.defaultRange;
        this.tapeUnits = VerticalSpeedTape.defaultTapeUnits;

        // create structure for storing resolution bands
        this.bands = { NONE: [], FAR: [], MID: [], NEAR: [], RECOVERY: [], UNKNOWN: [] };

        // create DOM elements
        this.div = utils.createDiv(id, { parent: opt.parent, zIndex: 2 });
        const theHTML = Handlebars.compile(templates.vspeedTemplate)({
            id: this.id,
            zIndex: 2,
            top: this.top,
            left: this.left
        });
        $(this.div).html(theHTML);
        this.resolutionBug = new SpeedBug(this.id + "-resolution-bug", this); // resolution bug
        // this.resolutionBug.setTickHeight(this.tickHeight);
        this.resolutionBug.setUseColors(true);
        this.speedBug = new SpeedBug(this.id + "-bug", this); // speed bug
        this.speedBug.setUseColors(false);
        this.speedBug.enableToolTip(true);

        this.create_vspeed_ticks();
        this.setVerticalSpeed(this.currentVerticalSpeed);

        // set position of resolution bug
        this.resolutionBug.setValue(0);
        this.resolutionBug.hide();
        this.resolutionBug.enableToolTip(true);
        this.resolutionBug.setMaxWedgeAperture(opt.maxWedgeAperture);
        this.speedBug.setValue(0);
    }
    // utility function for creating altitude tick marks
    protected create_vspeed_ticks(): void {
        const normalVS = (val: number) => {
            if (Math.trunc(val) === val) {
                // integer number
                return val.toFixed(0);
            }
            return val.toFixed(1);
        }
        $(".vspeedP1").text(normalVS(this.verticalSpeedStep * 2));
        $(".vspeedP2").text(normalVS(this.verticalSpeedStep * 4));
        $(".vspeedP3").text(normalVS(this.verticalSpeedStep * 12));
        // update bug position
        this.resolutionBug.setZero(this.zero);
        this.speedBug.setZero(this.zero);
    }
    // utility function for drawing resolution bands
    protected draw_bands(): void {
        let theHTML = "";
        const ranges = [
            { from: this.verticalSpeedStep * 4, to: this.verticalSpeedStep * 12, zero: 60, tickHeight: this.tape_size[2] / 2, tapeLength: this.tape_size[2], step: this.verticalSpeedStep },
            { from: this.verticalSpeedStep * 2, to: this.verticalSpeedStep * 4, zero: 163, tickHeight: this.tape_size[1] / 2, tapeLength: this.tape_size[1], step: this.verticalSpeedStep },
            { from: 0, to: this.verticalSpeedStep * 2, zero: 192, tickHeight: this.tape_size[0] / 2, tapeLength: this.tape_size[0], step: this.verticalSpeedStep },
            { from: -this.verticalSpeedStep * 2, to: 0, zero: 192, tickHeight: this.tape_size[0] / 2, tapeLength: this.tape_size[0], step: this.verticalSpeedStep },
            { from: -this.verticalSpeedStep * 4, to: -this.verticalSpeedStep * 2, zero: 222, tickHeight: this.tape_size[1] / 2, tapeLength: this.tape_size[1], step: this.verticalSpeedStep },
            { from: -this.verticalSpeedStep * 12, to: -this.verticalSpeedStep * 4, zero: 324, tickHeight: this.tape_size[2] / 2, tapeLength: this.tape_size[2], step: this.verticalSpeedStep }
        ];
        const moduloRange = (seg: utils.FromTo, range: { from: number, to: number }) => {
            const scaled: utils.FromTo = { from: seg.from, to: seg.to, units: seg.units };
            if (scaled.to > range.from && scaled.from <= range.to) {
                    // (scaled.from >= range.from && scaled.from <= range.to
                    //     || scaled.from <= range.from && scaled.to >= range.to)) {
                const p = (scaled.from >= range.from) ? scaled.from : range.from;
                const q = (scaled.to < range.to) ? scaled.to : range.to;
                return (p < q) ? { from: p, to: q } : { from: q, to: p };
            }
            return null;
        }
        // console.log("ranges", ranges);
        // console.log("vspeed-bands", _this.bands);
        
        // if wedge > 0 then band saturates red and notch is displayed on top
        // otherwise bands are displayed as usual
        const saturateRed: boolean = this.resolutionBug.getWedgeAperture() > 0
            && this.bands && this.bands.RECOVERY && this.bands.RECOVERY.length > 0;
        const alerts: string[] = Object.keys(this.bands);
        for (let i = 0; i < alerts?.length; i++) {
            const alert: string = alerts[i];
            const segments: utils.FromTo[] = this.bands[alert];
            if (segments.length > 0) {
                const segs = [];
                // console.log("segments", segments);
                for (let s = 0; s < segments?.length; s++) {
                // segments.forEach((segment, i) => {
                    const segment: utils.FromTo = segments[s];
                    // console.log("original segment", segments[i]);
                    for (let r = 0; r < ranges?.length; r++) {
                    // ranges.forEach((range) => {
                        const range = ranges[r];
                        const moduloSeg = moduloRange(segment, range);
                        if (moduloSeg) {
                            // console.log("moduloSeg", moduloSeg);
                            const height = (moduloSeg.to - moduloSeg.from) / this.verticalSpeedStep * range.tickHeight;
                            // console.log("height", height);
                            // place the segment in the right place on the tape
                            segs.push({
                                top: range.zero - (moduloSeg.from / range.step * range.tickHeight) - height,
                                left: 30,
                                width: 4,
                                height: height,
                                from: moduloSeg.from,
                                to: moduloSeg.to,
                                id: `vspeed-band-${alert}-${s}`
                            });
                        }           
                    }
                }
                theHTML += Handlebars.compile(templates.vspeedBandsTemplate)({
                    segments: segs,
                    color: (saturateRed) ? utils.bandColors.NEAR.color : utils.bandColors[alert].color,
                    dash: (saturateRed) ? false : utils.bandColors[alert].style === "dash"
                });
            }
            // console.log(theHTML);
        }
        $(`#${this.id}-bands`).html(theHTML);
    }
    // utility function for updating the bug position based on the current vertical speed value
    // protected update_bug(): void {
    //     let bug_position = this.zero;
    //     let range1 = this.verticalSpeedStep * 2;
    //     let range2 = range1 * 2;
    //     let max = range2 * 3;
    //     let val = utils.limit(-max,max)(this.currentVerticalSpeed);
    //     if (val >= 0) {
    //         if (val <= range1) {
    //             bug_position = this.zero - (val / this.verticalSpeedStep) * (this.tape_size[0] / 2); // the division by two is because the tape contains 2 ticks
    //         } else if (val <= range2) {
    //             bug_position = 118 - ((val - this.verticalSpeedStep * 2) / this.verticalSpeedStep) * (this.tape_size[1] / 2);
    //         } else {
    //             bug_position = 55 - ((val - this.verticalSpeedStep * 4) / this.verticalSpeedStep) * (this.tape_size[2] / 2);
    //         }
    //     } else {
    //         if (val >= -range1) {
    //             bug_position = this.zero - (val / this.verticalSpeedStep) * (this.tape_size[0] / 2); // the division by two is because the tape contains 2 ticks
    //         } else if (val >= -range2) {
    //             bug_position = 176 - ((val - this.verticalSpeedStep * 2) / this.verticalSpeedStep) * (this.tape_size[1] / 2);
    //         } else {
    //             bug_position = 318 - ((val - this.verticalSpeedStep * 4) / this.verticalSpeedStep) * (this.tape_size[2] / 2);
    //         }
    //     }
    //     $(`#${this.id}-bug`).css({ "transition-duration": ANIMATION_DURATION, top: `${bug_position}px` });
    // }
    /**
     * Utility function, sets the animation duration
     */
    animationDuration (sec: number): VerticalSpeedTape {
        this.speedBug?.animationDuration(sec);
        return this;
    }
    getVerticalSpeedStep (): number {
        return this.verticalSpeedStep;
    }
    getTapeSize (): number[] {
        return this.tape_size;
    }
    getCurrentValue (): number {
        return this.currentVerticalSpeed;
    }

    setUnits (units: string): void {
        this.tapeUnits = (units.includes("x100") || units.includes("100x")) ? units : (units + " x100"); // vspeed units should always be x100
        // update display
        $(`.vspeed-units`).val(this.tapeUnits);
    }
    defaultUnits (): void {
        this.tapeUnits = VerticalSpeedTape.defaultTapeUnits;
    }
    defaultRange(): void {
        this.setRange(VerticalSpeedTape.defaultRange);
    }
    revealUnits (): void {
        $(".vspeed-units").css("display", "block");
    }
    hideUnits (): void {
        $(".vspeed-units").css("display", "none");
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
     *                       Band range is given in 100 feet per minute.
     *                       Example bands: { RECOVERY: [ { from: 0, to: 300 } ], { NEAR: [ { from: 300, to: 600 } ] } 
     * @param opt {Object} Options:
     *             <li>units (String): "x100mpm" or "mpm 100x", indicates that resolution bands are given in 100 meters per minute.<br>
     *                                 "mpm",  indicates that resolution bands are given in meters per minute.<br>
     *                                 The widget will automatically convert the bands to 100 feet per minute. Default units is fpm.</li>
     * @memberof module:VerticalSpeedTape
     * @instance
     */
    setBands(bands: utils.Bands, opt?: { units?: string }): void {
        opt = opt || {};
        const normaliseVerticalSpeedBand = (b: utils.FromTo[]) => {
            if (b && b.length > 0) {
                return b.map((range) => {
                    const units: string = opt.units || range.units || "fpm";
                    if (units === "x100mpm" || units === "mpm 100x") {
                        // if bands are given in 100x metres per minute, we need to convert in 100x feet per minute
                        return { from: conversions.meters2feet(range.from), to: conversions.meters2feet(range.to), units };
                    } else if (units === "mpm") {
                        // if bands are given in metres per minute, we need to convert in 100x feet per minute
                        return { from: conversions.meters2feet(range.from) / 100, to: conversions.meters2feet(range.to) / 100, units };
                    } else if (units === "fpm") {
                        return { from: range.from / 100, to: range.to / 100, units };
                    }
                    return { from: range.from, to: range.to, units: range.units };
                });
            }
            return [];
        }
        this.bands.NONE = normaliseVerticalSpeedBand(bands.NONE);
        this.bands.FAR = normaliseVerticalSpeedBand(bands.FAR);
        this.bands.MID = normaliseVerticalSpeedBand(bands.MID);
        this.bands.NEAR = normaliseVerticalSpeedBand(bands.NEAR);
        this.bands.RECOVERY = normaliseVerticalSpeedBand(bands.RECOVERY);
        this.bands.UNKNOWN = normaliseVerticalSpeedBand(bands.UNKNOWN);
        // console.log(this.id + "-vspeed-bands", this.bands);
        this.resolutionBug.refresh();
        this.draw_bands();
    }
    /**
     * @function <a name="setVerticalSpeed">setVerticalSpeed</a>
     * @description Sets the vertical speed indicator to a given vertical speed value.
     * @param val {real} Vertical speed value. Default units is 100 feet per minute.
     * @memberof module:VerticalSpeedTape
     * @instance
     */
    setVerticalSpeed (val: number): void {
        // val = limit(-6, 6, "vspeed")(val);
        // set vertical speed bug
        if (!isNaN(val)) {
            this.currentVerticalSpeed = val;
            $(`#${this.id}-indicator-digits`).html(`${Math.floor(val * 100) / 100}`); // we are rendering up to 2 fractional digits
            this.speedBug.setValue(this.currentVerticalSpeed / 100); // tape scale is 100xunits
        } else {
            console.error("Warning, trying to set vertical speed with invalid value", val);
        }
    }
    /**
     * @function <a name="setBug">setBug</a>
     * @description Sets the position of the resolution bug.
     * @param val {real} Vertical speed value. Default units is 100 feet per minute.
     * @memberof module:VerticalSpeedTape
     * @instance
     */
    setBug(info: number | ResolutionElement, opt?: { wedgeAperture?: number, wedgeConstraints?: utils.FromTo[], resolutionBugColor?: string }): void {
        opt = opt || {};
        if (info !== null && info !== undefined) {
            const d: number = (typeof info === "object") ? +info.preferred_resolution?.valunit?.val : info;
            const c: string = opt.resolutionBugColor ? opt.resolutionBugColor
                                : (typeof info === "object") ? utils.bugColors[`${info.preferred_resolution.region}`] : utils.bugColors["UNKNOWN"];
            this.resolutionBug.setColor(c);
            this.resolutionBug.setValue(d / 100, {
                wedgeConstraints: opt.wedgeConstraints,
                wedgeTurning: (typeof info === "object") ? 
                    (info.flags && info.flags["preferred"]) ? "up" : "down"
                        : "up",
                wedgeAperture: opt.wedgeAperture
            }); // tape scale is 100xunits
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
    /**
     * Utility function, sets max wedge aperture
     * @param aperture (fpm)
     */
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
     * @function <a name="setStep">setStep</a>
     * @description Sets the step value for the tape display.
     * @param val {real} Step size. Default units is 100 feet per minute. Default step size is 50 feet for the first 4 ticks, then step size doubles.
     * @memberof module:VerticalSpeedTape
     * @instance
     */
    setStep(val: number): void {
        if (isNaN(val)) {
            console.error("Warning: trying to set an invalid altitude step", val);
            return;
        }
        this.verticalSpeedStep = val;
        this.create_vspeed_ticks();
        this.speedBug.setValue(this.currentVerticalSpeed);
        this.resolutionBug.refresh();
        this.draw_bands();
        this.setVerticalSpeed(this.currentVerticalSpeed);
        // return this.setVerticalSpeed(this.currentVerticalSpeed, { transitionDuration: "0ms" }); -- FIXED!
    }
    /**
     * @function <a name="getStep">getStep</a>
     * @description Returns the current step size.
     * @return {real} The current step size, in 100 feet per minute.
     * @memberof module:VerticalSpeedTape
     * @instance
     */
    getStep(): number {
        return this.verticalSpeedStep;
    }
    /**
     * @function <a name="setRange">setRange</a>
     * @description Sets the range of the tape display.
     * @memberof module:VerticalSpeedTape
     * @instance
     */
    setRange (range: { from: number | string, to: number | string, units: string }): void {
        if (range && isFinite(+range.from) && isFinite(+range.to) && +range.from < +range.to) {
            this.range = {
                from: +range.from,
                to: +range.to
            };
            if (range.units && !(range.units.includes("x100") || range.units.includes("100x"))) {
                this.range.from /= 100;
                this.range.to /= 100;
            }
            const step: number = (this.range.to - this.range.from) / 24; // 24 is the standard range with step 1
            this.setStep(step);
        } else {
            console.error("[daa-airspeed-tape] Warning: could not autoscale airspeed tape", range);
        }
    }

    showValueBox (): void {
        setTimeout(() => {
            $(`#${this.id}-indicator`).css({ "display": "block", "opacity": "0" });
            $(`#${this.id}-indicator`).animate({ "opacity": "0.8" }, 500);
        }, 500);
    }
    hideValueBox (): void {
        $(`#${this.id}-indicator`).animate({ "opacity": "0" }, 500);
        setTimeout(() => {
            $(`#${this.id}-indicator`).css({ "display": "none" });
        }, 800);
    }
}
