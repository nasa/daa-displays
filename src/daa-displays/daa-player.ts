/* eslint-disable no-async-promise-executor */
/**
 * @module DAAPlayer
 * @version 2.0.0
 * @author Paolo Masci
 * @date October 2018
 * @description Playback Player, provides functions for the execution of scenario-based simulation runs. 
 *              Scenarios include information necessary to feed the functional logic
 *              of the prototype, e.g., position and velocity of ownship and traffic.
 *              This information can be based on pre-recorded real flight data, 
 *              or can be manually crafted to capture specific situations. 
 *              A front-end is provided to support interactive simulations, 
 *              with the usual controls start/pause/resume simulation. 
 *              Logging functions are provided to enable off-line analysis of simulation 
 *              traces.
 * @copyright 
 * Copyright 2016 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration. No
 * copyright is claimed in the United States under Title 17, 
 * U.S. Code. All Other Rights Reserved.
 * <br>
 * Disclaimers
 * <br>
 * No Warranty: THE SUBJECT SOFTWARE IS PROVIDED "AS IS" WITHOUT ANY
 * WARRANTY OF ANY KIND, EITHER EXPRESSED, IMPLIED, OR STATUTORY,
 * INCLUDING, BUT NOT LIMITED TO, ANY WARRANTY THAT THE SUBJECT SOFTWARE
 * WILL CONFORM TO SPECIFICATIONS, ANY IMPLIED WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR FREEDOM FROM
 * INFRINGEMENT, ANY WARRANTY THAT THE SUBJECT SOFTWARE WILL BE ERROR
 * FREE, OR ANY WARRANTY THAT DOCUMENTATION, IF PROVIDED, WILL CONFORM TO
 * THE SUBJECT SOFTWARE. THIS AGREEMENT DOES NOT, IN ANY MANNER,
 * CONSTITUTE AN ENDORSEMENT BY GOVERNMENT AGENCY OR ANY PRIOR RECIPIENT
 * OF ANY RESULTS, RESULTING DESIGNS, HARDWARE, SOFTWARE PRODUCTS OR ANY
 * OTHER APPLICATIONS RESULTING FROM USE OF THE SUBJECT SOFTWARE.
 * FURTHER, GOVERNMENT AGENCY DISCLAIMS ALL WARRANTIES AND LIABILITIES
 * REGARDING THIRD-PARTY SOFTWARE, IF PRESENT IN THE ORIGINAL SOFTWARE,
 * AND DISTRIBUTES IT "AS IS."
 * <br>
 * Waiver and Indemnity: RECIPIENT AGREES TO WAIVE ANY AND ALL CLAIMS
 * AGAINST THE UNITED STATES GOVERNMENT, ITS CONTRACTORS AND
 * SUBCONTRACTORS, AS WELL AS ANY PRIOR RECIPIENT.  IF RECIPIENT'S USE OF
 * THE SUBJECT SOFTWARE RESULTS IN ANY LIABILITIES, DEMANDS, DAMAGES,
 * EXPENSES OR LOSSES ARISING FROM SUCH USE, INCLUDING ANY DAMAGES FROM
 * PRODUCTS BASED ON, OR RESULTING FROM, RECIPIENT'S USE OF THE SUBJECT
 * SOFTWARE, RECIPIENT SHALL INDEMNIFY AND HOLD HARMLESS THE UNITED
 * STATES GOVERNMENT, ITS CONTRACTORS AND SUBCONTRACTORS, AS WELL AS ANY
 * PRIOR RECIPIENT, TO THE EXTENT PERMITTED BY LAW.  RECIPIENT'S SOLE
 * REMEDY FOR ANY SUCH MATTER SHALL BE THE IMMEDIATE, UNILATERAL
 * TERMINATION OF THIS AGREEMENT.
 **/
import * as utils from './daa-utils';
import * as templates from './templates/daa-playback-templates';
import * as monitorTemplates from './templates/daa-monitor-templates';

import { DAASpectrogram } from './daa-spectrogram';
import { DAAClient } from './utils/daa-client';
import { ExecMsg, LLAData, ScenarioDescriptor } from '../daa-server/utils/daa-types';
import { 
    DAAScenario, WebSocketMessage, LoadScenarioRequest, LoadConfigRequest, 
    ConfigFile, ConfigData, FlightData, Alert, AircraftMetrics, ScenarioData, 
    ScenarioDataPoint, OwnshipState, SaveScenarioRequest, ValUnits, GetTailNumbersRequest, DaaServerCommand 
} from './utils/daa-types';

import * as Backbone from 'backbone';
import { GuidanceDescriptor, GuidanceKind, VoiceDescriptor } from './daa-voice';

/**
 * DAA Player events and types
 */
export enum PlayerEvents {
    DidChangeDaaConfiguration = "DidChangeDaaConfiguration",
    DidChangeDaaVersion = "DidChangeDaaVersion",
    DidChangeDaaScenarioSelection = "DidChangeDaaScenarioSelection",
    DidUploadDaaScenarioFile = "DidUploadDaaScenarioFile",
    DidToggleDaaVoiceFeedback = "DidToggleDaaVoiceFeedback",
    DidChangeDaaGuidanceKind = "DidChangeDaaGuidanceKind",
    DidChangeDaaVoice = "DidChangeDaaVoice",
    DidChangeDaaVoicePitch = "DidChangeDaaVoicePitch",
    DidChangeDaaVoiceRate = "DidChangeDaaVoiceRate",
    DidChangeSimulationSpeed = "DidChangeSimulationSpeed"
}
export interface DidChangeDaaConfiguration {
    attributes: string[],
    configName: string
}
export interface DidChangeDaaVersion {
    versionName: string
}
export interface DidChangeDaaScenarioSelection {
    selectedScenario: string
}
export type DidUploadDaaScenarioFile = SaveScenarioRequest;
export type DidToggleDaaVoiceFeedback = { enabled: boolean };
export type DidChangeDaaAuralGuidance = { selected: string };
export type DidChangeDaaVoiceName = { selected: string };
export type DidChangeDaaVoicePitch = { selected: number };
export type DidChangeDaaVoiceRate = { selected: number };
export type DidChangeSimulationSpeed = { sec: number };

/**
 * Resolution handlers that can be defined by the user
 */
export enum ResolutionHandler {
    setCompassWedgeAperture = "setCompassWedgeAperture",
    setAirspeedWedgeAperture = "setAirspeedWedgeAperture",
    setAltitudeWedgeAperture = "setAltitudeWedgeAperture",
    setVerticalSpeedWedgeAperture = "setVerticalSpeedWedgeAperture"
}

export enum MagVarHandler {
    setMagVar = "setMagVar",
    magneticCompass = "magneticCompass"
}

/**
 * DAA Player interfaces
 */
export declare interface DAAPlaybackHandlers {
    init: () => Promise<void>;
    step: () => Promise<void>;
    pause: () => Promise<void>;
    back: () => Promise<void>;
    goto: () => Promise<void>;
    gotoTime: () => Promise<void>;
    speed: () => Promise<void>;
    identify: () => Promise<void>;
}
export declare type InputHandler = (data: string | boolean) => void;
export declare interface Handlers extends DAAPlaybackHandlers {
    daaScenarioReloader: (scenarios: string[]) => Promise<void>;
    daaConfigurationReloader: () => Promise<void>;
    daaVersionReloader: () => Promise<void>;
}
export declare interface PlotDescriptor {
    id: string,
    paused?: boolean,
    ms?: number,
    type?: string,
    units?: string | { from: string, to: string },
    label?: string | { top?: string, left?: string },
    range?: { from: number, to: number },
    top?: number,
    left?: number,
    width?: number,
    height?: number,
    parent?: string,
    player?: DAAPlayer
}
export interface DaaConfig {
	scenario: string,
	config: string
}
/**
 * Utility function, converts a string into a safe DOM selector (the selector should not include "." otherwise jquery interpretes the string as a series of class names)
 * @param str 
 * @returns 
 */
 export function safeSelector(str: string): string {
    if (str) {
        if (str.endsWith(".daa")) {
            str = str.slice(0, -4);
        }
        return str.replace(/\.|\/|\s/g, "-");
    }
    return str;
}
/**
 * Parse arguments indicated in the browser address.
 * Arguments are a search string indicating scenario + configuration
 * e.g., http://localhost:8082/single?H1.daa+2.x/DO_365A_no_SUM.conf
 */
export function parseDaaConfigInBrowser (search?: string): DaaConfig {
    search = search || window?.location?.search || "";
    const args: string[] = search.split("+");
    if (args && args.length > 1) {
        args[0] = args[0].substring(1); // this is necessary to remove the ? at the beginning of the search string
        const ans: DaaConfig = {
            scenario: args[0].trim(),
            config: args[1].trim()
        };
        return ans;
    }
    return null;
}

// useful constants
export const DEFAULT_PLAYER_STEP_INTERVAL: number = 1000; // ms
export const DEFAULT_PLAYER_TIMER_JIFFY: number = 4; //ms
// export const DEFAULT_PLAYER_FRACTIONAL_PRECISION: number = 16; // 16 digits

/**
 * DAA Player class
 */
export class DAAPlayer extends Backbone.Model {
    /**
     * Useful constants
     */
    static readonly prefix: string = "DAIDALUSv";
    static readonly VERSION: string = "2.0.0";
    static readonly timerJiffy: number = DEFAULT_PLAYER_TIMER_JIFFY; // 8ms

    // player ID
    id: string;

    // current simulation step
    protected simulationStep: number;

    /**
     * init, step, render, and plot functions.
     * An implementation of these functions must be provided by the user through player.define
     * e.g., player.define("init", <function defn>)
     */
    init: (args?: unknown) => Promise<void> = async function () { console.warn("[daa-player] Warning: init function has not been defined :/"); };
    step: (args?: unknown) => Promise<void> = async function () { console.warn("[daa-player] Warning: step function has not been defined :/"); };
    render: (args?: unknown) => Promise<void> = async function () { console.warn("[daa-player] Warning: rendering function has not been defined :/"); };
    plot: (args?: unknown) => Promise<void> = async function () { console.error("[daa-player] Warning: plot function has not been defined :/"); };
    
    monitorEventHandlers: { [key: string]: () => void } = {};
    protected ms: number = DEFAULT_PLAYER_STEP_INTERVAL;
    protected speed: number = DEFAULT_PLAYER_STEP_INTERVAL / 1000;
    // protected precision: number = DEFAULT_PLAYER_FRACTIONAL_PRECISION;
    protected ownshipName: string; // ownship tail number, null means default ownship indicated in the scenario (i.e., first aircraft in the list)
    protected _displays: string[] = [];
    protected _scenarios: { [ daaFileName: string ]: DAAScenario } = {};
    protected _bands: ScenarioDescriptor; // bands for the selected scenario
    // protected _los: DAALosDescriptor; @deprecated
    protected _selectedScenario: string = null;
    // protected _selectedWellClear: string;
    protected _simulationLength: number = 0;
    protected _repl: { [key: string]: DAAClient };
    protected _plot: { [plotName:string]: DAASpectrogram };
    protected href: string;
    protected timers: { [ tname: string ]: NodeJS.Timeout } = {};
    protected windowZoomLevel: number = 100;
    readonly minZoomLevel: number = 20;

    // player modes
    protected mode: "developerMode" | "normalMode" = "normalMode";

    /**
     * Utility function, returns the current display mode (normalMode or developerMode)
     */
    getMode (): "developerMode" | "normalMode" {
        return this.mode;
    }
    /**
     * Display modes
     */   
    static readonly modes = {
        developerMode: "developerMode",
        normalMode: "normalMode"
    };
    protected scenarioType: string = "daa"; // "daa" or "ic"

    static readonly colorMap: { [color: string]: string } = {
        "red": "crimson",
        "green": "greenyellow",
        "yellow": "gold"
    };
    
    // internal handlers
    protected _handlers: Handlers = {
        init: () => {
            return new Promise(async (resolve) => {
                this.clearInterval();
                await this.render();
                resolve();
            });
        },
        step: () => {
            return new Promise(async (resolve) => {
                this.clearInterval();
                const current_step: number = this.readCurrentSimulationStep();
                await this.stepControl(current_step);
                resolve();
            });
        },
        pause: () => {
            return new Promise(async (resolve) => {
                this.clearInterval();
                resolve();
            });
        },
        back: () => {
            return new Promise(async (resolve) => {
                const current_step: number = this.readCurrentSimulationStep();
                await this._handlers.pause();
                const prev_step: number = current_step > 0 ? current_step - 1 : current_step;
                await this.gotoControl(prev_step);
                resolve();
            });
        },
        goto: () => {
            return new Promise(async (resolve) => {
                await this._handlers.pause();
                await this.gotoControl();
                resolve();
            });
        },
        gotoTime: () => {
            return new Promise(async (resolve) => {
                const target_time: string = this.readGotoTimeInput();
                await this._handlers.pause();
                await this.gotoTimeControl(target_time);
                resolve();
            });
        },
        speed: () => {
            return new Promise(async (resolve) => {
                const speed: string = this.readSelectedSimulationSpeed();
                this.setSpeed(speed);
                resolve();
            });
        },
        identify: () => {
            return new Promise(async (resolve) => {
                $(".daa-view-splash").css("display", "block").css("opacity", 0.5);
                setTimeout(() => {
                    $(".daa-view-splash").css("display", "none");
                    resolve();
                }, 1600);
            });
        },
        daaScenarioReloader: async (scenarios: string[]) => {
            // define handler for the refresh button
            console.log(`Refreshing scenario list...`);
            this.setStatus('Refreshing scenario list...');
            // const scenarios: string[] = await this.listScenarioFiles();
            if (scenarios && scenarios.length) {
                // if the selected scenario has been removed from the new list, select the first scenario in the list. Otherwise, keep the current selection.
                const scenarioStillExists: boolean = scenarios.some((name) => {
                    return name === this._selectedScenario;
                });
                this._selectedScenario = (scenarioStillExists) ? this._selectedScenario : scenarios[0];
                // await this.loadScenarioFile(this._selectedScenario, { forceReload: true });
            }
            this.refreshSimulationControls();
            // await this.listConfigurations();
            setTimeout(() => {
                this.statusReady();
                console.log(`Done`, scenarios);
            }, 200)
        },
        daaConfigurationReloader: async () => {
            // define handler for the refresh button
            console.log(`Refreshing configuration list...`);
            this.setStatus('Refreshing configurations list...');
            const configurations: string[] = await this.getDaaConfigurations();
            setTimeout(() => {
                this.statusReady();
                console.log(`Done`, configurations);
            }, 200)
        },
        daaVersionReloader: async () => {
            // define handler for the refresh button
            console.log(`Refreshing versions list...`);
            this.setStatus('Refreshing versions list...');
            const versions: string[] = await this.getDaaVersions();
            await this.getDaaConfigurations();
            setTimeout(() => {
                this.statusReady();
                console.log(`Done`, versions);
            }, 200)
        }
    };
    protected _defines: { [fun:string]: (...args: unknown[]) => Promise<void> | void};
    protected _timer_active: boolean;
    protected _simulationControls: {
        htmlTemplate: string,
        parent: string,
        width?: number,
        top?: number,
        left?: number
    };
    protected _loadingScenario: boolean;
    protected activationControlsPresent: boolean = false;

    // _versionCallback: () => void;
    // _configurationCallback: () => void;
    protected bridgedPlayer: DAAPlayer;

    protected _daaVersions: string[];
    protected _daaConfigurations: string[];
    protected client: DAAClient;

