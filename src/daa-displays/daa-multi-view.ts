/**
 * @module DAAMultiView
 * @version 2022.11.01
 * @description <div style="display:flex;"><div style="width:50%;">
 *              <b>Multi-View Player.</b>
 *              <p>This player extends the DAA Playback Player with functions 
 *              for viewing the DAA guidance on multiple aircraft in a simulated flight scenario. 
 *              The DAA logic of all aircraft in the simulated scenario is executed 
 *              in lock-step and visualized side-to-side.</p></div>
 *              <img src="images/daa-multi-view.png" style="margin-left:8%; max-height:180px;" alt="DAA Multi View Player"></div>
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
import { DEFAULT_MAP_HEIGHT, DEFAULT_MAP_WIDTH } from './daa-interactive-map';
import { DAAPlayer, DidChangeDaaScenarioSelection, PlayerEvents } from './daa-player';
import { DAASplitView } from './daa-split-view';
import { jquerySelector } from './daa-utils';
import { displayDivTemplate, multiViewOptions, sidebarAttributesColums } from './templates/daa-playback-templates';

/**
 * Multi-view options:
 * - use same configuration for all views
 * - use same daa logic for all views
 * These options are shown only on the first view/player
 */
export type DAAMultiViewOptions = "use-same-logic" | "use-same-config" | string;

/**
 * Multi view player, shows multiple DAA views on a grid view.
 * Each view in the grid is associated with a different aircraft.
 * Views are numbered incrementally from left to right, top to bottom.
 * The default grid size is 2x2.
 * An example 2x2 grid view indicating the view IDs is as follows:
 * |-----------------|
 * | view 1 | view 2 |
 * | view 3 | view 4 |
 * |-----------------|
 */
export class DAAMultiView extends DAASplitView {
    protected parent: string = "body"; // this should be a valid jQuery selector, e.g., "body" or "#daa-disp"
    protected tailNumbers: string[];
    public readonly multiviewOptions: { [name: string]: boolean } = {
        "use-same-logic": false,
        "use-same-config": false
    };

