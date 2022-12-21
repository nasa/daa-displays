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

import { DEFAULT_MAP_WIDTH, InteractiveMap, MAP_WIDESCREEN_WIDTH } from './daa-displays/daa-interactive-map';
import {
     DaaConfig, DAAPlayer, DidChangeDaaAuralGuidance, DidChangeDaaVoiceName, DidChangeDaaVoicePitch, 
     DidChangeDaaVoiceRate, DidChangeSimulationSpeed, DidToggleDaaVoiceFeedback, parseDaaConfigInBrowser, 
     PlayerEvents 
} from './daa-displays/daa-player';
import { DaaBands, DAA_AircraftDescriptor, LatLonAlt, LLAData, ScenarioDataPoint } from './daa-displays/utils/daa-types';

import * as utils from './daa-displays/daa-utils';
import { ViewOptions } from './daa-displays/daa-view-options';
import { Bands, daaSymbols } from './daa-displays/daa-utils';
import { DaaVoice, Guidance, GuidanceKind } from './daa-displays/daa-voice';
import { LayeringMode } from './daa-displays/daa-map-components/leaflet-aircraft';
import { TailNumberIndicator } from './daa-displays/daa-tail-number';

// flag indicating whether the display should be widescreen
const enable_widescreen: boolean = true;
const enable_sound: boolean = true;
// display padding, used for centering the options and view controls shown at the top/bottom of the danti display
const PADDING: number = 13; //px
const INCLUDE_PLOTS: boolean = true;
const MAX_TRACE_LEN: number = 128; // large values have an impact on performance
const UPDATE_FREQUENCY: number = utils.DEFAULT_TRAFFIC_UPDATE_INTERVAL; // in seconds
/**
 * Utility function, renders the display content
 */