    protected daaVersionDomSelector: string = "sidebar-daidalus-version";
    protected daaConfigurationDomSelector: string = "sidebar-daidalus-configuration";
    protected daaAttributesDomSelector: string = "sidebar-daidalus-configuration-attributes";
    protected windDomSelector: string = "sidebar-wind-settings";
    protected monitorDomSelector: string = "daa-monitors";
    protected flightDataDomSelector: string = "daa-traffic";
    protected configInfo: ConfigFile;
    protected daaMonitors: { id: number, name: string, color: string }[] = [];

    // handlers for player modes
    protected developerControls: {
        normalMode?: () => Promise<void> | void,
        developerMode?: () => Promise<void> | void
    } = {};

    /**
     * Utility function, advances the simulation step
     */
    async stepControl (currentStep?: number): Promise<boolean> {
        currentStep = (currentStep !== undefined && currentStep !== null) ? currentStep : parseInt(<string> $(`#${this.id}-curr-sim-step`).html());
        const success: boolean = this.setCurrentSimulationStep(currentStep);
        if (success) {
            const newCurrentStep: number = this.advanceSimulationStep(currentStep);
            this.setCurrentSimulationStep(newCurrentStep);
            await this.gotoControl(newCurrentStep);
            if (this.bridgedPlayer) {
                await this.bridgedPlayer.gotoControl(this.simulationStep);
            }
            // clear any timer if the step could not be advanced, we might be running a scenario and have reached the end of the scenario
            if (newCurrentStep === currentStep) {
                console.log("[daa-player] Scenario end!", { currentStep });
                this.clearInterval();
            }
            return true;
        }
        console.error("[daa-player] Warning: currentStep is NaN");
        return false;
    }
    /**
     * Internal function, sets the current simulation step
     */
    protected setCurrentSimulationStep (step: number): boolean {
        const simulationLength: number = this.getSimulationLength();
        if (!isNaN(step) && step < simulationLength) {
            this.simulationStep = step;
            return true;
        }
        console.error("[daa-player] Warning: currentStep is NaN or out-of-bounds", { step, simulationLength });
        return false;
    }
    /**
     * Internal function, returns the simulation step advanced by 1, if possible
     */
    protected advanceSimulationStep (step: number): number {
        if (step < this.getSimulationLength() - 1) {
            step++;
        }
        return step;
    }

