/**
 * @module LeafletAircraft
 * @date 2022.25.01
 * @author Paolo Masci
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

import * as L from 'leaflet';
import { DaaSymbol } from '../daa-interactive-map';
import { Aircraft, AircraftInterface, AircraftLabel, alert2symbol } from "./daa-aircraft";
import { LatLonAlt, Vector3D } from './daa-airspace';

const icons: {[key:string]: string } = {
    "daa-alert": "daa-displays/svgs/daa-alert.svg",
    "daa-traffic-avoid": 'daa-displays/svgs/daa-traffic-avoid.svg',
    "daa-traffic-monitor": "daa-displays/svgs/daa-traffic-monitor.svg",
    "daa-target": "daa-displays/svgs/daa-target.svg",
    "daa-ownship": "daa-displays/svgs/ownship.svg",
    "ownship": "daa-displays/svgs/ownship.svg"
};

export const LEAFLET_LAT_RANGE: [ number, number] = [-90, 90];
export const LEAFLET_LON_RANGE: [ number, number] = [-720, 720];
export const MARKER_SIZE: number = 52; //px

/**
 * Leaflet Aircraft class, renders a daa aircraft symbol as a custom leaflet marker
 */
export class LeafletAircraft extends Aircraft {
    protected map: L.Map; // leafletjs world
    protected layer: L.Layer; // layer where the symbol is rendered
    protected symbol: DaaSymbol; // current symbol
    protected marker: L.Marker; // pointer to the renderable aircraft marker
    // protected label: L.Marker; // pointer to the renderable aircraft label (this is separate from the marker because the label rotates based on the ownship heading to be rendered upright while the marker rotates based on the traffic heading)

    // reference aircraft -- this is used for the aircraft label, which shows relative altitude
    protected _own: AircraftInterface;

    // flags
    protected aircraftVisible: boolean; // whether the aircraft is visible
    protected callSignVisible: boolean; // whether the call sign is visible
    protected mapCanRotate: boolean; // whether the label should be automatically rotated, e.g., to be always upright when in ownship centric view