function render (danti: {
    map: InteractiveMap, 
    compass: Compass, 
    airspeedTape: AirspeedTape, 
    altitudeTape: AltitudeTape, 
    verticalSpeedTape: VerticalSpeedTape,
    voice: DaaVoice
}) {
    const flightData: LLAData = <LLAData> player.getCurrentFlightData();
    if (flightData && flightData.ownship) {
        danti.map.setPosition(flightData.ownship.s);
        // set tail number
        tailNumber.setTailNumber(flightData.ownship.id);

        // get bands
        const bands: DaaBands = player.getCurrentBands();
        if (bands && !bands.Ownship) { console.warn("Warning: using ground-based data for the ownship"); }

        const heading: number = (bands?.Ownship?.acstate?.heading) ? +bands.Ownship.acstate.heading.val : Compass.v2deg(flightData.ownship.v);
        const airspeed: number = (bands?.Ownship?.acstate?.airspeed) ? +bands.Ownship.acstate.airspeed.val : AirspeedTape.v2gs(flightData.ownship.v);
        const vspeed: number = +flightData.ownship.v.z;
        const alt: number = +flightData.ownship.s.alt;

        danti.compass.setCompass(heading);
        danti.airspeedTape.setAirSpeed(airspeed, AirspeedTape.units.knots);
        danti.verticalSpeedTape.setVerticalSpeed(vspeed);
        danti.altitudeTape.setAltitude(alt, AltitudeTape.units.ft);

        // compute max alert and collect aircraft alert descriptors
        let max_alert: number = 0;
        const traffic: DAA_AircraftDescriptor[] = flightData.traffic.map((data, index) => {
            const alert_level: number = bands?.Alerts?.alerts?.length > index ? bands.Alerts.alerts[index].alert_level : 0;
            const desc: DAA_AircraftDescriptor = {
                callSign: data.id,
                s: data.s,
                v: data.v,
                symbol: daaSymbols[alert_level]
            };
            if (alert_level > max_alert) {
                max_alert = alert_level;
            }
            return desc;
        });

        // console.log(`Flight data`, flightData);
        if (bands) {
            const compassBands: Bands = utils.bandElement2Bands(bands["Heading Bands"]);
            danti.compass.setBands(compassBands);
            const airspeedBands: Bands = utils.bandElement2Bands(bands["Horizontal Speed Bands"]);
            danti.airspeedTape.setBands(airspeedBands, AirspeedTape.units.knots);
            const vspeedBands: Bands = utils.bandElement2Bands(bands["Vertical Speed Bands"]);
            danti.verticalSpeedTape.setBands(vspeedBands);
            const altitudeBands: Bands = utils.bandElement2Bands(bands["Altitude Bands"]);
            danti.altitudeTape.setBands(altitudeBands, AltitudeTape.units.ft);

            // checks whether resolution wedges are persistent when there is an alerting aircraft
            const wedgePersistenceEnabled: boolean = player.wedgePersistenceIsEnabled();

            // set resolutions
            // show wedge only for recovery bands
            if (compassBands?.RECOVERY || (wedgePersistenceEnabled && max_alert > 2)) {
                danti.compass.setBug(bands["Horizontal Direction Resolution"], {
                    wedgeConstraints: compassBands.RECOVERY,
                    resolutionBugColor: utils.bugColors["RECOVERY"] //"green"
                });
            } else {
                danti.compass.setBug(bands["Horizontal Direction Resolution"], {
                    wedgeAperture: 0
                });
            }
            if (airspeedBands?.RECOVERY || (wedgePersistenceEnabled && max_alert > 2)) {
                danti.airspeedTape.setBug(bands["Horizontal Speed Resolution"], {
                    wedgeConstraints: airspeedBands.RECOVERY,
                    resolutionBugColor: utils.bugColors["RECOVERY"] //"green"
                });
            } else {
                danti.airspeedTape.setBug(bands["Horizontal Speed Resolution"], {
                    wedgeAperture: 0
                });
            }
            if (altitudeBands?.RECOVERY || (wedgePersistenceEnabled && max_alert > 2)) {
                danti.altitudeTape.setBug(bands["Altitude Resolution"], {
                    wedgeConstraints: altitudeBands.RECOVERY,
                    resolutionBugColor: utils.bugColors["RECOVERY"] //"green"
                });
            } else {
                danti.altitudeTape.setBug(bands["Altitude Resolution"], {
                    wedgeAperture: 0
                });
            }
            if (vspeedBands?.RECOVERY || (wedgePersistenceEnabled && max_alert > 2)) {
                danti.verticalSpeedTape.setBug(bands["Vertical Speed Resolution"], {
                    wedgeConstraints: vspeedBands.RECOVERY,
                    resolutionBugColor: utils.bugColors["RECOVERY"] //"green"
                });
            } else {
                danti.verticalSpeedTape.setBug(bands["Vertical Speed Resolution"], {
                    wedgeAperture: 0
                });
            }
        }
        // set contours
        danti.map.removeGeoFence();
        if (bands && bands.Contours && bands.Contours.data) {
            for (let i = 0; i < bands.Contours.data.length; i++) {
                if (bands.Contours.data[i].polygons) {
                    for (let j = 0; j < bands.Contours.data[i].polygons.length; j++) {
                        const perimeter: LatLonAlt<number | string>[] = bands.Contours.data[i].polygons[j];
                        if (perimeter?.length) {
                            const floor: { top: number, bottom: number } = {
                                top: +perimeter[0].alt + 20,
                                bottom: +perimeter[0].alt - 20
                            }
                            // add geofence to the map
                            danti.map.addContour(`${bands.Contours.data[i].ac}-${i}-${j}`, perimeter, floor, {
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
                        if (perimeter?.length) {
                            const floor: { top: number, bottom: number } = {
                                top: +perimeter[0].alt + 20,
                                bottom: +perimeter[0].alt - 20
                            }
                            // add geofence to the map
                            danti.map.addProtectedArea(`${bands["Hazard Zones"].data[i].ac}-${i}-${j}`, perimeter, floor, {
                                showLabel: false
                            });
                        }
                    }
                }
            }
        }
        danti.map.setTraffic(traffic);
        // set wind indicator
        if (bands && bands.Wind) {
            if (+bands.Wind.deg === 0) {
                // hide indicator
                wind.hide();
            } else {
                wind.setAngleFrom(bands.Wind.deg);
                wind.setMagnitude(bands.Wind.knot);
                wind.reveal();
            }
        }
        
        // play sound if voice feedback is enabled and max_alert > 2 (red alert)
        if (enable_sound && player.voiceFeedbackEnabled() && danti?.voice) {
            // force reading guidance if the player is not in playback mode
            const isPlaying: boolean = player.isPlaying();
            if (!isPlaying) {
                danti.voice.reset();
            }
            if (!danti.voice.isSpeaking()) {
                const guidance: Guidance = danti?.voice?.getGuidance({
                    ownship: flightData.ownship,
                    traffic: flightData.traffic,
                    bands
                }, { 
                    include_altitude: true,
                    altitude_kind: "relative",
                    suppressRepeatedAlerts: isPlaying 
                });
                if (guidance) {
                    danti.voice.readGuidance({ guidance }, { force: !isPlaying }); // async call
                }
            } else {
                console.log(`[danti] Skipping guidance (already speaking)`);
            }
        }

        // render plots
        if (INCLUDE_PLOTS) {
            const step: number = player.getCurrentSimulationStep();
            const time: string = player.getCurrentSimulationTime();    
            plot({ ownship: { gs: airspeed, vs: vspeed / 100, alt, hd: heading }, bands, step, time });
        }
    }
}

/**
 * List of available plots
 */
const daaPlots: { id: string, name: string, units: string }[] = [
    { id: "heading-bands", units: "deg", name: "Heading Bands" },
    { id: "horizontal-speed-bands", units: "knot", name: "Horizontal Speed Bands" },
    { id: "vertical-speed-bands", units: "fpm", name: "Vertical Speed Bands" },
    { id: "altitude-bands", units: "ft", name: "Altitude Bands" }
];
/**
 * Utility function, computes the appropriate trace length for a given NMI zoom level
 */
function getTraceLen (nmi: number): number {
    const val: number = Math.floor(utils.DEFAULT_MAX_TRACE_LEN * nmi / 2);
    return val > MAX_TRACE_LEN ? MAX_TRACE_LEN : val;
}
/**
 * Plot function
 */
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
    widescreen: enable_widescreen,
    engine: "leafletjs",
    trafficTraceVisible: true,
    maxTraceLen: MAX_TRACE_LEN,
    layeringMode: LayeringMode.byAlertLevel,
    animate: true,
    duration: UPDATE_FREQUENCY
});
// wind indicator
const wind: WindIndicator = new WindIndicator("wind", {
    top: 690, 
    left: enable_widescreen ? 48 : 195 
}, { parent: "daa-disp"});
// tail number indicator
const tailNumber: TailNumberIndicator = new TailNumberIndicator("tail", {
    top: 100,
    left: enable_widescreen ? 48 : 195
}, { parent: "daa-disp"});
// map heading is controlled by the compass, div names for compass and indicators are taken from the map display so the compass will be rendered under the alerts
const compassDivName: string = map.getCompassDivName();
const indicatorsDivName: string = map.getIndicatorsDivName();
const ownshipDivName: string = map.getOwnshipDivName();
const compass: Compass = new Compass("compass", {
    top: 110, 
    left: enable_widescreen ? 434 : 210
}, { 
    parent: compassDivName, 
    indicatorsDiv: indicatorsDivName, // indicators will be renderd above traffic and compass
    ownshipDiv: ownshipDivName, // the ownship will be rendered above traffic and compass
    maxWedgeAperture: 15, 
    map, 
    wind, 
    animate: true, 
    duration: UPDATE_FREQUENCY
});
// map zoom is controlled by nmiSelector
const hscale: HScale = new HScale("hscale", {
    top: enable_widescreen ? 851 : 800, 
    left: enable_widescreen ? 7 : 13, 
    width: enable_widescreen ? MAP_WIDESCREEN_WIDTH : DEFAULT_MAP_WIDTH - PADDING
}, { parent: "daa-disp", map, compass, hScroll: false });
// map view options
const viewOptions: ViewOptions = new ViewOptions("view-options", { 
    top: enable_widescreen ? -44 : 0, 
    left: enable_widescreen ? 7 : 13, 
    width: enable_widescreen ? MAP_WIDESCREEN_WIDTH : DEFAULT_MAP_WIDTH - PADDING }, {
    labels: [
        "nrthup", "vfr-map", "call-sign", "contours", "hazard-zones"
    ], parent: "daa-disp", compass, map });
// sounds
const daaVoice: DaaVoice = new DaaVoice();
// create remaining display widgets
const airspeedTape = new AirspeedTape("airspeed", { top: 100, left: enable_widescreen ? 194 : 100 }, { parent: "daa-disp", maxWedgeAperture: 50 });
const altitudeTape = new AltitudeTape("altitude", { top: 100, left: enable_widescreen ? 1154 : 833 }, { parent: "daa-disp", maxWedgeAperture: 300 });
const verticalSpeedTape = new VerticalSpeedTape("vertical-speed", { top: 210, left: enable_widescreen ? 1308 : 981 }, { parent: "daa-disp", verticalSpeedRange: 2000, maxWedgeAperture: 500 });
const player: DAAPlayer = new DAAPlayer();
let lastSimulationStep: number = 0;
player.define("step", async () => {
    const step = player.getCurrentSimulationStep();
    // reset map if we are jumping to different simulation steps (needed because of the traces, no need to reset the other widgets)
    if (Math.abs(step - lastSimulationStep) > 1) {
        map.resetAirspace();
    }
    // save last simulation step
    lastSimulationStep = player.getCurrentSimulationStep();
    // use animation only when speed is real time and player is playing -- TODO: improve APIS, use animate to toggle animation on/off in the widgets, and duration to set the animation duration
    const isPlaying: boolean = player.getSpeed() === 1 && player.isPlaying();
    const animationDuration: number = isPlaying ? 1 : 0;
    compass?.animationDuration(animationDuration);
    // render
    render({
        map: map, compass: compass, airspeedTape: airspeedTape, 
        altitudeTape: altitudeTape, verticalSpeedTape: verticalSpeedTape,
        voice: daaVoice
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
    // apply view options
    viewOptions.applyCurrentViewOptions();
    player.applyCurrentResolutionOptions();
    // reset map (needed because of the traces), no need to reset the others
    map.resetAirspace();
    // set initial animation duration and trace length
    const speed: number = player.getSpeed();
    const animationDuration: number = speed === 1 ? 1 : 0;
    compass?.animationDuration(animationDuration);
    const nmi: number = map.getZoomLevel();
    map.setMaxTraceLength(getTraceLen(nmi));
    // reset voice
    daaVoice?.reset();
});
//TODO: implement a function plotAll in spectrogram
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
            plot({ ownship: { hd, gs, vs, alt }, bands: bandsData, step, time: player.getTimeAt(step) });
        }, step);
    }
});
async function createPlayer(args: DaaConfig): Promise<void> {
    if (INCLUDE_PLOTS) {
        player.appendSimulationPlot({
            id: "alerts",
            width: 1100,
            label: "Alerts",
            range: { from: 1, to: 3 },
            parent: "simulation-plot"
        }, {
            overheadLabel: true
        });
        player.appendSimulationPlot({
            id: "heading-bands",
            top: 150,
            width: 1100,
            label: "Heading Bands",
            range: { from: 0, to: 360 },
            units: "[deg]",
            parent: "simulation-plot"
        });
        player.appendSimulationPlot({
            id: "horizontal-speed-bands",
            top: 300,
            width: 1100,
            label: "Horizontal Speed Bands",
            range: { from: 0, to: 1000 },
            units: "[knot]",
            parent: "simulation-plot"
        });
        player.appendSimulationPlot({
            id: "vertical-speed-bands",
            top: 450,
            width: 1100,
            label: "Vertical Speed Bands",
            range: { from: -10000, to: 10000 },
            units: "[fpm]",
            parent: "simulation-plot"
        });
        player.appendSimulationPlot({
            id: "altitude-bands",
            top: 600,
            width: 1100,
            label: "Altitude Bands",
            range: { from: -200, to: 60000 },
            units: "[ft]",
            parent: "simulation-plot"
        });
    }
    player.appendNavbar();
    player.appendSidePanelView();
    await player.appendScenarioSelector();
    await player.appendWindSettings({ selector: "daidalus-wind", dropDown: false });
    await player.appendDaaVersionSelector({ selector: "daidalus-version" });
    await player.appendDaaConfigurationSelector({ selector: "daidalus-configuration" });
    await player.selectDaaConfiguration("DO_365A_no_SUM");
    player.appendSimulationControls({
        parent: "simulation-controls",
        displays: [ "daa-disp" ]
    });
    if (INCLUDE_PLOTS) {
        player.appendPlotControls({
            parent: "simulation-controls",
            top: 48
        });
    }
    player.appendActivationPanel({
        parent: "activation-controls"
    });
    player.appendWedgePersistenceControls({
        parent: "simulation-controls",
        top: -526,
        left: 1300,
        width: 400,
        callback: () => {
            render({
                map: map, compass: compass, airspeedTape: airspeedTape, 
                altitudeTape: altitudeTape, verticalSpeedTape: verticalSpeedTape,
                voice: daaVoice
            });
        }
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
    }, { parent: "simulation-controls", top: -478, left: 1300 });
    player.appendVoiceFeedbackControls({
        parent: "simulation-controls",
        top: -748,
        left: 1300,
        width: 400,
        voices: daaVoice?.getVoiceDescriptors(),
        styles: daaVoice?.getGuidanceDescriptors()
    });
    // install relevant backbone handlers
    player.on(PlayerEvents.DidToggleDaaVoiceFeedback, (evt: DidToggleDaaVoiceFeedback) => {
        const enabled: boolean = evt?.enabled;
        daaVoice?.enableGuidace(enabled);
    });
    player.on(PlayerEvents.DidChangeDaaGuidanceKind, (evt: DidChangeDaaAuralGuidance) => {
        const selected: string = evt?.selected;
        daaVoice?.selectGuidance(selected);
    });
    player.on(PlayerEvents.DidChangeDaaVoice, (evt: DidChangeDaaVoiceName) => {
        const selected: string = evt?.selected;
        daaVoice?.selectVoice(selected);
    });
    player.on(PlayerEvents.DidChangeDaaVoicePitch, (evt: DidChangeDaaVoicePitch) => {
        const selected: number = evt?.selected;
        daaVoice?.selectPitch(selected);
    });
    player.on(PlayerEvents.DidChangeDaaVoiceRate, (evt: DidChangeDaaVoiceRate) => {
        const selected: number = evt?.selected;
        daaVoice?.selectRate(selected);
    });
    player.on(PlayerEvents.DidChangeSimulationSpeed, (evt: DidChangeSimulationSpeed) => {
        const speed: number = evt?.sec;
        const animationDuration: number = speed === 1 ? 1 : 0;
        compass?.animationDuration(animationDuration);
        const nmi: number = map.getZoomLevel();
        map.setMaxTraceLength(getTraceLen(nmi));
    });
    // set preferred options
    player.enableWedgeApertureOption("compass");
    player.enableWedgeApertureOption("airspeed");
    player.enableWedgeApertureOption("altitude");
    player.enableWedgeApertureOption("vspeed");
    player.enableWedgePersistence();
    player.selectGuidance(GuidanceKind['RTCA DO-365']);
    player.setSpeed(1);
    await player.activate();

    // auto-load scenario+config if they are specified in the browser
    if (args) {
        if (args.scenario) { player.selectScenario(args.scenario); }
        if (args.config) { await player.selectDaaConfiguration(args.config); }
        await player.loadSelectedScenario();
    }
}
if (enable_widescreen) {
    $("#daa-theme").css("display", "block");
    $("#main-frame").css({ "margin-left": 92, "margin-top": 102, "transform-origin": "top left", "transform": "scale(0.5)" });
    $("#daa-cockpit").css("top", 150);
    $("#daa-panel").css({ top: 1200, left: 0, transform: "scale(1.38)" });
    $("#daidalus-wind").css("margin-left", 1106);
}
const args: DaaConfig = parseDaaConfigInBrowser();
if (args) {
    console.log(args);
}
createPlayer(args);
