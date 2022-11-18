import { AirspeedTape } from '../daa-displays/daa-airspeed-tape';
import { AltitudeTape } from '../daa-displays/daa-altitude-tape';
import { VerticalSpeedTape } from '../daa-displays/daa-vertical-speed-tape';
import { Compass } from '../daa-displays/daa-compass';
import { HScale } from '../daa-displays/daa-hscale';
// import { VirtualHorizon } from '../daa-displays/daa-virtual-horizon';
import { ViewOptions } from '../daa-displays/daa-view-options';

import { InteractiveMap } from '../daa-displays/daa-interactive-map';
import * as utils from '../daa-displays/daa-utils';
import { cities } from '../daa-displays/daa-map-components/daa-airspace';

import * as L from 'leaflet';
import { LeafletAircraft } from '../daa-displays/daa-map-components/leaflet-aircraft';
import { Aircraft } from '../daa-displays/daa-map-components/daa-aircraft';
import { VFR_CHARTS } from '../aeronav/vfr-charts';
import { DAA_AircraftDescriptor, LatLon } from '../daa-displays/utils/daa-types';

//---
// playground utils
//---
declare interface DaaWidgets {
    map: InteractiveMap,
    compass: Compass,
    airspeedTape: AirspeedTape,
    verticalSpeedTape: VerticalSpeedTape,
    altitudeTape: AltitudeTape
}

// playground class
class Playground {
    protected widgets: DaaWidgets;
    
    constructor (widgets?: DaaWidgets) {
        this.widgets = widgets;

        $("#test-compass").on("click", () => {
            const val: number = +$("#test-compass-input").val();
            console.log("Setting compass to " + val + " deg");
            this.widgets?.compass.setCompass(val);
        });

        // make resolution bug visible
        $("#compass-resolution-bug").css("display", "block");
        $("#test-resolution-bug").on("click", () => {
            const val: number = +$("#test-resolution-bug-input").val();
            console.log("Setting resolution bug to " + val);
            this.widgets?.compass.setBug(val);
        });

        $("#test-airspeed").on("click", () => {
            const val: number = +$("#test-airspeed-input").val();
            console.log("Setting airspeed to " + val + " knots");
            this.widgets?.airspeedTape.setAirSpeed(val, AirspeedTape.units.knots);
        });
        $("#test-airspeed-step").on("click", () => {
            const val: number = +$("#test-airspeed-step-input").val();
            console.log("Setting airspeed step to " + val + " knots");
            this.widgets?.airspeedTape.setStep(val);
        });

        $("#test-vspeed").on("click", () => {
            const val: number = +$("#test-vspeed-input").val();
            console.log("Setting vertical speed to " + val + " x 100 feet per minute");
            this.widgets?.verticalSpeedTape.setVerticalSpeed(val);
        });
        $("#test-vspeed-step").on("click", () => {
            const val: number = +$("#test-vspeed-step-input").val();
            console.log("Setting vspeed step to " + val + " 100 feet per minute");
            this.widgets?.verticalSpeedTape.setStep(val);
        });

        $("#test-altitude").on("click", () => {
            const val: number = +$("#test-altitude-input").val();
            console.log("Setting altitude to " + val + " feet");
            this.widgets?.altitudeTape.setAltitude(val, AltitudeTape.units.ft);
        });
        $("#test-altitude-step").on("click", () => {
            const val: number = +$("#test-altitude-step-input").val();
            console.log("Setting altitude step to " + val + " feet");
            this.widgets?.altitudeTape.setStep(val);
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
            this.widgets?.map.goTo(loc);
        });

        $("#test-geofence").on("click", () => {
            const input: string = <string>$("#test-geofence-input").val();
            const json: number[][] = JSON.parse(input);
            if (typeof json === "object" && json.length > 0) {
                const polygon = json.map(elem => {
                    return { lat: elem[0], lon: elem[1] };
                });
                console.log("Setting geofence ", polygon);
                this.widgets?.map.addGeoFence("g2", polygon, { top: 110, bottom: "SFC" });
            }
        });
    }
}

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

