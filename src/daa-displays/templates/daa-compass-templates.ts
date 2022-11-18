import { FONT_FAMILY } from "./daa-constant-templates";
export const COMPASS_OPACITY: number = 0.6;
export const BANDS_OPACITY: number = 0.7;
export const WEDGE_OPACITY: number = 0.6;
export const COMPASS_SIZE: number = 634; //px
export const OWNSHIP_OPACITY: number = 0.6;
export const SHADE_OPACITY: number = 0.2;
export const indicatorsTemplate = `
<!-- top indicator -->
<div style="position:absolute; margin-left:-1px; margin-top:-110px; opacity:0.8;">
    <div id="{{id}}-top-hdg" style="color:#00f500; position:absolute; font-size:22px; font-family:${FONT_FAMILY}; margin-left:220px; top:58px; text-shadow:2px 2px black; opacity:0.8;">HDG</div>
    <div id="{{id}}-top-indicator" style="position:absolute;top:56px; margin-left:280px; opacity:0.8;">
        <div id="{{id}}-top-indicator-box" style="overflow: hidden; position:absolute; background-color:black; border: 2px solid white; width:78px; height: 39px;"></div>
        <div id="{{id}}-top-indicator-pointer" style="position:absolute; background-color:black; border-bottom: 2px solid white; border-right: 2px solid white; transform-origin:center; transform:rotate(45deg); width:20px; height: 20px; top:28px; left:29px;"></div>
        <div id="{{id}}-value" style="overflow:hidden; position:absolute; width:78px; height: 39px; color:white; font-size:26px; font-family:${FONT_FAMILY}; text-align: center; font-family:${FONT_FAMILY};z-index:1;">
            0
        </div>
    </div>
    <div id="{{id}}-top-mag" style="display:none; color:#00f500; position:absolute;font-size:22px;font-family:${FONT_FAMILY};margin-left:370px; top:64px;">MAG</div>
</div>
`;
export const compassTemplate = `
    <style>
        .compass {
            width: ${COMPASS_SIZE}px;
            height: ${COMPASS_SIZE}px;
            position: absolute;
            transform-origin: center;
        }
        .compass-labels {
            text-shadow: 1px 1px black;
            filter: drop-shadow(2px 2px 1px black);
            -webkit-filter: drop-shadow(2px 2px 1px black);
            font-family: ${FONT_FAMILY};
            font-size:16px;
            opacity:${COMPASS_OPACITY};
            color:white;
            position:absolute;
        }
    </style>
    <div id="{{id}}-inner" class="compass" style="top:{{top}}px; left:{{left}}px;">
    <!-- compass shade -->
    <div class="compass" style="border-radius:400px; border:{{#if fullShade}}310{{else}}79{{/if}}px solid #333333; opacity:${SHADE_OPACITY};"></div>
    <!-- compass labels -->
    <div id="{{id}}-compass-labels" class="compass-labels" style="display:none;">
        <div id="{{id}}-compass-label-outer" style="position: absolute; left:546px; top:76px;">5</div>
        <div id="{{id}}-compass-label-mid" style="position: absolute; left:435px; top:190px;">2.5</div>
        <div id="{{id}}-compass-label-inner" style="position: absolute; left:378px; top:247px;">1.25</div>
    </div>
    <!-- compass -->
    <div id="{{id}}-circle" class="compass" style="transform:rotate(0deg);">
        <object data="{{baseUrl}}svgs/danti-quadrant.svg" type="image/svg+xml" style="position:absolute;left:0px;width:635px;opacity:${COMPASS_OPACITY};"></object>
        <!-- compass bands -->
        <canvas id="{{id}}-bands" width="${COMPASS_SIZE}" height="${COMPASS_SIZE}" style="position:absolute;left:0px;opacity:${BANDS_OPACITY};"></canvas>
        <!-- resolution bug -->
        <div id="{{id}}-resolution-bug" class="compass" style="transform:rotate(0deg); display:none;">
            <!-- indicator -->
            <div id="{{id}}-resolution-bug-indicator" style="position:absolute; left:311px; top:75px;">
                <!-- back -->
                <div class="{{id}}-resolution-bug-bg" style="width:12px; height:12px; background-color:#ffbf00;"></div>
                <!-- pointer -->
                <div class="{{id}}-resolution-bug-bg" style="width:8px; height:8px; margin-top:-4px; margin-left:2px; background-color:#ffbf00; transform:rotate(45deg);"></div>
                <!-- line from bug to ownship, the line breaks into two pieces to avoid covering numbers in the compass -->
                <div class="{{id}}-resolution-bug-bl" style="width:2px; margin-top:-16px; height:245px; margin-left:5px; border-left:2px dashed #ffbf00;"></div>
            </div>
            <!-- wedge -->
            <canvas id="{{id}}-resolution-bug-wedge" width="${COMPASS_SIZE}" height="${COMPASS_SIZE}" style="position:absolute; opacity:${WEDGE_OPACITY};"></canvas>
        </div>
    </div>
    {{#if indicators}}
    <!-- indicators rendered in external div {{indicators}} -->
    {{else}}
    ${indicatorsTemplate}
    {{/if}}
    <!-- ownship -->
    <div id="{{id}}-ownship" style="z-index:1;">
        <div style="position:absolute; margin-left:301px; margin-top:289px;">
            <!-- <i class="fas fa-2x fa-location-arrow" style="color: #00fefe; transform-origin:center; transform:rotate(-45deg);"></i> -->
            <object id="{{id}}-daa-ownship" data="{{baseUrl}}svgs/ownship.svg" type="image/svg+xml" style="height:52px;position:absolute; opacity:${OWNSHIP_OPACITY};"></object>
        </div>
    </div>
</div>`;

export const compassBandsTemplate = `{{#each segments}}<div id={{id}} from={{from}} to={{to}} style="top:{{top}}px; height:{{height}}px;{{#if ../dash}} background-image: repeating-linear-gradient(0deg,transparent,transparent 7px,{{../color}} 0px,{{../color}} 14px);{{else}} background-color:{{../color}};{{/if}} position:absolute; width:8px; left:{{left}}px;"></div>
{{/each}}`;
