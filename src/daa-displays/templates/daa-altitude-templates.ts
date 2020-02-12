export const altitudeTemplate = `
<div id="{{id}}-inner" style="position:absolute; height:{{height}}px; top:{{top}}px; left:870px; opacity:0.8;">
    <div style="position:absolute; overflow:hidden; width:92px; height:650px;">
        <div id="{{id}}-spinner" style="transform:translateY(0px);">
            <div class="{{id}}-tape" style="position:absolute; background-color:#333333; left:8px; width:85px; height:{{height}}px;">
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
            <div id="{{id}}-bands" style="position:absolute;top:24px;">
            </div>
            <div id="{{id}}-bug" style="position:absolute; left:8px; opacity:0.9; margin-top:98px;">
                <div style="position:absolute;">
                    <!-- back -->
                    <div class="{{id}}-bug" style="width:64px; margin-left:9px; height:12px; border:1px solid white; background-color:black;"></div>
                    <!-- pointer -->
                    <div class="{{id}}-bug" style="width:8px; height:8px; margin-top:-10px; margin-left:5px; border-bottom:2px solid white; border-right:2px solid white; background-color:black; transform:rotate(135deg);"></div>
                </div>
            </div>
            <div id="{{id}}-resolution-bug" style="position:absolute; left:24px; opacity:0.9; margin-top:98px;">
                <div style="position:absolute;">
                    <!-- back -->
                    <div class="{{id}}-resolution-bug" style="width:58px; margin-left:10px; height:12px; border:1px solid white; background-color:white;"></div>
                    <!-- pointer -->
                    <div class="{{id}}-resolution-bug" style="width:8px; height:8px; margin-top:-10px; margin-left:6px; border-bottom:2px solid white; border-right:2px solid white; background-color:white; transform:rotate(135deg);"></div>
                </div>
            </div>
        </div>
    </div>
    <div id="{{id}}-indicator" style="position:absolute;">
        <div id="{{id}}-indicator-box" style="overflow: hidden; position:absolute; background-color:black; border: 2px solid white; width:98px; height: 86px; top:281px; left:34px;">
            <div id="{{id}}-indicator-first-still-digit" class="green-stripes" style="z-index:1; position:absolute; top:28px; left:2px; width:18%; height:28px; color:white; font-size:34px; text-align: center; line-height:85px; font-family:serif;">
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
        <div id="{{id}}-indicator-pointer" style="position:absolute; background-color:black; border-bottom: 2px solid white; border-right: 2px solid white; transform-origin:center; transform:rotate(135deg); width:20px; height: 20px; top:314px; left:24px;"></div>
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