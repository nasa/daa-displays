/**
 * @module WindIndicator
 * @description <div style="display:flex;"><div style="width:50%;">
 *              <b>Wind Indicator Widget.</b>
 *              <p>This widget presents the true wind direction as a labelled arrow.
 *              The direction of the arrow is the true wind direction. 
 *              The label indicates magnitude and true wind direction.
 * @author Paolo Masci
 * @date 2020.04.13
 * @copyright 
 * Copyright 2016 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration. No
 * copyright is claimed in the United States under Title 17, 
 * U.S. Code. All Other Rights Reserved.
 * <br>
 * Disclaimers
 * <br>
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
 * <br>
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
import * as utils from './daa-utils';
import * as templates from './templates/daa-wind-templates';

/**
 * Renders a wind indicator box, including:
 * - a label indicating the speed magnitute
 * - an arrow indicating the speed direction
 */
export class WindIndicator {
    protected id: string;
    protected top: number;
    protected left: number;
    protected width: number;
    protected height: number;
    protected div: HTMLElement;

    protected currentAngle: number = 0;
    protected previousAngle: number = 0;
    protected compassHeading: number = 0;

    protected magnitude: number = 0;

    /**
     * Constructor. Renders a wind indicatorr
     * @param id {String} Unique identifier to be assigned to the widget.
     * @param coords { top: number, left: number, width: number, height: number } Position and size of the widget.
     */
    constructor (id: string, coords: utils.Coords, opt?: { parent?: string}) {
        opt = opt || {};
        this.id = id || "daa-wind";

        coords = coords || {};
        this.top = (isNaN(+coords.top)) ? 690 : +coords.top;
        this.left = (isNaN(+coords.left)) ? 195 : +coords.left;
        this.height = (isNaN(+coords.height)) ? 60 : +coords.height;
        this.width = (isNaN(+coords.width)) ? 140 : +coords.width;

        // create div element
        this.div = utils.createDiv(id, { parent: opt.parent, zIndex: 2 });
        const theHTML = Handlebars.compile(templates.windTemplate)({
            id: this.id,
            top: this.top,
            left: this.left,
            width: this.width,
            height: this.height,
            color: "white"
        });
        $(this.div).html(theHTML);
        this.refresh();
    }
    /**
     * Sets the direction of the wind arrow, given in degrees, clockwise rotation, north is 0 deg.
     * @param deg (real) True wind direction
     */
    setAngleTo(deg: number | string): void {
        if (isFinite(+deg)) {
            this.previousAngle = (isNaN(this.previousAngle)) ? +deg : this.currentAngle;
            const c_rotation: number = Math.abs((((+deg - this.previousAngle) % 360) + 360) % 360); // counter-clockwise rotation
            const cC_rotation: number = Math.abs((c_rotation - 360) % 360); // clockwise rotation
            this.currentAngle = (c_rotation < cC_rotation) ? this.previousAngle + c_rotation : this.previousAngle - cC_rotation;
            this.reveal();
            this.refresh();
        } else {
            this.hide();
        }
    }
    /**
     * Sets the tail of the wind arrow, given in degrees, clockwise rotation, north is 0 deg.
     * @param deg (real) Wind direction (from)
     */
    setAngleFrom(deg: number | string): void {
        const trueWindDirection: number = +deg + 180;
        this.setAngleTo(trueWindDirection);
    }
    /**
     * Returns the direction of the wind, in degrees, clockwise rotation, north is 0 deg.
     */
    getAngleTo (): number {
        return this.currentAngle;
    }
    /**
     * Returns the origin of the wind, in degrees, clockwise rotation, north is 0 deg.
     */
    getAngleFrom (): number {
        return this.currentAngle + 180;
    }
    /**
     * Sets the magnitude of the wind
     */
    setMagnitude (knot: number | string): void {
        this.magnitude = +knot;
        this.refresh();
    }
    /**
     * Returns the magnitude of the wind
     */
    getMagnitude(): number {
        return this.magnitude;
    }
    /**
     * Internal function, triggers re-rendering of the indicator
     * Note: when the compass is track up, the direction of the wind indicator is rotated to take into account the compass rotation
     *       This correction is not applied to the value of the wind indicator, which keeps showing the actual angle (from) of the wind
     */
    refresh(): void {
        const relativeAngle: number = this.currentAngle - Math.round(this.compassHeading); // angle relative to the compass
        const animationDuration: number = 100;
        $(`#${this.id}-arrow`).css({
            "transition-duration": `${animationDuration}ms`, 
            transform: `rotate(${relativeAngle}deg)`
        });
        const fromDirection: number = (this.currentAngle + 180) % 360; // +180 gives the angle from where the wind blows -- this is the way pilots indicate wind angles
        $(`#${this.id}-deg`).text(Math.floor(fromDirection)); // display only integer part for angles, round to the nearest integer
        $(`.${this.id}-deg`).css({ 
            display: (this.magnitude) ? "block" : "none"  // hide arrow and rotation value if there's no wind 
        });

        const mag: number = Math.floor(this.magnitude * 100) / 100; // display max 2 decimal digits
        $(`#${this.id}-knot`).text(mag);
    }
    /**
     * Reveal wind indicator
     */
    reveal (): void {
        $(`#${this.id}`).css({ "display": "block"});
    }
    /**
     * Hide wind indicator
     */
    hide (): void {
        $(`#${this.id}`).css({ "display": "none"});
    }
    /**
     * Inputs the current compass heading and uses it to adjust the wind indicator
     */
    currentHeading (compassHeading: number): void {
        this.compassHeading = compassHeading;
        this.refresh();
    }
}