/**
 * @module DAA_Aircraft
 * @date 2018.12.01
 * @description <div style="display:flex;"><div style="width:50%;">
 *              <b>Geofences.</b>
 *              <p>This widget renders aircraft using DAA symbols.</p>
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
import { LosRegion } from './daa-regions';

// arrow symbols, useful for labels
const arrows = {
    up: "↑",
    down: "↓",
    left: "←",
    right: "→",
    "white-up": "⇧",
    "white-down": "⇩",
    "white-left": "⇦",
    "white-right": "⇨"
};
// scale factor for collada objects
const colladaScaleDaaSymbol = 1100 / 5;
const colladaScaleDrone: number = 0.4
// collada objects representing the daa symbols
const colladaObjects = {
    "protected-jet": {
        fileName: "sc-private-jet.dae", // this symbol is included for testing purposes, for the 3D view
        xRotation: 180,
        yRotation: 180,
        scale: colladaScaleDaaSymbol
    },
    "drone-blue": {
        fileName: "parrot-drone-blue.dae", // this symbol is included for testing purposes, for the 3D view
        xRotation: 180,
        yRotation: 185,
        zRotation: 180,
        scale: colladaScaleDrone
    },
    "drone-red": {
        fileName: "parrot-drone-red.dae", // this symbol is included for testing purposes, for the 3D view
        xRotation: 180,
        yRotation: 185,
        zRotation: 180,
        scale: colladaScaleDrone
    },
    "drone-yellow": {
        fileName: "parrot-drone-yellow.dae", // this symbol is included for testing purposes, for the 3D view
        xRotation: 180,
        yRotation: 185,
        zRotation: 180,
        scale: colladaScaleDrone
    },
    "drone-white": {
        fileName: "parrot-drone-white.dae", // this symbol is included for testing purposes, for the 3D view
        xRotation: 180,
        yRotation: 185,
        zRotation: 180,
        scale: colladaScaleDrone
    },
    "daa-ownship": {
        fileName: "daa-ownship.dae",
        zRotation: 0,
        scale: colladaScaleDaaSymbol
    },
    "daa-alert": {
        fileName: "daa-alert.dae",
        zRotation: 0,
        scale: colladaScaleDaaSymbol
    },
    "daa-target": {
        fileName: "daa-target.dae",
        zRotation: 0,
        scale: colladaScaleDaaSymbol
    },
    "daa-traffic-avoid": {
        fileName: "daa-traffic-avoid.dae",
        zRotation: 0,
        scale: colladaScaleDaaSymbol
    },
    "daa-traffic-monitor": {
        fileName: "daa-traffic-monitor.dae",
        zRotation: 0,
        scale: colladaScaleDaaSymbol
    }
};

export class Aircraft {
    protected position: utils.LatLonAlt;
    protected heading: number;
    protected velocity: utils.Vector3D;
    protected callSign: string;
    /**
     * @function <a name="Aircraft">Aircraft</a>
     * @description Constructor. Aircraft descriptor.
     * @param callSign {string} Unique aircraft name
     * @param lat {real} Latitude of the aircraft (degrees)
     * @param lon {real} Longitude of the aircraft (degrees)
     * @param alt {real} Altitude of the aircraft (meters)
     * @param vel {Object({x: real, y: real, z: real})} Velocity of the aircraft.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    constructor(callSign: string, s: utils.LatLonAlt | serverInterface.LatLonAlt) {
        this.callSign = callSign;
        this.position = {
            lat: +s.lat,
            lon: +s.lon,
            alt: +s.alt
        };
        this.velocity = null;
        this.heading = NaN;
    }
    /**
     * @function <a name="Aircraft_setPosition">setPosition</a>
     * @description Sets the current position of the aircraft.
     * @param pos {Object({ lat: real, lon: real, alt: real })} Earth location shown at the center of the map, given as { lat: real, lon: real, alt: real }
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setPosition(pos: utils.LatLonAlt | serverInterface.LatLonAlt): Aircraft {
        if (pos) {
            this.position.lat = +pos.lat; //(isNaN(+pos.lat)) ? this.position.lat: +pos.lat;
            this.position.lon = +pos.lon; //(isNaN(+pos.lon)) ? this.position.lon: +pos.lon;
            this.position.alt = +pos.alt; //(isNaN(+pos.alt)) ? this.position.alt: +pos.alt;
        }
        return this;
    }
    /**
     * @function <a name="Aircraft_setVelocity">setVelocity</a>
     * @description Sets the current velocity of the aircraft.
     * @param vel {Object({x: real, y:real, z:real})} Velocity vector, given as { x: real, y: real, z: real }
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setVelocity(vel: utils.Vector3D | serverInterface.Vector3D): Aircraft {
        if (vel) {
            this.velocity = this.velocity || { x: 0, y: 0, z: 0 };
            this.velocity.x = +vel.x; //(isNaN(+vel.x)) ? this.velocity.x : +vel.x;
            this.velocity.y = +vel.y; //(isNaN(+vel.y)) ? this.velocity.y : +vel.y;
            this.velocity.z = +vel.z; //(isNaN(+vel.z)) ? this.velocity.z : +vel.z;
            this.heading = utils.rad2deg(Math.atan2(this.velocity.x, this.velocity.y));
        }
        return this;
    }
    /**
     * @function <a name="Aircraft_setAltiude">setAltitude</a>
     * @description Sets the current altitude of the aircraft.
     * @param alt {real} The new altitude of the aircraft.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setAltitude(alt: number): Aircraft {
        if (!isNaN(alt)) {
            this.position.alt = alt;
        }
        return this;
    }
    /**
     * @function <a name="Aircraft_getPosition">getPosition</a>
     * @description Returns the current aircraft position.
     * @return {real} The current aircraft position.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    getPosition(): utils.LatLonAlt {
        return {
            lat: this.position.lat,
            lon: this.position.lon,
            alt: this.position.alt
        };
    }
    /**
     * @function <a name="Aircraft_getVelocity">getVelocity</a>
     * @description Returns the current velocity of the aircraft.
     * @return {Object({x: real, y: real, z: real})} The velocity vector of the aircraft.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    protected getVelocity(): utils.Vector3D {
        return this.velocity;
    }
    getCallSign (): string {
        return this.callSign;
    }
    setCallSign (callSign: string): Aircraft {
        this.callSign = callSign;
        return this;
    }
    getHeading (): number {
        return this.heading;
    }
}

// utility function, used to offset the label for collada aircraft and convert feet to meters
// in 2D view, collada objects are artificially rendered closer to the ground otherwise they would not be rendered correctly in some scenarios,
// as they tend to fall outside the fov of the navigator
export function colladaAltitude(alt: number) {
    return alt / 4;
}
export class ColladaAircraft extends Aircraft {
    static readonly aircraftSymbols: string[] = [ "daa-ownship", "daa-alert", "daa-target", "daa-traffic-avoid", "daa-traffic-monitor" ];
    static readonly MAX_RETRY_COLLADA_ACTION: number = 64;
    protected wwd: WorldWind.WorldWindow;
    protected colladaLoader: WorldWind.ColladaLoader;
    protected rotationOffset: { xRotation: number, yRotation: number, zRotation: number };
    protected renderable: WorldWind.ColladaScene;
    protected wwdLayer: WorldWind.RenderableLayer;
    protected nmiScale: number;
    protected symbol: string;
    /**
     * @function <a name="ColladaAircraft">ColladaAircraft</a>
     * @description Constructor. Uses a Collada model to creates an aircraft on the wwd map.
     * @param wwd {Object} Pointer to an instance of WorldWind.WorldWindow
     * @param lat {real} Latitude of the aircraft (degrees)
     * @param lon {real} Longitude of the aircraft (degrees)
     * @param alt {real} Altitude of the aircraft (meters)
     * @param heading {real} Heading of the aircraft (degrees)
     * @param symbol {String} DAA symbol to be used for the aircraft, one of "daa-target", "daa-alert", "daa-traffic-avoid", "daa-traffic-monitor", "daa-ownship" (default: daa-ownship).
     * @memberof module:InteractiveMap
     * @augments Aircraft
     * @instance
     * @inner
     */
    constructor(wwd: WorldWind.WorldWindow, desc: { lat: number, lon: number, alt: number, heading: number, callSign: string, symbol: string }, layers: { wwdLayer: WorldWind.RenderableLayer }) {
        super(desc.callSign, { lat: desc.lat, lon: desc.lon, alt: desc.alt });

        this.wwd = wwd;
        this.wwdLayer = layers.wwdLayer //new WorldWind.RenderableLayer("Aircraft"), // This layers is used to render the aircraft
        this.symbol = desc.symbol || "daa-target";

        this.colladaLoader = new WorldWind.ColladaLoader(new WorldWind.Position(desc.lat, desc.lon, desc.alt)); // WorldWind uses meters instead of feet
        this.colladaLoader.init({
            dirPath: utils.baseUrl + 'ColladaModels/'
        });

        // rotationOffset is used for adjusting the direction of the icon, e.g., so that the arrow points to the north.
        this.rotationOffset = {
            xRotation: 0,
            yRotation: 0,
            zRotation: 0
        };

        this.nmiScale = 5; // default scale is 5NMI

        delete this.velocity; // velocity vector is meaningless for collada objects -- here we use heading
        this.heading = desc.heading;

        // to load the objects, the caller needs to invoke setupRenderables
    }
    async setupRenderables (selectedSymbol: string): Promise<ColladaAircraft> {
        return new Promise ((resolve, reject) => {
            const obj = colladaObjects[this.symbol]; //colladaObjects.privateJet;
            this.colladaLoader.load(obj.fileName, (colladaScene: WorldWind.ColladaScene) => {
                if (colladaScene) {
                    this.renderable = colladaScene;
                    // set call sign and altitude data
                    this.renderable.displayName = this.callSign;
                    // this.renderableAircraft.useTexturePaths = false; // use this option to force loading textures from the same directory of the collada file
                    // set standard position and heading
                    this.renderable.altitudeMode = WorldWind.ABSOLUTE; // the alternative is RELATIVE_TO_GROUND;
                    this.renderable.xRotation = obj.xRotation || 0;
                    this.rotationOffset.xRotation = this.renderable.xRotation;
                    this.renderable.yRotation = obj.yRotation || 0;
                    this.rotationOffset.yRotation = this.renderable.yRotation;
                    this.renderable.zRotation = obj.zRotation || 0;
                    this.rotationOffset.zRotation = this.renderable.zRotation;
                    // this.renderable.position = new WorldWind.Position(this.position.lat, this.position.lon, colladaAltitude(this.position.alt));
                    this.setPosition({ lat: this.position.lat, lon: this.position.lon, alt: this.position.alt }); // the altitude is artificially reduced to so we have a wider field of view
                    this.setHeading(this.heading);
                    // set scale
                    this.setScale(this.nmiScale);
                    // make the object visible
                    this.renderable.enabled = (this.symbol === selectedSymbol);
                    // add renderable
                    this.wwdLayer.addRenderable(this.renderable); // Add the Collada model to the renderable layer within a callback.
                } else {
                    console.error("[ColladaAircraft] Warning: Could not load collada object :/");
                }
                // resolve promise
                resolve(this);
            });
        });
    }
    // setVelocity(vel: utils.Vector3D | serverInterface.Vector3D): ColladaAircraft {
    //     if (vel) {
    //         super.setVelocity(vel);
    //         // rotate the aircraft accordingly
    //         // const deg = utils.rad2deg(Math.atan2(this.velocity.x, this.velocity.y));
    //         this.setHeading();
    //     }
    //     return this;
    // }
    /**
     * @function <a name="ColladaAircraft_setPosition">setPosition</a>
     * @description Sets the current position of the aircraft.
     * @param pos {Object({ lat: real, lon: real, alt: real })} Earth location shown at the center of the map, given as { lat: real, lon: real, alt: real }. Lat Lon are in deg. Altitude is in feet.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setPosition(pos: utils.LatLonAlt | serverInterface.LatLonAlt): ColladaAircraft {
        if (this.renderable) {
            if (pos) {
                super.setPosition(pos);
                this.renderable.position = new WorldWind.Position(this.position.lat, this.position.lon, colladaAltitude(this.position.alt));
            }
        }
        return this;
    }
    /**
     * @function <a name="ColladaAircraft_hide">hide</a>
     * @description Hides the aircraft.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    hide(): ColladaAircraft {
        if (this.renderable) {
            this.renderable.enabled = false;
        } else {
            console.error("[ColladaAircraft] Warning: collada object could not be hidden");
        }
        return this;
    }
    // removes renderables
    remove(flag?: boolean, retry?: number): ColladaAircraft {
        if (this.renderable) {
            this.renderable.enabled = false;
            this.wwdLayer.removeRenderable(this.renderable);
            if (flag) {
                console.log(`[ColladaAircraft] Aircraft ${this.callSign} removed`)
            }
        } else {
            console.warn(`[ColladaAircraft] Warning: collada object for ${this.callSign} could not be removed`);
            // renderable needs some additional time to load, try to remove after a small time
            const n: number = isNaN(retry) ? 1 : retry + 1;
            setTimeout(() => {
                this.remove(true, n);
            }, 256);
        }
        return this;
    }
    /**
     * @function <a name="ColladaAircraft_reveal">reveal</a>
     * @description Makes the aircraft visible on the map.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    reveal(): ColladaAircraft {
        if (this.renderable) {
            this.renderable.enabled = true;
        } // else, renderable is still loading, scale will be adjusted when the renderable has completed loading, see setupRenderables()
        return this;
    }
    /**
     * @function <a name="ColladaAircraft_setHeading">setHeading</a>
     * @desc Sets the aircraft heading, in degrees, clockwise, north is 0 deg.
     * @param deg (real) Heading degrees
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setHeading(deg: number) {
        if (!isNaN(deg) && this.renderable) {
            this.heading = deg;
            this.renderable.zRotation = this.rotationOffset.zRotation + deg;
        }
        return this;
    }
    /**
     * @function <a name="ColladaAircraft_autoScale">autoScale</a>
     * @desc Scales the aircraft symbol based on the map scale.
     *       This is necessary to keep the symbol size constant when zooming in/out the map
     *       (in wwd, zooming in results in larger collada objects, zooming out leads to smaller objects).
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setScale(nmiScale: number): ColladaAircraft {
        if (!isNaN(nmiScale)) {
            this.nmiScale = nmiScale;
            const scale: number = (colladaObjects[this.symbol]) ? colladaObjects[this.symbol].scale : colladaScaleDaaSymbol;
            this.setColladaScale(scale * this.nmiScale);
        }
        return this;
    }

    setColladaScale (scale: number, retry?: number): ColladaAircraft {
        if (this.renderable) {
            this.renderable.scale = scale;
        } else {
            // renderable still loading, try after a timeout
            const n: number = isNaN(retry) ? 1 : retry + 1;
            if (n < ColladaAircraft.MAX_RETRY_COLLADA_ACTION) {
                setTimeout(() => {
                    this.setColladaScale(scale, n);
                }, 256);
            }
        }
        return this;
    }
}

export class DAA_Aircraft extends Aircraft {
    readonly symbolColor = {
        "daa-ownship": WorldWind.Color.CYAN,
        "daa-alert": WorldWind.Color.RED, // this is also called "warning"
        "daa-target": WorldWind.Color.WHITE,
        "daa-traffic-avoid": WorldWind.Color.YELLOW, // this is also called "corrective"
        "daa-traffic-monitor": WorldWind.Color.YELLOW // this is also called "preventive"
    };
    protected renderableAircraft: { "daa-ownship": ColladaAircraft, "daa-alert": ColladaAircraft, "daa-target": ColladaAircraft, "daa-traffic-avoid": ColladaAircraft, "daa-traffic-monitor": ColladaAircraft };
    protected renderablePosition: WorldWind.GeographicText;
    protected renderableCallSign: WorldWind.GeographicText;
    protected callSignVisible: boolean;
    protected aircraftVisible: boolean;
    protected selectedSymbol: string;
    protected _own: Aircraft;
    protected nmiScale: number;
    protected textLayer: WorldWind.RenderableLayer;
    protected los: LosRegion;
    protected losLayer: WorldWind.RenderableLayer;
    protected aircraftLayer: WorldWind.RenderableLayer;
    protected wwd: WorldWind.WorldWindow;
    protected view3D: boolean;
    /**
     * @function <a name="DAA_Aircraft">DAA_Aircraft</a>
     * @description Constructor. Creates an aircraft rendered using the standard daa symbols ("daa-target", "daa-alert", "daa-traffic-avoid", "daa-traffic-monitor", "daa-ownship").
     *              All aircraft (except the ownship) have a label. The label includes the following information:
     *              <li>relative altitude (reference altitude is the ownship altitude): 2 digits, units is 100 feet</li>
     *              <li>velocity vector: represented using an arrow (arrow-up if aircraft is climbing, arrow-down if aircraft is descending, no arrow is shown if the aircraft is levelled)</li>
     *              The label color matches that of the daa symbol of the aircraft.
     *              The label is shown above the daa symbol if the altitude of the aircraft is greater than or equal the ownship's altitude, below otherwise.
     * @param wwd {Object} Pointer to an instance of WorldWind.WorldWindow
     * @param desc {Object} Aircraft descriptor
     *          <li>symbol (String): daa symbol, one of "daa-target", "daa-alert", "daa-traffic-avoid", "daa-traffic-monitor", "daa-ownship" (default: daa-ownship)</li>
     *          <li>callSign (String): name of the aircraft, currently used only for debugging purposes.</li>
     *          <li>s ({ lat:real, lon:real, alt:real }) position, lat lon are in degrees, alt is in feet</li>
     *          <li>v ({ x:real, y: real, z: real }) velocity vector (m/s)</li>
     *          <li>ownship (Object): pointer to the ownship descriptor, with information about position and speed.</li>
     * @param cb {Function} Optional callback function. The function is invoked when all renderables are loaded.
     * @memberof module:InteractiveMap
     * @augments Aircraft
     * @instance
     * @inner
     */
    constructor(wwd: WorldWind.WorldWindow, 
                desc: { s: utils.LatLonAlt | serverInterface.LatLonAlt, symbol?: string, callSign?: string, callSignVisible?: boolean, aircraftVisible?: boolean, v?: utils.Vector3D | serverInterface.Vector3D, ownship?: Aircraft, view3D?: boolean }, 
                layers: { losLayer: WorldWind.RenderableLayer, aircraftLayer: WorldWind.RenderableLayer, textLayer: WorldWind.RenderableLayer }) {
        super(desc.callSign, desc.s);
        super.setVelocity(desc.v);
        desc.symbol = desc.symbol || "daa-ownship";
        desc.callSign = desc.callSign || "";
        this.callSignVisible = !!desc.callSignVisible;
        this.selectedSymbol = desc.symbol;
        this._own = desc.ownship; // this attribute is relevant only for traffic aircraft, it is used to compute the relative altitude wrt the ownship
        this.losLayer = layers.losLayer;
        this.aircraftLayer = layers.aircraftLayer; // this layer is used for rendering the aircraft symbol
        this.textLayer = layers.textLayer; // this layer is used for rendering call sign and position data
        this.aircraftVisible = !!desc.aircraftVisible;
        this.wwd = wwd; // pointer to WorldWind
        this.nmiScale = 1;
        this.view3D = !!desc.view3D;

        // add labels
        this.addRenderableLabels({ view3D: desc.view3D });
        // add aircraft -- async call, the aircraft will be rendered when ready
        this.addRenderableAircraft();
    }
    protected async addRenderableAircraft (): Promise<DAA_Aircraft> {
        this.renderableAircraft = (!this.view3D) ? {
            "daa-ownship": new ColladaAircraft(this.wwd, { lat: this.position.lat, lon: this.position.lon, alt: this.position.alt, heading: this.heading, callSign: this.callSign, symbol: "daa-ownship" }, { wwdLayer: this.aircraftLayer }),
            "daa-alert": new ColladaAircraft(this.wwd, { lat: this.position.lat, lon: this.position.lon, alt: this.position.alt, heading: this.heading, callSign: this.callSign, symbol: "daa-alert" }, { wwdLayer: this.aircraftLayer }),
            "daa-target": new ColladaAircraft(this.wwd, { lat: this.position.lat, lon: this.position.lon, alt: this.position.alt, heading: this.heading, callSign: this.callSign, symbol: "daa-target" }, { wwdLayer: this.aircraftLayer }),
            "daa-traffic-avoid": new ColladaAircraft(this.wwd, { lat: this.position.lat, lon: this.position.lon, alt: this.position.alt, heading: this.heading, callSign: this.callSign, symbol: "daa-traffic-avoid" }, { wwdLayer: this.aircraftLayer }),
            "daa-traffic-monitor": new ColladaAircraft(this.wwd, { lat: this.position.lat, lon: this.position.lon, alt: this.position.alt, heading: this.heading, callSign: this.callSign, symbol: "daa-traffic-monitor" }, { wwdLayer: this.aircraftLayer })
        } : {
            "daa-ownship": new ColladaAircraft(this.wwd, { lat: this.position.lat, lon: this.position.lon, alt: this.position.alt, heading: this.heading, callSign: this.callSign, symbol: "drone-blue" }, { wwdLayer: this.aircraftLayer }),
            "daa-alert": new ColladaAircraft(this.wwd, { lat: this.position.lat, lon: this.position.lon, alt: this.position.alt, heading: this.heading, callSign: this.callSign, symbol: "drone-red" }, { wwdLayer: this.aircraftLayer }),
            "daa-target": new ColladaAircraft(this.wwd, { lat: this.position.lat, lon: this.position.lon, alt: this.position.alt, heading: this.heading, callSign: this.callSign, symbol: "drone-white" }, { wwdLayer: this.aircraftLayer }),
            "daa-traffic-avoid": new ColladaAircraft(this.wwd, { lat: this.position.lat, lon: this.position.lon, alt: this.position.alt, heading: this.heading, callSign: this.callSign, symbol: "drone-yellow" }, { wwdLayer: this.aircraftLayer }),
            "daa-traffic-monitor": new ColladaAircraft(this.wwd, { lat: this.position.lat, lon: this.position.lon, alt: this.position.alt, heading: this.heading, callSign: this.callSign, symbol: "drone-yellow" }, { wwdLayer: this.aircraftLayer })
        };
        // load all renderables
        const keys: string[] = Object.keys(this.renderableAircraft);
        for (let i = 0; i < keys.length; i++) {
            const aircraft: ColladaAircraft = this.renderableAircraft[keys[i]];
            await aircraft.setupRenderables(this.selectedSymbol); // load the collada object
        }
        if (this.aircraftVisible) {
            this.reveal();
        } else {
            this.hide();
        }
        // we need to refresh the map here, after all collada objects have been loaded
        this.wwd.redraw();
        return this;
    }

    // utility function, creates a label similar to that used in TCAS displays
    // The label includes:
    //  - relative altitude (reference altitude is the ownship altitude): 2 digits, units is 100 feet
    //  - velocity vector: represented using an arrow (arrow-up if aircraft is climbing, arrow-down if aircraft is descending, no arrow is shown if the aircraft is levelled)
    // The label color matches that of the daa symbol of the aircraft
    // The label is shown above the daa symbol if the altitude of the aircraft is greater than or equal the ownship's altitude, below otherwise.
    protected createLabel (): { text: string, position: WorldWind.Position, offsetX: number, offsetY: number } {
        function fixed2(val: number): string {
            if (val > 0) {
                return (val < 10) ? "0" + val : val.toString();
            }
            return (val > -10) ? "-0" + (-val) : val.toString();
        }
        let label = {
            text: "",
            position: new WorldWind.Position(this.position.lat, this.position.lon, colladaAltitude(this.position.alt)),
            offsetX: 18,
            offsetY: 0
        };
        // indicate altitude, in feet
        if (this._own) {
            let val = Math.trunc((this.position.alt - this._own.getPosition().alt) / 100);
            if (val === 0) {
                label.text = " 00";
                label.offsetY = -16; // text will at the top of the symbol (y axis points down in the canvas)
            } else if (val > 0) {
                label.text = "+" + fixed2(val);
                label.offsetY = -16; // text will at the top of the symbol (y axis points down in the canvas)
            } else {
                label.text = fixed2(val);
                label.offsetY = 42; // text will at the bottom of the symbol (y axis points down in the canvas)
            }
        } else {
            label.text = `${Math.floor(this.position.alt)}ft`;
            label.offsetY = -16;
        }
        // indicate whether the aircraft is climbing or descending, based on the velocity vector
        if (this.getVelocity()) {
            const THRESHOLD: number = 50; // Any climb or descent smaller than this threshold show as level flight (no arrow)
            if (Math.abs(this.getVelocity().z) >= THRESHOLD) {
                if (this.getVelocity().z > 0) {
                    // add arrow up before label
                    label.text += arrows["white-up"];
                } else if (this.getVelocity().z < 0) {
                    // add arrow down before label
                    label.text += arrows["white-down"];
                }
            }
        }
        // console.log(label);
        return label;
    }
    hideCallSign (): DAA_Aircraft {
        if (this.renderableCallSign) {
            this.renderableCallSign.enabled = false;
            this.callSignVisible = false;
        }
        return this;
    }
    revealCallSign (): DAA_Aircraft {
        if (this.renderableCallSign) {
            this.renderableCallSign.enabled = true;
            this.callSignVisible = true;
        }
        return this;
    }
    protected createCallSign (): { text: string, position: WorldWind.Position, offsetX: number, offsetY: number } {
        let label = {
            text: "",
            position: new WorldWind.Position(this.position.lat, this.position.lon, colladaAltitude(this.position.alt)),
            offsetX: 18,
            offsetY: 0
        };
        // indicate altitude, in feet
        const val = (this._own) ? Math.trunc((this.position.alt - this._own.getPosition().alt) / 100) : Math.trunc(this.position.alt / 100);
        label.text = this.getCallSign();
        if (val < 0) {
            label.offsetY = -16; // text will at the top of the symbol (y axis points down in the canvas)
        } else {
            label.offsetY = 42; // text will at the bottom of the symbol (y axis points down in the canvas)
        }
        return label;
    }
    protected addRenderableLabels(opt?: { view3D?: boolean }): DAA_Aircraft {
        opt = opt || {};
        if (this.selectedSymbol && (opt.view3D || this.selectedSymbol !== "daa-ownship")) {
            const aircraftLabel = this.createLabel();
            this.renderablePosition = new WorldWind.GeographicText(aircraftLabel.position, aircraftLabel.text);
            this.renderablePosition.attributes = new WorldWind.TextAttributes(null);
            this.renderablePosition.attributes.color = this.symbolColor[this.selectedSymbol];
            this.renderablePosition.attributes.font.weight = "bold";
            this.renderablePosition.attributes.font.size = 18;
            this.renderablePosition.attributes.offset = new WorldWind.Offset(WorldWind.OFFSET_PIXELS, aircraftLabel.offsetX, WorldWind.OFFSET_PIXELS, aircraftLabel.offsetY);
            this.renderablePosition.attributes.depthTest = false;
            this.renderablePosition.declutterGroup = 0;
            this.renderablePosition.enabled = this.aircraftVisible;
            this.textLayer.addRenderable(this.renderablePosition);

            const aircraftCallSign = this.createCallSign();
            this.renderableCallSign = new WorldWind.GeographicText(aircraftCallSign.position, aircraftCallSign.text);
            this.renderableCallSign.attributes = new WorldWind.TextAttributes(null);
            this.renderableCallSign.attributes.color = this.symbolColor[this.selectedSymbol];
            this.renderableCallSign.attributes.font.weight = "bold";
            this.renderableCallSign.attributes.font.size = 14;
            this.renderableCallSign.attributes.offset = new WorldWind.Offset(WorldWind.OFFSET_PIXELS, aircraftCallSign.offsetX, WorldWind.OFFSET_PIXELS, aircraftCallSign.offsetY);
            this.renderableCallSign.attributes.depthTest = false;
            this.renderableCallSign.declutterGroup = 0;
            this.renderableCallSign.enabled = this.callSignVisible;
            this.renderableCallSign.text = this.callSign;
            this.textLayer.addRenderable(this.renderableCallSign);
        }
        return this;
    }
    setCallSign (callSign: string): DAA_Aircraft {
        super.setCallSign(callSign);
        if (callSign !== null && callSign !== undefined) {
            this.callSign = callSign;
            if (this.renderableCallSign) {
                this.renderableCallSign.text = callSign;
                this.refreshLabel();
            }
            // else, renderable is still loading, the text will be added by addLabels() when renderables are loaded
        }
        return this;
    }
    remove (): DAA_Aircraft {
        if (this.aircraftLayer && this.renderableAircraft) {
            Object.keys(this.renderableAircraft).forEach(symbol => {
                const ac: ColladaAircraft = this.renderableAircraft[symbol];
                if (ac) {
                    ac.remove();
                }
            });
        }
        if (this.textLayer) {
            if (this.renderablePosition) {
                this.renderablePosition.enabled = false;
                this.textLayer.removeRenderable(this.renderablePosition);
            }
            if (this.renderableCallSign) {
                this.renderableCallSign.enabled = false;
                this.textLayer.removeRenderable(this.renderableCallSign);
            }
        }
        return this;
    }
    /**
     * @function <a name="DAA_Aircraft_setSymbol">setSymbol</a>
     * @description Sets the daa symbol to be used for the aircraft.
     * @param daaSymbol {String|number} string is for daa symbols, one of "daa-target", "daa-alert", "daa-traffic-avoid", "daa-traffic-monitor", "daa-ownship" (default: daa-ownship), number is for alert (0 = target, 1 = monitor, 2 = avoid, 3 = alert)</li>
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setSymbol(daaSymbol?: string | number): DAA_Aircraft {
        if (daaSymbol) {
            const symbol: string = (typeof daaSymbol === "string") ? daaSymbol : this._alert2symbol(+daaSymbol);
            if (symbol) {
                if (!this.renderableAircraft[this.selectedSymbol]) {
                    // console.log("Warning: still loading DAA_Aircraft symbols... :/");
                    // the symbol will be selected when the loading process completes --- see DAA_Aircraft.setupRenderables()
                    this.selectedSymbol = symbol;
                } else {
                    if (daaSymbol !== this.selectedSymbol) {
                        this.renderableAircraft[this.selectedSymbol].hide(); // hide old symbol
                        this.selectedSymbol = symbol;
                        this.renderableAircraft[this.selectedSymbol].reveal(); // reveal new symbol
                        this.refreshLabel();
                    } // else do nothing, the symbol is the same
                }
            } else {
                console.error("Error: unrecognised symbol name ", daaSymbol);
            }
        }
        return this;
    }
    setReferenceAircraft(ownship: Aircraft): DAA_Aircraft {
        this._own = ownship;
        return this;
    }
    _alert2symbol(daaAlert: number): string {
        switch (daaAlert) {
            case 1:
                return "daa-traffic-avoid";
            case 2:
                return "daa-traffic-monitor";
            case 3:
                return "daa-alert";
            default: // return "daa-target"
        }
        return "daa-target";
    }
    /**
     * @function <a name="DAA_Aircraft_selectSymbolByAlert">selectSymbolByAlert</a>
     * @description Sets the daa symbol of the aircraft based on the alert level.
     * @param selectSymbolByAlert {nat} daa alert:
     *                              <li>0 = daa-target</li>
     *                              <li>1 = daa-traffic-avoid</li>
     *                              <li>2 = daa-traffic-monitor</li>
     *                              <li>3 = daa-alert</li>
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    selectSymbolByAlert(daaAlert: number): DAA_Aircraft {
        switch (daaAlert) {
            case 1:
                return this.setSymbol("daa-traffic-avoid");
            case 2:
                return this.setSymbol("daa-traffic-monitor");
            case 3:
                return this.setSymbol("daa-alert");
            default:
                //return this.setSymbol("daa-target");
        }
        return this.setSymbol("daa-target");
    }
    /**
     * @function <a name="DAA_Aircraft_refreshLabel">refreshLabel</a>
     * @description Triggers re-renderin of aircraft label.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    refreshLabel(): DAA_Aircraft {
        if (this.renderablePosition) {
            const aircraftLabel = this.createLabel();
            this.renderablePosition.position = aircraftLabel.position;
            this.renderablePosition.attributes.color = this.symbolColor[this.selectedSymbol];
            this.renderablePosition.attributes.offset = new WorldWind.Offset(WorldWind.OFFSET_PIXELS, aircraftLabel.offsetX, WorldWind.OFFSET_PIXELS, aircraftLabel.offsetY);
            this.renderablePosition.text = aircraftLabel.text;
        }
        if (this.renderableCallSign) {
            const aircraftCallSign = this.createCallSign();
            this.renderableCallSign.position = aircraftCallSign.position;
            this.renderableCallSign.attributes.color = this.symbolColor[this.selectedSymbol];
            this.renderableCallSign.attributes.offset = new WorldWind.Offset(WorldWind.OFFSET_PIXELS, aircraftCallSign.offsetX, WorldWind.OFFSET_PIXELS, aircraftCallSign.offsetY);
            this.renderableCallSign.text = aircraftCallSign.text;
        }
        if (this.velocity) {
            const deg = utils.rad2deg(Math.atan2(this.velocity.x, this.velocity.y));
            this.setHeading(deg);
        }
        return this;
    }
    /**
     * @function <a name="DAA_Aircraft_setPositionAndVelocity">setPositionAndVelocity</a>
     * @description Sets the current position and velocity of the aircraft. Position and velocity are optionals -- if they are not specified, the aircraft maintains its current position and velocity
     * @param pos {Object({ lat: real, lon: real, alt: real })} Earth location shown at the center of the map, given as { lat: real, lon: real, alt: real }
     * @param vel {Object({x: real, y:real, z:real})} Velocity vector, given as { x: real, y: real, z: real }
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setPositionAndVelocity(pos?: utils.LatLonAlt | serverInterface.LatLonAlt, vel?: utils.Vector3D | serverInterface.Vector3D): Aircraft {
        if (pos) {
            this.setPosition(pos);
        }
        if (vel) {
            this.setVelocity(vel);
        }
        return this;
    }

    /**
     * @function <a name="DAA_Aircraft_setPosition">setPosition</a>
     * @description Sets the current position of the aircraft.
     * @param pos {Object({ lat: real, lon: real, alt: real })} Earth location shown at the center of the map, given as { lat: real, lon: real, alt: real }
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setPosition(pos: utils.LatLonAlt | serverInterface.LatLonAlt, reference?: Aircraft): DAA_Aircraft {
        super.setPosition(pos);
        // update aircraft symbol
        Object.keys(this.renderableAircraft).forEach(symbol => {
            const aircraft: ColladaAircraft = this.renderableAircraft[symbol];
            aircraft.setPosition(pos);
        });
        // update labels
        if (reference) { this._own = reference; }
        this.refreshLabel();
        // console.log(this.name, this.position);
        return this;
    }
    setVelocity(vel: utils.Vector3D | serverInterface.Vector3D): DAA_Aircraft {
        super.setVelocity(vel); // this function will automatically compute the heading
        Object.keys(this.renderableAircraft).forEach(symbol => {
            this.renderableAircraft[symbol].setHeading(this.heading);
        });
        this.refreshLabel();
        return this;
    }
    /**
     * @function <a name="DAA_Aircraft_hide">hide</a>
     * @description Hides the aircraft.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    hide(): DAA_Aircraft {
        this.aircraftVisible = false;
        const ac: ColladaAircraft = this.renderableAircraft[this.selectedSymbol];
        if (ac) {
            ac.hide();
        }
        // else, collada object is still loading, the object will be hidden by DAA_Aircraft.setupRenderables()
        if (this.renderablePosition) {
            this.renderablePosition.enabled = false;
        }
        if (this.renderableCallSign) {
            this.renderableCallSign.enabled = false;
        }
        return this;
    }
    /**
     * @function <a name="DAA_Aircraft_reveal">reveal</a>
     * @description Makes the aircraft visible on the map.
     * @param nmiScale Scale (in nautical miles) of the airspace where the aircraft is rendered. This optional parameter is useful in the case loading of the collada object takes a while, to update the zoom level of the collada object with the most recent zoom level.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    reveal(): DAA_Aircraft {
        this.aircraftVisible = true;
        const ac: ColladaAircraft = this.renderableAircraft[this.selectedSymbol];
        if (ac) {
            ac.reveal();
        }
        // else, collada object is still loading, the object will be revealed by DAA_Aircraft.setupRenderables()
        if (this.renderablePosition) {
            this.renderablePosition.enabled = true;
        }
        if (this.renderableCallSign) {
            this.renderableCallSign.enabled = this.callSignVisible;
        }
        if (this.velocity) {
            const deg = utils.rad2deg(Math.atan2(this.velocity.x, this.velocity.y));
            this.setHeading(deg);
        }
        return this;
    }
    /**
     * @function <a name="DAA_Aircraft_setHeading">setHeading</a>
     * @desc Ownship's heading, in degrees, clockwise, north is 0 deg.
     * @param deg (real) Heading degrees. If heading is not specified, the value is adjusted based on the velocity vector, if one is specified
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setHeading(deg?: number): DAA_Aircraft {
        deg = (deg === undefined || deg === null) ? this.getHeading() : deg;
        if (!isNaN(deg)) {
            Object.keys(this.renderableAircraft).forEach(symbol => {
                this.renderableAircraft[symbol].setHeading(-deg); // we are changing sign to the heading value because rotation of the aircraft is clockwise
            });
        } else {
            console.log(`[DAA_Aircraft] Warning: heading of ${this.callSign} is NaN`);
        }
        return this;
    }
    /**
     * @function <a name="DAA_Aircraft_setScale">setScale</a>
     * @desc Scales the aircraft symbol based on the map scale. This is useful to keep the symbol size constant when zooming in/out the map (in wwd, zooming in results in larger aircraft symbols, zooming out leads to smaller symbols).
     * @param nmiScale (real) Map scale, in nautical miles.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setScale(nmiScale: number): DAA_Aircraft {
        if (!isNaN(nmiScale)) {
            this.nmiScale = nmiScale;
            Object.keys(this.renderableAircraft).forEach((symbol: string) => {
                const ac: ColladaAircraft = this.renderableAircraft[symbol];
                if (this.view3D) {
                    const factor3d: number = (this.position.alt > 300) ? this.position.alt / 100 : 1; // this is necessary to enhance visibility of the object
                    ac.setColladaScale(factor3d * colladaScaleDrone);
                } else {
                    ac.setScale(this.nmiScale);
                }
            });
        } else {
            console.log("[DAA_Aircraft] Warning: scale is NaN");
        }
        return this;
    }
    /**
     * @function <a name="ColladaAircraft_setLoS">setLoS</a>
     * @description Renders conflict regions betweeen the current aircraft and the ownship. This function should be used only when the current aircraft is an intruder.
     * @memberof module:InteractiveMap
     * @instance
     * @inner
     */
    setLoS(region: utils.LatLonAlt[] | serverInterface.LatLonAlt[], opt?: { nmi?: number }): DAA_Aircraft {
        region = region || [];
        if (this.losLayer) {
            opt = opt || {};
            if (this.los) {
                // delete the old region, if any was rendered in the airspace
                this.los.hide();
                // delete this.los;
            }
            this.los = new LosRegion(this.losLayer, region, opt);
            this.los.reveal();
        } else {
            console.log("[DAA_Aircraft] Warning: LoS layer not present");
        }
        return this;
    }
    revealLoS(): DAA_Aircraft {
        this.los.reveal();
        return this;
    }
    hideLoS(): DAA_Aircraft {
        this.los.hide();
        return this;
    }
    removeLoS(): DAA_Aircraft {
        this.los.remove();
        return this;
    }
}