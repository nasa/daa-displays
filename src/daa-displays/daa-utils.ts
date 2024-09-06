import { deg2rad, rad2deg } from "./utils/daa-math";
import { BandElement, Region, DaidalusBand, AlertKind, LatLonAlt, LatLon, Vector3D, Alert, DaaBands, AlertRegion } from "./utils/daa-types";
import * as server from './utils/daa-types';

// useful constants
export const DEFAULT_INSTRUMENT_ANIMATION_DURATION: number = 0.250; // in seconds, animation duration of compass and tape displays
export const DEFAULT_TRAFFIC_UPDATE_INTERVAL: number = 1; // in seconds, animation duration for traffic aircraft
export const DEFAULT_TRAFFIC_ANIMATION_NFRAMES: number = 8; // number of interpolation points when using animation to move traffic aircraft
export const MIN_ANIMATION_THRESHOLD: number = 0.125; // in seconds, aircraft are animated only if the animation interval is greated than this threshold (0.125s = 8Hz)
export const DEFAULT_MAX_TRACE_LEN: number = 32; // max aircraft trace length

// useful aliases
export type DaaSymbol = server.DaaSymbol;

export const color = {
    RECOVERY: "#00f500", // green
    FAR: "#ffc107", // yellow
    MID: "#ffc107", // yellow "#ffbf00",
    NEAR: "red",
    UNKNOWN: "white",
    NONE: "transparent"
};
export const bandColors = {
    RECOVERY: { style: "dash", color: color.RECOVERY }, // DASH green
    FAR: { style: "dash", color: color.FAR }, // DASH YELLOW
    MID: { style: "solid", color: color.MID }, // YELLOW
    NEAR: { style: "solid", color: color.NEAR }, // red
    UNKNOWN: { style: "solid", color: color.UNKNOWN }, // white
    NONE: { style: "solid", color: color.NONE }
};
export const bandColorsDanti = {
    RECOVERY: { style: "dash", color: color.RECOVERY }, // DASH green
    FAR: { style: "dash", color: color.NONE }, // disabled in DANTi
    MID: { style: "solid", color: color.NONE }, // disabled in DANTi
    NEAR: { style: "solid", color: "#ffbf00" }, // amber
    UNKNOWN: { style: "solid", color: color.UNKNOWN }, // white
    NONE: { style: "solid", color: color.NONE }
};
export interface RGBColor { r: number, g: number, b: number }
export function hex2rgb (hex: string, opt?: { normalize?: boolean }): RGBColor {
    let elems: string = hex || "000000";
    elems = elems.startsWith("#") ? elems.substring(1, elems.length) : elems;
	const r: string = (elems.length > 2) ? elems.substring(0, 2) : "00";
	const g: string = (elems.length > 4) ? elems.substring(2, 4) : "00";
    const b: string = (elems.length > 6) ? elems.substring(4, 6) : "00";
    return opt?.normalize ? { r: parseInt(r, 16) / 255.0, g: parseInt(g, 16) / 255.0, b: parseInt(b) / 255.0 }
        : { r: parseInt(r, 16), g: parseInt(g, 16), b: parseInt(b, 16) };
}
export function getHtmlColor (wwdColor: { r: number, g: number, b: number }): string {
    return `rgb(${wwdColor.r * 255}, ${wwdColor.g * 255}, ${wwdColor.b * 255 })`;
}
export const bugColors = {
    NONE: "#cccccc", // white
    FAR: "#ffc107", // DASHED YELLOW
    MID: "#ffc107", //"#ffbf00",
    NEAR: "red",
    RECOVERY: "#00f500", // DASHED green #07dc0a
    UNKNOWN: "white"
    ,
    "0": "#cccccc",  // NONE
    "1": "#ffc107",// FAR
    "2": "#ffc107",// MID
    "3": "red",    // NEAR
    "4": "#00f500",// RECOVERY
    "-1": "white"   // UNKNOWN
};
export const alertingColors = {
    NONE: { color: "transparent" },
    "0": { color: "transparent" },
    MONITOR: { color: "#cccccc" }, // white
    FAR: { color: "#cccccc" }, // white
    "1": { color: "#cccccc" }, // white
    AVOID: { color: "#ffc107" }, // yellow
    MID: { color: "#ffc107" }, // yellow
    "2": { color: "#ffc107" }, // yellow
    ALERT: { color: "red" },
    NEAR: { color: "red" },
    RECOVERY: { color: "red" },
    "3": { color: "red" },
};


