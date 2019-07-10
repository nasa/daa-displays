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

export class AltitudeTape {
    private id: string;
    private top: number;
    private left: number;
    private altitudeStep: number;
    private nAltitudeTicks: number;
    private currentAltitude: number;
    private trailerTicks: number;
    private tickHeight: number;
    private tapeLength: number;
    private zero: number;
    private bands: utils.Bands;
    private div: HTMLElement;

    readonly units = {
        meters: "meters",
        m: "meters",
        feet: "feet",
        ft: "feet"
    };

    // utility function for drawing resolution bands
    private _draw_bands() {
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
    private _create_altitude_ticks () {
        let ticks: { top: number, label: string }[] = [];
        let n = this.nAltitudeTicks + this.trailerTicks;
        let maxAltitudeValue = (this.nAltitudeTicks - 1) * 2 * this.altitudeStep;
        for (let i = 0; i < n; i++) {
            let tickValue: string = "";
            if (i < this.nAltitudeTicks) {
                const val = maxAltitudeValue - i * 2 * this.altitudeStep;
                if (val === 0) {
                    tickValue = "000";
                } else {
                    tickValue = val.toString();
                }
            }
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
    private _create_altitude_spinner () {
        const tickHeight: number = 36; //px
        const base: string[] = [ "90", "80", "70", "60", "50", "40", "30", "20", "10", "00" ];
        const maxAltitudeValue: number = (this.nAltitudeTicks - 1) * 2 * this.altitudeStep;
        const reps: number = maxAltitudeValue / 100;
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
        this.altitudeStep = opt.altitudeStep || 100;

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
        this._create_altitude_ticks();
        this._create_altitude_spinner();
        this.setAltitude(this.currentAltitude, { transitionDuration: "0ms" });
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
    setBands(bands: utils.Bands, opt?: { units?: string }): AltitudeTape {
        opt = opt || {};
        function normaliseAltitudeBand(b: utils.FromTo[]) {
            if (b && b.length > 0) {
                return b.map((range: utils.FromTo) => {
                    if (opt.units === "meters") {
                        // if bands are given in metres, we need to convert in feet
                        return { from: utils.meters2feet(range.from), to: utils.meters2feet(range.to), units: "meters" };
                    }
                    return { from: range.from, to: range.to, units: range.units };
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
        this._draw_bands();
        return this;
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
    setAltitude(val: number, opt?: {
        units?: string,
        transitionDuration?: string
    }): AltitudeTape {
        opt = opt || {};
        val = (opt.units === "meters") ? utils.meters2feet(val) : val;

        val = utils.limit(-200, 60000, "altitude")(val);
        this.currentAltitude = val;

        const transitionDuration: string = opt.transitionDuration || "500ms";
        const spinValueTranslation: number = this.zero + val * this.tickHeight / this.altitudeStep;
        $(`#${this.id}-spinner`).css({ "transition-duration": transitionDuration, "transform": `translateY(${spinValueTranslation}px)`});

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
        const ratio2: number = 36; // px, obtained by inspecting the DOM
        const spinIndicatorValue: number = (val % 100) / 10;
        const spinGroup: number = Math.trunc(val / 100);
        const reps: number = ((this.nAltitudeTicks - 1) * 2 * this.altitudeStep) / 100;
        const spinIndicatorTranslation: number = (-1 * reps * 10 * ratio2) + (spinGroup * ratio2 * 10) + spinIndicatorValue * ratio2; // -287579 is the number of pixels necessary to reach value 0 in the spinner; this number was obtained by manually inspecting the DOM
        $(`#${this.id}-indicator-spinner`).css({ "transition-duration": "500ms", "transform": `translateY(${spinIndicatorTranslation}px)`});
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
        this._create_altitude_ticks();
        this._create_altitude_spinner();
        this._draw_bands();
        return this.setAltitude(this.currentAltitude, { transitionDuration: "0ms" });
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
}
