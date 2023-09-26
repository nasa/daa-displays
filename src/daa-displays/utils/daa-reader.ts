/**
 * ## Notices
 * Copyright 2019 United States Government as represented by the Administrator 
 * of the National Aeronautics and Space Administration. All Rights Reserved.
 * 
 * ## Disclaimers
 * No Warranty: THE SUBJECT SOFTWARE IS PROVIDED "AS IS" WITHOUT ANY WARRANTY OF ANY KIND, 
 * EITHER EXPRESSED, IMPLIED, OR STATUTORY, INCLUDING, BUT NOT LIMITED TO, ANY WARRANTY 
 * THAT THE SUBJECT SOFTWARE WILL CONFORM TO SPECIFICATIONS, ANY IMPLIED WARRANTIES OF 
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR FREEDOM FROM INFRINGEMENT, 
 * ANY WARRANTY THAT THE SUBJECT SOFTWARE WILL BE ERROR FREE, OR ANY WARRANTY THAT 
 * DOCUMENTATION, IF PROVIDED, WILL CONFORM TO THE SUBJECT SOFTWARE. THIS AGREEMENT DOES NOT, 
 * IN ANY MANNER, CONSTITUTE AN ENDORSEMENT BY GOVERNMENT AGENCY OR ANY PRIOR RECIPIENT 
 * OF ANY RESULTS, RESULTING DESIGNS, HARDWARE, SOFTWARE PRODUCTS OR ANY OTHER APPLICATIONS 
 * RESULTING FROM USE OF THE SUBJECT SOFTWARE.  FURTHER, GOVERNMENT AGENCY DISCLAIMS 
 * ALL WARRANTIES AND LIABILITIES REGARDING THIRD-PARTY SOFTWARE, IF PRESENT IN THE 
 * ORIGINAL SOFTWARE, AND DISTRIBUTES IT "AS IS."
 * 
 * Waiver and Indemnity:  RECIPIENT AGREES TO WAIVE ANY AND ALL CLAIMS AGAINST THE 
 * UNITED STATES GOVERNMENT, ITS CONTRACTORS AND SUBCONTRACTORS, AS WELL AS ANY PRIOR 
 * RECIPIENT.  IF RECIPIENT'S USE OF THE SUBJECT SOFTWARE RESULTS IN ANY LIABILITIES, 
 * DEMANDS, DAMAGES, EXPENSES OR LOSSES ARISING FROM SUCH USE, INCLUDING ANY DAMAGES 
 * FROM PRODUCTS BASED ON, OR RESULTING FROM, RECIPIENT'S USE OF THE SUBJECT SOFTWARE, 
 * RECIPIENT SHALL INDEMNIFY AND HOLD HARMLESS THE UNITED STATES GOVERNMENT, 
 * ITS CONTRACTORS AND SUBCONTRACTORS, AS WELL AS ANY PRIOR RECIPIENT, TO THE EXTENT 
 * PERMITTED BY LAW.  RECIPIENT'S SOLE REMEDY FOR ANY SUCH MATTER SHALL BE THE IMMEDIATE, 
 * UNILATERAL TERMINATION OF THIS AGREEMENT.
 */

import { deg2rad, knots2msec, rad2deg } from "./daa-math";
import * as fsUtils from './fsUtils';

// daa header values
export const time_header: string[] = [ "time", "tm", "clock", "st" ];
export const trk_header: string[] = [ "trk", "track", "vx" ];
export const name_header: string[] = [ "name", "aircraft", "id" ];
export const lat_header: string[] = [ "lat", "latitude", "sx" ];
export const lon_header: string[] = [ "lon", "long", "longitude", "sy" ];
export const alt_header: string[] = [ "alt", "altitude", "sz" ];
export const gs_header: string[] = [ "gs", "vy", "groundspeed", "groundspd" ];
export const vs_header: string[] = [ "vs", "vz", "verticalspeed", "hdot" ];

// useful constants
export const g: number = 9.81; // gravity acceleration (m/s^2)

// default number of decimals for roll values
export const DEFAULT_ROLL_PRECISION: number = 2;

/**
 * Utility function, splits the colums of a given line of the daa file
 */
