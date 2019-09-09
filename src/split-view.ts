/**
 * ## Notices
 * Copyright 2019 United States Government as represented by the Administrator 
 * of the National Aeronautics and Space Administration. All Rights Reserved.
 * 
 * ## Disclaimers
 * No Warranty: THE SUBJECT SOFTWARE IS PROVIDED "AS IS" WITHOUT ANY WARRANTY OF ANY KIND, 
 * EITHER EXPRESSED, IMPLIED, OR STATUTORY, INCLUDING, BUT NOT LIMITED TO, ANY WARRANTY 
 * THAT THE SUBJECT SOFTWARE WILL CONFORM TO SPECIFICATIONS, ANY IMPLIED WARRANTIES OF 
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR FREEDOM FROM INFRINGEMENT, 
 * ANY WARRANTY THAT THE SUBJECT SOFTWARE WILL BE ERROR FREE, OR ANY WARRANTY THAT 
 * DOCUMENTATION, IF PROVIDED, WILL CONFORM TO THE SUBJECT SOFTWARE. THIS AGREEMENT DOES NOT, 
 * IN ANY MANNER, CONSTITUTE AN ENDORSEMENT BY GOVERNMENT AGENCY OR ANY PRIOR RECIPIENT 
 * OF ANY RESULTS, RESULTING DESIGNS, HARDWARE, SOFTWARE PRODUCTS OR ANY OTHER APPLICATIONS 
 * RESULTING FROM USE OF THE SUBJECT SOFTWARE.  FURTHER, GOVERNMENT AGENCY DISCLAIMS 
 * ALL WARRANTIES AND LIABILITIES REGARDING THIRD-PARTY SOFTWARE, IF PRESENT IN THE 
 * ORIGINAL SOFTWARE, AND DISTRIBUTES IT "AS IS."
 * 
 * Waiver and Indemnity:  RECIPIENT AGREES TO WAIVE ANY AND ALL CLAIMS AGAINST THE 
 * UNITED STATES GOVERNMENT, ITS CONTRACTORS AND SUBCONTRACTORS, AS WELL AS ANY PRIOR 
 * RECIPIENT.  IF RECIPIENT'S USE OF THE SUBJECT SOFTWARE RESULTS IN ANY LIABILITIES, 
 * DEMANDS, DAMAGES, EXPENSES OR LOSSES ARISING FROM SUCH USE, INCLUDING ANY DAMAGES 
 * FROM PRODUCTS BASED ON, OR RESULTING FROM, RECIPIENT'S USE OF THE SUBJECT SOFTWARE, 
 * RECIPIENT SHALL INDEMNIFY AND HOLD HARMLESS THE UNITED STATES GOVERNMENT, 
 * ITS CONTRACTORS AND SUBCONTRACTORS, AS WELL AS ANY PRIOR RECIPIENT, TO THE EXTENT 
 * PERMITTED BY LAW.  RECIPIENT'S SOLE REMEDY FOR ANY SUCH MATTER SHALL BE THE IMMEDIATE, 
 * UNILATERAL TERMINATION OF THIS AGREEMENT.
 */

import { AirspeedTape } from './daa-displays/daa-airspeed-tape';
import { AltitudeTape } from './daa-displays/daa-altitude-tape';
import { VerticalSpeedTape } from './daa-displays/daa-vertical-speed-tape';
import { Compass } from './daa-displays/daa-compass';
import { HScale } from './daa-displays/daa-hscale';
import { VirtualHorizon } from './daa-displays/daa-virtual-horizon';

import { InteractiveMap } from './daa-displays/daa-interactive-map';
import { DAASplitView } from './daa-displays/daa-split-view';
import { DAAScenario, LLAData } from './daa-displays/utils/daa-server';

import * as utils from './daa-displays/daa-utils';
import { DAAPlayer } from './daa-displays/daa-player';
// import { ViewOptions } from './daa-displays/daa-view-options';

