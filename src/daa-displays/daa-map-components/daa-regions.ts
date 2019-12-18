
/**
 * @module DAA_Regions
 * @date 2018.12.01
 * @description <div style="display:flex;"><div style="width:50%;">
 *              <b>Geofences.</b>
 *              <p>This widget renders regions indicating loss of separation (LoS regions) of the aircraft.</p>
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
import * as utils from '../daa-utils';
import * as WorldWind from '../wwd/worldwind.min';
import * as serverInterface from '../utils/daa-server'
import { colladaAltitude } from './daa-aircraft';

class LosSector {
    protected sector: WorldWind.AbstractMesh;
    protected layer: WorldWind.RenderableLayer;
    protected getLosAltitude(altitude: number): number {
        return colladaAltitude(altitude - 100); // this is done to render los below the aircraft symbol
    }
    /**
     * @function <a name="LosSector">LosSector</a>
     * @description Constructor. Renders LoS regions.
     * @param layer { WorldWind.RenderableLayer } wwd layer to be used for rendering the LoS region.
     * @param pos { Position } Center of the conflict region
     * @param opt Optional attributes: nmi (size of the region, default is 1nmi), opacity (opacity of the region), color (region color)
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    constructor(layer: WorldWind.RenderableLayer, pos: utils.LatLonAlt | serverInterface.LatLonAlt, opt?: { nmi?: number, opacity?: number, color?: { r: number, g: number, b: number } }) {
        if (layer) {
            this.layer = layer;
            if (pos) {
                opt = opt || {};

                // 1 degree latitude is 69 miles and 60nmi
                // 1 degree longitude is ~69 miles and ~60nmi
                // 1 nautical mile is 1.15078 miles or 1.852km
                const nmi: number = (isNaN(opt.nmi)) ? 1 : opt.nmi;

                const opacity: number = (isNaN(opt.opacity)) ? 0.4 : opt.opacity;
                const color: { r: number, g: number, b: number } = opt.color || { r: 1, g: 0.54, b: 0 }; // default color is dark orange

                // const size: number = nmi / 60;
                // const boundaries: WorldWind.Location[] = [
                //     new WorldWind.Location(pos.lat + size, pos.lon + size),
                //     new WorldWind.Location(pos.lat + size, pos.lon - size),
                //     new WorldWind.Location(pos.lat - size, pos.lon - size),
                //     new WorldWind.Location(pos.lat - size, pos.lon + size)
                // ];

                // const attributes = new WorldWind.ShapeAttributes(null);
                // attributes.interiorColor = new WorldWind.Color(color.r, color.g, color.b, opacity);
                // attributes.applyLighting = false;

                // const conflictRegion: WorldWind.SurfacePolygon = new WorldWind.SurfacePolygon(boundaries, attributes);
                // this.layer.addRenderable(conflictRegion);

                const meshPositions = [];
                const meshIndices = [];
                const outlineIndices = [];
                const meshSegment = {
                    x: nmi / 2 / 60, // nmi
                    y: nmi / 2 / 60
                };

                const alt: number = +pos.alt;
                const altitude: number = this.getLosAltitude(alt);

                // flat piramid centered at the given position.
                const latitude: number = +pos.lat;
                const longitude: number = +pos.lon;
                const center: WorldWind.Position = new WorldWind.Position(latitude, longitude, altitude);
                meshPositions.push(center);
                const nodes: WorldWind.Position[] = [
                    new WorldWind.Position(meshPositions[0].latitude + meshSegment.y, meshPositions[0].longitude + meshSegment.x, altitude),
                    new WorldWind.Position(meshPositions[0].latitude + meshSegment.y, meshPositions[0].longitude - meshSegment.x, altitude),
                    new WorldWind.Position(meshPositions[0].latitude - meshSegment.y, meshPositions[0].longitude - meshSegment.x, altitude),
                    new WorldWind.Position(meshPositions[0].latitude - meshSegment.y, meshPositions[0].longitude + meshSegment.x, altitude)
                ];
                for (let i = 0; i < 4; i++) {
                    meshPositions.push(nodes[i]);
                    meshPositions.push(nodes[(i + 1) % 4]);
                    meshPositions.push(center);
                }

                const numRadialPositions: number = meshPositions.length - 1;
                // Create mesh indices.
                for (var i = 1; i < numRadialPositions; i++) {
                    meshIndices.push(0);
                    meshIndices.push(i);
                    meshIndices.push(i + 1);
                }
                // Close the polygon.
                meshIndices.push(0);
                meshIndices.push(numRadialPositions);
                meshIndices.push(1);

                // Create the outline indices.
                for (var j = 1; j <= numRadialPositions; j++) {
                    outlineIndices.push(j);
                }
                // Close the outline.
                outlineIndices.push(1);

                // Create the mesh's attributes. Light this mesh.
                var meshAttributes = new WorldWind.ShapeAttributes(null);
                // meshAttributes.outlineColor = WorldWind.Color.RED;
                meshAttributes.interiorColor = new WorldWind.Color(color.r, color.g, color.b, opacity);
                meshAttributes.applyLighting = false;

                // Create the mesh.
                var mesh = new WorldWind.TriangleMesh(meshPositions, meshIndices, meshAttributes);
                // mesh.outlineIndices = outlineIndices;
                mesh.enabled = true;
                mesh.displayName = `LoS Sector`;

                // Add the mesh to a layer and the layer to the WorldWindow's layer list.    
                this.sector = mesh;
                layer.addRenderable(this.sector);
            }
        }
    }
    /**
     * @function <a name="LosSector_hide">hide</a>
     * @description Hides the conflict region.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    hide(): void {
        if (this.sector) {
            this.sector.enabled = false;
        }
    }
    remove(): void {
        if (this.sector) {
            this.sector.enabled = false;
            this.layer.removeRenderable(this.sector);
        }
    }
    /**
     * @function <a name="LosSector_reveal">hide</a>
     * @description Makes the conflict region visible.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    reveal(): void {
        if (this.sector) {
            this.sector.enabled = true;
        }
    }
}

export class LosRegion {
    protected region: LosSector[];
    protected layer: WorldWind.RenderableLayer;
    constructor (layer: WorldWind.RenderableLayer, region: utils.LatLonAlt[] | serverInterface.LatLonAlt[], opt?: { nmi?: number, opacity?: number, color?: { r: number, g: number, b: number } }) {
        if (layer) {
            opt = opt || {};
            this.layer = layer;
            if (region && region.length > 0) {
                this.region = [];
                for (let i = 0; i < region.length; i++) {
                    this.region.push(new LosSector(this.layer, region[i], opt));
                }
            }
        }
    }
    reveal () {
        if (this.region) {
            for (let i = 0; i < this.region.length; i++) {
                this.region[i].reveal();
            }
        }
    }
    hide () {
        if (this.region) {
            for (let i = 0; i < this.region.length; i++) {
                this.region[i].hide();
            }
        }
    }
    remove () {
        if (this.region) {
            for (let i = 0; i < this.region.length; i++) {
                this.region[i].remove();
            }
        }
    }
}