export function splitCols (str: string): string[] {
    return str?.replace(/,/g, " ")?.split(/\s+/)?.map((elem: string) => {
        return elem?.trim();
    }) || [];
}
/**
 * Utility function, find the index of a given column name
 * Returns -1 if the column name is not found in the heading
 */
export function findColFromName (col: string | string[], header: string): number {
    // console.log(`[findColFromName]`, { col, header });
    if (col && header) {
        const needle: string[] = typeof col === "string" ? [ col ] : col;
        const hds: string[] = splitCols(header);
        // console.log(`[findColFromName]`, { hds: hds.length, needle: needle.length });
        for (let i = 0; i < hds.length; i++) {
            for (let j = 0; j < needle.length; j++) {
                const hds_i: string = hds[i]?.trim()?.toLowerCase();
                const needle_j: string = needle[j]?.trim()?.toLowerCase();
                if (hds_i && needle_j) {
                    // console.log(`[findColFromName]`, { hds_i, needle_j });
                    if (hds_i === needle_j) {
                        // console.log(`[findColFromName] Col ${col} is number ${i}`);
                        return i;
                    }
                }
            }
        }
    }
    // console.log(`[findColFromName] Col not found`);
    return -1;
}
/**
 * Utility function, returns the value saved in the daa line at a given column index
 */
export function getCol (idx: number, line: string): string {
    if (idx >= 0 && line?.trim()) {
        const vals: string[] = splitCols(line);
        if (idx < vals.length) {
            return vals[idx]?.trim();
        }
    }
    return "";
}

/**
 * Structure representing the lines of a daa file
 */
export interface DaaLines {
    labels: string,
    units: string,
    content: string[]
}

/**
 * Structure representing an aircraft
 */
export interface DaaAircraft {
    name: string, // aircraft name
    time: number | string, // current simulation time [s]
    lat: number | string, // latitude [deg]
    lon: number | string, // longitude [deg]
    alt: number | string, // altitude [ft]
    trk: number | string, // heading [deg]
    gs: number | string, // airspeed [knot]
    vs: number | string, // vertical speed [fpm]
    roll: number | string, // roll (bank angle) [deg]
    "animation-frame"?: boolean, // whether this is an animation frame introduced for smoother rendering, can be used in the case these frames needs to be handled differently from the others
    dbg?: string // optional field, used for debugging purposes
}
/**
 * Structure representing traffic aircraft
 */
export type DaaTraffic = DaaAircraft[];
/**
 * default labels and units of a .daa file
 */
export const DEFAULT_LABELS: string = "NAME     lat          lon           alt          trk         gs           vs        time";
export const DEFAULT_UNITS: string = "[none]   [deg]        [deg]         [ft]         [deg]       [knot]       [fpm]      [s]";

/**
 * Structure representing the content of a daa file
 */
export interface DaaFileContent {
    ownship: DaaAircraft[], // one DaaAircraft element for each time instant
    traffic: DaaTraffic[], // one DaaTraffic[] array for each time instant
    steps: number, // number of scenario steps
    stepSize: number, // step size, in seconds
    daa: DaaLines
}
/**
 * Utility function, computes the roll (bank angle) [deg] based on the given turn rate [deg/sec] and ground speed [knot]
 */
export function bankAngle (turn_rate: number | string, speed: number | string, opt?: { precision?: number }): number {
    // bank_angle = atan(turn_rate * speed / g) 
    const precision: number = opt?.precision !== undefined ? opt.precision : DEFAULT_ROLL_PRECISION;
    const roll: number = +rad2deg(Math.atan(deg2rad(+turn_rate) * knots2msec(+speed) / g)).toFixed(precision);
    return roll;
}
/**
 * Utility function, computes the delta of a given daa column (turn, time, etc) for a given simulation step
 */
