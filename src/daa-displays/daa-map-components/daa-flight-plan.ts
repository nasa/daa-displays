/**
 * @module DAA_FlightPlan
 * @date 2021.11.06
 * @description <div style="display:flex;"><div style="width:50%;">
 *              <b>DAA Flight Plan.</b>
 *              <p>This widget renders a flight plan, including labelled waypoints and segments between waypoints.</p>
 *              </div>
 *              </div>
 * 
 * @author Paolo Masci
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

import * as WorldWind from '../wwd/worldwind.min';
import * as utils from '../daa-utils';
import * as serverInterface from '../utils/daa-server';
import { COLORS } from '../utils/daa-utils';

export const waypointLibrary: string = utils.baseUrl + "/images/";
export const waypointImages: string[] = [
    "waypoint.png"
];

// offset for waypoint labels
const OFFSET: { x: number, y: number } = { x: 5, y: 40 };
 
/**
 * Renders waypoints and paths between waypoints
 */
export class DAA_FlightPlan {
    // list of waypoints and segments composing the flight path
    protected waypoints: {
        placemark: WorldWind.Placemark, 
        pos: WorldWind.Position
    }[] = [];
    protected segments: WorldWind.SurfacePolygon[] = [];
    // layer where the placemarks will be rendered
    protected layer: WorldWind.RenderableLayer;

    /**
     * Constructor
     */
    constructor (layer: WorldWind.RenderableLayer) {
        this.layer = layer;
    }

    /**
     * Adds a new waypoint at given position
     */
    addWaypoint (desc: utils.WayPoint): void {
        if (desc?.lla) {
            // create placemark
            const pos: WorldWind.Position = new WorldWind.Position(
                desc.lla.lat,
                desc.lla.lon,
                desc.lla.alt
            );
            const placemark: WorldWind.Placemark = new WorldWind.Placemark(pos, false, null);
            placemark.label = desc?.label || `Waypoint ${this.waypoints.length + 1}`;
            placemark.altitudeMode = WorldWind.CLAMP_TO_GROUND; //WorldWind.RELATIVE_TO_GROUND;
            // set placemark attributes
            placemark.attributes = new WorldWind.PlacemarkAttributes(null);
            placemark.attributes.imageScale = 0.4;
            placemark.attributes.depthTest = false;
            placemark.attributes.imageSource = waypointLibrary + waypointImages[0];
            placemark.attributes.labelAttributes = new WorldWind.TextAttributes(null);
            placemark.attributes.labelAttributes.offset = new WorldWind.Offset(
                WorldWind.OFFSET_PIXELS, placemark.label.length * OFFSET.x, 
                WorldWind.OFFSET_PIXELS, OFFSET.y
            );
            placemark.attributes.labelAttributes.outlineColor = WorldWind.Color.BLACK;
            placemark.attributes.labelAttributes.outlineWidth = 4;
            placemark.attributes.labelAttributes.enableOutline = true;
            // create path if needed
            if (this.waypoints.length) {
                const last: WorldWind.Position = this.waypoints[this.waypoints.length - 1].pos;

                const path: WorldWind.SurfacePolygon = new WorldWind.SurfacePolygon([ last, pos ], null);
                // const path: WorldWind.Path = new WorldWind.Path([ last, pos ], null); // outlineWidth does not seem to be working with Path
                // path.altitudeMode = WorldWind.CLAMP_TO_GROUND; //WorldWind.RELATIVE_TO_GROUND;
                // path.followTerrain = true;
                // path.extrude = false;
                // path.useSurfaceShapeFor2D = true;
                // path.attributes.drawVerticals = path.extrude;
                path.attributes = new WorldWind.ShapeAttributes(null);
                path.attributes.drawInterior = true;
                path.attributes.drawOutline = true;
                path.attributes.interiorColor = WorldWind.Color.BLUE;
                path.attributes.drawVerticals = false;
                path.attributes.applyLighting = false;
                path.attributes.depthTest = false; // this prevents the area from being occluded by other objects in the scene
                path.attributes.outlineWidth = 3;
                path.attributes.outlineColor = path.attributes.interiorColor;
                this.segments.push(path);
                this.layer?.addRenderable(path);
            }
            // update data structures
            this.waypoints.push({ placemark, pos });
            // Add the placemark to the layer.
            this.layer?.addRenderable(placemark);
        }
    }
    /**
     * Shows flight path
     */
    reveal (): DAA_FlightPlan {
        if (this.layer) {
            this.layer.enabled = true;
        }
        return this;
    }
    /**
     * Hides flight path
     */
    hide (): DAA_FlightPlan {
        if (this.layer) {
            this.layer.enabled = false;
        }
        return this;
    }
}