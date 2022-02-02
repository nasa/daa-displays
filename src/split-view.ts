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

import { DaaSymbol, InteractiveMap } from './daa-displays/daa-interactive-map';
import { DAASplitView, parseSplitConfigInBrowser, SplitConfig } from './daa-displays/daa-split-view';
import { DaidalusBand, LLAData, Region, ScenarioDataPoint } from './daa-displays/utils/daa-server';

import * as utils from './daa-displays/daa-utils';
import * as serverInterface from './daa-server/utils/daa-server'
import { ViewOptions } from './daa-displays/daa-view-options';
import { ConfigData, ResolutionElement } from './daa-server/utils/daa-server';
import { WindIndicator } from './daa-displays/daa-wind-indicator';

/**
 * Utility function, renders the display elements
 */
function render(playerID: string, data: { 
    map: InteractiveMap, 
    compass: Compass, 
    airspeedTape: AirspeedTape, 
    altitudeTape: AltitudeTape,
    verticalSpeedTape: VerticalSpeedTape,
    windIndicator: WindIndicator
}) {
    const daaSymbols: DaaSymbol[] = [ "daa-target", "daa-traffic-monitor", "daa-traffic-avoid", "daa-alert" ]; // 0..3
    const flightData: LLAData = <LLAData> splitView.getPlayer(playerID).getCurrentFlightData();
    data.map.setPosition(flightData.ownship.s);

    const bands: ScenarioDataPoint = splitView.getPlayer(playerID).getCurrentBands();
    if (bands && !bands.Ownship) { console.warn("Warning: using ground-based data for the ownship"); }
    
    const heading: number = (bands?.Ownship?.acstate?.heading) ? +bands.Ownship.acstate.heading.val : Compass.v2deg(flightData.ownship.v);
    const airspeed: number = (bands?.Ownship?.acstate?.airspeed) ? +bands.Ownship.acstate.airspeed.val : AirspeedTape.v2gs(flightData.ownship.v);
    const vspeed: number = +flightData.ownship.v.z / 100; // airspeed tape units is 100fpm
    const alt: number = +flightData.ownship.s.alt;

    data.compass.setCompass(heading);
    data.airspeedTape.setAirSpeed(airspeed, AirspeedTape.units.knots);
    data.verticalSpeedTape.setVerticalSpeed(vspeed);
    data.altitudeTape.setAltitude(alt, AltitudeTape.units.ft);
    // console.log(`Flight data`, flightData);
    if (bands) {
        data.compass.setBands(utils.bandElement2Bands(bands["Heading Bands"]));
        data.airspeedTape.setBands(utils.bandElement2Bands(bands["Horizontal Speed Bands"]), AirspeedTape.units.knots);
        data.verticalSpeedTape.setBands(utils.bandElement2Bands(bands["Vertical Speed Bands"]));
        data.altitudeTape.setBands(utils.bandElement2Bands(bands["Altitude Bands"]), AltitudeTape.units.ft);
        // set resolutions
        data.compass.setBug(bands["Horizontal Direction Resolution"]);
        data.airspeedTape.setBug(bands["Horizontal Speed Resolution"]);
        data.altitudeTape.setBug(bands["Altitude Resolution"]);
        data.verticalSpeedTape.setBug(bands["Vertical Speed Resolution"]);
    }
    // set contours
    data.map.removeGeoFence();
    if (bands && bands.Contours && bands.Contours.data) {
        for (let i = 0; i < bands.Contours.data.length; i++) {
            if (bands.Contours.data[i].polygons) {
                for (let j = 0; j < bands.Contours.data[i].polygons.length; j++) {
                    const perimeter: serverInterface.LatLonAlt[] = bands.Contours.data[i].polygons[j];
                    if (perimeter && perimeter.length) {
                        const floor: { top: number, bottom: number } = {
                            top: +perimeter[0].alt + 20,
                            bottom: +perimeter[0].alt - 20
                        }
                        // add geofence to the map
                        data.map.addContour(`c-${bands.Contours.data[i].ac}-${i}-${j}`, perimeter, floor, {
                            showLabel: false
                        });
                    }
                }
            }
        }
    }
    // set hazard zones
    if (bands && bands["Hazard Zones"] && bands["Hazard Zones"].data) {
        for (let i = 0; i < bands["Hazard Zones"].data.length; i++) {
            if (bands["Hazard Zones"].data[i].polygons) {
                for (let j = 0; j < bands["Hazard Zones"].data[i].polygons.length; j++) {
                    const perimeter: serverInterface.LatLonAlt[] = bands["Hazard Zones"].data[i].polygons[j];
                    if (perimeter && perimeter.length) {
                        const floor: { top: number, bottom: number } = {
                            top: +perimeter[0].alt + 20,
                            bottom: +perimeter[0].alt - 20
                        }
                        // add geofence to the map
                        data.map.addProtectedArea(`${bands["Hazard Zones"].data[i].ac}-${i}-${j}`, perimeter, floor, {
                            showLabel: false
                        });
                    }
                }
            }
        }
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
    // set wind indicator
    if (bands && bands.Wind) {
        data.windIndicator.setAngleFrom(bands.Wind.deg);
        data.windIndicator.setMagnitude(bands.Wind.knot);
    }
    
    plot(playerID, { ownship: { gs: airspeed, vs: vspeed, alt, hd: heading }, bands, step: splitView.getCurrentSimulationStep(), time: splitView.getCurrentSimulationTime() });
}

/**
 * Utility function, renders the plot diagrams
 */
function plot (playerID: string, desc: { ownship: { gs: number, vs: number, alt: number, hd: number }, bands: ScenarioDataPoint, step: number, time: string }) {
    if (desc) {
        splitView.getPlayer(playerID).getPlot("alerts").plotAlerts({
            alerts: desc.bands?.Alerts?.alerts,
            step: desc.step,
            time: desc.time
        });
        for (let i = 0; i < daaPlots.length; i++) {
            const marker: number = (daaPlots[i].id === "heading-bands") ? desc.ownship.hd
                                    : (daaPlots[i].id === "horizontal-speed-bands") ? desc.ownship.gs
                                    : (daaPlots[i].id === "vertical-speed-bands") ? desc.ownship.vs * 100
                                    : (daaPlots[i].id === "altitude-bands") ? desc.ownship.alt
                                    : null;
            const resolution: number = (daaPlots[i].id === "heading-bands" && desc.bands["Horizontal Direction Resolution"] && desc.bands["Horizontal Direction Resolution"].preferred_resolution) ? +desc.bands["Horizontal Direction Resolution"].preferred_resolution?.valunit?.val
                                    : (daaPlots[i].id === "horizontal-speed-bands" && desc.bands["Horizontal Speed Resolution"] && desc.bands["Horizontal Speed Resolution"].preferred_resolution) ? +desc.bands["Horizontal Speed Resolution"].preferred_resolution?.valunit?.val
                                    : (daaPlots[i].id === "vertical-speed-bands" && desc.bands["Vertical Speed Resolution"] && desc.bands["Vertical Speed Resolution"].preferred_resolution) ? +desc.bands["Vertical Speed Resolution"].preferred_resolution?.valunit?.val
                                    : (daaPlots[i].id === "altitude-bands" && desc.bands["Altitude Resolution"] && desc.bands["Altitude Resolution"].preferred_resolution) ? +desc.bands["Altitude Resolution"].preferred_resolution?.valunit?.val
                                    : null;
            splitView.getPlayer(playerID).getPlot(daaPlots[i].id).plotBands({
                bands: desc.bands[daaPlots[i].name],
                step: desc.step,
                time: desc.time,
                units: daaPlots[i].units,
                marker,
                resolution
            });
        }
    } else {
        console.log("[split-view] Warning: trying to plot null descriptor");
    }
}

// interactive map
const map_left: InteractiveMap = new InteractiveMap("map-left", { 
    top: 2, 
    left: 6
}, { 
    parent: "daa-disp-left", 
    engine: "leafletjs" 
});
// wind indicator
const wind_left: WindIndicator = new WindIndicator("wind-left", { top: 690, left: 195 }, { parent: "daa-disp-left"});
// map heading is controlled by the compass
const compass_left: Compass = new Compass("compass-left", { top: 110, left: 215 }, { parent: "daa-disp-left", map: map_left, wind: wind_left });
// map zoom is controlled by nmiSelector
const hscale_left: HScale = new HScale("hscale-left", { top: 800, left: 13 }, { parent: "daa-disp-left", map: map_left, compass: compass_left });
// map view options
const viewOptions_left: ViewOptions = new ViewOptions("view-options-left", { top: 4, left: 13 }, { 
    labels: [
        "nrthup", "call-sign", "vfr-map", "contours", "hazard-zones"
    ], parent: "daa-disp-left", compass: compass_left, map: map_left 
});
const airspeedTape_left: AirspeedTape = new AirspeedTape("airspeed-left", { top: 100, left: 100 }, { parent: "daa-disp-left" });
const altitudeTape_left: AltitudeTape = new AltitudeTape("altitude-left", { top: 100, left: 833 }, { parent: "daa-disp-left" });
const verticalSpeedTape_left: VerticalSpeedTape = new VerticalSpeedTape("vertical-speed-left", { top: 210, left: 981 }, { parent: "daa-disp-left", verticalSpeedRange: 2000 });

// interactive map
const map_right: InteractiveMap = new InteractiveMap("map-right", { 
    top: 2, 
    left: 6
}, { 
    parent: "daa-disp-right",
    engine: "leafletjs"
});
// wind indicator
const wind_right: WindIndicator = new WindIndicator("wind-right", { top: 690, left: 195 }, { parent: "daa-disp-right"});
// map heading is controlled by the compass
const compass_right: Compass = new Compass("compass-right", { top: 110, left: 215 }, { parent: "daa-disp-right", map: map_right, wind: wind_right });
// map zoom is controlled by nmiSelector
const hscale_right: HScale = new HScale("hscale-right", { top: 800, left: 13 }, { parent: "daa-disp-right", map: map_right, compass: compass_right });
// map view options
const viewOptions_right: ViewOptions = new ViewOptions("view-options-right", { top: 4, left: 13 }, { 
    labels: [
        "nrthup", "call-sign", "vfr-map", "contours", "hazard-zones"
    ], parent: "daa-disp-right", compass: compass_right, map: map_right 
});
const airspeedTape_right: AirspeedTape = new AirspeedTape("airspeed-right", { top: 100, left: 100 }, { parent: "daa-disp-right" });
const altitudeTape_right: AltitudeTape = new AltitudeTape("altitude-right", { top: 100, left: 833 }, { parent: "daa-disp-right" });
const verticalSpeedTape_right: VerticalSpeedTape = new VerticalSpeedTape("vertical-speed-right", { top: 210, left: 981 }, { parent: "daa-disp-right", verticalSpeedRange: 2000 });

const daaPlots: { id: string, name: string, units: string, range: { from: number, to: number } }[] = [
    { id: "heading-bands", units: "deg", name: "Heading Bands", range: { from: 0, to: 360 } },
    { id: "horizontal-speed-bands", units: "knot", name: "Horizontal Speed Bands", range: { from: 0, to: 1000 } },
    { id: "vertical-speed-bands", units: "fpm", name: "Vertical Speed Bands", range: { from: -10000, to: 10000 } },
    { id: "altitude-bands", units: "ft", name: "Altitude Bands", range: { from: -200, to: 60000 } }
];

const regionNames: string[] = [
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
        altitudeTape: altitudeTape_left, verticalSpeedTape: verticalSpeedTape_left,
        windIndicator: wind_left
    });
});
splitView.getPlayer("right").define("step", async () => {
    // render right
    render("right", {
        map: map_right, compass: compass_right, airspeedTape: airspeedTape_right, 
        altitudeTape: altitudeTape_right, verticalSpeedTape: verticalSpeedTape_right,
        windIndicator: wind_right
    });
});
// -- plot
splitView.getPlayer("right").define("plot", () => {
    const flightData: LLAData[] = splitView.getPlayer("right").getFlightData();
    for (let step = 0; step < flightData?.length; step++) {
        const bandsRight: ScenarioDataPoint = splitView.getPlayer("right").getCurrentBands(step);
        const bandsLeft: ScenarioDataPoint = splitView.getPlayer("left").getCurrentBands(step);
        splitView.getPlayer("right").setTimerJiffy("plot", () => {
            const time: string = splitView.getTimeAt(step);
            const lla: LLAData = flightData[step];
            const hd: number = Compass.v2deg(lla.ownship.v);
            const gs: number = AirspeedTape.v2gs(lla.ownship.v);
            const vs: number = +lla.ownship.v.z;
            const alt: number = +lla.ownship.s.alt;
            plot("right", { ownship: { hd, gs, vs: vs / 100, alt }, bands: bandsRight, step, time });
            diff(bandsLeft, bandsRight, step, time); // 3.5ms
        }, 8 * step);
    }
});
splitView.getPlayer("left").define("plot", () => {
    const flightData: LLAData[] = splitView.getPlayer("right").getFlightData();
    for (let step = 0; step < flightData?.length; step++) {
        // const bandsRight: ScenarioDataPoint = splitView.getPlayer("right").getCurrentBands(step);
        const bandsLeft: ScenarioDataPoint = splitView.getPlayer("left").getCurrentBands(step);
        splitView.getPlayer("left").setTimerJiffy("plot", () => {
            const time: string = splitView.getTimeAt(step);
            const lla: LLAData = flightData[step];
            const hd: number = Compass.v2deg(lla.ownship.v);
            const gs: number = AirspeedTape.v2gs(lla.ownship.v);
            const vs: number = +lla.ownship.v.z;
            const alt: number = +lla.ownship.s.alt;
            plot("left", { ownship: { hd, gs, vs: vs / 100, alt }, bands: bandsLeft, step, time });
        }, 8 * step);
    }
});
// -- diff : returns true if alerts or bands are different
function diff (bandsLeft?: ScenarioDataPoint, bandsRight?: ScenarioDataPoint, step?: number, time?: string): boolean {
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
            bandsRight.Alerts?.alerts?.forEach(alert => {
                if (alert.alert_level > 0) {
                    alertsR += `${alert.ac} [${alert.alert_level}]`;
                }
            });
        }
        let alertsL: string = "";
        if (bandsLeft && bandsLeft.Alerts) {
            bandsLeft.Alerts?.alerts?.forEach(alert => {
                if (alert.alert_level > 0) {
                    alertsL += `${alert.ac} [${alert.alert_level}]`; 
                }
            });
        }
        if (alertsR !== alertsL) { // 0.1ms
            splitView.getPlayer("left").getPlot("alerts").revealMarker({ step, tooltip: `Time ${time}<br>This run:<br>Alerts [ ${alertsL} ]<br>The other run:<br>Alerts [ ${alertsR} ]` });
            splitView.getPlayer("right").getPlot("alerts").revealMarker({ step, tooltip: `Time ${time}<br>This run:<br>Alerts [ ${alertsR} ]<br>The other run:<br>Alerts [ ${alertsL} ]` });
        }
        // }
        // check bands & resolutions
        for (let i = 0; i < daaPlots.length; i++) {
            const plotID: string = daaPlots[i].id;
            const plotName: string = daaPlots[i].name;
            // const diffPlot: boolean = JSON.stringify(bandsLeft[plotName]) !== JSON.stringify(bandsRight[plotName]); // profiler 7.3ms
            // if (diffPlot) {
            let bandsR: { range: { from: number, to: number }, region: Region }[] = []
            let bandsL: { range: { from: number, to: number }, region: Region }[] = []
            //bandNames.forEach((band: string) => { // profiler 1.4ms
            if (bandsRight[plotName]?.bands?.length) {
                bandsRight[plotName].bands.forEach((band: DaidalusBand) => {
                    // bandsR += `<br>${band} [${Math.floor(range.from * 100) / 100}, ${Math.floor(range.to * 100) / 100}]`;
                    if (band?.range) {
                        bandsR.push({ region: band.region, range: { from: Math.floor(band.range[0] * 100) / 100, to: Math.floor(band.range[1] * 100) / 100 } });
                    }
                });
            }
            if (bandsLeft[plotName]?.bands?.length) {
                bandsLeft[plotName].bands.forEach((band: DaidalusBand) => {
                    // bandsL += `<br>${band} [${Math.floor(range.from * 100) / 100}, ${Math.floor(range.to * 100) / 100}]`;
                    if (band.range) {
                        bandsL.push({ region: band.region, range: { from: Math.floor(band.range[0] * 100) / 100, to: Math.floor(band.range[1] * 100) / 100 } });
                    }
                });
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
                plotR += `<br>${bandsR[k].region} [${bandsR[k].range.from}, ${bandsR[k].range.to}]`;
            }
            for (let k = 0; k < bandsL.length; k++) {
                plotL += `<br>${bandsL[k].region} [${bandsL[k].range.from}, ${bandsL[k].range.to}]`;
            }

            // check resolutions
            const resInfo: string = plotName.replace("Bands", "Resolution");
            let resolutionR: ResolutionElement = bandsRight[resInfo];
            let resolutionL: ResolutionElement = bandsLeft[resInfo];
            if (resolutionR && resolutionL) {
                // check direction
                if (resolutionR.flags?.preferred === resolutionL.flags?.preferred) {
                    // if same direction, check that the numeric value of the preferred resolutions differ less than epsilon
                    const epsilon: number = 10e-5;
                    const ok: boolean =
                        (isNaN(+resolutionL.preferred_resolution?.valunit?.val) && isNaN(+resolutionR.preferred_resolution?.valunit?.val))
                            || (!isFinite(+resolutionL.preferred_resolution?.valunit?.val) 
                                && !isFinite(+resolutionR.preferred_resolution?.valunit?.val) 
                                && Math.sign(+resolutionL.preferred_resolution?.valunit?.val) === Math.sign(+resolutionR.preferred_resolution?.valunit?.val))
                            || Math.abs(+resolutionL.preferred_resolution?.valunit?.val - +resolutionR.preferred_resolution?.valunit?.val) <= epsilon;
                    if (!ok) {
                        plotR += `<br>Resolution: ${resolutionR.preferred_resolution?.valunit?.val}`;
                        plotL += `<br>Resolution: ${resolutionL.preferred_resolution?.valunit?.val}`;
                    }
                } else {
                    plotR += `<br>Resolution: ${resolutionR.flags?.preferred}`;
                    plotL += `<br>Resolution: ${resolutionL.flags?.preferred}`;
                }
            }

            if (plotR !== plotL) { // 1.2ms
                splitView.getPlayer("left").getPlot(plotID).revealMarker({ step, tooltip: `Time ${time}<br>This run:${plotL}<br><br>The other run:${plotR}` });
                splitView.getPlayer("right").getPlot(plotID).revealMarker({ step, tooltip: `Time ${time}<br>This run:${plotR}<br><br>The other run:${plotL}` });
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
    await splitView.getPlayer("left").exec({
        alertingLogic: splitView.getPlayer("left").getSelectedWellClearVersion(), //"DAAtoPVS-1.0.1.jar",
        alertingConfig: splitView.getPlayer("left").getSelectedConfiguration(),
        scenario: splitView.getSelectedScenario(),
        wind: splitView.getPlayer("left").getSelectedWindSettings()
    });
    viewOptions_left.applyCurrentViewOptions();
    // scale displays
    if (developerMode && splitView.getMode() === "developerMode") {
        developerMode();
    } else {
        normalMode();
    }
});
splitView.getPlayer("right").define("init", async () => {
    // init right
    await splitView.getPlayer("right").exec({
        alertingLogic: splitView.getPlayer("right").getSelectedWellClearVersion(), //"DAAtoPVS-1.0.1.jar",
        alertingConfig: splitView.getPlayer("right").getSelectedConfiguration(),
        scenario: splitView.getSelectedScenario(),
        wind: splitView.getPlayer("right").getSelectedWindSettings()
    });
    viewOptions_right.applyCurrentViewOptions();
    // scale displays
    if (developerMode && splitView.getMode() === "developerMode") {
        developerMode();
    } else {
        normalMode();
    }
});