export function delta (col: number, daa_lines: string[], step: number): number {
    if (step >= 0 && daa_lines?.length) {
        if (step < daa_lines.length - 1) {
            // compute delta
            const previousHeading: number = +getCol(col, daa_lines[step]);
            const deg: number = +getCol(col, daa_lines[step + 1]);
            return deltaHeading(deg, previousHeading);
        } else if (step > 0 && step === daa_lines.length - 1) {
            // final simulation step, keep delta from the previous step 
            return +getCol(col, daa_lines[step]) - +getCol(col, daa_lines[step - 1])
        }
    }
    return 0;
}
/**
 * Utility function, computes the delta heading, takes into account zero-crossing
 * (e.g., deg = 0, prev = 358 --> delta = +2)
 * (e.g., deg = 350, prev = 0 --> delta = -10)
 * we use the same logic of daa-compass (see function setValue in daa-displays/daa-compass.ts)
 */
export function deltaHeading (deg: number, previousAngle: number): number {
    // compute delta
    const c_rotation: number = Math.abs((((+deg - previousAngle) % 360) + 360) % 360); // counter-clockwise rotation
    const cC_rotation: number = Math.abs((c_rotation - 360) % 360); // clockwise rotation
    const delta: number = (c_rotation < cC_rotation) ? c_rotation : -cC_rotation;
    return delta;
}
/**
 * Utility function, animates a given aircraft simulation series by splitting the base interval into n sub-intervals
 * airspeed and vspeed are kept constant in the sub-intervals
 * position, heading and bank angle are interpolated linearly
 */
export function animateAircraft (ac_series: DaaAircraft[], n: number): DaaAircraft[] {
    const extra_steps: number = parseInt(`${n}`); // make sure n is an integer
    if (ac_series?.length && extra_steps > 0) {
        extra_steps;
        // add intermediate steps for the aircraft
        const animated_series: DaaAircraft[] = [ ac_series[0] ];
        for (let i = 1; i < ac_series.length; i++) {
            const lat_inc: number = (+ac_series[i].lat - +ac_series[i - 1].lat) / extra_steps;
            const lon_inc: number = (+ac_series[i].lon - +ac_series[i - 1].lon) / extra_steps;
            const alt_inc: number = (+ac_series[i].alt - +ac_series[i - 1].alt) / extra_steps;
            const trk_inc: number = deltaHeading(+ac_series[i].trk, +ac_series[i - 1].trk) / extra_steps;
            const roll_inc: number = ac_series[i].roll ? (+ac_series[i].roll - +ac_series[i - 1].roll) / extra_steps : 0;
            const time_inc: number = (+ac_series[i].time - +ac_series[i - 1].time) / extra_steps;
            // airspeed and vspeed are kept constant
            for (let k = 1; k < extra_steps; k++) {
                const ac: DaaAircraft = {
                    ...ac_series[i - 1],
                    lat: `${+ac_series[i - 1].lat + k * lat_inc}`,
                    lon: `${+ac_series[i - 1].lon + k * lon_inc}`,
                    alt: `${+ac_series[i - 1].alt + k * alt_inc}`,
                    trk: `${+ac_series[i - 1].trk + k * trk_inc}`,
                    roll: ac_series[i - 1].roll ? (+ac_series[i - 1].roll + k * roll_inc).toFixed(DEFAULT_ROLL_PRECISION) : "0",
                    time: `${+ac_series[i - 1].time + k * time_inc}`,
                    "animation-frame": true,
                    dbg: `extra-${k}`
                };
                animated_series.push(ac);
            }
            animated_series.push(ac_series[i]);
        }
        return animated_series;
    }
    return ac_series;
}
/**
 * Utility function, animates a given traffic array simulation series by adding n intermediate simulation steps using a linear interpolator
 */
