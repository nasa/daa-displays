import { AirspeedTape } from '../daa-displays/daa-airspeed-tape';
import { AltitudeTape } from '../daa-displays/daa-altitude-tape';
import { VerticalSpeedTape } from '../daa-displays/daa-vertical-speed-tape';
import { Compass } from '../daa-displays/daa-compass';
import { HScale } from '../daa-displays/daa-hscale';
// import * as InteractiveMap from '../daa-displays/daa-interactive-map';

// const map: InteractiveMap = new InteractiveMap("map", { top: 2, left: 6}, { parent: "daa-disp" , terrain: "OpenStreetMap" });
// map heading is controlled by the compass
// const compass: Compass = new Compass("compass", { top: 110, left: 215 }, { parent: "daa-disp", map: null });
// // map zoom is controlled by nmiSelector
// const hscale: HScale = new HScale("hscale", { top: 800, left: 13 }, { parent: "daa-disp", map: null });
// const airspeedTape = new AirspeedTape("airspeed", { top: 100, left: 100 }, { parent: "daa-disp" });
// const altitudeTape = new AltitudeTape("altitude", { top: 100, left: 600 }, { parent: "daa-disp" });
// const verticalSpeedTape = new VerticalSpeedTape("vertical-speed", {top: 210, left: 600 }, { parent: "daa-disp", verticalSpeedRange: 2000 });

// const VERBOSE: boolean = false;
// function log (data: any, opt?: { force?: boolean, stringify?: boolean, expanded?: boolean }): void {
// 	opt = opt || {};
// 	if (VERBOSE || opt.force) {
// 		if (opt.stringify) {
// 			if (opt.expanded) {
// 				console.log("\n", JSON.stringify(data, null, " "));
// 			} else {
// 				console.log("\n", JSON.stringify(data));
// 			}
// 		} else {
// 			console.log("\n", data);
// 		}
// 	}
// }



describe("airspeed tape", async () => {
    const tape: AirspeedTape = new AirspeedTape("airspeed", { top: 100, left: 100 }, { parent: "disp" });
    it("constructor can create tape display", async () => {
        expect(tape).toBeDefined();
        const div: JQuery<HTMLElement> = $('#airspeed');
        expect(div.length).not.toEqual(0);
    });
    it("indicator initially shows 0", async () => {
        // spinner
        const spinner: JQuery<HTMLElement> = $('#airspeed-indicator-spinner');
        expect(spinner.length).not.toEqual(0);
        const match: RegExpMatchArray = /transform:\s*translateY\((.*)\)/.exec(spinner.attr("style"));
        expect(match).toBeDefined();
        const translateY: string = match[1];
        const children: JQuery<HTMLElement> = spinner.children();
        expect(children).toBeDefined();
        const len: number = children.length;
        expect(len).not.toEqual(0);
        const label: HTMLElement = children[len - 1];
        expect(label).toBeDefined;
        expect(`-${label.style.top}`).toEqual(translateY);
        expect(label.textContent).toEqual("0");
        // still digits
        const stillDigits: JQuery<HTMLElement> = $('#airspeed-indicator-still-digits');
        expect(stillDigits.length).not.toEqual(0);
        expect(stillDigits.text()).toEqual("00");
    });
});


describe("altitude tape", async () => {
    it("constructor can create tape display", async () => {
        const tape: AltitudeTape = new AltitudeTape("altitude", { top: 100, left: 600 }, { parent: "disp" });
        expect(tape).toBeDefined();
	});
});

