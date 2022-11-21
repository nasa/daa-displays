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
import { DAAPlayer, DidChangeDaaConfiguration, PlayerEvents, safeSelector } from './daa-player';
import { LLAData } from '../daa-server/utils/daa-types';
import { DAAScenario, OwnshipState, ScenarioDataPoint } from './utils/daa-types';
import { configDivTemplate, daidalusVersionDivTemplate, windDivTemplate } from './templates/daa-playback-templates';

export interface SplitConfig {
    scenario: string,
    configLeft: string,
    configRight: string
}
/**
 * Parse arguments indicated in the browser address.
 * Arguments are a search string indicating scenario + config_left + config_right
 * e.g., http://localhost:8082/split?H1.daa+2.x/DO_365A_no_SUM.conf+2.x/CD3D.conf
 */
export function parseSplitConfigInBrowser (search?: string): SplitConfig {
    search = search || window?.location?.search || "";
    const args: string[] = search.split("+");
    if (args && args.length > 2) {
        // args[0] is scenario, args[1] is config left, args[2] is config right
        args[0] = args[0].substring(1); // this is necessary to remove the ? at the beginning of the search string
        const ans: SplitConfig = {
            scenario: args[0],
            configLeft: args[1], 
            configRight: args[2]
        };
        return ans;
    }
    return null;
}

/**
 * Split View Player, runs two simulations of different DAA algorithms in lockstep for the same aircraft 
 * and shows the displays of the two simulations side-by-side
 */
export class DAASplitView extends DAAPlayer {
    // array map of players used in the view. This view has two players (referred to as "left" and "right" players)
    protected players: { [key: string]: DAAPlayer } = {};
    protected labels: string[] = []; // players labels (i.e., keys used in the players map)

    /**
     * @function <a name="DAASplitView">DAASplitView</a>
     * @description Constructor. Creates a new split view player.
     * @param opt {Object} Player options
     *          <li>id {String} Unique player identifier (default: "daa-split-view").</li>
     *          <li>opt.createPlayers {boolean} Whether the players should be automatically created. 
     *              If the players are not created, then method createPlayer needs to be invoked explicitly (default: true)</li>
     * @memberof module:DAASplitView
     * @instance
     */
    constructor (opt?: {
        id?: string,
        createPlayers?: boolean // whether the players should be automatically created or not (default: true)
    }) {
        super({ id: opt?.id || "daa-split-view" });
        opt = opt || {};
        opt.createPlayers = (opt.createPlayers === undefined || opt.createPlayers === null) ? true : !!opt.createPlayers;
        if (opt.createPlayers) {
            // player labels
            this.labels = [ "left", "right" ];
            // create players
            this.createPlayers();
        }
    }

    /**
     * Utility function, creates two players for the split-view
     */
    createPlayers (opt?: { tailNumbers?: string[] }): void {
        // create players
        for (let i = 0; i < this.labels?.length; i++) {
            this.players[this.labels[i]] = new DAAPlayer({
                id: `${this.id}-${this.labels[i]}`,
                ownshipName: i < opt?.tailNumbers?.length ? opt?.tailNumbers[i] : undefined
            });
            // add event listeners for relevant backbone events
            this.players[this.labels[i]].on(PlayerEvents.DidChangeDaaConfiguration, (evt: DidChangeDaaConfiguration) => {
                console.log(`[${this.id}] Player ${this.labels[i]}`, evt);
            });
            // create alias so "left" is also "0" and "right" is also "1"
            this.players[i] = this.players[this.labels[i]];
        }
        // create bridge between players, so a step on the first leads to a step on the others
        for (let i = 1; i < this.labels?.length; i++) {
            console.log(`[${this.id}] Installing player bridge from ${this.labels[i - 1]} to ${this.labels[i]}`);
            this.players[this.labels[i - 1]].bridgePlayer(this.players[this.labels[i]]);
        }
        // create aliases for left/right players
        if (this.labels?.length > 0 && !this.labels.includes("left")) { this.players.left = this.players[0]; }
        if (this.labels?.length > 1 && !this.labels.includes("right")) { this.players.right = this.players[1]; }
        // install handlers
        this.installHandlers();
    }

