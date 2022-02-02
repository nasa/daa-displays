/**
 * Template for the DOM element of the moving map
 * The canvas is used by WWD
 * The div is used by LeafletJS
 */
export const mapTemplate = `
<div id="{{id}}-inner" style="position:absolute; top:{{top}}px; left:{{left}}px; width:{{width}}px; height:{{height}}px; border-radius:6px; background-color:#333333; overflow:hidden;">
    <!-- wwd map -->
    <canvas id="{{id}}-canvas" class="map-canvas" width="{{width}}" height="{{height}}" style="position:absolute; width:{{width}}px; height:{{height}}px; background-color:black;">Your browser does not support HTML5 Canvas.
    </canvas>
    <!-- leafletjs map -->
    <div id="{{id}}-div" class="map-div" width="{{width}}" height="{{height}}" style="display:none; position:absolute; width:{{width}}px; height:{{height}}px; background-color:black;">
    </div>
</div>`;