// stub declarations for WorldWind
export declare namespace WorldWind {
    export class OpenStreetMapImageLayer {
        xhr: XMLHttpRequest;
        layer;
        displayName;
    }
    export class WmtsCapabilities {
        constructor (xmlDom: XMLDocument);
        serviceProvider;
        contents;
        getLayer(identifier: string);
    }
    export class WmtsLayer {
        static formLayerConfiguration(wmtsLayerCapabilities);
        constructor (config, timeString?: string);
    }
    export class Position {
        constructor (latitude: number, longitude: number, altitude: number)
    }
    export class Angle {
        static readonly DEGREES_TO_RADIANS: number;
    }
    export class ShapeAttributes {
        outlineColor: Color;
        interiorColor: Color;
        applyLighting: boolean;
        constructor  (attributes)
    }
    export class Color {
        constructor (red: number, green: number, blue: number, alpha: number)
        static readonly CYAN: number;
        static readonly RED: number;
        static readonly WHITE: number;
        static readonly YELLOW: number;
    }
    export class TriangleMesh {
        outlineIndices;
        constructor (positions, indices, attributes);
    }
    export class RenderableLayer {
        constructor (displayName?: string)
        addRenderable (renderable);
    }
    export class ColladaLoader {
        constructor (position: Position, config?)
    }
    export class GeographicText {
        constructor (position: Position, text: string)
    }
    export class TextAttributes {
        constructor (attributes)
    }
    export class Offset {
        constructor (xUnits: number, x: number, yUnits: number, y: number);
    }
    export class BMNGLayer {

    }
    export class BMNGOneImageLayer {

    }
    export class BMNGLandsatLayer {

    }
    export class BingAerialLayer {
        constructor (bingMapsKey: string);
    }
    export class BingAerialWithLabelsLayer {
        constructor (bingMapsKey: string);
    }
    export class BingRoadsLayer {

    }
    export class WorldWindow {
        constructor (canvasElem: string | HTMLCanvasElement, elevationModel?)
    }
    export class BMNGRestLayer {
        constructor (serverAddress: string, pathToData: string, displayName?: string, initialTime?: Date)
    }
    export class SurfaceImage {
        opacity: number;
        constructor (sector, imageSource)
    }
    export class Sector {
        static readonly FULL_SPHERE: number;
    }
    export class AtmosphereLayer {

    }
    export class CoordinatesDisplayLayer {
        constructor (worldWindow: WorldWindow);
    }
    export const REDRAW_EVENT_TYPE: string;
    export const ABSOLUTE: number;
    export const OFFSET_PIXELS: number;
}
