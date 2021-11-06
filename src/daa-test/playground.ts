import { AirspeedTape } from '../daa-displays/daa-airspeed-tape';
import { AltitudeTape } from '../daa-displays/daa-altitude-tape';
import { VerticalSpeedTape } from '../daa-displays/daa-vertical-speed-tape';
import { Compass } from '../daa-displays/daa-compass';
import { HScale } from '../daa-displays/daa-hscale';
import { VirtualHorizon } from '../daa-displays/daa-virtual-horizon';
import { ViewOptions } from '../daa-displays/daa-view-options';

import { InteractiveMap, DAA_AircraftDescriptor } from '../daa-displays/daa-interactive-map';
import * as utils from '../daa-displays/daa-utils';
import { cities } from '../daa-displays/daa-map-components/daa-airspace';

const daaSymbols = [ "daa-target", "daa-traffic-monitor", "daa-traffic-avoid", "daa-alert" ];

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

let others: DAA_AircraftDescriptor[] = [
    {
        callSign: "AC1",
        s: {
            lat: cities.newportnews.lat,
            lon: cities.newportnews.lon,
            alt: 4000.018859
        },
        v: {
            x: 107.350647,
            y: 200.000092,
            z: 0.004356
        },
        symbol: "daa-traffic-monitor"
    },
    {
        callSign: "AC2",
        s: {
            lat: cities.suffolk.lat,
            lon: cities.suffolk.lon,
            alt: 3500.007042
        },
        v: {
            x: 299.373444,
            y: 110.000044,
            z: 0.001983
        },
        symbol: "daa-traffic-avoid"
    },
    {
        callSign: "AC3",
        s: {
            lat: cities.poquoson.lat,
            lon: cities.poquoson.lon,
            alt: 6000.008612
        },
        v: {
            x: 76.524117,
            y: 164.000187,
            z: 0.00126
        },
        symbol: "daa-alert"
    }
];

const geofence_perimeter: utils.LatLon[] = [
    { lat: cities.hampton.lat, lon: cities.hampton.lon },
    { lat: cities.newportnews.lat, lon: cities.newportnews.lon },
    { lat: cities.poquoson.lat, lon: cities.poquoson.lon }
];

const flight_path: utils.FlightPath = [
    { lla: { ...cities.virginiabeach, alt: 200 }, label: "Virginia Beach" },
    { lla: { ...cities.norfolk, alt: 200 }, label: "Norfolk" },
    { lla: { ...cities.poquoson, alt: 200 }, label: "Poquoson" }
];

const geofence_floor: { top: string | number, bottom: string | number } = { top: 120, bottom: "SFC" };

// interactive map
const map: InteractiveMap = new InteractiveMap("map", { top: 2, left: 6}, { parent: "daa-disp" });
// add geofence to the map
map.addGeoFence("g1", geofence_perimeter, geofence_floor);
map.showGeoFence(true);
map.setTraffic(others);
// map heading is controlled by the compass
const compass: Compass = new Compass("compass", { top: 110, left: 215 }, { parent: "daa-disp", map: map });
// map zoom is controlled by nmiSelector
const hscale: HScale = new HScale("hscale", { top: 800, left: 13 }, { parent: "daa-disp", map: map });
// map view options
const viewOptions: ViewOptions = new ViewOptions("view-options", { top: 4, left: 13 }, {
    labels: [ "nrthup", "call-sign", "terrain", "", "", "flight-plan" ],
    parent: "daa-disp", 
    compass, 
    map
});
viewOptions.applyCurrentViewOptions();
// tape displays
const airspeedTape: AirspeedTape = new AirspeedTape("airspeed", { top: 100, left: 100 }, { parent: "daa-disp" });
const altitudeTape: AltitudeTape = new AltitudeTape("altitude", { top: 100, left: 833 }, { parent: "daa-disp" });
const verticalSpeedTape: VerticalSpeedTape = new VerticalSpeedTape("vertical-speed", {top: 210, left: 981 }, { parent: "daa-disp", verticalSpeedRange: 2000 });

// set bands
airspeedTape.setBands({
    RECOVERY: [ { from: 100, to: 200, units: AirspeedTape.units.knots } ],
    NEAR: [ { from: 200, to: 220, units: AirspeedTape.units.knots } ]
}, AirspeedTape.units.knots);
altitudeTape.setBands({
    RECOVERY: [ { from: 100, to: 200, units: AltitudeTape.units.ft } ],
    NEAR: [ { from: 200, to: 220, units: AirspeedTape.units.knots } ]
}, AltitudeTape.units.ft);
verticalSpeedTape.setBands({
    RECOVERY: [ { from: -2000, to: 4000, units: verticalSpeedTape.units.fpm } ],
    NEAR: [ { from: -6000, to: -2000, units: verticalSpeedTape.units.fpm } ]
});

// set flight path
map.setFlightPath(flight_path);
map.hideFlightPath();

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
            this.daaWidgets.airspeedTape.setAirSpeed(val, AirspeedTape.units.knots);
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
            this.daaWidgets.altitudeTape.setAltitude(val, AltitudeTape.units.ft);
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

        $("#test-geofence").on("click", () => {
            const input: string = <string>$("#test-geofence-input").val();
            const json: number[][] = JSON.parse(input);
            if (typeof json === "object" && json.length > 0) {
                const polygon = json.map(elem => {
                    return { lat: elem[0], lon: elem[1] };
                });
                console.log("Setting geofence ", polygon);
                this.daaWidgets.map.addGeoFence("g2", polygon, { top: 110, bottom: "SFC" });
            }
        });
    }
}

const playground: Playground = new Playground({
    map, compass, verticalSpeedTape, altitudeTape, airspeedTape
});
