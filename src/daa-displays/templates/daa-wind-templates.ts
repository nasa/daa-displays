export const TAPE_BACKGROUND_OPACITY: number = 0.6;
export const windTemplate = `<div id="{{id}}-inner" style="position:absolute; top:{{top}}px; left:{{left}}px; width:{{width}}px; height:{{height}}px; text-align:right; padding-top:4px; padding-right:10px; border-radius:6px; background-color:#333333; color:{{color}}; overflow:hidden; opacity:${TAPE_BACKGROUND_OPACITY};">
    <i id="{{id}}-arrow" class="fa fa-2x fa-long-arrow-up {{id}}-deg" style="position: absolute; top:14px; left:18px;"></i>
    <div class="{{id}}-deg"><span id="{{id}}-deg">0</span>&deg;&nbsp;</div>
    <div><span id="{{id}}-knot">0</span> kn</div>
</div>`;