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

import * as InteractiveMap from './daa-displays/daa-interactive-map';
import { DAAPlayer } from './daa-displays/daa-player';
import { LLAData } from './daa-displays/utils/daa-server';

import * as utils from './daa-displays/daa-utils';

function render(data: { map: InteractiveMap, compass: Compass, airspeedTape: AirspeedTape, altitudeTape: AltitudeTape, verticalSpeedTape: VerticalSpeedTape }) {
    const daaSymbols = [ "daa-target", "daa-traffic-monitor", "daa-traffic-avoid", "daa-alert" ]; // 0..3
    const flightData: LLAData = <LLAData> playback.getCurrentFlightData();
    data.map.setPosition(flightData.ownship.s);
    data.compass.setCompass(flightData.ownship.v);
    const gs: number = Math.sqrt((+flightData.ownship.v.x * +flightData.ownship.v.x) + (+flightData.ownship.v.y * +flightData.ownship.v.y));
    data.airspeedTape.setAirSpeed(gs);
    const vs: number = +flightData.ownship.v.z / 100; // airspeed tape units is 100fpm
    data.verticalSpeedTape.setVerticalSpeed(vs);
    const alt: number = +flightData.ownship.s.alt;
    data.altitudeTape.setAltitude(alt);
    // console.log(`Flight data`, flightData);
    const bands: utils.DAABandsData = playback.getCurrentBands();
    if (bands) {
        data.compass.setBands(bands["Heading Bands"]);
        data.airspeedTape.setBands(bands["Horizontal Speed Bands"]);
        data.verticalSpeedTape.setBands(bands["Vertical Speed Bands"]);
        data.altitudeTape.setBands(bands["Altitude Bands"]);
    }
    const traffic = flightData.traffic.map((data, index) => {
        const alert: number = +bands.Alerts.alerts[index].alert;
        if (isNaN(alert)) { console.error("Something's wrong with alert bands :/"); }
        return {
            name: data.id,
            s: data.s,
            v: data.v,
            symbol: daaSymbols[alert]
        }
    });
    data.map.setTraffic(traffic);
    playback.getPlot("alerts").plotAlerts({
        alerts: bands["Alerts"],
        step: playback.getCurrentSimulationStep()
    });
    playback.getPlot("heading-bands").plot({
        bands: bands["Heading Bands"],
        units: "deg",
        step: playback.getCurrentSimulationStep()
    });
    playback.getPlot("altitude-bands").plot({
        bands: bands["Altitude Bands"],
        units: "ft",
        step: playback.getCurrentSimulationStep()
    });
    playback.getPlot("airspeed-bands").plot({
        bands: bands["Horizontal Speed Bands"],
        units: "knots",
        step: playback.getCurrentSimulationStep()
    });
    playback.getPlot("vs-bands").plot({
        bands: bands["Vertical Speed Bands"],
        units: "fpm",
        step: playback.getCurrentSimulationStep()
    });
    // console.log(`Bands`, bands);
}

