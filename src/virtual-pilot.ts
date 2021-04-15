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
import { DAAScenario, LLAData, ScenarioData, ScenarioDataPoint } from './daa-displays/utils/daa-server';

import * as utils from './daa-displays/daa-utils';
// import { ViewOptions } from './daa-displays/daa-view-options';

function render(playerID: string, data: { map: InteractiveMap, compass: Compass, airspeedTape: AirspeedTape, altitudeTape: AltitudeTape, verticalSpeedTape: VerticalSpeedTape }) {
    const daaSymbols = [ "daa-target", "daa-traffic-monitor", "daa-traffic-avoid", "daa-alert" ]; // 0..3
    const flightData: LLAData = <LLAData> splitView.getPlayer(playerID).getCurrentFlightData();
    data.map.setPosition(flightData.ownship.s);
    data.compass.setCompass(flightData.ownship.v);
    const gs: number = Math.sqrt((+flightData.ownship.v.x * +flightData.ownship.v.x) + (+flightData.ownship.v.y * +flightData.ownship.v.y));
    data.airspeedTape.setAirSpeed(gs, AirspeedTape.units.knots);
    const vs: number = +flightData.ownship.v.z / 100; // airspeed tape units is 100fpm
    data.verticalSpeedTape.setVerticalSpeed(vs);
    const alt: number = +flightData.ownship.s.alt;
    data.altitudeTape.setAltitude(alt, AltitudeTape.units.ft);
    // console.log(`Flight data`, flightData);
    const bands: ScenarioDataPoint = splitView.getPlayer(playerID).getCurrentBands();
    if (bands) {
        data.compass.setBands(utils.bandElement2Bands(bands["Heading Bands"]));
        data.airspeedTape.setBands(utils.bandElement2Bands(bands["Horizontal Speed Bands"]), AirspeedTape.units.knots);
        data.verticalSpeedTape.setBands(utils.bandElement2Bands(bands["Vertical Speed Bands"]));
        data.altitudeTape.setBands(utils.bandElement2Bands(bands["Altitude Bands"]), AltitudeTape.units.ft);
    }
    const traffic = flightData.traffic.map((data, index) => {
        const alert_level: number = (bands?.Alerts?.alerts && bands.Alerts.alerts[index]) ? bands.Alerts.alerts[index].alert_level : 0;
        return {
            callSign: data.id,
            s: data.s,
            v: data.v,
            symbol: daaSymbols[alert_level]
        }
    }); 
    data.map.setTraffic(traffic);
    plot(playerID, bands, splitView.getCurrentSimulationStep(), splitView.getCurrentSimulationTime());
}