    /**
     * Internal function, install player handlers
     */
    protected installHandlers (): void {
        if (this.labels?.length) {
            // step simulation
            this.step = async (opt?: { preventIncrement?: boolean }) => {
                opt = opt || {};
                let current_step = parseInt(<string> $(`#${this.id}-curr-sim-step`).html());
                current_step += (current_step < this.getSimulationLength() && !opt.preventIncrement) ? 1 : 0;
                this.simulationStep = current_step;
                $(`#${this.id}-curr-sim-step`).html(`${this.simulationStep}`);
                if (this.players && this.labels?.length) {
                    // it is sufficient to run a step on the first player, the other players will follow because they are bridged (see createPlayers)
                    if (this.players[this.labels[0]]) {
                        await this.players[this.labels[0]].gotoControl(this.simulationStep);
                    }
                }
            };
            // render all the displays
            this.render = async () => {
                if (this.players) {
                    for (let i = 0; i < this.labels?.length; i++) {
                        await this.players[this.labels[i]]?.render();
                    }
                    // if (this.players.left) { this.players.left.render(); }
                    // if (this.players.right) { this.players.right.render(); }
                }
            };
            // @Overrides default handlers from daa-player
            this._defines = this._defines || {};
            this._defines.init = async () => {
                console.error(`[${this.id}] Function init should not be used explicitely because this view uses multiple players. Please use getPlayer(..).init()`);
            };
            this._defines.step = async () => {
                this.step();
            };
            this._defines.writeLog = async () => {
                // if (_this.logFile && _this._log.length > 0 && _this.fs) {
                //     console.log("Writing log file " + _this.logFile);
                //     await writeFile(_this.fs, _this.logFile, _this._log, { overWrite: true });
                //     console.log(_this._log.length + " event saved in log file " + _this.logFile);
                // }
            };
        }
    }
    // @override
    getCurrentFlightData (enc?: string): LLAData {
        console.error(`[${this.id}] Function getCurrentFlightData should not be used explicitely because this view uses multiple players. Please use splitView.getPlayers(..).getCurrentFlightData()`);
        return null;
    }
    // @override
    getCurrentBands (): ScenarioDataPoint {
        console.error(`[${this.id}] Function getCurrentBands should not be used explicitely because this view uses multiple players. Please use splitView.getPlayers(..).getCurrentBands()`);
        return null;
    }
    // @override
    async reloadScenarioFile (): Promise<void> {
        if (this.players) {
            for (let i = 0; i < this.labels.length; i++) {
                await this.players[this.labels[i]]?.reloadScenarioFile();
            }
            // if (this.players.left) { await this.players.left.reloadScenarioFile(); }
            // if (this.players.right) { await this.players.right.reloadScenarioFile(); }
        }
    }
    // @override
    async activate (opt?: { developerMode?: boolean }): Promise<void> {
        console.log(`[${this.id}] activating player...`);
        await super.activate(opt);
        if (!this.activationControlsPresent) {
            if (this.players) {
                for (let i = 0; i < this.labels.length; i++) {
                    await this.players[this.labels[i]]?.activate(opt);
                }
                // if (this.players.left) { await this.players.left.activate(opt); }
                // if (this.players.right) { await this.players.right.activate(opt); }
            }
        }
    }

    // @override
    refreshBrowserAddress (): void {
        const scenario: string = this.getSelectedScenario();
        const leftConfig: string = this.players?.left?.readSelectedDaaConfiguration();
        const rightConfig: string = this.players?.right?.readSelectedDaaConfiguration();
        const search: string = `?${scenario}+${leftConfig}+${rightConfig}`;
        const url: string = window.location.origin + window.location.pathname + search;
        history.replaceState({}, document.title, url);
    }

    /**
     * Loads the selected scenario in the view
     * @override
     */
    async loadSelectedScenario(opt?: { ownshipName?: string | number, selectedScenario?: string }): Promise<void> {
        // load the scenario
        await super.loadSelectedScenario(opt);
    }

