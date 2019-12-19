// stub declarations for WorldWind
export declare class OpenStreetMapImageLayer extends RenderableLayer {
    xhr: XMLHttpRequest;
    layer;
    displayName;
}
export declare class WmtsCapabilities {
    constructor (xmlDom: XMLDocument);
    serviceProvider;
    contents;
    getLayer(identifier: string);
}
export declare class WmtsLayer {
    static formLayerConfiguration(wmtsLayerCapabilities);
    constructor (config, timeString?: string);
}
export declare class Position {
    latitude: number;
    longitude: number;
    altitude: number;
    static readonly ZERO: Position;
    constructor (latitude: number, longitude: number, altitude: number)
}
export declare class Angle {
    static readonly DEGREES_TO_RADIANS: number;
}
export declare class ShapeAttributes {
    outlineColor: Color;
    outlineWidth: number;
    interiorColor: Color;
    applyLighting: boolean;
    depthTest: boolean;
    drawInterior: boolean;
    drawOutline: boolean;
    drawVerticals: boolean;
    outlineStipplePattern: number;
    outlineStippleFactor: number;
    imageSource: string | ImageSource;
    constructor  (attributes: ShapeAttributes)
}
export declare class ImageSource {
    readonly image;
    key: string;
    constructor (image);
}
export declare class Color {
    constructor (red: number, green: number, blue: number, alpha: number);
    alpha: number;
    blue: number;
    green: number;
    red: number;
    static colorFromByteArray (bytes: number[]): Color;
    static colorFromBytes (redByte: number, greenByte: number, blueByte: number, alphaByte: number): Color;
    clone(): Color;
    copy(): Color;
    equals(): boolean;
    equalsBytes(bytes: number[]): boolean;
    nextColor (): Color;
    premultipliedComponents (array: number[]): number[];
    set(red: number, green: number, blue: number): Color;
    toByteString(): string;
    toCssColorString(): string;
    static readonly BLACK: Color;
    static readonly BLUE: Color;
    static readonly CYAN: Color;
    static readonly GREEN: Color;
    static readonly LIGHT_GRAY: Color;
    static readonly MAGENTA: Color;
    static readonly MEDIUM_GRAY: Color;
    static readonly RED: Color;
    static readonly TRANSPARENT: Color;
    static readonly WHITE: Color;
    static readonly YELLOW: Color;
}
export declare class DrawContext {
    canvas2D: HTMLElement;
    clearColor: Color;
    eyePosition: Position;
    currentGlContext: WebGLRenderingContext;
    globe: Globe;
    constructor(gl: WebGLRenderingContext);
}
export declare class Renderable {
    displayName: string;
    enabled: boolean;
    pickDelegate: Object;
    userProperties: Object;
    constructor();
    render(dc: DrawContext): void;
}
export declare class AbstractShape extends Renderable {
    constructor(attributes: ShapeAttributes);
}
export declare class AbstractMesh extends AbstractShape {
    constructor(attributes: ShapeAttributes);
}
export declare class TriangleMesh extends AbstractMesh {
    outlineIndices: number[];
    highlighted: boolean;
    highlightAttributes: ShapeAttributes;
    attributes: ShapeAttributes;
    displayName: string;
    altitudeScale: number;
    altitudeMode: string;
    expirationInterval: number;
    enabled: boolean;
    constructor (positions: Position[], indices: number[], attributes: ShapeAttributes);
}
export declare class Navigator {
    constructor();
    heading: number;
    roll: number;
    tilt: number;
}
export declare class RenderableLayer extends Layer {
    constructor (displayName?: string)
    time: Date;
    readonly renderables: any[];
    addRenderable (renderable: Renderable): void;
    removeRenderable(renderable: Renderable): void;
    removeAllRenderables(): void;
}
export declare class ColladaLoader {
    init(config?: { dirPath?: string }): void;
    constructor (position: Position, config?: { dirPath?: string });
    load(url: string, cb: (scene: ColladaScene) => void);
}
export declare class ColladaScene extends Renderable {
    constructor(position: Position, sceneData: { root: { children: any }, meshes: any, materials: any, images: any, upAxis: any, dirPath: string });
    scale: number;
    altitudeMode: string;
    xRotation: number;
    yRotation: number;
    zRotation: number;
    position: Position;
}
export declare class GeographicText extends Renderable {
    attributes?: TextAttributes;
    declutterGroup?: number;
    position: Position;
    text: string;
    constructor (position: Position, text: string);
}
export declare class TextAttributes {
    color: Color;
    depthTest: boolean;
    enableOutline: boolean;
    font: Font;
    offset: Offset;
    outlineColor: Color;
    outlineWidth: number;
    scale: number;
    readonly stateKey: string;
    protected stateKeyInvalid: boolean;
    constructor (attributes: TextAttributes);
    protected computeStateKey (): string;
}
export declare class Font {
    size: number;
    style: string;
    variant: string;
    weight: string;
    family: string;
    horizontalAlignment: string;
    constructor (size: number, style: string, variant: string, weight: string, family: string, horizontalAlignment: string);
}
export declare class Offset {
    constructor (xUnits: number, x: number, yUnits: number, y: number);
}
export declare class BMNGLayer extends RenderableLayer {

}
export declare class BMNGOneImageLayer extends RenderableLayer {

}
export declare class BMNGLandsatLayer extends RenderableLayer {

}
export declare class BingAerialLayer extends RenderableLayer {
    constructor (bingMapsKey: string);
}
export declare class BingAerialWithLabelsLayer extends RenderableLayer {
    constructor (bingMapsKey: string);
}
export declare class BingRoadsLayer extends RenderableLayer {

}
export declare class LookAtNavigator extends Navigator {
    constructor();
    lookAtLocation: Location;
    range: number;
}
export declare class SurfaceShape extends Renderable {
    constructor(attributes: ShapeAttributes);
}
export declare class SurfacePolygon extends SurfaceShape {
    constructor(boundaries: Location[], attributes: ShapeAttributes);
}
export declare class SurfacePolyline extends SurfaceShape {
    constructor(boundaries: Location[], attributes: ShapeAttributes);
}
export declare class Polygon extends AbstractShape {
    altitudeMode: string;
    extrude: boolean;
    attributes: ShapeAttributes;
    constructor(boundaries: Position[][] | Position[], attributes: ShapeAttributes);
}
export declare class Location {
    latitude: number;
    longitude: number;
    constructor(latitude: number, longitude: number);
}
export declare class Layer {
    displayName: string;
    enabled: boolean;
    readonly isCurrentFrame: boolean;
    maxActiveAltitude: number;
    minActiveAltitude: number;
    opacity: number;
    pickEnabled: boolean;
    time: Date;
    render(dc: DrawContext): void;
    refresh(): void;
}
export declare class WorldWindow {
    constructor (canvasElem: string | HTMLCanvasElement, elevationModel?);
    addLayer(layer: RenderableLayer): void;
    removeLayer(layer: RenderableLayer): void;
    redraw(): void;
    surfaceOpacity: number;
    verticalExaggeration: number;
    navigator: LookAtNavigator;
    addEventListener(type: string, listener);
    layers: RenderableLayer[];
}
export declare class BMNGRestLayer extends RenderableLayer {
    constructor (serverAddress: string, pathToData: string, displayName?: string, initialTime?: Date)
}
export declare class SurfaceImage extends Renderable {
    opacity: number;
    constructor (sector, imageSource)
}
export declare class Sector {
    static readonly FULL_SPHERE: number;
}
export declare class AtmosphereLayer extends RenderableLayer {
}
export declare class CoordinatesDisplayLayer extends RenderableLayer {
    constructor (worldWindow: WorldWindow);
    doRender (dc: DrawContext): void;
    eyeText: GeographicText;
}
export declare class GeographicMesh extends AbstractMesh {
    constructor(positions: Position[], attributes: ShapeAttributes);
    altitudeMode: string;
    attributes: ShapeAttributes;
}
export declare class ElevationModel {
    coverages: any[];
}
export declare class GeographicProjection {
    constructor (displayName: string, continuous: boolean, projectionLimits: Sector);
}
export declare class Globe {
    constructor (elevationModel: ElevationModel, projecttion: GeographicProjection);
    is2D (): boolean;
}
export const REDRAW_EVENT_TYPE: string;
export const ABSOLUTE: string;
export const OFFSET_PIXELS: number;
export const OFFSET_INSET_PIXELS: number;
export const OFFSET_FRACTION: number;

export declare const CLAMP_TO_GROUND: string;
export declare const RELATIVE_TO_GLOBE: string;
export declare const RELATIVE_TO_GROUND: string;