function plot (playerID: string, bands: ScenarioDataPoint, step: number, time: string) {
    const daaPlots: { id: string, name: string, units: string }[] = [
        { id: "heading-bands", units: "deg", name: "Heading Bands" },
        { id: "horizontal-speed-bands", units: "ft", name: "Horizontal Speed Bands" },
        { id: "vertical-speed-bands", units: "fpm", name: "Vertical Speed Bands" },
        { id: "altitude-bands", units: "ft", name: "Altitude Bands" }
    ];
    splitView.getPlayer(playerID).getPlot("alerts").plotAlerts({
        alerts: bands?.Alerts?.alerts,
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
const map_left: InteractiveMap = new InteractiveMap("map-left", { top: 2, left: 6}, { parent: "daa-disp-left" });
// map heading is controlled by the compass
const compass_left: Compass = new Compass("compass-left", { top: 110, left: 215 }, { parent: "daa-disp-left", map: map_left });
// map zoom is controlled by nmiSelector
const hscale_left: HScale = new HScale("hscale-left", { top: 800, left: 13 }, { parent: "daa-disp-left", map: map_left });
// map view options
// const viewOptions_left: ViewOptions = new ViewOptions("view-options-left", { top: 4, left: 13 }, { parent: "daa-disp-left", compass: compass_left, map: map_left });
const airspeedTape_left: AirspeedTape = new AirspeedTape("airspeed-left", { top: 100, left: 100 }, { parent: "daa-disp-left" });
const altitudeTape_left: AltitudeTape = new AltitudeTape("altitude-left", { top: 100, left: 600 }, { parent: "daa-disp-left" });
const verticalSpeedTape_left: VerticalSpeedTape = new VerticalSpeedTape("vertical-speed-left", {top: 210, left: 600 }, { parent: "daa-disp-left", verticalSpeedRange: 2000 });

const map_right: InteractiveMap = new InteractiveMap("map-right", { top: 2, left: 6}, { parent: "daa-disp-right" });
// map heading is controlled by the compass
const compass_right: Compass = new Compass("compass-right", { top: 110, left: 215 }, { parent: "daa-disp-right", map: map_right });
// map zoom is controlled by nmiSelector
const hscale_right: HScale = new HScale("hscale-right", { top: 800, left: 13 }, { parent: "daa-disp-right", map: map_right });
// map view options
// const viewOptions_right: ViewOptions = new ViewOptions("view-options-right", { top: 4, left: 13 }, { parent: "daa-disp-right", compass: compass_right, map: map_right });
const airspeedTape_right: AirspeedTape = new AirspeedTape("airspeed-right", { top: 100, left: 100 }, { parent: "daa-disp-right" });
const altitudeTape_right: AltitudeTape = new AltitudeTape("altitude-right", { top: 100, left: 600 }, { parent: "daa-disp-right" });
const verticalSpeedTape_right: VerticalSpeedTape = new VerticalSpeedTape("vertical-speed-right", {top: 210, left: 600 }, { parent: "daa-disp-right", verticalSpeedRange: 2000 });


const splitView: DAASplitView = new DAASplitView();
splitView.virtualPilotMode();

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
// -- init
splitView.getPlayer("left").define("init", async () => {
    // init left
    await splitView.getPlayer("left").javaVirtualPilot({
        virtualPilot: splitView.getPlayer("left").getSelectedLogic(),
        alertingConfig: splitView.getPlayer("left").getSelectedConfiguration(),
        scenario: splitView.getSelectedScenario(),
        wind: splitView.getSelectedWindSettings()
    });
    // viewOptions_left.applyCurrentViewOptions();
});
splitView.getPlayer("right").define("init", async () => {
    // init right
    await splitView.getPlayer("right").javaVirtualPilot({
        virtualPilot: splitView.getPlayer("right").getSelectedLogic(),
        alertingConfig: splitView.getPlayer("right").getSelectedConfiguration(),
        scenario: splitView.getSelectedScenario(),
        wind: splitView.getSelectedWindSettings()
    });
    // viewOptions_right.applyCurrentViewOptions();
});
async function createPlayer() {
    splitView.appendNavbar();
    splitView.appendSidePanelView();
    await splitView.appendWellClearVersionSelector();
    await splitView.appendWellClearConfigurationSelector();
    await splitView.appendSimulationControls({
        parent: "simulation-controls",
        displays: [ "daa-disp-left", "daa-disp-right" ]
    });
    splitView.getPlayer("left").appendSimulationPlot({
        id: "alerts",
        width: 1040,
        label: "Alerting",
        range: { from: 1, to: 3 },
        parent: "simulation-plot"
    });
    splitView.getPlayer("right").appendSimulationPlot({
        id: "alerts",
        left: 1120,
        width: 1040,
        label: "Alerting",
        range: { from: 1, to: 3 },
        parent: "simulation-plot"
    });
    splitView.getPlayer("left").appendSimulationPlot({
        id: "heading-bands",
        top: 150,
        width: 1040,
        label: "Heading Bands",
        range: { from: 0, to: 360 },
        parent: "simulation-plot"
    });
    splitView.getPlayer("right").appendSimulationPlot({
        id: "heading-bands",
        top: 150,
        left: 1120,
        width: 1040,
        label: "Heading Bands",
        range: { from: 0, to: 360 },
        parent: "simulation-plot"
    });
    splitView.getPlayer("left").appendSimulationPlot({
        id: "altitude-bands",
        top: 300,
        width: 1040,
        label: "Altitude Bands",
        range: { from: -200, to: 60000 },
        parent: "simulation-plot"
    });
    splitView.getPlayer("right").appendSimulationPlot({
        id: "altitude-bands",
        top: 300,
        left: 1120,
        width: 1040,
        label: "Altitude Bands",
        range: { from: -200, to: 60000 },
        parent: "simulation-plot"
    });
    splitView.getPlayer("left").appendSimulationPlot({
        id: "horizontal-speed-bands",
        top: 450,
        width: 1040,
        label: "Horizontal Speed  Bands",
        range: { from: 0, to: 1000 },
        parent: "simulation-plot"
    });
    splitView.getPlayer("right").appendSimulationPlot({
        id: "horizontal-speed-bands",
        top: 450,
        left: 1120,
        width: 1040,
        label: "Horizontal Speed Bands",
        range: { from: 0, to: 1000 },
        parent: "simulation-plot"
    });
    splitView.getPlayer("left").appendSimulationPlot({
        id: "vertical-speed-bands",
        top: 600,
        width: 1040,
        label: "Vertical Speed Bands",
        range: { from: -10000, to: 10000 },
        parent: "simulation-plot"
    });
    splitView.getPlayer("right").appendSimulationPlot({
        id: "vertical-speed-bands",
        top: 600,
        left: 1120,
        width: 1040,
        label: "Vertical Speed Bands",
        range: { from: -10000, to: 10000 },
        parent: "simulation-plot"
    });
    await splitView.activate();
}
createPlayer();