export function animateTraffic (trf_series: DaaTraffic[], n: number): DaaTraffic[] {
    const extra_steps: number = parseInt(`${n}`); // make sure n is an integer
    if (trf_series?.length && extra_steps > 0) {
        // add intermediate steps for each aircraft
        const animated_series: DaaTraffic[] = [ trf_series[0] ];
        // for each step
        for (let i = 1; i < trf_series.length; i++) {
            const trf_line_0: DaaTraffic = trf_series[i - 1];
            const trf_line_1: DaaTraffic = trf_series[i];
            // introduce extra simulation steps
            for (let k = 1; k < extra_steps; k++) {
                const animated_traffic: DaaTraffic = [];
                // for each traffic line
                for (let ac = 0; ac < trf_line_0.length; ac++) {
                    const lat_inc: number = (+trf_line_1[ac].lat - +trf_line_0[ac].lat) / extra_steps;
                    const lon_inc: number = (+trf_line_1[ac].lon - +trf_line_0[ac].lon) / extra_steps;
                    const alt_inc: number = (+trf_line_1[ac].alt - +trf_line_0[ac].alt) / extra_steps;
                    const trk_inc: number = deltaHeading(+trf_line_1[ac].trk, +trf_line_0[ac].trk) / extra_steps;
                    const roll_inc: number = trf_line_1[ac].roll ? (+trf_line_1[ac].roll - +trf_line_0[ac].roll) / extra_steps : 0;
                    const time_inc: number = (+trf_line_1[ac].time - +trf_line_0[ac].time) / extra_steps;
                    // airspeed and vspeed are kept constant
                    const animated_ac: DaaAircraft = {
                        ...trf_line_0[ac],
                        lat: `${+trf_line_0[ac].lat + k * lat_inc}`,
                        lon: `${+trf_line_0[ac].lon + k * lon_inc}`,
                        alt: `${+trf_line_0[ac].alt + k * alt_inc}`,
                        trk: `${+trf_line_0[ac].trk + k * trk_inc}`,
                        roll: trf_line_0[ac].roll ? (+trf_line_0[ac].roll + k * roll_inc).toFixed(DEFAULT_ROLL_PRECISION) : "0",
                        time: `${+trf_line_0[ac].time + k * time_inc}`,
                        "animation-frame": true,
                        dbg: `extra-${k}`
                    };
                    animated_traffic.push(animated_ac);
                }
                animated_series.push(animated_traffic);
            }
            // add the next simulation step from the original simulation
            animated_series.push(trf_series[i]);
        }
        return animated_series;
    }
    return trf_series;
}
/**
 * Utility function, computes the daa lines from given ownship and traffic data
 */
export function animateScenario (data: DaaFileContent, n: number): DaaFileContent {
    if (data?.steps > 1 && n > 0) {
        const ownship: DaaAircraft[] = animateAircraft(data.ownship, n);
        const traffic: DaaTraffic[] = animateTraffic(data.traffic, n);
        const daa: DaaLines = computeDaaLines(ownship, traffic);
        const animated_series: DaaFileContent = {
            steps: ownship?.length,
            stepSize: data.stepSize / n,
            ownship,
            traffic,
            daa
        };
        return animated_series;
    }
    return data;
}
/**
 * Utility function, animates a DaaFileContent by adding n intermediate simulation steps using a linear interpolator
 */
export function computeDaaLines (ownship: DaaAircraft[], traffic: DaaTraffic[]): DaaLines {
    const labels: string[] = [ "name", "lat", "lon", "alt", "trk", "gs", "vs", "time" ];
    const units: string[] = [ "[none]", "[deg]", "[deg]", "[ft]", "[deg]", "[knot]", "[fpm]", "[s]" ];
    const lines: DaaLines = { labels: labels.join(", "), units: units.join(", "), content: [] };
    const getLine = (ac: DaaAircraft): string => {
        if (ac?.name) {
            let line: string = ac.name;
            for (let c = 1; c < labels.length; c++) {
                line += `, ${ac[labels[c]]}`;
            }
            return line;
        }
        return "";
    }
    for (let i = 0; i < ownship?.length; i++) {
        lines.content.push(getLine(ownship[i]));
        const traffic_line: DaaTraffic = traffic[i];
        for (let t = 0; t < traffic_line.length; t++) {
            lines.content.push(getLine(traffic_line[t]));
        }
    }
    return lines;
}
/**
 * Utility function, converts .daa file content into a DaaFileContent
 */
