import { deg2rad, rad2deg } from "./utils/daa-math";
import { BandElement, Region, DaidalusBand, AlertLevel, AlertKind, LatLonAlt, LatLon, Vector3D } from "./utils/daa-types";
import * as server from './utils/daa-types';

// useful aliases
export type DaaSymbol = server.DaaSymbol;

export const color = {
    RECOVERY: "#00f500", // DASHED green
    FAR: "#ffc107", // DASHED YELLOW
    MID: "#ffc107", // yellow "#ffbf00",
    NEAR: "red",
    UNKNOWN: "gray",
    NONE: "transparent"
};
export const bandColors = {
    RECOVERY: { style: "dash", color: "#00f500" }, // DASH green
    FAR: { style: "dash", color: "#ffc107" }, // DASH YELLOW
    MID: { style: "solid", color: "#ffc107" }, // YELLOW
    NEAR: { style: "solid", color: "red" }, // red
    UNKNOWN: { style: "solid", color: "gray" }, // gray
    NONE: { style: "solid", color: "transparent" }
};
export const bandColorsDanti = {
    RECOVERY: { style: "dash", color: "#00f500" }, // DASH green
    FAR: { style: "dash", color: "transparent" }, // DASH YELLOW
    MID: { style: "solid", color: "transparent" }, // YELLOW
    NEAR: { style: "solid", color: "#ffbf00" }, // amber
    UNKNOWN: { style: "solid", color: "gray" }, // gray
    NONE: { style: "solid", color: "transparent" }
};
export interface RGBColor { r: number, g: number, b: number };
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
    UNKNOWN: "gainsboro"
    ,
    "0": "#cccccc",  // NONE
    "1": "#ffc107",// FAR
    "2": "#ffc107",// MID
    "3": "red",    // NEAR
    "4": "#00f500",// RECOVERY
    "-1": "gainsboro"   // UNKNOWN
};
export const alertingColors = {
    NONE: { color: "transparent" },
    MONITOR: { color: "#cccccc" }, // white
    AVOID: { color: "#ffc107" }, // yellow
    ALERT: { color: "red" },
    "0": { color: "transparent" },
    "1": { color: "#cccccc" }, // white
    "2": { color: "#ffc107" }, // yellow
    "3": { color: "red" }
};


// daa constant
export const daaSymbols: DaaSymbol[] = [ "daa-target", "daa-traffic-monitor", "daa-traffic-avoid", "daa-alert" ]; // 0..3

/**
 * Utility function, converts an alert level to a symbol name
 */
export function alertLevel2symbol (daaAlert: AlertLevel): DaaSymbol {
    switch (daaAlert) {
        case AlertLevel.MONITOR: // 1
            return "daa-traffic-monitor";
        case AlertLevel.AVOID: // 2
            return "daa-traffic-avoid";
        case AlertLevel.ALERT: // 3
            return "daa-alert";
        case AlertLevel.NONE:
        case AlertLevel.UNKNOWN:
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
export interface WayPoint { lla: LatLonAlt<number>, label?: string };
export type FlightPlan = WayPoint[]
export type FlightTrace = WayPoint[];
export interface FromTo { from: number, to: number, units: string };
export interface Val { val: number, units: string };
export interface Bands {
    NONE?: FromTo[],
    FAR?: FromTo[],
    MID?: FromTo[],
    NEAR?: FromTo[],
    RECOVERY?: FromTo[],
    UNKNOWN?: FromTo[]
};
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
};

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
};
// y axis identifies the direction of the aircraft
export function yaw(v3: Vector3D<number>): number {
    // this is the compass
    return rad2deg(Math.atan2(v3.y, v3.x)) - 90; // the rotation on 90 degs is necessary because the aircraft moves over the x axis to go ahead, but in the canvas this corresponds to the x axis
};
// y axis identifies the direction of the aircraft
export function pitch(v3: Vector3D<number>): number {
    return rad2deg(Math.atan2(v3.z, v3.y));
};
// y axis identifies the direction of the aircraft
export function roll(v3: Vector3D<number>): number {
    return rad2deg(Math.atan2(v3.z, v3.x));
};
export function fixed3(val: number): string {
    return (val < 10) ? "00" + val
            : (val < 100) ? "0" + val : val.toString();
};
export function fixed2(val: number): string {
    return (val < 10) ? "0" + val : val.toString();
};
export function modulo(v: Vector3D<number>): number {
    v = v || { x: 0, y: 0, z: 0 };
    v.x = v.x || 0;
    v.y = v.y || 0;
    v.z = v.z || 0;
    return Math.sqrt((v.x * v.x) + (v.y * v.y) + (v.z * v.z));
};
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
};

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
};

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