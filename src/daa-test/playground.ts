
import { AirspeedTape } from '../daa-displays/daa-airspeed-tape';
import { AltitudeTape } from '../daa-displays/daa-altitude-tape';
import { VerticalSpeedTape } from '../daa-displays/daa-vertical-speed-tape';
import { Compass } from '../daa-displays/daa-compass';
import { HScale } from '../daa-displays/daa-hscale';
import { VirtualHorizon } from '../daa-displays/daa-virtual-horizon';

import { InteractiveMap } from '../daa-displays/daa-interactive-map';
import { DAAPlayer } from '../daa-displays/daa-player';
import { DAASplitView } from '../daa-displays/daa-split-view';
import { DAAScenario, LLAData } from '../daa-displays/utils/daa-server';

import * as utils from '../daa-displays/daa-utils';
import { playbackTemplate } from '../daa-displays/templates/daa-playback-templates';


// example traffic data
let ownship = {
        "id": "AC0",
        "s": {
        "lat": 28.496733,
        "lon": -80.530344,
        "alt": 3994.231476
        },
        "v": {
        "x": 292.619934,
        "y": 169.822964,
        "z": 40.558194
        }
    };

let others = [
    {
        "id": "AC1",
        "s": {
        "lat": 28.547052,
        "lon": -80.715877,
        "alt": 4000.018859
        },
        "v": {
        "x": 107.350647,
        "y": 200.000092,
        "z": 0.004356
        },
        "symbol": "daa-traffic-monitor"
    },
    {
        "id": "AC2",
        "s": {
        "lat": 28.520167,
        "lon": -80.61631,
        "alt": 3500.007042
        },
        "v": {
        "x": 299.373444,
        "y": 110.000044,
        "z": 0.001983
        },
        "symbol": "daa-traffic-avoid"
    },
    {
        "id": "AC3",
        "s": {
        "lat": 28.5166,
        "lon": -80.70284,
        "alt": 6000.008612
        },
        "v": {
        "x": 76.524117,
        "y": 164.000187,
        "z": 0.00126
        },
        "symbol": "daa-alert"
    }
];

// single player
const map: InteractiveMap = new InteractiveMap("map", { top: 2, left: 6}, { parent: "daa-disp" , terrain: "OpenStreetMap" });
// map heading is controlled by the compass
const compass: Compass = new Compass("compass", { top: 110, left: 215 }, { parent: "daa-disp", map: map });
// map zoom is controlled by nmiSelector
const hscale: HScale = new HScale("hscale", { top: 800, left: 13 }, { parent: "daa-disp", map: map });
const airspeedTape = new AirspeedTape("airspeed", { top: 100, left: 100 }, { parent: "daa-disp" });
const altitudeTape = new AltitudeTape("altitude", { top: 100, left: 600 }, { parent: "daa-disp" });
const verticalSpeedTape = new VerticalSpeedTape("vertical-speed", {top: 210, left: 600 }, { parent: "daa-disp", verticalSpeedRange: 2000 });

airspeedTape.setBands({
    RECOVERY: [ { from: 100, to: 200, units: airspeedTape.units.knots } ],
    NEAR: [ { from: 200, to: 220, units: airspeedTape.units.knots } ]
});
altitudeTape.setBands({
    RECOVERY: [ { from: 100, to: 200, units: altitudeTape.units.ft } ],
    NEAR: [ { from: 200, to: 220, units: airspeedTape.units.knots } ]
});
verticalSpeedTape.setBands({
    RECOVERY: [ { from: -2000, to: 4000, units: verticalSpeedTape.units.fpm } ],
    NEAR: [ { from: -6000, to: -2000, units: verticalSpeedTape.units.fpm } ]
})

declare interface DaaWidgets {
    map: InteractiveMap,
    compass: Compass,
    airspeedTape: AirspeedTape,
    verticalSpeedTape: VerticalSpeedTape,
    altitudeTape: AltitudeTape
}
class Playground {
    daaWidgets: DaaWidgets
    constructor (daaWidgets: DaaWidgets) {
        this.daaWidgets = daaWidgets;
        $("#test-compass").on("click", () => {
            const val: number = +$("#test-compass-input").val();
            console.log("Setting compass to " + val + " deg");
            this.daaWidgets.compass.setCompass(val);
        });
        // make resolution bug visible
        $("#compass-resolution-bug").css("display", "block");
        $("#test-resolution-bug").on("click", () => {
            const val: number = +$("#test-resolution-bug-input").val();
            console.log("Setting resolution bug to " + val);
            this.daaWidgets.compass.setBug(val);
        });

        $("#test-airspeed").on("click", () => {
            const val: number = +$("#test-airspeed-input").val();
            console.log("Setting airspeed to " + val + " knots");
            this.daaWidgets.airspeedTape.setAirSpeed(val);
        });
        $("#test-airspeed-step").on("click", () => {
            const val: number = +$("#test-airspeed-step-input").val();
            console.log("Setting airspeed step to " + val + " knots");
            this.daaWidgets.airspeedTape.setStep(val);
        });

        $("#test-vspeed").on("click", () => {
            const val: number = +$("#test-vspeed-input").val();
            console.log("Setting vertical speed to " + val + " x 100 feet per minute");
            this.daaWidgets.verticalSpeedTape.setVerticalSpeed(val);
        });
        $("#test-vspeed-step").on("click", () => {
            const val: number = +$("#test-vspeed-step-input").val();
            console.log("Setting vspeed step to " + val + " 100 feet per minute");
            this.daaWidgets.verticalSpeedTape.setStep(val);
        });

        $("#test-altitude").on("click", () => {
            const val: number = +$("#test-altitude-input").val();
            console.log("Setting altitude to " + val + " feet");
            this.daaWidgets.altitudeTape.setAltitude(val);
        });
        $("#test-altitude-step").on("click", () => {
            const val: number = +$("#test-altitude-step-input").val();
            console.log("Setting altitude step to " + val + " feet");
            this.daaWidgets.altitudeTape.setStep(val);
        });

        // $("#test-roll").on("click", function () {
        //     let val = $("#test-roll-input").val();
        //     console.log("Setting roll to " + val + " deg");
        //     _this.playground.vhorizon.setRoll(val);
        // });
        // $("#test-pitch").on("click", function () {
        //     let val = $("#test-pitch-input").val();
        //     console.log("Setting pitch to " + val + " deg");
        //     _this.playground.vhorizon.setPitch(val);
        // });

        $("#test-location").on("click", () => {
            const loc: string = <string>$("#test-location-input").val();
            console.log("Setting location to " + loc);
            this.daaWidgets.map.goTo(loc);
        });
    }
}

const playground: Playground = new Playground({
    map, compass, verticalSpeedTape, altitudeTape, airspeedTape
});