export function readDaaFileContent (fileContent: string, opt?: { computeRoll?: boolean, maxLines?: number, tailNumbersOnly?: boolean }): DaaFileContent | null {
    const lines: string[] = fileContent?.replace(/\bunitless\b/g, "[none]").trim()?.split("\n")?.map((line: string) => {
        return line.trim();
    });
    if (lines?.length > 2) {
        console.log(`[daa-reader] Reading .daa file`, { lines: lines.length });
        const computeRoll: boolean = !!opt?.computeRoll;

        // the first two lines are labels and units
        const labels: string = lines[0];
        const units: string = lines[1];
        const content: string[] = opt?.maxLines && opt.maxLines > 2 ? lines.slice(2, opt.maxLines) : lines.slice(2);

        // find the aircraft names
        console.log(`[daa-reader] Finding aircraft names...`, { name_header, labels, units });
        const colNum: number = findColFromName(name_header, labels);
        console.log(`[daa-reader] Heading is on col ${colNum}`);
        if (colNum >= 0) {
            // by convention, the first aircraft in the list is the ownship
            const ownshipName: string = getCol(colNum, lines[2]);
            if (ownshipName) {
                const traffic: string[] = [];
                // find all the aircraft names
                for (let i = 3; i < lines.length; i++) {
                    const acName: string = getCol(colNum, lines[i]);
                    if (acName !== ownshipName && !traffic.includes(acName)) {
                        traffic.push(acName);
                    }
                }
                // console.log(`[stream-scenario2xplane] aircraft names:`, { ownshipName, traffic });
                // ownship data, in the form of an array of daa lines
                const ownship_lines: string[] = lines.filter((line: string) => {
                    return line.toLocaleLowerCase().includes(ownshipName.toLocaleLowerCase());
                }) || [];
                // traffic data, in the form of an array of daa lines
                const traffic_lines: string[][] = [];
                for (let i = 0; i < traffic.length; i++) {
                    const ac_lines: string[] = lines.filter((line: string) => {
                        return line.toLocaleLowerCase().includes(traffic[i].toLocaleLowerCase());
                    }) || [];
                    traffic_lines.push(ac_lines);
                }
                if (opt?.tailNumbersOnly) {
                    const ownship_daa: DaaAircraft = {
                        name: ownshipName, 
                        lat: NaN, 
                        lon: NaN, 
                        alt: NaN, 
                        trk: NaN, 
                        gs: NaN,
                        vs: NaN,
                        roll: NaN,
                        time: NaN
                    };
                    const traffic_daa: DaaAircraft[] = [];
                    for (let i = 0; i < traffic.length; i++) {
                        traffic_daa.push({
                            name: traffic[i], 
                            lat: NaN, 
                            lon: NaN, 
                            alt: NaN, 
                            trk: NaN, 
                            gs: NaN,
                            vs: NaN,
                            roll: NaN,
                            time: NaN
                        });
                    }
                    return {
                        steps: ownship_lines.length,
                        stepSize: NaN, 
                        ownship: [ ownship_daa ], 
                        traffic: [ traffic_daa ],
                        daa: {
                            labels,
                            units,
                            content
                        }
                    };
                }

                // find other columns indexes in the daa file
                const latCol: number = findColFromName(lat_header, labels);
                const lonCol: number = findColFromName(lon_header, labels);
                const altCol: number = findColFromName(alt_header, labels);
                const trkCol: number = findColFromName(trk_header, labels);
                const gsCol: number = findColFromName(gs_header, labels);
                const vsCol: number = findColFromName(vs_header, labels);
                const timeCol: number = findColFromName(time_header, labels);
                console.log(`[daa-reader] scenario length: ${ownship_lines?.length}`);
                // get units
                const lat_units: string = getCol(latCol, units);
                const lon_units: string = getCol(lonCol, units);
                const alt_units: string = getCol(altCol, units);
                const heading_units: string = getCol(trkCol, units);
                const gs_units: string = getCol(gsCol, units);
                const vs_units: string = getCol(vsCol, units);
                const time_units: string = getCol(timeCol, units);
                const ms: boolean = time_units === "[ms]"; // whether time is in millis

                // sanity check, later on we can introduce conversions if we need to relax these constraints on the units
                if (lat_units !== "[deg]" || lon_units !== "[deg]") {
                    console.log(`[daa-reader] Warning: unsupported latlot units ${lat_units} ${lon_units} (latlon must be [deg]) -- please extend the implementation of daa-reader if different units are necessary`);
                    return null;
                }
                if (alt_units !== "[ft]") {
                    console.log(`[daa-reader] Warning: unsupported altitude units ${alt_units} (alt must be [ft]) -- please extend the implementation of daa-reader if different units are necessary`);
                    return null;
                }
                if (heading_units !== "[deg]") {
                    console.log(`[daa-reader] Warning: unsupported heading units ${heading_units} (heading must be [deg]) -- please extend the implementation of daa-reader if different units are necessary`);
                    return null;
                }
                if (gs_units !== "[knot]" && gs_units !== "[kn]") {
                    console.log(`[daa-reader] Warning: unsupported ground speed units ${gs_units} (ground speed must be [knot]) -- please extend the implementation of daa-reader if different units are necessary`);
                    return null;
                }
                if (vs_units !== "[fpm]") {
                    console.log(`[daa-reader] Warning: unsupported vertical speed units ${vs_units} (vertical speed must be [fpm]) -- please extend the implementation of daa-reader if different units are necessary`);
                    return null;
                }
                if (time_units !== "[s]" && time_units !== "[ms]") {
                    console.log(`[daa-reader] Warning: unsupported time units ${time_units} (time units must be [s]) -- please extend the implementation of daa-reader if different units are necessary`);
                    return null;
                }
                // we assume constant step size
                const step_size: number = delta(timeCol, ownship_lines, 0); // sec
                // create data structures
                const ownship_daa: DaaAircraft[] = [];
                const traffic_daa: DaaAircraft[][] = [];
                const ac_line: number[] = Array(traffic.length).fill(0); // indexes for traffic lines
                for (let own_line = 0; own_line < ownship_lines.length; own_line++) {
                    // console.log(ownship_lines[own_line]);
                    const name: string =  getCol(colNum, ownship_lines[own_line]);
                    const lat: string = getCol(latCol, ownship_lines[own_line]);
                    const lon: string = getCol(lonCol, ownship_lines[own_line]);
                    const alt: string = getCol(altCol, ownship_lines[own_line]);
                    const heading: string = getCol(trkCol, ownship_lines[own_line]);
                    const gs: string = getCol(gsCol, ownship_lines[own_line]);
                    const vs: string = getCol(vsCol, ownship_lines[own_line]);
                    const time: string = getCol(timeCol, ownship_lines[own_line]);
                    // compute bank angle
                    const turn_rate: number = delta(trkCol, ownship_lines, own_line) / step_size;
                    const roll: string = computeRoll && +gs !== 0 ? `${bankAngle(turn_rate, gs)}` : "0";
                    const ownship: DaaAircraft = { name, lat, lon, alt, trk: heading, gs, vs, roll, time: ms ? +time/1000 : time };

                    // traffic aircraft
                    const traffic: DaaAircraft[] = [];
                    for (let t = 0; t < traffic_lines.length; t++) {
                        const ln: number = ac_line[t]; // index of the traffic line to be processed
                        if (ln < traffic_lines[t].length) {
                            const ac_name: string =  getCol(colNum, traffic_lines[t][ln]);
                            const ac_time: string = getCol(timeCol, traffic_lines[t][ln]);
                            // console.log({ ac_time, time });
                            if (+ac_time === +time) { // cross-check that this is the right time instant
                                const ac_lat: string = getCol(latCol, traffic_lines[t][ln]);
                                const ac_lon: string = getCol(lonCol, traffic_lines[t][ln]);
                                const ac_alt: string = getCol(altCol,traffic_lines[t][ln]);
                                const ac_heading: string = getCol(trkCol, traffic_lines[t][ln]);
                                const ac_gs: string = getCol(gsCol, traffic_lines[t][ln]);
                                const ac_vs: string = getCol(vsCol, traffic_lines[t][ln]);
                                // compute bank angle
                                const ac_turn_rate: number = delta(trkCol, traffic_lines[t], ln) / step_size;
                                const ac_roll: string = computeRoll && +ac_gs !== 0 ? `${bankAngle(ac_turn_rate, ac_gs)}` : "0";
                                const ac_data: DaaAircraft = {
                                    name: ac_name, 
                                    lat: ac_lat, 
                                    lon: ac_lon, 
                                    alt: ac_alt, 
                                    trk: ac_heading, 
                                    gs: ac_gs,
                                    vs: ac_vs,
                                    roll: ac_roll,
                                    time: `${ms ? +ac_time/1000 : ac_time}`
                                };
                                traffic.push(ac_data);
                                // console.log(traffic_lines[t][ln]);
                                ac_line[t]++;
                            } else {
                                console.log(`[daa-reader] Warning: ac ${ac_name} data not provided for time ${ac_time}`);
                                traffic.push({
                                    name: ac_name, 
                                    lat: NaN, 
                                    lon: NaN, 
                                    alt: NaN, 
                                    trk: NaN, 
                                    gs: NaN,
                                    vs: NaN,
                                    roll: NaN,
                                    time: `${ms ? +ac_time/1000 : ac_time}`
                                });
                            }
                        }
                    }
                    // console.log(ownship, traffic);
                    ownship_daa.push(ownship);
                    traffic_daa.push(traffic);
                }
                return {
                    steps: ownship_daa.length,
                    stepSize: step_size, 
                    ownship: ownship_daa, 
                    traffic: traffic_daa,
                    daa: {
                        labels,
                        units,
                        content
                    }
                };
            } else {
                console.warn(`[daa-reader] Warning: ownship name at col ${colNum} is null -- terminating`, { data: lines[2] });
            }
        } else {
            console.warn(`[daa-reader] Warning: unable to identify aircraft name -- terminating`, { labels });
        }
    }
    console.warn(`[daa-reader] Warning: malformed .daa file content ${fileContent}`);
    return null;
}