// -- normal mode
function normalMode () {
    // left
    airspeedTape_left.defaultUnits();
    airspeedTape_left.hideUnits();
    airspeedTape_left.defaultStep();
    airspeedTape_left.enableTapeSpinning();

    altitudeTape_left.defaultUnits();
    altitudeTape_left.hideUnits();
    altitudeTape_left.defaultStep();
    altitudeTape_left.enableTapeSpinning();

    verticalSpeedTape_left.defaultUnits();
    verticalSpeedTape_left.hideUnits();
    verticalSpeedTape_left.hideValueBox();
    verticalSpeedTape_left.defaultRange();

    // right
    airspeedTape_right.defaultUnits();
    airspeedTape_right.hideUnits();
    airspeedTape_right.defaultStep();
    airspeedTape_right.enableTapeSpinning();

    altitudeTape_right.defaultUnits();
    altitudeTape_right.hideUnits();
    altitudeTape_right.defaultStep();
    altitudeTape_right.enableTapeSpinning();

    verticalSpeedTape_right.defaultUnits();
    verticalSpeedTape_right.hideUnits();
    verticalSpeedTape_right.hideValueBox();
    verticalSpeedTape_right.defaultRange();
}

// -- developer mode
async function developerMode (): Promise<void> {
    const configData_left: ConfigData = await splitView.getPlayer("left").loadSelectedConfiguration();
    const configData_right: ConfigData = await splitView.getPlayer("right").loadSelectedConfiguration();

    // left
    airspeedTape_left.setUnits(configData_left["horizontal-speed"].units);
    airspeedTape_left.setRange(configData_left["horizontal-speed"]);
    airspeedTape_left.revealUnits();
    airspeedTape_left.disableTapeSpinning();

    altitudeTape_left.setUnits(configData_left.altitude.units);
    altitudeTape_left.setRange(configData_left.altitude);
    altitudeTape_left.revealUnits();
    altitudeTape_left.disableTapeSpinning();

    verticalSpeedTape_left.setUnits(configData_right["vertical-speed"].units);
    verticalSpeedTape_left.revealUnits();
    verticalSpeedTape_left.setRange(configData_left["vertical-speed"]);
    verticalSpeedTape_left.showValueBox();

    // right
    airspeedTape_right.setUnits(configData_right["horizontal-speed"].units);
    airspeedTape_right.setRange(configData_right["horizontal-speed"]);
    airspeedTape_right.revealUnits();
    airspeedTape_right.disableTapeSpinning();

    altitudeTape_right.setUnits(configData_right.altitude.units);
    altitudeTape_right.setRange(configData_right.altitude);
    altitudeTape_right.revealUnits();
    altitudeTape_right.disableTapeSpinning();

    verticalSpeedTape_right.setUnits(configData_right["vertical-speed"].units);
    verticalSpeedTape_right.revealUnits();
    verticalSpeedTape_right.setRange(configData_right["vertical-speed"]);
    verticalSpeedTape_right.showValueBox();
}

