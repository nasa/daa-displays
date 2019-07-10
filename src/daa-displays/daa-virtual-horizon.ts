/**
 * @module VirtualHorizon
 * @version 2018.12.01
 * @description <div style="display:flex;"><div style="width:50%;">
 *              <b>Virtual Horizon Widget.</b>
 *              <p>This widget presents roll and pitch of the ownship relative
 *              to the actual horizon. A linear tape indicates the pitch angle in degrees. The
 *              tape scrolls vertically when the aircraft pitch changes. The tape can also rotate,
 *              acting like a virtual gauge indicating the roll angle on a graduated arc. The
 *              background is color coded (blue/brown) to facilitate the identification of pitch angles.</p>
 *              <p>This implementation requires the installation of the pvsio-web toolkit 
 *              (<a href="http://www.pvsioweb.org" target=_blank>www.pvsioweb.org</a>).</p>
 *              <p>Google Chrome is recommended for correct rendering of the simulation controls.</p></div>
 *              <img src="images/daa-virtual-horizon.png" style="margin-left:8%; max-height:250px;" alt="DAA Virtual Horizon Widget"></div>
 * @example
// file index.js (to be stored in pvsio-web/examples/demos/daa-displays/)
require.config({
    paths: { 
        widgets: "../../client/app/widgets",
        text: "../../client/app/widgets/daa-displays/lib/text/text"
    }
});
require(["widgets/daa-displays/daa-virtual-horizon"], function (VirtualHorizon) {
    "use strict";
    const virtualHorizon = new VirtualHorizon("virtual-horizon", {
        top: 54, left: 108
    });
    virtualHorizon.setPitch(10);
    virtualHorizon.setRoll(30);
});

// file index.html (to be stored in pvsio-web/examples/demos/daa-displays/)
<!DOCTYPE HTML>
<html>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible">
        <title></title>
        <meta name="viewport" content="width=device-width">
        <link rel="stylesheet" href="../../client/app/widgets/daa-displays/lib/bootstrap/4.1.3/css/bootstrap.min.css">
        <link rel="stylesheet" href="../../client/app/widgets/daa-displays/lib/font-awesome/5.6.1/css/all.min.css">
        <link rel="stylesheet" href="../../client/app/widgets/daa-displays/css/daa-displays.css">
    </head>
    <script src="../../client/app/widgets/daa-displays/lib/underscore/underscore.js"></script>
    <script src="../../client/app/widgets/daa-displays/lib/jquery/jquery-3.3.1.slim.min.js"></script>
    <script src="../../client/app/widgets/daa-displays/lib/popper/popper-1.14.3.min.js"></script>
    <script src="../../client/app/widgets/daa-displays/lib/bootstrap/4.1.3/bootstrap.min.js"></script>
    <script src="../../client/app/widgets/daa-displays/lib/handlebars/handlebars-v4.0.12.js"></script>
    <script src="../../client/app/widgets/daa-displays/lib/requireJS/require.js" data-main="index.js"></script>
</html>

 * @author Paolo Masci
 * @date October 2018
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
import * as templates from './templates/daa-virtual-horizon-templates';

export class VirtualHorizon {
    id: string;
    top: number;
    left: number;
    bands: utils.Bands;
    div: HTMLElement;

    /**
     * @function <a name="VirtualHorizon">VirtualHorizon</a>
     * @description Constructor.
     * @param id {String} Unique widget identifier.
     * @param coords {Object} The four coordinates (top, left, width, height) of the widget, specifying
     *        the left/top corners, and the width/height of the (rectangular) widget area.
     *        Default is { top: 111, left: 209, width: 1050, height: 844 }.
     *        FIXME: The current implementation support only a fixed size, 1050x844. 
     * @param opt {Object} Style options defining the visual appearance of the widget.
     *          <li>parent (String): the HTML element where the widget will be appended (default is "body")</li>
     * @memberof module:VirtualHorizon
     * @instance
     */
    constructor (id, coords, opt) {
        this.id = id;
        opt = opt || {};
        coords = coords || {};
        this.top = coords.top || 0;
        this.left = coords.left || 0;
        this.div = utils.createDiv(id, { parent: opt.parent });
        let theHTML = Handlebars.compile(templates.virtualHorizonTemplate)({
            id: this.id,
            top: this.top,
            left: this.left,
            baseUrl: utils.baseUrl
        });
        $(this.div).html(theHTML);
        let levels = [];
        for (let i = 1; i < 36; i++) {
            levels.push({
                name: (i % 19) ? (i % 19) * 10 : "", // level 0 does not have a label
                top: (i < 19) ? i * 111 : -(i - 19) * 111
            });
        }
        theHTML = Handlebars.compile(templates.virtualHorizonLevelsTemplate)({
            levels: levels
        });
        $("#" + this.id + "-levels").html(theHTML);
    }
    /**
     * @function <a name="setPitch">setPitch</a>
     * @description Sets the pitch value.
     * @param deg {real} Pitch angle. Default units is degrees.
     * @param opt {Object} Options:
     *             <li>units (String): "rad", indicates that the pitch angle is given in radians.
     *                                 The widget will automatically convert the angle to degrees.</li>
     * @memberof module:VirtualHorizon
     * @instance
     */
    setPitch (deg: number, opt?) {
        opt = opt || {};
        let angle = (opt.units === "rad") ? utils.rad2deg(deg) : deg;
        angle = angle % 180;
        let tickHeight = 110; // 110 px corresponds to 10 degrees on the linear tape, measure obtained by inspecting the DOM
        let px = angle / 10 * tickHeight;
        $("." + this.id + "-pitch").css("transition-duration", "500ms").css("transform", "translateY(" + px + "px)");
        return this;
    }
    /**
     * @function <a name="setRoll">setRoll</a>
     * @description Sets the roll value.
     * @param deg {real} Roll angle. Default units is degrees.
     * @param opt {Object} Options:
     *             <li>units (String): "rad", indicates that the roll angle is given in radians.
     *                                 The widget will automatically convert the angle to degrees.</li>
     * @memberof module:VirtualHorizon
     * @instance
     */
    setRoll (deg: number, opt?) {
        opt = opt || {};
        let angle = (opt.units === "rad") ? utils.rad2deg(deg) : deg;
        $("#" + this.id + "-angle").css("transition-duration", "500ms").css("transform", "rotate(" + angle + "deg)");
        return this;
    }
}