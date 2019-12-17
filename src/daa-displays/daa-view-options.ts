import * as utils from './daa-utils';
import * as templates from './templates/daa-view-options-templates';
import { InteractiveMap } from './daa-interactive-map';
import { Compass } from './daa-compass';

export class ViewOptions {
    protected id: string;
    protected top: number;
    protected left: number;
    protected map: InteractiveMap;
    protected compass: Compass;
    protected div: HTMLElement;
    readonly nChecks: number = 3; // this will be 5 when all options are implemented
    protected readonly viewOptions: string[] = [ null, // valid checkbox IDs start from 1
        "nrthup", "call-sign", "terrain",
        "lay-lines", "trailing-lines" // these two are to be implemented
    ];

    constructor (id: string, coords: utils.Coords, opt?: { compass?: Compass, map?: InteractiveMap, parent?: string }) {
        opt = opt || {};
        this.id = id || "daa-view-options";

        coords = coords || {};
        this.top = (isNaN(+coords.top)) ? 100 : (+coords.top);
        this.left = (isNaN(+coords.left)) ? 10 : +coords.left;

        // save pointer to compass and interative map, if provided
        this.compass = opt.compass;
        this.map = opt.map;

        // create div element
        this.div = utils.createDiv(id, { parent: opt.parent, zIndex: 2 });
        const theHTML = Handlebars.compile(templates.checkButtons)({
            id: this.id,
            zIndex: 2,
            top: this.top,
            left: this.left
        });
        $(this.div).html(theHTML);
        // install handlers
        for (let i = 0; i < this.nChecks; i++) {
            const checkID = i + 1;
            $(`#${this.id}-checkbox${checkID}-overlay`).on("click", () => {
                const isChecked = $(`#${id}-checkbox-${checkID}`).prop("checked");
                const isDisabled: boolean = $(`#${id}-checkbox-${checkID}`).prop("disabled");
                if (!isDisabled) {
                    if (isChecked) {
                        this.uncheck(this.viewOptions[checkID]);
                    } else {
                        this.check(this.viewOptions[checkID]);
                    }
                }
            });
        }

        // check traffic by default
        // this.showTraffic(true);
    }
    applyCurrentViewOptions (): ViewOptions {
        for (let i = 0; i < this.nChecks; i++) {
            const checkID = i + 1;
            const isChecked = $(`#${this.id}-checkbox-${checkID}`).prop("checked");
            const isDisabled: boolean = $(`#${this.id}-checkbox-${checkID}`).prop("disabled");
            if (isChecked) {
                this.check(this.viewOptions[checkID]);
            } else {
                this.uncheck(this.viewOptions[checkID]);
            }
            if (isDisabled) {
                this.disableInput(this.viewOptions[checkID]);
            } else {
                this.enableInput(this.viewOptions[checkID]);
            }
        }
        return this;
    }
    protected checkInput (inputName: string): ViewOptions {
        const inputID: number = this.viewOptions.indexOf(inputName);
        $(`#${this.id}-checkbox-${inputID}`).prop("checked", true);
        this.updateBackground();
        return this;
    }
    protected uncheckInput (inputName: string): ViewOptions {
        const inputID: number = this.viewOptions.indexOf(inputName);
        $(`#${this.id}-checkbox-${inputID}`).prop("checked", false);
        this.updateBackground();
        return this;
    }
    protected disableInput (inputName: string): ViewOptions {
        const inputID: number = this.viewOptions.indexOf(inputName);
        $(`#${this.id}-checkbox-${inputID}`).prop("disabled", true);
        this.updateBackground();
        return this;
    }
    protected enableInput (inputName: string): ViewOptions {
        const inputID: number = this.viewOptions.indexOf(inputName);
        $(`#${this.id}-checkbox-${inputID}`).prop("disabled", false);
        this.updateBackground();
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
        for (let i = 0; i < this.nChecks; i++) {
            updateColor(this.id, i + 1);
        }    
        return this;
    }
    protected check (inputName: string): ViewOptions {
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
            default: // do nothing
        }
        return this;
    }
    protected uncheck (inputName: string): ViewOptions {
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
            case "terrain": {
                if (this.map) { this.map.streetMode(); }
                break;
            }
            default: // do nothing
        }
        return this;
    }
    // showTraffic (flag: boolean): ViewOptions {
    //     if (this.map) {
    //         if (flag) {
    //             this.check("traffic");
    //         } else {
    //             this.uncheck("traffic");
    //         }
    //     } else {
    //         console.warn("Warning: ViewOptions is not linked to a map");
    //     }
    //     return this;
    // }
    nrthupView (on: boolean): ViewOptions {
        if (this.compass) {
            if (on) {
                this.check("nrthup");
            } else {
                this.uncheck("nrthup");
            }
        }
        return this;
    }

}