async function createPlayer(args: SplitConfig) {
    splitView.appendNavbar();
    splitView.appendSidePanelView();
    await splitView.appendScenarioSelector();
    await splitView.appendWindSettings({ fromToSelectorVisible: true });
    await splitView.appendWellClearVersionSelector();
    await splitView.appendWellClearConfigurationSelector();
    splitView.selectConfiguration("DO_365A_no_SUM");
    splitView.appendSimulationControls({
        parent: "simulation-controls",
        displays: [ "daa-disp-left", "daa-disp-right" ]
    });
    splitView.appendPlotControls({
        parent: "simulation-controls",
        top: 47
    });
    splitView.appendDeveloperControls({
        normalMode,
        developerMode
    }, {
        parent: "simulation-controls",
        top: 48,
        left: 754,
        width: 344
    });
    splitView.getPlayer("left").appendSimulationPlot({
        id: "alerts",
        width: 1040,
        label: "Alerting",
        range: { from: 1, to: 3 },
        player: splitView,
        parent: "simulation-plot"
    }, {
        overheadLabel: true
    });
    splitView.getPlayer("right").appendSimulationPlot({
        id: "alerts",
        left: 1200,
        width: 1040,
        label: "Alerting",
        range: { from: 1, to: 3 },
        player: splitView,
        parent: "simulation-plot"
    }, {
        overheadLabel: true
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
        parent: "activation-controls"
    });
    await splitView.activate({ developerMode: true });

    // auto-load scenario+config if they are specified in the browser
    if (args) {
        if (args.scenario) {
            splitView.selectScenario(args.scenario);
        }
        if (args.configLeft) {
            await splitView.getPlayer("left").selectConfiguration(args.configLeft);
        }
        if (args.configRight) {
            await splitView.getPlayer("right").selectConfiguration(args.configRight);
        }
        await splitView.loadSelectedScenario();
    }
    
}
const args: SplitConfig = parseSplitConfigInBrowser();
if (args) {
    console.log(args);
}
createPlayer(args);
