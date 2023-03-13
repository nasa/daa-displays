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
import { DAASplitView, parseSplitConfigInBrowser, SplitConfig } from './daa-displays/daa-split-view';
import { AlertLevel, ConfigData, DaaSymbol, LatLonAlt, LLAData, Region, ResolutionElement, ScenarioDataPoint } from './daa-displays/utils/daa-types';

import * as utils from './daa-displays/daa-utils';
import { ViewOptions } from './daa-displays/daa-view-options';
import { WindIndicator } from './daa-displays/daa-wind-indicator';
import { DAAPlayer } from './daa-displays/daa-player';
import { inhibit_bands, downgrade_alerts, inhibit_resolutions, THRESHOLD_ALT_SL3, USE_TCAS_SL3 } from './daa-displays/daa-utils';

// widgets included in the rendered display
export interface RenderableDisplay {
    map: InteractiveMap,
    compass: Compass,
    airspeedTape: AirspeedTape,
    altitudeTape: AltitudeTape,
    verticalSpeedTape: VerticalSpeedTape
    windIndicator: WindIndicator,
    hscale?: HScale,
    viewOptions?: ViewOptions
};

/**
 * Utility function, renders the display elements
 */
export function render(player: DAAPlayer, data: RenderableDisplay): void {
    const daaSymbols: DaaSymbol[] = [ "daa-target", "daa-traffic-monitor", "daa-traffic-avoid", "daa-alert" ]; // 0..3
    const flightData: LLAData = <LLAData> player.getCurrentFlightData();
    data.map.setPosition(flightData.ownship.s);

    const bands: ScenarioDataPoint = player.getCurrentBands();
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

    // the special configuration DANTi_SL3 mimicks TCAS suppression of warning alerts when the aircraft is below a certain altitude
    const selected_config: string = player.readSelectedDaaConfiguration();
    const force_caution: boolean = selected_config?.toLowerCase().includes("danti_sl3") && alt < THRESHOLD_ALT_SL3 && USE_TCAS_SL3;
    if (force_caution) {
        downgrade_alerts({ to: AlertLevel.AVOID, alerts: bands?.Alerts?.alerts });
        inhibit_bands({ bands });
        inhibit_resolutions({ bands });
    }
    
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
                    const perimeter: LatLonAlt<number | string>[] = bands.Contours.data[i].polygons[j];
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
                    const perimeter: LatLonAlt<number | string>[] = bands["Hazard Zones"].data[i].polygons[j];
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
    
    plot(player, { ownship: { gs: airspeed, vs: vspeed, alt, hd: heading }, bands, step: splitView.getCurrentSimulationStep(), time: splitView.getCurrentSimulationTime() });
}

/**
 * Utility function, renders the plot diagrams
 */
