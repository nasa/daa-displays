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

        this.step = async (opt?: { preventIncrement?: boolean }) => {
            opt = opt || {};
            let current_step = parseInt(<string> $(`#${this.id}-curr-sim-step`).html());
            current_step += (current_step < this._simulationLength && !opt.preventIncrement) ? 1 : 0;
            this.simulationStep = current_step;
            $(`#${this.id}-curr-sim-step`).html(this.simulationStep.toString());
            if (this.players) {
                if (this.players.left) {
                    this.players.left.gotoControl(this.simulationStep); // right player is bridged
                }
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
    // @override
    async reloadScenarioFile (): Promise<void> {
        if (this.players) {
            if (this.players.left) { await this.players.left.reloadScenarioFile(); }
            if (this.players.right) { await this.players.right.reloadScenarioFile(); }
        }
    }
    // @override
    async activate (): Promise<void> {
        await super.activate();
        if (!this.activationControlsPresent) {
            if (this.players) {
                if (this.players.left) { await this.players.left.activate(); }
                if (this.players.right) { await this.players.right.activate(); }
            }
        }
    }
    wellclearMode (): void {
        super.wellclearMode();
        if (this.players) {
            if (this.players.left) { this.players.left.wellclearMode(); }
            if (this.players.right) { this.players.right.wellclearMode(); }
        }
    }
    losMode (): void {
        super.losMode();
        if (this.players) {
            if (this.players.left) { this.players.left.losMode(); }
            if (this.players.right) { this.players.right.losMode(); }
        }
    }
    virtualPilotMode (): void {
        super.virtualPilotMode();
        if (this.players) {
            if (this.players.left) { this.players.left.virtualPilotMode(); }
            if (this.players.right) { this.players.right.virtualPilotMode(); }
        }
    }

    // @overrides
    async selectScenarioFile (scenario: string, opt?: {
        forceReload?: boolean,
        softReload?: boolean,
        hideLoadingAnimation?: boolean,
        scenarioData?: string
    }): Promise<void> {
        if (this._scenarios && !this._loadingScenario) {
            opt = opt || {};
            this.clearInterval();
            if (this._selectedScenario !== scenario || opt.forceReload || opt.softReload) {
                this._loadingScenario = true;
                this.loadingAnimation();
                this.setStatus(`Loading ${scenario}`);
                this.disableSelection();
                console.log(`Scenario ${scenario} selected`);
                if (opt.forceReload || !this._scenarios[scenario]) {
                    console.log(`Loading scenario ${scenario}`); 
                    opt.scenarioData = await this.loadDaaFile(scenario);
                }
                this._selectedScenario = scenario;
                this.simulationStep = 0;
                this._simulationLength = this._scenarios[this._selectedScenario].length;
                // update DOM
                $(`#${this.id}-curr-sim-step`).html(this.simulationStep.toString());
                $(`#${this.id}-curr-sim-time`).html(this.getCurrentSimulationTime());
                $(`#${this.id}-goto-time-input`).val(this.simulationStep);
                $(`#${this.id}-tot-sim-steps`).html(this._simulationLength.toString());
                $(`#${this.id}-selected-scenario`).html(scenario);
                try {
                    if (this.players) {
                        let promises = [];
                        opt.hideLoadingAnimation = true;
                        if (this.players.left) {
                            promises.push(new Promise(async (resolve, reject) => {
                                // await this.players.left.loadDaaFile(scenario, { scenarioData });
                                await this.players.left.selectScenarioFile(scenario, opt);
                                resolve();
                            }));
                        }
                        if (this.players.right) {
                            promises.push(new Promise(async (resolve, reject) => {
                                // await this.players.right.loadDaaFile(scenario, { scenarioData });
                                await this.players.right.selectScenarioFile(scenario, opt);
                                resolve();
                            }));
                        }
                        await Promise.all(promises);
                    }
                } catch (loadError) {
                    console.error(`[daa-split-view] Warning: unable to initialize scenario ${scenario}`);
                } finally {
                    this.refreshSimulationPlots();
                    this.enableSelection();
                    this.loadingComplete();
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
     * @function <a name="goto">goto</a>
     * @description Goes to a given target simulation step
     * @param step {nat} Target simulation step.
     * @return {nat} The current simulation step, which corresponds to the target step (value clipped if target is outside the simulation range). 
     * @memberof module:DAASplitView
     * @instance
     */
    async gotoControl(step: number): Promise<void> {
        this.clearInterval();
        // sanity check
        step = (step > 0) ? (step < this._simulationLength) ? step : (this._simulationLength - 1) : 0;
        this.simulationStep = isNaN(step) ? 0 : step;
        // update DOM
        const time: string = this.getCurrentSimulationTime();
        $(`#${this.id}-curr-sim-step`).html(this.simulationStep.toString());
        $(`#${this.id}-curr-sim-time`).html(time);
        $(`#${this.id}-goto-input`).val(step);
        $(`#${this.id}-goto-time-input`).val(time);
        // send players the control command
        if (this.players) {
            if (this.players.left) {
                await this.players.left.gotoControl(this.simulationStep); // right player is bridged
            }
            if (this["diff"]) {
                this["diff"]();
            }
        }
    }

    public async stepControl(currentStep?: number): Promise<void> {
        // get step number either from function argument or from DOM
        currentStep = (currentStep !== undefined && currentStep !== null) ? currentStep : parseInt(<string> $(`#${this.id}-curr-sim-step`).html());
        // sanity check
        currentStep = (currentStep < this._simulationLength - 1) ? currentStep : this._simulationLength - 1;
        // advance simulation step
        this.simulationStep = (currentStep < this._simulationLength - 1) ? currentStep + 1 : currentStep;
        // update DOM
        $(`#${this.id}-curr-sim-step`).html(this.simulationStep.toString());
        $(`#${this.id}-curr-sim-time`).html(this.getCurrentSimulationTime());
        // send players the control command
        if (this.players) { 
            if (this.players.left) { 
                this.players.left.gotoControl(this.simulationStep); // right player is bridged
            }
            if (this["diff"]) {
                this["diff"]();
            }
        }
    }

    getPlayer(playerID: string): DAAPlayer {
        if (this.players) {
            return this.players[playerID];
        }
        return null;
    }

    // @overrides
    async appendWellClearVersionSelector(wellClearConfigurationSelector?: string, opt?: { parent?: string }): Promise<void> {
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
    }

    async appendWellClearConfigurationSelector(wellClearConfigurationSelector?: string, opt?: { parent?: string }): Promise<void> {
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
    }

    // @overrides
    appendSimulationControls(opt?: {
        parent?: string,
        top?: number,
        left?: number,
        width?: number,
        htmlTemplate?: string,
        displays?: string[] // daa display associated to the controls, a loading spinner will be attached to this DOM element
    }): void {
        // await this.players.left.appendSimulationControls(opt);
        // await this.players.right.appendSimulationControls(opt);
        super.appendSimulationControls(opt);
        if (this.players) {
            opt = opt || {};
            if (this.players.left && this.players.right) {
                this.players.left.bridgePlayer(this.players.right);
                if (opt.displays) {
                    if (opt.displays.length > 0) {
                        this.players.left.setDisplays([ opt.displays[0] ]);
                    }
                    if (opt.displays.length > 1) {
                        this.players.right.setDisplays([ opt.displays[1] ]);
                    }
                }
            }
        }
    }

    // @overrides
    appendPlotControls(opt?: { top?: number, left?: number, width?: number, parent?: string }): DAAPlayer {
        super.appendPlotControls(opt);
        $(`#${this.id}-plot`).unbind("click", super.plot);
        // override the plot handler
        $(`#${this.id}-plot`).on("click", async () => {
            if (this.players) {
                if (this.players.left) { this.players.left.plot(); }
                if (this.players.right) { this.players.right.plot(); }
            }
        });
        return this;
    }
}
