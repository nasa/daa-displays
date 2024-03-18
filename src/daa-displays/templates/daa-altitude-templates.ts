import { FONT_FAMILY, TAPE_BACKGROUND_OPACITY, BUG_OPACITY, TAPE_OPACITY, TAPE_BACKGROUND_COLOR, RESOLUTION_BUG_SCALE } from "./daa-constant-templates";
export const altitudeTemplate = `
<div id="{{id}}-inner" style="position:absolute; height:{{height}}px; top:{{top}}px; left:{{left}}px; opacity:${TAPE_OPACITY};">
    <div style="position:absolute; overflow:hidden; width:128px; height:650px;">
        <div id="{{id}}-spinner" style="transform:translateY(0px);">
            <div class="{{id}}-tape" style="position:absolute; opacity:${TAPE_BACKGROUND_OPACITY}; background-color:${TAPE_BACKGROUND_COLOR}; margin-left:36px; left:8px; width:85px; height:{{height}}px;">
                <div id="{{id}}-tick-values" style="position:absolute; color:white; font-size:20px; font-family:${FONT_FAMILY}; top:24px; left:18px; line-height:162px; width:55px; text-align:right;">
                    3000 2800 2600 2400 2200 2000 1800 1600 1400 1200 1000 800 600 400 200 000
                </div>
                <div id="{{id}}-ticks" style="position:absolute;width:12px;top:24px;">
                    <div style="position:absolute; width:100%; border-top:2px solid white; border-bottom:2px solid white;height:82px;"></div>
                    <div style="top:162px; position:absolute; width:100%; border-top:2px solid white; border-bottom:2px solid white;height:82px;"></div>
                    <div style="top:324px; position:absolute; width:100%; border-top:2px solid white; border-bottom:2px solid white;height:82px;"></div>
                    <div style="top:486px;position:absolute; width:100%; border-top:2px solid white; border-bottom:2px solid white;height:82px;"></div>
                    <div style="top:648px;position:absolute; width:100%; border-top:2px solid white; border-bottom:2px solid white;height:82px;"></div>
                </div>
            </div>
            <div id="{{id}}-bands" class="daa-guidance" style="position:absolute; top:24px; margin-left:36px;">
            </div>
            <div id="{{id}}-bug" style="opacity:${BUG_OPACITY}; position:absolute; left:19px; opacity:0.8; margin-top:98px; margin-left:36px;">
                <div id="{{id}}-bug-indicator" style="position:absolute;">
                    <!-- box -->
                    <div class="{{id}}-bug-tooltip" data-toggle="tooltip" data-placement="right" data-html="true" boundary="window" data-title="altitudebug" id="{{id}}-bug-box" style="width:64px; margin-left:9px; height:12px; border:2px solid white; background-color:black;"></div>
                    <!-- pointer -->
                    <div id="{{id}}-bug-pointer" style="width:8px; height:8px; margin-top:-10px; margin-left:5px; border-bottom:2px solid white; border-right:2px solid white; background-color:black; transform:rotate(135deg);"></div>
                </div>
            </div>
            <div id="{{id}}-resolution-bug" class="daa-guidance daa-resolution" style="position:absolute; margin-top:99px;">
                <div id="{{id}}-resolution-bug-indicator" style="position:absolute; opacity:${BUG_OPACITY};">
                    <div class="{{id}}-resolution-bug {{id}}-resolution-bug-tooltip" data-toggle="tooltip" data-placement="left" data-html="true" boundary="window" data-title="resolutionbug" style="width:18px; margin-left:15px; height:11px; background-color:white; border-radius:16px; transform:scale(${RESOLUTION_BUG_SCALE});"></div>
                </div>
                <div class="{{id}}-resolution-bug" id="{{id}}-resolution-bug-notch" style="position:absolute; opacity:0.6; width:28px; margin-left:18px; margin-top:6px; height:11px; background-color:white;"></div>
            </div>
        </div>
    </div>
    <div id="{{id}}-indicator" style="position:absolute; opacity:0.9;">
        <div id="{{id}}-indicator-box" style="overflow: hidden; position:absolute; background-color:black; border: 2px solid white; width:99px; height: 86px; top:281px; left:70px;">
            <div id="{{id}}-indicator-first-still-digit" style="z-index:1; background-color:grey; position:absolute; top:28px; left:2px; width:18%; height:28px; color:white; font-size:34px; text-align: center; line-height:85px; font-family:${FONT_FAMILY};">
                &nbsp;
            </div>
            <div id="{{id}}-indicator-second-still-digit" style="position:absolute; left:20px; width:20%; height:100%; color:white; font-size:34px; text-align: center; line-height:85px; font-family:${FONT_FAMILY};">
                0
            </div>
            <div id="{{id}}-indicator-third-still-digit" style="position:absolute; left:40px; width:20%; height:100%; color:white; font-size:26px; text-align: center; line-height:85px; font-family:${FONT_FAMILY};">
                0
            </div>
            <div id="{{id}}-indicator-spinner" style="transform:translateY(0px); margin-top:25px; z-index:2; position:absolute; left:51px; width:40%; height:100%; color:white; float: right; font-size:26px; text-align: center; line-height:36px; font-family:${FONT_FAMILY};">
               80 60 40 20 00
            </div>
        </div>
        <div id="{{id}}-indicator-pointer" style="position:absolute; background-color:black; border-bottom: 2px solid white; border-right: 2px solid white; transform-origin:center; transform:rotate(135deg); width:20px; height: 20px; top:314px; left:60px;"></div>
    </div>
</div>`;

export const altitudeTicksTemplate = `
{{#each ticks}}<div style='top:{{top}}px; position:absolute; width:100%; border-bottom:2px solid white; height:82px;'></div>{{/each}}`;

export const altitudeValuesTemplate = `
{{#each ticks}}<div {{#if units}}class='altitude-units' {{/if}}style='top:{{top}}px; position:absolute; width:100%; text-align:center; {{#if units}}font-size:medium; display:none; {{/if}}height:82px;'>{{label}}{{units}}</div>{{/each}}`;

export const altitudeIndicatorSpinnerTemplate = `
{{#each ticks}}<div style='top:{{top}}px; position:absolute; width:100%; height:36px;'>{{label}}</div>{{/each}}`;

export const altitudeBandsTemplate = `
{{#each segments}}<div id={{id}} from={{from}} to={{to}} style='top:{{top}}px; height:{{height}}px;{{#if ../dash}} background-image: repeating-linear-gradient(0deg,transparent,transparent 7px,{{../color}} 0px,{{../color}} 14px);{{else}} background-color:{{../color}};{{/if}} position:absolute; width:8px; left:{{left}}px;'></div>
{{/each}}`;