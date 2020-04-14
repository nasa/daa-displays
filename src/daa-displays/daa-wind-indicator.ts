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
import * as server from '../daa-server/utils/daa-server';
import { InteractiveMap } from './daa-interactive-map';

const strokeWidth = 8;
// const compassTemplate = require("text!widgets/daa-displays/templates/daa-compass.handlebars");
// const compassBandsTemplate = require("text!widgets/daa-displays/templates/daa-linear-bands-template.handlebars");

// internal class, renders a resolution bug over the compass
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
     * @function <a name="WindIndicator">WindIndicator</a>
     * @description Constructor. Renders a resolution bug over a daa-compass widget.
     * @param id {String} Unique identifier to be assigned to the widget.
     * @param coords { top: number, left: number, width: number, height: number } Position and size of the widget.
     * @memberof module:Compass
     * @instance
     * @inner
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
     * @function <a name="WindIndicator_setAngleTo">setAngleTo</a>
     * @desc Sets the direction of the wind arrow, given in degrees, clockwise rotation, north is 0 deg.
     * @param deg (real) True wind direction
     * @memberof module:Compass
     * @instance
     * @inner
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
     * @function <a name="WindIndicator_setAngleFrom">setAngleFrom</a>
     * @desc Sets the tail of the wind arrow, given in degrees, clockwise rotation, north is 0 deg.
     * @param deg (real) Wind direction (from)
     * @memberof module:Compass
     * @instance
     * @inner
     */
    setAngleFrom(deg: number | string): void {
        const trueWindDirection: number = +deg + 180;
        this.setAngleTo(trueWindDirection);
    }
    /**
     * @function <a name="WindIndicator_getAngle">getAngle</a>
     * @desc Returns the heading angle of the bug, in degrees, clockwise rotation, north is 0 deg.
     * @return {real} Heading angle
     * @memberof module:Compass
     * @instance
     * @inner
     */
    getAngleTo(): number {
        return this.currentAngle;
    }
    getAngleFrom(): number {
        return this.currentAngle + 180;
    }

    setMagnitude (knot: number | string): void {
        this.magnitude = +knot;
        this.refresh();
    }
    getMagnitude(): number {
        return this.magnitude;
    }

    /**
     * @function <a name="WindIndicator_refresh">refresh</a>
     * @desc Triggers re-rendering of the resolution bug.
     * @memberof module:Compass
     * @instance
     * @inner
     */
    refresh(): void {
        const relativeAngle: number = this.currentAngle - this.compassHeading; // angle relative to the compass
        const animationDuration: number = 100;
        $(`#${this.id}-arrow`).css({
            "transition-duration": `${animationDuration}ms`, 
            transform: `rotate(${relativeAngle}deg)`
        });
        const fromDirection: number = (relativeAngle + 180) % 360; // +180 gives the angle from where the wind blows -- this is the way pilots indicate wind angles
        $(`#${this.id}-deg`).text(Math.floor(fromDirection)); // display only integer part for angles
        $(`.${this.id}-deg`).css({ 
            display: (this.magnitude) ? "block" : "none"  // hide arrow and rotation value if there's no wind 
        });

        const mag: number = Math.floor(this.magnitude * 100) / 100; // display max 2 decimal digits
        $(`#${this.id}-knot`).text(mag);
    }
    reveal (): void {
        $(`#${this.id}`).css({ "display": "block"});
    }
    hide (): void {
        $(`#${this.id}`).css({ "display": "none"});
    }

    setHeading (compassHeading: number): void {
        this.compassHeading = compassHeading;
        this.refresh();
    }
}