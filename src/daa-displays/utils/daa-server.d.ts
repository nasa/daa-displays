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

/**
 * Descriptor for Java evaluation requests
 */ 
export declare interface ExecMsg {
    daaLogic: string; // full path of the executable (path is relative to daa-logic)
    daaConfig: string; // todo: need to decide if we want a standard forlder for the configurations. For now it's subfolder DAIDALUS/Configurations of the well clear logic
    scenarioName: string; // all scenarios are in folder daa-scenarios/
    wind: { knot: string, deg: string }; // wind configuration
}

export declare interface PvsioMsg {
    //..
}
export declare interface WebSocketMessage<T> {
    type: string;
    time?: {
        client: { sent: string; },
        server?: { sent: string; }
    };
    id: string;
    data: T;
}

export declare interface LoadScenarioRequest {
    scenarioName: string;
}

export declare interface SaveScenarioRequest {
    scenarioName: string,
    scenarioContent: string
}

export declare interface LoadConfigRequest {
    config: string;
}

// NOTE: strings are used in place of numbers to avoid loss of accuracy due to type conversion across different languages
export declare interface DAADataXYZ {
    time: string;
    name: string;
    lat: string;
    lon: string;
    alt: string;
    vx: string;
    vy: string;
    vz: string;
}

export declare interface DAADataTrkGsVs {
    time: string;
    name: string;
    lat: string;
    lon: string;
    alt: string;
    trk: string;
    gs: string;
    vs: string;
}

export declare interface LatLonAlt {
    lat: string;
    lon: string;
    alt: string;
}

export declare interface LatLon {
    lat: string;
    lon: string;
}

export declare interface Vector3D {
    x: string;
    y: string;
    z: string;
}

export declare interface LLAPosition {
    s: LatLonAlt;
    v: Vector3D;
    id: string;
}

export declare interface LLAData {
    ownship: LLAPosition;
    traffic: LLAPosition[];
}

export declare interface LLAPositionMetrics extends LLAPosition {
    metrics?: DaidalusMetrics
}

export declare interface FlightData extends LLAData {
    traffic: LLAPositionMetrics[];
}

export declare interface LbUb {
    lb: number,
    ub: number,
    units: string
}

export declare interface BandRange {
    0: number;
    1: number;
}

export declare interface DaidalusBand {
    range: BandRange;
    region: Region;
    units: string;
}

export type Region = "NONE" | "FAR" | "MID" | "NEAR" | "RECOVERY" | "UNKNOWN";

export declare interface DaidalusResolution {
    val: number;
    units: string;
    region: Region;
}

export declare interface BandElement {
    time: number,
    bands?: DaidalusBand[],
    resolution?: DaidalusResolution
}

export declare interface Alert {
    ac: string,
    alert_level: number,
    alert_region: string,
    // Only in DAIDALUSv2
    alerter?: string,
    alerter_idx? : number
}

export declare interface AlertElement {
    time: number;
    alerts: Alert[];
}

export declare interface MonitorData {
    time: number;
    color: "green" | "yellow" | "red" | "gray"; // this is the result for a specific band, see DAAMonitorsV2.java, function color2string()
    details: { [key: string]: string }; // key is one of { Heading, Vertical Speed, Horizontal Speed, Altitude }
}

// export declare interface MonitorResult extends MonitorData {
//     id: number;
//     name: string;
//     legend: string;
// }

export declare interface MonitorElement {
    id: number;
    name: string;
    legend: { [color: string]: string };
    color: string; // this color is the max of all colors in results
    results: MonitorData[]
}

export declare interface ResolutionFlags {
  conflict : boolean;
  recovery : boolean;
  saturated : boolean;
  preferred : boolean;
}

export declare interface RecoveryElement {
    time: string; 
    nfactor: string; 
    distance: { 
        horizontal: ValUnits;
        vertical: ValUnits;
    }
}

export declare interface ResolutionElement {
    time: number,
    flags: ResolutionFlags,
    recovery: RecoveryElement
    preferred_resolution: ValueRegion,
    other_resolution: ValueRegion
}

export declare type Polygon = LatLonAlt[];

export declare interface AircraftGeofenceElement {
    ac: string,
    polygons: Polygon[]
}

export declare interface GeofenceElement {
    time: number,
    data: AircraftGeofenceElement[]
} 

export declare interface ValUnits {
    val: string,
    units: string,
    internal?: string,
    internal_units?: string
}

export declare interface ValueRegion {
    valunit : ValUnits,
    region : Region
}

export declare interface Metric {
    horizontal: ValUnits, 
    vertical: ValUnits
}