const geofence_perimeter: LatLon<number>[] = [
    { lat: cities.hampton.lat, lon: cities.hampton.lon },
    { lat: cities.newportnews.lat, lon: cities.newportnews.lon },
    { lat: cities.poquoson.lat, lon: cities.poquoson.lon }
];

const flight_path: utils.FlightPlan = [
    { lla: { ...cities.virginiabeach, alt: 200 }, label: "Virginia Beach" },
    { lla: { ...cities.norfolk, alt: 200 }, label: "Norfolk" },
    { lla: { ...cities.poquoson, alt: 200 }, label: "Poquoson" }
];

const geofence_floor: { top: string | number, bottom: string | number } = { top: 120, bottom: "SFC" };

//---
// WWD
//---

const render_wwd: boolean = true;
let wwdPlayground: Playground = null;
if (render_wwd) {
    // interactive map
    const map: InteractiveMap = new InteractiveMap("wwd-map", { 
        top: 2, 
        left: 6
    }, { 
        parent: "daa-disp",
        engine: "wwd"
    });
    map.setTraffic(others);

    // map heading is controlled by the compass
    const compass: Compass = new Compass("compass", { top: 110, left: 215 }, { parent: "daa-disp", map: map });
    // map zoom is controlled by nmiSelector
    const hscale: HScale = new HScale("hscale", { top: 800, left: 13 }, { parent: "daa-disp", map: map });
    // map view options
    const viewOptions: ViewOptions = new ViewOptions("view-options", { top: 4, left: 13 }, {
        labels: [ "nrthup", "terrain", "call-sign", "", "", "flight-plan" ],
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

    // add geofence to the map
    map.addGeoFence("g1", geofence_perimeter, geofence_floor);
    map.showGeoFence(true);

    // set flight path
    map.setFlightPlan(flight_path);
    map.hideFlightPlan();

    // create the playground for testing the display elements
    wwdPlayground = new Playground({
        map, compass, verticalSpeedTape, altitudeTape, airspeedTape
    });
} else {
    $("#ljs-disp").css({ "margin-top": 6 });
}

//---
// leafletjs
//---

// interactive map
const lmap: InteractiveMap = new InteractiveMap("lmap", { 
    top: 2, 
    left: 6
}, { 
    parent: "ljs-disp",
    engine: "leafletjs",
    widescreen: false
});
lmap.setTraffic(others);

// map heading is controlled by the compass
const lcompass: Compass = new Compass("ljs-compass", { top: 110, left: 215 }, { parent: "ljs-disp", map: lmap });
// map zoom is controlled by nmiSelector
const lhscale: HScale = new HScale("ljs-hscale", { top: 800, left: 13 }, { parent: "ljs-disp", map: lmap });
// map view options
const lviewOptions: ViewOptions = new ViewOptions("ljs-view-options", { top: 4, left: 13 }, {
    labels: [ "nrthup", "vfr-map", "call-sign", "", "", "flight-plan" ],
    parent: "ljs-disp", 
    compass: lcompass, 
    map: lmap
});
lviewOptions.applyCurrentViewOptions();
// tape displays
const lairspeedTape: AirspeedTape = new AirspeedTape("ljs-airspeed", { top: 100, left: 100 }, { parent: "ljs-disp" });
const laltitudeTape: AltitudeTape = new AltitudeTape("ljs-altitude", { top: 100, left: 833 }, { parent: "ljs-disp" });
const lverticalSpeedTape: VerticalSpeedTape = new VerticalSpeedTape("ljs-vertical-speed", {top: 210, left: 981 }, { parent: "ljs-disp", verticalSpeedRange: 2000 });

// set bands
lairspeedTape.setBands({
    RECOVERY: [ { from: 100, to: 200, units: AirspeedTape.units.knots } ],
    NEAR: [ { from: 200, to: 220, units: AirspeedTape.units.knots } ]
}, AirspeedTape.units.knots);
laltitudeTape.setBands({
    RECOVERY: [ { from: 100, to: 200, units: AltitudeTape.units.ft } ],
    NEAR: [ { from: 200, to: 220, units: AirspeedTape.units.knots } ]
}, AltitudeTape.units.ft);
lverticalSpeedTape.setBands({
    RECOVERY: [ { from: -2000, to: 4000, units: lverticalSpeedTape.units.fpm } ],
    NEAR: [ { from: -6000, to: -2000, units: lverticalSpeedTape.units.fpm } ]
});

// add geofence to the map
lmap.addGeoFence("g1", geofence_perimeter, geofence_floor);
lmap.showGeoFence(true);

// set flight path
lmap.setFlightPlan(flight_path);
lmap.hideFlightPlan();

// create the playground for testing the display elements
const ljsPlayground: Playground = new Playground({
    map: lmap, compass: lcompass, verticalSpeedTape: lverticalSpeedTape, altitudeTape: laltitudeTape, airspeedTape: lairspeedTape
});



//-- test leaflet alone
const ljs_test: boolean = true;
if (ljs_test) {
    // leaflet.js
    const mapLayer: L.Layer = L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
        className: "moving_map"
    });

    const vfr_charts: L.Layer[] = [];
    for (let i = 0; i < VFR_CHARTS.length; i++) {
        const vfr: L.Layer = L.imageOverlay(`aeronav/${VFR_CHARTS[i].file}`, [
            // southwest
            [ VFR_CHARTS[i].south, VFR_CHARTS[i].west ], 
            // northeast
            [ VFR_CHARTS[i].north, VFR_CHARTS[i].east ]
        ], {
            opacity: 0.7,
            className: "vfr_chart" //call 290 5201
        });
        vfr_charts.push(vfr);
    }
    const ljsmap: L.Map = L.map('test-ljs', {
        center: [ cities.hampton.lat, cities.hampton.lon ],
        zoom: 17.8,
        // 18 = 0.08NMI -- 18 is the maximum zoom level supported by leafletjs
        // 17.8 = 0.1NMI
        // 16.8 = 0.2NMI
        // 15.8 = 0.4NMI
        // 14.8 = 0.8NMI
        // 14.3 = 1NMI
        // 14 = 1.25NMI
        // 13 = 2.5NMI
        // 12 = 5NMI
        // 11 = 10NMI
        // 10 = 20NMI
        // 9 = 40NMI
        // 8 = 80NMI
        // 7 = 160NMI
        // 6 = 320NMI
        zoomSnap: 0.1,
        zoomDelta: 0.1,
        zoomControl: true,
        layers: [
            mapLayer,
            // ...vfr_charts
        ]
    });
    L.control.scale().addTo(ljsmap);
    const own: LeafletAircraft = new LeafletAircraft(ljsmap, {
        s: {
            lat: +cities.hampton.lat,
            lon: +cities.hampton.lon,
            alt: 0
        },
        heading: 0,
        callSign: "ownship",
        symbol: "ownship",
        aircraftVisible: true
    }, mapLayer);
    const h0: number = Aircraft.headingFromVelocity(others[0].v);
    const ac0: LeafletAircraft = new LeafletAircraft(ljsmap, {
        s: {
            lat: +others[0].s.lat,
            lon: +others[0].s.lon,
            alt: +others[0].s.alt
        },
        heading: h0,
        callSign: others[0].callSign,
        symbol: others[0].symbol,
        aircraftVisible: true
    }, mapLayer);
    const h1: number = Aircraft.headingFromVelocity(others[1].v);
    const ac1: LeafletAircraft = new LeafletAircraft(ljsmap, {
        s: {
            lat: +others[1].s.lat,
            lon: +others[1].s.lon,
            alt: +others[1].s.alt
        },
        heading: h1,
        callSign: others[1].callSign,
        symbol: others[1].symbol,
        aircraftVisible: true
    }, mapLayer);
    const h2: number = Aircraft.headingFromVelocity(others[0].v);
    const ac2: LeafletAircraft = new LeafletAircraft(ljsmap, {
        s: {
            lat: +others[2].s.lat,
            lon: +others[2].s.lon,
            alt: +others[2].s.alt
        },
        heading: h2,
        callSign: others[2].callSign,
        symbol: others[2].symbol,
        aircraftVisible: true
    }, mapLayer);
    ljsmap.panTo([ cities.hampton.lat, cities.hampton.lon ]);
}
