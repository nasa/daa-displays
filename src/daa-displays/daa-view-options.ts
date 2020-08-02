import * as utils from './daa-utils';
import * as templates from './templates/daa-view-options-templates';
import { InteractiveMap } from './daa-interactive-map';
import { Compass } from './daa-compass';

export declare type ViewOptionLabels = "nrthup" | "call-sign" | "terrain" | "contours" | "protected-areas";

export class ViewOptions {
    protected id: string;
    protected top: number;
    protected left: number;
    protected map: InteractiveMap;
    protected compass: Compass;
    protected div: HTMLElement;
    protected labels: ViewOptionLabels[];
    protected readonly offsets: number[] = [ 0, 208, 416, 624, 832 ];

    constructor (id: string, coords: utils.Coords, opt?: { labels?: ViewOptionLabels[], compass?: Compass, map?: InteractiveMap, parent?: string }) {
        opt = opt || {};
        this.id = id || "daa-view-options";

        coords = coords || {};
        this.top = (isNaN(+coords.top)) ? 100 : (+coords.top);
        this.left = (isNaN(+coords.left)) ? 10 : +coords.left;
        this.labels = (opt.labels) ? opt.labels : [ "nrthup", "call-sign", "terrain" ];

        // save pointer to compass and interative map, if provided
        this.compass = opt.compass;
        this.map = opt.map;

        this.createHtml(opt);
        this.installHandlers();

        // check traffic by default
        // this.showTraffic(true);
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
        const inputID: number = this.labels.indexOf(inputName);
        $(`#${this.id}-checkbox-${inputID}`).prop("checked", true);
        this.updateBackground();
        return this;
    }
    protected uncheckInput (inputName: ViewOptionLabels): ViewOptions {
        const inputID: number = this.labels.indexOf(inputName);
        $(`#${this.id}-checkbox-${inputID}`).prop("checked", false);
        this.updateBackground();
        return this;
    }
    protected disableInput (inputName: ViewOptionLabels): ViewOptions {
        const inputID: number = this.labels.indexOf(inputName);
        $(`#${this.id}-checkbox-${inputID}`).prop("disabled", true);
        this.updateBackground();
        return this;
    }
    protected enableInput (inputName: ViewOptionLabels): ViewOptions {
        const inputID: number = this.labels.indexOf(inputName);
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
        for (let i = 0; i < this.labels.length; i++) {
            updateColor(this.id, i);
        }    
        return this;
    }
    protected check (inputName: ViewOptionLabels): ViewOptions {
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
            case "contours": {
                if (this.map) { this.map.showContours(true); }
                break;
            }
            case "protected-areas": {
                if (this.map) { this.map.showProtectedAreas(true); }
                break;
            }
            default: // do nothing
        }
        return this;
    }
    protected uncheck (inputName: ViewOptionLabels): ViewOptions {
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
            case "contours": {
                if (this.map) { this.map.showContours(false); }
                break;
            }
            case "protected-areas": {
                if (this.map) { this.map.showProtectedAreas(false); }
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