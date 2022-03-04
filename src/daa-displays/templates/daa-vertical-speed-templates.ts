export const FONT_FAMILY: string = "sans-serif";
export const TAPE_BACKGROUND_OPACITY: number = 0.6;
export const BUG_OPACITY: number = 1;
export const vspeedTemplate = `<div id="{{id}}-inner" style="overflow:hidden; position:absolute; height:432px; width:60px; top:{{top}}px; left:{{left}}px; opacity:0.8;">
        <div class="trims" style="opacity:${TAPE_BACKGROUND_OPACITY}">
            <div style="position:absolute; background-color:#333333; left:-77px; width:180px; height:71px; transform:rotate(75deg);"></div>
            <div style="position:absolute; background-color:#333333; top:400px; left:-99px; width:202px; height:71px; transform:rotate(-75deg);"></div>
            <div style="position:absolute; background-color:#333333; top:80px; left:-12px; width:90px; height:74px; transform:rotate(30deg); border-radius:2px;"></div>
            <div style="position:absolute; background-color:#333333; top:278px; left:-12px; width:90px; height:80px; transform:rotate(-30deg); border-radius:2px;"></div>
            <div style="position:absolute; background-color:#333333; top:128px; left:21px; width:39px; height:230px;"></div>
        </div>
        <div class="tape-right-small-spin-number-top" style="opacity:${TAPE_BACKGROUND_OPACITY}; top:-10px; position:absolute; left:1px; width:24px; height:100%; color:white; font-size:20px; text-align: right; line-height:48px; font-family:${FONT_FAMILY};">
            <div class="vspeedP3">6</div>
            <div class="vspeedP2">2</div>
            <div class="vspeedP1" style="line-height:78px;">1</div>
        </div>
        <div class="tape-right-small-spin-number-bottom" style="opacity:${TAPE_BACKGROUND_OPACITY}; top:270px; position:absolute; left:1px; width:24px; height:100%; color:white; font-size:20px; text-align: right; line-height:48px; font-family:${FONT_FAMILY};">
            <div class="vspeedP1" style="line-height:78px;">1</div>
            <div class="vspeedP2">2</div>
            <div class="vspeedP3">6</div>
        </div>
        <div class="tape-right-small-ticks" style="position:absolute;width:12px;left:32px;top:12px;">
            <div style="position:absolute; width:100%; border-top:2px solid white; border-bottom:2px solid white;height:26px;"></div>
            <div style="top:48px; position:absolute; width:100%; border-top:2px solid white; border-bottom:2px solid white;height:34px;"></div>
            <div style="top:111px; position:absolute; width:100%; border-top:2px solid white; border-bottom:2px solid white;height:48px;">
                <div class="vspeed-units" style="color:white;font-size:small; font-family:${FONT_FAMILY}; margin-top:48px; display:none;">fpm x100</div>
            </div>
            <div style="top:203px;position:absolute; width:37px; border-top:2px solid white;"></div>
            <div style="top:250px;position:absolute; width:100%; border-top:2px solid white; border-bottom:2px solid white;height:48px;"></div>
            <div style="top:327px;position:absolute; width:100%; border-top:2px solid white; border-bottom:2px solid white;height:34px;"></div>
            <div style="top:383px;position:absolute; width:100%; border-top:2px solid white; border-bottom:2px solid white;height:26px;"></div>
        </div>
        <div id="{{id}}-bands" style="position:absolute;top:24px;left:-6px; opacity:0.8;">
        </div>
        <div id="{{id}}-bug" style="position:absolute; left:40px; opacity:${BUG_OPACITY}; margin-top:1px; z-index:99;">
            <div id="{{id}}-bug-indicator" style="position:absolute;">
                <!-- box -->
                <div class="{{id}}-bug-tooltip" data-toggle="tooltip" data-placement="right" data-html="true" boundary="window" data-title="speedbug" id="{{id}}-bug-box" style="width:12px; height:11px; border:2px solid #cccccc; background-color:black; margin-left:4px;"></div>
                <!-- pointer -->
                <div id="{{id}}-bug-pointer" style="width:8px; height:8px; margin-top:-9.5px; border-bottom:2px solid #cccccc;border-right:2px solid #cccccc;background-color:black; transform:rotate(135deg);"></div>
            </div>
        </div>
        <div id="{{id}}-resolution-bug" style="position:absolute; margin-top:1px;">
            <div id="{{id}}-resolution-bug-indicator" style="position:absolute; opacity:0.8;">
                <div class="{{id}}-resolution-bug {{id}}-resolution-bug-tooltip" data-toggle="tooltip" data-placement="left" data-html="true" boundary="window" data-title="resolution bug" style="width:18px; margin-left:4px; height:11px; background-color:white; border-radius:16px;"></div>
            </div>
            <div class="{{id}}-resolution-bug" id="{{id}}-resolution-bug-notch" style="position:absolute; opacity:0.6; margin-left:24px; margin-top:6px; width:20px; height:11px; background-color:white;"></div>
            </div>
        </div>
    </div>
    <div id="{{id}}-indicator" style="display:none; position:absolute; top:{{top}}px; left:{{left}}px; opacity:0.8;">
        <div id="{{id}}-indicator-box" style="overflow: hidden; opacity:0.9; position:absolute; background-color:black; border: 2px solid white; width:82px; height:86px; top:452px; left:-2px;">
            <div id="{{id}}-indicator-digits" style="float:right; width:78px; height:100%; color:white; font-size:20px; text-align: center; line-height:85px; font-family:${FONT_FAMILY};">
            60000
            </div>
        </div>
    </div>
`;

export const vspeedBandsTemplate = `{{#each segments}}<div id={{id}} from={{from}} to={{to}} style="top:{{top}}px; height:{{height}}px;{{#if ../dash}} background-image: repeating-linear-gradient(0deg,transparent,transparent 7px,{{../color}} 0px,{{../color}} 14px);{{else}} background-color:{{../color}};{{/if}} position:absolute; width:8px; left:{{left}}px;"></div>
{{/each}}`;