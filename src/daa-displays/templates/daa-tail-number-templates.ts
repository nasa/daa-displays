import { TAPE_OPACITY, TAPE_BACKGROUND_COLOR } from "./daa-constant-templates";
export const tailNumberTemplate = `<div id="{{id}}-inner" style="position:absolute; top:{{top}}px; left:{{left}}px; width:{{width}}px; height:{{height}}px; text-align:right; padding-top:4px; padding-right:10px; border-radius:6px; background-color:${TAPE_BACKGROUND_COLOR}; color:{{color}}; overflow:hidden; opacity:${TAPE_OPACITY};">
    <div id="{{id}}-tail-number" style="white-space:nowrap; text-align:center; text-transform:uppercase">{{tailNumber}}</div>
</div>`;