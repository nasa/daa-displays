/**
 * @module DAASplitView
 * @version 2018.12.01
 * @description <div style="display:flex;"><div style="width:50%;">
 *              <b>Split-View Player.</b>
 *              <p>This player extends the DAA Playback Player with functions 
 *              for comparative analysis of interactive simulations. Two simulation are executed 
 *              in lock-step and visualized side-to-side. Utility functions are provided to compute 
 *              the difference between simulation traces and visualize differences using graphs or 
 *              textual output. Comparison operators can be customized, e.g., floating point numbers 
 *              can be compared up-to a given number of decimal digits.</p></div>
 *              <img src="images/daa-split-view.png" style="margin-left:8%; max-height:180px;" alt="DAA Split View Player"></div>
 * @example
// file index.js (to be stored in pvsio-web/examples/demos/daa-displays/)
require.config({
    paths: { 
        widgets: "../../client/app/widgets",
        text: "../../client/app/widgets/daa-displays/lib/text/text"
    }
});
require(["widgets/daa-displays/daa-split-view"], function (DAASplitView) {
    "use strict";
    const splitView = new DAASplitView("split-view");
    // create simulation controls
    splitView.simulationControls({
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
import { DAAPlayer, safeSelector } from './daa-player';
import { JavaMsg, LLAData, DAADataXYZ, DaidalusBandsDescriptor, BandElement } from 'src/daa-server/utils/daa-server';
    
export class DAASplitView extends DAAPlayer {
    private players: { [key: string]: DAAPlayer };

    /**
     * @function <a name="DAASplitView">DAASplitView</a>
     * @description Constructor. Creates a new split view player.
     * @param id {String} Unique player identifier (default: "daa-split-view").
     * @param opt {Object} Player options
     *          <li>left (Object({label: string, display: Object}): configuration options for left display</li>
     *          <li>right (Object({label: string, display: Object}): configuration options for right display</li>
     *          <li>fs (Object): FileSystem, used for saving simulation logs.</li>
     *          <li>scenarios (Object({ scenarioID: data })): scenarios to be simulated</li>
     * @memberof module:DAASplitView
     * @instance
     */
    constructor (id: string = "daa-split-view", opt?: {
        left?: { label?: string },
        right?: { label?: string }
    }) {
        super(id);
        opt = opt || {};

        const label = {
            left: (opt.left && opt.left.label) ? opt.left.label : "left",
            right: (opt.right && opt.right.label) ? opt.right.label : "right"
        };
        // create players
        this.players = {
            left: new DAAPlayer(`${this.id}-${label.left}`),
            right: new DAAPlayer(`${this.id}-${label.right}`)
        };
        // create aliases using the provided labels
        this.players[label.left] = this.players.left;
        this.players[label.right] = this.players.right;

        this.step = async () => {
            let current_step = parseInt(<string> $(`#${this.id}-curr-sim-step`).html());
            current_step += (current_step < this._simulationLength) ? 1 : 0;
            this.simulationStep = current_step;
            $(`#${this.id}-curr-sim-step`).html(this.simulationStep.toString());
            if (this.players) {
                if (this.players.left) { this.players.left.step(); }
                if (this.players.right) { this.players.right.step(); }
            }
        };
        this.render = async () => {
            if (this.players) {
                if (this.players.left) { this.players.left.render(); }
                if (this.players.right) { this.players.right.render(); }
            }
        };
        this._defines = {
            init: async () => {
                console.error("Function splitView.init should not be used, please use splitView.getPlayer(..).init()");
            },
            step: async () => {
                this.step();
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
    getCurrentFlightData (enc?: string): LLAData {
        console.error(`splitView.getCurrentFlightData() should not be used. Please use splitView.getPlayers(..).getCurrentFlightData()`);
        return null;
    }
    getCurrentBands (): utils.DAABandsData {
        console.error(`splitView.getCurrentBands() should not be used. Please use splitView.getPlayers(..).getCurrentBands()`);
        return null;
    }
    getCurrentSimulationStep (): number {
        return this.players.right.getCurrentSimulationStep();
    }
    async activate () {
        await super.activate();
        if (this.players) {
            if (this.players.left) { await this.players.left.activate(); }
            if (this.players.right) { await this.players.right.activate(); }
        }
    }

    
    /**
     * @function <a name="goto">goto</a>
     * @description Goes to a given target simulation step
     * @param step {nat} Target simulation step.
     * @return {nat} The current simulation step, which corresponds to the target step (value clipped if target is outside the simulation range). 
     * @memberof module:DAAPlaybackPlayer
     * @instance
     */
    async gotoControl(step: number): Promise<number> {
        this.clearInterval();
        step = (step > 0) ?
                    (step < this._simulationLength) ? step : (this._simulationLength - 1)
                    : 0;
        this.simulationStep = step;
        // if (step === 0) {
        //     await this._handlers.init();
        // }
        if (this.players) {
            if (this.players.left) { await this.players.left.gotoControl(step); }
            if (this.players.right) { await this.players.right.gotoControl(step); }
            this.simulationStep = step;
        }
        return step;
    }

    getPlayer(playerID: string): DAAPlayer {
        if (this.players) {
            return this.players[playerID];
        }
        return null;
    }
    // /**
    //  * Loads the scenario to be simulated. The available scenarios are those provided in the constructor, using parameter scenarios.
    //  * @param scenario {String} daa file name (e.g., H1.daa)
    //  * @memberof module:DAAPlaybackPlayer
    //  * @instance
    //  */
    // async selectDaaFile (scenario: string, opt?: {
    //     forceReload?: boolean
    // }) {
    //     // this.disableSelection();
    //     // this.setStatus(`Loading ${scenario}`);
    //     // this.loadingAnimation();
    //     // await super.selectDaaFile(scenario, opt);
    //     if (this.players) {
    //         if (this.players.left) {
    //             await this.players.left.selectDaaFile(scenario, opt);
    //             this.players.left.refreshSimulationPlots();
    //             if (this._selectedScenario !== scenario) {
    //                 this.players.left.gotoControl(0);
    //             } else {
    //                 this.players.left.gotoControl(this.simulationStep);
    //             }
    //         }
    //         if (this.players.right) {
    //             await this.players.right.selectDaaFile(scenario, opt);
    //             this.players.right.refreshSimulationPlots();
    //             if (this._selectedScenario !== scenario) {
    //                 this.players.right.gotoControl(0);
    //             } else {
    //                 this.players.right.gotoControl(this.simulationStep);
    //             }
    //         }
    //     }
    //     // this.enableSelection();
    //     // this.statusReady();
    // }

    refreshScenariosView(): DAAPlayer {
        const scenarios: string[] = super.appendScenarioSelector();
        // install handlers for click events on scenarios
        if (scenarios) {
            scenarios.forEach(scenario => {
                // event handler
                $(`#${this.id}-scenario-${safeSelector(scenario)}`).on("click", async () => {
                    this._selectedScenario = scenario;
                    this.players.left.selectDaaFile(scenario);
                    this.players.right.selectDaaFile(scenario);
                });
            });
        }
        return this; 
    }

    // @overrides
    async appendWellClearVersionSelector(wellClearConfigurationSelector?: string, opt?: { parent?: string }) {
        wellClearConfigurationSelector = wellClearConfigurationSelector || this.id;
        opt = opt || {};
        utils.createDiv("split-view-wellclear-version-selector", { parent: opt.parent });
        if (this.players) {
            if (this.players.left) {
                await this.players.left.appendWellClearVersionSelector("daidalus-version-left");
            }
            if (this.players.right) { 
                await this.players.right.appendWellClearVersionSelector("daidalus-version-right"); 
            }
        }
        return this;
    }

    async appendWellClearConfigurationSelector(wellClearConfigurationSelector?: string, opt?: { parent?: string }) {
        wellClearConfigurationSelector = wellClearConfigurationSelector || "sidebar-daidalus-configuration";
        opt = opt || {};
        // utils.createDiv("split-view-wellclear-version-selector", { parent: opt.parent });
        $("#single-view").css("display", "none"); // hide attributes on side panel
        if (this.players) {
            if (this.players.left) {
                await this.players.left.appendWellClearConfigurationSelector("daidalus-configuration-left"); 
            }
            if (this.players.right) { 
                await this.players.right.appendWellClearConfigurationSelector("daidalus-configuration-right"); 
            }
        }
        return this;
    }

    async appendSimulationControls(opt?: {
        parent?: string,
        top?: number,
        left?: number,
        width?: number,
        htmlTemplate?: string
        displays?: string[] // daa display associated to the controls, a loading spinner will be attached to this DOM element
    }): Promise<DAAPlayer> 
    {
        await this.players.left.appendSimulationControls(opt);
        await this.players.right.appendSimulationControls(opt);
        this.players.right.bridgePlayer(this.players.left);
        return this;
    }




    // private refreshSplitViewVersionsView(playerID: string) {
    //     const theHTML: string = Handlebars.compile(templates.daidalusVersionsTemplate)({
    //         versions: this._wellClearVersions,
    //         id: playerID
    //     });
    //     $(`#${playerID}-daidalus-versions-list`).remove();
    //     $(`#daidalus-version-${playerID}`).append(theHTML);
    //     // update simulation when new version is selected
    //     $(`#${playerID}-daidalus-versions-list`).on("change", async () => {
    //         const selectedVersion: string = this.getSelectedWellClearVersion();
    //         console.log(`new daidalus version selected for player ${playerID}: ${selectedVersion}`);
    //         if (this.players && this.players[playerID]) {
    //             await this.players[playerID].reloadDaaFile();
    //         } else {
    //             console.error(`Error: player ${playerID} could not reload .daa file after changing wellclear version`);
    //         }
    //     });
    //     return this;
    // }





    // /**
    //  * @function <a name="getPlayer">getPlayer</a>
    //  * @description Accessor function, returns one of the players. 
    //  * @param playerID {String} Player identifier.
    //  * @memberof module:DAASplitView
    //  * @instance
    //  */
    // getPlayer (playerID: string) {
    //     return this.players[playerID];
    // }
    // /**
    //  * @function <a name="simulationControls">simulationControls</a>
    //  * @description Utility function for attaching the simulation controls to the DOM.
    //  * @param opt {Object} Configuration options for simulation controls (play, pause, step, goto, identify simulation, simulatioin speed)
    //  *          <li>parent (String): the identifier of the DOM element where the controls should be attached</li>
    //  *          <li>top (real): top margin of the simulation controls</li>
    //  *          <li>left (real): left margin of the simulation controls</li>
    //  *          <li>width (real): the width of the bar displaying the simulation controls</li>
    //  * @memberof module:DAASplitView
    //  * @instance
    //  */
    // appendSimulationControls(opt?) {
    //     opt = opt || {};
    //     opt.htmlTemplate = templates.splitViewTemplate;
    //     return super.appendSimulationControls(opt);
    // }
    // /**
    //  * @function <a name="connectToServer">connectToServer</a>
    //  * @description Connects to a WebSocket server compatible with the PVSio-web APIs.
    //  * @param opt {Object} Connection options
    //  *          <li>url (String): server URL (default: localhost)</li>
    //  *          <li>port (String): server port (default: 8082)</li>
    //  * @memberof module:DAASplitView
    //  * @instance
    //  */
    // async connectToServer (url?: string, port?: number) {
    //     url = url || "localhost";
    //     port = port || 8082;
    //     await this.players.left.connectToServer({ url, port });
    //     await this.players.right.connectToServer({ url, port });
    //     await super.connectToServer({ url, port });
    //     return this;
    // }
    // /**
    //  * @function <a name="run">run</a>
    //  * @description Starts the simulation run
    //  * @param opt {Object} Simulation options
    //  *              <li>paused (bool): Whether only the current simulation step should be executed (paused = true), or all simulation steps one after the other (paused = false). (default: paused = false)</li>
    //  *              <li>ms (real): simulation speed, in terms of temporal duration of a simulation step.</li>
    //  * @memberof module:DAASplitView
    //  * @instance
    //  */
    // async run() {
    //     // opt = opt || {};
    //     // this.ms = opt.ms || this.ms || 1000;
    //     // this.players.right._simulationLength = this.players.left._simulationLength = this._simulationLength;
    //     // return (opt.paused) ? this.step({ preventIncrement: true }) // this step is done to initialise the simulation
    //     //             : this.setInterval(this.step, this.ms);
    //     return this.setInterval(this.step, this.ms);
    // }
    // /**
    //  * @function <a name="simulationPlot">simulationPlot</a>
    //  * @description Creates a simulation plot
    //  * @param id {String} Unique plot identifier
    //  * @param desc {Object} Simulation options
    //  *              <li>paused (bool): Whether only the current simulation step should be executed (paused = true), or all simulation steps one after the other (paused = false). (default: paused = false)</li>
    //  *              <li>ms (real): simulation speed, in terms of temporal duration of a simulation step.</li>
    //  *              <li>type (String): type of plot. Currently, "spectrogram" is the only type of plot supported.</li>
    //  *              <li>units (Object({ from: String, to: String })): information about plot units: "from" identifies the units of the data; "to" identifies the units of the plot. 
    //  *                  Valid units are (grouped by conversion classes): "rad"/"deg"; "msec"/"knots"; "meters"/"feet"; "mpm"/"fpm 100x" </li>
    //  *              <li>label (String): plot label</li>
    //  *              <li>range (Object({ from: real, to: real })): plot range</li>
    //  *              <li>parent (String): parent element in the DOM where the plot should be attached</li>
    //  * @memberof module:DAASplitView
    //  * @instance
    //  */
    // appendSimulationPlot (desc) {
    //     let ds = Object.assign({}, desc);
    //     ds.top = ds.top || 0;
    //     ds.left = ds.left || 0;
    //     ds.width = ds.width || 2100;
    //     ds.height = ds.height || 80;
    //     ds.label = (typeof ds.label === "object") ? Object.assign(ds.label) : {};
    //     ds.label.top = ds.label.top || desc.id;
    //     ds.label.left = this._label.left;
    //     ds.id = `${desc.id}-left`;
    //     this.players.left.appendSimulationPlot(ds);
    //     ds.top += (ds.height + 55);
    //     ds.label.top = null;
    //     ds.label.left = this._label.right;
    //     ds.id = `${desc.id}-right`;
    //     this.players.right.appendSimulationPlot(ds);

    //     this._defines.writeLog = async () => {
    //         this.players.left._defines.writeLog();
    //         this.players.right._defines.writeLog();
    //     };
    //     return this;
    // }
    // /**
    //  * @function <a name="getPlot">getPlot</a>
    //  * @description Returns a given plot
    //  * @param plotID {String} The identifier of the plot to be returned.
    //  * @param playerID {String} The identifier of the player that produced the plot.
    //  * @return {Object} A plot object. The object type depends on the plot type.
    //  * @memberof module:DAAPlaybackPlayer
    //  * @instance
    //  */
    // getPlot (plotID, playerID) {
    //     return (playerID === "right" || playerID === this._label.right) ? this.players.right.getPlot(plotID)
    //                 : this.players.left.getPlot(plotID);
    // }


    

    
    // readInputFile (filename) {
    //     return this.inputFileReader.readFile(filename);
    // }
    // writeFile (filename, json) {
    //     if (typeof json === "string") {
    //         return this.outputFileWriter.writeFile(filename, json, { overWrite: true });
    //     }
    //     // else we assume it's a JSON object
    //     let output = json.map(function (elem) {
    //         return JSON.stringify(elem);
    //     });
    //     let str = output.join("\n");
    //     return this.outputFileWriter.writeFile(filename, str, { overWrite: true });
    // }
    // diff(jsonString1, jsonString2, opt) {
    //     let accuracy = this.fractionalAccuracy;
    //     function normaliseString(str) {
    //         if (!isNaN(parseFloat(str))) { return parseFloat(str).toFixed(accuracy); }
    //         if (!str) { return ""; }
    //         return str;
    //     }
    //     function getState(jsonString) {
    //         let jsonArray = JSON.parse(jsonString);
    //         return jsonArray.map(function (elem) {
    //             return elem.state;
    //         });
    //     }
    //     function stringDiff(str1, str2, opt) {
    //         opt = opt || {};
    //         let labels = opt.labels || [ "val-1", "val-2" ];
    //         let text1 = normaliseString(str1);
    //         let text2 = normaliseString(str2);
    //         if (text1 !== text2) {
    //             let ans = {};
    //             ans[labels[0]] = text1;
    //             ans[labels[1]] = text2;
    //             return ans;
    //         }
    //         return null;
    //     }
    //     function jsonDiff(json1, json2, opt) {
    //         opt = opt || {};
    //         let labels = opt.labels || [ "json-1", "json-2" ];
    //         if (typeof json1 === "string" || typeof json1 === "number") {
    //             let ans = stringDiff(json1, json2, opt);
    //             return ans; // this branch returns null when the two strings are identical 
    //         } else if (typeof json1 === "object") {
    //             let keys = Object.keys(json1);
    //             let ans = {};
    //             for (let i in keys) {
    //                 let k = keys[i];
    //                 if (json2 && typeof json2 === "object") {
    //                     if (json1.length) {
    //                         let tmp = [];
    //                         for (let i = 0; i < json1.length; i++) {
    //                             let ans = jsonDiff(json1[i], json2[i], opt);
    //                             if (ans && Object.keys(ans).length > 0) {
    //                                 tmp.push(ans);
    //                             }
    //                         }
    //                         return tmp;
    //                     } else {
    //                         let tmp = jsonDiff(json1[k], json2[k], opt);
    //                         if (tmp && Object.keys(tmp).length > 0) {
    //                             ans[k] = tmp;
    //                         }
    //                     }
    //                 } else {
    //                     // the fiels is missing in json2
    //                     ans[k] = {};
    //                     ans[k][labels[0]] = json1[k];
    //                     ans[k][labels[1]] = "";
    //                 }   
    //             }
    //             return ans;
    //         }
    //         console.error("unable to compute diff for elements ", json1, json2);
    //     }
    //     function diffAttributes(json1, json2, opt) {
    //         let keys = Object.keys(json1);
    //         let ans = {};
    //         for (let i = 0; i < keys.length; i++) {
    //             let d = jsonDiff(json1[keys[i]], json2[keys[i]], opt);
    //             if (opt.verbose || Object.keys(d).length > 0) {
    //                 ans[keys[i]] = d;
    //             }
    //         }
    //         return ans;
    //     }
    //     function diffLines(str1, str2, opt) {
    //         let json1 = getState(str1);
    //         let json2 = getState(str2);

    //         if (json1.length !== json2.length) {
    //             console.error("Warning, comparing two arrays of differnet length");
    //         }
    //         let ans = [];
    //         for (let i = 0; i < json1.length && i < json2.length; i++) {
    //             let d = jsonDiff(json1[i], json2[i], opt);
    //             // let d = diffAttributes(json1[i], json2[i], opt);
                
    //             if (opt.verbose || Object.keys(d).length > 0) {
    //                 ans.push({
    //                     line: i,
    //                     diff: d
    //                 });
    //             }
    //         }
    //         return ans;
    //     }

    //     let ans = diffLines(jsonString1, jsonString2, opt);
    //     console.log(ans);
    //     return ans;
    // }
    // toJSON(jsonString) {
    //     let jsonArray = JSON.parse(jsonString);
    //     let i = 0;
    //     return jsonArray.map(function (elem) {
    //         return {
    //             line: i++,
    //             state: elem.state
    //         }
    //     });
    // }
    // debugView(id, attributes) {
    //     attributes = attributes || [];
    //     const width = $("#" + id).css("width");
    //     const theHTML = Handlebars.compile(splitViewToolsTemplate)({
    //         attributes: attributes.map(function (attribute) {
    //             return {
    //                 id: attribute.name.replace(/\s/g, ""), // remove whitespaces
    //                 label: attribute.name,
    //                 type: attribute.type,
    //                 units: attribute.units
    //             }
    //         }),
    //         width: width,
    //         id: this.id
    //     });
    //     $("#" + id).html(theHTML);

    //     return this;
    // }
    // simulationControls(handlers) {
    //     let _this = this;
    //     function install_handler(fun, name) {
    //         $("#" + _this.id + "-" + name).on("click", function () {
    //             fun();
    //         });    
    //     }
    //     handlers = handlers || {};
    //     _.each(handlers, function (fun, name) {
    //         install_handler(fun, name);
    //     });
    // }
}