export function plot (player: DAAPlayer, desc: { ownship: { gs: number, vs: number, alt: number, hd: number }, bands: ScenarioDataPoint, step: number, time: string }) {
    if (desc) {
        player.getPlot("alerts").plotAlerts({
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
            player.getPlot(daaPlots[i].id).plotBands({
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


/**
 * Utility function, creates the display elements
 */
export function createDisplay (index: number | string): void {
    const parent: string = `daa-disp-${index === 0 ? "left" : "right"}`;
    // interactive map
    const map: InteractiveMap = new InteractiveMap(`map-${index}`, { 
        top: 2, 
        left: 6
    }, { 
        parent, 
        engine: "leafletjs" 
    });
    // wind indicator
    const wind: WindIndicator = new WindIndicator(`wind-${index}`, { top: 690, left: 195 }, { parent });
    // map heading is controlled by the compass, div names for compass and indicators are taken from the map display so the compass will be rendered under the alerts
    const compassDivName: string = map.getCompassDivName();
    const indicatorsDivName: string = map.getIndicatorsDivName();
    const compass: Compass = new Compass(`compass-${index}`, { top: 110, left: 215 }, { parent: compassDivName, indicatorsDiv: indicatorsDivName, map, wind });
    // map zoom is controlled by nmiSelector
    const hscale: HScale = new HScale(`hscale-${index}`, { top: 790, left: 13 }, { parent, map, compass });
    // map view options
    const viewOptions: ViewOptions = new ViewOptions(`view-options-${index}`, { top: 4, left: 13 }, { 
        labels: [
            "nrthup", "call-sign", "vfr-map", "well-clear", "blobs"
        ], parent, compass, map
    });
    const airspeedTape: AirspeedTape = new AirspeedTape(`airspeed-${index}`, { top: 100, left: 100 }, { parent });
    const altitudeTape: AltitudeTape = new AltitudeTape(`altitude-${index}`, { top: 100, left: 833 }, { parent });
    const verticalSpeedTape: VerticalSpeedTape = new VerticalSpeedTape(`vertical-speed-${index}`, { top: 210, left: 981 }, { parent, verticalSpeedRange: 2000 });
    // save widgets in displays
    displays[index] = {
        map, windIndicator: wind, compass, hscale, viewOptions, airspeedTape, altitudeTape, verticalSpeedTape
    };
}

const daaPlots: { id: string, name: string, units: string, range: { from: number, to: number } }[] = [
    { id: "heading-bands", units: "deg", name: "Heading Bands", range: { from: 0, to: 360 } },
    { id: "horizontal-speed-bands", units: "knot", name: "Horizontal Speed Bands", range: { from: 0, to: 1000 } },
    { id: "vertical-speed-bands", units: "fpm", name: "Vertical Speed Bands", range: { from: -10000, to: 10000 } },
    { id: "altitude-bands", units: "ft", name: "Altitude Bands", range: { from: -200, to: 60000 } }
];

// split view instance
const splitView: DAASplitView = new DAASplitView();

// displays stores all rendered displays
let displays: { [index:string]: RenderableDisplay } = {};
// create all displays
for (let i = 0; i < 2; i++) {
    // create display
    createDisplay(i);
    // create player
    const player: DAAPlayer = splitView.getPlayer(i);
    // attach init handler
    player.define("init", async () => {
        await player.exec({
            alertingLogic: player.readSelectedDaaVersion(),
            alertingConfig: player.readSelectedDaaConfiguration(),
            scenario: splitView.getSelectedScenario(),
            wind: player.getSelectedWind()
        });
        displays[i]?.viewOptions?.applyCurrentViewOptions();
        // apply selected display mode
        (splitView.getMode() === "developerMode") ? developerMode() : normalMode();
    });
    // attach step handler
    player.define("step", async () => {
        render(player, displays[i]);
    });
    // attach plot handler
    player.define("plot", () => {
        const flightData: LLAData[] = player.getFlightData();
        const selected_config: string = player.readSelectedDaaConfiguration();
        for (let step = 0; step < flightData?.length; step++) {
            const bands: ScenarioDataPoint = player.getCurrentBands(step);
            // bandsRight are needed only for the player on the right, to perform a diff
            const otherBands: ScenarioDataPoint = i > 0 ? splitView.getPlayer(i - 1).getCurrentBands(step) : null;
            player.setTimerJiffy("plot", () => {
                const time: string = splitView.getTimeAt(step);
                const lla: LLAData = flightData[step];
                const hd: number = Compass.v2deg(lla.ownship.v);
                const gs: number = AirspeedTape.v2gs(lla.ownship.v);
                const vs: number = +lla.ownship.v.z;
                const alt: number = +lla.ownship.s.alt;
                const force_caution: boolean = selected_config?.toLowerCase().includes("danti_sl3") && alt < THRESHOLD_ALT_SL3 && USE_TCAS_SL3;
                if (force_caution) {
                    downgrade_alerts({ to: AlertLevel.AVOID, alerts: bands?.Alerts?.alerts });
                    inhibit_bands({ bands });
                    inhibit_resolutions({ bands });
                }    
                plot(player, { ownship: { hd, gs, vs: vs / 100, alt }, bands, step, time });
                if (i > 0) {
                    diff(player, otherBands, bands, step, time); // 3.5ms
                }
            }, 8 * step);
        }
    });
}

// -- diff : returns true if alerts or bands are different
function diff (player: DAAPlayer, bandsLeft?: ScenarioDataPoint, bandsRight?: ScenarioDataPoint, step?: number, time?: string): boolean {
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
        if (bandsRight?.Alerts) {
            for (let i = 0; i < bandsRight.Alerts?.alerts?.length; i++) {
                if (bandsRight.Alerts.alerts[i].alert_level > 0) {
                    alertsR += `${bandsRight.Alerts.alerts[i].ac} [${bandsRight.Alerts.alerts[i].alert_level}]`;
                }
            }
            // bandsRight.Alerts?.alerts?.forEach(alert => {
            //     if (alert.alert_level > 0) {
            //         alertsR += `${alert.ac} [${alert.alert_level}]`;
            //     }
            // });
        }
        let alertsL: string = "";
        if (bandsLeft?.Alerts) {
            for (let i = 0; i < bandsLeft.Alerts?.alerts?.length; i++) {
                if (bandsLeft.Alerts.alerts[i].alert_level > 0) {
                    alertsL += `${bandsLeft.Alerts.alerts[i].ac} [${bandsLeft.Alerts.alerts[i].alert_level}]`; 
                }
            }
            // bandsLeft.Alerts?.alerts?.forEach(alert => {
            //     if (alert.alert_level > 0) {
            //         alertsL += `${alert.ac} [${alert.alert_level}]`; 
            //     }
            // });
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
                const bands = bandsRight[plotName].bands;
                for (let i = 0; i < bands?.length; i++) {
                    const band = bands[i];
                // .forEach((band: DaidalusBand) => {
                    // bandsR += `<br>${band} [${Math.floor(range.from * 100) / 100}, ${Math.floor(range.to * 100) / 100}]`;
                    if (band?.range) {
                        bandsR.push({ region: band.region, range: { from: Math.floor(band.range[0] * 100) / 100, to: Math.floor(band.range[1] * 100) / 100 } });
                    }
                }
            }
            if (bandsLeft[plotName]?.bands?.length) {
                const bands = bandsLeft[plotName].bands;
                for (let i = 0; i < bands?.length; i++) {
                    const band = bands[i];
                // .forEach((band: DaidalusBand) => {
                    // bandsL += `<br>${band} [${Math.floor(range.from * 100) / 100}, ${Math.floor(range.to * 100) / 100}]`;
                    if (band.range) {
                        bandsL.push({ region: band.region, range: { from: Math.floor(band.range[0] * 100) / 100, to: Math.floor(band.range[1] * 100) / 100 } });
                    }
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
// // -- init
// splitView.getPlayer("left").define("init", async () => {
//     // init left
//     await splitView.getPlayer("left").exec({
//         alertingLogic: splitView.getPlayer("left").getSelectedWellClearVersion(), //"DAAtoPVS-1.0.1.jar",
//         alertingConfig: splitView.getPlayer("left").getSelectedConfiguration(),
//         scenario: splitView.getSelectedScenario(),
//         wind: splitView.getPlayer("left").getSelectedWindSettings()
//     });
//     viewOptions_left.applyCurrentViewOptions();
//     // scale displays
//     if (typeof developerMode === "function" && splitView.getMode() === "developerMode") {
//         developerMode();
//     } else {
//         normalMode();
//     }
// });
// splitView.getPlayer("right").define("init", async () => {
//     // init right
//     await splitView.getPlayer("right").exec({
//         alertingLogic: splitView.getPlayer("right").getSelectedWellClearVersion(), //"DAAtoPVS-1.0.1.jar",
//         alertingConfig: splitView.getPlayer("right").getSelectedConfiguration(),
//         scenario: splitView.getSelectedScenario(),
//         wind: splitView.getPlayer("right").getSelectedWindSettings()
//     });
//     viewOptions_right.applyCurrentViewOptions();
//     // scale displays
//     if (typeof developerMode === "function" && splitView.getMode() === "developerMode") {
//         developerMode();
//     } else {
//         normalMode();
//     }
// });

// -- normal mode
export function normalMode () {
    for (let i = 0; i < 2; i++) {
        displays[i].airspeedTape?.defaultUnits();
        displays[i].airspeedTape?.hideUnits();
        displays[i].airspeedTape?.defaultStep();
        displays[i].airspeedTape?.enableTapeSpinning();

        displays[i].altitudeTape?.defaultUnits();
        displays[i].altitudeTape?.hideUnits();
        displays[i].altitudeTape?.defaultStep();
        displays[i].altitudeTape?.enableTapeSpinning();

        displays[i].verticalSpeedTape?.defaultUnits();
        displays[i].verticalSpeedTape?.hideUnits();
        displays[i].verticalSpeedTape?.hideValueBox();
        displays[i].verticalSpeedTape?.defaultRange();
    }
}

// -- developer mode
export async function developerMode (): Promise<void> {
    for (let i = 0; i < 2; i++) {
        const configData: ConfigData = await splitView.getPlayer(i).loadSelectedConfiguration();
        if (configData) {
            displays[i].airspeedTape?.setUnits(configData["horizontal-speed"].units);
            displays[i].airspeedTape?.setRange(configData["horizontal-speed"]);
            displays[i].airspeedTape?.revealUnits();
            displays[i].airspeedTape?.disableTapeSpinning();

            displays[i].altitudeTape?.setUnits(configData.altitude.units);
            displays[i].altitudeTape?.setRange(configData.altitude);
            displays[i].altitudeTape?.revealUnits();
            displays[i].altitudeTape?.disableTapeSpinning();

            displays[i].verticalSpeedTape?.setUnits(configData["vertical-speed"].units);
            displays[i].verticalSpeedTape?.revealUnits();
            displays[i].verticalSpeedTape?.setRange(configData["vertical-speed"]);
            displays[i].verticalSpeedTape?.showValueBox();
        } else {
            console.warn(`[split-view] developerMode / player ${i} -- config data is null`);
        }
    }
}

/**
 * Utility function, creates the split view player elements
 */
async function createPlayer (args: SplitConfig) {
    splitView.appendNavbar();
    splitView.appendSidePanelView();
    await splitView.appendScenarioSelector();
    await splitView.appendWindSettings({ fromToSelectorVisible: true });
    await splitView.appendDaaVersionSelector();
    await splitView.appendDaaConfigurationSelector();
    await splitView.selectDaaConfiguration("DO_365A_no_SUM");
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
    // activate player
    await splitView.activate({ developerMode: true });
    // auto-load scenario+config if they are specified in the browser
    if (args) {
        if (args.scenario) {
            splitView.selectScenario(args.scenario);
        }
        if (args.configLeft) {
            await splitView.getPlayer("left").selectDaaConfiguration(args.configLeft);
        }
        if (args.configRight) {
            await splitView.getPlayer("right").selectDaaConfiguration(args.configRight);
        }
        await splitView.loadSelectedScenario();
    }
    
}
const args: SplitConfig = parseSplitConfigInBrowser();
if (args) {
    console.log(args);
}
createPlayer(args);
