import * as utils from './daa-utils';
import * as templates from './templates/daa-view-options-templates';
import { InteractiveMap } from './daa-interactive-map';
import { Compass } from './daa-compass';

export declare type ViewOptionLabels = "nrthup" | "call-sign" | "terrain" 
    | "contours" | "blobs"
    | "hazard-zones" | "well-clear" | "WCV" 
    | "flight-plan" | "vfr-map" | ""; // "" means empty slot

export class ViewOptions {
    // widget id
    protected id: string;
    // position and size of the view options
    protected top: number;
    protected left: number;
    protected width: number;
    protected buttonWidth: number;
    // pointers to map, compass, div, and labels
    protected map: InteractiveMap;
    protected compass: Compass;
    protected div: HTMLElement;
    protected labels: ViewOptionLabels[];
    protected offsets: number[]; // = [ 0, 208, 416, 624, 832 ];

    /**
     * Constructor
     */
    constructor (id: string, coords: utils.Coords, opt?: {
        labels?: ViewOptionLabels[], 
        buttonWidth?: number, 
        compass?: Compass, 
        map?: InteractiveMap, 
        parent?: string
    }) {
        opt = opt || {};
        this.id = id || "daa-view-options";

        coords = coords || {};
        this.top = (isNaN(+coords.top)) ? 100 : (+coords.top);
        this.left = (isNaN(+coords.left)) ? 10 : +coords.left;
        this.width = (isNaN(+coords.width)) ? 1040 : +coords.width;
        this.labels = (opt.labels) ? opt.labels : [ "nrthup", "call-sign", "terrain", "", "" ];
        this.offsets = [];
        this.buttonWidth = opt?.buttonWidth || this.width / this.labels.length;
        for (let i = 0; i < this.labels.length; i++) {
            this.offsets.push(i * this.buttonWidth);
        }

        // save pointer to compass and interative map, if provided
        this.compass = opt.compass;
        this.map = opt.map;

        // create html elements and install handlers
        this.createHtml(opt);
        this.installHandlers();
    }
    protected createHtml (opt?: { parent?: string }): void {
        opt = opt || {};
        const viewOptions: { label?: string, left: number }[] = [];
        for (let i = 0; i < this.offsets.length; i++) {
            viewOptions.push({
                label: (i < this.labels.length) ? this.labels[i] : undefined,
                left: this.offsets[i]
            });
        }
        // create div element
        this.div = utils.createDiv(this.id, { parent: opt.parent, zIndex: 2 });
        const theHTML = Handlebars.compile(templates.checkButtons)({
            id: this.id,
            zIndex: 2,
            top: this.top,
            left: this.left,
            width: this.width,
            buttonWidth: this.buttonWidth,
            viewOptions
        });
        $(this.div).html(theHTML);
    }
    protected installHandlers (): void {
        // install handlers
        for (let i = 0; i < this.labels.length; i++) {
            $(`#${this.id}-checkbox${i}-overlay`).on("click", () => {
                const isChecked = $(`#${this.id}-checkbox-${i}`).prop("checked");
                const isDisabled: boolean = $(`#${this.id}-checkbox-${i}`).prop("disabled");
                if (!isDisabled) {
                    if (isChecked) {
                        this.uncheck(this.labels[i]);
                    } else {
                        this.check(this.labels[i]);
                    }
                }
            });
        }
    }
    applyCurrentViewOptions (): ViewOptions {
        for (let i = 0; i < this.labels.length; i++) {
            const isChecked = $(`#${this.id}-checkbox-${i}`).prop("checked");
            const isDisabled: boolean = $(`#${this.id}-checkbox-${i}`).prop("disabled");
            if (isChecked) {
                this.check(this.labels[i]);
            } else {
                this.uncheck(this.labels[i]);
            }
            if (isDisabled) {
                this.disableInput(this.labels[i]);
            } else {
                this.enableInput(this.labels[i]);
            }
        }
        return this;
    }
    protected checkInput (inputName: ViewOptionLabels): ViewOptions {
        if (inputName) {
            const inputID: number = this.labels.indexOf(inputName);
            $(`#${this.id}-checkbox-${inputID}`).prop("checked", true);
            this.updateBackground();
        }
        return this;
    }
    protected uncheckInput (inputName: ViewOptionLabels): ViewOptions {
        if (inputName) {
            const inputID: number = this.labels.indexOf(inputName);
            $(`#${this.id}-checkbox-${inputID}`).prop("checked", false);
            this.updateBackground();
        }
        return this;
    }
    protected disableInput (inputName: ViewOptionLabels): ViewOptions {
        if (inputName) {
            const inputID: number = this.labels.indexOf(inputName);
            $(`#${this.id}-checkbox-${inputID}`).prop("disabled", true);
            this.updateBackground();
        }
        return this;
    }
    protected enableInput (inputName: ViewOptionLabels): ViewOptions {
        if (inputName) {
            const inputID: number = this.labels.indexOf(inputName);
            $(`#${this.id}-checkbox-${inputID}`).prop("disabled", false);
            this.updateBackground();
        }
        return this;
    }
    protected updateBackground (): ViewOptions {
        const updateColor = (id: string, inputID: number) => {
            const isChecked: boolean = $(`#${id}-checkbox-${inputID}`).prop("checked");
            const isDisabled: boolean = $(`#${id}-checkbox-${inputID}`).prop("disabled");
            const color: string = (isDisabled) ? "gray"
                                    : (isChecked) ? "green" : "transparent";
            $(`#${id}-checkbox${inputID}`).css("background-color", color);
        }
        for (let i = 0; i < this.labels.length; i++) {
            updateColor(this.id, i);
        }    
        return this;
    }
    /**
     * Checks an option
     */
    check (inputName: ViewOptionLabels): ViewOptions {
        this.checkInput(inputName);
        switch (inputName) {
            case "nrthup": {
                if (this.compass) { this.compass.nrthupView(true); }
                break;
            }
            // case "traffic": {
            //     if (this.map) {
            //         this.map.showTraffic(true);
            //         this.enableInput("call-sign");
            //     }
            //     break;
            // }
            case "call-sign": {
                if (this.map) { this.map.showCallSign(true); }
                break;
            }
            case "terrain": {
                if (this.map) { this.map.terrainMode(); }
                break;
            }
            case "vfr-map": {
                if (this.map) { this.map.vfrMode(); }
                break;
            }
            case "contours":
            case "blobs": {
                if (this.map) { this.map.showContours(true); }
                break;
            }
            case "hazard-zones":
            case "well-clear":
            case "WCV": {
                if (this.map) { this.map.showHazardZones(true); }
                break;
            }
            case "flight-plan": {
                if (this.map) { this.map.showFlightPlan(true); }
                break;
            }
            default: // do nothing
        }
        return this;
    }
    /**
     * Unchecks an option
     */
    uncheck (inputName: ViewOptionLabels): ViewOptions {
        this.uncheckInput(inputName);
        switch (inputName) {
            case "nrthup": {
                if (this.compass) { this.compass.nrthupView(false); }
                break;
            }
            // case "traffic": {
            //     if (this.map) {
            //         this.map.showTraffic(false);
            //         this.disableInput("call-sign");
            //     }
            //     break;
            // }
            case "call-sign": {
                if (this.map) { this.map.showCallSign(false); }
                break;
            }
            case "vfr-map": {
                if (this.map) { this.map.streetMode(); }
                break;
            }
            case "terrain": {
                if (this.map) { this.map.streetMode(); }
                break;
            }
            case "contours":
            case "blobs": {
                if (this.map) { this.map.showContours(false); }
                break;
            }
            case "hazard-zones":
            case "well-clear":
            case "WCV": {
                if (this.map) { this.map.showHazardZones(false); }
                break;
            }
            case "flight-plan": {
                if (this.map) { this.map.showFlightPlan(false); }
                break;
            }
            default: // do nothing
        }
        return this;
    }
    /**
     * Checks/unchecks north up view
     */
    nrthupView (on: boolean): ViewOptions {
        return on ? this.check("nrthup") : this.uncheck("nrthup");
    }
    /**
     * Checks/unchecks call sign
     */
    callSign (on: boolean): ViewOptions {
        return on ? this.check("call-sign") : this.uncheck("call-sign");
    }
    /**
     * Checks/unchecks vfr map
     */
    vfrMap (on: boolean): ViewOptions {
        return on ? this.check("vfr-map") : this.uncheck("vfr-map");
    }
    /**
     * Checks/unchecks terrain
     */
    terrain (on: boolean): ViewOptions {
        return on ? this.check("terrain") : this.uncheck("terrain");
    }
    /**
     * Checks/unchecks well-clear volume (formerly  "hazard-zones")
     */
    WCV (on: boolean): ViewOptions {
        return on ? this.check("WCV") : this.uncheck("WCV");
    }
    /**
     * Checks/unchecks blobs (aka "contours")
     */
    blobs (on: boolean): ViewOptions {
        return on ? this.check("blobs") : this.uncheck("blobs");
    }
    /**
     * Checks/unchecks "contours"
     */
    contours (on: boolean): ViewOptions {
        return this.blobs(on);
    }
    /**
     * Checks/unchecks flight plan
     */
    flightPlan (on: boolean): ViewOptions {
        return on ? this.check("flight-plan") : this.uncheck("flight-plan");
    }
}