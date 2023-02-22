/**
 * @module LeafletAirspace
 * @date 2022.01.26
 * @copyright
 * Copyright 2016 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration. No
 * copyright is claimed in the United States under Title 17,
 * U.S. Code. All Other Rights Reserved.
 * 
 * Disclaimers
 * 
 * No Warranty: THE SUBJECT SOFTWARE IS PROVIDED "AS IS" WITHOUT ANY
 * WARRANTY OF ANY KIND, EITHER EXPRESSED, IMPLIED, OR STATUTORY,
 * INCLUDING, BUT NOT LIMITED TO, ANY WARRANTY THAT THE SUBJECT SOFTWARE
 * WILL CONFORM TO SPECIFICATIONS, ANY IMPLIED WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR FREEDOM FROM
 * INFRINGEMENT, ANY WARRANTY THAT THE SUBJECT SOFTWARE WILL BE ERROR
 * FREE, OR ANY WARRANTY THAT DOCUMENTATION, IF PROVIDED, WILL CONFORM TO
 * THE SUBJECT SOFTWARE. THIS AGREEMENT DOES NOT, IN ANY MANNER,
 * CONSTITUTE AN ENDORSEMENT BY GOVERNMENT AGENCY OR ANY PRIOR RECIPIENT
 * OF ANY RESULTS, RESULTING DESIGNS, HARDWARE, SOFTWARE PRODUCTS OR ANY
 * OTHER APPLICATIONS RESULTING FROM USE OF THE SUBJECT SOFTWARE.
 * FURTHER, GOVERNMENT AGENCY DISCLAIMS ALL WARRANTIES AND LIABILITIES
 * REGARDING THIRD-PARTY SOFTWARE, IF PRESENT IN THE ORIGINAL SOFTWARE,
 * AND DISTRIBUTES IT "AS IS."
 * 
 * Waiver and Indemnity: RECIPIENT AGREES TO WAIVE ANY AND ALL CLAIMS
 * AGAINST THE UNITED STATES GOVERNMENT, ITS CONTRACTORS AND
 * SUBCONTRACTORS, AS WELL AS ANY PRIOR RECIPIENT.  IF RECIPIENT'S USE OF
 * THE SUBJECT SOFTWARE RESULTS IN ANY LIABILITIES, DEMANDS, DAMAGES,
 * EXPENSES OR LOSSES ARISING FROM SUCH USE, INCLUDING ANY DAMAGES FROM
 * PRODUCTS BASED ON, OR RESULTING FROM, RECIPIENT'S USE OF THE SUBJECT
 * SOFTWARE, RECIPIENT SHALL INDEMNIFY AND HOLD HARMLESS THE UNITED
 * STATES GOVERNMENT, ITS CONTRACTORS AND SUBCONTRACTORS, AS WELL AS ANY
 * PRIOR RECIPIENT, TO THE EXTENT PERMITTED BY LAW.  RECIPIENT'S SOLE
 * REMEDY FOR ANY SUCH MATTER SHALL BE THE IMMEDIATE, UNILATERAL
 * TERMINATION OF THIS AGREEMENT.
 **/

import { VFR_CHARTS } from "../../aeronav/vfr-charts";
import * as utils from "../daa-utils";
import * as server from "../utils/daa-types";
import { Aircraft, AircraftInterface } from "./daa-aircraft";
import { AirspaceInterface, cities } from "./daa-airspace";
import * as L from "leaflet";
import { DEFAULT_MAP_HEIGHT, DEFAULT_MAP_WIDTH, MAP_WIDESCREEN_WIDTH } from "../daa-interactive-map";
import { LayeringMode, LeafletAircraft, OWNSHIP_COLOR } from "./leaflet-aircraft";
import { GeoFence } from "./daa-geofence";
import { DaaSymbol, DEFAULT_MAX_TRACE_LEN } from "../daa-utils";
import { AlertKind, LatLon, LatLonAlt, Vector3D } from "../utils/daa-types";

// font size/family used for labels
export const FONT_SIZE: number = 28; //px
export const FONT_FAMILY: string = "sans-serif";

// color of the flight plan
export const MAGENTA_LINE_COLOR: string = "magenta";
// width of the flight plan
export const DEFAULT_FLIGHT_PLAN_WIDTH: number = 6; // px
// width of the aircraft trace
export const DEFAULT_TRACE_WIDTH: number = 3; // px
// opacity of the aircraft trace
export const DEFAULT_TRACE_OPACITY: number = 0.8;

// openstreet providers, see https://leaflet-extras.github.io/leaflet-providers/preview/
export interface TileProvider { server: string, credict: string };
export const tileProvider = {
    default: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", // this does not seem to be working all the times
    topology: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    terrain: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    street: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    cyclosm: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png", // bicicle map
    carto: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" // grayscale map
};

/**
 * table indicating the correspondence between NMI and leafletjs zoom levels
 * these values are approximations obtained by inspecting the rendered map
 * key is nmi
 * value is leafletjs zoom level
 */
export const zoomLevels: { [nmi: number]: number } = {
        0.08: 18, // this is the maximum zoom level supported by leafletjs
        0.1 : 17.8,
        0.2 : 16.8,
        0.4 : 15.8,
        0.8 : 14.8,
        1   : 14.3,
        1.25: 14,
        2.5 : 13,
        5   : 12,
        10  : 11,
        20  : 10,
        40  : 9,
        80  : 8,
        160 : 7,
        320 : 5
};
/**
 * Utility function, converts NMI value to zoom value for the map view
 */
export function nmi2zoom (NMI: number): number {
    if (NMI > 0) {
        // the formulas for converting NMI to zoom levels are in the following form
        // e.g., the equation for obtaining the zoom level when NMI in [5..10]
        //         is z = 12 + (NMI - 5) / 10
        //       when NMI in [10..20]
        //         is z = 11 + (NMI - 10) / 10
        //       when NMI in [20..40]
        //         is z = 10 + (NMI - 20) / 10
        // a direct conversion table for specific values is as follows
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
        // 5 = 640NMI
        // 4 = 1280NMI
        // 3 = 2560NMI
        // 2 = 5120NMI
        let zoom_lb: number = 2; // zoom level, lower bound of the interval
        let nmi_lb: number = 5120; // nmi value, lower bound of the interval
        while (nmi_lb > NMI) {
            nmi_lb /= 2;
            zoom_lb++;
        }
        // sanity check
        if (zoom_lb >= 2 && zoom_lb <= 18) {
            // zoom
            const zoom: number = zoom_lb + (nmi_lb - NMI) / 10 * zoom_lb;
            return zoom;
        }
        return 0;
    }
}

// zindexes used in the map, decides who is on top of what
export const ZINDEX = {
    street: 0,
    vfr: 10,
    flightPlan: 20,
    trafficTrace: 20,
    ownship: 30,
    contour: 40,
    hazards: 50,
    traffic: 60
};

// useful types
export interface RenderableFlightPlan { poly: L.Polyline, markers: L.Marker[], plan: utils.FlightPlan };
export interface RenderableTrafficTrace { polys: L.Polyline[], trace: utils.FlightPlan, level?: AlertKind };
export type TrafficTraceMap = {[id: string]: RenderableTrafficTrace }; // id is the aircraft tail number
export type BlobsMap = {[id: string]: L.Polygon}; // id is the blob identifier
export type WCVolumesMap = {[id: string]: L.Polygon}; // id is the wcv identifier

