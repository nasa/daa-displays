export const vspeedTemplate = `<div id="{{id}}-inner" style="overflow:hidden; position:absolute; height: 432px; width:60px; top:{{top}}px; left: 981px; opacity:0.8;">
        <div class="trims">
            <div style="position:absolute; background-color:#333333; left:-77px; width:180px; height:71px; transform:rotate(75deg);"></div>
            <div style="position:absolute; background-color:#333333; top:400px; left:-99px; width:202px; height:71px; transform:rotate(-75deg);"></div>
            <div style="position:absolute; background-color:#333333; top:80px; left:-12px; width:90px; height:74px; transform:rotate(30deg); border-radius:2px;"></div>
            <div style="position:absolute; background-color:#333333; top:278px; left:-12px; width:90px; height:74px; transform:rotate(-30deg); border-radius:2px;"></div>
            <div style="position:absolute; background-color:#333333; top:128px; left:21px; width:39px; height:230px;"></div>
        </div>
        <div class="tape-right-small-spin-number-top" style="top:-10px; z-index:2; position:absolute; left:1px; width:24px; height:100%; color:white; font-size:20px; text-align: right; line-height:48px; font-family:serif;">
            <div class="vspeedP3">6</div>
            <div class="vspeedP2">2</div>
            <div class="vspeedP1" style="line-height:78px;">1</div>
        </div>
        <div class="tape-right-small-spin-number-bottom" style="top:270px; z-index:2; position:absolute; left:1px; width:24px; height:100%; color:white; font-size:20px; text-align: right; line-height:48px; font-family:serif;">
            <div class="vspeedP1" style="line-height:78px;">1</div>
            <div class="vspeedP2">2</div>
            <div class="vspeedP3">6</div>
        </div>
        <div class="tape-right-small-ticks" style="position:absolute;width:12px;left:32px;top:12px;">
            <div style="position:absolute; width:100%; border-top:2px solid white; border-bottom:2px solid white;height:26px;"></div>
            <div style="top:48px; position:absolute; width:100%; border-top:2px solid white; border-bottom:2px solid white;height:34px;"></div>
            <div style="top:111px; position:absolute; width:100%; border-top:2px solid white; border-bottom:2px solid white;height:48px;">
                <div class="vspeed-units" style="color:white;font-size:small; margin-top:48px; display:none;">fpm x100</div>
            </div>
            <div style="top:203px;position:absolute; width:37px; border-top:2px solid white;"></div>
            <div style="top:250px;position:absolute; width:100%; border-top:2px solid white; border-bottom:2px solid white;height:48px;"></div>
            <div style="top:327px;position:absolute; width:100%; border-top:2px solid white; border-bottom:2px solid white;height:34px;"></div>
            <div style="top:383px;position:absolute; width:100%; border-top:2px solid white; border-bottom:2px solid white;height:26px;"></div>
        </div>
        <div id="{{id}}-bands" style="position:absolute;top:24px;left:2px; opacity:0.8;">
        </div>
        <div id="{{id}}-bug" style="position:absolute; left:40px; opacity:0.7;">
            <div style="position:absolute;">
                <!-- back -->
                <div class="{{id}}-bug-bl" style="width:12px; height:11px; border:1px solid white; background-color:black; margin-left:4px;"></div>
                <!-- pointer -->
                <div class="{{id}}-bug-bg" style="width:8px; height:8px; margin-top:-9.5px; border-bottom:2px solid white;border-right:2px solid white;background-color:black; transform:rotate(135deg);"></div>
            </div>
        </div>
        <div id="{{id}}-resolution-bug" style="position:absolute; left:20px; opacity:0.9;">
            <div style="position:absolute;">
                <!-- back -->
                <div class="{{id}}-resolution-bug-bl" style="width:8px; height:11px; border:1px solid white; background-color:grey; margin-left:4px;"></div>
                <!-- pointer -->
                <div style="width:8px; height:8px; margin-left:2px; margin-top:-10px; border-bottom:2px solid white;border-right:2px solid white;background-color:transparent; transform:rotate(-45deg);"></div>
            </div>
        </div>
    </div>`;

export const vspeedBandsTemplate = `{{#each segments}}<div id={{id}} from={{from}} to={{to}} style="top:{{top}}px; height:{{height}}px;{{#if ../dash}} background-image: repeating-linear-gradient(0deg,transparent,transparent 7px,{{../color}} 0px,{{../color}} 14px);{{else}} background-color:{{../color}};{{/if}} position:absolute; width:8px; left:{{left}}px;"></div>
{{/each}}`;