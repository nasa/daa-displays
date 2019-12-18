/**
 * @module GeoFence
 * @version 2019.12.17
 * @description <div style="display:flex;"><div style="width:50%;">
 *              <b>Geofences.</b>
 *              <p>This widget renders geofences over a geographic map.</p>
 *              </div>
 *              </div>
 * 
 * @author Paolo Masci
 * @date December 2018
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
import * as serverInterface from '../utils/daa-server'

export class GeoFence {
    protected renderablePolygons: { [ key: string ] : WorldWind.SurfacePolygon } = {};
    protected layer: WorldWind.RenderableLayer;

    constructor (layer: WorldWind.RenderableLayer) {
        if (layer) {
            this.layer = layer;
        }
    }
    addPolygon2D (id: string, outerBoundaries: utils.LatLonAlt[] | serverInterface.LatLonAlt[], opt?: { opacity?: number, color?: { r: number, g: number, b: number } }): GeoFence {
        if (this.layer) {
            if (outerBoundaries) {
                opt = opt || {};
                const opacity: number = (isNaN(opt.opacity)) ? 0.4 : opt.opacity;
                const color: { r: number, g: number, b: number } = opt.color || { r: 1, g: 0.54, b: 0 }; // default color is dark orange
    
                const outer: WorldWind.Position[] = [];
                if (outerBoundaries.length > 0) {
                    for (let i = 0; i < outerBoundaries.length; i++) {
                        outer.push(new WorldWind.Position(+outerBoundaries[i].lat, +outerBoundaries[i].lon, +outerBoundaries[i].alt));
                    }
                }
                
                const attributes = new WorldWind.ShapeAttributes(null);
                attributes.drawInterior = true;
                attributes.drawOutline = true;
                attributes.interiorColor = new WorldWind.Color(color.r, color.g, color.b, opacity);
                attributes.outlineColor = attributes.interiorColor;
                attributes.drawVerticals = false;
                attributes.applyLighting = false;
                
                const polygon: WorldWind.SurfacePolygon = new WorldWind.SurfacePolygon(outer, attributes);

                this.renderablePolygons[id] = polygon;
                this.layer.addRenderable(this.renderablePolygons[id]);
            }
        } else {
            console.error("[geofence] Warning: Could not add polygon (renderable layer is null).");
        } 
        return this;
    }
    removePolygon (id: string): GeoFence {
        if (this.layer) {
            if (id) {
                this.layer.removeRenderable(this.renderablePolygons[id]);
            } else {
                console.error(`[geofence] Warning: Could not remove polygon (polygon id was not provided)`);
            }
        }
        return this;
    }
    reveal (): GeoFence {
        if (this.layer) {
            this.layer.enabled = true;
        }
        return this;
    }
    hide (): GeoFence {
        if (this.layer) {
            this.layer.enabled = false;
        }
        return this;
    }
    remove (): GeoFence {
        if (this.layer) {
            const keys: string[] = Object.keys(this.renderablePolygons);
            for (let i = 0; i < keys.length; i++) {
                this.layer.removeRenderable(this.renderablePolygons[keys[i]]);
            }
        }
        return this;
    }
}