function render(playerID: string, data: { map: InteractiveMap, compass: Compass, airspeedTape: AirspeedTape, altitudeTape: AltitudeTape, verticalSpeedTape: VerticalSpeedTape }) {
    const daaSymbols = [ "daa-target", "daa-traffic-monitor", "daa-traffic-avoid", "daa-alert" ]; // 0..3
    const flightData: LLAData = <LLAData> splitView.getPlayer(playerID).getCurrentFlightData();
    data.map.setPosition(flightData.ownship.s);
    data.compass.setCompass(flightData.ownship.v);
    const gs: number = Math.sqrt((+flightData.ownship.v.x * +flightData.ownship.v.x) + (+flightData.ownship.v.y * +flightData.ownship.v.y));
    data.airspeedTape.setAirSpeed(gs);
    const vs: number = +flightData.ownship.v.z / 100; // airspeed tape units is 100fpm
    data.verticalSpeedTape.setVerticalSpeed(vs);
    const alt: number = +flightData.ownship.s.alt;
    data.altitudeTape.setAltitude(alt);
    // console.log(`Flight data`, flightData);
    const bands: utils.DAABandsData = splitView.getPlayer(playerID).getCurrentBands();
    if (bands) {
        data.compass.setBands(bands["Heading Bands"]);
        data.airspeedTape.setBands(bands["Horizontal Speed Bands"]);
        data.verticalSpeedTape.setBands(bands["Vertical Speed Bands"]);
        data.altitudeTape.setBands(bands["Altitude Bands"]);
    }
    const traffic = flightData.traffic.map((data, index) => {
        const alert: number = (bands && bands.Alerts && bands.Alerts[index]) ? +bands.Alerts[index].alert : 0;
        return {
            callSign: data.id,
            s: data.s,
            v: data.v,
            symbol: daaSymbols[alert]
        }
    }); 
    data.map.setTraffic(traffic);
    plot(playerID, bands, splitView.getCurrentSimulationStep(), splitView.getCurrentSimulationTime());
}

function plot (playerID: string, bands: utils.DAABandsData, step: number, time: string) {
    const daaPlots: { id: string, name: string, units: string }[] = [
        { id: "heading-bands", units: "deg", name: "Heading Bands" },
        { id: "airspeed-bands", units: "knot", name: "Horizontal Speed Bands" },
        { id: "vs-bands", units: "fpm", name: "Vertical Speed Bands" },
        { id: "altitude-bands", units: "ft", name: "Altitude Bands" }
    ];
    splitView.getPlayer(playerID).getPlot("alerts").plotAlerts({
        alerts: bands["Alerts"],
        step,
        time
    });
    for (let i = 0; i < daaPlots.length; i++) {
        splitView.getPlayer(playerID).getPlot(daaPlots[i].id).plotBands({
            bands: bands[daaPlots[i].name],
            step,
            time
        });
    }
}

// splitView player
const map_left: InteractiveMap = new InteractiveMap("map-left", { top: 2, left: 6}, { parent: "daa-disp-left" , terrain: "OpenStreetMap" });
// map heading is controlled by the compass
const compass_left: Compass = new Compass("compass-left", { top: 110, left: 215 }, { parent: "daa-disp-left", map: map_left });
// map zoom is controlled by nmiSelector
const hscale_left: HScale = new HScale("hscale-left", { top: 800, left: 13 }, { parent: "daa-disp-left", map: map_left });
// map view options
// const viewOptions_left: ViewOptions = new ViewOptions("view-options-left", { top: 4, left: 13 }, { parent: "daa-disp-left", compass: compass_left, map: map_left });
const airspeedTape_left: AirspeedTape = new AirspeedTape("airspeed-left", { top: 100, left: 100 }, { parent: "daa-disp-left" });
const altitudeTape_left: AltitudeTape = new AltitudeTape("altitude-left", { top: 100, left: 600 }, { parent: "daa-disp-left" });
const verticalSpeedTape_left: VerticalSpeedTape = new VerticalSpeedTape("vertical-speed-left", {top: 210, left: 600 }, { parent: "daa-disp-left", verticalSpeedRange: 2000 });

const map_right: InteractiveMap = new InteractiveMap("map-right", { top: 2, left: 6}, { parent: "daa-disp-right" , terrain: "OpenStreetMap" });
// map heading is controlled by the compass
const compass_right: Compass = new Compass("compass-right", { top: 110, left: 215 }, { parent: "daa-disp-right", map: map_right });
// map zoom is controlled by nmiSelector
const hscale_right: HScale = new HScale("hscale-right", { top: 800, left: 13 }, { parent: "daa-disp-right", map: map_right });
// map view options
// const viewOptions_right: ViewOptions = new ViewOptions("view-options-right", { top: 4, left: 13 }, { parent: "daa-disp-right", compass: compass_right, map: map_right });
const airspeedTape_right: AirspeedTape = new AirspeedTape("airspeed-right", { top: 100, left: 100 }, { parent: "daa-disp-right" });
const altitudeTape_right: AltitudeTape = new AltitudeTape("altitude-right", { top: 100, left: 600 }, { parent: "daa-disp-right" });
const verticalSpeedTape_right: VerticalSpeedTape = new VerticalSpeedTape("vertical-speed-right", {top: 210, left: 600 }, { parent: "daa-disp-right", verticalSpeedRange: 2000 });

const daaPlots: { id: string, name: string, units: string, range: { from: number, to: number } }[] = [
    { id: "heading-bands", units: "deg", name: "Heading Bands", range: { from: 0, to: 360 } },
    { id: "airspeed-bands", units: "ft", name: "Horizontal Speed Bands", range: { from: 0, to: 1000 } },
    { id: "vs-bands", units: "fpm", name: "Vertical Speed Bands", range: { from: -10000, to: 10000 } },
    { id: "altitude-bands", units: "ft", name: "Altitude Bands", range: { from: -200, to: 60000 } }
];

