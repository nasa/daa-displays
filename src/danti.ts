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

import { DaaSymbol, DAA_AircraftDescriptor, DEFAULT_MAP_WIDTH, InteractiveMap, MAP_WIDESCREEN_WIDTH } from './daa-displays/daa-interactive-map';
import { DaaConfig, DAAPlayer, parseDaaConfigInBrowser } from './daa-displays/daa-player';
import { LLAData, ScenarioDataPoint } from './daa-displays/utils/daa-server';

import * as utils from './daa-displays/daa-utils';
import * as serverInterface from './daa-server/utils/daa-server'
import { ViewOptions } from './daa-displays/daa-view-options';
import { Bands, computeBearing, computeNmiDistance } from './daa-displays/daa-utils';
import { DaaVoice } from './daa-displays/daa-voice';
import { LayeringMode } from './daa-displays/daa-map-components/leaflet-aircraft';

// flag indicating whether the display should be widescreen
const enable_widescreen: boolean = true;
const enable_sound: boolean = true;
// display padding, used for centering the options and view controls shown at the top/bottom of the danti display
const PADDING: number = 13; //px
const INCLUDE_PLOTS: boolean = true;
// voice options
const voiceName: string = "Samantha";
const voiceVolume: number = 50;
const voiceRate: number = 1.1;
/**
 * Utility function, renders the display content
 */