// single player
const map: InteractiveMap = new InteractiveMap("map", { top: 2, left: 6}, { parent: "daa-disp" , terrain: "OpenStreetMap" });
// map heading is controlled by the compass
const compass: Compass = new Compass("compass", { top: 110, left: 215 }, { parent: "daa-disp", map: map });
// map zoom is controlled by nmiSelector
const hscale: HScale = new HScale("hscale", { top: 800, left: 13 }, { parent: "daa-disp", map: map });
const airspeedTape = new AirspeedTape("airspeed", { top: 100, left: 100 }, { parent: "daa-disp" });
const altitudeTape = new AltitudeTape("altitude", { top: 100, left: 600 }, { parent: "daa-disp" });
const verticalSpeedTape = new VerticalSpeedTape("vertical-speed", {top: 210, left: 600 }, { parent: "daa-disp", verticalSpeedRange: 2000 });
const playback: DAAPlayer = new DAAPlayer();
playback.define("step", async () => {
    render({
        map: map, compass: compass, airspeedTape: airspeedTape, 
        altitudeTape: altitudeTape, verticalSpeedTape: verticalSpeedTape
    });
});
playback.define("init", async () => {
    // compute java output
    await playback.java({
        alertingLogic: `${playback.getSelectedWellClearVersion()}.jar`, //"DAAtoPVS-1.0.1.jar",
        alertingConfig: playback.getSelectedConfiguration(),
        scenario: playback.getSelectedScenario()
    });
});
async function createPlayer() {
    playback.appendSimulationPlot({
        id: "alerts",
        width: 1100,
        label: "Alerts",
        range: { from: 1, to: 3 },
        parent: "simulation-plot"
    });
    playback.appendSimulationPlot({
        id: "heading-bands",
        top: 150,
        width: 1100,
        label: "Heading Bands",
        range: { from: 0, to: 360 },
        parent: "simulation-plot"
    });
    playback.appendSimulationPlot({
        id: "altitude-bands",
        top: 300,
        width: 1100,
        label: "Altitude Bands",
        range: { from: -200, to: 60000 },
        parent: "simulation-plot"
    });
    playback.appendSimulationPlot({
        id: "airspeed-bands",
        top: 450,
        width: 1100,
        label: "Horizontal Speeds Bands",
        range: { from: 0, to: 1000 },
        parent: "simulation-plot"
    });
    playback.appendSimulationPlot({
        id: "vs-bands",
        top: 600,
        width: 1100,
        label: "Vertical Speed Bands",
        range: { from: -10000, to: 10000 },
        parent: "simulation-plot"
    });
    playback.appendNavbar();
    playback.appendSidePanelView();
    await playback.appendWellClearVersionSelector();
    await playback.appendWellClearConfigurationSelector();
    await playback.appendSimulationControls({
        parent: "simulation-controls",
        displays: [ "daa-disp" ]
    });
    await playback.activate();
}
createPlayer();

// split view
// $('#daa-disp').css("display", "none");
// const map_left: InteractiveMap = new InteractiveMap("map-left", { top: 2, left: 6 }, { parent: "daa-disp-left" ,terrain: "OpenStreetMap" });
// const compass_left: Compass = new Compass("compass-left", { top: 110, left: 215 }, { parent: "daa-disp-left", map: map_left });
// const airspeedTape_left = new AirspeedTape("airspeed-left", { top: 100, left: 100 }, { parent: "daa-disp-left" });
// const altitudeTape_left = new AltitudeTape("altitude-left", { top: 100, left: 600 }, { parent: "daa-disp-left" });
// const verticalSpeedTape_left = new VerticalSpeedTape("vertical-speed-left", {top: 210, left: 600 }, { parent: "daa-disp-left" });

// const map_right: InteractiveMap = new InteractiveMap("map-left", { top: 2, left: 6 }, { parent: "daa-disp-right" ,terrain: "OpenStreetMap" });
// const compass_right: Compass = new Compass("compass-left", { top: 110, left: 215 }, { parent: "daa-disp-right", map: map_left });
// const airspeedTape_right = new AirspeedTape("airspeed-left", { top: 100, left: 100 }, { parent: "daa-disp-right" });
// const altitudeTape_right = new AltitudeTape("altitude-left", { top: 100, left: 600 }, { parent: "daa-disp-right" });
// const verticalSpeedTape_right = new VerticalSpeedTape("vertical-speed-left", {top: 210, left: 600 }, { parent: "daa-disp-right" });

// const playback: DAASplitView = new DAASplitView();
// playback.define("step", async () => {
//     console.log('rendering left display');
//     render({
//         map: map_left, compass: compass_left, airspeedTape: airspeedTape_left, 
//         altitudeTape: altitudeTape_left, verticalSpeedTape: verticalSpeedTape_left
//     });
//     console.log('rendering right display')
//     render({
//         map: map_right, compass: compass_right, airspeedTape: airspeedTape_right, 
//         altitudeTape: altitudeTape_right, verticalSpeedTape: verticalSpeedTape_right
//     });
// });
// playback.define("init", async () => {
//     // compute java output
//     await playback.getPlayer("left").java({
//         alertingLogic: "DAAtoPVS-1.0.1.jar",
//         alertingConfig: "WC_SC_228_nom_a.txt"
//     });
//     await playback.getPlayer("right").java({
//         alertingLogic: "DAAtoPVS-1.0.1.jar",
//         alertingConfig: "WC_SC_228_nom_b.txt"
//     });
// });
// playback.listDaaFiles().then(async (daaFiles: string[]) => {
//     console.log(`daa files`, daaFiles);
//     if (daaFiles) {
//         playback.appendSimulationControls({
//             parent: "simulation-controls",
//             scenarios: daaFiles
//         });
//         // // load files
//         // await playback.loadDaaFiles();
//         // // do one step
//         // playback.step();
//     }
// });