    /**
     * Constructor. 
     * Creates a new playback player.
     * @param opt.id {String} Unique player identifier (default: "daa-playback").
     */
    constructor (opt?: {
        id?: string,
        ownshipName?: string
    }) {
        super();
        this.id = opt?.id || "daa-playback";
        this.ownshipName = opt?.ownshipName;
        this.client = new DAAClient(); // this should only be used for serving files
        // this.fs = opt.fs;
        // // this.inputFileReader = null;
        // this.outputFileWriter = null;
        // this.scenario = null;
        this.simulationStep = 0; // current simulation step
        
        // this.timer = null;
        this.ms = DEFAULT_PLAYER_STEP_INTERVAL;
        // this.precision = DEFAULT_PLAYER_FRACTIONAL_PRECISION; // fractional precision
        this._displays = [];

        this._scenarios = {};
        this._selectedScenario = null;
        this._simulationLength = 0;

        this._repl = {}; // this is a set of websockets for communication with pvsio instances, one instance for each file
        this._plot = {};
 
        // these functions that can re-defined by the user using, e.g., define("step", function () {...})
        this._defines = {
            init: async (f: (p: DAAPlayer) => Promise<void>, opt?) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                opt = opt || {};
                try {
                    this.clearInterval();
                    await f(this);
                } catch (stepError) {
                    console.error("Init function has thrown a runtime exception: ", stepError);
                }
                await this.gotoControl(0);
                // this.simulationStep = 0;
                // $(`#${this.id}-curr-sim-step`).html(this.simulationStep.toString());
            },
            step: async (f: (p: DAAPlayer) => Promise<void>, opt?: { preventIncrement?: boolean }) => {
                opt = opt || {};
                if (this.simulationStep < this.getSimulationLength()) {
                    try {
                        await f(this);
                    } catch (stepError) {
                        console.error("Step function has thrown a runtime exception: ", stepError);
                    } finally {
                        const step: number = this.simulationStep;
                        $(`#${this.id}-curr-sim-step`).html(`${step}`);
                        $(`#${this.id}-curr-sim-time`).html(this.getTimeAt(step));
                        if (!opt.preventIncrement) {
                            this.simulationStep++;
                        }
                    }
                } else {
                    console.log("Simulation complete!");
                    this.clearInterval();
                }
            },
            writeLog: async () => {
                // if (_this.logFile && _this._log.length > 0 && _this.fs) {
                //     console.log("Writing log file " + _this.logFile);
                //     await writeFile(_this.fs, _this.logFile, _this._log, { overWrite: true });
                //     console.log(_this._log.length + " event saved in log file " + _this.logFile);
                // }
            }
        };
    }
    /**
     * Activates the player
     */
    async activate(opt?: { developerMode?: boolean }): Promise<void> {
        opt = opt || {};
        const scenarios = await this.listScenarioFiles();
        if (!this.activationControlsPresent && scenarios && scenarios.length) {
            await this.loadScenarioFile(scenarios[0]);
        }
        if (opt.developerMode) {
            await this.clickDeveloperMode();
        }
    }
    /**
     * Utility function, returns the ID of the dropdown element for selecting a daidalus/wellclear version 
     */
    protected getWellClearVersionSelector(): string {
        return this.daaVersionDomSelector;
    }
    /**
     * Utility function, returns the ID of the dropdown element for selecting a daidalus/wellclear configuration
     */
    protected getWellClearConfigurationSelector(): string {
        return this.daaConfigurationDomSelector;
    }
    /**
     * Utility function, links the current player with a secondary player
     * The two player will be in lockstep
     */
    bridgePlayer(player: DAAPlayer) {
        this.bridgedPlayer = player;
    }
    /**
     * Utility function, returns the current horizontal speed, vertical speed and altitude
     */
    getConfigData (): ConfigData {
        if (this.configInfo) {
            return {
                "horizontal-speed": this.configInfo["horizontal-speed"],
                "vertical-speed": this.configInfo["vertical-speed"],
                "altitude": this.configInfo["altitude"]
            };
        }
        return null;
    }
    /**
     * Sets simulation speed
     * @param speed Simulation speed, in percentage: 100 is 1x, 1000 is 10x, etc.
     */
    setSpeed (speed: number | string): DAAPlayer {
        if (isFinite(+speed) && +speed > 0 && this.speed !== +speed) {
            this.speed = +speed;
            this.ms = 1000 / this.speed;
            $(`#${this.id}-speed-input`).val(speed);
            const evt: DidChangeSimulationSpeed = { sec: this.speed };
            this.trigger(PlayerEvents.DidChangeSimulationSpeed, evt);
        }
        return this;
    }
    /**
     * Returns the current simulation speed, in seconds
     */
    getSpeed (): number {
        return this.speed;
    }
    /**
     * Alias for getSpeed
     */
    getCurrentSimulationSpeed (): number {
        return this.getSpeed();
    }
    /**
     * utility function, renders the DOM elements necessary to control a simulation (start, stop, goto, etc.)
     */
    protected renderSimulationControls(opt?: {
        top?: number,
        left?: number,
        width?: number,
        multiplay?: { cssClass?: string, id: string, label: string }[]
    }) {
        opt = opt || {};
        const data = {
            id: this.id,
            top: opt.top,
            left: opt.left,
            width: opt.width
        };
        if (opt.multiplay) {
            data["multiplay"] = opt.multiplay.map(elem => {
                return {
                    cssClass: elem.cssClass?.startsWith(".") ? elem.cssClass.substring(1) : elem.cssClass, 
                    id: elem.id?.startsWith("#") ? elem.id.substring(1) : elem.id,
                    label: elem.label 
                };
            });
        }
        const theHTML = Handlebars.compile(this._simulationControls.htmlTemplate)(data);
        $(this._simulationControls.parent).html(theHTML);
        $(`#${this.id}-tot-sim-steps`).html(`${this.getSimulationLength()}`);
        // activate dropdown menus
        $('.dropdown-toggle')["dropdown"]();
    }
    /**
     * Uploads an external daa file to the server
     * @param data fname is the scenario name, fileContent is the content of the scenario file
     * @returns a string representing the JSON representation of the scenario.
     */
    async uploadDaaFile (data: { scenarioName: string, scenarioContent: string }): Promise<string> {
        if (data && data.scenarioName && data.scenarioContent) {
            console.log("[daa-player] Saving scenario file", data);
            const res: WebSocketMessage<string> = await this.client.send({
                type: DaaServerCommand.saveDaaFile,
                data
            });
            if (res && res.data) {
                const scenarioData: string = res.data;
                return scenarioData;
            }
        }
        return null;
    }
    /**
     * utility function, renders the DOM elements necessary to select scenarios
     */
    appendSidePanelView(): DAAPlayer {
        const theHTML = Handlebars.compile(templates.sidePanelTemplate)({
            id: this.id
        });
        utils.createDiv(`${this.id}-scenario-selector`, { zIndex: 99 });
        $(`#${this.id}-scenario-selector`).html(theHTML);

        // add handler for uploading external scenario files
        $(`#${this.id}-external-scenario-file`).on("input", (evt: JQuery.ChangeEvent) => {
            const file: File = evt?.currentTarget?.files[0];
            const reader: FileReader = new FileReader();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            reader.addEventListener("loadend", async (evt: ProgressEvent<FileReader>) => {
                const scenarioContent: string = reader.result?.toString();
                $(`#${this.id}-external-scenario-file-form`).trigger("reset");
                const scenarioName: string = file.name;
                const data: DidUploadDaaScenarioFile = {
                    scenarioName,
                    scenarioContent
                };
                // upload the selected file in the scenarios folder
                const scenarioData: string = await this.uploadDaaFile(data);
                // refresh the view shoding the scenario files
                await this.refreshScenarioFiles();
                // load the uploaded file
                await this.loadScenarioFile(scenarioName, { scenarioData, forceReload: true });
            });
            reader.readAsText(file);
        });

        // make side panel resizeable
        const min: number = 20; // px
        const MAX_TIMER: number = 16; // ms
        let timer: NodeJS.Timeout = null;
        const delayedRefresh = () => {
			clearTimeout(timer);
			timer = setTimeout(() => {
                const marginLeft: string = $("#sidebar-panel").css("width");
                $(".zoomable").css({ "margin-left": marginLeft });
			}, MAX_TIMER);
		}
        $("#sidebar-resize").on("mousedown", (e: JQuery.MouseDownEvent) => {
            e.preventDefault();
            $('html').css({ cursor: "col-resize" });
            $(document).on("mousemove", (e: JQuery.MouseMoveEvent) => {
                e.preventDefault();
                $("#sidebar-panel").removeClass("col-md-2");
                const x: number = e.pageX - $("#sidebar-panel").offset().left;
                if (x > min && e.pageX < $(window).width()) {
                    $("#sidebar-panel").css("width", x);
                    delayedRefresh();
                    // $(".zoomable").css("margin-left", x);
                }
            });
        });
        $(document).on("mouseup", () => {
            clearTimeout(timer);
            $(document).off("mousemove");
            $('html').css({ cursor: "default" });
            const marginLeft: string = $("#sidebar-panel").css("width");
            $(".zoomable").css({ "margin-left": marginLeft });
        });
        $("#sidebar-resize").on("mouseover", () => {
            $("#sidebar-resize").css({ cursor: "col-resize" });
        });
        const marginLeft: string = $("#sidebar-panel").css("width");
        $(".zoomable").css({ "margin-left": marginLeft });
        return this;
    }
    /**
     * Disables simulation controls play/pause/goto etc
     */
    disableSimulationControls (): void {
        $(`.sim-control`).prop("disabled", true);
        $(`.simulation-controls`).animate({ "opacity": "0.5" });
    }
    /**
     * Enables simulation controls play/pause/goto etc
     */
    enableSimulationControls (): void {
        $(`.sim-control`).removeAttr("disabled");
        $(`.simulation-controls`).animate({ "opacity": "1" });
    }
    /**
     * Disables input elements for selecting scenarios, configurations, daidalus version, wind
     */
    disableSelectors (): void {
        $(`.sim-selector`).removeAttr("disabled");
    }
    /**
     * Enables input elements for selecting scenarios, configurations, daidalus version, wind
     */
    enableSelectors (): void {
        $(`.sim-selector`).removeAttr("disabled");
    }
    /**
     * Updates the browser address by indicating scenario and configuration currently selected
     * The execution of this function will not reload the page
     */
    protected refreshBrowserAddress (): void {
        const scenario: string = this.getSelectedScenario();
        const config: string = this.readSelectedDaaConfiguration();
        const search: string = `?${scenario}+${config}`;
        const url: string = window.location.origin + window.location.pathname + search;
        history.replaceState({}, document.title, url);
    }
    /**
     * Reveal player activation panel
     */
    revealActivationPanel (): void {
        // $(`.activation-panel`).animate({ "opacity": "1" });
        $(`.activation-panel`).css({ display: "block", opacity: 1 });
        $(`.load-scenario-btn`).removeAttr("disabled");
    }
    /**
     * Hide player activation panel
     */
    hideActivationPanel (): void {
        $(`.load-scenario-btn`).prop("disabled", true);
        // $(`.activation-panel`).animate({ "opacity": "0" });
        $(`.activation-panel`).css({ display: "none", opacity: 0 });
    }
    /**
     * Appends the player activation panel to the DOM, which includes a "load scenario and configuration" control
     */
    appendActivationPanel (opt?: { top?: number, left?: number, width?: number, parent?: string }): void {
        opt = opt || {};
        opt.parent = opt.parent || this.id;
        opt.top = (isNaN(opt.top)) ? 0 : opt.top;
        opt.left = (isNaN(opt.left)) ? 0 : opt.left;
        opt.width = (isNaN(+opt.width)) ? 1100 : opt.width;
        const theHTML = Handlebars.compile(templates.activationPanel)({
            id: this.id,
            parent: opt.parent,
            top: opt.top, left: opt.left, width: opt.width
        });
        utils.createDiv(`${this.id}-activation-panel`, { zIndex: 99, parent: opt.parent });
        $(`#${this.id}-activation-panel`).html(theHTML);
        this.disableSimulationControls();
        // on click...
        $(`.load-scenario-btn`).on("click", async () => {
            await this.onClickLoadScenario();
        });
        this.activationControlsPresent = true;
    }
    /**
     * Internal function, triggered when clicking .load-scenario-btn
     */
    protected async onClickLoadScenario (): Promise<void> {
        this.refreshBrowserAddress();
        await this.loadSelectedScenario();
    }
    /**
     * Utility function, loads the scenario selected in the dropdown menu "#${this.id}-scenario-selector"
     */
    async loadSelectedScenario (opt?: { ownshipName?: string | number, selectedScenario?: string }): Promise<void> {
        const scenario: string = opt?.selectedScenario || this.getSelectedScenario();
        this.startSpinAnimation({ selectedScenario: scenario });
        if (scenario) {
            await this.loadScenarioFile(scenario, { ...opt, forceReload: true });
        } else {
            console.error("[daa-player] Warning: selected scenario is null (loadSelectedScenario)");
        }
        this.hideActivationPanel();
        this.stopSpinAnimation();
        this.enableSelectors();
        this.enableSimulationControls();
    }
    /**
     * Utility function, starts a spinner animation on the button of the activation panel
     */
    startSpinAnimation (opt?: { selectedScenario?: string }): void {
        const theHTML: string = `<i class="fa fa-spinner fa-pulse"></i>${opt?.selectedScenario ? `   Loading ${opt.selectedScenario}` : ""}`;
        $(`.load-scenario-btn`).html(theHTML);
    }
    /**
     * Utility function, stops the spinner animation on the button of the activation panel and restores the button label
     */
    stopSpinAnimation (): void {
        $(`.load-scenario-btn`).html(`Load Selected Scenario and Configuration`);
    }
    /**
     * utility function, renders the DOM elements necessary for developers
     */
    appendDeveloperControls (desc: { 
        normalMode?: () => Promise<void> | void, 
        developerMode?: () => Promise<void> | void 
    }, opt?: { 
        top?: number, 
        left?: number, 
        width?: number, 
        parent?: string,
        controls?: {
            showDeveloper?: boolean,
            showPlot?: boolean,
            showGuidance?: boolean
        } 
        hidden?: boolean
    }): void {
        opt = opt || {};
        desc = desc || {};
        opt.parent = opt.parent || this.id;
        opt.top = (isNaN(opt.top)) ? 0 : opt.top;
        opt.left = (isNaN(opt.left)) ? 0 : opt.left;
        opt.width = (isNaN(+opt.width)) ? 222 : opt.width;
        opt.controls = opt.controls || {};
        opt.controls.showDeveloper = opt.controls.showDeveloper === undefined ? true : !!opt.controls.showDeveloper;
        opt.controls.showPlot = opt.controls.showPlot === undefined ? true : !!opt.controls.showPlot;
        opt.controls.showGuidance = opt.controls.showGuidance === undefined ? true : !!opt.controls.showGuidance;
        const theHTML = Handlebars.compile(templates.developersControls)({
            id: this.id,
            ...opt,
            display: opt.hidden ? "none" : "block"
        });
        utils.createDiv(`${this.id}-developers-controls`, { zIndex: 99, parent: opt.parent });
        $(`#${this.id}-developers-controls`).html(theHTML);
        // attach handlers
        if (typeof desc?.normalMode === "function") { this.developerControls.normalMode = desc.normalMode; }
        if (typeof desc?.developerMode === "function") { this.developerControls.developerMode = desc.developerMode; }
        // install handlers
        $(`#${this.id}-developer-mode-checkbox`).on("change", async () => {
            const isChecked = $(`#${this.id}-developer-mode-checkbox`).prop("checked");
            this.mode = (isChecked) ? "developerMode" : "normalMode";
            if (isChecked) {
                await this.clickDeveloperMode();
            } else {
                await this.clickNormalMode();
            }
        });
        $(`#${this.id}-show-plots-checkbox`).on("change", () => {
            const isChecked = $(`#${this.id}-show-plots-checkbox`).prop("checked");
            if (isChecked) {
                this.clickShowPlots();
            } else {
                this.clickHidePlots();
            }
        });
        $(`#${this.id}-show-guidance-checkbox`).on("change", () => {
            const isChecked = $(`#${this.id}-show-guidance-checkbox`).prop("checked");
            if (isChecked) {
                this.clickShowGuidance();
            } else {
                this.clickHideGuidance();
            }
        });
    }
    /**
     * Utility function, sets normal mode handler
     */
    setNormalModeHandler (normalMode: () => Promise<void> | void): void {
        this.developerControls.normalMode = normalMode;
    }
    /**
     * Utility function, sets developer mode handler
     */
    setDeveloperModeHandler (developerMode: () => Promise<void> | void): void {
        this.developerControls.developerMode = developerMode;
    }
    /**
     * utility function, applies current resolution options by triggering the handlers associated to each option
     */
    applyCurrentResolutionOptions (): void {
        $(`#${this.id}-max-compass-wedge-aperture-input`).trigger("input");
        $(`#${this.id}-max-airspeed-wedge-aperture-input`).trigger("input");
        $(`#${this.id}-max-altitude-wedge-aperture-input`).trigger("input");
        $(`#${this.id}-max-vspeed-wedge-aperture-input`).trigger("input");
    }
    /**
     * Utility function, enables wedge aperture option for a given widget
     */
    enableWedgeApertureOption (widget: "compass" | "airspeed" | "altitude" | "vspeed"): void {
        $(`#${this.id}-max-${widget}-wedge-aperture-checkbox`).prop( "checked", true);
    }
    /**
     * Utility function, disables wedge aperture option for a given widget
     */
    disableWedgeApertureOption (widget: "compass" | "airspeed" | "altitude" | "vspeed"): void {
        $(`#${this.id}-max-${widget}-wedge-aperture-checkbox`).prop( "checked", false);
    }
    /**
     * Utility function, renders the DOM elements necessary for the configuration of resolution aperture ranges (max wedge/notch aperture)
     */
    appendWedgeRangeControls (handlers: { [Property in ResolutionHandler]: InputHandler }, opt?: { top?: number, left?: number, width?: number, parent?: string }): void {
        opt = opt || {};
        opt.parent = opt.parent || this.id;
        opt.top = (isNaN(opt.top)) ? 0 : opt.top;
        opt.left = (isNaN(opt.left)) ? 0 : opt.left;
        opt.width = (isNaN(+opt.width)) ? 400 : opt.width;
        const theHTML = Handlebars.compile(templates.resolutionControls)({
            id: this.id,
            parent: opt.parent,
            top: opt.top, left: opt.left, width: opt.width
        });
        utils.createDiv(`${this.id}-resolution-controls`, { zIndex: 99, parent: opt.parent });
        $(`#${this.id}-resolution-controls`).html(theHTML);
        // install handlers
        const hdl = (id: string, handlerName: string) => {
            const isChecked: boolean = $(`#${id}-checkbox`).is(":checked");
            if (handlers && typeof handlers[handlerName] === "function") {
                isChecked ? 
                    handlers[handlerName](<string> $(`#${id}-input`).val()) 
                        : handlers[handlerName]("0");
            }
        }

        $(`#${this.id}-max-compass-wedge-aperture-input`).on("input", () => {
            hdl(`${this.id}-max-compass-wedge-aperture`, "setCompassWedgeAperture");
        });
        $(`#${this.id}-max-compass-wedge-aperture-checkbox`).on("input", () => {
            hdl(`${this.id}-max-compass-wedge-aperture`, "setCompassWedgeAperture");
        });

        $(`#${this.id}-max-airspeed-wedge-aperture-input`).on("input", () => {
            hdl(`${this.id}-max-airspeed-wedge-aperture`, "setAirspeedWedgeAperture");
        });
        $(`#${this.id}-max-airspeed-wedge-aperture-checkbox`).on("input", () => {
            hdl(`${this.id}-max-airspeed-wedge-aperture`, "setAirspeedWedgeAperture");
        });

        $(`#${this.id}-max-altitude-wedge-aperture-input`).on("input", () => {
            hdl(`${this.id}-max-altitude-wedge-aperture`, "setAltitudeWedgeAperture");
        });
        $(`#${this.id}-max-altitude-wedge-aperture-checkbox`).on("input", () => {
            hdl(`${this.id}-max-altitude-wedge-aperture`, "setAltitudeWedgeAperture");
        });

        $(`#${this.id}-max-vspeed-wedge-aperture-input`).on("input", () => {
            hdl(`${this.id}-max-vspeed-wedge-aperture`, "setVerticalSpeedWedgeAperture");
        });
        $(`#${this.id}-max-vspeed-wedge-aperture-checkbox`).on("input", () => {
            hdl(`${this.id}-max-vspeed-wedge-aperture`, "setVerticalSpeedWedgeAperture");
        });
    }
    /**
     * Utility function, renders the DOM elements necessary for magvar
     */
    appendMagVarControls (handlers: { [Property in MagVarHandler]: InputHandler }, opt?: { top?: number, left?: number, width?: number, parent?: string }): void {
        opt = opt || {};
        opt.parent = opt.parent || this.id;
        opt.top = (isNaN(opt.top)) ? 0 : opt.top;
        opt.left = (isNaN(opt.left)) ? 0 : opt.left;
        opt.width = (isNaN(+opt.width)) ? 400 : opt.width;
        const theHTML = Handlebars.compile(templates.magVarControls)({
            id: this.id,
            parent: opt.parent,
            top: opt.top, left: opt.left, width: opt.width
        });
        utils.createDiv(`${this.id}-magvar-controls`, { zIndex: 99, parent: opt.parent });
        $(`#${this.id}-magvar-controls`).html(theHTML);
        // install handlers
        const hdl = (id: string, handlerName: string) => {
            if (handlers && typeof handlers[handlerName] === "function") {
                handlers[handlerName](<string> $(`#${id}-input`).val());
            }
        }
        $(`#${this.id}-magvar-input`).on("input", () => {
            hdl(`${this.id}-magvar`, "setMagVar");
        });
        $(`#${this.id}-magvar-checkbox`).on("change", () => {
            const id: string = `${this.id}-magvar`;
            const isChecked: boolean = $(`#${id}-checkbox`).is(":checked");
            const handlerName: string = "magneticCompass";
            if (handlers && typeof handlers[handlerName] === "function") {
                handlers[handlerName](isChecked);
            }
        });
    }
    /**
     * Programmatically clicks "developer mode" button in the player
     */
    async clickDeveloperMode (): Promise<void> {
        $(`#${this.id}-developer-mode-checkbox`).prop("checked", true);
        this.mode = "developerMode";
        if (typeof this.developerControls?.developerMode === "function") {
            await this.developerControls.developerMode();
        }
    }
    /**
     * Programmatically clicks "normal mode" button in the player
     */
    async clickNormalMode (): Promise<void> {
        $(`#${this.id}-developer-mode-checkbox`).prop("checked", false);
        this.mode = "normalMode";
        if (typeof this.developerControls?.normalMode === "function") {
            await this.developerControls.normalMode();
        }
    }
    /**
     * Makes all plots visible
     */
    clickShowPlots (): void {
        $(`#${this.id}-show-plots-checkbox`).prop("checked", true);
        $(`.daa-spectrogram`).css({ display: "block" });
    }
    /**
     * Hides all plots
     */
    clickHidePlots (): void {
        $(`#${this.id}-show-plots-checkbox`).prop("checked", false);
        $(`.daa-spectrogram`).css({ display: "none" });
    }
    /**
     * DAA guidance is visible
     */
    clickShowGuidance (): void {
        $(`#${this.id}-show-guidance-checkbox`).prop("checked", true);
        $(`.daa-guidance`).css({ display: "block" });
    }
    /**
     * Hides DAA guidance
     */
    clickHideGuidance (): void {
        $(`#${this.id}-show-guidance-checkbox`).prop("checked", false);
        $(`.daa-guidance`).css({ display: "none" });
    }
    /**
     * utility function, renders the DOM elements necessary for plotting spectrograms
     */
    appendPlotControls (opt?: {
        top?: number, 
        left?: number, 
        width?: number, 
        parent?: string, 
        disableHandlers?: { plot?: boolean, reset?: boolean },
        reuseParentDiv?: boolean,
        buttons?: { reset?: string, plot?: string }
    }): DAAPlayer {
        opt = opt || {};
        opt.parent = opt.parent?.startsWith("#") ? opt.parent.substring(1) : this.id;
        opt.top = (isNaN(opt.top)) ? 0 : opt.top;
        opt.left = (isNaN(opt.left)) ? 0 : opt.left;
        opt.width = (isNaN(+opt.width)) ? 374 : opt.width;
        const theHTML = Handlebars.compile(templates.spectrogramControls)({
            id: this.id,
            parent: opt.parent,
            top: opt.top, left: opt.left, width: opt.width
        });
        if (!opt.reuseParentDiv) {
            utils.createDiv(`${this.id}-spectrogram-controls`, { zIndex: 99, parent: opt.parent, top: 0 });
        }
        $(`#${this.id}-spectrogram-controls`).html(theHTML);
        // install handlers
        if (!opt?.disableHandlers?.reset) {
            const resetBtn: string = opt.buttons?.reset || `#${this.id}-reset`;
            $(resetBtn).on("click", async () => {
                const selectedScenario: string = this.getSelectedScenario();
                await this.loadScenarioFile(selectedScenario, { softReload: true }); // async call
            });
        }
        if (!opt?.disableHandlers?.plot) {
            const plotBtn: string = opt.buttons?.plot || `#${this.id}-plot`;
            $(plotBtn).on("click", async () => {
                await this.plot();
            });
        }
        return this;
    }
    /**
     * utility function, renders the DOM elements necessary for enabling/disabling aural annunciations
     */
    async appendVoiceFeedbackControls (opt?: { top?: number, left?: number, width?: number, parent?: string, voices?: VoiceDescriptor[], styles?: GuidanceDescriptor[] }): Promise<DAAPlayer> {
        opt = opt || {};
        opt.parent = opt.parent || this.id;
        opt.top = (isNaN(opt.top)) ? 0 : opt.top;
        opt.left = (isNaN(opt.left)) ? 0 : opt.left;
        opt.width = (isNaN(+opt.width)) ? 724 : opt.width;
        const theHTML = Handlebars.compile(templates.voiceFeedbackControls)({
            id: this.id,
            parent: opt.parent,
            top: opt.top, left: opt.left, width: opt.width,
            voices: opt.voices,
            styles: opt.styles
        });
        utils.createDiv(`${this.id}-voice-feedback-controls`, { zIndex: 99, parent: opt.parent });
        $(`#${this.id}-voice-feedback-controls`).html(theHTML);
        // install handlers
        $(`#${this.id}-voice-feedback-checkbox`).on("change", () => {
            const enabled: boolean = this.voiceFeedbackEnabled();
            this.trigger(PlayerEvents.DidToggleDaaVoiceFeedback, { enabled });
        });        
        $(`#${this.id}-aural-guidance-list`).on("change", () => {
            const selected: string = this.readSelectedAuralGuidance();
            this.trigger(PlayerEvents.DidChangeDaaGuidanceKind, { selected });
        });
        $(`#${this.id}-voice-name-list`).on("change", () => {
            const selected: string = this.readSelectedVoiceName();
            this.trigger(PlayerEvents.DidChangeDaaVoice, { selected });
        });
        $(`#${this.id}-voice-pitch-input`).on("change", () => {
            const selected: number = this.readSelectedVoicePitch();
            this.trigger(PlayerEvents.DidChangeDaaVoicePitch, { selected });
        });
        $(`#${this.id}-voice-rate-input`).on("change", () => {
            const selected: number = this.readSelectedVoiceRate();
            this.trigger(PlayerEvents.DidChangeDaaVoiceRate, { selected });
        });
        return this;
    }
    /**
     * Checks whether aural annunciations are enabled
     */
    voiceFeedbackEnabled (): boolean {
        const isEnabled: boolean = $(`#${this.id}-voice-feedback-checkbox`).is(":checked");
        return isEnabled;
    }
    /**
     * Disables voice feedback
     */
    disableVoiceFeedback (): void {
        $(`#${this.id}-voice-feedback-checkbox`).prop("checked", false);
    }
    /**
     * Enables voice feedback
     */
    enableVoiceFeedback (): void {
        $(`#${this.id}-voice-feedback-checkbox`).prop("checked", true);
    }
    /**
     * Selected a given simulation speed
     */
    selectSimulationSpeed (speed: number | string): boolean {
        if (+speed > 0) {
            this.setSpeed(speed);
            return +this.speed === +speed;
        }
        return false;
    }
    /**
     * Selects a given guidance kind
     */
    selectGuidance (guidance: GuidanceKind): boolean {
        if (guidance) {
            const $selected: JQuery<HTMLElement> = $(`#${this.id}-aural-guidance-list option:contains("${guidance}")`);
            if ($selected?.text()) {
                $selected.prop("selected", true);
                this.trigger(PlayerEvents.DidChangeDaaGuidanceKind, { selected: $selected.text() });
                return true;
            }
        }
        return false;
    }
    /**
     * Selects a given voice
     */
    selectVoice (name: string): boolean {
        if (name) {
            const $selected: JQuery<HTMLElement> = $(`#${this.id}-voice-name-list option:contains("${name}")`);
            if ($selected?.text()) {
                $selected.prop("selected", true);
                this.trigger(PlayerEvents.DidChangeDaaVoice, { selected: $selected.text() });
                return true;
            }
        }
        return false;
    }
    /**
     * Writes the given message in the voice feedback output box
     */
    voiceToText (msg: string): void {
        msg = msg || "";
        $(`.daa-voice-text`).val(msg);
    }
    /**
     * utility function, renders the DOM elements necessary for enabling/disabling wedge persistence on alert
     */
    appendWedgePersistenceControls (opt?: { top?: number, left?: number, width?: number, parent?: string, callback?: () => void }): DAAPlayer {
        opt = opt || {};
        opt.parent = opt.parent || this.id;
        opt.top = (isNaN(opt.top)) ? 0 : opt.top;
        opt.left = (isNaN(opt.left)) ? 0 : opt.left;
        opt.width = (isNaN(+opt.width)) ? 400 : opt.width;
        const theHTML = Handlebars.compile(templates.resolutionPersistenceControls)({
            id: this.id,
            parent: opt.parent,
            top: opt.top,
            left: opt.left, 
            width: opt.width,
            innerWidth: opt.width - 40 // 40px is needed to accommodate the checkbox width and avoid the element going to the next line 
        });
        utils.createDiv(`${this.id}-resolution-persistence-controls`, { zIndex: 99, parent: opt.parent });
        $(`#${this.id}-resolution-persistence-controls`).html(theHTML);
        // install handlers
        $(`#${this.id}-resolution-persistence-checkbox`).on("change", () => {
            if (typeof opt?.callback === "function") {
                opt.callback();
            }
        });
        return this;
    }
    /**
     * utility function, renders the DOM elements necessary for enabling/disabling directive guidance for heading maneuvers
     */
    appendDirectiveGuidanceControls (opt?: { top?: number, left?: number, width?: number, parent?: string, callback?: () => void }): DAAPlayer {
        opt = opt || {};
        opt.parent = opt.parent || this.id;
        opt.top = (isNaN(opt.top)) ? 0 : opt.top;
        opt.left = (isNaN(opt.left)) ? 0 : opt.left;
        opt.width = (isNaN(+opt.width)) ? 400 : opt.width;
        const theHTML = Handlebars.compile(templates.directiveGuidanceControls)({
            id: this.id,
            parent: opt.parent,
            top: opt.top,
            left: opt.left, 
            width: opt.width,
            innerWidth: opt.width - 40 // 40px is needed to accommodate the checkbox width and avoid the element going to the next line 
        });
        utils.createDiv(`${this.id}-directive-guidance-controls`, { zIndex: 99, parent: opt.parent });
        $(`#${this.id}-directive-guidance-controls`).html(theHTML);
        // install handlers
        $(`#${this.id}-directive-guidance-checkbox`).on("change", () => {
            if (typeof opt?.callback === "function") {
                opt.callback();
            }
        });
        return this;
    }
    /**
     * Checks whether directive guidance for heading maneuvers is enabled
     */
    directiveGuidanceIsEnabled (): boolean {
        const isEnabled: boolean = $(`#${this.id}-directive-guidance-checkbox`).is(":checked");
        return isEnabled;
    }
    /**
     * Disables wedge persistence
     */
    disableDirectiveGuidance (): void {
        $(`#${this.id}-directive-guidance-checkbox`).prop("checked", false);
    }
    /**
     * Enables wedge persistence
     */
    enableDirectiveGuidance (): void {
        $(`#${this.id}-directive-guidance-checkbox`).prop("checked", true);
    }

    /**
     * Checks whether wedge persistence is enabled
     */
    wedgePersistenceIsEnabled (): boolean {
        const isEnabled: boolean = $(`#${this.id}-resolution-persistence-checkbox`).is(":checked");
        return isEnabled;
    }
    /**
     * Disables wedge persistence
     */
    disableWedgePersistence (): void {
        $(`#${this.id}-resolution-persistence-checkbox`).prop("checked", false);
    }
    /**
     * Enables wedge persistence
     */
    enableWedgePersistence (): void {
        $(`#${this.id}-resolution-persistence-checkbox`).prop("checked", true);
    }

    /**
     * Disables the dropdown list for selecting a scenario
     */
    disableSelection(): void {
        $(`#${this.id}-scenarios-list`).attr("disabled", "true");
    }
    /**
     * Enables the dropdown list for selecting a scenario
     */
    enableSelection(): void {
        $(`#${this.id}-scenarios-list`).removeAttr("disabled");
    }
    /**
     * Shows an animation indicating that the backend is loading scenario data
     */
    loadingAnimation(opt?: { scenario?: string }): void {
        if (this._displays) {
            this.startSpinAnimation({ selectedScenario: opt?.scenario || this.getSelectedScenario() });
            for (let i = 0; i < this._displays?.length; i++) {
                const display: string = this._displays[i];
                const width: number = $('.map-canvas').width() || $('.map-div').width() || 1072;
                const height: number = $('.map-canvas').height() || $('.map-div').height() || 854;
                const left: number = 10;
                const right: number = 10;
                const theHTML: string = Handlebars.compile(templates.loadingTemplate)({ width, height, left, right, id: `${this.id}-${display}-daa-loading` });
                const selector: string = utils.jquerySelector(display);
                $(selector).append(theHTML);
            }
        }
    }
    /**
     * Stops any animation triggered with loadingAnimation()
     */
    loadingComplete(): void {
        if (this._displays) {
            $('.daa-loading').remove();
        }
        this.stopSpinAnimation();
        this.hideActivationPanel();
    }
    /**
     * Loads a .daa scenario file
     * @param scenarioName Name of the scenario. Default is H1.
     * @param opt.ownship Information necessary to identify the ownship in the .daa file (either sequenceNumber or name, default is sequenceNumber=0)
     */
    async loadDaaFile (scenarioName: string, opt?: {
        scenarioData?: string
    }): Promise<string> {
        opt = opt || {};
        let scenarioData: string = opt.scenarioData;
        if (!scenarioData) {
            await this.connectToServer();
            const data: LoadScenarioRequest = { scenarioName, ownshipName: this.ownshipName };
            const res: WebSocketMessage<string> = await this.client.send({
                type: DaaServerCommand.loadDaaFile,
                data
            });
            if (res?.data) {
                scenarioData = res.data;
            }
        }
        if (scenarioData) {
            try {
                this._scenarios[scenarioName] = JSON.parse(scenarioData);
                console.log(`[daa-player] Scenario ${scenarioName} successfully loaded`, this._scenarios[scenarioName]);
            } catch (error) {
                console.warn(`[daa-player] Warning: Malformed scenario data for ${scenarioName}`, error);
            }
        } else {
            console.error(`[daa-player] Error: Scenario data is null for scenario ${scenarioName}`);
        }
        return scenarioData;
    }
    /**
     * Loads all daa files contained in folder daa-scenarios
     * @param selected (optional) Name of the scenario file to be selected. If not specified, the first scenario in the list will be selected;
     * @returns Array of filenames
     */
    async loadScenarioFiles (selected?: string, opt?: { scenarioData?: string }): Promise<string[]> {
        const scenarioFiles: string[] = await this.listScenarioFiles();
        if (scenarioFiles && scenarioFiles.length > 0) {
            selected = selected || scenarioFiles[0];
            for (let i = 0; i < scenarioFiles.length; i++) {
                await this.loadDaaFile(scenarioFiles[i], opt);
            }
            await this.loadScenarioFile(selected, opt);
        } else {
            console.warn(`[daa-player] Folder daa-scenarios is empty :/`);
        }
        return scenarioFiles;
    }
    /**
     * Returns the list of daa files available in folder daa-scenarios
     */
    async listScenarioFiles (): Promise<string[]> {
        await this.connectToServer();
        const res: WebSocketMessage<string> = await this.client.send({
            type: DaaServerCommand.listDaaFiles
        });
        if (res?.data) {
            const daaFiles: string[] = JSON.parse(res.data) || [];
            // update data structures
            for (let i = 0; i < daaFiles?.length; i++) {
                // populate the list of scenarios and load the first one
                this._scenarios[daaFiles[i]] = this._scenarios[daaFiles[i]] || null;
            }
            // if (daaFiles?.length > 0) {
            //     // populate the list of scenarios and load the first one
            //     daaFiles.forEach((scenario: string) => {
            //         this._scenarios[scenario] = this._scenarios[scenario] || null;
            //     });
            // }
            console.log(`[daa-player] ${daaFiles.length} daa files available`, daaFiles);
            return daaFiles;
        }
        console.error(`[daa-player] Error while listing daa files ${res}`);
        return null;
    }
    /**
     * Loads the daidalus configuration selected in the corresponding dropdown menu
     */
    async loadSelectedConfiguration (): Promise<ConfigFile> {
        const selectedConfig: string = this.readSelectedDaaConfiguration();
        if (selectedConfig) {
            return await this.loadConfigFile(selectedConfig);
        }
        return null;
    }
    /**
     * Sends a request to the server to load a given daidalus configuration file
     */
    async loadConfigFile (config: string): Promise<ConfigFile> {
        console.log(`[daa-player] loadConfigFile`, config);
        await this.connectToServer();
        const data: LoadConfigRequest = { config };
        const res: WebSocketMessage<ConfigFile> = await this.client.send({
            type: DaaServerCommand.loadConfigFile,
            data
        });
        if (res?.data) {
            console.log(`Configuration ${config} successfully loaded`, res.data);
            return res.data;
        }
        console.error(`Error while loading configuration file ${res}`);
        return null;
    }
    /**
     * Returns the list of available monitors
     */
    async listMonitors (data: {
        alertingLogic: string,
        wind: { deg: string, knot: string },
        alertingConfig?: string,
        scenario?: string,
    }): Promise<string[]> {
        await this.connectToServer();
        const msg: ExecMsg = {
            daaLogic: data.alertingLogic ||  "DAIDALUSv2.0.2.jar",
            daaConfig: data.alertingConfig || "2.x/DO_365B_no_SUM.conf",
            scenarioName: data.scenario || "H1.daa",
            ownshipName: null, // this will pick the default ownship, i.e., the aircraft in position 0 in the .daa file
            wind: { knot: data?.wind?.knot || "0", deg: data?.wind?.deg || "0" }
        }
        const res: WebSocketMessage<string> = await this.client.send({
            type: DaaServerCommand.listMonitors,
            data: msg
        });
        if (res && res.data) {
            const monitorList: string[] = JSON.parse(res.data) || [];
            console.log(`${monitorList.length} monitors available`, monitorList);
            return monitorList;
        } else {
            console.error(`Error while fetching the list of monitors ${res}`);
        }
        return null;
    }
    /**
     * Forces reload of a scenario file
     */
    async reloadScenarioFile (): Promise<void> {
        const selectedScenario: string = this.getSelectedScenario();
        await this.loadScenarioFile(selectedScenario, { forceReload: true });
    }
    /**
     * Loads the scenario to be simulated.
     * The list of available scenariosis obtained with listScenarioFiles() and is stored in this.scenarios (see also activation function)
     * @param scenario {String} daa file name (e.g., H1.daa)
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    async loadScenarioFile (scenario: string, opt?: {
        forceReload?: boolean,
        softReload?: boolean,
        hideLoadingAnimation?: boolean,
        scenarioData?: string,
        ownshipName?: string | number
    }): Promise<void> {
        if (this._scenarios && !this._loadingScenario) {
            opt = opt || {};
            this.clearInterval();
            if (this._selectedScenario !== scenario || opt.forceReload || opt.softReload) {
                this._loadingScenario = true;
                if (!opt.hideLoadingAnimation) {
                    this.loadingAnimation({ scenario });
                }
                this.setStatus(`Loading ${scenario}`);
                this.disableSelection();
                console.log(`Scenario ${scenario} selected`); 
                if (opt.forceReload || !this._scenarios[scenario]) {
                    console.log(`Loading scenario ${scenario}`); 
                    await this.loadDaaFile(scenario, opt);
                    // console.log(`Loading complete!`);
                }
                this._selectedScenario = scenario;
                this.simulationStep = 0;
                this._simulationLength = this._scenarios[this._selectedScenario].length;
                // update DOM
                $(`#${this.id}-curr-sim-step`).html(`${this.simulationStep}`);
                $(`#${this.id}-curr-sim-time`).html(this.getTimeAt(this.simulationStep));
                $(`#${this.id}-goto-time-input`).val(this.simulationStep);
                $(`#${this.id}-tot-sim-steps`).html(`${this._simulationLength}`);
                $(`#${this.id}-selected-scenario`).html(scenario);
                // make sure the selected scenario shows up as selected in the side panel
                $(`#${this.id}-scenarios-list option`).prop("selected", false);
                $(`#${this.id}-scenario-${safeSelector(this._selectedScenario)}`).prop("selected", true);

                try {
                    // reload scenario or goto 0 if the scenario hasn't changed
                    (opt.softReload) ? await this.gotoControl(0) : await this.init();
                } catch (loadError) {
                    console.error(`[${this.id}] Warning: unable to select scenario ${scenario}`, loadError);
                } finally {
                    // refresh DOM elements
                    this.refreshSimulationPlots();
                    this.refreshMonitors();
                    this.enableSelection();

                    if (!opt.hideLoadingAnimation) {
                        this.loadingComplete();
                    }
                    this.statusReady();
                    this._loadingScenario = false;
                    console.log(`Done!`);
                }
            } else {
                console.log(`Scenario ${scenario} already selected`);
            }
        } else {
            console.error(`Unable to select scenario ${scenario} :X`);
        }
    }
    /**
     * @function <a name="define">define</a>
     * @description Utility function for defining player functionalities that are simulation-specific.
     *              <li>"init": defines the initialization function executed when a new simulation scenario is loaded</li>
     *              <li>"step": defines the function executed at each simulation step</li>
     *              <li>"render": defines the render function necessary for rending the prototype associated with the simulation</li>
     *              <li>"plot": defines plotting functions that can be used by developers to analyze the display output, e.g., to view bands and alerts over time</li>
     *              <li>"diff": defines a diff function that can be used to highlight differences between simulation runs</li>
     * @param fname {String} Function name. Some function names are treated specially (e.g., "init", "step") because they are
     *                       associated to specific functions of the player that require additional code that should always be executed.
     * @param fbody {Function () => void} Function body
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    define (fname: "init" | "step" | "plot" | "diff" | string, fbody: (...args: any) => any): DAAPlayer {
        if (fname === "init") {
            this.init = async () => {
                await this._defines.init(fbody); // this will execute the predefined function "this._defines.init" and then the custom code fbody
                await this._defines.writeLog();
            }
        } else if (fname === "step") {
            this.step = async (opt?: { preventIncrement: boolean }) => {
                await this._defines.step(fbody, opt); // this will execute the predefined function "this._defines.step" and then the custom code fbody
                await this._defines.writeLog();
            };
        } else if (fname === "plot") {
            this.plot = async () => {
                fbody();
            }
        } else {
            this._defines[fname] = fbody;
        }
        return this;
    }
    /**
     * @function <a name="handle">handle</a>
     * @description Utility function for defining handlers of player widgets, such as buttons and checkboxes. Events currently supported include:
     *              <li>"click.plot-monitor": defines the function executed when selecting a monitor from the monitor panel</li>
     * @param ename {String} Event name
     * @param ebody {Function (any) => void} Event handler
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    handle (ename: string, ebody?: () => void): void {
        if (ename.startsWith("click.monitor-")) {
            const id: string = ename.replace("click.monitor-", "");
            if (id) {
                this.monitorEventHandlers[id] = () => {
                    // const len: number = Object.keys(this.daaMonitors).length;
                    const selector: string = `${this.id}-monitor-${id}-checkbox`;
                    $(`#${selector}`).on("change", () => {
                        $(`.spectrogram-monitor-element`)["tooltip"]("dispose"); // delete tooltips
                        $(`.spectrogram-monitor-marker`).css("display", "none"); // hide markers
                        if ($(`#${selector}`).is(":checked")) {
                            $(`.spectrogram-monitor-marker`).css("display", "block");
                            ebody();
                        } else {
                            // $(`.spectrogram-monitor-element`).tooltip("dispose"); // delete tooltips
                            // $(`.spectrogram-monitor-marker`).css("display", "none"); // hide markers
                        }
                    });
                }
            }
        }
    }
    /**
     * @function <a name="gotoControl">gotoControl</a>
     * @description Goes to a given target simulation step
     * @param step {nat} Target simulation step.
     * @param opt.updateInputs {boolean} Whether the function should refresh the input fields for time and step in the user interface
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    async gotoControl (step?: number, opt?: { updateInputs?: boolean }): Promise<void> {
        opt = opt || {};
        // get step from argument or from DOM
        step = (step !== undefined && step !== null) ? step : parseInt(<string> $(`#${this.id}-goto-input`).val());
        // sanity check
        if (step < this.getSimulationLength()) {
            this.simulationStep = isNaN(step) ? 0 : step;
            // update DOM
            const time: string = this.getTimeAt(this.simulationStep);
            $(`#${this.id}-curr-sim-step`).html(`${this.simulationStep}`);
            $(`#${this.id}-curr-sim-time`).html(time);
            if (opt.updateInputs) {
                $(`#${this.id}-goto-input`).val(this.simulationStep);
                $(`#${this.id}-goto-time-input`).val(time);
            }
            this.step({ preventIncrement: true });
            if (this.bridgedPlayer) {
                await this.bridgedPlayer.gotoControl(this.simulationStep);
            }
        }
    }
    /**
     * Utility function, returns which simulation step corresponds to a given simulation time 
     */
    getStepFromTime (time: string): number {
        // find which step corresponds to the given time
        if (this._scenarios && this._selectedScenario && this._scenarios[this._selectedScenario]?.steps) {
            const steps: string[] = this._scenarios[this._selectedScenario].steps;
            // search exact match
            let candidates: string[] = steps?.filter((tm: string) => {
                return tm === time || +tm === +time;
            }) || [];
            // if exact match is not available, search best match
            if (candidates?.length === 0) {
                candidates = steps.filter((tm: string) => {
                    return `${tm}`.startsWith(time);
                });
            }
            if (candidates?.length > 0) {
                const step: number = steps.indexOf(candidates[0]);
                if (step < 0) { console.warn(`[daa-player] Warning: could not select candidate time ${candidates[0]}`); }
                return (step >= 0) ? step : 0;
            } else if (+time === 0) {
                // return step 0
                return 0;
            } else if (+time > 0) {
                // return max step
                return this.getSimulationLength() - 1;
            }
            // return step 0
            console.warn(`[daa-player] Warning: could not goto time ${time}`);
            return 0;
        }
        // return step 0
        console.warn(`[daa-player] Warning: could not got time ${time} (scenario ${this._selectedScenario} is not loaded in the player)`);
        return 0;
    }
    /**
     * Utility function, goes to a given target simulation time.
     */
    async gotoTimeControl (time: string): Promise<DAAPlayer> {
        // // if time is not provided, get it from DOM
        // if (time === undefined || time === null) {
        //     time = this.readGotoTimeInput();
        // } else {
        //     // fill in goto-time-input with the provided time
        //     $(`#${this.id}-goto-time-input`).val(time);
        // }
        // find which step corresponds to the given time
        const step: number = this.getStepFromTime(time);
        if (step >= 0) {
            this.simulationStep = step;
            // update DOM
            $(`#${this.id}-curr-sim-step`).html(`${step}`);
            $(`#${this.id}-curr-sim-time`).html(this.getTimeAt(this.simulationStep));
            this.step({ preventIncrement: true });
            if (this.bridgedPlayer) {
                await this.bridgedPlayer.gotoControl(this.simulationStep);
            }
        } else {
            console.warn(`[daa-player] Warning: could not select candidate time ${time}`);
        }
        return this;
    }
    /**
     * @function <a name="connectToServer">connectToServer</a>
     * @description Connects to a WebSocket server compatible with the PVSio-web APIs.
     * @param opt {Object} Connection options
     *          <li>href (String): server URL (default: http://localhost)</li>
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    async connectToServer (opt?: { href?: string }): Promise<boolean> {
        opt = opt || {};
        this.href = opt.href || document.location.href; //"localhost";
        if (this.client) {
            const res: WebSocket = await this.client.connectToServer(this.href);
            // enable file system
            // if (opt.fs) {
            //     await this.enableFileSystem();    
            //     console.log("playback can read/write files");
            // }
            return res !== null && res !== undefined;
        }
        console.error("[daa-player] Warning: cannot connect to server, WebSocket is null");
        return false;
    }
    /**
     * @function <a name="pvsio">pvsio</a>
     * @description Sends a pvsio evaluation request to the server
     * @param pvsFile {String} PVS file to be loaded in pvsio
     * @param data {Object({ expr: String, basePath: String})} Descriptor for the evaluation request
     *              <li>expr (String): PVS expression to be evaluated</li>
     *              <li>basePath (String): path of the PVS file. The root is the examples folder of pvsio-web.</li> 
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    // async pvsio (pvsFile, data) {
    //     console.log("Evaluation request for pvsio", pvsFile, data);
    //     if (!this._repl[pvsFile]) {
    //         let ws = new DAAWebSocket();
    //         await ws.connectToServer();
    //         await ws.send({
    //             type: "startProcess", // TODO: in the server, change this to "pvsio"
    //             data: {
    //                 name: pvsFile,
    //                 demoName: data.basePath
    //             }
    //         });
    //         this._repl[pvsFile] = ws;
    //     }
    //     let res = await this._repl[pvsFile].send({
    //         type: "sendCommand",
    //         data: { command: data.expr + ";" }
    //     });
    //     return {
    //         err: res.err,
    //         pvsio: (res.data && res.data.length > 0) ? res.data[0] : null,
    //         json: res.json
    //     };
    // }
    /**
     * @function <a name="java">java</a>
     * @description Sends a java evaluation request to the server
     * @param alertingLogic Executable for the WellClear alerting logic, e.g., "DAIDALUSv2.0.2.jar" (Base path is daa-logic/)
     * @param alertingConfig Configuration file for the WellClear alerting logic, e.g., "2.x/DO_365B_no_SUM.conf" (Base path is daa-logic/)
     * @param scenarioName Flight scenario, e.g., "H1.daa"
     * @param wind Wind configuration, e.g., { knot: 20, deg: 10 }
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    async exec (data: {
        alertingLogic: string,
        alertingConfig: string,
        scenario: string,
        wind: { deg: string, knot: string },
        ownshipName?: string
    }): Promise<{
        err: string,
        bands: ScenarioDescriptor
    }> {
        const msg: ExecMsg = {
            daaLogic: data.alertingLogic ||  "DAIDALUSv2.0.2.jar",
            daaConfig: data.alertingLogic?.includes("DAIDALUS") ? data.alertingConfig || "2.x/DO_365B_no_SUM.conf" : "", // send a DAIDALUS configuration only if the DAIDALUS logic is selected
            scenarioName: data.scenario || "H1.daa",
            wind: { knot: data?.wind?.knot || "0", deg: data?.wind?.deg || "0" },
            ownshipName: data.ownshipName
        };
        console.log(`Evaluation request for java alerting logic ${msg.daaLogic} and scenario ${msg.scenarioName} ${data?.ownshipName ? `for ownship ${data.ownshipName}` : ""}`);
        if (!this._repl[msg.daaLogic]) {
            const ws: DAAClient = new DAAClient();
            await ws.connectToServer();
            this._repl[msg.daaLogic] = ws;
        }
        const res = await this._repl[msg.daaLogic].send({
            type: DaaServerCommand.exec,
            data: msg
        });
        try {
            if (res?.data) {
                const data: ScenarioDescriptor = res.data;
                this._bands = data;
            }
            console.log("WellClear data ready!");//, this._bands);
            return {
                err: res.err,
                bands: (this._bands) ? this._bands : null
            };
        } catch (parseError) {
            console.error("Error while parsing JSON bands: ", parseError);
            return {
                err: parseError,
                bands: null
            };
        }
        
    }
    /**
     * @deprecated
     */
    // async javaLoS (data: {
    //     losLogic: string,
    //     alertingConfig: string,
    //     scenario: string,
    //     wind: { deg: string, knot: string }
    // }): Promise<{
    //     err: string,
    //     los: DAALosDescriptor
    // }> {
    //     const msg: ExecMsg = {
    //         daaLogic: data.losLogic ||  "LoSRegion-1.0.1.jar",
    //         daaConfig: data.alertingConfig || "1.x/WC_SC_228_nom_b.conf",
    //         scenarioName: data.scenario || "H1.daa",
    //         wind: data.wind || { knot: "0", deg: "0" },
    //         ownshipName: null
    //     };
    //     console.log(`Computing conflict regions using java alerting logic ${msg.daaLogic} and scenario ${msg.scenarioName}`);
    //     if (!this._repl[msg.daaLogic]) {
    //         const ws: DAAClient = new DAAClient();
    //         await ws.connectToServer();
    //         this._repl[msg.daaLogic] = ws;
    //     }
    //     const res = await this._repl[msg.daaLogic].send({
    //         type: "java-los",
    //         data: msg
    //     });
    //     try {
    //         if (res && res.data) {
    //             const data = JSON.parse(res.data);
    //             this._los = data;
    //         }
    //         console.log("Conflict regions ready!", this._los);
    //         return {
    //             err: res.err,
    //             los: (this._los) ? this._los : null
    //         };
    //     } catch (parseError) {
    //         console.error("Error while parsing JSON LoS: ", parseError);
    //         return {
    //             err: parseError,
    //             los: null
    //         };
    //     }
    // }
    // /**
    //  * @function <a name="javaVirtualPilot">javaVirtualPilot</a>
    //  * @description Sends a java evaluation request to the server
    //  * @param virtualPilot Executable for virtual pilot, e.g., SimDaidalus_2.3_1-wind.jar (Base path is contrib/virtual-pilot/)
    //  * @param alertingConfig Configuration file for the WellClear alerting logic, e.g., WC_SC_228_nom_b.txt (Base path is daa-logic/)
    //  * @memberof module:DAAPlaybackPlayer
    //  * @instance
    //  */
    // async javaVirtualPilot (data: {
    //     virtualPilot: string,
    //     alertingConfig: string,
    //     scenario: string,
    //     wind: { deg: string, knot: string }
    // }): Promise<{
    //     err: string,
    //     //scenario: .... 
    //     bands: ScenarioDescriptor
    // }> {
    //     const msg: ExecMsg = {
    //         daaLogic: data.virtualPilot ||  "SimDaidalus_2.3_1-wind.jar",
    //         daaConfig: data.alertingConfig || "1.x/WC_SC_228_nom_b.conf",
    //         scenarioName: data.scenario || "H1.ic",
    //         wind: { knot: data?.wind?.knot || "0", deg: data?.wind?.deg || "0" },
    //         ownshipName: null
    //     };
    //     console.log(`Evaluation request for java alerting logic ${msg.daaLogic} and scenario ${msg.scenarioName}`);
    //     if (!this._repl[msg.daaLogic]) {
    //         const ws: DAAClient = new DAAClient();
    //         await ws.connectToServer();
    //         this._repl[msg.daaLogic] = ws;
    //     }
    //     const res = await this._repl[msg.daaLogic].send({
    //         type: DaaServerCommand.javaVirtualPilot,
    //         data: msg
    //     });
    //     try {
    //         if (res && res.data) {
    //             const data = JSON.parse(res.data);
    //             this._bands = data;
    //         }
    //         console.log("Flight data ready!", this._bands);
    //         return {
    //             err: res.err,
    //             bands: (this._bands) ? this._bands : null
    //         };
    //     } catch (parseError) {
    //         console.error("Error while parsing JSON bands: ", parseError);
    //         return {
    //             err: parseError,
    //             bands: null
    //         };
    //     }
        
    // }
    // /**
    //  * Returns LoS regions for the current simulation step
    //  * @deprecated
    //  */
    // getCurrentLoS (): DAALosRegion[] {
    //     if (this._selectedScenario && this._scenarios[this._selectedScenario] && this._los) {
    //         if (this._los.LoS && this.simulationStep < this._los.LoS.length) {
    //             return this._los.LoS[this.simulationStep].conflicts;
    //         } else {
    //             console.error(`LoS region could not be read for step ${this.simulationStep} (index out of bounds)`);
    //         }
    //     }
    //     return null;
    // }
    /**
     * Connects to the server to request the list of available daidalus versions 
     */
    async getDaaVersions(): Promise<string[]> {
        await this.connectToServer();
        const res = await this.client.send({
            type: DaaServerCommand.listDaaVersions,
        });
        if (res && res.data) {
            console.log(res);
            const versions: string[] = JSON.parse(res.data);
            if (versions) {
                // sort in descending order, so that newest version comes first
                this._daaVersions = versions.sort((a: string, b: string) => { return (a < b) ? 1 : -1; });
            }
        }
        return this._daaVersions;
    }
    /**
     * Connects to the server and sends a request to list the tail numbers for a given scenario
     */
    async getTailNumbers (scenarioName: string): Promise<string[]> {
        if (scenarioName) {
            console.log(`[daa-player] List tail number request (scenario ${scenarioName})`);
            await this.connectToServer();
            const req: GetTailNumbersRequest = {
                scenarioName
            };
            const ans = await this.client.send({
                type: DaaServerCommand.getTailNumbers,
                data: req
            });
            if (ans?.res?.tailNumbers) {
                console.log(`[daa-player] Tail numbers for scenario ${scenarioName}`, ans.res);
                return ans.res.tailNumbers;
            }
        }
        return [];        
    }
    /**
     * Connects to the server to request the list of available daidalus configurations 
     */
    async getDaaConfigurations (): Promise<string[]> {
        await this.connectToServer();
        const res = await this.client.send({
            type: DaaServerCommand.listConfigFiles
        });
        if (res && res.data) {
            console.log(res);
            const currentConfigurations: string = JSON.stringify(this._daaConfigurations);
            if (currentConfigurations !== res.data) {
                this._daaConfigurations = JSON.parse(res.data);
                // refresh front-end
                await this.refreshConfigurationView();
            } else {
                console.log(`[daa-player] Configurations already loaded`, res.data);
            }
        }
        return this._daaConfigurations;
    }
    /**
     * Returns the daidalus configuration currently selected in the player interface
     */
    readSelectedDaaConfiguration (): string {
        return $(`#${this.daaConfigurationDomSelector}-list`)[0] ?
            $(`#${this.daaConfigurationDomSelector}-list option:selected`).text()
                : null;
    }
    /**
     * Programmatically selects a daidalus configuration in the player interface
     */
    async selectDaaConfiguration (configName: string): Promise<boolean> {
        if (configName) {
            // by convention, configuration have an extension .conf
            if (!configName.endsWith(".conf")) { configName = configName + ".conf"; }
            const prev: string = this.readSelectedDaaConfiguration();
			// try exact match
			let candidates: JQuery<HTMLElement> = $(`#${this.daaConfigurationDomSelector}-list option`).filter((index, elem) => {
				return elem.textContent === configName;
			});
			// if none matches, try best match
			if (candidates.length === 0) {
				candidates = $(`#${this.daaConfigurationDomSelector}-list option`).filter((index, elem) => {
					return elem.textContent.endsWith(configName);
				});
			}
			// sanity check
			if (candidates.length === 1) {
				const selected: string = candidates.text();
				console.log(`[daa-player] selectConfiguration`, { prev, selected, configName });
				$(`#${this.daaConfigurationDomSelector}-list option:contains("${configName}")`).prop("selected", true);
				// const selected: string = this.getSelectedConfiguration();
				if (prev !== selected) {
					await this.refreshConfigurationAttributesView(selected);   
				}
				return selected?.includes(configName);
			}
			console.warn(`[daa-player] Warning: unable to select configuration ${configName} (configuration name matches ${candidates.length} configuration names)`, { candidates });
        }
        return false;
    }
    /**
     * Returns the daidalus version currently selected in the player interface
     */
    readSelectedDaaVersion (): string {
        const selectedVersion: string = $(`#${this.daaVersionDomSelector}-list`)[0] ?
            $(`#${this.daaVersionDomSelector}-list option:selected`).text()
                : null;
		// display the DAIDALUS configuration only if the selected logic is DAIDALUS 
		if (selectedVersion?.includes("DAIDALUS")) {
			this.revealDaaConfigurationSelector();
		} else {
			this.hideDaaConfigurationSelector();
		}
		return selectedVersion;
    }
    /**
     * Programmatically selects a daidalus version in the player interface
     */
    selectDaaVersion (versionName: string): boolean {
        if (versionName) {
            $(`#${this.daaVersionDomSelector}-list option:contains("${versionName}")`).prop("selected", true);
            return this.readSelectedDaaVersion()?.includes(versionName);
        }
        return false;
    }
    /**
     * Returns the name of the app loaded in the player
     */
    getSelectedLogic(): string {
        const sel: string = $(`#${this.daaVersionDomSelector}-list option:selected`).text();
        return sel;
    }
    /**
     * Wind configuration
     * @return JSON object { knot: string, deg: string } 
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    getSelectedWind (): { knot: string, deg: string } {
        let knotVal: number = 0;
        let degVal: number = 0;
        const fromTo: string = $(`#${this.windDomSelector}-from-to-selector option:selected`).attr("value");
        if ($(`#${this.windDomSelector}-list-knots option:selected`).attr("value")) {
            knotVal = +$(`#${this.windDomSelector}-list-knots option:selected`).attr("value");
            degVal = +$(`#${this.windDomSelector}-list-degs option:selected`).attr("value");
        } else {
            knotVal = +$(`#${this.windDomSelector}-list-knots`).val() || 0;
            degVal = +$(`#${this.windDomSelector}-list-degs`).val() || 0;
        }
        if (fromTo === "to") {
            degVal = degVal + 180; 
        }
        return {
            knot: isFinite(knotVal) ? `${knotVal}` : "0", 
            deg: isFinite(degVal) ? `${degVal}` : "0"
        };    
    }
    getSelectedWedgeAperture (): number {
        const aperture: string = $(`#${this.id}-max-compass-wedge-aperture-input`).attr("value");
        return +aperture;
    }
    /**
     * @function <a name="play">play</a>
     * @description Starts the simulation run
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    playControl (): DAAPlayer {
        // opt = opt || {};
        // this.ms = opt.ms || this.ms || 1000;
        // return (opt.paused) ? this.step({ preventIncrement: true }) // this step is done to initialise the simulation
        //             : this.setInterval(this.step, this.ms);
        // return this.setInterval(this.step, this.ms);
        if (!this._timer_active) {
            // if we are on the last simulation step and press the play button, we roll over to the beginning of the simulation
            if (this.getCurrentSimulationStep() === this.getSimulationLength() - 1) {
                this.gotoControl(0);
            }
            if (this.getCurrentSimulationStep() < this.getSimulationLength()) {
                this.setInterval(async () => {
                    await this.stepControl(this.getCurrentSimulationStep());
                }, this.ms);
            } else {
                // this is done to make sure all timers are off
                this.clearInterval();
            }
        }
        return this;
    }

    /**
     * Utility function, returns true if the player is running a playback
     */
    isPlaying (): boolean {
        return this._timer_active;
    }

    // /**
    //  * @function <a name="setScenario">setScenario</a>
    //  * @description Selects a scenario
    //  * @memberof module:DAAPlaybackPlayer
    //  * @instance
    //  */
    // setScenario (scenario) {
    //     this.scenario = scenario;
    // }
    /**
     * Current flight data (i.e., flight data for the current simulation step).
     * @return {Object} Flight data, including position and velocity of ownship and traffic.
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    getCurrentFlightData (): LLAData {
        if (this._selectedScenario && this._scenarios[this._selectedScenario]) {
            const step: number = this.getCurrentSimulationStep();
            if (step < this._scenarios[this._selectedScenario].length) {
                const time: string = this._scenarios[this._selectedScenario].steps[step];
                return this._scenarios[this._selectedScenario].lla[time];
            } else {
                console.error("[getCurrentFlightData] Error: Incorrect simulation step (array index out of range for flight data)");
            }
        }
        return null;
    }
    /**
     * Returns the current traffic metrics
     */
    getCurrentTrafficMetrics (): AircraftMetrics[] {
        const bands: ScenarioDataPoint = this.getCurrentBands();
        const ans: AircraftMetrics[] = bands?.Metrics?.aircraft;
        if (ans?.length) {
            const alertsInfo: Alert[] = bands?.Alerts?.alerts;
            for (let i = 0; i < alertsInfo?.length; i++) {
                if (i < ans.length) {
                    ans[i].alert = alertsInfo[i];
                } else {
                    console.warn(`[daa-player] Warning: alert data is given but aircraft data is missing`, alertsInfo[i]);
                }
            }
        }
        return ans;
    }
    /**
     * Returns the current ownship state, including position, velocity, wind, metrics, etc, see also interface OwnshipState
     */
    getCurrentOwnshipState (): OwnshipState {
        const scenario: ScenarioDataPoint = this.getCurrentBands();
        return scenario?.Ownship;
    }
    /**
     * Returns the current flight data
     * The difference between getFlightData and getCurrentFlightData is that 
     * the former returns the entire scenario and the latter only the info for the current simulation step
     */
    getFlightData (): LLAData[] {
        if (this._selectedScenario && this._scenarios[this._selectedScenario]) {
            return Object.keys(this._scenarios[this._selectedScenario].lla).map((key: string) => {
                return this._scenarios[this._selectedScenario].lla[key]
            });
        }
        return null;
    }
    /**
     * Returns the current scenario
     * The optional argument can be used to retrieve a specific scenario
     */
    getCurrentScenario (scenario?: string): DAAScenario {
        const selectedScenario: string = scenario || this._selectedScenario;
        return this._scenarios[selectedScenario];
    }
    /**
     * Returns the current simulation time
     */
    getCurrentSimulationTime (): string {
        return this.getTimeAt(this.getCurrentSimulationStep());
    }
    /**
     * Returns the simulation time of a given simulation step
     * Alias for getTimeAt
     */
    getSimulationTime (step: number): string {
        return this.getTimeAt(step);
    }
    /**
     * Returns the length of the current simulation loaded in the player
     */
    getSimulationLength (): number {
        return this._simulationLength;
    }
    /**
     * Utility function, returns the current simulation step
     */
    getCurrentSimulationStep (): number {
        return this.simulationStep;
    }
    /**
     * Utility function, reads the current simulation step from the corresponding DOM element
     */
    readCurrentSimulationStep (): number {
        return parseInt(<string> $(`#${this.id}-curr-sim-step`)?.html());
    }
    /**
     * Utility function, reads the target simulation speed input from the corresponding DOM element
     */
    readSelectedSimulationSpeed (): string {
        return <string> $(`#${this.id}-speed-input`)?.val();
    }
    /**
     * Utility function, reads the goto time input from the corresponding DOM element
     */
    readGotoTimeInput (): string {
        return <string> $(`#${this.id}-goto-time-input`)?.val();
    }
    /**
     * Utility function, reads the aural guidance kind selected in the corresponding DOM element
     */
    readSelectedAuralGuidance (): string {
        return <string> $(`#${this.id}-aural-guidance-list option:selected`)?.val();
    }
    /**
     * Utility function, reads the voice name selected in the corresponding DOM element
     */
    readSelectedVoiceName (): string {
        return <string> $(`#${this.id}-voice-name-list option:selected`)?.val();
    }
    /**
     * Utility function, reads the voice pitch input from the corresponding DOM element
     */
    readSelectedVoicePitch (): number {
        return parseFloat(<string> $(`#${this.id}-voice-pitch-input`)?.val());
    }
    /**
     * Utility function, reads the voice rate input from the corresponding DOM element
     */
    readSelectedVoiceRate (): number {
        return parseFloat(<string> $(`#${this.id}-voice-rate-input`)?.val());
    }
    /**
     * Returns the virtual time associated with a given simulation step
     */
    getTimeAt (step: number): string {
        if (!isNaN(step)) {
            if (this._selectedScenario && this._scenarios[this._selectedScenario]) {
                if (step < this._scenarios[this._selectedScenario].length) {
                    return this._scenarios[this._selectedScenario].steps[step];
                } else {
                    console.warn("[getTimeAt] Warning: step exceeds scenario length", { step, selectedScenarioName: this._selectedScenario, selectedScenario: this._scenarios[this._selectedScenario]});
                }
            } else {
                console.warn("[getTimeAt] Warning: Scenario data not loaded");
            }
        }
        console.error("[daa-player] Error: Incorrect simulation step", { step });
        return null;
    }
    /**
     * Utility function, finds the step corresponding to the given time
     */
    getStep (time: string): number {
        if (this._selectedScenario && this._scenarios[this._selectedScenario]) {
            const step: number = this._scenarios[this._selectedScenario].steps.findIndex(tm => {
                return +tm === +time;
            });
            return (step >= 0) ? step : null;
        }
        return null;
    }
    /**
     * Returns all bands for all simulation steps
     */
    getBandsData (): ScenarioData {
        if (this._selectedScenario && this._scenarios[this._selectedScenario] && this._bands) {
            return this._bands;
        }
        return null;
    }
    /**
     * Returns the bands for the current simulation step
     */
    getCurrentBands (step?: number): ScenarioDataPoint {
        const res: ScenarioDataPoint = {
            Wind: { deg: "0", knot: "0" },
            Ownship: null,
            Alerts: null,
            "Altitude Bands": null,
            "Heading Bands": null,
            "Horizontal Speed Bands": null,
            "Vertical Speed Bands": null,
            "Altitude Resolution": null,
            "Horizontal Direction Resolution": null,
            "Horizontal Speed Resolution": null,
            "Vertical Speed Resolution": null,
            "Contours": null,
            "Hazard Zones": null,
            Monitors: null,
            Metrics: null,
            WindVectors: null
        };
        step = (step === undefined) ? this.getCurrentSimulationStep() : step;
        if (this._selectedScenario && this._scenarios[this._selectedScenario] && this._bands) {
            if (this._bands) {
                for (const key in res) {
                    switch (key) {
                        case "Monitors": {
                            res[key] = this._bands[key];
                            break;
                        }
                        case "Wind": {
                            res[key] = this._bands[key];
                            break
                        }
                        default: {
                            if (this._bands[key] && step < this._bands[key].length) {
                                res[key] = this._bands[key][step];
                            }
                        }
                    }
                }
            }
        }
        return res;
    }
    /**
     * @function <a name="getParams">getParams</a>
     * @description Returns the configuration parameters (if any) used for the simulation.
     * @return {Object} Flight data.
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    getParams (conf: string): string {
        // conf can be std, nomA, nomB
        conf = conf || "std";
        console.log(`loading configuration ${conf}`);
        const params = [];
        // this._scenarios[this._selectedScenario].params[conf].split(",").forEach((assignment) => {
        //     let data = assignment.split(":=");
        //     if (data.length > 1 && !isNaN(+data[1])) {   
        //         let ans = [ data[0] ];
        //         // ans.push((+data[1]).toFixed(this.precision)); --- the builtin function toFixed(...) provides inaccurate answers!?
        //         let val = Math.floor((+data[1]) * Math.pow(10, this.precision)) / Math.pow(10, this.precision);
        //         ans.push(val.toString());
        //         params.push(ans.join(":= "));
        //     } else {
        //         params.push(assignment);
        //     }
        // });
        return params.join(",");
    }
    /**
     * Name of the scenario currently selected in the player.
     * Scenarios are selected using the DOM controls on the interface, see selectScenario()
     * If no scenario is selected, get the first scenario available in the player is automatically selected and returned
     * @return {string} Name of the scenario 
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    getSelectedScenario (): string {
        // if no scenario is selected, select the first scenario available in the player
        if (!this._selectedScenario && Object.keys(this._scenarios).length) {
            this._selectedScenario = Object.keys(this._scenarios)[0];
        } 
        return this._selectedScenario;
    }
    /**
     * @function <a name="setInterval">setInterval</a>
     * @description Schedules the periodic execution of a function.
     *              This can be used, e.g., to schedule the execution of simulation steps.
     *              This function differs from the standard windows.setInterval in that it can handle situations 
     *              where the time to execute a simulation step might be larger than the time set for the 
     *              simulation interval (e.g,. because the computer running the simulation is not fast enough
     *              to keep up with the simulation inteval). In those situations, the simulation interval is 
     *              extended to match the time necessary to complete a simulation step.
     * @param fun {Function} The step function to be executed.
     * @param ms {real} The duration of the simulation interval, in milliseconds.
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    async setInterval(fun: () => void, ms?: number) {
        if (!this._timer_active) {
            fun = (typeof fun === "function") ? fun : () => {
                console.error("[daa-player] Warning, step function is malformed :/");
            };
            this.ms = ms || this.ms || 1000;
            this._timer_active = true;
            while (this._timer_active) {
                const promises = [
                    new Promise<void>((resolve) => { setTimeout(resolve, this.ms); }),
                    new Promise<void>((resolve) => {
                        fun();
                        resolve();
                    })
                ];
                await Promise.all(promises);
                if (this.getCurrentSimulationStep() >= this.getSimulationLength()) {
                    this.clearInterval();
                }
            }
        }
        return this;
    }
    /**
     * @function <a name="clearInterval">clearInterval</a>
     * @description Stops the periodic execution of simulation steps.
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    clearInterval (): DAAPlayer {
        this._timer_active = false;
        this.clearTimerJiffy();
        return this;
    }
    /**
     * Stes a timer
     */
    setTimerJiffy (tname: string, f: () => void, step: number): void {
        this.timers[`${tname}-${step}`] = setTimeout(f, DAAPlayer.timerJiffy * step);
    }
    /**
     * Clears a timer
     */
    clearTimerJiffy (tname?: string): void {
        const keys: string[] = Object.keys(this.timers);
        const tk: string[] = (tname) ? keys.filter((timer) => { return timer.startsWith(`${tname}-`); }) : keys;
        if (tk && tk.length) {
            for (let i = 0; i < tk.length; i++) {
                clearTimeout(this.timers[tk[i]]);
            }
        }
    }
    /**
     * Writes an informative message in the status panel of the player, to inform the user about what is going on, e.g., loading a scenario
     */
    setStatus(msg: string) {
        $(`.daa-loading-status`).css("display", "block").text(msg);
    }
    /**
     * Indicates player ready
     */
    statusReady() {
        $(`.daa-loading-status`).css("display", "none").text("");
    }
    /**
     * Sets the ID of the DOM element where the daa-displays elements are attached
     */
    setDisplays (displays: string[]): DAAPlayer {
        this._displays = displays || [];
        return this;
    }
    /**
     * Appends the player navbar to the DOM. A spinner is also attached to the display.
     */
    appendNavbar(): void {
        const theHTML: string = Handlebars.compile(templates.navbarTemplate)({
            id: this.id,
            zoomables: $(".zoomable").length ? true : undefined
        });
        $('body').append(theHTML);
        if ($(".zoomable").length) {
            // adjust margin-left based on the presence of the sidebar
            const marginLeft: string = $("#sidebar-panel").css("width");
            $(".zoomable").css({ "margin-left": marginLeft, "padding-left": "40px" });
            // append zoom handlers
            $(`#${this.id}-zoom-minus`).on("click", () => {
                this.windowZoomLevel = (this.windowZoomLevel > this.minZoomLevel) ? this.windowZoomLevel - 20 : this.windowZoomLevel;
                const marginLeft: string = $("#sidebar-panel").css("width");
                const marginTop: string = (this.windowZoomLevel < 100) ? $(".navbar").css("height") : "0px";
                const scale: number = this.windowZoomLevel / 100;
                $(".zoomable").css({transform: `scale(${scale})`, "transform-origin": "left top", "margin-left": marginLeft, "margin-top": marginTop });
                if (this.windowZoomLevel <= 100) {
                    $(".zoomable-sidebar").css({ transform: `scale(${scale})`, "transform-origin": "left top", width: `${1 / scale * 90}%` });
                    $(".sidebar-optionals").css({ "margin-top": `-${(100 - this.windowZoomLevel) * 4}px`});
                }
            });
            $(`#${this.id}-zoom-plus`).on("click", () => {
                this.windowZoomLevel += 20;
                const marginLeft: string = $("#sidebar-panel").css("width");
                const marginTop: string = (this.windowZoomLevel < 100) ? $(".navbar").css("height") : "0px";
                const scale: number = this.windowZoomLevel / 100;
                $(".zoomable").css({ transform: `scale(${scale})`, "transform-origin": "left top", "left": marginLeft, "margin-top": marginTop });
                if (this.windowZoomLevel <= 100) {
                    $(".zoomable-sidebar").css({ transform: `scale(${scale})`, "transform-origin": "left top", width: `${1 / scale * 90}%` });
                    $(".sidebar-optionals").css({ "margin-top": `-${(100 - this.windowZoomLevel) * 4}px`});
                }
            });
        }
    }
    /**
     * Appends the daidalus/wellclear version selector to the DOM
     * The default configuration selected in the dropdown menu is the newest configuration, currently "DAIDALUSv2.0.2.jar", see also listVersion()
     */
    async appendDaaVersionSelector(opt?: { selector?: string, daaVersions?: string[] }): Promise<void> {
        opt = opt || {};
        this.daaVersionDomSelector = opt.selector || "sidebar-daidalus-version";
        if (this.daaVersionDomSelector === "sidebar-daidalus-version") {
            $(`.sidebar-version-optionals`).css({ display: "block" });
        }
        // update data structures
        this._daaVersions = opt.daaVersions || await this.getDaaVersions();
        // update the front-end
        this.refreshVersionsView();
    }
    /**
     * Appends the daidalus/wellclear configuration selector to the DOM
     */
    async appendDaaConfigurationSelector (opt?: { selector?: string, attributeSelector?: string }): Promise<void> {
        opt = opt || {};
        this.daaConfigurationDomSelector = opt.selector || "sidebar-daidalus-configuration";
        this.daaAttributesDomSelector = opt.attributeSelector || "sidebar-daidalus-configuration-attributes";
        // update data structures
        await this.getDaaConfigurations();
        // update the front-end
        await this.refreshConfigurationView();
    }
    /**
     * Reveal/Hide daa configuration selector
     */
    revealDaaConfigurationSelector (show?: boolean): boolean {
        show = show === undefined ? true : !!show;
        $(`#${this.daaConfigurationDomSelector}-list`).css({ display: show ? "block" : "none" });
        return show;
    }
    /**
     * Reveal/Hide daa configuration selector
     */
    hideDaaConfigurationSelector (hide?: boolean): boolean {
        hide = hide === undefined ? true : !!hide;
        return !this.revealDaaConfigurationSelector(!hide);
    }
    /**
     * Reveal/Hide daa logic selector
     */
    revealDaaLogicSelector (show?: boolean): boolean {
        show = show === undefined ? true : !!show;
        $(`#${this.daaVersionDomSelector}-list`).css({ display: show ? "block" : "none" });
        return show;
    }
    /**
     * Reveal/Hide daa logic selector
     */
    hideDaaLogicSelector (hide?: boolean): boolean {
        hide = hide === undefined ? true : !!hide;
        return !this.revealDaaLogicSelector(!hide);
    }
    /**
     * Appends the wind input element to the DOM
     */
    async appendWindSettings(opt?: { selector?: string, parent?: string, dropDown?: boolean, fromToSelectorVisible?: boolean }): Promise<void> {
        opt = opt || {};
        this.windDomSelector = opt.selector || this.windDomSelector
        // update the front-end
        this.refreshWindSettingsView(opt);
    }
    /**
     * Appends the panel for displaying monitored parameters to the DOM
     */
    async appendMonitorPanel(monitorDomSelector?: string): Promise<void> {
        monitorDomSelector = monitorDomSelector || "daa-monitors";
        this.monitorDomSelector = monitorDomSelector;
        const theHTML: string = Handlebars.compile(monitorTemplates.monitorPanelTemplate)({
            id: this.monitorDomSelector
        });
        $(`#${this.monitorDomSelector}`).append(theHTML);

        // list monitors supported by the wellclear version selected in the list (which is by default the first one in the list)
        const monitorList: string[] = await this.listMonitors({
            alertingLogic: this._daaVersions[0],
            wind: this.getSelectedWind()
        });
        if (monitorList && monitorList.length > 0) {
            for (let i = 0; i < monitorList.length; i++) {
                const monitorID: number = i + 1;
                this.daaMonitors.push({ id: monitorID, name: monitorList[i], color: "grey" });
            }
            this.appendMonitors(this.daaMonitors);
        }
    }
    /**
     * Appends the panel for displaying traffic information to the DOM
     */
    async appendTrafficPanel(domSelector?: string): Promise<void> {
        domSelector = domSelector || "daa-traffic";
        this.flightDataDomSelector = domSelector;
        const theHTML: string = Handlebars.compile(monitorTemplates.flightDataPanelTemplate)({
            id: this.flightDataDomSelector
        });
        $(`#${this.flightDataDomSelector}`).append(theHTML);
    }
    /**
     * Appends the panel for displaying monitor status to the DOM
     */
    protected appendMonitors(monitors: { id: number, name: string, color: string }[], opt?: { installHandlers?: boolean }): void {
        if (monitors) {
            opt = opt || {};
            const theHTML: string = Handlebars.compile(monitorTemplates.monitorTemplate)({
                id: this.monitorDomSelector,
                monitors: monitors.map((monitor: { id: number, name: string, color: string }) => {
                    monitor.color = monitor.color || "unknown";
                    const id: string = `${this.id}-monitor-${monitor.id}`;
                    const color: string = DAAPlayer.colorMap[monitor.color] || "grey";
                    const text: string = monitor.color.slice(0, 1).toUpperCase();
                    const textcolor: string = (monitor.color === "red") ? "white" : "black";
                    const checkbox: boolean = (monitor.color === "red" || monitor.color === "yellow");
                    return { name: monitor.name, color, id, textcolor, text, checkbox };
                })
            });
            $(`#${this.monitorDomSelector}`).append(theHTML);
            if (opt.installHandlers) {
                // install monitor handlers
                const keys: string[] = Object.keys(this.monitorEventHandlers);
                for (let i = 0; i < keys.length; i++) {
                    this.monitorEventHandlers[keys[i]]();
                }
            }
        }
    }
    /**
     * Internal function, clears the monitor panel
     */
    protected removeMonitors(): void {
        $(`#${this.monitorDomSelector}-list`).remove();
    }
    /**
     * Updates monitor information
     */
    updateMonitors (): void {
        this.removeMonitors();
        if (this._bands && this._bands.Monitors) {
            this.appendMonitors(this._bands.Monitors, { installHandlers: true });
        }
    }
    /**
     * Internal function, clears the content of the data panel on the right-size of the view
     */
    protected removeFlightData(): void {
        $(`#${this.flightDataDomSelector}-list`).remove();
    }
    /**
     * Internal function, updates encounter data in the data panel on the right-side of the view
     * This function is to be used with DAIDALUS 1.x
     */
    protected appendFlightData (flightData: FlightData): void {
        if (flightData) {
            const theHTML: string = Handlebars.compile(monitorTemplates.flightDataTemplate)({
                id: this.flightDataDomSelector,
                currentTime: this.getCurrentSimulationTime(),
                ownship: {
                    ...flightData.ownship,
                    s: flightData.ownship?.s ? {
                        lat: parseFloat(`${flightData.ownship.s.lat}`).toFixed(2),
                        lon: parseFloat(`${flightData.ownship.s.lon}`).toFixed(2),
                        alt: parseFloat(`${flightData.ownship.s.alt}`).toFixed(2)
                    } : undefined,
                    v: flightData.ownship?.v ? {
                        x: parseFloat(`${flightData.ownship.v.x}`).toFixed(2),
                        y: parseFloat(`${flightData.ownship.v.y}`).toFixed(2),
                        z: parseFloat(`${flightData.ownship.v.z}`).toFixed(2)
                    } : undefined
                },
                traffic: flightData.traffic?.map(data => {
                    return {
                        ...data,
                        s: data.s ? {
                            lat: parseFloat(`${data.s.lat}`).toFixed(2),
                            lon: parseFloat(`${data.s.lon}`).toFixed(2),
                            alt: parseFloat(`${data.s.alt}`).toFixed(2)
                        } : undefined,
                        v: data.v ? {
                            x: parseFloat(`${data.v.x}`).toFixed(2),
                            y: parseFloat(`${data.v.y}`).toFixed(2),
                            z: parseFloat(`${data.v.z}`).toFixed(2)
                        } : undefined    
                    }
                })
            });
            $(`#${this.flightDataDomSelector} .encounter-data`).html(theHTML);
        }
    }
    /**
     * Internal function, updates encounter data in the data panel on the right-side of the view
     * This function is to be used with DAIDALUS 2.x
     */
    protected appendEncounterData (data: { ownship: OwnshipState, traffic: AircraftMetrics[], bands: ScenarioDataPoint }): void {
        Handlebars.registerHelper("printValUnits", function(valunits:ValUnits) {
            let html = "";
            html += valunits.val;
            if (isNaN(+valunits.val)) {
                return html;
            } 
            html += " " + valunits.units;
            if (valunits.internal) {
                html += " ("+valunits.internal+" "+valunits.internal_units+")";
            }
            return html;
          });
          if (data) {
            const mapResolution = (name: string, down: string, up: string) => {
                return data?.bands ? {
                    ...data.bands[name],
                    direction: isNaN(data.bands[name]?.preferred_resolution?.valunit?.val) ? undefined : { down, up },
                    recovery: data.bands[name]?.flags.recovery ? {
                        ...data.bands[name]?.recovery,
                    } : undefined
                }: null;
            };
            const theHTML: string = Handlebars.compile(monitorTemplates.encounterDataTemplate)({
                id: this.flightDataDomSelector,
                currentTime: this.getCurrentSimulationTime(),
                ownship: data?.ownship,
                traffic: data?.traffic,
                resolutions: {
                    "Horizontal Direction Resolution": mapResolution("Horizontal Direction Resolution", "Left", "Right"),
                    "Horizontal Speed Resolution": mapResolution("Horizontal Speed Resolution", "Down", "Up"),
                    "Vertical Speed Resolution": mapResolution("Vertical Speed Resolution", "Down", "Up"),
                    "Altitude Resolution": mapResolution("Altitude Resolution", "Down", "Up")
                }
            });
            $(`#${this.flightDataDomSelector} .encounter-data`).html(theHTML);
        }
    }
    /**
     * Diplays flight data in a side panel
     */
    displayFlightData (): void {
        this.removeFlightData();
        const flightInfo: LLAData = this.getCurrentFlightData();
        const trafficMetrics: AircraftMetrics[] = this.getCurrentTrafficMetrics();
        const ownshipState: OwnshipState = this.getCurrentOwnshipState();
        const bands: ScenarioDataPoint = this.getCurrentBands();
        const flightData: FlightData = flightInfo;
        if (trafficMetrics) {
            this.appendEncounterData({ ownship: ownshipState, traffic: trafficMetrics, bands });
        } else {
            this.appendFlightData(flightData);
        }
    }
    /**
     * @function <a name="simulationControls">simulationControls</a>
     * @description Utility function for attaching simulation controls to the DOM.
     * @param opt {Object} Configuration options for simulation controls (play, pause, step, goto, identify simulation, simulatioin speed)
     *          <li>parent (String): the identifier of the DOM element where the controls should be attached</li>
     *          <li>top (real): top margin of the simulation controls</li>
     *          <li>left (real): left margin of the simulation controls</li>
     *          <li>width (real): the width of the bar displaying the simulation controls</li>
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    appendSimulationControls(opt?: {
        parent?: string,
        top?: number,
        left?: number,
        width?: number,
        htmlTemplate?: string,
        multiplay?: { cssClass?: string, id: string, label: string }[]
        displays?: string[] // daa display associated to the controls, a loading spinner will be attached to this DOM element
    }): void {
        opt = opt || {};
        opt.parent = opt.parent || (`${this.id}-simulation-controls`);
        opt.top = (isNaN(opt.top)) ? 0 : opt.top;
        opt.left = (isNaN(opt.left)) ? 0 : opt.left;
        opt.width = (isNaN(+opt.width)) ? 1100 : opt.width;

        this._displays = opt.displays;

        if (document.getElementById(opt.parent) === null) {
            utils.createDiv(opt.parent, opt);
        }

        this._simulationControls = {
            htmlTemplate: opt.htmlTemplate || templates.playbackTemplate,
            parent: utils.jquerySelector(opt.parent),
            width: opt.width,
            top: opt.top,
            left: opt.left
        }; 
        this.renderSimulationControls(opt);

        const speed: number = parseFloat(<string> $(`#${this.id}-speed-input`).val());
        this.setSpeed(speed);

        // install handlers for simulation controls play/pause/restart/goto/...
        $(`#${this.id}-play`).on("click", () => { this.playControl(); });
        $(`#${this.id}-pause`).on("click", () => { this._handlers.pause(); });
        $(`#${this.id}-step`).on("click", () => { this._handlers.step(); });
        $(`#${this.id}-back`).on("click", () => { this._handlers.back(); });
        $(`#${this.id}-goto`).on("click", () => { this._handlers.goto(); });
        $(`#${this.id}-goto-input`).on("change", () => { this._handlers.goto(); });
        $(`#${this.id}-goto-time`).on("click", () => { this._handlers.gotoTime(); });
        $(`#${this.id}-goto-time-input`).on("change", () => { this._handlers.gotoTime(); });
        $(`#${this.id}-identify`).on("click", () => { this._handlers.identify(); });
        $(`#${this.id}-speed-input`).on("input", () => { this._handlers.speed(); });
        $(`#${this.id}-refresh-daidalus-configurations`).on("click", () => { this._handlers.daaConfigurationReloader(); });
        $(`#${this.id}-refresh-daidalus-versions`).on("click", () => { this._handlers.daaVersionReloader(); });
    }
    /**
     * @function <a name="simulationPlot">simulationPlot</a>
     * @description Creates a simulation plot
     * @param id {String} Unique plot identifier
     * @param desc {Object} Simulation options
     *              <li>paused (bool): Whether only the current simulation step should be executed (paused = true), or all simulation steps one after the other (paused = false). (default: paused = false)</li>
     *              <li>ms (real): simulation speed, in terms of temporal duration of a simulation step.</li>
     *              <li>type (String): type of plot. Currently, "spectrogram" is the only type of plot supported.</li>
     *              <li>units (Object({ from: String, to: String })): information about plot units: "from" identifies the units of the data; "to" identifies the units of the plot. 
     *                  Valid units are (grouped by conversion classes): "rad"/"deg"; "msec"/"knots"; "meters"/"feet"; "mpm"/"fpm 100x" </li>
     *              <li>label (String): plot label</li>
     *              <li>range (Object({ from: real, to: real })): plot range</li>
     *              <li>parent (String): parent element in the DOM where the plot should be attached</li>
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    appendSimulationPlot(desc: PlotDescriptor, opt?: { overheadLabel?: boolean }): DAAPlayer {
        desc.type = desc.type || "spectrogram";
        opt = opt || {};
        if (desc.type === "spectrogram") {
            const simulationLength: number = this.getSimulationLength();
            this._plot[desc.id] = new DAASpectrogram(`${this.id}-${desc.id.replace(/\s/g, "")}`, {
                top: desc.top, left: desc.left, height: desc.height, width: desc.width
            }, { 
                units: desc.units,
                length: simulationLength,
                label: desc.label,
                range: desc.range,
                time: (this._scenarios && this._scenarios[this._selectedScenario] && this._scenarios[this._selectedScenario].steps) ? {
                    start: this._scenarios[this._selectedScenario].steps[0],
                    mid: this._scenarios[this._selectedScenario].steps[Math.floor(simulationLength / 2)],
                    end: this._scenarios[this._selectedScenario].steps[simulationLength - 1]
                } : null,
                player: desc.player || this,
                parent: desc.parent,
                overheadLabel: opt.overheadLabel
            });
        }
        return this;
    }
    /**
     * Refresh the list of scenario files
     */
    async refreshScenarioFiles (): Promise<void> {
        return await this.appendScenarioSelector();
    }
    /**
     * Appends scenario selector to the DOM
     */
    async appendScenarioSelector(): Promise<void> {
        try {
            const scenarios: string[] = await this.listScenarioFiles();
            const theHTML: string = Handlebars.compile(templates.daaScenariosListTemplate)({
                scenarios: scenarios.map((name: string, index: number) => {
                    return {
                        id: safeSelector(name),
                        name: name, 
                        selected: (this._selectedScenario) ? this._selectedScenario === name : index === 0
                    };
                }),
                selectedScenario: safeSelector(this._selectedScenario),
                id: this.id
            });
            $(`#${this.id}-scenarios-list`).remove();
            $(`#${this.id}-scenarios`).append(theHTML);
            // install handlers for click events on scenarios
            if (scenarios) {
                for (let i = 0; i < scenarios.length; i++) {
                    // event handler
                    $(`#${this.id}-scenario-${safeSelector(scenarios[i])}`).on("click", async () => {
                        this.onDidChangeScenarioSelection(scenarios[i]);
                        // this.selectScenario(scenarios[i]);
                    });
                }
            }
            $(`#${this.id}-refresh-scenarios`).on("click", () => {
                this._handlers.daaScenarioReloader(scenarios);
            });
        } catch (error) {
            console.error("[daa-player] Warning: could not append scenario selector", error);
        }
    }
    /**
     * Internal function, handler invoked when a scenario is selected
     */
    protected onDidChangeScenarioSelection (selectedScenario: string): void {
        this.selectScenario(selectedScenario);
        const evt: DidChangeDaaScenarioSelection = { selectedScenario };
        this.trigger(PlayerEvents.DidChangeDaaScenarioSelection, evt);
    }

    /**
     * Programmatically select a scenario in the user interface
     * @param scenarioName 
     */
    selectScenario (scenarioName: string): boolean {
        const elem: string = `#${this.id}-scenario-${safeSelector(scenarioName)}`;
        if (elem && elem[0]) {
            $(elem).prop("selected", true);
            this._selectedScenario = scenarioName;
            this.disableSimulationControls();
            this.revealActivationPanel();
            return true;
        }
        return false;
    }

    //-- refresh functions ------------

    /**
    * Utility function for refreshing simulation controls to the DOM.
    * @param opt {Object} Configuration options for simulation controls (play, pause, step, goto, identify simulation, simulatioin speed)
    *          <li>parent (String): the identifier of the DOM element where the controls should be attached</li>
    *          <li>top (real): top margin of the simulation controls</li>
    *          <li>left (real): left margin of the simulation controls</li>
    *          <li>width (real): the width of the bar displaying the simulation controls</li>
    * @memberof module:DAAPlaybackPlayer
    * @instance
    */
    refreshSimulationControls(opt?: {
        parent?: string,
        top?: number,
        left?: number,
        width?: number,
        scenarios?: string[],
        selectedScenario?: string,
        htmlTemplate?: string
    }): void {
        opt = opt || {};
        if (opt.scenarios && opt.scenarios.length > 0) {
            opt.selectedScenario = opt.selectedScenario || opt.scenarios[0];
        }
        if (this._simulationControls) {
            this._simulationControls.htmlTemplate = opt.htmlTemplate || templates.playbackTemplate;
            opt.top = this._simulationControls.top;
            opt.left = this._simulationControls.left;
            opt.width = this._simulationControls.width;
        }
        this.renderSimulationControls(opt);

        // install handlers for simulation controls play/pause/restart/goto/...
        $(`#${this.id}-play`).on("click", () => { this.playControl(); });
        $(`#${this.id}-pause`).on("click", () => { this._handlers.pause(); });
        $(`#${this.id}-step`).on("click", () => { this._handlers.step(); });
        $(`#${this.id}-back`).on("click", () => { this._handlers.back(); });
        $(`#${this.id}-goto`).on("click", () => { this._handlers.goto(); });
        $(`#${this.id}-goto-input`).on("change", () => { this._handlers.goto(); });
        $(`#${this.id}-goto-time`).on("click", () => { this._handlers.gotoTime(); });
        $(`#${this.id}-goto-time-input`).on("change", () => { this._handlers.gotoTime(); });
        $(`#${this.id}-identify`).on("click", () => { this._handlers.identify(); });
        $(`#${this.id}-speed-input`).on("input", () => { this._handlers.speed(); });
        // this._handlers.installConfigurationReloader();
        // this._handlers.installDaidalusVersionReloader();
    }
    /**
     * Refresh monitors information
     */
    refreshMonitors(): void {
        $(`.${this.monitorDomSelector}-checkbox`).prop("checked", false);
    }
    /**
     * Utility function, updates the visual appearance of the simulation plot (e.g., to match a new simulation length)
     */
    refreshSimulationPlots(): void {
        if (this._plot) {
            const simulationLength: number = this.getSimulationLength();
            const keys: string[] = Object.keys(this._plot);
            for (let i = 0; i < keys.length; i++) {
                const plotID: string = keys[i];
                // update range
                switch (plotID) {
                    case "horizontal-speed-bands": {
                        if (this.configInfo) {
                            this._plot[plotID].setRange(this.configInfo["horizontal-speed"]);
                        }
                        break;
                    }
                    case "vertical-speed-bands": {
                        if (this.configInfo) {
                            this._plot[plotID].setRange(this.configInfo["vertical-speed"]);
                        }
                        break;
                    }
                    case "altitude-bands": {
                        if (this.configInfo) {
                            this._plot[plotID].setRange(this.configInfo["altitude"]);
                        }
                        break;
                    }
                    default: {
                        // do nothing
                        break;
                    }
                }
                // update length
                this._plot[plotID].setLength(simulationLength, { 
                    start: this._scenarios[this._selectedScenario].steps[0],
                    mid: this._scenarios[this._selectedScenario].steps[Math.floor(simulationLength / 2)],
                    end: this._scenarios[this._selectedScenario].steps[simulationLength - 1]
                });
                this._plot[plotID].resetCursorPosition();
                // update overhead labels
                const selectedScenario: string = this.getSelectedScenario();
                const selectedConfiguration: string = this.readSelectedDaaConfiguration();
                const selectedWellClear: string = this.readSelectedDaaVersion();
                const wind: { knot: string, deg: string } = this.getSelectedWind();
                const scenario: string = (wind && wind.knot) ? `${selectedScenario} (wind ${wind.deg}deg ${wind.knot}knot)` : selectedScenario;
                this._plot[plotID].setOverheadLabel(`${selectedWellClear} - ${selectedConfiguration} - ${scenario}`);
            }
            // update DOM
            $(`#${this.id}-tot-sim-steps`).html((simulationLength - 1).toString());
        }
    }
    /**
     * Internal function, refreshes the daidalus/wellclear configuration selector
     */
    protected async refreshConfigurationView(): Promise<void> {
        const theHTML: string = Handlebars.compile(templates.daidalusConfigurationsTemplate)({
            configurations: this._daaConfigurations,
            id: this.daaConfigurationDomSelector
        });
        $(`#${this.daaConfigurationDomSelector}-list`).remove();
        $(`#${this.daaConfigurationDomSelector}-global-list`).remove();
        $(`#${this.daaConfigurationDomSelector}`).append(theHTML);
        $(`#${this.daaConfigurationDomSelector}`).css({ display: "flex" });

        const selected: string = this.readSelectedDaaConfiguration();
        await this.refreshConfigurationAttributesView(selected);

        // update simulation when configuration changes
        $(`#${this.daaConfigurationDomSelector}-list`).on("change", async () => {
            await this.onDidChangeDaidalusConfiguration();
        });
    }
    /**
     * Internal function, handler invoked when a new daidalus configuration is selected in the DOM
     */
    protected async onDidChangeDaidalusConfiguration (): Promise<void> {
        this.disableSimulationControls();
        this.revealActivationPanel();
        const configName: string = this.readSelectedDaaConfiguration();
        // console.log(`new configuration selected for player ${this.id}: ${selectedConfig}`);
        const attributes: string[] = await this.refreshConfigurationAttributesView(configName);
        // trigger backbone event
        const evt: DidChangeDaaConfiguration = { attributes, configName };
        this.trigger(PlayerEvents.DidChangeDaaConfiguration, evt);
    }
    /**
     * Internal function, refreshes the daidalus/wellclear attributes displayed in the view
     */
    protected async refreshConfigurationAttributesView (selected: string): Promise<string[]> {
        if (selected) {
            console.log(`[daa-player] Refreshing config attributes (selected: ${selected})`);
            this.configInfo = await this.loadConfigFile(selected);
            console.log(`[daa-player] config info:`, this.configInfo);
            if (this.configInfo?.fileContent) {
                const attributes: string[] = this.configInfo.fileContent.replace("# Daidalus Object", "").trim().split("\n"); 
                if ($(`#${this.daaAttributesDomSelector}`)[0]) {
                    const theAttributes: string = Handlebars.compile(templates.daidalusAttributesTemplate)({
                        fileName: selected,
                        attributes,
                        id: this.daaAttributesDomSelector
                    });
                    $(`#${this.daaAttributesDomSelector}`).html(theAttributes);
                }
                if (this.mode === "developerMode") {
                    await this.clickDeveloperMode();
                } else if (this.mode === "normalMode") {
                    await this.clickNormalMode();
                }
                return attributes;
            }
        }
        return null;
    }
    /**
     * Internal function, refreshes the daidalus/wellclear version information displayed in the view
     */
    protected refreshVersionsView(): DAAPlayer {
        const theHTML: string = Handlebars.compile(templates.daidalusVersionsTemplate)({
            versions: this._daaVersions,
            id: this.daaVersionDomSelector
        });
        $(`#${this.daaVersionDomSelector}-list`).remove();
        $(`#${this.daaVersionDomSelector}`).append(theHTML);
        // append handlers for selection of well clear version
        $(`#${this.daaVersionDomSelector}-list`).on("change", async () => {
            this.onDidChangeDaidalusVersion();
        });
        return this;
    }
    /**
     * Internal function, handler invoked when a new daidalus version is selected
     */
    protected onDidChangeDaidalusVersion (): void {
        this.disableSimulationControls();
        this.revealActivationPanel();
        const versionName: string = this.readSelectedDaaVersion();
        // trigger backbone event
        const evt: DidChangeDaaVersion = { versionName };
        this.trigger(PlayerEvents.DidChangeDaaVersion, evt);
    }
    /**
     * Utility function, refreshes the wind settings input element displayed in the view
     */
    refreshWindSettingsView(opt?: { dropDown?: boolean, fromToSelectorVisible?: boolean }): DAAPlayer {
        opt = opt || {};
        if (opt.dropDown) {
            const knots: number[] = [];
            for (let i = 0; i <= 200; i+=10) {
                knots.push(i);
            }
            const degs: number[] = [];
            for (let i = 0; i < 360; i+=10) {
                degs.push(i);
            }
            const theHTML: string = Handlebars.compile(templates.windSettingsTemplate)({
                knots,
                degs,
                id: this.windDomSelector
            });
            $(`#${this.windDomSelector}-list`).remove();
            $(`#${this.windDomSelector}`).append(theHTML);
            // append handlers for wind selection
            $(`.${this.windDomSelector}-list`).on("change", () => {
                this.disableSimulationControls();
                this.revealActivationPanel();
            });
        } else {
            const theHTML: string = Handlebars.compile(templates.windSettingsInputGroupTemplate)({
                id: this.windDomSelector
            });
            $(`#${this.windDomSelector}`).append(theHTML);
            // append handlers for wind selection
            $(`.${this.windDomSelector}-list`).on("input", () => {
                this.disableSimulationControls();
                this.revealActivationPanel();
            });
        }
        $(`#${this.windDomSelector}-from-to-selector`).css({
            display: opt.fromToSelectorVisible ? "block" : "none"
        });
        return this;
    }
    /**
     * Returns a given plot
     * @param plotID {String} The identifier of the plot to be returned.
     * @return {Object} A plot object. The object type depends on the plot type.
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    getPlot(plotID: string): DAASpectrogram {
        return this._plot[plotID];
    }
}
