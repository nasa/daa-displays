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

import { VFR_CHARTS } from "aeronav/vfr-charts";
import * as utils from "../daa-utils";
import * as server from "../utils/daa-server";
import { Aircraft, AircraftInterface } from "./daa-aircraft";
import { AirspaceInterface, cities, LatLon, LatLonAlt, Vector3D } from "./daa-airspace";
import * as L from "leaflet";
import { DEFAULT_MAP_HEIGHT, DEFAULT_MAP_WIDTH, MAP_WIDESCREEN_WIDTH } from "../daa-interactive-map";
import { LeafletAircraft } from "./leaflet-aircraft";
import { GeoFence } from "./daa-geofence";

// font size/family used for labels
export const FONT_SIZE: number = 28; //px
export const FONT_FAMILY: string = "sans-serif";

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
    ownship: 30,
    contour: 40,
    hazards: 50,
    traffic: 60
};

/**
 * Airspace implemented with Leafletjs
 */
export class LeafletAirspace implements AirspaceInterface {
    // map object where the airspace layers will be renderes
    protected lworld: L.Map;

    // airspace layers for rendering different kind of objects
    protected ownshipLayer: L.Layer; // ownship layer
    protected trafficLayer: L.LayerGroup; // traffic layer
    protected streetLayer: L.Layer; // openmap street layer
    protected vfrLayer: L.LayerGroup; // vfr charts layer
    protected flightPlanLayer: L.LayerGroup; // flight plan layer
    protected contoursLayer: L.LayerGroup; // contours layer
    protected hazardZonesLayer: L.LayerGroup; // hazard zones layer

    // parent DOM element where the aerospace will be created
    protected $div: JQuery<HTMLElement>;

    // inner div, used for map rotations
    protected $innerDiv: JQuery<HTMLElement>;

    // ownship
    protected _ownship: LeafletAircraft;
    // traffic
    protected _traffic: LeafletAircraft[] = [];
    // contours
    protected contours: {[id: string]: L.Polygon} = {};
    // hazard zones
    protected hazardZones: {[id: string]: L.Polygon} = {};

    // navigator heading, keeps track of the ownship heading in nrthup mode
    protected navigator_heading: number = 0;

    // nmi shown in the view
    protected nmi: number;

    // flags
    protected godsView: boolean; // whether the view is airspace-centric (true) or ownship-centric (false)
    protected callSignVisible: boolean; // whether call signs are visible
    protected trafficVisible: boolean; // whether traffic aircraft are visible
    protected hazardZonesVisible: boolean = false; // whether hazard zones are visible
    protected contoursVisible: boolean = false; // whether contours are visible
    protected flightPlanVisible: boolean = false; // whether the flight path is visible

