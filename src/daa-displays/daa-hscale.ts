import * as utils from './daa-utils';
import * as templates from './templates/daa-hscale-templates';
import { InteractiveMap } from './daa-interactive-map';
import { Compass } from './daa-compass';

export class HScale {
    protected id: string;
    protected top: number;
    protected left: number;
    protected width: number;
    protected buttonWidth: number;
    protected zoomLevel: number;
    protected map: InteractiveMap;
    protected compass: Compass;
    protected div: HTMLElement;
    readonly nRadios: number = 16;
    protected offsets: number[];
    protected readonly nmiRadios: number[] = [ 0, // valid radio IDs start from 1
        0.02, 0.04, 0.08, 0.1, 0.2, 0.4, 0.8, 1, // display 8 elements in each screen
        2.5, 5, 10, 20, 40, 80, 160, 320
    ]; // this array must contain 17 elements --- see daa-hscale-template.ts

    constructor(id: string, coords: utils.Coords, opt?: { map?: InteractiveMap, compass?: Compass, parent?: string }) {
        opt = opt || {};
        this.id = id || "daa-hscale";

        coords = coords || {};
        this.top = (isNaN(+coords.top)) ? 500 : (+coords.top);
        this.left = (isNaN(+coords.left)) ? 10 : +coords.left;
        this.width = (isNaN(+coords.width)) ? 1040 : +coords.width;
        this.offsets = [];
        const arrow_width: number = 40; // arrows placed on the side of the options, they are used for changing screen
        const n: number = 8; // number of elements displays in each screen
        this.buttonWidth = (this.width - 2 * arrow_width) / 8;
        for (let i = 0; i < n; i++) {
            this.offsets.push(arrow_width + i * this.buttonWidth);
        }

        // save pointer to a daa-interactive-map object, if provided
        this.map = opt.map;
        this.compass = opt.compass;

        // create div element
        this.div = utils.createDiv(id, { parent: opt.parent, zIndex: 2 });
        const theHTML = Handlebars.compile(templates.radioButtons)({
            id: this.id,
            zIndex: 2,
            top: this.top,
            left: this.left,
            width: this.width,
            buttonWidth: this.buttonWidth,
            nmiRadios: this.nmiRadios,
            offsets: this.offsets
        });
        $(this.div).html(theHTML);
        // @ts-ignore // .carousel is added by bootstrap
        $('.carousel').carousel({
            interval: 0,
            ride: false,
            wrap: false
        });
        // set zoom level
        this.zoomLevel = 10; // option #10 is 5NMI
        this.checkRadio(this.zoomLevel);
        // install handlers
        for (let i = 0; i < this.nRadios; i++) {
            let radioID = i + 1;
            $(`#${this.id}-radio${radioID}-overlay`).on("click", () => {
                this.checkRadio(radioID);
            });
        }
    }
    protected checkInput(inputID: number): HScale {
        $(`#${this.id}-radio-${inputID}`).prop("checked", true);
        this.updateBackground();
        return this;
    }
    protected updateBackground(): HScale {
        const updateColor = (id: string, inputID: number) => {
            const isChecked = $(`#${id}-radio-${inputID}`).prop("checked");
            if (isChecked) {
                $(`#${id}-radio${inputID}`).css("background-color", "green");
            } else {
                $(`#${id}-radio${inputID}`).css("background-color", "transparent");
            }    
        }
        for (let i = 0; i < this.nRadios; i++) {
            updateColor(this.id, i + 1);
        }    
        return this;
    }
    checkRadio(radioID: number): HScale {
        this.checkInput(radioID);
        this.zoomLevel = radioID;
        const NMI = this.nmiRadios[this.zoomLevel];
        if (this.map) {
            this.map.setZoomLevel(NMI);
        } else {
            console.warn("Warning: HScale is not linked to an interactive map object");
        }
        if (this.compass) {
            this.compass.setZoomLevel(NMI);
        } else {
            console.warn("Warning: HScale is not linked to a compass");
        }
        return this;
    }
}