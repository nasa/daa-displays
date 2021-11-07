import { BandElement, Region, DaidalusBand } from "./utils/daa-server";

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
	const r: string = (elems.length > 2) ? elems.substr(0, 2) : "00";
	const g: string = (elems.length > 4) ? elems.substr(2, 2) : "00";
    const b: string = (elems.length > 6) ? elems.substr(4, 2) : "00";
    return opt?.normalize ? { r: parseInt(r, 16) / 255.0, g: parseInt(g, 16) / 255.0, b: parseInt(b) / 255.0 }
        : { r: parseInt(r, 16), g: parseInt(g, 16), b: parseInt(b, 16) };
}
export const bugColors = {
    NONE: "#cccccc", // white
    FAR: "#ffc107", // DASHED YELLOW
    MID: "#ffc107", //"#ffbf00",
    NEAR: "red",
    RECOVERY: "#00f500", // DASHED green #07dc0a
    UNKNOWN: "gray"
    ,
    "0": "#cccccc",  // NONE
    "1": "#ffc107",// FAR
    "2": "#ffc107",// MID
    "3": "red",    // NEAR
    "4": "#00f500",// RECOVERY
    "-1": "gray"   // UNKNOWN
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


// units conversion functions
export function msec2knots(msec: number): number {
    return msec * 1.94384;
};
export function knots2msec(knots: number): number {
    return knots / 1.94384;
};
export function rad2deg(rad: number): number {
    return rad * 180 / Math.PI;
};
export function deg2rad(deg: number): number {
    return deg * Math.PI / 180;
};
export function meters2feet(m: number): number {
    return m * 3.28084;
};
export function feet2meters(ft: number): number {
    return ft / 3.28084;
};

// interface definitions
export interface WayPoint { lla: LatLonAlt, label?: string };
export type FlightPlan = WayPoint[]
export interface Vector3D { x: number, y: number, z: number };
export interface FromTo { from: number, to: number, units: string };
export interface Val { val: number, units: string };
export interface LatLonAlt { lat: number, lon: number, alt: number };
export interface LatLon { lat: number, lon: number };
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
export function v2rad(v3: Vector3D): number {
    // the returned angle is in rads
    if (v3.y === 0 && v3.x === 0) {
        return 0; // atan2 is undefined if y and x are both zero
    }
    return Math.atan2(v3.y, v3.x);
};
// y axis identifies the direction of the aircraft
export function yaw(v3: Vector3D): number {
    // this is the compass
    return rad2deg(Math.atan2(v3.y, v3.x)) - 90; // the rotation on 90 degs is necessary because the aircraft moves over the x axis to go ahead, but in the canvas this corresponds to the x axis
};
// y axis identifies the direction of the aircraft
export function pitch(v3: Vector3D): number {
    return rad2deg(Math.atan2(v3.z, v3.y));
};
// y axis identifies the direction of the aircraft
export function roll(v3: Vector3D): number {
    return rad2deg(Math.atan2(v3.z, v3.x));
};
export function fixed3(val: number): string {
    return (val < 10) ? "00" + val
            : (val < 100) ? "0" + val : val.toString();
};
export function fixed2(val: number): string {
    return (val < 10) ? "0" + val : val.toString();
};
export function modulo(v: Vector3D): number {
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

export function createDiv(id: string, opt?: { zIndex?: number, top?: number, left?: number, parent?: string, class?: string }): HTMLElement {
    opt = opt || {};
    opt.zIndex = opt.zIndex || 0;
    const div: JQuery<HTMLElement> = $('<div></div>');//document.createElement("div");
    $(div).css("position", "absolute").css("height", "0px").css("width", "0px").attr("id", id).css("z-index", opt.zIndex);
    if (opt.class) { $(div).addClass(opt.class); }
    if (opt.top) { $(div).css("top", opt.top + "px"); }
    if (opt.left) { $(div).css("left", opt.left + "px"); }
    const parentDIV: JQuery<HTMLElement> = (opt.parent && $(`#${opt.parent}`).length) ? $(`#${opt.parent}`) : $('BODY');
    $(parentDIV).append(div);
    return $(div)[0];
};

export const baseUrl: string = "daa-displays/"; // important, baseUrl should always end with '/'

export const zIndex = {
    base: 0,
    interactive: 10
};