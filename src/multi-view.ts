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
import { ViewOptions } from './daa-displays/daa-view-options';
import { WindIndicator } from './daa-displays/daa-wind-indicator';

import { DAAMultiView } from './daa-displays/daa-multi-view';
import { DAAPlayer, DidChangeDaaConfiguration, DidChangeDaaVersion, DidChangeDaaScenarioSelection, PlayerEvents } from './daa-displays/daa-player';

import * as utils from './daa-displays/daa-utils';
import { ConfigData, DaaSymbol, LatLonAlt, LLAData, ScenarioDataPoint } from './daa-displays/utils/daa-types';
import { RenderableDisplay } from './split-view';
import { integratedPlaybackTemplate } from './daa-displays/templates/daa-playback-templates';

const INCLUDE_PLOTS: boolean = true;
const daaPlots: { id: string, name: string, units: string, range: { from: number, to: number } }[] = [
    { id: "heading-bands", units: "deg", name: "Heading Bands", range: { from: 0, to: 360 } },
    { id: "horizontal-speed-bands", units: "knot", name: "Horizontal Speed Bands", range: { from: 0, to: 1000 } },
    { id: "vertical-speed-bands", units: "fpm", name: "Vertical Speed Bands", range: { from: -10000, to: 10000 } },
    { id: "altitude-bands", units: "ft", name: "Altitude Bands", range: { from: -200, to: 60000 } }
];

// useful constants
export const DEFAULT_DAIDALUS_CONFIG: string = "DO_365A_no_SUM";
export const DEFAULT_DAIDALUS_VERSION: string = "DAIDALUSv2.0.2.jar";

// displays
let data: { [index:string]: {
    tailNumber: string, // tail number
    display: RenderableDisplay, // display
    daaConfiguration: string, // daidalus configuration, default is DO_365A_no_SUM
    daaVersion: string // daidalus version, default is DAIDALUSv2.0.2.jar
}} = {};


/**
 * Utility function, renders the display elements
 */
