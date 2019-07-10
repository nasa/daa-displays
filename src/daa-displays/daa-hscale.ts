import * as utils from './daa-utils';
import * as templates from './templates/daa-hscale-templates';

export class HScale {
    private id: string;
    private top: number;
    private left: number;
    private zoomLevel: number;
    private map: any; // TODO: create a declaration file for daa-interactive-map.js
    private div: HTMLElement;
    readonly nRadios: number = 16;
    private readonly nmiRadios = [ 0, // valid radio IDs start from 1
        0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.5, 2, 
        2.5, 5, 10, 20, 40, 80, 160, 320 ];

    constructor(id: string, coords: utils.Coords, opt?) {
        opt = opt || {};
        this.id = id || "daa-hscale";

        coords = coords || {};
        this.top = (isNaN(+coords.top)) ? 500 : (+coords.top);
        this.left = (isNaN(+coords.left)) ? 10 : +coords.left;

        // save pointer to a daa-interactive-map object, if provided
        this.map = opt.map;

        // create div element
        this.div = utils.createDiv(id, { parent: opt.parent, zIndex: 2 });
        const theHTML = Handlebars.compile(templates.radioButtons)({
            id: this.id,
            zIndex: 2,
            top: this.top,
            left: this.left
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
            $("#" + this.id + "-radio" + radioID + "-overlay").on("click", () => {
                this.checkRadio(radioID);
            });
        }
    }
    private checkInput(inputID: number) {
        $(`#${this.id}-radio-${inputID}`).prop("checked", true);
        this.updateBackground(inputID);
        return this;
    }
    private updateBackground(inputID: number) {
        const updateColor = (id: string, inputID: number) => {
            let isChecked = $(`#${id}-radio-${inputID}`).prop("checked");
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
    checkRadio(radioID: number) {
        this.checkInput(radioID);
        this.zoomLevel = radioID;
        const NMI = this.nmiRadios[this.zoomLevel];
        this.map.setZoomLevel(NMI);
        return this;
    }
}