    /**
     * Constructor
     */
    constructor(opt?: { 
        ownship?: LatLonAlt, 
        traffic?: { s: LatLonAlt, v: Vector3D, symbol: string, callSign: string }[], 
        flightPath?: utils.FlightPlan,
        div?: string, // div where the airspace will be rendered
        godsView?: boolean, 
        los?: boolean, 
        callSignVisible?: boolean, // default: false
        trafficVisible?: boolean,  // default: true
        flightPlanVisible?: boolean, // default: false
        widescreen?: boolean // default: false
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
        this.trafficVisible = opt.trafficVisible !== undefined ? !!opt.trafficVisible : true;
        this.flightPlanVisible = !!opt.flightPlanVisible;

        const width: number = opt?.widescreen ? MAP_WIDESCREEN_WIDTH : DEFAULT_MAP_WIDTH;
        const height: number = DEFAULT_MAP_HEIGHT;
        // append required stylesheet to head
        // the map is artificially grown 3x larger to enable view rotations in ownship-centric mode
        $("head").append(`<style>
        .leaflet-vfr-chart {
            filter: brightness(60%);
        }
        .leaflet-tile {
            filter: brightness(60%) contrast(120%);
        }
        .daa-flight-plan {
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
            text-shadow: 1px 1px black;
            filter: drop-shadow(2px 2px 1px black);
            -webkit-filter: drop-shadow(2px 2px 1px black);
            white-space:nowrap;
        }
        .leaflet-top {
            margin-top: 40px;
        }
        #${opt.div}-inner {
            width: ${this.godsView ? width : 3 * width}px !important;
            height: ${this.godsView ? height : 3 * height}px !important;
            top: ${this.godsView ? 0 : -height}px !important;
            left: ${this.godsView ? 0 : -width}px !important;
        }
        </style>`);

        // parent div
        this.$div = $(`#${opt.div}`);

        // we use two divs to implement a rotate map functionality
        // the outer div is the div provided by the user, and defines the dimensions of the view
        // the inner div is for the leaflet map, whose size will be larger than the outer div so map tiles are not missing when rotating the rectangular map
        const innerDiv: HTMLElement = utils.createDiv(`${opt.div}-inner`, {
            parent: opt.div
        });
        this.$innerDiv = $(innerDiv);
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

        // create leaflet view in the div
        this.lworld = L.map(`${opt.div}-inner`, {
            center: [ +opt?.ownship?.lat, +opt?.ownship?.lon ],
            zoom: 12, // 12 is 5 NMI
            zoomSnap: this.godsView ? 1 : 0.0005, // this accuracy is needed for NMI lower than 1
            zoomDelta: this.godsView ? 1 : 0.0005,
            zoomControl: this.godsView,
            layers: [
                this.streetLayer,
                this.vfrLayer,
                this.flightPlanLayer,
                this.contoursLayer,
                this.hazardZonesLayer,
                this.trafficLayer
            ]
        });
        // add scale to the map
        L.control.scale().addTo(this.lworld);

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
        this._ownship = new LeafletAircraft(this.lworld, {
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
        this.$innerDiv.find(`#map-div`).css({
            "pointer-events": "none",
            "touch-action": "none"
        });
    }
    /**
     * Internal function, creates a street layer
     */
    protected createStreetLayer (): void {
        this.streetLayer = L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
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
     * Tries to set the zoom level to the given NMI
     * Valid NMI levels range between [0.08..320]
     */
    trySetZoomLevel(NMI: number): boolean {
        if (NMI >= 0.08 && NMI <= 320) {
            this.setZoomLevel(NMI);
            return true;
        }
        return false;
    }
    /**
     * Sets zoom level of the view to the given NMI
     * In leafletjs, a zoom level of 12 is approx 5NMI
     * increasing the zoom level by 1 halves the NMI
     * decreasing the zoom level by 1 doubles the NMI
     */
    setZoomLevel(NMI: number): AirspaceInterface {
        if (NMI !== this.nmi && NMI > 0) {
            const zoom: number = nmi2zoom(NMI);
            if (zoom > 0) {
                this.lworld.setZoom(zoom, {
                    animate: false
                });
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
    recenter(pos: { lat: number; lon: number; }): AirspaceInterface {
        if (pos) {
            const currentPosition: LatLon = this._ownship?.getPosition();
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
    goTo(pos: LatLon): AirspaceInterface {
        if (pos) {
            this.lworld.panTo([ +pos.lat, +pos.lon ], {
                animate: false
            });
        }
        return this;
    }
    /**
     * Set ownship position and centers the map on the ownship
     */
    setPosition(pos: LatLonAlt) {
        this.setOwnshipPosition(pos);
        return this.goTo(pos);
    }
    /**
     * Set ownship position
     */
    setOwnshipPosition(pos: string | LatLonAlt): AirspaceInterface {
        if (pos) {
            if (typeof pos === "string") {
                // remove white spaces in the name and make all small letters
                pos = pos.replace(/\s/g, "").toLowerCase();
                // look for the name of the city in the list of known destinations (array cities)
                const loc: LatLonAlt = cities[pos];
                if (loc) {
                    this._ownship?.setPosition(loc);
                    this._ownship?.refresh();
                } else {
                    console.error("Could not find location " + location + " :((");
                }
            } else {
                const position: utils.LatLonAlt = {
                    alt: +pos?.alt || 0,
                    lat: +pos?.lat || 0,
                    lon: +pos?.lon || 0,
                };
                this._ownship?.setPosition(position);
                this._ownship?.refresh();
            }
        } else {
            console.error("Incorrect aircraft position :/ ", pos);
        }
        return this;
    }
    /**
     * Set ownship velocity
     */
    setOwnshipVelocity(v: Vector3D): AirspaceInterface {
        if (v) {
            this._ownship.setVelocity(v);
        }
        return this;
    }
    /**
     * Sets a flight plan
     */
    setFlightPlan(flightPlan: utils.FlightPlan): AirspaceInterface {
        if (flightPlan) {
            const color: string = "magenta";
            const latlngs: L.LatLngExpression[] = flightPlan?.map((elem: utils.WayPoint) => {
                return [+elem?.lla?.lat || 0, +elem?.lla?.lon || 0];
            }) || [];
            const labels: string[] = flightPlan?.map((elem: utils.WayPoint) => {
                return elem?.label || "";
            }) || [];
            // append polyline and waypoint
            if (latlngs?.length) {
                L.polyline(latlngs, {
                    color,
                    weight: 6, // stroke width
                    className: `daa-flight-plan`
                }).addTo(this.flightPlanLayer);
                for (let i = 0; i < latlngs.length; i++) {
                    const icon: L.DivIcon = this.createWaypointIcon(labels[i]);
                    L.marker(latlngs[i], {
                        zIndexOffset: -1 // this will instruct leaflet to render the label under traffic markers
                    }).setIcon(icon).addTo(this.flightPlanLayer);
                }
            }
            // update visibility
            this.flightPlanVisible ? this.revealFlightPlan() : this.hideFlightPlan();
        }
        return this;
    }
    /**
     * Internal function, creates the DOM element for a waypoint marker
     */
    protected createWaypointIcon (label?: string): L.DivIcon {
        label = label || "";
        const ownshipHeading: number = this._ownship?.getHeading() || 0;
        return new L.DivIcon({
            html: `
            <div class="daa-flight-plan daa-waypoint" style="position:absolute;">
                <div class="marker-inner" style="position:absolute; transform-origin:center; transform:rotate(${ownshipHeading}deg); border-radius:2px; padding:4px; background:magenta;">
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
    setOwnshipHeading(deg: number, opt?: { nrthup?: boolean; }): AirspaceInterface {
        this.navigator_heading = deg;
        const rotation: number = opt?.nrthup ? 0 : -deg;
        // rotate ownship
        this._ownship.setHeading(rotation);
        // rotate map
        this.$innerDiv.css({
            transform: `rotate(${rotation}deg)`,
            "transition-duration": `40ms`
        });
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
     * Utility function, returns the traffic vector
     */
    getTraffic(): AircraftInterface[] {
        return this._traffic;
    }
    /**
     * Internal function, removes all traffic
     */
    protected removeAllTraffic (): void {
        for (let i = 0; i < this._traffic?.length; i++) {
            this._traffic[i].remove();
        }
        this._traffic = [];
    }
    /**
     * Updates traffic information.
     */
    setTraffic(traffic: { s: LatLonAlt; v: Vector3D; symbol: string; callSign: string; }[]): AirspaceInterface {
        // const nmiScale: number = this.getScale();
        // remove current traffic
        this.removeAllTraffic();
        // add new traffic
        for (let i = 0; i < traffic?.length; i++) {
            const aircraft = new LeafletAircraft(this.lworld, {
                s: traffic[i].s,
                v: traffic[i].v,
                symbol: (traffic[i].symbol !== null || traffic[i].symbol !== undefined) ? 
                    traffic[i].symbol : "daa-target",
                callSign: (traffic[i].callSign !== null || traffic[i].callSign !== undefined) ?
                    traffic[i].callSign : `target-${i}`,
                heading: Aircraft.headingFromVelocity(traffic[i].v),
                callSignVisible: this.callSignVisible,
                aircraftVisible: this.trafficVisible,
                ownship: this._ownship,
                mapCanRotate: !this.godsView
            }, this.trafficLayer);
            this._traffic.push(aircraft);
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
        perimeter: LatLon[], 
        floor: { top: number | string, bottom: number | string }, 
        opt?: {
            opacity?: number, 
            color?: { r: number, g: number, b: number },
            fontScale?: number,
            showLabel?: boolean
        }
    ) : AirspaceInterface {
        const color: string = utils.getHtmlColor(opt?.color || GeoFence.defaultColor);
        const latlngs: L.LatLngExpression[] = perimeter.map((elem: LatLon) => {
            return [+elem.lat || 0, +elem.lon || 0];
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
        $(".daa-flight-plan").css("display", "block");
        return this;
    }
    /**
     * Hides flight path
     */
    hideFlightPlan (): AirspaceInterface {
        this.flightPlanVisible = false;
        $(".daa-flight-plan").css("display", "none");
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