const bandNames: string[] = [
    "NONE",
    "FAR",
    "MID",
    "NEAR",
    "RECOVERY",
    "UNKNOWN"
];

const splitView: DAASplitView = new DAASplitView();
// -- step
splitView.getPlayer("left").define("step", async () => {
    // render left
    // await playback.getPlayer("left").render...
    render("left", {
        map: map_left, compass: compass_left, airspeedTape: airspeedTape_left, 
        altitudeTape: altitudeTape_left, verticalSpeedTape: verticalSpeedTape_left
    });
});
splitView.getPlayer("right").define("step", async () => {
    // render right
    render("right", {
        map: map_right, compass: compass_right, airspeedTape: airspeedTape_right, 
        altitudeTape: altitudeTape_right, verticalSpeedTape: verticalSpeedTape_right
    });
});
// -- plot
splitView.getPlayer("right").define("plot", async () => {
    const bandsRight: utils.DAABandsData[] = splitView.getPlayer("right").getBandsData();
    const bandsLeft: utils.DAABandsData[] = splitView.getPlayer("left").getBandsData();
    if (bandsRight) {
        return new Promise((resolve, reject) => {
            for (let step = 0; step < bandsRight.length; step++) {
                setTimeout(() => {
                    const time: string = splitView.getTimeAt(step);
                    plot("right", bandsRight[step], step, time);
                    diff(bandsLeft[step], bandsRight[step], step, time); // 3.5ms
                    // resolve when done
                    if (step === bandsRight.length - 1) {
                        resolve();
                    }
                }, 8 * step);
            }
        });
    }
    return Promise.resolve();
});
splitView.getPlayer("left").define("plot", async () => {
    const bandsData: utils.DAABandsData[] = splitView.getPlayer("left").getBandsData();
    if (bandsData) {
        return new Promise((resolve, reject) => {
            for (let i = 0; i < bandsData.length; i++) {
                setTimeout(() => {
                    plot("left", bandsData[i], i, splitView.getTimeAt(i));
                    if (i === bandsData.length - 1) {
                        resolve();
                    }
                }, 8 * i);
            }
        });
    }
    return Promise.resolve();
});
// -- diff : returns true if alerts or bands are different
function diff (bandsLeft?: utils.DAABandsData, bandsRight?: utils.DAABandsData, step?: number, time?: string): boolean {
    step = (step !== undefined) ? step : splitView.getCurrentSimulationStep();
    time = (time !== undefined) ? time : splitView.getTimeAt(step);
    bandsLeft = (bandsLeft !== undefined) ? bandsLeft : splitView.getPlayer("left").getCurrentBands();
    bandsRight =  (bandsRight !== undefined) ? bandsRight : splitView.getPlayer("right").getCurrentBands();
    let ans: boolean = false;
    if (bandsLeft && bandsRight) {
        // check alerts
        // const diffAlerts: boolean = JSON.stringify(bandsLeft[step].Alerts) !== JSON.stringify(bandsRight.Alerts); // profiler 2ms
        // if (diffAlerts) {
        let alertsR: string = "";
        if (bandsRight && bandsRight.Alerts) {
            bandsRight.Alerts.forEach(alert => {
                if (+alert.alert > 0) {
                    alertsR += `${alert.ac} [${alert.alert}]`;
                }
            });
        }
        let alertsL: string = "";
        if (bandsLeft && bandsLeft.Alerts) {
            bandsLeft.Alerts.forEach(alert => {
                if (+alert.alert > 0) {
                    alertsL += `${alert.ac} [${alert.alert}]`; 
                }
            });
        }
        if (alertsR !== alertsL) { // 0.1ms
            splitView.getPlayer("left").getPlot("alerts").revealMarker(step, `Time ${time}<br>Alerts [ ${alertsR} ]`);
            splitView.getPlayer("right").getPlot("alerts").revealMarker(step, `Time ${time}<br>Alerts [ ${alertsL} ]`);
        }
        // }
        // check bands
        for (let i = 0; i < daaPlots.length; i++) {
            const plotID: string = daaPlots[i].id;
            const plotName: string = daaPlots[i].name;
            // const diffPlot: boolean = JSON.stringify(bandsLeft[plotName]) !== JSON.stringify(bandsRight[plotName]); // profiler 7.3ms
            // if (diffPlot) {
            let bandsR: { range: { from: number, to: number }, band: string }[] = []
            let bandsL: { range: { from: number, to: number }, band: string }[] = []
            //bandNames.forEach((band: string) => { // profiler 1.4ms
            for (let b = 0; b < bandNames.length; b++) { // 0.3ms
                const band: string = bandNames[b];
                if (bandsRight[plotName][band]) {
                    bandsRight[plotName][band].forEach((range: utils.FromTo) => {
                        // bandsR += `<br>${band} [${Math.floor(range.from * 100) / 100}, ${Math.floor(range.to * 100) / 100}]`;
                        bandsR.push({ band, range: { from: Math.floor(range.from * 100) / 100, to: Math.floor(range.to * 100) / 100 } });
                    });
                }
                if (bandsLeft[plotName][band]) {
                    bandsLeft[plotName][band].forEach((range: utils.FromTo) => {
                        // bandsL += `<br>${band} [${Math.floor(range.from * 100) / 100}, ${Math.floor(range.to * 100) / 100}]`;
                        bandsL.push({ band, range: { from: Math.floor(range.from * 100) / 100, to: Math.floor(range.to * 100) / 100 } });
                    });
                }
            }
            bandsR = bandsR.sort((a, b) => {
                return (a.range.from < b.range.from) ? -1 : 1;
            });
            bandsL = bandsL.sort((a, b) => {
                return (a.range.from < b.range.from) ? -1 : 1;
            });
            let plotR: string = "";
            let plotL: string = "";
            for (let k = 0; k < bandsR.length; k++) {
                plotR += `<br>${bandsR[k].band} [${bandsR[k].range.from}, ${bandsR[k].range.to}]`;
            }
            for (let k = 0; k < bandsL.length; k++) {
                plotL += `<br>${bandsL[k].band} [${bandsL[k].range.from}, ${bandsL[k].range.to}]`;
            }
            if (plotR !== plotL) { // 1.2ms
                splitView.getPlayer("left").getPlot(plotID).revealMarker(step, `Time ${time}${plotR}`);
                splitView.getPlayer("right").getPlot(plotID).revealMarker(step, `Time ${time}${plotL}`);
            }
            // }
        }
    } else {
        // report error
        console.error("Warning: could not compute diff");
    }
    return ans;
}
splitView.define("diff", diff);
// -- init
splitView.getPlayer("left").define("init", async () => {
    // init left
    await splitView.getPlayer("left").java({
        alertingLogic: `${splitView.getPlayer("left").getSelectedWellClearVersion()}.jar`, //"DAAtoPVS-1.0.1.jar",
        alertingConfig: splitView.getPlayer("left").getSelectedConfiguration(),
        scenario: splitView.getSelectedScenario()
    });
    // viewOptions_left.applyCurrentViewOptions();
});
splitView.getPlayer("right").define("init", async () => {
    // init right
    await splitView.getPlayer("right").java({
        alertingLogic: `${splitView.getPlayer("right").getSelectedWellClearVersion()}.jar`, //"DAAtoPVS-1.0.1.jar",
        alertingConfig: splitView.getPlayer("right").getSelectedConfiguration(),
        scenario: splitView.getSelectedScenario()
    });
    // viewOptions_right.applyCurrentViewOptions();
});