// CSS classes
export enum AirspaceCSS {
    DAA_FLIGHT_PLAN = "daa-flight-plan",
    DAA_TRAFFIC_TRACE = "daa-traffic-trace",
    DAA_OWNSHIP_TRACE = "daa-ownship-trace"
};

// aicrraft data interface
export interface AircraftData { s: LatLonAlt<number | string>, v: Vector3D<number | string>, symbol: DaaSymbol, callSign: string };

/**
 * Airspace implemented with Leafletjs
 */
export class LeafletAirspace implements AirspaceInterface {
    // map object where the airspace layers will be rendered. Multiple maps are used to enable finer layering of map elements (e.g., traffic is always displayed on the top layer)
    protected lworlds: L.Map[];

    // airspace layers for rendering different kind of objects
    protected ownshipLayer: L.Layer; // ownship layer
    protected trafficLayer: L.LayerGroup; // traffic layer
    protected streetLayer: L.Layer; // openmap street layer
    protected vfrLayer: L.LayerGroup; // vfr charts layer
    protected flightPlanLayer: L.LayerGroup; // flight plan layer
    protected aircraftTraceLayer: L.LayerGroup; // trace layer (traffic + ownship)
    protected contoursLayer: L.LayerGroup; // contours layer
    protected hazardZonesLayer: L.LayerGroup; // hazard zones layer

    // max trace length
    protected maxTraceLen: number = DEFAULT_MAX_TRACE_LEN;

    // parent DOM element where the aerospace will be created
    protected $div: JQuery<HTMLElement>;

    // inner div, used for map rotations
    protected $innerDivs: JQuery<HTMLElement>[];

    // compass div
    protected $compassDiv: JQuery<HTMLElement>;
    // indicators div
    protected $indicatorsDiv: JQuery<HTMLElement>;
    // ownship div
    protected $ownshipDiv: JQuery<HTMLElement>;

    // ownship
    protected _ownship: LeafletAircraft;
    // traffic
    protected _traffic: LeafletAircraft[] = [];
    // previous traffic
    protected previousTrafficPosition: { [tailNumber: string]: LatLonAlt<number | string> } = {};
    // layering mode for traffic
    protected layeringMode: LayeringMode = LayeringMode.byAlertLevel;

    // contours (blobs)
    protected contours: BlobsMap = {};
    // hazard zones (well-clear volumes)
    protected hazardZones: WCVolumesMap = {};
    // flight plan
    protected flightPlan: RenderableFlightPlan = null;
    // traffic traces
    protected trafficTrace: TrafficTraceMap = {};
    // ownship trace
    protected ownshipTrace: RenderableTrafficTrace = null;

    // navigator heading, keeps track of the ownship heading in nrthup mode
    protected navigator_heading: number = 0;

    // nmi shown in the view
    protected nmi: number;

    // flags
    protected godsView: boolean = false; // whether the view is airspace-centric (true) or ownship-centric (false)
    protected callSignVisible: boolean = false; // whether call signs are visible
    protected trafficVisible: boolean = true; // whether traffic aircraft are visible
    protected hazardZonesVisible: boolean = false; // whether hazard zones are visible
    protected contoursVisible: boolean = false; // whether contours are visible
    protected flightPlanVisible: boolean = false; // whether the flight path is visible
    protected trafficTraceVisible: boolean = false; // whether traffic traces are visible
    protected ownshipTraceVisible: boolean = false; // whether the ownship trace is visible

    protected animate: boolean = false; // whether to smooth animation of objects moving on the map
    protected duration: number = utils.DEFAULT_TRAFFIC_UPDATE_INTERVAL; // duration of the traffic animation, in seconds
    protected forceNoAnimation: boolean = false; // whether animation should be forced to be disabled, e.g., useful during zoom operations

