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

import { InteractiveMap } from './daa-displays/daa-interactive-map';
import { DAAPlayer } from './daa-displays/daa-player';
import { LLAData, DAALosRegion } from './daa-displays/utils/daa-server';

import * as utils from './daa-displays/daa-utils';

const player: DAAPlayer = new DAAPlayer();
player.losMode();

async function render(data: { map: InteractiveMap, compass: Compass, airspeedTape: AirspeedTape, altitudeTape: AltitudeTape, verticalSpeedTape: VerticalSpeedTape }) {
    const daaSymbols = [ "daa-target", "daa-traffic-monitor", "daa-traffic-avoid", "daa-alert" ]; // 0..3
    const flightData: LLAData = <LLAData> player.getCurrentFlightData();
    data.map.setOwnshipPosition(flightData.ownship.s);
    data.map.setOwnshipVelocity(flightData.ownship.v);
    if (data.compass) {
        data.compass.setCompass(flightData.ownship.v);
    }
    if (data.airspeedTape) {
        const gs: number = Math.sqrt((+flightData.ownship.v.x * +flightData.ownship.v.x) + (+flightData.ownship.v.y * +flightData.ownship.v.y));
        data.airspeedTape.setAirSpeed(gs, AirspeedTape.units.knots);
    }
    if (data.verticalSpeedTape) {
        const vs: number = +flightData.ownship.v.z / 100; // airspeed tape units is 100fpm
        data.verticalSpeedTape.setVerticalSpeed(vs);
    }
    if (data.altitudeTape) {
        const alt: number = +flightData.ownship.s.alt;
        data.altitudeTape.setAltitude(alt, AltitudeTape.units.ft);
    }
    // console.log(`Flight data`, flightData);
    const bands: utils.DAABandsData = player.getCurrentBands();
    if (bands) {
        if (data.compass) { data.compass.setBands(bands["Heading Bands"]); }
        if (data.airspeedTape) { data.airspeedTape.setBands(bands["Horizontal Speed Bands"], AirspeedTape.units.knots); }
        if (data.verticalSpeedTape) { data.verticalSpeedTape.setBands(bands["Vertical Speed Bands"]); }
        if (data.altitudeTape) { data.altitudeTape.setBands(bands["Altitude Bands"], AltitudeTape.units.ft); }
    }
    const traffic = flightData.traffic.map((data, index) => {
        const alert: number = (bands && bands.Alerts && bands.Alerts[index]) ? +bands.Alerts[index].alert : 0;
        return {
            callSign: data.id,
            s: data.s,
            v: data.v,
            symbol: daaSymbols[alert]
        };
    });
    data.map.setTraffic(traffic);

    plot(bands, player.getCurrentSimulationStep(), player.getCurrentSimulationTime());

    const los: DAALosRegion[] = player.getCurrentLoS();
    if (los) {
        data.map.setLoS(los, { nmi: 1 });
    }
    // console.log(`Bands`, bands);
}

function plot (bands: utils.DAABandsData, step: number, time: string) {
    const daaPlots: { id: string, name: string, units: string }[] = [
        { id: "heading-bands", units: "deg", name: "Heading Bands" },
        { id: "horizontal-speed-bands", units: "ft", name: "Horizontal Speed Bands" },
        { id: "vertical-speed-bands", units: "fpm", name: "Vertical Speed Bands" },
        { id: "altitude-bands", units: "ft", name: "Altitude Bands" }
    ];
    player.getPlot("alerts").plotAlerts({
        alerts: bands["Alerts"],
        step,
        time
    });
    for (let i = 0; i < daaPlots.length; i++) {
        player.getPlot(daaPlots[i].id).plotBands({
            bands: bands[daaPlots[i].name],
            step,
            time
        });
    }
}

// single player, god's view
const map: InteractiveMap = new InteractiveMap("map", { top: 2, left: 6}, { parent: "daa-disp", godsView: true, los: true, callSignVisible: true });

player.define("step", async () => {
    render({
        map: map, compass: null, airspeedTape: null, 
        altitudeTape: null, verticalSpeedTape: null
    });
});
player.define("init", async () => {
    // compute los regions
    await player.javaLoS({
        losLogic: player.getSelectedLoSVersion(),
        alertingConfig: player.getSelectedConfiguration(),
        scenario: player.getSelectedScenario()
    });
    // compute bands
    await player.exec({
        alertingLogic: player.getSelectedWellClearVersion(),
        alertingConfig: player.getSelectedConfiguration(),
        scenario: player.getSelectedScenario()
    });
    // center the map at the ownship location
    const flightData: LLAData = <LLAData> player.getCurrentFlightData();
    map.resetLoS();
    map.goTo(flightData.ownship.s);
    map.setOwnshipPosition(flightData.ownship.s);
    map.setOwnshipVelocity(flightData.ownship.v);
});
async function createPlayer() {
    player.appendSimulationPlot({
        id: "alerts",
        width: 1100,
        label: "Alerts",
        range: { from: 1, to: 3 },
        parent: "simulation-plot"
    });
    player.appendSimulationPlot({
        id: "heading-bands",
        top: 150,
        width: 1100,
        label: "Heading Bands",
        range: { from: 0, to: 360 },
        parent: "simulation-plot"
    });
    player.appendSimulationPlot({
        id: "altitude-bands",
        top: 300,
        width: 1100,
        label: "Altitude Bands",
        range: { from: -200, to: 60000 },
        parent: "simulation-plot"
    });
    player.appendSimulationPlot({
        id: "horizontal-speed-bands",
        top: 450,
        width: 1100,
        label: "Horizontal Speeds Bands",
        range: { from: 0, to: 1000 },
        parent: "simulation-plot"
    });
    player.appendSimulationPlot({
        id: "vertical-speed-bands",
        top: 600,
        width: 1100,
        label: "Vertical Speed Bands",
        range: { from: -10000, to: 10000 },
        parent: "simulation-plot"
    });
    player.appendNavbar();
    player.appendSidePanelView();
    await player.appendWellClearVersionSelector();
    await player.appendWellClearConfigurationSelector();
    await player.appendSimulationControls({
        parent: "simulation-controls",
        displays: [ "daa-disp" ]
    });
    player.setSpeed(1000);
    await player.activate();
}
createPlayer();