export declare interface DaidalusMetrics {
    separation: Metric, 
    missdistance: Metric,
    closurerate: Metric, 
    tcpa: ValUnits, 
    tcoa: ValUnits, 
    taumod: ValUnits
}

export declare interface AircraftState {
    id : string,
    s : Vector3D,
    v : Vector3D,
    altitude : ValUnits,
    heading: ValUnits, 
    track: ValUnits,
    airspeed: ValUnits,
    groundspeed: ValUnits,
    verticalspeed: ValUnits,
    wind: boolean
}

export declare interface OwnshipState {
    time: number,   
    acstate: AircraftState,
    trk_region : Region,
    gs_region : Region,
    vs_region: Region
    alt_region : Region,
}

export declare interface AircraftMetrics {
    acstate: AircraftState,
    metrics: DaidalusMetrics,
    alert?: Alert
}

export declare interface MetricsElement {
    time: number,
    aircraft: AircraftMetrics[]
}

// export declare interface OwnshipElement {
//     heading: { val: string, internal: string, units: string }, 
//     airspeed: { val: string, internal: string, units: string }
// }

export declare interface WindElement { deg: string, knot: string }

export declare interface ScenarioData {
    Ownship: OwnshipState[],
    Wind: WindElement, // FROM
    Alerts: AlertElement[], // alerts over time
    "Heading Bands": BandElement[], // bands over time
    "Horizontal Speed Bands": BandElement[],
    "Vertical Speed Bands": BandElement[],
    "Altitude Bands": BandElement[],
    "Horizontal Direction Resolution": ResolutionElement[],
    "Horizontal Speed Resolution": ResolutionElement[],
    "Vertical Speed Resolution": ResolutionElement[],
    "Altitude Resolution": ResolutionElement[],
    "Contours": GeofenceElement[],
    "Hazard Zones": GeofenceElement[],
    Monitors: MonitorElement[],
    Metrics: MetricsElement[]
}
export declare interface ScenarioDataPoint {
    Ownship: OwnshipState,
    Wind: WindElement, // FROM
    Alerts: AlertElement,
    "Heading Bands": BandElement,
    "Horizontal Speed Bands": BandElement,
    "Vertical Speed Bands": BandElement,
    "Altitude Bands": BandElement,
    "Horizontal Direction Resolution": ResolutionElement,
    "Horizontal Speed Resolution": ResolutionElement,
    "Vertical Speed Resolution": ResolutionElement,
    "Altitude Resolution": ResolutionElement,
    "Contours": GeofenceElement,
    "Hazard Zones": GeofenceElement,
    Monitors: MonitorElement[],
    Metrics: MetricsElement
}
export declare interface ScenarioDescriptor extends ScenarioData {
    Info: {
        language: string, // DAIDALUS language
        version: string, // DAIDALUS version
        configuration: string // DAIDALUS configuration file used to produce bands data
    },
    Scenario: string
}

export declare interface DAALosSector {
    los: boolean;
    level: number;
    lat: string;
    lon: string;
    alt: string;
}
export declare interface DAALosRegion {
    ac: string;
    sectors: DAALosSector[];
}
export declare interface DAALosDescriptor {
    WellClear: {
        version: string,
        configuration: string
    },
    Scenario: string,
    Detector: string,
    AlertLevel: number,
    Grid: { sectorSize: number, sectorUnits: string, xmax: number, ymax: number },
    LoS: {
        time: number,
        conflicts: DAALosRegion[]
    }[]
}

export declare interface DAAScenario {
    scenarioName: string;
    length: number;
    steps: string[];
    daa: DAADataXYZ[];
    lla: { [time: string]: LLAData };
}

export declare interface DAAAlerts {
    
}

export declare interface BandIDs {
    hs: "horizontal-speed-bands",
    vs: "vertical-speed-bands",
    alt: "altitude-bands"
}

declare interface ConfigRange<_type> {
    "horizontal-speed": _type; // horizontal speed
    "vertical-speed": _type; // vertical speed
    "altitude": _type; // altitude
}


export declare interface ConfigData extends ConfigRange<{ from: string, to: string, units: string }> {
    "horizontal-speed": {
        from: string;
        to: string;
        units: string;
    };
    "vertical-speed": {
        from: string;
        to: string;
        units: string;
    };
    "altitude": {
        from: string;
        to: string;
        units: string;
    };
}

export declare interface ConfigFile extends ConfigData {
    fileContent: string;
    "horizontal-speed": {
        from: string;
        to: string;
        units: string;
    };
    "vertical-speed": {
        from: string;
        to: string;
        units: string;
    };
    "altitude": {
        from: string;
        to: string;
        units: string;
    };
}