    /**
     * Constructor
     */
    constructor(opt?: { 
        div?: string, // div where the airspace will be rendered
        ownship?: LatLonAlt<number | string>, 
        traffic?: { s: LatLonAlt<number | string>, v: Vector3D<number | string>, symbol: string, callSign: string }[], 
        flightPlan?: utils.FlightPlan,
        trafficTrace?: utils.FlightTrace,
        ownshipTrace?: utils.FlightTrace,
        godsView?: boolean, 
        los?: boolean, 
        callSignVisible?: boolean, // default: false
        trafficVisible?: boolean,  // default: true
        flightPlanVisible?: boolean, // default: false
        trafficTraceVisible?: boolean, // default: false
        ownshipTraceVisible?: boolean, // default: false
        maxTraceLen?: number, // max trace len
        widescreen?: boolean, // default: false
        layeringMode?: LayeringMode, // default: byAlertLevel
        scrollZoom?: boolean, // default: false
        dragging?: boolean, // default: false
        animate?: boolean, //  whether to smooth animation of objects moving on the map, default: true
        duration?: number // duration of the traffic animation
    }) {
        opt = opt || {};
        opt.ownship = opt.ownship || {
            lat: cities.hampton.lat,
            lon: cities.hampton.lon,
            alt: 0
        };
        opt.traffic = opt.traffic || [];
        opt.div = opt.div || "leaflet-div";
        this.godsView = !!opt.godsView;
        this.callSignVisible = !!opt.callSignVisible;
        this.trafficVisible = opt.trafficVisible === undefined ? true : !!opt.trafficVisible;
        this.animate = opt.animate === undefined ? false : !!opt.animate;
        this.duration = isFinite(opt.duration) ? opt.duration : utils.DEFAULT_TRAFFIC_UPDATE_INTERVAL;
        this.maxTraceLen = isFinite(opt.maxTraceLen) ? opt.maxTraceLen : DEFAULT_MAX_TRACE_LEN;
        this.flightPlanVisible = !!opt.flightPlanVisible;
        this.trafficTraceVisible = !!opt.trafficTraceVisible;
        this.ownshipTraceVisible = !!opt.ownshipTraceVisible;
        this.layeringMode = opt.layeringMode !== LayeringMode.byAltitudeLevel ? LayeringMode.byAlertLevel : LayeringMode.byAltitudeLevel;

        const width: number = opt?.widescreen ? MAP_WIDESCREEN_WIDTH : DEFAULT_MAP_WIDTH;
        const height: number = DEFAULT_MAP_HEIGHT;
        // append required stylesheet to head
        // the map is artificially grown 3x larger to enable view rotations in ownship-centric mode
        $("head").append(`<style>
        .leaflet-container {
            background: transparent !important;
        }
        .leaflet-vfr-chart {
            filter: brightness(50%) grayscale(55%);
        }
        .leaflet-tile {
            filter: brightness(55%) contrast(140%) grayscale(55%) hue-rotate(20deg);
        }
        .daa-traffic div {
            transform: scale(0.9);
        }
        .leaflet-marker-pane {
            transition-duration:0s !important;
        }
        .${AirspaceCSS.DAA_FLIGHT_PLAN} {
            filter: drop-shadow(2px 2px 1px black);
            -webkit-filter: drop-shadow(2px 2px 1px black);
            opacity: 0.8;
        }
        .daa-waypoint {
            font: ${FONT_SIZE}px ${FONT_FAMILY};
            color: white;
        }
        .daa-label {
            font: ${FONT_SIZE}px ${FONT_FAMILY}; 
            color: white;
            text-shadow: 1px 1px 4px black;
            filter: drop-shadow(2px 2px 1px black);
            -webkit-filter: drop-shadow(2px 2px 1px black);
            white-space:nowrap;
        }
        .${AirspaceCSS.DAA_TRAFFIC_TRACE} {
            transform: translate(${-DEFAULT_TRACE_WIDTH}px);
        }
        .leaflet-top {
            margin-top: 40px;
        }
        #${opt.div}-background {
            width: ${this.godsView ? width : 3 * width}px !important;
            height: ${this.godsView ? height : 3 * height}px !important;
            top: ${this.godsView ? 0 : -height}px !important;
            left: ${this.godsView ? 0 : -width}px !important;
            transition-timing-function: linear !important;
            background: black;
        }
        #${opt.div}-traffic {
            width: ${this.godsView ? width : 3 * width}px !important;
            height: ${this.godsView ? height : 3 * height}px !important;
            top: ${this.godsView ? 0 : -height}px !important;
            left: ${this.godsView ? 0 : -width}px !important;
            background: transparent !important;
        }
        .leaflet-control-zoom-in {
            text-decoration:none !important;
        }
        .leaflet-control-zoom-out {
            text-decoration:none !important;
        }
        #${opt.div}-traffic .leaflet-control-attribution {
            display: none;
        }
        </style>`);

        // parent div
        this.$div = $(`#${opt.div}`);

        // we use two divs to implement a rotate map functionality
        // the outer div is the div provided by the user, and defines the dimensions of the view
        // the inner div is for the leaflet map, whose size will be larger than the outer div so map tiles are not missing when rotating the rectangular map
        const innerDiv0: HTMLElement = utils.createDiv(`${opt.div}-background`, {
            parent: opt.div,
            top: 0,
            left: 0
        });
        const compassLayer: HTMLElement = utils.createDiv(`${opt.div}-compass`, {
            parent: opt.div,
            top: 0,
            left: 0
        });
        this.$compassDiv = $(compassLayer);
        const innerDiv1: HTMLElement = utils.createDiv(`${opt.div}-traffic`, {
            parent: opt.div,
            top: 0,
            left: 0
        });
        const ownshipLayer: HTMLElement = utils.createDiv(`${opt.div}-ownship`, {
            parent: opt.div,
            top: 0,
            left: 0
        });
        this.$ownshipDiv = $(ownshipLayer);
        const indicatorsLayer: HTMLElement = utils.createDiv(`${opt.div}-indicators`, {
            parent: opt.div,
            top: 0,
            left: 0
        });
        this.$indicatorsDiv = $(indicatorsLayer);
        this.$innerDivs = [
            $(innerDiv0),
            $(innerDiv1),
        ];
        // adjust size of outer div to match the standard dimensions of the danti quadrant
        this.$div.css({
            width,
            height,
            display: "block"
        });

        // create layers
        this.createOwnshipLayer();
        this.createTrafficLayer();
        this.createStreetLayer();
        this.createVfrLayer();
        this.createContoursLayer();
        this.createHazardZonesLayer();
        this.createFlightPlanLayer();
        this.createTrafficTraceLayer();

        // create leaflet view in the div
        const center: [ number, number ] = [ +opt?.ownship?.lat, +opt?.ownship?.lon ];
        const zoomSnap: number = this.godsView ? 1 : 0.0005; // this accuracy is needed for NMI lower than 1
        const zoomDelta: number = this.godsView ? 1 : 0.0005;
        const zoom: number = 12; // 12 is 5 NMI
        this.lworlds = [
            L.map(`${opt.div}-background`, {
                center,
                zoom,
                zoomSnap,
                zoomDelta,
                zoomControl: this.godsView,
                scrollWheelZoom: !!opt?.scrollZoom,
                touchZoom: !!opt?.scrollZoom,
                doubleClickZoom: !!opt?.scrollZoom,
                boxZoom: !!opt?.scrollZoom,
                dragging: !!opt?.dragging,
                layers: [
                    this.streetLayer,
                    this.vfrLayer
                ]
            }),
            // (RTCA-365B, sec 2.2.5.9.1)
            // To ensure visibility of the most important symbols and they data tags, the following
            // prioritization should be followed for information overlay (from highest to lowest)
            // 1. Ownship
            // 2. Traffic prioritized according to sec 2.2.4.3.5.4
            // (RTCA-365B, sec 2.2.4.3.5.4)
            // Intruders shall be prioritized in the following order for display:
            // 1. Resolution Advisory
            // 2. Warning Alert
            // 3. Corrective Alert
            // 4. Preventive Alert
            // 5. Maneuver Guidance
            // 6. Remaining Traffic
            L.map(`${opt.div}-traffic`, {
                center,
                zoom,
                zoomSnap,
                zoomDelta,
                zoomControl: this.godsView,
                scrollWheelZoom: !!opt?.scrollZoom,
                touchZoom: !!opt?.scrollZoom,
                doubleClickZoom: !!opt?.scrollZoom,
                boxZoom: !!opt?.scrollZoom,
                dragging: !!opt?.dragging,
                layers: [
                    this.aircraftTraceLayer,
                    this.contoursLayer,
                    this.hazardZonesLayer,
                    this.trafficLayer,
                    this.flightPlanLayer,
                    this.ownshipLayer
                ]
            })
        ];
        // add scale to the traffic map
        L.control.scale().addTo(this.lworlds[1]);

        // propagate drag and zoom events between worlds
        this.lworlds[1].on("drag", ((evt: L.LeafletEvent) => {
            const center: L.LatLng = this.lworlds[1].getCenter();
            const zoom: number = this.lworlds[1].getZoom();
            this.lworlds[0].setView(center, zoom, { animate: false });
        }));
        this.lworlds[1].on("zoomend", ((evt: L.LeafletEvent) => {
            const center: L.LatLng = this.lworlds[1].getCenter();
            const zoom: number = this.lworlds[1].getZoom();
            this.lworlds[0].setView(center, zoom, { animate: false });
        }));

        // enable/disable pointer events based on the type of view
        (this.godsView) ? 
            this.enableMapPointerEvents()
                : this.disableMapPointerEvents();

        // append credits if the map is larger
        if (!this.godsView) {
            this.$div.prepend(`
<style>
.credits {
    z-index: 1;
    position: relative;
    font-size: xx-small;
    padding-left: 10px;
    padding-right: 10px;
    margin-top: ${height - 14}px;
    pointer-events: all;
    text-align: right;
    background: rgba(255, 255, 255, 0.7);
}
</style>
<div class="credits">
<a href="https://leafletjs.com" title="A JS library for interactive maps" target=_blank>Leaflet</a>
| 
<a href="http://osm.org/copyright" title="OpenStreet Maps" target=_blank>OpenStreetMap</a>
|
<a href="https://www.faa.gov/air_traffic/flight_info/aeronav/productcatalog/VFRCharts/Sectional/" title="FAA Aeronautical Charts" target=_blank>FAA Aeronautical Charts</a>
</div>
            `);
        }

        // Render ownship
        this._ownship = new LeafletAircraft(this.lworlds[1], {
            s: opt?.ownship,
            heading: 0,
            callSign: "ownship",
            symbol: "daa-ownship",
            aircraftVisible: this.godsView
        }, this.ownshipLayer);

        // Render traffic
        if (opt.traffic?.length) {
            this.setTraffic(opt.traffic);
        }

        // start in street mode
        this.streetMode();

        // set zoom level to 5 NMIs
        this.setZoomLevel(5);
    }
    /**
     * Utility function, returns a pointer to the compass div
     */
    getCompassDivName (): string {
        return this.$compassDiv[0] ? this.$compassDiv.attr("id") : null;
    }
    /**
     * Utility function, returns a pointer to the indicators div
     */
    getIndicatorsDivName (): string {
        return this.$indicatorsDiv[0] ? this.$indicatorsDiv.attr("id") : null;
    }
    /**
     * Utility function, returns a pointer to the indicators div
     */
    getOwnshipDivName (): string {
        return this.$ownshipDiv[0] ? this.$ownshipDiv.attr("id") : null;
    }
    /**
     * set traffic animation duration
     */
    animationDuration (sec: number): boolean {
        // sanity check
        // console.log(`[leaflet-airspace] animationDuration`, { sec });
        if (sec >= 0 && this.duration !== sec) {
            this.duration = sec;
            return true;
        }
        return false;
    }
    /**
     * Set max trace length
     */
    setMaxTraceLength (len: number): boolean {
        // console.log(`[leaflet-airspace] setMaxTraceLength`, { len });
        if (Math.floor(len) >= 0) {
            this.maxTraceLen = Math.floor(len);
            return true;
        }
        return false;
    }
    /**
     * Returns max trace length
     */
    getMaxTraceLength (): number {
        return this.maxTraceLen;
    }
    /**
     * Internal function enables pointer events on the map
     */
    protected enableMapPointerEvents (): void {
        this.$div.css({
            "pointer-events": "all",
            "touch-action": "auto"
        });
    }
    /**
     * Internal function disables pointer events on the map
     */
    protected disableMapPointerEvents (): void {
        for (let i = 0; i < this.$innerDivs.length; i++) {
            this.$innerDivs[i].find(`.map-div`).css({
                "pointer-events": "none",
                "touch-action": "none"
            });
        }
    }
    /**
     * Internal function, creates a street layer
     */
    protected createStreetLayer (): void {
        const tileServer: string = tileProvider.topology;
        this.streetLayer = L.tileLayer(tileServer, {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>',
            opacity: 1,
            className: "leaflet-street-layer"
        }).setZIndex(ZINDEX.street);
    }
    /**
     * Internal function, creates the vfr layer with the charts available in aeronav/VFR_CHARTS
     */
    protected createVfrLayer (): void{
        const layers: L.Layer[] = [];
        for (let i = 0; i < VFR_CHARTS.length; i++) {
            const offset = {
                west: VFR_CHARTS[i].offset?.x || VFR_CHARTS[i].offset?.west || 0,
                east: VFR_CHARTS[i].offset?.x || VFR_CHARTS[i].offset?.east || 0,
                north: VFR_CHARTS[i].offset?.y || VFR_CHARTS[i].offset?.north || 0,
                south: VFR_CHARTS[i].offset?.y || VFR_CHARTS[i].offset?.south || 0
            };
            const vfr: L.Layer = L.imageOverlay(`aeronav/${VFR_CHARTS[i].file}`, [
                // southwest
                [ VFR_CHARTS[i].south + offset.south, VFR_CHARTS[i].west + offset.west ], 
                // northeast
                [ VFR_CHARTS[i].north + offset.north, VFR_CHARTS[i].east + offset.east ]
            ], {
                opacity: 1,
                className: "leaflet-vfr-chart"
            });
            layers.push(vfr);
        }
        this.vfrLayer = L.layerGroup(layers).setZIndex(ZINDEX.vfr);
    }
    /**
     * Internal function, creates ownship layer
     */
    protected createOwnshipLayer (): void {
        this.ownshipLayer = L.layerGroup([]).setZIndex(ZINDEX.ownship);
    }
    /**
     * Internal function, creates traffic layer
     */
    protected createTrafficLayer (): void {
        this.trafficLayer = L.layerGroup([]).setZIndex(ZINDEX.traffic);
    }
    /**
     * Internal function, creates contours layer
     */
    protected createContoursLayer (): void {
        this.contoursLayer = L.layerGroup([]).setZIndex(ZINDEX.contour);
    }
    /**
     * Internal function, creates hazard zones layer
     */
    protected createHazardZonesLayer (): void {
        this.hazardZonesLayer = L.layerGroup([]).setZIndex(ZINDEX.hazards);
    }
    /**
     * Internal function, creates flight plan layer
     */
    protected createFlightPlanLayer (): void {
        this.flightPlanLayer = L.layerGroup([]).setZIndex(ZINDEX.flightPlan);
    }
    /**
     * Internal function, creates traffic trace layer
     */
    protected createTrafficTraceLayer (): void {
        this.aircraftTraceLayer = L.layerGroup([]).setZIndex(ZINDEX.trafficTrace);
    }
    /**
     * Tries to set the zoom level to the given NMI
     * Valid NMI levels range between [0.08..320]
     */
    trySetZoomLevel (NMI: number): boolean {
        if (NMI >= 0.08 && NMI <= 320) {
            this.setZoomLevel(NMI);
            return true;
        }
        return false;
    }
    /**
     * Get current zoom level
     */
    getZoomLevel (): number {
        return this.nmi;
    }
    /**
     * Utility function, disables all animations
     */
    disableAllAnimations (): void {
        this.forceNoAnimation = true;
    }
    /**
     * Utility function, disables all animations
     */
    restoreAllAnimations (): void {
        this.forceNoAnimation = false;
    }
    /**
     * Sets zoom level of the view to the given NMI
     * In leafletjs, a zoom level of 12 is approx 5NMI
     * increasing the zoom level by 1 halves the NMI
     * decreasing the zoom level by 1 doubles the NMI
     */
    setZoomLevel (NMI: number): AirspaceInterface {
        if (NMI !== this.nmi && NMI > 0) {
            const zoom: number = nmi2zoom(NMI);
            if (zoom > 0) {
                this.disableAllAnimations();
                for (let i = 0; i < this.lworlds.length; i++) {
                    this.lworlds[i].setZoom(zoom, {
                        animate: false
                    });
                }
                this.restoreAllAnimations();
                // update nmi info
                this.nmi = NMI;
                return this;
            }
        }
        console.warn(`[ljs-airspace] Warning: unable to set zoom level for NMI=${NMI}`);
        // const zoomLevel: number = zoomLevels[NMI];
        // this.lworld.setZoom(zoomLevel)
        return this;
    }
    /**
     * Switch to vfr mode
     */
    vfrMode (): AirspaceInterface {
        $(".leaflet-vfr-chart").css("display", "block");
        // $(".leaflet-street-layer").css("display", "none");
        return this;
    }    
    /**
     * Switch to terrain mode
     */
    terrainMode(): AirspaceInterface {
        // not available
        console.warn(`[ljs-airspace] Warning: terrain mode not available in LeafletJS, please use WWD`);
        return this.streetMode();
    }
    /**
     * Switch to street mode
     */
    streetMode(): AirspaceInterface {
        $(".leaflet-street-layer").css("display", "block");
        $(".leaflet-vfr-chart").css("display", "none");
        // this.vfrLayer.removeFrom(this.lworld);
        return this;
    }
    /**
     * airspace view
     */
    godsViewOn (): AirspaceInterface {
        this.godsView = true;
        this._ownship?.reveal();
        return this;
    }
    /**
     * ownship view
     */
    godsViewOff (): AirspaceInterface {
        this.godsView = false;
        this._ownship?.hide();
        return this;
    }
    autoScale(): AirspaceInterface {
        // TODO
        return this;
    }
    view2D(): AirspaceInterface {
        return this.streetMode();
    }
    view3D(): AirspaceInterface {
        // not available
        console.warn(`[ljs-airspace] Warning: terrain mode not available in LeafletJS, please use WWD`);
        return this.streetMode();
    }
    /**
     * Centers the map on the ownship position.
     */
    recenter (pos: { lat: number; lon: number; }): AirspaceInterface {
        if (pos) {
            const currentPosition: LatLon<number> = this._ownship?.getPosition();
            if (currentPosition) {
                const lat: number = !isNaN(+pos.lat) ? pos.lat : currentPosition.lat;
                const lon: number = !isNaN(+pos.lon) ? pos.lon : currentPosition.lon;
                this.goTo({ lat, lon });
                return this;
            }
        }
        // else
        console.warn("[ljs-airspace] Warning: unable to recenter map -- position is null :/");
        return this;
    }
    /**
     * Centers the map to a given location. The ownship position is kept unchanged.
     */
    goTo (pos: LatLon<number | string>, opt?: { animate?: boolean }): AirspaceInterface {
        if (pos) {
            const animate: boolean = this.animate && !this.forceNoAnimation && this.duration === 1;
            for (let i = 0; i < this.lworlds.length; i++) {
                this.lworlds[i].panTo([ +pos.lat, +pos.lon ], {
                    animate,
                    duration: animate ? this.duration : 0,
                    easeLinearity: 1 // 1 means linear animation
                });
            }
        }
        return this;
    }
    /**
     * Set ownship position and centers the map on the ownship
     */
    setPosition (pos: LatLonAlt<number | string>) {
        this.setOwnshipPosition(pos);
        return this.goTo(pos);
    }
    /**
     * Set ownship position
     */
    setOwnshipPosition (pos: string | LatLonAlt<number | string>): AirspaceInterface {
        if (pos) {
            if (typeof pos === "string") { // it's a city name
                // match the name after removing white spaces and transforming to lower case
                pos = pos.replace(/\s/g, "").toLowerCase();
                // look for the name of the city in the list of known destinations (array cities)
                const loc: LatLonAlt<number> = cities[pos];
                if (loc) {
                    this._ownship?.setPosition(loc);
                    this._ownship?.refresh();
                } else {
                    console.error("Could not find location " + location + " :((");
                }
            } else { // it's lat lon
                const position: LatLonAlt<number> = {
                    alt: +pos?.alt || 0,
                    lat: +pos?.lat || 0,
                    lon: +pos?.lon || 0,
                };
                this._ownship?.setPosition(position);
                this._ownship?.refresh();
                // update ownship trace
                const waypoint: utils.WayPoint = {
                    lla: { lat: position.lat, lon: position.lon, alt: position.alt }
                };
                this.updateOwnshipTrace(waypoint);
            }
        } else {
            console.error("Incorrect aircraft position :/ ", pos);
        }
        return this;
    }
    /**
     * Set ownship velocity
     */
    setOwnshipVelocity (v: Vector3D<number | string>): AirspaceInterface {
        if (v) {
            this._ownship.setVelocity(v);
        }
        return this;
    }
    /**
     * Sets a flight plan
     * If a current flight plan is already set, the current flight plan is replaced with those passed to the function
     */
    setFlightPlan (plan: utils.FlightPlan, opt?: { color: string, traceWidth?: number, traceOpacity?: number }): AirspaceInterface {
        // remove old flight plan if any exists
        this.clearCurrentFlightPlan();
        // update rendered elements
        if (plan) {
            const color: string = opt?.color || MAGENTA_LINE_COLOR;
            const traceWidth: number = opt?.traceWidth || DEFAULT_FLIGHT_PLAN_WIDTH;
            const traceOpacity: number = isFinite(opt?.traceOpacity) ? opt.traceOpacity : DEFAULT_TRACE_OPACITY;
            const latlngs: L.LatLngExpression[] = plan?.map((elem: utils.WayPoint) => {
                return [+elem?.lla?.lat || 0, +elem?.lla?.lon || 0];
            }) || [];
            const labels: string[] = plan?.map((elem: utils.WayPoint) => {
                return elem?.label || "";
            }) || [];
            // append polyline and waypoints
            if (latlngs?.length) { // sanity check
                const poly: L.Polyline = L.polyline(latlngs, {
                    color,
                    weight: traceWidth, // stroke width
                    opacity: traceOpacity,
                    className: AirspaceCSS.DAA_FLIGHT_PLAN
                });
                poly.addTo(this.flightPlanLayer);
                const markers: L.Marker[] = [];
                for (let i = 0; i < latlngs.length; i++) {
                    const icon: L.DivIcon = this.createWaypointIcon({ label: labels[i] });
                    const marker: L.Marker = L.marker(latlngs[i], {
                        zIndexOffset: -1 // this will instruct leaflet to render the label under traffic markers
                    }).setIcon(icon).addTo(this.flightPlanLayer);
                    markers.push(marker);
                }
                // save flight plan
                this.flightPlan = { poly, markers: [], plan };
            }
            // update visibility
            this.flightPlanVisible ? this.revealFlightPlan() : this.hideFlightPlan();
        }
        return this;
    }
    /**
     * Clears (i.e., removes) the current flight plan
     */
    clearCurrentFlightPlan (): AirspaceInterface {
        if (this.flightPlan) {
            // remove rendered elements
            this.flightPlan.poly?.remove();
            for (let i = 0; i < this.flightPlan.markers?.length; i++) {
                this.flightPlan.markers[i].remove();
            }
        }
        this.flightPlan = null;
        return this;
    }
    /**
     * Sets traffic trace
     * If traffic trace data are already stored, the data is replaced with those passed to the function
     */
    setTrafficTrace (callSign: string, level: AlertKind, trace: utils.FlightTrace, opt?: {
        traceWidth?: number,
        traceOpacity?: number
    }): AirspaceInterface {
        // remove old traffic trace
        this.clearTrafficTrace(callSign);
        // store new trace and re-render
        for (let i = 0; i < trace?.length; i++) {
            // update traffic trace
            const color: string = utils.bugColors[level] || utils.bugColors[AlertKind.UNKNOWN];
            const traceWidth: number = opt?.traceWidth || DEFAULT_TRACE_WIDTH;
            const traceOpacity: number = isFinite(opt?.traceOpacity) ? opt.traceOpacity : DEFAULT_TRACE_OPACITY;
            const latlngs: L.LatLngExpression[] = trace?.map((elem: utils.WayPoint) => {
                return [+elem?.lla?.lat || 0, +elem?.lla?.lon || 0];
            }) || [];
            const rtt: RenderableTrafficTrace = { level, trace, polys: [] };
            // render polyline and waypoints
            if (latlngs?.length) {
                const poly: L.Polyline = L.polyline(latlngs, {
                    color,
                    weight: traceWidth, // stroke width
                    opacity: traceOpacity, // opacity level
                    className: AirspaceCSS.DAA_TRAFFIC_TRACE
                }).addTo(this.aircraftTraceLayer);
                rtt.polys.push(poly);
            }
            this.trafficTrace[callSign] = rtt;
            // update visibility status
            this.trafficTraceVisible ? this.revealTrafficTrace() : this.hideTrafficTrace();
        }
        return this;
    }
    /**
     * Returns traffic trace of aircraft ac
     */
    getTrafficTrace (callSign: string): utils.FlightTrace {
        if (callSign) {
            return this.trafficTrace[callSign]?.trace;
        }
        return null;
    }
    /**
     * Sets traffic trace
     * If traffic trace data are already stored, the data is replaced with those passed to the function
     */
    setOwnshipTrace (level: AlertKind, trace: utils.FlightTrace, opt?: {
        traceWidth?: number,
        traceOpacity?: number
    }): AirspaceInterface {
        // remove old trace
        this.clearOwnshipTrace();
        // store new trace and re-render
        for (let i = 0; i < trace?.length; i++) {
            // update trace
            const color: string = utils.bugColors[level] || utils.bugColors[AlertKind.UNKNOWN];
            const traceWidth: number = opt?.traceWidth || DEFAULT_TRACE_WIDTH;
            const traceOpacity: number = isFinite(opt?.traceOpacity) ? opt.traceOpacity : DEFAULT_TRACE_OPACITY;
            const latlngs: L.LatLngExpression[] = trace?.map((elem: utils.WayPoint) => {
                return [+elem?.lla?.lat || 0, +elem?.lla?.lon || 0];
            }) || [];
            const rtt: RenderableTrafficTrace = { level, trace, polys: [] };
            // render polyline and waypoints
            if (latlngs?.length) {
                const poly: L.Polyline = L.polyline(latlngs, {
                    color,
                    weight: traceWidth, // stroke width
                    opacity: traceOpacity, // trace opacity
                    className: AirspaceCSS.DAA_OWNSHIP_TRACE
                }).addTo(this.aircraftTraceLayer);
                rtt.polys.push(poly);
            }
            this.ownshipTrace = rtt;
            // update visibility status
            this.ownshipTraceVisible ? this.revealOwnshipTrace() : this.hideOwnshipTrace();
        }
        return this;
    }
    /**
     * Returns traffic trace of aircraft ac
     */
    getOwnshipTrace (): utils.FlightTrace {
        return this.ownshipTrace?.trace;
    }
    /**
     * Utility function, returns the alert level for a given aircraft
     */
    getAlertLevel (callSign: string): AlertKind {
        if (callSign) {
            const ac: AircraftInterface = this.getTrafficAircraft(callSign);
            return ac?.getAlertKind();
        }
        return AlertKind.UNKNOWN;
    }
    /**
     * Clears traffic trace data for aicraft ac
     */
    clearTrafficTrace (callSign: string): AirspaceInterface {
        if (callSign && this.trafficTrace && this.trafficTrace[callSign]) {
            const polys: L.Polyline[] = this.trafficTrace[callSign].polys;
            for (let i = 0; i < polys?.length; i++) {
                polys[i]?.remove();
            }
            delete this.trafficTrace[callSign];
        }
        return this;
    }
    /**
     * Utility function, clears all traffic traces
     */
    clearAllTrafficTraces (): AirspaceInterface {
        if (this.trafficTrace) {
            const acs: string[] = Object.keys(this.trafficTrace);
            for (let i = 0; i< acs.length; i++) {
                this.clearTrafficTrace(acs[i]);
            }
        }
        return this;
    }
    /**
     * Clears ownship trace data
     */
    clearOwnshipTrace (): AirspaceInterface {
        if (this.ownshipTrace?.polys?.length) {
            const polys: L.Polyline[] = this.ownshipTrace.polys;
            for (let i = 0; i < polys?.length; i++) {
                polys[i]?.remove();
            }
            this.ownshipTrace = null;
        }
        return this;
    }
    /**
     * Utility function, adds a new waypoint to the trace of aircraft ac
     */
    updateTrafficTrace (callSign: string, wp: utils.WayPoint, opt?: {
        level?: AlertKind, traceWidth?: number, traceOpacity?: number
    }): AirspaceInterface {
        if (callSign && wp) {
            const rtt: RenderableTrafficTrace = this.trafficTrace[callSign];
            let trace: utils.FlightTrace = rtt?.trace || [];
            // append polyline
            let polys: L.Polyline[] = rtt?.polys || [];
            const level: AlertKind = opt?.level || this.getAlertLevel(callSign) || AlertKind.UNKNOWN;
            const color: string = utils.bugColors[level] || utils.bugColors[AlertKind.UNKNOWN];
            const traceWidth: number = opt?.traceWidth || DEFAULT_TRACE_WIDTH;
            const traceOpacity: number = isFinite(opt?.traceOpacity) ? opt.traceOpacity : DEFAULT_TRACE_OPACITY;
            const latlng: L.LatLngExpression = [ +wp?.lla?.lat || 0, +wp?.lla?.lon || 0 ];
            const latlngs: L.LatLngExpression[] = trace?.length > 0 && isFinite(trace[trace.length - 1]?.lla?.lat) && isFinite(trace[trace.length - 1]?.lla?.lon) ? 
                [ [trace[trace.length - 1].lla.lat, trace[trace.length - 1].lla.lon ], latlng ]
                    : [ latlng ];
            const poly = L.polyline(latlngs, {
                color,
                weight: traceWidth, // stroke width
                opacity: traceOpacity,
                className: AirspaceCSS.DAA_TRAFFIC_TRACE
            }).addTo(this.aircraftTraceLayer);
            // append waypoint to at the end of the current trace
            trace.push(wp);
            polys.push(poly);
            // trim arrays so trace length is this.maxTraceLen
            if (trace.length > this.maxTraceLen) {
                const n: number = trace.length % this.maxTraceLen;
                trace = trace.slice(n);
                for (let i = 0; i < n; i++) { polys[i].remove(); }
                polys = polys.slice(n);
            }
            // save new segment in the trace
            this.trafficTrace[callSign] = { polys, level, trace };
        }
        // update visibility status
        this.trafficTraceVisible ? this.revealTrafficTrace() : this.hideTrafficTrace();
        return this;
    }
    /**
     * Utility function, adds a new waypoint to the ownship trace
     */
    updateOwnshipTrace (wp: utils.WayPoint, opt?: {
        level?: AlertKind, traceWidth?: number, traceOpacity?: number
    }): AirspaceInterface {
        if (wp) {
            const rtt: RenderableTrafficTrace = this.ownshipTrace;
            let trace: utils.FlightTrace = rtt?.trace || [];
            let polys: L.Polyline[] = rtt?.polys || [];
            // append polyline
            const color: string = opt?.level ? (utils.bugColors[opt.level] || AlertKind.UNKNOWN) : OWNSHIP_COLOR;
            const traceWidth: number = opt?.traceWidth || DEFAULT_TRACE_WIDTH;
            const traceOpacity: number = isFinite(opt?.traceOpacity) ? opt.traceOpacity : DEFAULT_TRACE_OPACITY;
            const latlng: L.LatLngExpression = [ +wp?.lla?.lat || 0, +wp?.lla?.lon || 0 ];
            const latlngs: L.LatLngExpression[] = trace?.length > 0 && isFinite(trace[trace.length - 1]?.lla?.lat) && isFinite(trace[trace.length - 1]?.lla?.lon) ? 
                [ [trace[trace.length - 1].lla.lat, trace[trace.length - 1].lla.lon ], latlng ]
                    : [ latlng ];
            const poly = L.polyline(latlngs, {
                color,
                weight: traceWidth, // stroke width
                opacity: traceOpacity,
                className: AirspaceCSS.DAA_OWNSHIP_TRACE
            }).addTo(this.aircraftTraceLayer);
            // append waypoint to at the end of the current trace
            polys.push(poly);
            trace.push(wp);
            // trim arrays so trace length is this.maxTraceLen
            if (trace.length > this.maxTraceLen) {
                const n: number = trace.length % this.maxTraceLen;
                trace = trace.slice(n);
                for (let i = 0; i < n; i++) { polys[i].remove(); }
                polys = polys.slice(n);
            }
            // save new segment in the trace
            this.ownshipTrace = { polys, trace };
        }
        // update visibility status
        this.ownshipTraceVisible ? this.revealOwnshipTrace() : this.hideOwnshipTrace();
        return this;
    }
    /**
     * Internal function, creates the DOM element for a waypoint marker
     */
    protected createWaypointIcon (desc?: { label?: string, css?: AirspaceCSS }): L.DivIcon {
        const label: string = desc?.label || "";
        const ownshipHeading: number = this._ownship?.getHeading() || 0;
        return new L.DivIcon({
            html: `
            <div class="${desc?.css || AirspaceCSS.DAA_FLIGHT_PLAN} daa-waypoint" style="position:absolute;">
                <div class="marker-inner" style="position:absolute; transform-origin:center; transition-timing-function:linear; transform:rotate(${ownshipHeading}deg); border-radius:2px; padding:4px; background:magenta;">
                    ${label}
                </div>
                <div class="marker-inner" style="position:absolute; left:0; top:0; width:10px; height:10px; background:blue; border-radius:10px;"></div>
            </div>`,
            iconSize: [ 0, 0 ],
            iconAnchor: [ 10, 10 ]
        });
    }
    /**
     * Utility function, sets the heading of the ownship and rotates the map
     */
    setOwnshipHeading (deg: number, opt?: { nrthup?: boolean, duration?: number }): AirspaceInterface {
        this.navigator_heading = deg;
        const rotation: number = opt?.nrthup ? 0 : -deg;
        // rotate ownship
        this._ownship.setHeading(rotation);
        // rotate map
        const transitionDuration: string = isFinite(opt?.duration) ? `${opt.duration}s`
            : this.animate && !this.forceNoAnimation ? `${this.duration}s` 
            : "0ms";
        for (let i = 0; i < this.$innerDivs.length; i++) {
            this.$innerDivs[i].css({
                transform: `rotate(${rotation}deg)`,
                "transition-duration": transitionDuration,
                "transition-timing-function" : "linear"
            });
        }
        // refresh traffic
        for (let i = 0; i < this._traffic?.length; i++) {
            this._traffic[i].refresh();
        }
        return this;
    }
    /**
     * Utility function, returns the heading of the ownship
     */
    getOwnshipHeading(): number {
        return this.navigator_heading;
    }
    /**
     * Utility function, returns all traffic aircraft
     */
    getTraffic(): AircraftInterface[] {
        return this._traffic;
    }
    /**
     * Utility function, returns a given traffic aircraft
     */
    getTrafficAircraft(ac: string): AircraftInterface {
        if (ac && this._traffic) {
            for (let i = 0; i < this._traffic.length; i++) {
                if (this._traffic[i].getCallSign() === ac) {
                    return this._traffic[i]
                }
            }
        }
        return null;
    }
    /**
     * Internal function, removes all traffic and optionally removes traces and previous traffic
     */
    protected removeAllTraffic (opt?: { removeTraces?: boolean, removePreviousTraffic?: boolean }): void {
        this.previousTrafficPosition = {};
        for (let i = 0; i < this._traffic?.length; i++) {
            this._traffic[i].remove();
            if (!opt?.removePreviousTraffic) {
                this.previousTrafficPosition[this._traffic[i].getCallSign()] = this._traffic[i].getPosition();
            }
        }
        this._traffic = [];
        if (opt?.removeTraces) { this.clearAllTrafficTraces(); }
    }
    /**
     * Updates traffic information.
     */
    setTraffic (traffic: AircraftData[]): AirspaceInterface {
        // const nmiScale: number = this.getScale();
        // remove current traffic, reuse aircraft when possible
        this.removeAllTraffic();
        const canAnimate: boolean = this.animate && !this.forceNoAnimation && this.duration === 1; // animation will be performed only when running in real time
        // add new traffic
        for (let i = 0; i < traffic?.length; i++) {
            const callSign: string = 
                (traffic[i].callSign !== null || traffic[i].callSign !== undefined) 
                    ? traffic[i].callSign 
                    : `target-${i}`;
            const heading: number = Aircraft.headingFromVelocity(traffic[i].v);
            const symbol: string = (traffic[i].symbol !== null || traffic[i].symbol !== undefined) ? traffic[i].symbol : "daa-target";
            const aircraft: LeafletAircraft = new LeafletAircraft(this.lworlds[1], {
                s: canAnimate && this.previousTrafficPosition[callSign] ? 
                    this.previousTrafficPosition[callSign] 
                        : traffic[i].s, // if animation is enables, the aircraft is rendered in the original position and will be moved forward with the animation
                v: traffic[i].v,
                symbol,
                callSign,
                heading,
                callSignVisible: this.callSignVisible,
                aircraftVisible: this.trafficVisible,
                ownship: this._ownship,
                mapCanRotate: !this.godsView,
                layeringMode: this.layeringMode
            }, this.trafficLayer);
            this._traffic.push(aircraft);
            if (!canAnimate) {
                // update traffic trace with the new waypoint
                const waypoint: utils.WayPoint = {
                    lla: { lat: +traffic[i].s.lat, lon: +traffic[i].s.lon, alt: +traffic[i].s.alt }
                };
                this.updateTrafficTrace(callSign, waypoint);
            }
        }
        // move aircraft forward if animation is enabled
        if (canAnimate) {
            // this.updateTrafficAnimationSettings();
            for (let i = 0; i < this._traffic?.length; i++) {
                this._traffic[i].moveTo(traffic[i].s, { animate: true, duration: this.duration, animateCallback: (ac: { callSign: string, s: LatLonAlt<number | string> }): void => {
                    // update traffic trace with the new waypoint
                    const animate_waypoint: utils.WayPoint = {
                        lla: { lat: +ac.s.lat, lon: +ac.s.lon, alt: +ac.s.alt }
                    };
                    this.updateTrafficTrace(ac.callSign, animate_waypoint);
                }});
            }
        }
        return this;
    }
    /**
     * Utility function, hides all traffic in the map
     */
    hideTraffic(): AirspaceInterface {
        for (let i = 0; i < this._traffic?.length; i++) {
            this._traffic[i].hide();
        }
        return this;
    }
    /**
     * Utility function, reveals all traffic in the map
     */
    revealTraffic(): AirspaceInterface {
        for (let i = 0; i < this._traffic?.length; i++) {
            this._traffic[i].reveal();
        }
        return this;
    }
    /**
     * Hides the aircraft call sign
     */
    hideCallSign(): AirspaceInterface {
        this.callSignVisible = false;
        for (let i = 0; i < this._traffic?.length; i++) {
            this._traffic[i].hideCallSign();
        }
        return this;
    }
    /**
     * Reveals the aircraft call sign
     */
    revealCallSign(): AirspaceInterface {
        this.callSignVisible = true;
        for (let i = 0; i < this._traffic?.length; i++) {
            this._traffic[i].revealCallSign();
        }
        return this;
    }
    /**
     * Remove traffic traces
     */
    removeTrafficTrace (ac?: string): AirspaceInterface {
        (ac !== undefined && ac !== null) ?
            this.clearTrafficTrace(ac)
                : this.clearAllTrafficTraces();
        return this;
    }
    /**
     * resets all data structures and remove traces
     */
    resetAirspace (): AirspaceInterface {
        this.removeAllTraffic({ removeTraces: true, removePreviousTraffic: true });
        this.clearOwnshipTrace();
        return this;
    }
    /**
     * @deprecated To be removed
     */
    setLoS (regions: server.DAALosRegion[], opt?: { nmi?: number; }): AirspaceInterface {
        // TODO
        return this;
    }
    /**
     * Adds a geofence polygon, where a geofence can be either a contour or a hazard zone
     * We use a convention to distinguish contours from hazard zones: the ID of a contour starts with "c-"
     */
    addGeoFencePolygon (
        id: string,
        perimeter: LatLon<number | string>[], 
        floor: { top: number | string, bottom: number | string }, 
        opt?: {
            opacity?: number, 
            color?: { r: number, g: number, b: number },
            fontScale?: number,
            showLabel?: boolean
        }
    ) : AirspaceInterface {
        const color: string = utils.getHtmlColor(opt?.color || GeoFence.defaultColor);
        const latlngs: L.LatLngExpression[] = perimeter.map((elem: LatLon<number | string>) => {
            return [ +elem.lat || 0, +elem.lon || 0 ];
        });
        if (id && id.startsWith("c-") && this.contoursLayer) {
            const polygon: L.Polygon = L.polygon(latlngs, {
                color,
                className: `daa-contour ${id}`
            }).addTo(this.contoursLayer);
            this.contours[id] = polygon;
            // update visibility
            this.contoursVisible ? this.revealContours() : this.hideContours();
        } else {
            if (this.hazardZonesLayer) {
                const polygon: L.Polygon = L.polygon(latlngs, {
                    color,
                    className: `daa-hazard-zone ${id}`
                }).addTo(this.hazardZonesLayer);
                this.hazardZones[id] = polygon;
            }
            // update visibility
            this.hazardZonesVisible ? this.revealHazardZones() : this.hideHazardZones();
        }
        return this;
    }
    /**
     * Removes geofence polygon identified by id
     * If id is not specified, all geofence polygons are removed
     */
    removeGeoFencePolygon (id?: string): AirspaceInterface {
        if (id) {
            if (this.contours && this.contours[id]) {
                this.contoursLayer.removeLayer(this.contours[id]);
                delete this.contours[id];
            }
            if (this.hazardZones && this.hazardZones[id]) {
                this.hazardZonesLayer.removeLayer(this.hazardZones[id]);
                delete this.hazardZones[id];
            }
        } else {
            this.contoursLayer?.clearLayers();
            this.contours = {};
            this.hazardZonesLayer?.clearLayers();
            this.hazardZones = {};
        }
        return this;
    }
    /**
     * Reveals flight path
     */
    revealFlightPlan (): AirspaceInterface {
        this.flightPlanVisible = true;
        $(`.${AirspaceCSS.DAA_FLIGHT_PLAN}`).css("display", "block");
        return this;
    }
    /**
     * Hides flight path
     */
    hideFlightPlan (): AirspaceInterface {
        this.flightPlanVisible = false;
        $(`.${AirspaceCSS.DAA_FLIGHT_PLAN}`).css("display", "none");
        return this;
    }
    /**
     * Reveals traffic trace
     */
    revealTrafficTrace (): AirspaceInterface {
        this.trafficTraceVisible = true;
        $(`.${AirspaceCSS.DAA_TRAFFIC_TRACE}`).css("display", "block");
        return this;
    }
    /**
     * Hides flight path
     */
    hideTrafficTrace (): AirspaceInterface {
        this.trafficTraceVisible = false;
        $(`.${AirspaceCSS.DAA_TRAFFIC_TRACE}`).css("display", "none");
        return this;
    }
    /**
     * Reveals ownship trace
     */
    revealOwnshipTrace (): AirspaceInterface {
        this.ownshipTraceVisible = true;
        $(`.${AirspaceCSS.DAA_OWNSHIP_TRACE}`).css("display", "block");
        return this;
    }
    /**
     * Hides flight path
     */
    hideOwnshipTrace (): AirspaceInterface {
        this.ownshipTraceVisible = false;
        $(`.${AirspaceCSS.DAA_OWNSHIP_TRACE}`).css("display", "none");
        return this;
    }
    /**
     * Reveals hazard zones
     */
    revealHazardZones(): AirspaceInterface {
        this.hazardZonesVisible = true;
        $(".daa-hazard-zone").css("display", "block");
        return this;
    }
    /**
     * Hides hazard zones
     */
    hideHazardZones(): AirspaceInterface {
        this.hazardZonesVisible = false;
        $(".daa-hazard-zone").css("display", "none");
        return this;
    }
    /**
     * Reveals contours
     */
    revealContours(): AirspaceInterface {
        this.contoursVisible = true;
        $(".daa-contour").css("display", "block");
        return this;
    }
    /**
     * Hides contours
     */
    hideContours(): AirspaceInterface {
        this.contoursVisible = false;
        $(".daa-contour").css("display", "none");
        return this;
    }
    /**
     * Reveals all geofences (contours + hazard zones)
     */
    revealGeoFence(): AirspaceInterface {
        this.revealContours();
        this.revealHazardZones()
        return this;
    }
    /**
     * Hides all geofences (contours + hazard zones)
     */
    hideGeoFence(): AirspaceInterface {
        this.hideContours();
        this.hideHazardZones()
        return this;
    }
}