export function render(player: DAAPlayer, display: RenderableDisplay): void {
    const daaSymbols: DaaSymbol[] = [ "daa-target", "daa-traffic-monitor", "daa-traffic-avoid", "daa-alert" ]; // 0..3
    const flightData: LLAData = <LLAData> player.getCurrentFlightData();
    display.map.setPosition(flightData.ownship.s);

    const bands: ScenarioDataPoint = player.getCurrentBands();
    if (bands && !bands.Ownship) { console.warn("Warning: using ground-based data for the ownship"); }
    
    const heading: number = (bands?.Ownship?.acstate?.heading) ? +bands.Ownship.acstate.heading.val : Compass.v2deg(flightData.ownship.v);
    const airspeed: number = (bands?.Ownship?.acstate?.airspeed) ? +bands.Ownship.acstate.airspeed.val : AirspeedTape.v2gs(flightData.ownship.v);
    const vspeed: number = +flightData.ownship.v.z / 100; // airspeed tape units is 100fpm
    const alt: number = +flightData.ownship.s.alt;

    display.compass.setCompass(heading);
    display.airspeedTape.setAirSpeed(airspeed, AirspeedTape.units.knots);
    display.verticalSpeedTape.setVerticalSpeed(vspeed);
    display.altitudeTape.setAltitude(alt, AltitudeTape.units.ft);
    // console.log(`Flight data`, flightData);
    if (bands) {
        display.compass.setBands(utils.bandElement2Bands(bands["Heading Bands"]));
        display.airspeedTape.setBands(utils.bandElement2Bands(bands["Horizontal Speed Bands"]), AirspeedTape.units.knots);
        display.verticalSpeedTape.setBands(utils.bandElement2Bands(bands["Vertical Speed Bands"]));
        display.altitudeTape.setBands(utils.bandElement2Bands(bands["Altitude Bands"]), AltitudeTape.units.ft);
        // set resolutions
        display.compass.setBug(bands["Horizontal Direction Resolution"]);
        display.airspeedTape.setBug(bands["Horizontal Speed Resolution"]);
        display.altitudeTape.setBug(bands["Altitude Resolution"]);
        display.verticalSpeedTape.setBug(bands["Vertical Speed Resolution"]);
    }
    // set contours
    display.map.removeGeoFence();
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
                        display.map.addContour(`c-${bands.Contours.data[i].ac}-${i}-${j}`, perimeter, floor, {
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
                        display.map.addProtectedArea(`${bands["Hazard Zones"].data[i].ac}-${i}-${j}`, perimeter, floor, {
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
    display.map.setTraffic(traffic);
    // set wind indicator
    if (bands && bands.Wind) {
        display.windIndicator.setAngleFrom(bands.Wind.deg);
        display.windIndicator.setMagnitude(bands.Wind.knot);
    }
    
    // render plots
    if (INCLUDE_PLOTS) {
        const step: number = player.getCurrentSimulationStep();
        const time: string = player.getCurrentSimulationTime();    
        plot(player, { ownship: { gs: airspeed, vs: vspeed / 100, alt, hd: heading }, bands, step, time });
    }
    // plot(player, { ownship: { gs: airspeed, vs: vspeed, alt, hd: heading }, bands, step: splitView.getCurrentSimulationStep(), time: splitView.getCurrentSimulationTime() });
}

/**
 * Plot function
 */
function plot (player: DAAPlayer, desc: { ownship: { gs: number, vs: number, alt: number, hd: number }, bands: ScenarioDataPoint, step: number, time: string }) {
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

/**
 * Utility function, creates the display elements
 */
function createDisplay (index: number, tailNumber: string, opt?: { daaVersion: string, daaConfiguration: string, createMap?: boolean }): void {
    const parent: string = `daa-disp-${index}`;
    // interactive maps
    const map: InteractiveMap = new InteractiveMap(`map-${index}`, { 
        top: 2, 
        left: 6
    }, { 
        parent, 
        engine: opt?.createMap === false ? "blank" : "leafletjs"
    });
    // wind indicator
    const wind: WindIndicator = new WindIndicator(`wind-${index}`, { top: 690, left: 195 }, { parent });
    // map heading is controlled by the compass
    const compass: Compass = new Compass(`compass-${index}`, { top: 110, left: 215 }, { parent, map, wind });
    // map zoom is controlled by nmiSelector
    const hscale: HScale = new HScale(`hscale-${index}`, { top: 800, left: 13 }, { parent, map, compass });
    // map view options
    const viewOptions: ViewOptions = new ViewOptions(`view-options-${index}`, { top: 4, left: 13 }, { 
        labels: [
            "nrthup", "call-sign", "vfr-map", "contours", "hazard-zones"
        ], parent, compass, map
    });
    const airspeedTape: AirspeedTape = new AirspeedTape(`airspeed-${index}`, { top: 100, left: 100 }, { parent });
    const altitudeTape: AltitudeTape = new AltitudeTape(`altitude-${index}`, { top: 100, left: 833 }, { parent });
    const verticalSpeedTape: VerticalSpeedTape = new VerticalSpeedTape(`vertical-speed-${index}`, { top: 210, left: 981 }, { parent, verticalSpeedRange: 2000 });
    // save widgets in displays
    data[index] = {
        tailNumber,
        display: { map, windIndicator: wind, compass, hscale, viewOptions, airspeedTape, altitudeTape, verticalSpeedTape },
        daaConfiguration: opt?.daaConfiguration || DEFAULT_DAIDALUS_CONFIG,
        daaVersion: opt?.daaVersion || DEFAULT_DAIDALUS_VERSION
    };
}

// create a new multi-view instance
const multiView: DAAMultiView = new DAAMultiView(0, {
    parent: "#daa-cockpit"
});

// utility function, creates the displays
async function createDisplays (tailNumbers: string[], opt?: { createMap?: boolean }): Promise<void> {
    // re-create all displays
    for (let i = 0; i < tailNumbers?.length; i++) {
        // create display
        createDisplay(i, tailNumbers[i], { ...data[i], createMap: opt?.createMap });
        // create player
        const player: DAAPlayer = multiView.getPlayer(i);
        // select the current daidalus configuration in the DOM
        await player.selectDaaConfiguration(data[i].daaConfiguration);
        // select the current daidalus version in the DOM
        player.selectDaaVersion(data[i].daaVersion);
        // attach init handler
        player.define("init", async () => {
            await player.exec({
                alertingLogic: player.readSelectedDaaVersion(), //"DAAtoPVS-1.0.1.jar",
                alertingConfig: player.readSelectedDaaConfiguration(),
                scenario: multiView.getSelectedScenario(),
                wind: player.getSelectedWind(),
                ownshipName: tailNumbers[i]
            });
            data[i]?.display?.viewOptions?.applyCurrentViewOptions();
        });
        // attach step handler
        player.define("step", async () => {
            render(player, data[i]?.display);
        });
        // attach plot handler
        player.define("plot", () => {
            const flightData: LLAData[] = player.getFlightData();
            for (let step = 0; step < flightData?.length; step++) {
                const bands: ScenarioDataPoint = player.getCurrentBands(step);
                player.setTimerJiffy("plot", () => {
                    const time: string = multiView.getTimeAt(step);
                    const lla: LLAData = flightData[step];
                    const hd: number = Compass.v2deg(lla.ownship.v);
                    const gs: number = AirspeedTape.v2gs(lla.ownship.v);
                    const vs: number = +lla.ownship.v.z;
                    const alt: number = +lla.ownship.s.alt;
                    plot(player, { ownship: { hd, gs, vs: vs / 100, alt }, bands, step, time });
                }, 8 * step);
            }
        });
        // listen to relevant backbone events
        const didChangeConfigurationHandler = (evt: DidChangeDaaConfiguration) => {
            if (evt?.configName) {
                console.log(`[multi-view] Player ${i} selected daidalus configuration ${evt.configName}`);
                data[i].daaConfiguration = evt.configName;
            }
        }
        const didChangeDaaVersionHandler = (evt: DidChangeDaaVersion) => {
            if (evt?.versionName) {
                console.log(`[multi-view] Player ${i} selected daidalus version ${evt.versionName}`);
                data[i].daaVersion = evt.versionName;
            }
        }
        // turn off all events
        player.off();
        // re-install the events
        player.on(PlayerEvents.DidChangeDaaConfiguration, (evt: DidChangeDaaConfiguration) => {
            didChangeConfigurationHandler(evt);
        });
        player.on(PlayerEvents.DidChangeDaaVersion, (evt: DidChangeDaaVersion) => {
            didChangeDaaVersionHandler(evt);
        });
        // append simulation plots
        const plotParent: string = `simulation-plot-${i}`;
        const plotWidth: number = 1200; // px
        player.appendSimulationPlot({
            id: "alerts",
            width: plotWidth,
            label: "Alerts",
            range: { from: 1, to: 3 },
            player: multiView,
            parent: plotParent
        }, {
            overheadLabel: true
        });
        player.appendSimulationPlot({
            id: "heading-bands",
            top: 150,
            width: plotWidth,
            label: "Heading Bands",
            range: { from: 0, to: 360 },
            units: "[deg]",
            player: multiView,
            parent: plotParent
        });
        player.appendSimulationPlot({
            id: "horizontal-speed-bands",
            top: 300,
            width: plotWidth,
            label: "Horizontal Speed Bands",
            range: { from: 0, to: 1000 },
            units: "[knot]",
            player: multiView,
            parent: plotParent
        });
        player.appendSimulationPlot({
            id: "vertical-speed-bands",
            top: 450,
            width: plotWidth,
            label: "Vertical Speed Bands",
            range: { from: -10000, to: 10000 },
            units: "[fpm]",
            player: multiView,
            parent: plotParent
        });
        player.appendSimulationPlot({
            id: "altitude-bands",
            top: 600,
            width: plotWidth,
            label: "Altitude Bands",
            range: { from: -200, to: 60000 },
            units: "[ft]",
            player: multiView,
            parent: plotParent
        });
    }
    // listen to relevant backbone events
    const didChangeDaaScenarioHandler = async (evt: DidChangeDaaScenarioSelection) => {
        if (evt?.selectedScenario) {
            const tailNumbers: string[] = await multiView.getTailNumbers(evt.selectedScenario);
            console.log(`[multi-view] DidChangeScenarioSelection`, { evt, tailNumbers });
            createMultiView (tailNumbers, { createMap: false });
        }
    };
    multiView.off();
    multiView.on(PlayerEvents.DidChangeDaaScenarioSelection, async (evt: DidChangeDaaScenarioSelection) => {
        didChangeDaaScenarioHandler(evt);
    });
}

async function createMultiView (tailNumbers: string[], opt?: { createMap?: boolean }): Promise<void> {
    // delete previous displays data if the tail numbers are different
    const previousTailNumbers: string[] = multiView.getCurrentTailNumbers();
    if (previousTailNumbers?.length === tailNumbers?.length) {
        let newTailNumbers: boolean = false;
        for (let i = 0; i < previousTailNumbers.length && !newTailNumbers; i++) {
            if (!previousTailNumbers.includes(tailNumbers[i])) {
                console.log("[multi-view] Resetting display data...");
                newTailNumbers = true;
            }
        }
        if (newTailNumbers) {
            data = {};
        }
    }
    multiView.setTailNumbers(tailNumbers);

    // create configuration cols in the sidebar
    multiView.createConfigurationAttributesViews();
    // re-create well-clear selectors
    await multiView.appendDaaVersionSelector();
    // multiView.selectWellClearVersion("DAIDALUSv2.0.2.jar");
    await multiView.appendDaaConfigurationSelector();
    // re-create all displays
    createDisplays(tailNumbers, opt);
    // append simulation controls
    // multiView.appendSimulationControls({
    //     htmlTemplate: integratedPlaybackTemplate,
    //     parent: ".navbar-integrated-simulation-controls"//"simulation-controls"
    // });
    // multiView.appendActivationPanel({
    //     parent: ".navbar-integrated-simulation-controls",//"activation-controls"
    //     width: 1500
    // });
    // if (INCLUDE_PLOTS) {
    //     multiView.appendPlotControls({
    //         parent: ".navbar-integrated-plot-controls"//"simulation-controls"
    //     });
    // }
    // re-attach mode handlers
    multiView.setNormalModeHandler(() => {
        normalMode(tailNumbers.length);
    });
    multiView.setDeveloperModeHandler(async () => {
        await developerMode(tailNumbers.length);
    });
}

// the display elements need to be re-created every time a new scenario will be loaded
multiView.define("createMultiView", async (tailNumbers: string[]) => {
    await createMultiView(tailNumbers);
});

// -- normal mode
function normalMode (nDisplays: number) {
    for (let i = 0; i < nDisplays; i++) {
        data[i].display.airspeedTape?.defaultUnits();
        data[i].display.airspeedTape?.hideUnits();
        data[i].display.airspeedTape?.defaultStep();
        data[i].display.airspeedTape?.enableTapeSpinning();

        data[i].display.altitudeTape?.defaultUnits();
        data[i].display.altitudeTape?.hideUnits();
        data[i].display.altitudeTape?.defaultStep();
        data[i].display.altitudeTape?.enableTapeSpinning();

        data[i].display.verticalSpeedTape?.defaultUnits();
        data[i].display.verticalSpeedTape?.hideUnits();
        data[i].display.verticalSpeedTape?.hideValueBox();
        data[i].display.verticalSpeedTape?.defaultRange();
    }
}

// -- developer mode
async function developerMode (nDisplays: number): Promise<void> {
    for (let i = 0; i < nDisplays; i++) {
        const configData: ConfigData = await multiView.getPlayer(i).loadSelectedConfiguration();

        if (configData) {
            data[i].display.airspeedTape?.setUnits(configData["horizontal-speed"].units);
            data[i].display.airspeedTape?.setRange(configData["horizontal-speed"]);
            data[i].display.airspeedTape?.revealUnits();
            data[i].display.airspeedTape?.disableTapeSpinning();

            data[i].display.altitudeTape?.setUnits(configData.altitude.units);
            data[i].display.altitudeTape?.setRange(configData.altitude);
            data[i].display.altitudeTape?.revealUnits();
            data[i].display.altitudeTape?.disableTapeSpinning();

            data[i].display.verticalSpeedTape?.setUnits(configData["vertical-speed"].units);
            data[i].display.verticalSpeedTape?.revealUnits();
            data[i].display.verticalSpeedTape?.setRange(configData["vertical-speed"]);
            data[i].display.verticalSpeedTape?.showValueBox();
        } else {
            console.warn(`[split-view] developerMode / player ${i} -- config data is null`);
        }
    }
}

async function createPlayer (opt?: { loadDefaultConfiguration?: boolean }) {
    // activate player
    await multiView.activate({ developerMode: true });
    // append relevant DOM elements    
    multiView.appendNavbar();
    multiView.appendSidePanelView();
    await multiView.appendScenarioSelector();
    // get selected scenario
    const selectedScenario: string = multiView.getSelectedScenario();
    // get tail numbers
    const tailNumbers: string[] = await multiView.getTailNumbers(selectedScenario);
    // create multiview players
    multiView.setTailNumbers(tailNumbers);
    // create displays, one for each tail number
    createDisplays(tailNumbers, { createMap: false });
    
    // await multiView.appendWindSettings({ fromToSelectorVisible: true });
    await multiView.appendDaaVersionSelector();
    await multiView.appendDaaConfigurationSelector();
    // create configuration cols in the sidebar
    multiView.createConfigurationAttributesViews();
    if (opt?.loadDefaultConfiguration) {
        await multiView.selectDaaConfiguration("DO_365A_no_SUM");
    }
    // append simulation controls
    multiView.appendSimulationControls({
        htmlTemplate: integratedPlaybackTemplate,
        parent: ".navbar-integrated-simulation-controls",//"simulation-controls"
        multiplay: [
            { id: "#multi-view-plot", label: "plot" },
            { id: "#multi-view-reset", label: "reset" }
        ]
    });
    multiView.appendActivationPanel({
        parent: ".navbar-integrated-simulation-controls",//"activation-controls"
        width: 1160
    });
    // append plot controls
    if (INCLUDE_PLOTS) {
        multiView.appendPlotControls({
            parent: ".integrated-multiplay-controls", //"simulation-controls"
            reuseParentDiv: true,
            buttons: { plot: "#multi-view-plot", reset: "#multi-view-reset" }
        });
    }
}

createPlayer({ loadDefaultConfiguration: true });