    /**
     * Internal function, checks if a given scenario is already loaded in all players
     */
    protected scenarioIsLoadedInAllPlayers (scenario: string): boolean {
        for (let i = 0; i < this.labels?.length; i++) {
            if (this.players[this.labels[i]]?.getCurrentScenario(scenario)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Loads a given scenario file
     * @override
     */
    async loadScenarioFile (scenario: string, opt?: {
        forceReload?: boolean,
        softReload?: boolean,
        hideLoadingAnimation?: boolean,
        scenarioData?: string,
        ownshipNames?: string[] // can assign different ownships to different players
    }): Promise<void> {
        if (this._scenarios && !this._loadingScenario) {
            opt = opt || {};
            this.clearInterval();
            if (this._selectedScenario !== scenario || opt.forceReload || opt.softReload) {
                this._loadingScenario = true;
                this.loadingAnimation();
                this.setStatus(`Loading ${scenario}`);
                this.disableSelection();
                console.log(`[${this.id}] Scenario ${scenario} selected`);
                // if (opt.forceReload || !this._scenarios[scenario]) {
                //     console.log(`[${this.id}] Loading scenario ${scenario}`); 
                //     opt.scenarioData = await this.loadDaaFile(scenario, opt);
                // }
                this._selectedScenario = scenario;
                this.simulationStep = 0;
                // this._simulationLength = this._scenarios[this._selectedScenario].length;
                // update DOM
                $(`#${this.id}-curr-sim-step`).html("0");
                $(`#${this.id}-curr-sim-time`).html("0");
                $(`#${this.id}-goto-time-input`).val(0);
                $(`#${this.id}-tot-sim-steps`).html("0");
                $(`#${this.id}-selected-scenario`).html(scenario);
                // load scenario in the players
                const scenarioLoaded: boolean = this.scenarioIsLoadedInAllPlayers(scenario);
                try {
                    if (opt.forceReload || !scenarioLoaded) {
                        console.log(`[${this.id}] Loading scenario ${scenario}`);
                        opt.hideLoadingAnimation = true;
                        for (let i = 0; i < this.labels?.length && this.players; i++) {
                            await this.players[this.labels[i]]?.loadScenarioFile(scenario, {
                                ...opt,
                                ownshipName: opt?.ownshipNames?.length > i ? opt.ownshipNames[i] : null
                            });
                        }
                        await this.gotoControl(0);
                        $(`#${this.id}-tot-sim-steps`).html(`${this.getSimulationLength()}`);
                        $(`#${this.id}-curr-sim-time`).html(this.getCurrentSimulationTime());
                    }
                } catch (loadError) {
                    console.error(`[${this.id}] Warning: unable to select scenario ${scenario}`, loadError);
                } finally {
                    this.refreshSimulationPlots();
                    this.enableSelection();
                    this.loadingComplete();
                    this.statusReady();
                    this._loadingScenario = false;
                    console.log(`[${this.id}] Done!`);
                }
            } else {
                console.log(`[${this.id}] Scenario ${scenario} already selected`);
            }
        } else {
            console.error(`[${this.id}] Unable to select scenario ${scenario} :X`);
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
    async gotoControl(step?: number, opt?: { updateInputs?: boolean }): Promise<void> {
        this.clearInterval();
        // sanity check
        step = (step > 0) ? (step < this.getSimulationLength()) ? step : (this.getSimulationLength() - 1) : 0;
        this.simulationStep = isNaN(step) ? 0 : step;
        // update DOM
        const time: string = this.getTimeAt(this.simulationStep);
        $(`#${this.id}-curr-sim-step`).html(`${this.simulationStep}`);
        $(`#${this.id}-curr-sim-time`).html(time);
        if (opt?.updateInputs) {
            $(`#${this.id}-goto-input`).val(this.simulationStep);
            $(`#${this.id}-goto-time-input`).val(time);
        }
        // send players the control command
        if (this.players) {
            // it is sufficient to invoke the function on the first player, the other players will follow because they are bridged (see createPlayers)
            if (this.players[this.labels[0]]) {
                await this.players[this.labels[0]].gotoControl(this.simulationStep);
            }
            // if (this.players.left) {
            //     await this.players.left.gotoControl(this.simulationStep); // right player is bridged
            // }
            if (typeof this._defines.diff === "function") {
                this._defines.diff();
            }
        }
    }
    /**
     * Utility function, goes to a given target simulation time
     * @override
     */
    async gotoTimeControl (time?: string): Promise<DAAPlayer> {
        if (this.players) {
            // it is sufficient to invoke the function on the first player, the other players will follow because they are bridged (see createPlayers)
            if (this.players[this.labels[0]]) {
                await this.players[this.labels[0]].gotoTimeControl(time);
                // update DOM
                const step: number = this.getCurrentSimulationStep();
                const tm: string = this.getTimeAt(step);
                $(`#${this.id}-curr-sim-step`).html(`${step}`);
                $(`#${this.id}-curr-sim-time`).html(tm);
                $(`#${this.id}-goto-input`).val(step);
                $(`#${this.id}-goto-time-input`).val(tm);
            }
        }
        return this;
    }
    /**
     * Returns the current ownship state, including position, velocity, wind, metrics, etc, see also interface OwnshipState
     */
    getCurrentOwnshipState (): OwnshipState {
        console.warn(`[daa-split-view] Warning: trying to use getCurrentOwnshipState() from split-view. Please invoke the function on a specific player.`);
        return null;
    }
    /**
     * Returns the current flight data
     * The difference between getFlightData and getCurrentFlightData is that 
     * the former returns the entire scenario and the latter only the info for the current simulation step
     */
    getFlightData (): LLAData[] {
        console.warn(`[daa-split-view] Warning: trying to use getFlightData() from split-view. Please invoke the function on a specific player.`);
        return null;
    }
    /**
     * Returns the current scenario
     * The optional argument can be used to retrieve a specific scenario
     */
    getCurrentScenario (): DAAScenario {
        console.warn(`[daa-split-view] Warning: trying to use getCurrentScenario() from split-view. Please invoke the function on a specific player.`);
        return null;
    }
    /**
     * Returns the current simulation time
     * @override
     */
    getCurrentSimulationTime (): string {
        return this.labels?.length && this.players ?
            this.players[this.labels[0]]?.getCurrentSimulationTime()
                : "0";
    }
    /**
     * Returns the virtual time associated with a given simulation step
     * @override
     */
    getTimeAt (step: number): string {
        return this.labels?.length && this.players ?
            this.players[this.labels[0]]?.getTimeAt(step)
                : "0";
    }
    /**
     * Returns the length of the current simulation loaded in the player
     * @override
     */
    getSimulationLength(): number {
        // return the simulation length indicated in the first player
        // because of how the player works, the scenario loaded in all players have the same length
        return this.labels?.length && this.players ?
            this.players[this.labels[0]]?.getSimulationLength()
                : 0;
    }
    /**
     * Utility function, returns the current simulation step
     * @override
     */
    getCurrentSimulationStep (): number {
        return this.labels?.length && this.players ?
            this.players[this.labels[0]]?.getCurrentSimulationStep()
                : 0;
    }
    /**
     * Utility function, programmatically advances the simulation of one step
     * By default, the function uses the value of an input field in the UI to check the current simulation step
     * An optional argument can be used to override the default behavior and specify a custom current step
     */
    public async stepControl(currentStep: number): Promise<boolean> {
        // get step number either from function argument or from DOM
        currentStep = (currentStep !== undefined && currentStep !== null) ? currentStep : parseInt(<string> $(`#${this.id}-curr-sim-step`).html());
        // sanity check
        this.simulationStep = (currentStep < this.getSimulationLength() - 1) ? currentStep : this.getSimulationLength() - 1;
        // advance simulation step
        this.simulationStep++;
        if (this.simulationStep < this.getSimulationLength()) {
            // update DOM
            $(`#${this.id}-curr-sim-step`).html(`${this.simulationStep}`);
            $(`#${this.id}-curr-sim-time`).html(this.getTimeAt(this.simulationStep));
            // send players the control command
            if (this.players) {
                // it is sufficient to run a step on the first player, the other players will follow because they are bridged (see createPlayers)
                if (this.players[this.labels[0]]) {
                    await this.players[this.labels[0]].gotoControl(this.simulationStep);
                }
                // if (this.players.left) { 
                //     await this.players.left.gotoControl(this.simulationStep); // right player is bridged
                // }
                if (this["diff"]) {
                    this["diff"]();
                }
            }
            return true;
        }
        this.clearInterval();
        return false
    }

    // @override
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

    // @override
    clearInterval (): DAASplitView {
        super.clearInterval();
        if (this.players) {
            for (let i = 0; i < this.labels?.length; i++) {
                this.players[this.labels[i]]?.clearInterval();
            }
            // if (this.players.right) { this.players.right.clearInterval(); }
            // if (this.players.left) { this.players.left.clearInterval(); }
        }
        return this;
    }

    /**
     * Utility function, returns the player matching the given ID
     */
    getPlayer(playerID: number | string): DAAPlayer {
        if (this.players) {
            return this.players[playerID];
        }
        return null;
    }

    /**
     * Utility function, updates the visual appearance of the simulation plot (e.g., to match a new simulation length)
     */
    refreshSimulationPlots(): void {
        if (this.players) {
            for (let i = 0; i < this.labels?.length; i++) {
                this.players[this.labels[i]]?.refreshSimulationPlots();
            }
        }
    }

    // @overrides
    async appendWindSettings(opt?: { selector?: string, parent?: string, dropDown?: boolean, fromToSelectorVisible?: boolean }): Promise<void> {
        opt = opt || {};
        this.windDomSelector = opt.selector || this.windDomSelector;
        // create HTML elements
        if (this.players) {
            for (let i = 0; i < this.labels?.length; i++) {
                const selector: string = `daidalus-wind-${i}`;
                const theHTML: string = Handlebars.compile(windDivTemplate, { noEscape: true })({ id: selector });
                // append div as first child
                $(`#daa-display-${i}`).prepend(theHTML);
                // append input fields
                await this.players[this.labels[i]].appendWindSettings({
                    selector, 
                    dropDown: opt.dropDown, 
                    fromToSelectorVisible: opt.fromToSelectorVisible 
                });
            }
        }
        // update the front-end
        // if (this.players) {
        //     if (this.players.left) {
        //         await this.players.left.appendWindSettings({ selector: "daidalus-wind-left", dropDown: opt.dropDown, fromToSelectorVisible: opt.fromToSelectorVisible });
        //     }
        //     if (this.players.right) { 
        //         await this.players.right.appendWindSettings({ selector: "daidalus-wind-right", dropDown: opt.dropDown, fromToSelectorVisible: opt.fromToSelectorVisible }); 
        //     }
        // }
    }

    /**
     * Appends the daidalus/wellclear version selector to the DOM
     * The default configuration selected in the dropdown menu is the newest configuration, currently "DAIDALUSv2.0.2.jar"
     * @overrides
     */
    async appendDaaVersionSelector(opt?: { selector?: string, daaVersions?: string[], parent?: string }): Promise<void> {
        opt = opt || {};
        if (this.players) {
            const daaVersions: string[] = opt.daaVersions || await this.getDaaVersions();
            for (let i = 0; i < this.labels?.length; i++) {
                const selector: string = `daidalus-version-${i}`;
                const theHTML: string = Handlebars.compile(daidalusVersionDivTemplate, { noEscape: true })({ id: selector });
                // append div as first child
                $(`#daa-display-${i}`).prepend(theHTML);
                // append input fields
                await this.players[this.labels[i]]?.appendDaaVersionSelector({ selector, daaVersions });
            }
        }
    }

    // @overrides
    async appendDaaConfigurationSelector(opt?: { selector?: string, parent?: string }): Promise<void> {
        opt = opt || {};
        // const selector: string = opt.selector || "sidebar-daidalus-configuration";
        // utils.createDiv(selector, { parent: opt.parent });
        $("#sidebar-panel .single-view").css("display", "none"); // hide single-view attributes on side panel
        $("#sidebar-panel .split-view").css("display", "block"); // show split-view attributes on side panel
        if (this.players) {
            for (let i = 0; i < this.labels?.length; i++) {
                const selector: string = `daidalus-configuration-${i}`;
                const theHTML: string = Handlebars.compile(configDivTemplate, { noEscape: true })({ id: selector });
                // append div as first child
                $(`#daa-display-${i}`).prepend(theHTML);
                // append input fields
                await this.players[this.labels[i]]?.appendDaaConfigurationSelector({
                    selector,
                    attributeSelector: `sidebar-daidalus-configuration-attributes-${i}` // this is used to render the attribute values in the side bar
                }); 
            }
            // if (this.players.left) {
            //     await this.players.left.appendWellClearConfigurationSelector({
            //         selector: "daidalus-configuration-left",
            //         attributeSelector: "sidebar-daidalus-configuration-attributes-left"
            //     }); 
            // }
            // if (this.players.right) { 
            //     await this.players.right.appendWellClearConfigurationSelector({
            //         selector: "daidalus-configuration-right",
            //         attributeSelector: "sidebar-daidalus-configuration-attributes-right"
            //     }); 
            // }
        }
    }

    /**
     * Selects the given configuration for all players
     * @overrides
     */
    async selectDaaConfiguration(configName: string): Promise<boolean> {
        if (configName && this.players) {
            let success: boolean = true;
            for (let i = 0; i < this.labels?.length; i++) {
                console.log(`[daa-split-view] selectConfiguration`, { configName, player: this.players[this.labels[i]] });
                const ans: boolean = await this.players[this.labels[i]]?.selectDaaConfiguration(configName);
                success = success && ans;
            }
            // if (this.players.left) {
            //     success = success && await this.players.left.selectConfiguration(configName); 
            // }
            // if (this.players.right) { 
            //     success = success && await this.players.right.selectConfiguration(configName); 
            // }
            return success;
        }
        return false;
    }

    /**
     * Programmatically selects the given daidalus version in the dropdown menu provided of all players
     * @override
     */
    selectDaaVersion (versionName: string): boolean {
        if (versionName && this.players) {
            let success: boolean = true;
            for (let i = 0; i < this.labels?.length; i++) {
                console.log(`[daa-split-view] selectWellClearVersion`, { versionName, player: this.players[this.labels[i]] });
                const ans: boolean = this.players[this.labels[i]]?.selectDaaVersion(versionName);
                success = success && ans;
            }
            return success;
        }
        return false;
    }

    // @overrides
    appendSimulationControls (opt?: {
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
            this.setDisplays(opt?.displays);
        }
    }

    /**
     * Sets the ID of the DOM element where the daa-displays elements are attached. A spinner is also attached to each display.
     * @overrides
     */
    setDisplays (displays: string[]): DAAPlayer {
        if (displays) {
            // append loading spinner animation to the displays
            for (let i = 0; i < this.labels.length && i < displays.length; i++) {
                this.players[this.labels[i]]?.setDisplays([ displays[i] ]);
            }
        }
        return this;
    }

    // @overrides
    appendPlotControls(opt?: { top?: number, left?: number, width?: number, parent?: string, disableHandlers?: { plot?: boolean, reset?: boolean }}): DAAPlayer {
        // append controls but disable the "plot" handler from the player class
        super.appendPlotControls({ ...opt, disableHandlers: { plot: true }});
        // override the plot handler of the player class
        if (!opt?.disableHandlers?.plot) {
            $(`#${this.id}-plot`).on("click", async () => {
                if (this.players) {
                    for (let i = 0; i < this.labels?.length; i++) {
                        this.players[this.labels[i]]?.plot(); // async call
                    }
                    // if (this.players.left) { this.players.left.plot(); }
                    // if (this.players.right) { this.players.right.plot(); }
                }
            });
        }
        return this;
    }

    // // @overrides
    // appendDeveloperControls (desc: { normalMode?: () => Promise<void> | void, developerMode?: () => Promise<void> | void }, opt?: { top?: number, left?: number, width?: number, parent?: string }): DAAPlayer {
    //     super.appendDeveloperControls(desc, opt);
    //     $(`#${this.id}-developer-mode-checkbox`).unbind("change", this.developerControls.developerMode);
    //     // override developer control handler
    //     $(`#${this.id}-developer-mode-checkbox`).on("change", () => {
    //         const isChecked = $(`#${this.id}-developer-mode-checkbox`).prop("checked");
    //         this.mode = (isChecked) ? "developerMode" : "normalMode";
    //         if (isChecked && this.developerControls.developerMode) {
    //             if (this.players) {
    //                 if (this.players.left) { this.players.left.clickDeveloperMode(); }
    //                 if (this.players.right) { this.players.right.clickDeveloperMode(); }
    //             }
    //         } else {
    //             if (this.players) {
    //                 if (this.players.left) { this.players.left.clickNormalMode(); }
    //                 if (this.players.right) { this.players.right.clickNormalMode(); }
    //             }
    //         }
    //     });
    //     return this;
    // }

    // // @overrides
    // clickDeveloperMode (): void {
    //     $(`#${this.id}-developer-mode-checkbox`).prop("checked", true);
    //     this.mode = "developerMode";
    //     if (this.players) {
    //         if (this.players.left) { this.players.left.clickDeveloperMode(); }
    //         if (this.players.right) { this.players.right.clickDeveloperMode(); }
    //     }
    // }

    // // @overrides
    // clickNormalMode (): void {
    //     $(`#${this.id}-developer-mode-checkbox`).prop("checked", false);
    //     this.mode = "normalMode";
    //     if (this.players) {
    //         if (this.players.left) { this.players.left.clickNormalMode(); }
    //         if (this.players.right) { this.players.right.clickNormalMode(); }
    //     }
    // }

}