    /**
     * @function <a name="DAASplitView">DAASplitView</a>
     * @description Constructor. Creates a new split view player.
     * @param opt {Object} Player options
     *          <li>id {String} Unique player identifier (default: "daa-split-view").</li>
     *          <li>left (Object({label: string, display: Object}): configuration options for left display</li>
     *          <li>right (Object({label: string, display: Object}): configuration options for right display</li>
     *          <li>fs (Object): FileSystem, used for saving simulation logs.</li>
     *          <li>scenarios (Object({ scenarioID: data })): scenarios to be simulated</li>
     * @memberof module:DAASplitView
     * @instance
     */
    constructor (nViews: number, opt?: {
        id?: string,
        parent?: string
    }) {
        super({ id: opt?.id || "daa-multi-view", createPlayers: false });
        this.parent = opt?.parent || "body";
        // player labels
        for (let i = 0; i < nViews; i++) {
            this.labels[i] = `${i}`;
        }
        // create players
        this.createPlayers();
    }
    /**
     * Deletes existing views
     */
    deleteViews (): void {
        this.labels = [];
        this.players = {};
        // delete dom elements
        $(jquerySelector(this.parent)).empty();
    }
    /**
     * Stores the tail numbers in the player and creates n players, one for each tail number
     */
    setTailNumbers (tailNumbers: string[]): void {
        this.tailNumbers = tailNumbers;
        // delete the old views
        this.deleteViews();
        // player labels
        for (let i = 0; i < tailNumbers?.length; i++) {
            this.labels[i] = `${i}`;
        }
        // create DOM elements, places on a grid 3xN
        const theHTML: string = Handlebars.compile(displayDivTemplate, { noEscape: true })({
            aircraft: tailNumbers,
            height: DEFAULT_MAP_HEIGHT + 90, // view height
            width: DEFAULT_MAP_WIDTH, // view width
            dispHeight: DEFAULT_MAP_HEIGHT,
            dispWidth: DEFAULT_MAP_WIDTH - 180 // reduce spacing between cols
        });
        $(jquerySelector(this.parent)).html(theHTML);
        // re-create players
        this.createPlayers({ tailNumbers });
        // re-install handlers
        this.installHandlers();
        // inherit and propagate relevant backbone events from the first player
        if (this.labels?.length) {
            this.players[this.labels[0]]?.on(PlayerEvents.DidChangeDaaScenarioSelection, (evt: DidChangeDaaScenarioSelection) => {
                this.trigger(PlayerEvents.DidChangeDaaScenarioSelection, evt);
            });
        }
    }
    /**
     * Utility function, returns the tail numbers indicated in the current scenario
     */
    getCurrentTailNumbers (): string[] {
        return this.tailNumbers;
    }
    // @overrides
    appendSimulationControls(opt?: {
        parent?: string,
        top?: number,
        left?: number,
        width?: number,
        htmlTemplate?: string,
        multiplay?: { cssClass?: string, id: string, label: string }[]
    }): void {
        super.appendSimulationControls({ ...opt, displays: [ ".multi-view-display" ] })
    }
    /**
     * Utility function, creates the DOM elements on the sidebar for displaying the configuration attributes for the players
     */
    createConfigurationAttributesViews (): void {
        const $parent: JQuery<HTMLElement> = $(`.sidebar-daidalus-diff-configuration-attributes`); // this element is created by the split-view template, see sidePanelTemplate in daa-playback-templates.ts
        if ($parent[0]) {
            const theHTML: string = Handlebars.compile(sidebarAttributesColums, { noEscape: true })({
                labels: this.labels
            });
            $parent.html(theHTML);
        }
    }
    /**
     * Loads the selected scenario in the view
     * @override
     */
    async loadSelectedScenario(): Promise<void> {
        // disable simulation controls
        this.disableSimulationControls();
        // get selected scenario
        const selectedScenario: string = this.getSelectedScenario();
        // re-create players
        const tailNumbers: string[] = await this.getTailNumbers(selectedScenario);
        // delete the current views and create new ones
        this.deleteViews();
        this.setTailNumbers(tailNumbers);
        // create HTML elements for the grid view
        const theHTML: string = Handlebars.compile(displayDivTemplate, { noEscape: true })({
            aircraft: tailNumbers,
            height: 924,
            width: 1064
        });
        $(jquerySelector(this.parent)).html(theHTML);
        // link the views to the displays
        for (let i = 0; i < this.labels.length; i++) {
            this.players[this.labels[i]]?.setDisplays([ ".multi-view-display" ]);
        }

        // execute user-defined code onWillLoadScenario
        if (typeof this._defines?.createMultiView === "function") {
            await this._defines.createMultiView(tailNumbers);
        }
        // load a scenario with different ownship in each player
        await this.loadScenarioFile(selectedScenario, { forceReload: true, ownshipNames: tailNumbers });
        // enable simulation controls
        this.enableSimulationControls();
    }
    /**
     * Utility function, appends multi-view specific options
     * Options include:
     * - use same configuration for all views
     * - use same daa logic for all views
     * These options are shown only on the first view/player
     */
    async appendMultiViewOptions (opt?: { selector?: string, parent?: string, width?: number, left?: number, top?: number }): Promise<void> {
        if (this.players) {
            if (this.labels?.length) {
                const selector: string = `multi-view-${this.labels[0]}`;
                const theHTML: string = Handlebars.compile(multiViewOptions, { noEscape: true })({
                    id: selector,
                    width: isFinite(opt?.width) ? `${opt.width}` : "300",
                    innerWidth: isFinite(opt?.width) ? `${opt.width - 100}` : "200",
                    left: isFinite(opt?.left) ? `${opt.left}` : "-45",
                    top: isFinite(opt?.top) ? `${opt.top}` : "0"
                });
                // append multiview display options
                $(`.multi-view-display-options`).prepend(theHTML);
                // append handlers
                const optionsNames: string[] = Object.keys(this.multiviewOptions);
                for (let i = 0; i < optionsNames?.length; i++) {
                    $(`#${selector}-${optionsNames[i]}-btn`).on("click", () => {
                        this.selectOption(optionsNames[i]);
                    });
                }
            }
        }
    }
    /**
     * Utility function, selects the given option in the user interface
     */
    selectOption (option: DAAMultiViewOptions): boolean {
        switch(option) {
            case "use-same-logic": { // use daa version selected in the first player on all players
                const globalVersion: string = this.players[0]?.readSelectedDaaVersion();
                if (globalVersion) {
                    // select the configuration in all players
                    this.selectDaaVersion(globalVersion);
                } else {
                    console.warn(`[daa-multi-view] Warning: unable to select global daa version`, globalVersion);
                }
                break;
            }
            case "use-same-config": { // use daa configuration selected in the first player on all players
                const globalConfiguration: string = this.players[0]?.readSelectedDaaConfiguration();
                if (globalConfiguration) {
                    // select the configuration in all players
                    this.selectDaaConfiguration(globalConfiguration);
                } else {
                    console.warn(`[daa-multi-view] Warning: unable to select global daa configuration`, globalConfiguration);
                }
                break;
            }
            default: {
                console.warn(`[daa-multi-view] Warning: trying to select unsupported option ${option}`);
                break;
            }
        }
        const selector: string = `multi-view-${this.labels[0]}`;
        if ($(`#${selector}-${option}-checkbox`)[0]) {
            $(`#${selector}-${option}-checkbox`).prop("checked", true);
            return true;
        }
        console.warn(`[daa-multi-view] Warning, option ${option} is not available`);
        return false;
    }
    /**
     * Utility function, deselects the given option in the user interface
     */
    deselectOption (option: DAAMultiViewOptions): boolean {
        const selector: string = `multi-view-${this.labels[0]}`;
        if ($(`#${selector}-${option}-checkbox`)[0]) {
            $(`#${selector}-${option}-checkbox`).prop("checked", false);
            return true;
        }
        console.warn(`[daa-multi-view] Warning, option ${option} is not available`);
        return false;
    }
    /**
     * @override
     */
    refreshBrowserAddress (): void {
        // do nothing in multiview
    }
    /**
     * @override
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    define (fname: "init" | "step" | "plot" | "diff" | "createMultiView" | string, fbody: (...args: any) => any): DAAPlayer {
        return super.define(fname, fbody);
    }
}