// daa constant
export const daaSymbols: DaaSymbol[] = [ "daa-target", "daa-traffic-monitor", "daa-traffic-avoid", "daa-alert" ]; // 0..3

/**
 * Utility function, converts an alert level to a symbol name
 */
export function alertRegion2symbol (daaAlert: AlertRegion): DaaSymbol {
    switch (daaAlert) {
        case "FAR": // 1
            return "daa-traffic-monitor";
        case "MID": // 2
            return "daa-traffic-avoid";
        case "NEAR": // 3
            return "daa-alert";
        case "NONE":
        case "UNKNOWN":
            return "daa-target"
        default:
            console.log(`[daa-utils] Warning: invalid daa alert level ${daaAlert}`);
    }
    return "daa-target";
}

/**
 * Utility function, returns the alert kind of this aircraft
 */
export function symbol2alertKind (symbol: DaaSymbol): AlertKind {
    switch (symbol) {
        case "daa-alert": { return AlertKind.ALERT; }
        case "daa-traffic-avoid": { return AlertKind.AVOID; }
        case "daa-traffic-monitor": { return AlertKind.MONITOR; }
        case "daa-target": { return AlertKind.NONE; }
        default: { return AlertKind.UNKNOWN; }
    }
}

/**
 * Utility function, returns the alert kind of this aircraft
 */
export function symbol2alertRegion (symbol: DaaSymbol): AlertRegion {
    switch (symbol) {
        case "daa-alert": { return "NEAR"; }
        case "daa-traffic-avoid": { return "MID"; }
        case "daa-traffic-monitor": { return "FAR"; }
        case "daa-target": { return "NONE"; }
        default: { return "UNKNOWN"; }
    }
}

/**
 * Utility function, converts an alert region into a numeric value that can be used to identify the symbol and color to be used
 */
export function severity (alertRegion: AlertRegion): number {
	switch (alertRegion) {
		case "NONE": return 0;
		case "FAR": return 1;
		case "MID": return 2;

		case "NEAR": 
		case "RECOVERY": return 3;

		case "UNKNOWN": 
		default: return -1;
	}
}

/**
 * Utility functions for computing the distance between two points given as latlot
 * The returned result is in NMI
 * See also haversine formula at https://www.movable-type.co.uk/scripts/latlong.html
 */
 export function computeNmiDistance (pos1: LatLon<number>, pos2: LatLon<number>): number {
    const EARTH_RADIUS: number = 3443.92; //nmi
    const lat1: number = deg2rad(pos1.lat);
    const lon1: number = deg2rad(pos1.lon);
    const lat2: number = deg2rad(pos2.lat);
    const lon2: number = deg2rad(pos2.lon);
    const dLat: number = lat1 - lat2;
    const dLon: number = lon1 - lon2;
    const a: number = Math.asin(
        (Math.sin(dLat / 2) * Math.sin(dLat / 2)) 
            + Math.cos(lat1) * Math.cos(lat2) * (Math.sin(dLon/2) * Math.sin(dLon/2))
    );
    const c: number = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d: number = EARTH_RADIUS * c; // distance in NMI
    return d;
}
/**
 * Computes the angle between two points given in latllot
 * The result is in degrees
 */
