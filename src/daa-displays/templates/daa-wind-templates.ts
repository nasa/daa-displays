import { TAPE_OPACITY, TAPE_BACKGROUND_COLOR } from "./daa-constant-templates";
export const windTemplate = `<div id="{{id}}-inner" style="position:absolute; top:{{top}}px; left:{{left}}px; width:{{width}}px; height:{{height}}px; text-align:right; padding-top:4px; padding-right:10px; border-radius:6px; background-color:${TAPE_BACKGROUND_COLOR}; color:{{color}}; overflow:hidden; opacity:${TAPE_OPACITY};">
    <i id="{{id}}-arrow" class="fa fa-2x fa-long-arrow-up {{id}}-deg" style="position: absolute; top:14px; left:18px;"></i>
    <div class="{{id}}-deg"><span id="{{id}}-deg">0</span>&deg;&nbsp;</div>
    <div><span id="{{id}}-knot">0</span> kn</div>
</div>`;