function render (danti: {
    map: InteractiveMap, 
    compass: Compass, 
    airspeedTape: AirspeedTape, 
    altitudeTape: AltitudeTape, 
    verticalSpeedTape: VerticalSpeedTape,
    sound: DaaVoice
}) {
    const daaSymbols: DaaSymbol[] = [ "daa-target", "daa-traffic-monitor", "daa-traffic-avoid", "daa-alert" ]; // 0..3
    const flightData: LLAData = <LLAData> player.getCurrentFlightData();
    if (flightData && flightData.ownship) {
        danti.map.setPosition(flightData.ownship.s);

        const bands: ScenarioDataPoint = player.getCurrentBands();
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
        let max_alert_aircraft: DAA_AircraftDescriptor = null;
        const traffic: DAA_AircraftDescriptor[] = flightData.traffic.map((data, index) => {
            const alert_level: number = (bands?.Alerts?.alerts && bands.Alerts.alerts[index]) ? bands.Alerts.alerts[index].alert_level : 0;
            const desc: DAA_AircraftDescriptor = {
                callSign: data.id,
                s: data.s,
                v: data.v,
                symbol: daaSymbols[alert_level]
            };
            if (alert_level > max_alert) {
                max_alert = alert_level;
                max_alert_aircraft = desc;
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
                        const perimeter: serverInterface.LatLonAlt[] = bands.Contours.data[i].polygons[j];
                        if (perimeter && perimeter.length) {
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
                        const perimeter: serverInterface.LatLonAlt[] = bands["Hazard Zones"].data[i].polygons[j];
                        if (perimeter && perimeter.length) {
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
            wind.setAngleFrom(bands.Wind.deg);
            wind.setMagnitude(bands.Wind.knot);
        }
        
        // play sound if voice feedback is enabled and max_alert > 2 (red alert)
        if (enable_sound && max_alert > 2) {
            voiceFeedback(danti?.sound, flightData, max_alert_aircraft, { altitude_type: "absolute" });
        } else {
            player.voiceFeedback("");
        }
        if (INCLUDE_PLOTS) {
            const step: number = player.getCurrentSimulationStep();
            const time: string = player.getCurrentSimulationTime();    
            plot({ ownship: { gs: airspeed, vs: vspeed / 100, alt, hd: heading }, bands, step, time });
        }
    }
}

/**
 * Voice feedback for DANTi
 * Example: "Traffic, eleven o'clock, one-zero miles, southbound, converging, Boeing Seven Twenty Seven, one seven thousand."
 * See example ATC phraseology at https://www.faa.gov/air_traffic/publications/atpubs/atc_html/chap2_section_1.html
 */
function voiceFeedback (voice: DaaVoice, flightData: LLAData, max_alert_aircraft: DAA_AircraftDescriptor, opt?: {
    altitude_type?: "relative" | "absolute"
}) {
    if (voice && flightData) {
        if (max_alert_aircraft) {
            // text used to introduce pauses in the electronic speech
            const pause: string = `... ... ... ...`;

            // relative heading position of the intruder
            const ownship_heading: number = utils.rad2deg(Math.atan2(+flightData.ownship.v.x, +flightData.ownship.v.y));
            const bearing: number = computeBearing({
                lat: +flightData.ownship.s.lat,
                lon: +flightData.ownship.s.lon
            }, {
                lat: +max_alert_aircraft.s.lat,
                lon: +max_alert_aircraft.s.lon
            });
            const relative_bearing: number = ((((bearing - ownship_heading) % 360) + 360) % 360);
            console.log({ relative_bearing, bearing, heading: ownship_heading });
            let relative_heading: string = ((relative_bearing / 360) * 12).toFixed(0);
            if (relative_heading === "0") { relative_heading = "12"; }
            // feedback for heading position
            const relative_heading_msg: string = `${relative_heading} o'clock`;
            const relative_heading_txt: string = `${relative_heading} o'clock`;

            // distance between the aircraft
            const distance: string = computeNmiDistance({
                lat: +flightData.ownship.s.lat,
                lon: +flightData.ownship.s.lon
            }, {
                lat: +max_alert_aircraft.s.lat,
                lon: +max_alert_aircraft.s.lon
            }).toFixed(1);
            // feedback for distance -- round the number to the nearest integer if distance > 1NM, otherwise use two digits accuracy
            const distance_msg: string = `${voice.readNumber(+distance > 1 ? Math.round(+distance) : +distance, { pause })} miles`;
            const distance_txt: string = `${+distance > 1 ? Math.round(+distance) : +distance} miles`;

            // feedback for direction
            const traffic_direction: number = utils.rad2deg(Math.atan2(+max_alert_aircraft.v.x, +max_alert_aircraft.v.y));
            const direction_msg: string = voice.readDirection(+traffic_direction);
            const direction_txt: string = direction_msg;

            // altitude of the intruder
            // option 1: absolute altitude, e.g., one-seven thousands
            // option 2: relative altitude, e.g., one thousand feet below you
            const alt: { absolute: number, relative: number } = {
                absolute: +max_alert_aircraft.s.alt,
                relative: +max_alert_aircraft.s.alt - +flightData.ownship.s.alt 
            }; // altitude, in ft
            const altitude_type: "relative" | "absolute" = opt?.altitude_type || "absolute";
            const altitude: number = altitude_type === "absolute" ? alt.absolute : Math.abs(alt.relative);
            // feedback for altitude, number is rounded to 100xft
            let altitude_msg: string = `${voice.readNumber(Math.floor(altitude / 100) * 100, { pause })}`; // feet is often omitted for brevity
            let altitude_txt: string = `${Math.floor(altitude / 100) * 100}`;
            if (altitude_type === "relative") {
                altitude_msg += alt.relative < 0 ? " feet below you " : " feet above you ";
                altitude_txt += alt.relative < 0 ? " feet below you " : " feet above you ";
            }

            // info from flight data
            const info: string = `Traffic, ${relative_heading} o'clock, ${distance} NMI, ${altitude} ft`;

            // feedback message read to the pilot by the electronic voice
            const msg: string = `Traffic ${pause} ${relative_heading_msg} ${pause} ${distance_msg} ${pause} ${direction_msg} ${pause} ${altitude_msg}`; // e.g., traffic, 2 o'clock, 3 miles, 8000 ft
            const txt: string = `Traffic, ${relative_heading_txt}, ${distance_txt}, ${direction_txt}, ${altitude_txt}`;
            
            // write aural annunciation in output message box
            player.voiceFeedback(txt);
            console.log({ info, msg });
            // read message if voice feedback is enabled
            if (enable_sound && player.voiceFeedbackIsEnabled()) {
                voice?.speak(msg, { voice: voiceName, volume: voiceVolume, rate: voiceRate });
            }
        } else {
            if (enable_sound) {
                voice?.ping();
            }
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
    layeringMode: LayeringMode.byAlertLevel
});
// wind indicator
const wind: WindIndicator = new WindIndicator("wind", {
    top: 690, 
    left: enable_widescreen ? 48 : 195 
}, { parent: "daa-disp"});
// map heading is controlled by the compass
const compassDivName: string = map.getCompassDivName();
const indicatorsDivName: string = map.getIndicatorsDivName();
const compass: Compass = new Compass("compass", { top: 110, left: enable_widescreen ? 434 : 210 }, { parent: compassDivName, indicatorsDiv: indicatorsDivName, maxWedgeAperture: 15, map: map });
// map zoom is controlled by nmiSelector
const hscale: HScale = new HScale("hscale", {
    top: enable_widescreen ? 851 : 800, 
    left: enable_widescreen ? 7 : 13, 
    width: enable_widescreen ? MAP_WIDESCREEN_WIDTH : DEFAULT_MAP_WIDTH - PADDING
}, { parent: "daa-disp", map, compass });
// map view options
const viewOptions: ViewOptions = new ViewOptions("view-options", { 
    top: enable_widescreen ? -44 : 0, 
    left: enable_widescreen ? 7 : 13, 
    width: enable_widescreen ? MAP_WIDESCREEN_WIDTH : DEFAULT_MAP_WIDTH - PADDING }, {
    labels: [
        "nrthup", "vfr-map", "call-sign", "contours", "hazard-zones"
    ], parent: "daa-disp", compass, map });
// sounds
const sound: DaaVoice = new DaaVoice();
// create remaining display widgets
const airspeedTape = new AirspeedTape("airspeed", { top: 100, left: enable_widescreen ? 194 : 100 }, { parent: "daa-disp", maxWedgeAperture: 50 });
const altitudeTape = new AltitudeTape("altitude", { top: 100, left: enable_widescreen ? 1154 : 833 }, { parent: "daa-disp", maxWedgeAperture: 300 });
const verticalSpeedTape = new VerticalSpeedTape("vertical-speed", { top: 210, left: enable_widescreen ? 1308 : 981 }, { parent: "daa-disp", verticalSpeedRange: 2000, maxWedgeAperture: 500 });
const player: DAAPlayer = new DAAPlayer();
player.define("step", async () => {
    render({
        map: map, compass: compass, airspeedTape: airspeedTape, 
        altitudeTape: altitudeTape, verticalSpeedTape: verticalSpeedTape,
        sound
    });
});
player.define("init", async () => {
    // compute java output
    await player.exec({
        alertingLogic: player.getSelectedWellClearVersion(), //"DAAtoPVS-1.0.1.jar",
        alertingConfig: player.getSelectedConfiguration(),
        scenario: player.getSelectedScenario(),
        wind: player.getSelectedWindSettings()
    });
    viewOptions.applyCurrentViewOptions();
    player.applyCurrentResolutionOptions();
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
    await player.appendWellClearVersionSelector({ selector: "daidalus-version" });
    await player.appendWellClearConfigurationSelector({ selector: "daidalus-configuration" });
    await player.selectConfiguration("DO_365A_no_SUM");
    player.appendSimulationControls({
        parent: "simulation-controls",
        displays: [ "daa-disp" ]
    });
    if (INCLUDE_PLOTS) {
        player.appendPlotControls({
            parent: "simulation-controls",
            top: 47
        });
    }
    player.appendActivationPanel({
        parent: "activation-controls"
    });
    player.appendResolutionControls({
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
    }, { top: -64, left: 752 });
    player.appendVoiceFeedbackControls({
        parent: "simulation-controls",
        top: 93
    });
    player.appendWedgePersistenceControls({
        parent: "simulation-controls",
        top: 140,
        width: 308,
        callback: () => {
            render({
                map: map, compass: compass, airspeedTape: airspeedTape, 
                altitudeTape: altitudeTape, verticalSpeedTape: verticalSpeedTape,
                sound
            });
        }
    });
    player.enableWedgeApertureOption("compass");
    player.enableWedgeApertureOption("airspeed");
    player.enableWedgeApertureOption("altitude");
    player.enableWedgeApertureOption("vspeed");
    player.enableWedgePersistence();
    await player.activate();

    // auto-load scenario+config if they are specified in the browser
    if (args) {
        if (args.scenario) { player.selectScenario(args.scenario); }
        if (args.config) { await player.selectConfiguration(args.config); }
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