    /**
     * Constructor, creates an aircraft instance and appends the aircraft to the map
     */
    constructor (map: L.Map, desc: { 
        s: LatLonAlt,
        v?: Vector3D,
        heading: number, 
        callSign: string, 
        symbol: DaaSymbol,
        ownship?: AircraftInterface,
        callSignVisible?: boolean,
        aircraftVisible?: boolean,
        mapCanRotate?: boolean,
        zIndex?: number
    }, layer: L.Layer) {
        super(desc?.callSign, { lat: +desc?.s?.lat || 0, lon: +desc?.s?.lon || 0, alt: +desc?.s?.alt || 0 });

        this.map = map;
        this.layer = layer; // This layers is used to render the aircraft
        this.symbol = desc?.symbol || "daa-target";
        this.heading = desc?.heading || 0;
        this.velocity = {
            x: +desc?.v?.x || 0,
            y: +desc?.v?.y || 0,
            z: +desc?.v?.z || 0
        };
        this._own = desc?.ownship;
        this.aircraftVisible = !!desc.aircraftVisible;
        this.callSignVisible = !!desc.callSignVisible;
        this.mapCanRotate = desc.mapCanRotate === undefined ? true : !!desc.mapCanRotate; // true by default

        // create custom marker and append marker to the map
        const icon: L.DivIcon = this.createAircraftIcon();
        this.marker = L.marker([ this.position.lat, this.position.lon ]).setIcon(icon).setZIndexOffset(isNaN(+desc?.zIndex) ? +desc?.zIndex : 0);
        this.marker.addTo(this.map);

        // set visiblity of the aircraft
        this.aircraftVisible ? this.reveal() : this.hide();

        // uncomment the following line to visually check the ac position against the leaflet marker position
        // if the ac position is correct, the leaflet marker is at the center of the ac icon
        // L.marker([ this.position.lat, this.position.lon ]).addTo(this.map);
    }
    /**
     * Internal function, returns the color of the aircraft based on the alert level
     */
    protected getAircraftColor (): string {
        switch (this.symbol) {
            case "daa-alert": { return "red"; }
            case "daa-traffic-avoid": { return "yellow"; }
            case "daa-traffic-monitor": { return "yellow"; }
            case "daa-target": { return "white"; }
            case "ownship":
            case "daa-ownship": { return "#00fdfe"; }
            default: return "transparent"
        }
    }
    /**
     * Forces rendering refresh
     */
    refresh (): void {
        const icon: L.DivIcon = this.createAircraftIcon();
        this.marker.setLatLng([ this.position.lat, this.position.lon ]).setIcon(icon);
    }
    /**
     * Internal function, creates the DOM element for the aircraft marker
     */
    protected createAircraftIcon (): L.DivIcon {
        const aircraftHeading: number = this.heading || 0;
        const ownshipHeading: number = this._own?.getHeading() || 0;
        const label: AircraftLabel = this.symbol === "ownship" || this.symbol === "daa-ownship" ? 
            this.createCallSignLabel({ ownship: this._own }) 
                : this.createTrafficLabel({ ownship: this._own });
        const labelRotation: number = this.mapCanRotate ? -(ownshipHeading + aircraftHeading) : -aircraftHeading;
        const marginLeft: number = (this.symbol == "ownship" || this.symbol == "daa-ownship" || this.symbol === "daa-target") ? 9 : 0;
        const lineHeight: number = label.offsetY < 0 ? 1.2 * MARKER_SIZE : 4.8 * MARKER_SIZE;
        const oppositeLineHeight: number = label.offsetY < 0 ? 4.8 * MARKER_SIZE : 1.2 * MARKER_SIZE;
        const labelSize: number = 3 * MARKER_SIZE;
        
        // all symbols have a square form factor, except ownship and target, and we need to take that into account when positioning the icon
        return new L.DivIcon({
            html: `
            <div style="position:absolute; top:-30px; left:-28px;">
                <div class="marker-inner" style="position:absolute; transform-origin:center; transform:rotate(${aircraftHeading}deg); width:${MARKER_SIZE}px; height:${MARKER_SIZE}px;">
                    <img src="${icons[this.symbol]}" height=${MARKER_SIZE} style="position:absolute; margin-left:${marginLeft}px;"></img>
                    <div class="daa-label" style="position:absolute; text-align:center; width:${labelSize}px; height:${labelSize}px; top:${-MARKER_SIZE}px; left:${-MARKER_SIZE}px; line-height:${lineHeight}px; transform-origin:center; transform:rotate(${labelRotation}deg);">
                        <div style="color:${this.getAircraftColor()}">${label.text}</div>
                    </div>
                    <div class="daa-label call-sign" style="display:${this.callSignVisible ? "block" : "none"}; position:absolute; text-align:center; width:${labelSize}px; height:${labelSize}px; top:${-MARKER_SIZE}px; left:${-MARKER_SIZE}px; line-height:${oppositeLineHeight}px; transform-origin:center; transform:rotate(${labelRotation}deg);">
                        <div style="color:${this.getAircraftColor()}">${this.callSign}</div>
                    </div>
                </div>
            </div>`,
            iconSize: [ 0, 0 ],
            className: (this.symbol == "ownship" || this.symbol == "daa-ownship") ? "daa-ownship" : "daa-traffic"
        });
    }
    /**
     * deleted the aircraft (marker+label)
     */
    remove (): LeafletAircraft {
        this.marker.removeFrom(this.map);
        // this.label.removeFrom(this.map);
        return this;
    }
    /**
     * Stores information about the reference aircraft, i.e., the ownship
     */
    setReferenceAircraft (ownship: LeafletAircraft): LeafletAircraft {
        this._own = ownship;
        return this;
    }
    /**
     * Sets the aircraft symbol
     */
    setSymbol (daaSymbol?: string | number): LeafletAircraft {
        if (daaSymbol) {
            const symbol: string = (typeof daaSymbol === "string") ? daaSymbol : alert2symbol(+daaSymbol);
            if (symbol !== this.symbol) {
                this.symbol = symbol;
                const icon: L.DivIcon = this.createAircraftIcon();
                this.marker.setIcon(icon);
            }
        }
        return this;
    }
    /**
     * Set aircraft heading
     */
    setHeading (deg: number) {
        if (!isNaN(deg)) {
            this.heading = deg;
            const elem: HTMLElement = this.marker.getElement();
            if (elem) {
                // rotate element
                $(elem).css({ transform: `rotate(${this.heading}deg);`});
            } else {
                console.warn("[leaflet-aircraft] Warning: unable to set heading (could not find ac in DOM)");
            }
        }
        return this;
    }
    /**
     * Reveals call sign
     */
    revealCallSign (): LeafletAircraft {
        this.callSignVisible = true;
        this.refresh();
        return this;
    }
    /**
     * Hides call sign
     */
    hideCallSign (): LeafletAircraft {
        this.callSignVisible = false;
        this.refresh();
        return this;
    }
    /**
     * Reveals the aircraft marker and label
     */
    reveal (): LeafletAircraft {
        this.marker.setOpacity(1);
        return this;
    }
    /**
     * Hides the aircraft and label
     */
    hide (): LeafletAircraft {
        this.marker.setOpacity(0);
        return this;
    }
}