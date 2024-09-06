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
import { WindIndicator } from './daa-displays/daa-wind-indicator';

import { InteractiveMap } from './daa-displays/daa-interactive-map';
import { DaaConfig, DAAPlayer, parseDaaConfigInBrowser } from './daa-displays/daa-player';
import { LLAData, ConfigData, ScenarioDataPoint, DaaSymbol, LatLonAlt } from './daa-displays/utils/daa-types';

import * as utils from './daa-displays/daa-utils';
import { ViewOptions } from './daa-displays/daa-view-options';
import { Bands, downgrade_alerts, inhibit_bands, inhibit_resolutions, severity } from './daa-displays/daa-utils';
import { THRESHOLD_ALT_SL3, USE_TCAS_SL3 } from './config';

const player: DAAPlayer = new DAAPlayer();

const godsView: boolean = true;

function render (data: { map: InteractiveMap, compass: Compass, airspeedTape: AirspeedTape, altitudeTape: AltitudeTape, verticalSpeedTape: VerticalSpeedTape }, opt?: {
    recenter?: boolean 
}) {
    opt = opt || {};
    const daaSymbols: DaaSymbol[] = [ "daa-target", "daa-traffic-monitor", "daa-traffic-avoid", "daa-alert" ]; // 0..3
    const flightData: LLAData = <LLAData> player.getCurrentFlightData();
    player.displayFlightData();
    if (flightData && flightData.ownship) {
        if (godsView) {
            // set velocity and position of ownship
            data.map.setOwnshipPosition(flightData.ownship.s);
            data.map.setOwnshipVelocity(flightData.ownship.v);
            if (opt.recenter) {
                // recenter view on ownship
                data.map.setPosition(flightData.ownship.s);
            }
        } else {
            // recenter view on ownship
            data.map.setPosition(flightData.ownship.s);
        }

        const bands: ScenarioDataPoint = player.getCurrentBands();
        if (bands && !bands.Ownship) { console.warn("Warning: using ground-based data for the ownship"); }
    
		const heading: number = (bands?.Ownship?.acstate?.heading) ? +bands.Ownship.acstate.heading.val : Compass.v2deg(flightData.ownship.v);
		const headingUnits: string = (bands?.Ownship?.acstate?.heading) ? bands.Ownship.acstate.heading.units : Compass.units.deg;
		const airspeed: number = (bands?.Ownship?.acstate?.airspeed) ? +bands.Ownship.acstate.airspeed.val : AirspeedTape.v2gs(flightData.ownship.v);
		const airspeedUnits: string = (bands?.Ownship?.acstate?.airspeed) ? bands.Ownship.acstate.airspeed.units : AirspeedTape.units.knots;
		const vspeed: number = +flightData.ownship.v.z;
		const alt: number = +flightData.ownship.s.alt;
		const altUnits: string = AltitudeTape.units.ft;
        if (!godsView) {
            data.compass.setCompass(heading, { units: headingUnits });
        }
		data.airspeedTape.setAirSpeed(airspeed, airspeedUnits);
		data.verticalSpeedTape.setVerticalSpeed(vspeed);
		data.altitudeTape.setAltitude(alt, altUnits);
        // console.log(`Flight data`, flightData);

        // the special configuration DANTi_SL3 mimicks TCAS suppression of warning alerts when the aircraft is below a certain altitude
        const selected_config: string = player.readSelectedDaaConfiguration();
        const force_caution: boolean = selected_config?.toLowerCase().includes("danti_sl3") && alt < THRESHOLD_ALT_SL3 && USE_TCAS_SL3;
        if (force_caution) {
            downgrade_alerts({ to: "MID", alerts: bands?.Alerts?.alerts });
            inhibit_bands({ bands });
            inhibit_resolutions({ bands });
        }
        
        if (bands) {
            const compassBands: Bands = utils.bandElement2Bands(bands["Heading Bands"]);
            data.compass.setBands(compassBands);
            const airspeedBands: Bands = utils.bandElement2Bands(bands["Horizontal Speed Bands"]);
            data.airspeedTape.setBands(airspeedBands);
            const vspeedBands: Bands = utils.bandElement2Bands(bands["Vertical Speed Bands"]);
            data.verticalSpeedTape.setBands(vspeedBands);
            const altitudeBands: Bands = utils.bandElement2Bands(bands["Altitude Bands"]);
            data.altitudeTape.setBands(altitudeBands);

            // set resolutions
            // show wedge only for recovery bands
            if (compassBands.RECOVERY) {
                data.compass.setBug(bands["Horizontal Direction Resolution"], {
                    wedgeConstraints: compassBands.RECOVERY,
                    resolutionBugColor: utils.bugColors["RECOVERY"] //"green"
                });
            } else {
                data.compass.setBug(bands["Horizontal Direction Resolution"], {
                    wedgeAperture: 0
                });
            }
            if (airspeedBands?.RECOVERY) {
                data.airspeedTape.setBug(bands["Horizontal Speed Resolution"], {
                    wedgeConstraints: airspeedBands.RECOVERY,
                    resolutionBugColor: utils.bugColors["RECOVERY"] //"green"
                });
            } else {
                data.airspeedTape.setBug(bands["Horizontal Speed Resolution"], {
                    wedgeAperture: 0
                });
            }
            if (altitudeBands?.RECOVERY) {
                data.altitudeTape.setBug(bands["Altitude Resolution"], {
                    wedgeConstraints: altitudeBands.RECOVERY,
                    resolutionBugColor: utils.bugColors["RECOVERY"] //"green"
                });
            } else {
                data.altitudeTape.setBug(bands["Altitude Resolution"], {
                    wedgeAperture: 0
                });
            }
            if (vspeedBands?.RECOVERY) {
                data.verticalSpeedTape.setBug(bands["Vertical Speed Resolution"], {
                    wedgeConstraints: vspeedBands.RECOVERY,
                    resolutionBugColor: utils.bugColors["RECOVERY"] //"green"
                });
            } else {
                data.verticalSpeedTape.setBug(bands["Vertical Speed Resolution"], {
                    wedgeAperture: 0
                });
            }
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
                            data.map.addContour(`${bands.Contours.data[i].ac}-${i}-${j}`, perimeter, floor, {
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
            const alert: number = (bands?.Alerts?.alerts && bands.Alerts.alerts[index]) ? severity(bands.Alerts.alerts[index].alert_region) : severity("NONE");
            return {
                callSign: data.id,
                s: data.s,
                v: data.v,
                symbol: daaSymbols[alert]
            }
        });
        data.map.setTraffic(traffic);
        // set wind indicator
        if (bands && bands.Wind) {
            wind.setAngleFrom(bands.Wind.deg);
            wind.setMagnitude(bands.Wind.knot);
        }
        // const step: number = player.getCurrentSimulationStep();
        // const time: string = player.getCurrentSimulationTime();
        // plot({ ownship: { gs: airspeed, vs: vspeed / 100, alt, hd: heading }, bands, step, time });
    }
}

const daaPlots: { id: string, name: string, units: string }[] = [
    { id: "heading-bands", units: "deg", name: "Heading Bands" },
    { id: "horizontal-speed-bands", units: "knot", name: "Horizontal Speed Bands" },
    { id: "vertical-speed-bands", units: "fpm", name: "Vertical Speed Bands" },
    { id: "altitude-bands", units: "ft", name: "Altitude Bands" }
];

function plot (desc: { ownship: { gs: number, vs: number, alt: number, hd: number }, bands: ScenarioDataPoint, step: number, time: string }) {
    // FIXME: band.id should be identical to band.name
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
}

// interactive map
const map: InteractiveMap = new InteractiveMap("map", {
    top: 2, 
    left: 6
}, { 
    parent: "daa-disp", 
    godsView,
    engine: "leafletjs",
    scrollZoom: true,
    dragging: true,
    trafficTraceVisible: true,
    ownshipTraceVisible: true
});
// wind indicator
const wind: WindIndicator = new WindIndicator("wind", { top: (godsView ? 764 : 690), left: (godsView ? 890 : 195), width: (godsView ? 168 : 140) }, { parent: "daa-disp"});
// map heading is controlled by the compass
const compass: Compass = new Compass("compass", { top: 110, left: 215 }, { parent: "daa-disp-hidden", maxWedgeAperture: 15, map, wind });
// map zoom is controlled by nmiSelector
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const hscale: HScale = new HScale("hscale", { top: 800, left: 13 }, { parent: "daa-disp-hidden", map, compass });
// map view options
const viewOptions: ViewOptions = new ViewOptions("view-options", { top: 4, left: 13 }, {
    labels: [
        "vfr-map", "call-sign", "well-clear", "contours"
    ], parent: "daa-disp", compass, map });
// create remaining display widgets
const airspeedTape = new AirspeedTape("airspeed", { top: 100, left: 100 }, { parent: "daa-disp-hidden", maxWedgeAperture: 50 });
const altitudeTape = new AltitudeTape("altitude", { top: 100, left: 833 }, { parent: "daa-disp-hidden", maxWedgeAperture: 300 });
const verticalSpeedTape = new VerticalSpeedTape("vertical-speed", { top: 210, left: 981 }, { parent: "daa-disp-hidden", verticalSpeedRange: 2000, maxWedgeAperture: 500 });

player.define("step", async () => {
    render({
        map: map, compass: compass, airspeedTape: airspeedTape, 
        altitudeTape: altitudeTape, verticalSpeedTape: verticalSpeedTape
    });
});
player.define("init", async () => {
    // compute java output
    await player.exec({
        alertingLogic: player.readSelectedDaaVersion(), //"DAAtoPVS-1.0.1.jar",
        alertingConfig: player.readSelectedDaaConfiguration(),
        scenario: player.getSelectedScenario(),
        wind: player.getSelectedWind()
    });
    viewOptions.applyCurrentViewOptions();
    player.applyCurrentResolutionOptions();
    player.updateMonitors();
    developerMode();
    if (godsView) {
        map.resetAirspace();
        render({
            map: map, compass: compass, airspeedTape: airspeedTape, 
            altitudeTape: altitudeTape, verticalSpeedTape: verticalSpeedTape
        }, { recenter: true });
    }
});
async function developerMode (): Promise<void> {
    const configData: ConfigData = await player.loadSelectedConfiguration();

    airspeedTape?.setUnits(configData["horizontal-speed"].units);
    airspeedTape?.setRange(configData["horizontal-speed"]);
    airspeedTape?.revealUnits();
    airspeedTape?.disableTapeSpinning();

    altitudeTape?.setUnits(configData.altitude.units);
    altitudeTape?.setRange(configData.altitude);
    altitudeTape?.revealUnits();
    altitudeTape?.disableTapeSpinning();

    verticalSpeedTape?.setUnits(configData["vertical-speed"].units);
    verticalSpeedTape?.setRange(configData["vertical-speed"]);
    verticalSpeedTape?.revealUnits();
    verticalSpeedTape?.showValueBox();
}

//fixme: don't use DAABandsData[], replace it with DaidalusBandsDescriptor
player.define("plot", () => {
    const flightData: LLAData[] = player.getFlightData();
    for (let step = 0; step < flightData?.length; step++) {
        const bandsData: ScenarioDataPoint = player.getCurrentBands(step);
        player.setTimerJiffy("plot", () => {
            const lla: LLAData = flightData[step];
            const hd: number = Compass.v2deg(lla.ownship.v);
            const gs: number = AirspeedTape.v2gs(lla.ownship.v);
            const vs: number = +lla.ownship.v.z / 100;
            const alt: number = +lla.ownship.s.alt;
            plot({ ownship: {hd, gs, vs, alt }, bands: bandsData, step, time: player.getTimeAt(step) });   
        }, step);
    }
    // const monitorID: number = 2;
    // plotMonitor({
    //     data: bandsData[0].Monitors[monitorID],
    //     monitorID
    // });
});
async function createPlayer(args: DaaConfig): Promise<void> {
    // player.appendSimulationPlot({
    //     id: "alerts",
    //     width: 1100,
    //     label: "Alerts",
    //     range: { from: 1, to: 3 },
    //     parent: "simulation-plot"
    // }, {
    //     overheadLabel: true
    // });
    // player.appendSimulationPlot({
    //     id: "heading-bands",
    //     top: 150,
    //     width: 1100,
    //     label: "Heading Bands",
    //     range: { from: 0, to: 360 },
    //     units: "[deg]",
    //     parent: "simulation-plot"
    // });
    // player.appendSimulationPlot({
    //     id: "horizontal-speed-bands",
    //     top: 300,
    //     width: 1100,
    //     label: "Horizontal Speed Bands",
    //     range: { from: 0, to: 1000 },
    //     units: "[knot]",
    //     parent: "simulation-plot"
    // });
    // player.appendSimulationPlot({
    //     id: "vertical-speed-bands",
    //     top: 450,
    //     width: 1100,
    //     label: "Vertical Speed Bands",
    //     range: { from: -10000, to: 10000 },
    //     units: "[fpm]",
    //     parent: "simulation-plot"
    // });
    // player.appendSimulationPlot({
    //     id: "altitude-bands",
    //     top: 600,
    //     width: 1100,
    //     label: "Altitude Bands",
    //     range: { from: -200, to: 60000 },
    //     units: "[ft]",
    //     parent: "simulation-plot"
    // });
    player.appendNavbar();
    player.appendSidePanelView();
    await player.appendScenarioSelector();
    await player.appendWindSettings({ selector: "daidalus-wind", dropDown: false, fromToSelectorVisible: true });
    await player.appendDaaVersionSelector({ selector: "daidalus-version" });
    await player.appendDaaConfigurationSelector({ selector: "daidalus-configuration" });
    await player.selectDaaConfiguration("2.x/DO_365A_no_SUM");
    await player.appendMonitorPanel();
    await player.appendTrafficPanel();
    // handlers can be defined only after creating the monitor panel
    // for (let i = 0; i < 3; i++) {
    //     const monitorID: number = i + 1;
    //     player.handle(`click.monitor-${monitorID}`, () => {
    //         const bandsData: ScenarioDataPoint = player.getCurrentBands();
    //         // const flightData: LLAData[] = player.getFlightData();
    //         if (i < bandsData?.Monitors?.length) {
    //             plotMonitor({
    //                 data: bandsData.Monitors[i],
    //                 monitorID
    //             });
    //         }
    //     });
    // }
    player.appendSimulationControls({
        parent: "simulation-controls",
        displays: [ "daa-disp" ]
    });
    // player.appendPlotControls({
    //     parent: "simulation-controls",
    //     top: 47
    // });
    player.appendActivationPanel({
        parent: "activation-controls"
    });
    player.appendWedgeRangeControls({
        setCompassWedgeAperture: (aperture: string) => {
            compass.setMaxWedgeAperture(aperture);
        },
        setAirspeedWedgeAperture: (aperture: string) => {
            airspeedTape.setMaxWedgeAperture(aperture);
        },
        setAltitudeWedgeAperture: (aperture: string) => {
            altitudeTape.setMaxWedgeAperture(aperture);
        },
        setVerticalSpeedWedgeAperture: (aperture: string) => {
            verticalSpeedTape.setMaxWedgeAperture(aperture);
        }
    }, { top: -110, left: 1140 });
    // player.appendDeveloperControls({
    //     normalMode,
    //     developerMode
    // }, {
    //     parent: "simulation-controls",
    //     top: 48,
    //     left: 754,
    //     width: 344,
    //     hidden: true
    // });
    // await player.activate({ developerMode: true });

    // auto-load scenario+config if they are specified in the browser
    if (args) {
        if (args.scenario) { player.selectScenario(args.scenario); }
        if (args.config) { await player.selectDaaConfiguration(args.config); }
        await player.loadSelectedScenario();
    }
    
}
const args: DaaConfig = parseDaaConfigInBrowser();
if (args) {
    console.log(args);
}
createPlayer(args);
