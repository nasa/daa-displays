/**
 * @module TailNumberIndicator
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
import * as templates from './templates/daa-tail-number-templates';

/**
 * Renders a tail number indicator box, including:
 * - a label indicating the ownship tail number
 */
export class TailNumberIndicator {
    protected id: string;
    protected top: number;
    protected left: number;
    protected width: number;
    protected height: number;
    protected div: HTMLElement;

    protected tailNumber: string = "";

    /**
     * Constructor. Renders a tail number box.
     * @param id {String} Unique identifier to be assigned to the widget.
     * @param coords { top: number, left: number, width: number, height: number } Position and size of the widget.
     */
    constructor (id: string, coords: utils.Coords, opt?: { parent?: string}) {
        opt = opt || {};
        this.id = id || "daa-tail-number";

        coords = coords || {};
        this.top = (isNaN(+coords.top)) ? 690 : +coords.top;
        this.left = (isNaN(+coords.left)) ? 195 : +coords.left;
        this.height = (isNaN(+coords.height)) ? 32 : +coords.height;
        this.width = (isNaN(+coords.width)) ? 140 : +coords.width;

        // create div element
        this.div = utils.createDiv(id, { parent: opt.parent, zIndex: 2 });
        const theHTML = Handlebars.compile(templates.tailNumberTemplate)({
            id: this.id,
            top: this.top,
            left: this.left,
            width: this.width,
            height: this.height,
            color: "white",
            tailNumber: this.tailNumber
        });
        $(this.div).html(theHTML);
        this.refresh();
    }
    /**
     * Sets the tail number
     */
    setTailNumber (tailNumber: string): void {
        this.tailNumber = tailNumber;
        this.refresh();
    }
    /**
     * Returns the tail number
     */
    getTailNumber (): string {
        return this.tailNumber;
    }
    /**
     * Internal function, triggers re-rendering of the indicator
     */
    refresh(): void {
        $(`#${this.id}-tail-number`).text(this.tailNumber);
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
}