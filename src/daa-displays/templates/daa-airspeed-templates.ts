export const airspeedTemplate = `
<div id="{{id}}-inner" style="position:absolute; height:{{height}}px; top:{{top}}px; left:{{left}}px; opacity:0.8;">
    <div style="position:absolute; overflow:hidden; width:128px; height:650px;">
        <div id="{{id}}-spinner" style="transform:translateY(0px)">
            <div id="{{id}}-rule" style="position:absolute; background-color:#333333;width:85px;height:{{height}}px;">
                <div id="{{id}}-tick-values" style="position:absolute; color:white; font-size:28px; line-height:54px; padding-top:26px; width:55px; text-align:right;">
                    500 480 460 440 420 400 380 360 340 320 300 280 260 240 220 200 180 160 140 120 100 80 60 40 20 10 00
                </div>
                <div id="{{id}}-ticks" style="position:absolute;width:12px;left:72px;top:24px;">
                </div>
            </div>
            <div id="{{id}}-bands" style="position:absolute;top:24px;">
            </div>
            <div id="{{id}}-bug" style="position:absolute; left:-2px; opacity:0.5; margin-top:18px;">
                <div id="{{id}}-bug-indicator" style="position:absolute;">
                    <!-- box -->
                    <div class="{{id}}-bug-tooltip" data-toggle="tooltip" data-placement="left" data-html="true" boundary="window" data-title="speedbug" id="{{id}}-bug-box" style="width:64px; margin-left:2px; height:12px; border:1px solid white; background-color:black;"></div>
                    <!-- pointer -->
                    <div id="{{id}}-bug-pointer" style="width:8px; height:8px; margin-top:-10px; margin-left:62px; border-bottom:2px solid white; border-right:2px solid white; background-color:black; transform:rotate(-45deg);"></div>
                </div>
            </div>
            <div id="{{id}}-resolution-bug" style="position:absolute; left:90px; margin-top:18px;">
                <div id="{{id}}-resolution-bug-indicator" style="position:absolute;">
                    <div data-toggle="tooltip" data-placement="right" data-html="true" data-boundary="window" data-title="resolution bug" 
                         class="{{id}}-resolution-bug {{id}}-resolution-bug-tooltip" style="width:18px; height:11px; margin-left:5px; background-color:white; border-radius:16px;"></div>
                </div>
                <div class="{{id}}-resolution-bug" id="{{id}}-resolution-bug-notch" style="position:absolute; opacity:0.6; width:28px; height:11px; margin-left:-6px; margin-top:6px; background-color:white;"></div>
            </div>
        </div>
    </div>
    <div id="{{id}}-indicator">
        <div id="{{id}}-indicator-box" style="overflow: hidden; position:absolute; background-color:black; border: 2px solid white; width:72px; height: 86px; top:281px; left:-13px;">
            <div id="{{id}}-indicator-still-digits" style="position:absolute; left: 5px; width:68%; height:100%; color:white; font-size:34px; text-align: center; line-height:85px; font-family:serif;">
            </div>
            <div id="{{id}}-indicator-spinner" style="transform:translateY(-0px); z-index:2; position:absolute; left:44px; width:32%; height:100%; color:white; float: right; font-size:34px; text-align: center; line-height:34px; font-family:serif; margin-top:26px;">
            </div>
        </div>
        <div id="{{id}}-indicator-pointer" style="position:absolute; background-color:black; border-bottom: 2px solid white; border-right: 2px solid white; transform-origin:center; transform:rotate(-45deg); width:20px; height: 20px; top:314px; left:48.5px;"></div>
    </div>
</div>`;

export const airspeedTicksTemplate = `
{{#each ticks}}<div style='top:{{top}}px; position:absolute; width:100%; border-bottom:2px solid white; height:54px;'></div>
{{/each}}`;

export const airspeedValuesTemplate = `
{{#each ticks}}<div {{#if units}}class='airspeed-units' {{/if}}style='top:{{top}}px; position:absolute; width:100%; text-align:center; margin-top:-4px; {{#if units}}font-size:medium; display:none; {{/if}}height:54px;'>{{label}}{{units}}</div>{{/each}}`;

export const airspeedBandsTemplate = `
{{#each segments}}<div id={{id}} from={{from}} to={{to}} style='top:{{top}}px; height:{{height}}px;{{#if ../dash}} background-image: repeating-linear-gradient(0deg,transparent,transparent 7px,{{../color}} 0px,{{../color}} 14px);{{else}} background-color:{{../color}};{{/if}} position:absolute; width:8px; left:{{left}}px;'></div>
{{/each}}`;

export const airspeedIndicatorSpinnerTemplate = `
{{#each ticks}}<div style='top:{{top}}px; position:absolute; width:100%; height:36px;'>{{label}}</div>{{/each}}`;
