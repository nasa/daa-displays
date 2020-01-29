/**
 * @module DAASpectrogram
 * @version 2018.12.01
 * @description <div style="display:flex;"><div style="width:50%;">
 *              <b>DAA Spectrogram.</b>
 *              <p>Graphics library for plotting resolution bands in a spectrogram.
 *              The x axis of the spectrogram represents the time dimension.
 *              The y axis represents the band type.</p></div>
 *              <img src="images/daa-spectrogram.png" style="margin-left:8%; max-height:207px;" alt="DAA Spectrogram"></div>
 * @example
// file index.js (to be stored in pvsio-web/examples/demos/daa-displays/)
require.config({
    paths: { 
        widgets: "../../client/app/widgets",
        text: "../../client/app/widgets/daa-displays/lib/text/text"
    }
});
require(["widgets/daa-displays/daa-sspectrogram"], function (DAASpectrogram) {
    "use strict";
    const spectrogram = new DAASpectrogram("track-bands");
    spectrogram.plot({
        ...
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
 * @date December 2018
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
import * as templates from './templates/daa-spectrogram-templates';
import { AlertElement } from '../daa-server/utils/daa-server';
import { DAAPlayer } from './daa-player';

// data is an object { width: real, height: real, length: nat }
function createGrid (data: { width: number, height: number, length: number }) {
    let barWidth = data.width / data.length;
    let grid = [];
    for (let i = 0; i < data.length; i++) {
        grid.push({
            left: i * barWidth,
            height: data.height,
            width: barWidth
        });
    }
    return grid;
}

// utility function, converts values between units
function convert (val: number, unitsFrom: string, unitsTo: string): number {
    if (unitsFrom !== unitsTo) {
        if (unitsFrom === "rad" && unitsTo === "deg") { return parseFloat(utils.rad2deg(val).toFixed(2)); }
        if (unitsFrom === "msec" && unitsTo === "knots") { return parseFloat(utils.msec2knots(val).toFixed(2)); }
        if (unitsFrom === "meters" && unitsTo === "feet") { return parseFloat(utils.meters2feet(val).toFixed(2)); }
        if (unitsFrom === "mpm" && unitsTo === "fpm 100x") { return parseFloat(utils.meters2feet(val).toFixed(2)) / 100; }
    }
    // return parseFloat(val.toFixed(2)); // [profiler] 12.7ms
    return Math.floor(val * 100) / 100; // [profiler] 0.1ms
}

export interface BandsData {
    id: string;
    bands: utils.Bands;
    step: number;
    time: string;
    units?: string;
    marker?: number;
    resolution?: number;
}
export interface AlertsData {
    id: string;
    alerts: utils.Alert[];
    step: number; 
    time: string;
}

export class DAASpectrogram {
    id: string;
    // _timeseries: any[];
    top: number;
    left: number;
    width: number;
    height: number;
    range: { from: number, to: number };
    length: number;
    units: { from: string, to: string };
    label: { top: string, left: string };
    time: { start: string, mid: string, end: string };
    div: HTMLElement;
    player: DAAPlayer;
    /**
     * @function <a name="DAASpectrogram">DAASpectrogram</a>
     * @description Constructor.
     * @param id {String} Unique plot identifier.
     * @param coords {Object} The four coordinates (top, left, width, height) of the plot, specifying
     *        the left/top corners, and the width/height of the (rectangular) widget area.
     *        Default is { top: 0, left: 0, width: 800, height: 80 }.
     * @param opt {Object} Style options defining the visual appearance of the plot.
     *          <li>range (Object({ from: real, to: real })): range of values to be plotted.</li>
     *          <li>length (nat): temporal length of the spectrogram, i.e., number of time instants represented in the spectrogram.</li>
     *          <li>parent (String): the HTML element where the plot will be appended (default is "body")</li>
     * @memberof module:DAASpectrogram
     * @instance
     */
    constructor (id: string, coords?: utils.Coords, opt?: {
        units?: string | { from: string, to: string },
        range?: { from: number, to: number },
        length?: number,
        label?: string | { top?: string, left?: string },
        time?: { start: string, mid: string, end: string },
        player?: DAAPlayer,
        parent?: string
    }) {
        opt = opt || {};
        this.id = id || "plot";
        // this._timeseries = []; // used for storing historical plot data
        coords = coords || {};
        this.top = coords.top || 0;
        this.left = coords.left || 0;
        this.width = coords.width || 800;
        this.height = coords.height || 80;
        this.range = {
            from: (opt.range && opt.range.from) ? opt.range.from : 0,
            to: (opt.range && opt.range.to) ? opt.range.to : 100
        };
        this.length = opt.length || 10;
        this.units = (opt.units) ? 
                        (typeof opt.units === "string") ? { from: opt.units, to: opt.units } : opt.units
                        : { from: "", to: "" }; // default is unitless
        this.label = (opt.label) ? { 
            top: (typeof opt.label === "string") ? opt.label : opt.label.top,
            left: (typeof opt.label === "object") ? opt.label.left : null,
        } : { top: null, left: null };
        this.time = opt.time;
        this.div = utils.createDiv(id, { parent: opt.parent, zIndex: 2, top: this.top, left: this.left });
        const theHTML = this.compileHTML();
        $(this.div).html(theHTML);
        this.player = opt.player;
    }
    protected installGotoHandler(step: number) {
        if (this.player) {
            const stepID = `${this.id}-step-${step}`;
            $(`#${stepID}`).on("click", () => {
                // @ts-ignore
                $('[data-toggle="tooltip"]').tooltip('hide');
                this.player.gotoControl(step, { updateInputs: true });
            });
            $(`#${stepID}`).css("cursor", "pointer");
        }
    }
    // utility function for compiling the HTML element of the spectrogram
    protected compileHTML () {
        const grid = createGrid({
            width: this.width, 
            height: this.height, 
            length: this.length
        });
        
        const cursorWidth: number = (this.width / this.length) - 1;
        return Handlebars.compile(templates.spectrogramTemplate)({
            id: this.id,
            zIndex: 2,
            grid: grid,
            cursor: {
                height: this.height + 25,
                width: (cursorWidth < 2) ? 2 : cursorWidth
            },
            top: this.top,
            left: this.left,
            width: this.width,
            height: this.height,
            label: this.label,
            from: this.range.from,
            to: this.range.to,
            units: this.units.to,
            markers: (this.time) ? {
                start: { label: this.time.start, left: 0 },
                mid: { label: this.time.mid, left: this.width / 2 },
                end: { label: this.time.end, left: this.width - 1 },
                top: this.height + 25
            } : null
        });
    }
    /**
     * @function <a name="setRange">setRange</a>
     * @description Defines the range of the y axis of the spectrogram.
     * @param range { from: number | string, to: number | string }
     * @memberof module:DAASpectrogram
     * @instance
     */
    setRange(range: { from: number | string, to: number | string, units: string }): DAASpectrogram {
        if (range && !isNaN(+range.from) && !isNaN(+range.to)) {
            const from: number = convert(+range.from, range.units, this.units.to);
            const to: number = convert(+range.to, range.units, this.units.to);
            this.range = { from, to };
        }
        return this;
    }
    /**
     * @function <a name="setLength">setLength</a>
     * @description Defines the temporal length of the spectrogram, i.e., the number of time instants represented in the spectrogram.
     * @param length {nat} The length of the spectrogram.
     * @memberof module:DAASpectrogram
     * @instance
     */
    setLength(length: number, time?: { start: string, mid: string, end: string }): DAASpectrogram {
        if (length) {
            this.length = length;
            this.time = time;
            const theHTML: string = this.compileHTML();
            $(this.div).html(theHTML);
        }
        return this;
    }
    plotAlerts(data: { alerts: utils.Alert[], step: number, time: string }): DAASpectrogram {
        if (data && data.alerts) {
            const stepID = `${this.id}-step-${data.step}`;
            const barWidth = this.width / this.length;
            const leftMargin = data.step * barWidth;

            if ($(`#${stepID}`).length === 0) { // profiler: 0.4ms (without optimisation 3.4ms)
                const alertTypes: { [level: string]: string } = {
                    "0": "0", // NONE
                    "1": "1", // FAR
                    "2": "2", // MID
                    "3": "3" // NEAR
                };
                const range: { from: number, to: number } = { from: 0, to: 3 };
                // this._timeseries.push(JSON.stringify(data.alerts, null, " ")); // 5.4ms
                const band_plot_data = {};
                const yScaleFactor = this.height / 3;
                let radius: number = (this.width / this.length) - 1;
                if (radius < 4) { radius = 4; } // 4px is the minimum radius
                let marginTop: number = 0;
                if (radius > yScaleFactor) {
                    // reduce radius size, otherwise it will not fit vertically
                    radius = yScaleFactor;
                } else {
                    // offset the circle, to improve visibility of the alert in the spectrogram
                    marginTop = (yScaleFactor - radius) / 2;
                }
                // data.alerts.forEach((elem: { ac: string, alert: string }) => { // 3ms
                for (let a = 0; a < data.alerts.length; a++) {
                    const elem: utils.Alert = data.alerts[a];
                    if (elem && +elem.alert > 0) {
                        band_plot_data[elem.alert] = [];
                        band_plot_data[elem.alert].push({
                            from: +elem.alert - 1,
                            to: +elem.alert,
                            color: utils.alertingColors[elem.alert].color,
                            top: (range.to - +elem.alert) * yScaleFactor,
                            height: yScaleFactor,
                            units: (typeof this.units === "string") ? this.units : this.units.to,
                            indicator: {
                                radius,
                                marginTop
                            }
                        });
                    }
                }
                // });

                const theHTML = Handlebars.compile(templates.spectrogramAlertsTemplate)({
                    id: this.id,
                    stepID: stepID,
                    zIndex: 2,
                    step: data.step,
                    time: data.time,
                    bands: band_plot_data,
                    alerts: Object.keys(band_plot_data).length ? (data && data.alerts) ? 
                        data.alerts.filter((elem: { ac: string; alert: string }) => {
                            return +elem.alert > 0;
                        }).map((elem: { ac: string; alert: string }) => {
                            return `${elem.ac} (${alertTypes[elem.alert]})`;
                        }).join("\n") : "" : null,
                    top: this.top,
                    left: leftMargin,
                    width: barWidth,
                    height: this.height + 30 // extend point-and-click area to the timeline
                });
                $(`#${stepID}`).remove();
                $(`#${this.id}-spectrogram-data`).append(theHTML);
                // @ts-ignore -- method tooltip is added by bootstrap
                // $('[data-toggle="tooltip"]').tooltip(); // this activates tooltips // 7.2ms
                $(`#${stepID}`).tooltip();
                this.installGotoHandler(data.step);
            }
            $(`#${this.id}-cursor`).css("left", leftMargin );
        }
        return this;
    }
    /**
     * @function <a name="plotBands">plotBands</a>
     * @description Plot function, for rendering resolution bands in the spectrogram.
     * @param data {Object({ bands: Object, step: nat })} Resolution bands data
     *              <li>bands: Object in the form { b1: range1, b2: range2, ... }, where b1, b2, ... are band names (e.g,. NEAR, FAR, etc) and range1, range2, ... are range objects { from: nat, to: nat }</li>
     *              <li>step: the temporal step to be plotted</li>
     * @memberof module:DAASpectrogram
     * @instance
     */
    plotBands (data: { bands: utils.Bands, step: number, time: string, units?: string, marker?: number, resolution?: number }): DAASpectrogram {
        if (data && data.bands) {
            // this._timeseries.push(data.bands);
            const band_plot_data: utils.Bands = {};
            const yScaleFactor = this.height / (this.range.to - this.range.from);
            const barWidth = this.width / this.length;
            const stepID = `${this.id}-step-${data.step}`;
            const leftMargin = data.step * barWidth;

            if ($(`#${stepID}`).length === 0) { // profiler: 0.6ms (without optimisation 14.4ms)
                const keys: string[] = Object.keys(data.bands);
                let tooltipData: { band: string, range: { from: number, to: number }}[] = [];
                for (let k = 0; k < keys.length; k++) {
                    const band: string = keys[k];
                    if (band !== "NONE") {
                        band_plot_data[band] = [];
                        const info: { from: number, to: number }[] = data.bands[band];
                        for (let i = 0; i < info.length; i++) {
                            const range: { from: number, to: number } = info[i];
                            const from = convert(range.from, this.units.from, this.units.to);
                            const to = convert(range.to, this.units.from, this.units.to);
                            const height = to - from;
                            tooltipData.push({ band, range });
                            band_plot_data[band].push({
                                from: from,
                                to: to,
                                color: utils.bandColors[band].color,
                                dash: utils.bandColors[band].style === "dash",
                                top: (this.range.to - to) * yScaleFactor,
                                height: height * yScaleFactor,
                                width: barWidth,
                                units: this.units.to
                            });
                        }
                    }
                }
                // sort tooltip data
                tooltipData = tooltipData.sort((a, b) => { // profiler: 2.1ms
                    return (a.range.from < b.range.from) ? -1 : 1;
                });
                let tooltip: string = (isFinite(data.marker)) ? 
                                        (data.units) ? `<br>OWNSHIP: ${Math.floor(data.marker * 100) / 100} ${data.units}` 
                                            : `<br>OWNSHIP: ${Math.floor(data.marker * 100) / 100}` : "";
                tooltip += (data.resolution !== null && data.resolution !== undefined && isFinite(+data.resolution)) ? 
                                (data.units) ? `<br>Resolution: ${Math.floor(data.resolution * 100) / 100} ${data.units}` 
                                    : `<br>Resolution: ${Math.floor(data.resolution * 100) / 100}` : `<br>Resolution: ${data.resolution}`;
                for (let i = 0; i < tooltipData.length; i++) {
                    tooltip += `<br>${tooltipData[i].band}: [${Math.floor(tooltipData[i].range.from * 100) / 100}, ${Math.floor(tooltipData[i].range.to * 100) / 100}]`;
                }
                
                const lineHeight: number = 4;
                const theHTML = Handlebars.compile(templates.spectrogramBandTemplate)({ 
                    id: this.id,
                    stepID: stepID,
                    zIndex: 2,
                    step: data.step,
                    time: data.time,
                    tooltip,
                    bands: (Object.keys(band_plot_data).length) ? band_plot_data : null, // we reduce the complexity of the HTML template by removing slices with no bands
                    top: this.top,
                    left: leftMargin,
                    width: barWidth,
                    height: this.height + 30, // extend click-and-point area to the timeline
                    marker: (isFinite(data.marker))? { // marker is used to represent the ownship state
                        value: data.marker,
                        top: (this.range.to - data.marker) * yScaleFactor - (lineHeight / 2),
                        height: lineHeight,
                        width: barWidth,
                        color: "white",
                        units: data.units
                    } : null,
                    resolution: (isFinite(data.resolution))? {
                        value: data.resolution,
                        top: (this.range.to - data.resolution) * yScaleFactor - (lineHeight / 2),
                        height: lineHeight,
                        width: barWidth,
                        color: "deepskyblue",
                        units: data.units
                    } : null
                });
                $(`#${stepID}`).remove(); 
                $(`#${this.id}-spectrogram-data`).append(theHTML);
                // @ts-ignore -- method tooltip is added by bootstrap
                //$('[data-toggle="tooltip"]').tooltip(); // this activates tooltips
                $(`#${stepID}`).tooltip();
                this.installGotoHandler(data.step);
            }
            $(`#${this.id}-cursor`).css("left", leftMargin );
        }
        return this;
    }
    plot (data: BandsData | AlertsData): DAASpectrogram {
        if (data) {
            if (data.id.toLocaleLowerCase() === "alerts") {
                return this.plotAlerts(<AlertsData> data);
            }
            return this.plotBands(<BandsData> data);
        }
        return this;
    }
    resetCursorPosition (): DAASpectrogram {
        $(`#${this.id}-cursor`).animate({ "left": 0 }, 500);
        return this;
    }
    revealMarker (step: number, tooltip?: string): DAASpectrogram {
        $(`#${this.id}-monitor_${step}`).css("display", "block");
        $(`#${this.id}-monitor_${step}`).attr("title", `<div>The other run indicates<br>${tooltip}</div>`)
        // @ts-ignore -- method tooltip is added by bootstrap
        $(`#${this.id}-monitor_${step}`).tooltip();
        return this;
    }
    hideMarker (i: number): DAASpectrogram {
        $(`#${this.id}-monitor_${i}`).css("display", "none");
        return this;
    }
}