/**
 * Utility function, splits a large .daa file into multiple smaller daa files
 * Assumes the rows are ordered by time stamps, first column is the aircraft name and the first aircraft is the ownship
 */
export function splitDaaFile (fname: string, opt?: { maxLines?: number }): number {
    if (fname) {
        const DEFAULT_MAX_LINES: number = 4000;
        // the .daa file should have at least 2 lines (the header labels and units)
        const MAX_DAA_LINES: number = opt?.maxLines && opt.maxLines > 3 ? opt.maxLines : DEFAULT_MAX_LINES;
        const daaFileContent: string = fsUtils.readFile(fname) || "";
        const lines: string[] = daaFileContent?.split("\n") || [];
        if (lines.length > 3) {
            const labels: string = lines[0];
            const units: string = lines[1];
            const cols: string[] = lines[2].split(/[,\s]/).filter((elem) => { return elem?.trim()?.length > 0 });
            const ownship_name: string = cols?.length > 0 ? cols[0] : "";
            const data: string[] = lines.slice(2);
            console.log(`[daa-reader] (splitDaaFile) Ownship name: ${ownship_name}`);
            console.log(`[daa-reader] (splitDaaFile) Lines in the original .daa file: ${data.length}`);
            if (ownship_name && data.length > MAX_DAA_LINES) {
                console.log(`[daa-reader] (splitDaaFile) Splitting into chunks of approx ${MAX_DAA_LINES} lines`);
                const fname_base: string = fname.endsWith(".daa") ? fname.substring(0, fname.length - 4) : fname;
                let chunk: number = 0;
                const split_points: number[] = [ 0 ];
                // identify split points (i.e., rows with ownship data
                for (let i = MAX_DAA_LINES; i < data.length; i += MAX_DAA_LINES) {
                    // advance line number until ownship data is found
                    while (!data[i]?.trim()?.startsWith(ownship_name)) { i++; }
                    // add line as split point
                    split_points.push(i);
                }
                if (split_points[split_points.length - 1] < data.length) {
                    split_points.push(data.length);
                }
                // split the daa file using the computed split points
                chunk = 0;
                for (let i = 1; i < split_points.length; i++) {
                    const daaFile: string = `${fname_base}-${chunk < 10 ? `00${chunk}` : chunk < 100 ? `0${chunk}` : chunk}.daa`;
                    const daaFileContent: string = labels + "\n" + units + "\n" + data.slice(split_points[i - 1], split_points[i]).join("\n");
                    fsUtils.writeFile(daaFile, daaFileContent);
                    console.log(`[daa-reader] (splitDaaFile) DAA file written: ${daaFile} (lines ${split_points[i - 1]}-${split_points[i] - 1})`);
                    // increment chunk number
                    chunk++;
                }
                return chunk;
            }
        }
    }
    return 0;
}