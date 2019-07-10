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
 *              <p>This implementation requires the installation of the pvsio-web toolkit 
 *              (<a href="http://www.pvsioweb.org" target=_blank>www.pvsioweb.org</a>).</p>
 *              <p>Google Chrome is recommended for correct rendering of the widget.</p></div>
 *              <img src="images/daa-airspeed-tape.png" style="margin-left:8%; max-height:250px;" alt="DAA Airspeed Tape Widget"></div>
 * @example
// file index.js (to be stored in pvsio-web/examples/demos/daa-displays/)
require.config({
    paths: { 
        widgets: "../../client/app/widgets",
        text: "../../client/app/widgets/daa-displays/lib/text/text"
    }
});
require(["widgets/daa-displays/daa-airspeed-tape"], function (AirspeedTape) {
    "use strict";
    const airSpeedTape = new AirspeedTape("airspeed", {
        top: 100, left: 100
    });
    airSpeedTape.setAirSpeed(300);
    airSpeedTape.setBands({
        RECOVERY: [ { from: 0, to: 300 } ], 
        NEAR: [ { from: 300, to: 600 } ] 
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
import * as templates from './templates/daa-airspeed-templates';

export class AirspeedTape {
    private id: string;
    private top: number;
    private left: number;
    private airspeedStep: number;
    private nAirspeedTicks: number;
    private trailerTicks: number;
    private tickHeight: number;
    private tapeLength: number;
    private zero: number;
    private bands: utils.Bands;
    private currentAirspeed: number;
    private windSpeed: number;
    private windDirection: number;
    private trueAirspeed: number;
    private div: HTMLElement;

    readonly units = {
        knots: "knots",
        msec: "msec",
        default: "knots"
    };

    // utility function for creating airspeed tick marks
    private _create_airspeed_ticks (): void {
        let ticks: { top: number, label: string }[] = [];
        const n = this.nAirspeedTicks + this.trailerTicks;
        const maxAirspeedValue = (this.nAirspeedTicks - 1) * 2 * this.airspeedStep;
        for (let i = 0; i < n; i++) {
            let tickValue: string = "";
            if (i < this.nAirspeedTicks) {
                const val = maxAirspeedValue - i * 2 * this.airspeedStep;
                if (val === 0) {
                    tickValue = "00";
                } else {
                    tickValue = val.toString();
                }
            }
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
    private _create_airspeed_spinner (): void {
        const tickHeight: number = 36;
        const base: string[] = [ "9", "8", "7", "6", "5", "4", "3", "2", "1", "0" ];
        const maxAirspeedValue: number = (this.nAirspeedTicks - 1) * this.airspeedStep;

        const reps: number = maxAirspeedValue / 10;
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
    private _draw_bands(): void {
        let theHTML = "";
        Object.keys(this.bands).forEach(alert => {
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
                color: utils.bandColors[alert].color,
                dash: utils.bandColors[alert].style === "dash"
            });
            // console.log(theHTML);
        });
        $(`#${this.id}-bands`).html(theHTML);
    }
    // utility function for updating ground speed display (if any is rendered)
    private _updateGroundSpeed(): void {
        // ground speed is obtained from airspeed and windspeed (groundspeed = currentAirspeed + windspeed)
        let gs = utils.fixed3(Math.trunc(this.currentAirspeed + this.windSpeed)); // the indicator can render only integer numbers, and they have always 3 digits
        $(`#${this.id}-ground-speed`).html(gs);
    }
    // utility function for updating true airspeed display (if any is rendered)
    private _updateTAS(): void {
        let tas = utils.fixed3(Math.trunc(this.currentAirspeed + this.windSpeed)); // FIXME: what is the formula???
        $(`#${this.id}-tas`).html(tas);
    }
    // utility function for updating wind speed and direction (if any is rendered)
    private _updateWind(): void {
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
    constructor(id: string, coords: { top?: number, left?: number }, opt?: { airspeedStep?: number, parent?: string }) {
        opt = opt || {};
        this.id = id || "daa-airspeed-tape";

        coords = coords || {};
        this.top = (isNaN(+coords.top)) ? 103 : +coords.top;
        this.left = (isNaN(+coords.left)) ? 74 : +coords.left;

        // airspeedStep is a parameter that can be specified using the options of the constructor
        this.airspeedStep = opt.airspeedStep || 20;

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
        this._create_airspeed_ticks();
        this._create_airspeed_spinner();
        this.setAirSpeed(this.currentAirspeed);
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
    setBands(bands: utils.Bands, opt?: { units?: string }): AirspeedTape {
        opt = opt || {};
        const normaliseAirspeedBand = (b: utils.FromTo[]) => {
            if (b && b.length > 0) {
                return b.map((range: utils.FromTo) => {
                    if (opt.units === "msec") {
                        // if bands are given in metres per second, we need to convert in knots
                        return { from: utils.msec2knots(range.from), to: utils.msec2knots(range.to), units: "msec" };
                    }
                    return { from: range.from, to: range.to, units: this.units.default };
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
        // console.log(this.id + "-airspeed-bands", this.bands);
        this._draw_bands();
        return this;
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
    setAirSpeed(val: number, opt?: { units?: string, transitionDuration?: string }): AirspeedTape {
        opt = opt || {};
        val = utils.limit(0, 300, "airspeed")(val); // the display range is 0..300
        this.currentAirspeed = (opt.units === "msec") ? utils.msec2knots(val) : val;

        let transitionDuration = opt.transitionDuration || "500ms";
        let spinValueTranslation = this.zero + val * this.tickHeight / this.airspeedStep;
        spinValueTranslation = (spinValueTranslation > 0) ? 0 : spinValueTranslation;
        // FIXME: the spinner position drifts at when changing zoom level --- need to understand why and fix it!
        $(`#${this.id}-spinner`).css({ "transition-duration": transitionDuration, "transform": `translateY(${spinValueTranslation}px)`});
        
        const stillDigits: number = Math.trunc(this.currentAirspeed / 10);
        const stillDigitsString: string = (stillDigits < 10) ? "0" + stillDigits : stillDigits.toString();
        $(`#${this.id}-indicator-still-digits`).html(stillDigitsString);
        // with 26 ticks, max airspeed that can be displayed is 440
        const ratio: number = 36; // px, obtained by inspecting the DOM
        const spinIndicatorValue: number = this.currentAirspeed % 10;
        const spinGroup: number = Math.trunc(this.currentAirspeed / 10);
        const reps: number = ((this.nAirspeedTicks - 1) * 2 * this.airspeedStep) / 100;
        const spinIndicatorTranslation: number = (-1 * reps * 100 * ratio / 2) + (spinGroup * ratio * 10) + spinIndicatorValue * ratio; // number of pixels necessary to reach value 0 in the spinner; this number was obtained by manually inspecting the DOM
        $(`#${this.id}-indicator-spinner`).css({ "transition-duration": "500ms", "transform": `translateY(${spinIndicatorTranslation}px)`});
        
        // ground speed and true airspeed need to be updated every time we set air speed
        this._updateGroundSpeed();
        this._updateTAS();
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
        this._updateWind();
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
        this._updateWind();
        // ground speed and true airspeed need to be updated every time wind speed changes
        this._updateGroundSpeed();
        this._updateTAS();
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
        this._create_airspeed_ticks();
        this._create_airspeed_spinner();
        this._draw_bands();
        return this.setAirSpeed(this.currentAirspeed, { transitionDuration: "0ms" });
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
}