export function computeBearing (pos1: LatLon<number>, pos2: LatLon<number>): number {
    const lat1: number = deg2rad(pos1.lat);
    const lon1: number = deg2rad(pos1.lon);
    const lat2: number = deg2rad(pos2.lat);
    const lon2: number = deg2rad(pos2.lon);
    const dLon: number = lon2 - lon1;
    const y: number = Math.sin(dLon) * Math.cos(lat2);
    const x: number = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const phi: number = rad2deg(Math.atan2(y, x));
    const bearing: number = (phi + 360) % 360;
    return bearing;
}

// interface definitions
export interface WayPoint { lla: LatLonAlt<number>, label?: string }
export type FlightPlan = WayPoint[]
export type FlightTrace = WayPoint[];
export interface FromTo { from: number, to: number, units: string }
export interface Val { val: number, units: string }
export interface Bands {
    NONE?: FromTo[],
    FAR?: FromTo[],
    MID?: FromTo[],
    NEAR?: FromTo[],
    RECOVERY?: FromTo[],
    UNKNOWN?: FromTo[]
}
export function bandElement2Bands (be: BandElement): Bands {
    if (be && be.bands) {
        const ans: Bands = {};
        for (let i = 0; i < be.bands.length; i++) {
            const band: DaidalusBand = be.bands[i];
            const region: Region = band.region;
            const range: FromTo = { from: band.range[0], to: band.range[1], units: band.units };
            ans[region] = ans[region] || [];
            ans[region].push(range);
        }
        return ans;
    }
    return {};
}
export interface Coords {
    top?: number, left?: number, width?: number, height?: number
}

export const BAND_NAMES: string[] = [
    "Altitude Bands", "Heading Bands", "Horizontal Speed Bands", "Vertical Speed Bands", 
    "Altitude Resolution", "Horizontal Direction Resolution", "Horizontal Speed Resolution", "Vertical Speed Resolution"
];


// TODO: replace DAABandsData with DaidalusBandsDescriptor

// export interface DAABandsData {
//     Wind: WindElement, // FROM
//     Ownship: MetricsElement[],
//     Alerts: Alert[],
//     "Altitude Bands": Bands, // FIXME: use BandElement and get rid of Bands
//     "Heading Bands": Bands,
//     "Horizontal Speed Bands": Bands,
//     "Vertical Speed Bands": Bands,
//     "Altitude Resolution": ResolutionElement,
//     "Horizontal Direction Resolution": ResolutionElement,
//     "Horizontal Speed Resolution": ResolutionElement,
//     "Vertical Speed Resolution": ResolutionElement,
//     Contours: GeofenceElement,
//     "Hazard Zones": GeofenceElement,
//     Monitors: MonitorElement[],
//     Metrics: MetricsElement
// };

// y axis identifies the direction of the aircraft
export function v2rad(v3: Vector3D<number>): number {
    // the returned angle is in rads
    if (v3.y === 0 && v3.x === 0) {
        return 0; // atan2 is undefined if y and x are both zero
    }
    return Math.atan2(v3.y, v3.x);
}
// y axis identifies the direction of the aircraft
export function yaw(v3: Vector3D<number>): number {
    // this is the compass
    return rad2deg(Math.atan2(v3.y, v3.x)) - 90; // the rotation on 90 degs is necessary because the aircraft moves over the x axis to go ahead, but in the canvas this corresponds to the x axis
}
// y axis identifies the direction of the aircraft
export function pitch(v3: Vector3D<number>): number {
    return rad2deg(Math.atan2(v3.z, v3.y));
}
// y axis identifies the direction of the aircraft
export function roll(v3: Vector3D<number>): number {
    return rad2deg(Math.atan2(v3.z, v3.x));
}
export function fixed3(val: number): string {
    return (val < 10) ? "00" + val
            : (val < 100) ? "0" + val : val.toString();
}
export function fixed2(val: number): string {
    return (val < 10) ? "0" + val : val.toString();
}
export function modulo(v: Vector3D<number>): number {
    v = v || { x: 0, y: 0, z: 0 };
    v.x = v.x || 0;
    v.y = v.y || 0;
    v.z = v.z || 0;
    return Math.sqrt((v.x * v.x) + (v.y * v.y) + (v.z * v.z));
}
export function limit(min: number, max: number, name?: string): (val: number) => number {
    return (val) => {
        if (val < min) {
            if (name) { console.error("Warning: " + name + " is " + val + ", exceeds range [" + min + "," + max + "]"); }
            return min;
        } else if (val > max) {
            if (name) { console.error("Warning: " + name + " is " + val + ", exceeds range [" + min + "," + max + "]"); }
            return max;
        }
        return val;
    };
}

