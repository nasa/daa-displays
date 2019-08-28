/**
 * @module DAAPlayer
 * @version 2.0.0
 * @description <div style="display:flex;"><div style="width:50%;">
 *              <b>Playback Player.</b>
 *              <p>This tool provides functions for the execution of scenario-based simulation runs. 
 *              Scenarios include information necessary to feed the functional logic
 *              of the prototype, e.g., position and velocity of ownship and traffic.
 *              This information can be based on pre-recorded real flight data, 
 *              or can be manually crafted to capture specific situations. 
 *              A front-end is provided to support interactive simulations, 
 *              with the usual controls start/pause/resume simulation. 
 *              Logging functions are provided to enable off-line analysis of simulation 
 *              traces.</p></div>
 *              <img src="images/daa-playback-player.png" style="margin-left:8%; margin-top:3%; max-height:180px;" alt="DAA Playback Player"></div>
 * @example
// file index.js (to be stored in pvsio-web/examples/demos/daa-displays/)
require.config({
    paths: { 
        widgets: "../../client/app/widgets",
        text: "../../client/app/widgets/daa-displays/lib/text/text"
    }
});
require(["widgets/daa-displays/daa-playback"], function (PlaybackPlayer) {
    "use strict";
    const player = new DAAPlaybackPlayer("player");
    // create simulation controls
    player.simulationControls({
        top: 860
    });
});

// file index.html (to be stored in pvsio-web/examples/demos/daa-displays/)
<!DOCTYPE HTML>
<html>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible">
        <title></title>
        <meta name="viewport" content="width=device-width">
        <link rel="stylesheet" href="../../client/app/widgets/daa-displays/lib/bootstrap/4.1.3/css/bootstrap.min.css">
        <link rel="stylesheet" href="../../client/app/widgets/daa-displays/lib/font-awesome/5.6.1/css/all.min.css">
        <link rel="stylesheet" href="../../client/app/widgets/daa-displays/css/daa-displays.css">
    </head>
    <script src="../../client/app/widgets/daa-displays/lib/underscore/underscore.js"></script>
    <script src="../../client/app/widgets/daa-displays/lib/jquery/jquery-3.3.1.slim.min.js"></script>
    <script src="../../client/app/widgets/daa-displays/lib/popper/popper-1.14.3.min.js"></script>
    <script src="../../client/app/widgets/daa-displays/lib/bootstrap/4.1.3/bootstrap.min.js"></script>
    <script src="../../client/app/widgets/daa-displays/lib/handlebars/handlebars-v4.0.12.js"></script>
    <script src="../../client/app/widgets/daa-displays/lib/requireJS/require.js" data-main="index.js"></script>
</html>

 * @author Paolo Masci
 * @date October 2018
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
import { DAALosRegion } from '../daa-server/utils/daa-server';

import { DAASpectrogram } from './daa-spectrogram';
import { DAAClient } from './utils/daa-client';
import { JavaMsg, LLAData, DAADataXYZ, DaidalusBandsDescriptor, BandElement } from '../daa-server/utils/daa-server';
import { DAAScenario, WebSocketMessage, LbUb, LoadScenarioRequest, LoadConfigRequest, BandRange, DaidalusBand, DAALosDescriptor } from './utils/daa-server';


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

export declare interface Handlers extends DAAPlaybackHandlers {
    scenarioReloader: (scenarios: string[]) => Promise<void>;
    configurationReloader: () => Promise<void>;
    daidalusVersionReloader: () => Promise<void>;
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

export function safeSelector(str: string): string {
    if (str) {
        if (str.endsWith(".daa")) {
            str = str.slice(0, -4);
        }
        return str.replace(/\.|\//g, "-");
    }
    return str;
}

export class DAAPlayer {
    readonly VERSION: string = "2.0.0";
    protected id: string;
    protected simulationStep: number;
    init: (args?: any) => Promise<void> = async function () { console.warn("[daa-player] Warning: init function has not been defined :/"); };
    step: (args?: any) => Promise<void> = async function () { console.warn("[daa-player] Warning: step function has not been defined :/"); };
    render: (args?: any) => Promise<void> = async function () { console.warn("[daa-player] Warning: rendering function has not been defined :/"); };
    plot: (args?: any) => Promise<void> = async function () { console.error("[daa-player] Warning: plot function has not been defined :/"); };
    protected ms: number;
    protected precision: number;
    protected _displays: string[];
    protected _scenarios: { [ daaFileName: string ]: DAAScenario } = {};
    protected _bands: DaidalusBandsDescriptor; // bands for the selected scenario
    protected _los: DAALosDescriptor;
    protected _selectedScenario: string;
    protected _selectedWellClear: string;
    protected _simulationLength: number;
    protected _repl: { [key: string]: DAAClient };
    protected _plot: { [plotName:string]: DAASpectrogram }; // TODO: this should be moved to daa-playback
    protected href: string;

    readonly appTypes: string[] = [ "wellclear", "los", "virtual-pilot" ];
    protected selectedAppType: string = this.appTypes[0]; 

    protected scenarioType: string = "daa"; // "daa" or "ic"

    protected _handlers: Handlers;
    protected _defines;
    protected _timer_active: boolean;
    protected _simulationControls: {
        htmlTemplate: string,
        parent: string,
        width?: number,
        top?: number,
        left?: number
    };
    protected _loadingScenario: boolean;

    // _versionCallback: () => void;
    // _configurationCallback: () => void;
    protected bridgedPlayer: DAAPlayer;

    protected _wellClearVersions: string[];
    protected _wellClearConfigurations: string[];
    protected ws: DAAClient;

    protected wellClearVersionSelector: string;
    protected wellClearConfigurationSelector: string;

    getWellClearVersionSelector(): string {
        return this.wellClearVersionSelector;
    }
    getWellClearConfigurationSelector(): string {
        return this.wellClearConfigurationSelector;
    }

    bridgePlayer(player: DAAPlayer) {
        this.bridgedPlayer = player;
    }

    public async stepControl(currentStep?: number): Promise<void> {
        currentStep = (currentStep !== undefined && currentStep !== null) ? currentStep : parseInt(<string> $(`#${this.id}-curr-sim-step`).html());
        if (!isNaN(currentStep)) {
            this.simulationStep = currentStep;
            if (this.simulationStep < this._simulationLength - 1) {
                this.simulationStep++;
                await this.gotoControl(this.simulationStep);
                if (this.bridgedPlayer) {
                    await this.bridgedPlayer.gotoControl(this.simulationStep);
                }    
            } else {
                await this.gotoControl(currentStep);
                this.clearInterval();
            }
        } else {
            console.error("[daa-player] Warning: currentStep is NaN");
        }
    }

    /**
     * @function <a name="DAAPlayback">DAAPlayback</a>
     * @description Constructor. Creates a new playback player.
     * @param id {String} Unique player identifier (default: "daa-playback").
     * @param opt {Object} Player options
     *          <li>label (String): human-readable label, useful for identifying the player (default: label = player id)</li>
     *          <li>fs (Object): FileSystem, used for saving simulation logs.</li>
     *          <li>scenarios (Object({ scenarioID: data })): scenarios to be simulated</li>
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    constructor (id?: string) {
        this.id = id || "daa-playback";
        this.ws = new DAAClient(); // this should only be used for serving files
        // this.fs = opt.fs;
        // // this.inputFileReader = null;
        // this.outputFileWriter = null;
        // this.scenario = null;
        this.simulationStep = 0; // current simulation step
        
        // this.timer = null;
        this.ms = 1000;
        this.precision = 16; // fractional precision
        this._displays = [];

        this._scenarios = {};
        this._selectedScenario = null;
        this._simulationLength = 0;

        this._repl = {}; // this is a set of websockets for communication with pvsio instances, one instance for each file
        this._plot = {};
 
        this._handlers = {
            init: () => {
                return new Promise(async (resolve, reject) => {
                    this.clearInterval();
                    await this.render();
                    resolve();
                });
            },
            step: () => {
                return new Promise(async (resolve, reject) => {
                    this.clearInterval();
                    await this.stepControl();
                    resolve();
                });
            },
            pause: () => {
                return new Promise(async (resolve, reject) => {
                    this.clearInterval();
                    resolve();
                });
            },
            back: () => {
                return new Promise(async (resolve, reject) => {
                    const current_step: number = parseInt(<string> $(`#${this.id}-curr-sim-step`).html());
                    await this._handlers.pause();
                    await this.gotoControl(current_step - 1); // note: this call is async
                    resolve();
                });
            },
            goto: () => {
                return new Promise(async (resolve, reject) => {
                    await this._handlers.pause();
                    await this.gotoControl();
                    resolve();
                });
            },
            gotoTime: () => {
                return new Promise(async (resolve, reject) => {
                    await this._handlers.pause();
                    await this.gotoTimeControl();
                    resolve();
                });
            },
            speed: () => {
                return new Promise(async (resolve, reject) => {
                    const speed: number = parseFloat(<string> $(`#${this.id}-speed-input`).val());
                    this.setSpeed(speed);
                    resolve();
                });
            },
            identify: () => {
                return new Promise(async (resolve, reject) => {
                    $(".daa-view-splash").css("display", "block").css("opacity", 0.5);
                    setTimeout(() => {
                        $(".daa-view-splash").css("display", "none");
                        resolve();
                    }, 1600);
                });
            },
            scenarioReloader: async (scenarios: string[]) => {
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
                    await this.selectScenarioFile(this._selectedScenario, { forceReload: true });
                }
                this.refreshSimulationControls();
                // await this.listConfigurations();
                setTimeout(() => {
                    this.statusReady();
                    console.log(`Done`, scenarios);
                }, 200)
            },
            configurationReloader: async () => {
                // define handler for the refresh button
                console.log(`Refreshing configuration list...`);
                this.setStatus('Refreshing configurations list...');
                const configurations: string[] = await this.listConfigurations();
                setTimeout(() => {
                    this.statusReady();
                    console.log(`Done`, configurations);
                }, 200)
            },
            daidalusVersionReloader: async () => {
                // define handler for the refresh button
                console.log(`Refreshing versions list...`);
                this.setStatus('Refreshing versions list...');
                const versions: string[] = await this.listVersions();
                await this.listConfigurations();
                setTimeout(() => {
                    this.statusReady();
                    console.log(`Done`, versions);
                }, 200)
            }
        };
        // these functions that can re-defined by the user using, e.g., define("step", function () {...})
        this._defines = {
            init: async (f: (p: DAAPlayer) => void, opt?) => {
                opt = opt || {};
                try {
                    await f(this);
                } catch (stepError) {
                    console.error("Init function has thrown a runtime exception: ", stepError);
                }
                this.gotoControl(0);
                // this.simulationStep = 0;
                // $(`#${this.id}-curr-sim-step`).html(this.simulationStep.toString());
            },
            step: async (f: (p: DAAPlayer) => void, opt?: { preventIncrement?: boolean }) => {
                opt = opt || {};
                if (this.simulationStep < this._simulationLength) {
                    try {
                        await f(this);
                    } catch (stepError) {
                        console.error("Step function has thrown a runtime exception: ", stepError);
                    }
                    $(`#${this.id}-curr-sim-step`).html(this.simulationStep.toString());
                    $(`#${this.id}-curr-sim-time`).html(this.getCurrentSimulationTime());
                    if (!opt.preventIncrement) {
                        this.simulationStep++;
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
     * Sets simulation speed
     * @param speed Simulation speed, in percentage: 100 is 1x, 1000 is 10x, etc.
     */
    setSpeed(speed: number) {
        if (!isNaN(speed) && speed > 0) {
            this.ms = 1000 / speed;
            $(`#${this.id}-speed-input`).val(speed);
        }
        return this;
    }

    /**
     * utility function, renders the DOM elements necessary to control a simulation (start, stop, goto, etc.)
     */
    private renderSimulationControls(opt?: {
        top?: number,
        left?: number,
        width?: number
    }) {
        opt = opt || {};
        const theHTML = Handlebars.compile(this._simulationControls.htmlTemplate)({
            id: this.id,
            top: opt.top,
            left: opt.left,
            width: opt.width
        });
        $(this._simulationControls.parent).html(theHTML);
        $(`#${this.id}-tot-sim-steps`).html(this._simulationLength.toString());
        // activate dropdown menus
        //@ts-ignore -- dropdown function is introduced by bootstrap
        $('.dropdown-toggle').dropdown();
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

        // make side panel resizeable
        const min: number = 20;
        $("#sidebar-resize").mousedown((e) => {
            e.preventDefault();
            $(document).on("mousemove", (e: JQuery.MouseMoveEvent) => {
                e.preventDefault();
                $("#sidebar-panel").removeClass("col-md-2");
                const x: number = e.pageX - $("#sidebar-panel").offset().left;
                if (x > min && e.pageX < $(window).width()) {
                    $("#sidebar-panel").css("width", x);
                }
            });
        });
        $(document).on("mouseup", (e: JQuery.MouseUpEvent) => {
            $(document).unbind("mousemove");
        });
        return this;
    }

    /**
     * utility function, renders the DOM elements necessary for controlling spectrograms
     */
    appendPlotControls(opt?: { top?: number, left?: number, width?: number, parent?: string }): DAAPlayer {
        opt = opt || {};
        opt.parent = opt.parent || (`${this.id}-simulation-controls`);
        opt.top = (isNaN(opt.top)) ? 0 : opt.top;
        opt.left = (isNaN(opt.left)) ? 0 : opt.left;
        opt.width = (isNaN(+opt.width)) ? 1800 : opt.width;
        const theHTML = Handlebars.compile(templates.spectrogramControls)({
            id: this.id,
            parent: opt.parent,
            top: opt.top, left: opt.left, width: opt.width
        });
        utils.createDiv(`${this.id}-spectrogram-controls`, { zIndex: 99, parent: opt.parent });
        $(`#${this.id}-spectrogram-controls`).html(theHTML);
        // install handlers
        $(`#${this.id}-reset`).on("click", () => {
            const selectedScenario: string = this.getSelectedScenario();
            this.selectScenarioFile(selectedScenario, { softReload: true }); // async call
        });
        $(`#${this.id}-plot`).on("click", async () => {
            await this.plot();
        });
        return this;
    }

    disableSelection() {
        $(`#${this.id}-scenarios-list`).attr("disabled", "true");
    }

    enableSelection() {
        $(`#${this.id}-scenarios-list`).removeAttr("disabled");
    }

    loadingAnimation() {
        if (this._displays) {
            for (const i in this._displays) {
                const display: string = this._displays[i];
                const width: number = $('.map-canvas').width() || 1072;
                const height: number = $('.map-canvas').height() || 854;
                const theHTML: string = Handlebars.compile(templates.loadingTemplate)({ width, height, id: `${this.id}-${display}-daa-loading` });
                $(`#${display}`).append(theHTML);
            }
        }
    }
    loadingComplete() {
        if (this._displays) {
            for (const i in this._displays) {
                $('.daa-loading').remove();
            }
        }
    }

    /**
     * Loads a .daa scenario file
     * @param scenarioName Name of the scenario. Default is H1.
     * @param ownship Information necessary to identify the ownship in the .daa file (either sequenceNumber or name, default is sequenceNumber=0)
     */
    async loadDaaFile (scenarioName: string, ownship?: {
        ownshipName?: string,
        ownshipSequenceNumber?: number
    }): Promise<string> {
        await this.connectToServer();
        const data: LoadScenarioRequest = { scenarioName, ownship };
        const res: WebSocketMessage<string> = await this.ws.send({
            type: "load-daa-file",
            data
        });
        if (res && res.data) {
            this._scenarios[scenarioName] = JSON.parse(res.data);
            console.log(`Scenario ${scenarioName} successfully loaded`, this._scenarios[scenarioName]);
        } else {
            console.error(`Error while loading scenario ${scenarioName}`);
        }
        return res.data;
    }

    /**
     * Loads all daa files contained in folder daa-scenarios
     * @returns Array of filenames
     */
    async loadScenarioFiles (): Promise<string[]> {
        const scenarioFiles: string[] = await this.listScenarioFiles();
        if (scenarioFiles && scenarioFiles.length > 0) {
            for (let i = 0; i < scenarioFiles.length; i++) {
                await this.loadDaaFile(scenarioFiles[i]);
            }
            await this.selectScenarioFile(scenarioFiles[0]);
        } else {
            console.warn(`Folder daa-scenarios is empty :/`);
        }
        return scenarioFiles;
    }

    /**
     * Returns the list of daa files available in folder daa-scenarios
     */
    async listScenarioFiles (): Promise<string[]> {
        await this.connectToServer();
        const res: WebSocketMessage<string> = await this.ws.send({
            type: `list-${this.scenarioType}-files`
        });
        let daaFiles = null;
        if (res && res.data) {
            daaFiles = JSON.parse(res.data) || [];
            // update data structures
            if (daaFiles && daaFiles.length > 0) {
                // populate the list of scenarios and load the first one
                daaFiles.forEach((scenario: string) => {
                    this._scenarios[scenario] = this._scenarios[scenario] || null;
                });
            }
            console.log(`${daaFiles.length} daa files available`, daaFiles);
        } else {
            console.error(`Error while listing daa files ${res}`);
        }
        return daaFiles;
    }

    async loadConfigFile (config: string): Promise<string> {
        await this.connectToServer();
        const data: LoadConfigRequest = { config };
        const res: WebSocketMessage<string> = await this.ws.send({
            type: "load-config-file",
            data
        });
        if (res && res.data) {
            console.log(`Configuration ${config} successfully loaded`, res.data);
            return res.data;
        } else {
            console.error(`Error while loading configuration file ${res}`);
        }
        return null;
    }

    /**
     * @function <a name="getCurrentSimulationStep">getCurrentSimulationStep</a>
     * @descrition Returns the current simulation step
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    getCurrentSimulationStep (): number {
        return this.simulationStep;
    }
    async reloadScenarioFile (): Promise<void> {
        const selectedScenario: string = this.getSelectedScenario();
        await this.selectScenarioFile(selectedScenario, { forceReload: true });
    }
    /**
     * Loads the scenario to be simulated. The available scenarios are those provided in the constructor, using parameter scenarios.
     * @param scenario {String} daa file name (e.g., H1.daa)
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    async selectScenarioFile (scenario: string, opt?: {
        forceReload?: boolean,
        softReload?: boolean,
        hideLoadingAnimation?: boolean
    }): Promise<void> {
        if (this._scenarios && !this._loadingScenario) {
            opt = opt || {};
            this.clearInterval();
            if (this._selectedScenario !== scenario || opt.forceReload || opt.softReload) {
                this._loadingScenario = true;
                if (!opt.hideLoadingAnimation) {
                    this.loadingAnimation();
                }
                this.setStatus(`Loading ${scenario}`);
                this.disableSelection();
                console.log(`Scenario ${scenario} selected`); 
                if (opt.forceReload || !this._scenarios[scenario]) {
                    console.log(`Loading scenario ${scenario}`); 
                    await this.loadDaaFile(scenario);
                    // console.log(`Loading complete!`);
                }
                this._selectedScenario = scenario;
                this.simulationStep = 0;
                this._simulationLength = this._scenarios[this._selectedScenario].length;
                // update DOM
                $(`#${this.id}-curr-sim-step`).html(this.simulationStep.toString());
                $(`#${this.id}-curr-sim-time`).html(this.getCurrentSimulationTime());
                $(`#${this.id}-tot-sim-steps`).html(this._simulationLength.toString());
                $(`#${this.id}-selected-scenario`).html(scenario);
                try {
                    if (opt.softReload) {
                        await this.gotoControl(0);
                    } else {
                        await this.init();
                    }
                } catch (loadError) {
                    console.error(`unable to initialize scenario ${scenario}`);
                } finally {
                    this.refreshSimulationPlots();
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
     *              <li>"step": defines the function executed at each simulation step</li>
     *              <li>"render": defines the render function necessary for rending the prototype associated with the simulation</li>
     * @param fname {String} Function name
     * @param fbody {Function () => void} Function body
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    define (fname: string, fbody: () => void) {
        if (fname === "step") {
            this.step = async (opt?: { preventIncrement: boolean }) => {
                await this._defines.step(fbody, opt);
                await this._defines.writeLog();
            };
        } else if (fname === "init") {
            this.init = async (opt) => {
                await this._defines.init(fbody, opt);
                await this._defines.writeLog();
            }
        } else if (fname === "plot") {
            this.plot = async () => {
                await fbody();
            }
        } else {
            this[fname] = fbody;
        }
        return this;
    }
    /**
     * @function <a name="gotoControl">gotoControl</a>
     * @description Goes to a given target simulation step
     * @param step {nat} Target simulation step.
     * @return {nat} The current simulation step, which corresponds to the target step (value clipped if target is outside the simulation range). 
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    async gotoControl (step?: number): Promise<void> {
        // get step from argument or from DOM
        step = (step !== undefined && step !== null) ? step : parseInt(<string> $(`#${this.id}-goto-input`).val());
        // sanity check
        step = (step > 0) ? (step < this._simulationLength) ? step : (this._simulationLength - 1) : 0;
        this.simulationStep = isNaN(step) ? 0 : step;
        // update DOM
        $(`#${this.id}-curr-sim-step`).html(this.simulationStep.toString());
        $(`#${this.id}-curr-sim-time`).html(this.getCurrentSimulationTime());
        this.step({ preventIncrement: true });
        if (this.bridgedPlayer) {
            await this.bridgedPlayer.gotoControl(this.simulationStep);
        }
    }

        /**
     * @function <a name="gotoTimeControl">gotoTimeControl</a>
     * @description Goes to a given target simulation step
     * @param step {nat} Target simulation step.
     * @return {nat} The current simulation step, which corresponds to the target step (value clipped if target is outside the simulation range). 
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    async gotoTimeControl (time?: string): Promise<DAAPlayer> {
        // get time from argument or from DOM
        time = (time !== undefined && time !== null) ? time : <string> $(`#${this.id}-goto-time-input`).val();
        // find time in the current scenario
        if (this._scenarios && this._selectedScenario && this._scenarios[this._selectedScenario] && this._scenarios[this._selectedScenario].steps) {
            const steps: string[] = this._scenarios[this._selectedScenario].steps;
            const candidates: string[] = steps.filter((tm: string) => {
                return tm === time || +tm === +time;
            });
            if (candidates && candidates.length === 1) {
                const step: number = steps.indexOf(candidates[0]);
                if (step >= 0) {
                    this.simulationStep = step;
                    // update DOM
                    $(`#${this.id}-curr-sim-step`).html(this.simulationStep.toString());
                    $(`#${this.id}-curr-sim-time`).html(this.getCurrentSimulationTime());
                    this.step({ preventIncrement: true });
                    if (this.bridgedPlayer) {
                        await this.bridgedPlayer.gotoControl(this.simulationStep);
                    }
                } else {
                    console.warn(`[daa-player] Warning: could not select candidate time ${candidates[0]}`);
                }
            } else {
                console.warn(`[daa-player] Warning: could not goto time ${time}`);
            }
        } else {
            console.warn(`[daa-player] Warning: could not got time ${time}`);
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
    async connectToServer (opt?: { href?: string }) {
        opt = opt || {};
        this.href = opt.href || document.location.href; //"localhost";
        if (this.ws) {
            await this.ws.connectToServer(this.href);
        } else {
            console.error("[daa-player] Warning: cannot connect to server, WebSocket is null");
        }
        // enable file system
        // if (opt.fs) {
        //     await this.enableFileSystem();    
        //     console.log("playback can read/write files");
        // }
        return this;
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
     * @param alertingLogic Executable for the WellClear alerting logic, e.g., DAAtoPVS-1.0.1.jar (Base path is daa-logic/)
     * @param alertingConfig Configuration file for the WellClear alerting logic, e.g., WC_SC_228_nom_b.txt (Base path is daa-logic/)
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    async java (data: {
        alertingLogic: string,
        alertingConfig: string,
        scenario: string
    }): Promise<{
        err: string,
        bands: DaidalusBandsDescriptor
    }> {
        const msg: JavaMsg = {
            daaLogic: data.alertingLogic ||  "DAAtoPVS-1.0.1.jar",
            daaConfig: data.alertingConfig || "WC_SC_228_nom_b.txt",
            scenarioName: data.scenario || "H1.daa"
        }
        console.log(`Evaluation request for java alerting logic ${msg.daaLogic} and scenario ${msg.scenarioName}`);
        if (!this._repl[msg.daaLogic]) {
            const ws: DAAClient = new DAAClient();
            await ws.connectToServer();
            this._repl[msg.daaLogic] = ws;
        }
        const res = await this._repl[msg.daaLogic].send({
            type: "java",
            data: msg
        });
        try {
            if (res && res.data) {
                const data = JSON.parse(res.data);
                this._bands = data;
            }
            console.log("WellClear data ready!", this._bands);
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
     * @function <a name="javaLoS">javaLoS</a>
     * @description Computes conflict regions using the java implementation of well-clear
     * @param alertingLogic Executable for the WellClear alerting logic, e.g., DAAtoPVS-1.0.1.jar (Base path is daa-logic/)
     * @param alertingConfig Configuration file for the WellClear alerting logic, e.g., WC_SC_228_nom_b.txt (Base path is daa-logic/)
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    async javaLoS (data: {
        losLogic: string,
        alertingConfig: string,
        scenario: string
    }): Promise<{
        err: string,
        los: DAALosDescriptor
    }> {
        const msg: JavaMsg = {
            daaLogic: data.losLogic ||  "LoSRegion-1.0.1.jar",
            daaConfig: data.alertingConfig || "WC_SC_228_nom_b.txt",
            scenarioName: data.scenario || "H1.daa"
        }
        console.log(`Computing conflict regions using java alerting logic ${msg.daaLogic} and scenario ${msg.scenarioName}`);
        if (!this._repl[msg.daaLogic]) {
            const ws: DAAClient = new DAAClient();
            await ws.connectToServer();
            this._repl[msg.daaLogic] = ws;
        }
        const res = await this._repl[msg.daaLogic].send({
            type: "java-los",
            data: msg
        });
        try {
            if (res && res.data) {
                const data = JSON.parse(res.data);
                this._los = data;
            }
            console.log("Conflict regions ready!", this._los);
            return {
                err: res.err,
                los: (this._los) ? this._los : null
            };
        } catch (parseError) {
            console.error("Error while parsing JSON LoS: ", parseError);
            return {
                err: parseError,
                los: null
            };
        }
    }
    
    /**
     * @function <a name="javaVirtualPilot">javaVirtualPilot</a>
     * @description Sends a java evaluation request to the server
     * @param virtualPilot Executable for virtual pilot, e.g., SimDaidalus_2.3_1-wind.jar (Base path is contrib/virtual-pilot/)
     * @param alertingConfig Configuration file for the WellClear alerting logic, e.g., WC_SC_228_nom_b.txt (Base path is daa-logic/)
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    async javaVirtualPilot (data: {
        virtualPilot: string,
        alertingConfig: string,
        scenario: string
    }): Promise<{
        err: string,
        //scenario: .... 
        bands: DaidalusBandsDescriptor
    }> {
        const msg: JavaMsg = {
            daaLogic: data.virtualPilot ||  "SimDaidalus_2.3_1-wind.jar",
            daaConfig: data.alertingConfig || "WC_SC_228_nom_b.txt",
            scenarioName: data.scenario || "H1.ic"
        }
        console.log(`Evaluation request for java alerting logic ${msg.daaLogic} and scenario ${msg.scenarioName}`);
        if (!this._repl[msg.daaLogic]) {
            const ws: DAAClient = new DAAClient();
            await ws.connectToServer();
            this._repl[msg.daaLogic] = ws;
        }
        const res = await this._repl[msg.daaLogic].send({
            type: "java-virtual-pilot",
            data: msg
        });
        try {
            if (res && res.data) {
                const data = JSON.parse(res.data);
                this._bands = data;
            }
            console.log("Flight data ready!", this._bands);
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

    getCurrentLoS (): DAALosRegion[] {
        if (this._selectedScenario && this._scenarios[this._selectedScenario] && this._los) {
            if (this._los.LoS && this.simulationStep < this._los.LoS.length) {
                return this._los.LoS[this.simulationStep].conflicts;
            } else {
                console.error(`LoS region could not be read for step ${this.simulationStep} (index out of bounds)`);
            }
        }
        return null;
    }

    wellclearMode (): void {
        this.selectedAppType = this.appTypes[0];
        this.scenarioType = "daa";
    }
    losMode (): void {
        this.selectedAppType = this.appTypes[1];
        this.scenarioType = "daa";
    }
    virtualPilotMode (): void {
        this.selectedAppType = this.appTypes[2];
        this.scenarioType = "ic";
    }
    getSelectedAppType (): string {
        return this.selectedAppType;
    }

    async listVersions(): Promise<string[]> {
        await this.connectToServer();
        const res = await this.ws.send({
            type: `list-${this.selectedAppType}-versions`,
        });
        if (res && res.data) {
            console.log(res);
            const versions: string [] = JSON.parse(res.data);
            if (versions) {
                // sort in descending order, so that newest version comes first
                this._wellClearVersions = versions.sort((a: string, b: string) => { return (a < b) ? 1 : -1; });
            }
        }
        return this._wellClearVersions;
    }

    async listConfigurations(): Promise<string[]> {
        await this.connectToServer();
        const version: string = this.getSelectedWellClearVersion();
        if (version) {
            const versionNumber: string = (version.split("-")[1].startsWith("1")) ? "1.x" : "2.x";
            const res = await this.ws.send({
                type: "list-config-files",
                version: versionNumber
            });
            if (res && res.data) {
                console.log(res);
                const currentConfigurations: string = JSON.stringify(this._wellClearConfigurations);
                if (currentConfigurations !== res.data) {
                    this._wellClearConfigurations = JSON.parse(res.data);
                    // refresh front-end
                    await this.refreshConfigurationView();
                } else {
                    console.log(`[daa-player] Configurations for Daidalus ${versionNumber} already loaded`, res.data);
                }
            }
            return this._wellClearConfigurations;
        } else {
            console.warn("[daa-player] Warning: daidalus configuration list is empty");
        }
        return null;
    }

    // setVersionChangeCallback(f: () => void) {
    //     this._versionCallback = f;
    // }

    // setConfigurationChangeCallback(f: () => void) {
    //     this._configurationCallback = f;
    // }    

    getSelectedConfiguration(): string {
        return $(`#${this.wellClearConfigurationSelector}-daidalus-configurations-list option:selected`).text();
    }

    getSelectedWellClearVersion(): string {
        const sel: string = $(`#${this.wellClearVersionSelector}-daidalus-versions-list option:selected`).text();
        if (sel) {
            const components: string[] = sel.split("-");
            if (components && components.length > 2) {
                return `WellClear-${components.slice(-2).join("-")}`;
            }
            return `WellClear-${sel.split("-").slice(-1)}`;
        }
        return null;
    }
    getSelectedLoSVersion(): string {
        if (this.selectedAppType === this.appTypes[1]) {
            const sel: string = $(`#${this.wellClearVersionSelector}-daidalus-versions-list option:selected`).text();
            return sel;
        }
        return null;
    }
    getSelectedVirtualPilotVersion(): string {
        if (this.selectedAppType === this.appTypes[2]) {
            const sel: string = $(`#${this.wellClearVersionSelector}-daidalus-versions-list option:selected`).text();
            return sel;
        }
        return null;
    }
    getSelectedLogic(): string {
        const sel: string = $(`#${this.wellClearVersionSelector}-daidalus-versions-list option:selected`).text();
        return sel;
    }
    /**
     * @function <a name="play">play</a>
     * @description Starts the simulation run
     * @param opt {Object} Simulation options
     *              <li>paused (bool): Whether only the current simulation step should be executed (paused = true), or all simulation steps one after the other (paused = false). (default: paused = false)</li>
     *              <li>ms (real): simulation speed, in terms of temporal duration of a simulation step.</li>
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
            if (this.simulationStep < this._simulationLength) {
                this.setInterval(() => {
                    this.stepControl(this.simulationStep);
                }, this.ms);
            } else {
                this.clearInterval();
            }
        }
        return this;
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
    getCurrentFlightData (enc?: string): LLAData {
        if (this._selectedScenario && this._scenarios[this._selectedScenario]) {
            if (this.simulationStep < this._scenarios[this._selectedScenario].length) {
                const time: string = this._scenarios[this._selectedScenario].steps[this.simulationStep];
                return this._scenarios[this._selectedScenario].lla[time];
            } else {
                console.error("[getCurrentFlightData] Error: Incorrect simulation step (array index out of range for flight data)");
            }
        }
        return null;
    }

    getCurrentSimulationTime (): string {
        return this.getTimeAt(this.simulationStep);
    }

    getTimeAt (step: number): string {
        if (!isNaN(step) && this._selectedScenario && this._scenarios[this._selectedScenario]) {
            if (step < this._scenarios[this._selectedScenario].length) {
                return this._scenarios[this._selectedScenario].steps[step];
            } else {
                console.error("[getTimeAt] Error: Incorrect simulation step (array index out of range for flight data)");
            }
        }
        return null;
    }

    /**
     * Utility function, finds the step corresponding to the given time
     * @param time 
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

    getBandsData (): utils.DAABandsData[] {
        const ans: utils.DAABandsData[] = [];
        if (this._selectedScenario && this._scenarios[this._selectedScenario] && this._bands) {
            //FIXME: the data structure for _bands should be consistent with those used by getCurrentFlightData
            if (this._bands) {
                for (let step = 0; step < this._simulationLength; step++) {
                    // convert bands to the DAA format
                    const res: utils.DAABandsData = {
                        Alerts: null,
                        "Altitude Bands": {},
                        "Heading Bands": {},
                        "Horizontal Speed Bands": {},
                        "Vertical Speed Bands": {}
                    };
                    const bandNames: string[] = utils.BAND_NAMES;
                    for (const b in bandNames) {
                        const band: string = bandNames[b];
                        const data: BandElement = (this._bands[band] && step < this._bands[band].length) ? 
                                                    this._bands[band][step] : null;
                        if (data) {
                            for (let i = 0; i < data.bands.length; i++) {
                                const info: DaidalusBand = data.bands[i];
                                if (info && info.range) {
                                    const range: utils.FromTo = {
                                        from: info.range[0],
                                        to: info.range[1],
                                        units: info.units
                                    };
                                    const alert: string = info.alert;
                                    res[band][alert] = res[band][alert] || [];
                                    res[band][alert].push(range);
                                }
                            }
                        }
                        if (this._bands && this._bands.Alerts && step < this._bands.Alerts.length) {
                            // copy alerting info
                            res.Alerts = this._bands.Alerts[step];
                        }
                    }
                    ans.push(res);
                }
            }
        }
        return ans;
    }
    getCurrentBands (): utils.DAABandsData {
        const res: utils.DAABandsData = {
            Alerts: null,
            "Altitude Bands": {},
            "Heading Bands": {},
            "Horizontal Speed Bands": {},
            "Vertical Speed Bands": {}
        };
        if (this._selectedScenario && this._scenarios[this._selectedScenario] && this._bands) {
            //FIXME: the data structure for _bands should be consistent with those used by getCurrentFlightData
            if (this._bands) {
                // convert bands to the DAA format
                const bandNames: string[] = utils.BAND_NAMES;
                for (const b in bandNames) {
                    const band: string = bandNames[b];
                    const data: BandElement = (this._bands[band] && this._bands[band].length > this.simulationStep) ? 
                                                this._bands[band][this.simulationStep] : null;
                    if (data) {
                        for (let i = 0; i < data.bands.length; i++) {
                            const info: DaidalusBand = data.bands[i];
                            if (info && info.range) {
                                const range: utils.FromTo = {
                                    from: info.range[0],
                                    to: info.range[1],
                                    units: info.units
                                };
                                const alert: string = info.alert;
                                res[band][alert] = res[band][alert] || [];
                                res[band][alert].push(range);
                            }
                        }
                    }
                    if (this._bands && this._bands.Alerts && this._bands.Alerts.length > this.simulationStep) {
                        // copy alerting info
                        res.Alerts = this._bands.Alerts[this.simulationStep];
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
    getParams (conf) {
        // conf can be std, nomA, nomB
        conf = conf || "std";
        console.log(`loading configuration ${conf}`);
        let params = [];
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
     * @return {string} Name of the scenario 
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    getSelectedScenario (): string {
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
                let promises = [
                    new Promise((resolve) => { setTimeout(resolve, this.ms); }),
                    new Promise((resolve) => {
                        fun();
                        resolve();
                    })
                ];
                await Promise.all(promises);
                if (this.simulationStep >= this._simulationLength) {
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
    clearInterval() {
        this._timer_active = false;
        return this;
    }
 

    setStatus(msg: string) {
        $(`#${this.id}-status`).css("display", "block").text(msg);
    }

    statusReady() {
        $(`#${this.id}-status`).css("display", "none").text("");
    }


    //-- append functions ------------

    appendNavbar(): DAAPlayer {
        const theHTML: string = Handlebars.compile(templates.navbarTemplate)({
            id: this.id
        });
        $('body').append(theHTML);
        return this;
    }

    async appendWellClearVersionSelector(wellClearVersionSelector?: string): Promise<void> {
        wellClearVersionSelector = wellClearVersionSelector || "sidebar-daidalus-version";
        this.wellClearVersionSelector = wellClearVersionSelector;
        // update data structures
        await this.listVersions();
        // update the front-end
        this.refreshVersionsView();
    }

    async appendWellClearConfigurationSelector(wellClearConfigurationSelector?: string): Promise<void> {
        wellClearConfigurationSelector = wellClearConfigurationSelector || "sidebar-daidalus-configuration";
        this.wellClearConfigurationSelector = wellClearConfigurationSelector;
        // update data structures
        await this.listConfigurations();
        // update the front-end
        await this.refreshConfigurationView();
    }

    setDisplays (displays: string[]): DAAPlayer {
        this._displays = displays || [];
        return this;
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
        displays?: string[] // daa display associated to the controls, a loading spinner will be attached to this DOM element
    }): void {
        opt = opt || {};
        opt.parent = opt.parent || (`${this.id}-simulation-controls`);
        opt.top = (isNaN(opt.top)) ? 0 : opt.top;
        opt.left = (isNaN(opt.left)) ? 0 : opt.left;
        opt.width = (isNaN(+opt.width)) ? 1800 : opt.width;

        this._displays = opt.displays;

        if (document.getElementById(opt.parent) === null) {
            utils.createDiv(opt.parent, opt);
        }

        this._simulationControls = {
            htmlTemplate: opt.htmlTemplate || templates.playbackTemplate,
            parent: `#${opt.parent}`,
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
        $(`#${this.id}-refresh-daidalus-configurations`).on("click", () => { this._handlers.configurationReloader(); });
        $(`#${this.id}-refresh-daidalus-versions`).on("click", () => { this._handlers.daidalusVersionReloader(); });
    }

    async activate(): Promise<void> {
        const scenarios = await this.listScenarioFiles();
        if (scenarios && scenarios.length) {
            await this.selectScenarioFile(scenarios[0]);
        }
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
    appendSimulationPlot(desc: PlotDescriptor): DAAPlayer {
        desc.id = desc.id;
        desc.type = desc.type || "spectrogram";
        if (desc.type === "spectrogram") {
            this._plot[desc.id] = new DAASpectrogram(`${this.id}-${desc.id.replace(/\s/g, "")}`, {
                top: desc.top, left: desc.left, height: desc.height, width: desc.width
            }, { 
                units: desc.units,
                length: this._simulationLength,
                label: desc.label,
                range: desc.range,
                time: (this._scenarios && this._scenarios[this._selectedScenario] && this._scenarios[this._selectedScenario].steps) ? {
                    start: this._scenarios[this._selectedScenario].steps[0],
                    mid: this._scenarios[this._selectedScenario].steps[Math.floor(this._simulationLength / 2)],
                    end: this._scenarios[this._selectedScenario].steps[this._simulationLength - 1]
                } : null,
                player: desc.player || this,
                parent: desc.parent
            });
        }
        return this;
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
    }) {
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
        return this;
    }
    /**
     * @function <a name="refreshSimulationPlots">refreshSimulationPlots</a>
     * @description Updates the visual appearance of the simulation plot (e.g., to match a new simulation length)
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    refreshSimulationPlots() {
        if (this._plot) {
            Object.keys(this._plot).forEach((plotID: string) => {
                this._plot[plotID].setLength(this._simulationLength, { 
                    start: this._scenarios[this._selectedScenario].steps[0],
                    mid: this._scenarios[this._selectedScenario].steps[Math.floor(this._simulationLength / 2)],
                    end: this._scenarios[this._selectedScenario].steps[this._simulationLength - 1]
                });
            });
            // update DOM
            $(`#${this.id}-tot-sim-steps`).html((this._simulationLength - 1).toString());
            this.gotoControl(0); // note: this call is async
        }
        return this;
    }

    private async refreshConfigurationView() {
        const theHTML: string = Handlebars.compile(templates.daidalusConfigurationsTemplate)({
            configurations: this._wellClearConfigurations,
            id: this.wellClearConfigurationSelector
        });
        $(`#${this.wellClearConfigurationSelector}-daidalus-configurations-list`).remove();
        $(`#${this.wellClearConfigurationSelector}`).append(theHTML);

        const refreshConfigurationAttributesView = async (config: string) => {
            const attributes = await this.loadConfigFile(config);
            const theAttributes: string = Handlebars.compile(templates.daidalusAttributesTemplate)({
                fileName: config,
                attributes: attributes.trim().split("\n"),
                id: this.wellClearConfigurationSelector
            });
            $(`#${this.wellClearConfigurationSelector}-daidalus-configuration-attributes-list`).remove();
            $(`#sidebar-daidalus-configuration-attributes`).append(theAttributes);    
        }
        const selectedConfig: string = this.getSelectedConfiguration();
        await refreshConfigurationAttributesView(selectedConfig);

        // update simulation when configuration changes
        $(`#${this.wellClearConfigurationSelector}-daidalus-configurations-list`).on("change", async () => {
            const selectedConfig: string = this.getSelectedConfiguration();
            console.log(`new configuration selected for player ${this.id}: ${selectedConfig}`);
            await refreshConfigurationAttributesView(selectedConfig);
            await this.reloadScenarioFile();
            this.refreshSimulationPlots();
        });
        return this;
    }

    private refreshVersionsView(): DAAPlayer {
        const theHTML: string = Handlebars.compile(templates.daidalusVersionsTemplate)({
            versions: this._wellClearVersions,
            id: this.wellClearVersionSelector
        });
        $(`#${this.wellClearVersionSelector}-daidalus-versions-list`).remove();
        $(`#${this.wellClearVersionSelector}`).append(theHTML);
        // append handlers for selection of well clear version
        $(`#${this.wellClearVersionSelector}-daidalus-versions-list`).on("change", async () => {
            this.loadingAnimation();
            // this will update the list of configurations for the selected version
            await this.listConfigurations();
            // debug lines
            console.log(`new daidalus version selected: ${this.getSelectedWellClearVersion()}`);
            // this will trigger the init function of the simulation. The wellclear version is specified in the java command defined by the caller
            await this.reloadScenarioFile();
            this.refreshSimulationPlots();
            this.loadingComplete();
        });
        return this;
    }

    async appendScenarioSelector(): Promise<void> {
        try {
            const scenarios: string[] = await this.listScenarioFiles();
            const theHTML: string = Handlebars.compile(templates.daaScenariosTemplate)({
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
                        await this.selectScenarioFile(scenarios[i]);
                    });
                }
            }
            $(`#${this.id}-refresh-scenarios`).on("click", () => {
                this._handlers.scenarioReloader(scenarios);
            });
        } catch (error) {
            console.error("[daa-player] Warning: could not append scenario selector", error);
        }
    }

    /**
     * Returns a given plot
     * @param plotID {String} The identifier of the plot to be returned.
     * @return {Object} A plot object. The object type depends on the plot type.
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    getPlot(plotID: string) {
        return this._plot[plotID];
    }
}
