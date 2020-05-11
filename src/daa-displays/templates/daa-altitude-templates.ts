export const altitudeTemplate = `
<div id="{{id}}-inner" style="position:absolute; height:{{height}}px; top:{{top}}px; left:{{left}}px; opacity:0.8;">
    <div style="position:absolute; overflow:hidden; width:128px; height:650px;">
        <div id="{{id}}-spinner" style="transform:translateY(0px);">
            <div class="{{id}}-tape" style="position:absolute; background-color:#333333; margin-left:36px; left:8px; width:85px; height:{{height}}px;">
                <div id="{{id}}-tick-values" style="position:absolute; color:white; font-size:20px; top:24px; left:18px; line-height:162px; width:55px; text-align:right;">
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
            <div id="{{id}}-bands" style="position:absolute; top:24px; margin-left:36px;">
            </div>
            <div id="{{id}}-bug" style="opacity:0.6; position:absolute; left:19px; opacity:0.8; margin-top:98px; margin-left:36px;">
                <div style="position:absolute;">
                    <!-- box -->
                    <div class="{{id}}-bug-tooltip" data-toggle="tooltip" data-placement="right" data-html="true" boundary="window" data-title="altitudebug" id="{{id}}-bug-box" style="width:64px; margin-left:9px; height:12px; border:2px solid white; background-color:black;"></div>
                    <!-- pointer -->
                    <div id="{{id}}-bug-pointer" style="width:8px; height:8px; margin-top:-10px; margin-left:5px; border-bottom:2px solid white; border-right:2px solid white; background-color:black; transform:rotate(135deg);"></div>
                </div>
            </div>
            <div id="{{id}}-resolution-bug" style="position:absolute; opacity:0.7; margin-top:99px;">
                <div style="position:absolute;">
                    <div id="{{id}}-resolution-bug-notch" class="{{id}}-resolution-bug {{id}}-resolution-bug-tooltip" data-toggle="tooltip" data-placement="left" data-html="true" boundary="window" data-title="resolutionbug" style="width:18px; margin-left:15px; height:11px; background-color:white; border-radius:16px;"></div>
                </div>
            </div>
        </div>
    </div>
    <div id="{{id}}-indicator" style="position:absolute;">
        <div id="{{id}}-indicator-box" style="overflow: hidden; position:absolute; background-color:black; border: 2px solid white; width:99px; height: 86px; top:281px; left:70px;">
            <div id="{{id}}-indicator-first-still-digit" style="z-index:1; background-color:grey; position:absolute; top:28px; left:2px; width:18%; height:28px; color:white; font-size:34px; text-align: center; line-height:85px; font-family:serif;">
                &nbsp;
            </div>
            <div id="{{id}}-indicator-second-still-digit" style="position:absolute; left:20px; width:20%; height:100%; color:white; font-size:34px; text-align: center; line-height:85px; font-family:serif;">
                0
            </div>
            <div id="{{id}}-indicator-third-still-digit" style="position:absolute; left:40px; width:20%; height:100%; color:white; font-size:26px; text-align: center; line-height:85px; font-family:serif;">
                0
            </div>
            <div id="{{id}}-indicator-spinner" style="transform:translateY(0px); margin-top:25px; z-index:2; position:absolute; left:51px; width:40%; height:100%; color:white; float: right; font-size:26px; text-align: center; line-height:36px; font-family:serif;">
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