export function createDiv(id: string, opt?: { 
    zIndex?: number, 
    top?: number, 
    left?: number,
    width?: number,
    height?: number,
    parent?: string, 
    class?: string
}): HTMLElement {
    opt = opt || {};
    opt.zIndex = opt.zIndex || 0;
    const div: JQuery<HTMLElement> = $('<div></div>');//document.createElement("div");
    $(div).css("position", "absolute").attr("id", id).css("z-index", opt.zIndex);
    if (opt.class) { $(div).addClass(opt.class); }
    if (opt.top !== undefined && opt.top !== null) { $(div).css("top", opt.top + "px"); }
    if (opt.left !== undefined && opt.left !== null) { $(div).css("left", opt.left + "px"); }
    $(div).css("height", (opt.height) ? opt.height + "px" : "0px");
    $(div).css("width", (opt.width) ? opt.width + "px" : "0px");
    const parentDIV: JQuery<HTMLElement> = $(jquerySelector(opt.parent));
    $(parentDIV).append(div);
    return $(div)[0];
}

export const baseUrl: string = "daa-displays/"; // important, baseUrl should always end with '/'

export const zIndex = {
    base: 0,
    interactive: 10
};

/**
 * Utility function, returns a valid jquery selector
 */
export function jquerySelector (name: string): string {
    return name === undefined || name === null || name === "" ? "body"
        : name.startsWith(".") || name.startsWith("#") ? name : `#${name}`;
}

/**
 * Utility function, downgrades alerts to a given level
 */
export function downgrade_alerts (desc: { to: AlertRegion, alerts: Alert[] }): void {
    if (desc?.to && desc?.alerts?.length) {
        for (let i = 0; i < desc.alerts.length; i++) {
            if (severity(desc.alerts[i].alert_region) > severity(desc.to)) {
                desc.alerts[i].alert_region = desc.to;
            }
        }
    }
}
/**
 * Utility function, inhibits bands guidance
 */
export function inhibit_bands (desc: { bands: DaaBands }): void {
    return conceal_bands(desc);
}
export function conceal_bands (desc: { bands: DaaBands }): void {
    const band_names: string[] = [
        "Heading Bands", "Horizontal Speed Bands", "Vertical Speed Bands", "Altitude Bands"
    ];
    for (let i = 0; i < band_names.length; i++) {
        if (desc?.bands?.[band_names[i]]?.bands) {
            desc.bands[band_names[i]].bands = [];
        }
    }
}
/**
 * Utility function, inhibits resolution guidance
 */
export function inhibit_resolutions (desc: { bands: DaaBands }): void {
    return conceal_resolutions(desc);
}
export function conceal_resolutions (desc: { bands: DaaBands }): void {
    const resolution_names: string[] = [
        "Horizontal Direction Resolution",
        "Horizontal Speed Resolution",
        "Vertical Speed Resolution",
        "Altitude Resolution"
    ];
    const resolution_fields: string[] = [
        "flags", "recovery", "preferred_resolution", "other_resolution"
    ];
    for (let i = 0; i < resolution_names.length; i++) {
        for (let j = 0; j < resolution_fields.length; j++) {
            if (desc?.bands?.[resolution_names[i]]?.[resolution_fields[j]]) {
                desc.bands[resolution_names[i]][resolution_fields[j]] = [];
            }
        }
    }
}