async function createPlayer() {
    splitView.appendNavbar();
    splitView.appendSidePanelView();
    await splitView.appendScenarioSelector();
    await splitView.appendWellClearVersionSelector();
    await splitView.appendWellClearConfigurationSelector();
    splitView.appendSimulationControls({
        parent: "simulation-controls",
        displays: [ "daa-disp-left", "daa-disp-right" ]
    });
    splitView.appendPlotControls({
        parent: "simulation-controls",
        top: 60
    });
    splitView.getPlayer("left").appendSimulationPlot({
        id: "alerts",
        width: 1040,
        label: "Alerting",
        range: { from: 1, to: 3 },
        player: splitView,
        parent: "simulation-plot"
    });
    splitView.getPlayer("right").appendSimulationPlot({
        id: "alerts",
        left: 1200,
        width: 1040,
        label: "Alerting",
        range: { from: 1, to: 3 },
        player: splitView,
        parent: "simulation-plot"
    });
    for (let i = 0; i < daaPlots.length; i++) {
        splitView.getPlayer("left").appendSimulationPlot({
            id: daaPlots[i].id,
            top: 150 * (i + 1),
            width: 1040,
            label: daaPlots[i].name,
            range: daaPlots[i].range,
            player: splitView,
            units: `[${daaPlots[i].units}]`,
            parent: "simulation-plot"
        });
        splitView.getPlayer("right").appendSimulationPlot({
            id: daaPlots[i].id,
            top: 150 * (i + 1),
            left: 1200,
            width: 1040,
            label: daaPlots[i].name,
            range: daaPlots[i].range,
            player: splitView,
            units: `[${daaPlots[i].units}]`,
            parent: "simulation-plot"
        });    
    }
    splitView.appendActivationPanel({
        parent: "activation-controls",
        width: 1072
    });
    await splitView.activate();
}
createPlayer();
