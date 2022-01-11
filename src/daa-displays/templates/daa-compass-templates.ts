export const compassTemplate = `<div id="{{id}}-inner" style="position:absolute; top:{{top}}px; left:{{left}}px;">
    <!-- compass shade -->
    <div style="display:none; position:absolute; width:634px; height:634px; border-radius:400px; border: 79px solid #333333; position:absolute;opacity:0.6;"></div>
    <!-- compass labels -->
    <div id="{{id}}-compass-labels" style="position:absolute; opacity:0.8; color:white; display:none;">
        <div id="{{id}}-compass-label-outer" style="position: absolute; left:546px; top:76px;">5</div>
        <div id="{{id}}-compass-label-mid" style="position: absolute; left:435px; top:190px;">2.5</div>
        <div id="{{id}}-compass-label-inner" style="position: absolute; left:378px; top:247px;">1.25</div>
    </div>
    <!-- compass -->
    <div id="{{id}}-circle" style="position:absolute; width:634px; height:634px; transform-origin:center; transform:rotate(0deg);">
        <object data="{{baseUrl}}svgs/danti-quadrant.svg" type="image/svg+xml" style="width:635px;position:absolute;opacity:0.8;"></object>
        <!-- compass ticks -->
        <!-- <div id="{{id}}-ticks" style="position:absolute; width:634px; height:634px; font-weight:bolder; color:white; text-align:center;">
            <div style="position:absolute; width:634px; height:634px; transform:rotate(0deg);"></div>
            <div style="position:absolute; width:634px; height:634px; transform:rotate(10deg);">
                <div style="margin:auto;width:40px;margin-top:52px;">1</div>
            </div>
        </div> -->
        <!-- compass bands -->
        <canvas id="{{id}}-bands" width="634" height="634" style="position:absolute; opacity:0.8;"></canvas>
        <!-- resolution bug -->
        <div id="{{id}}-resolution-bug" style="position:absolute; width:634px; height:634px; transform:rotate(0deg); display:none;">
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
            <canvas id="{{id}}-resolution-bug-wedge" width="634" height="634" style="position:absolute; opacity:0.6;"></canvas>
        </div>
    </div>
    <!-- top indicator -->
    <div style="position:absolute; margin-left:-1px; margin-top:-110px; opacity:0.8;">
        <div id="{{id}}-top-hdg" style="color:#00f500; position:absolute;font-size:22px;margin-left:220px; top:64px;">HDG</div>
        <div id="{{id}}-top-indicator" style="position:absolute;top:56px; margin-left:280px; opacity:0.8;">
            <div id="{{id}}-top-indicator-box" style="overflow: hidden; position:absolute; background-color:black; border: 2px solid white; width:78px; height: 39px;"></div>    
            <div id="{{id}}-top-indicator-pointer" style="position:absolute; background-color:black; border-bottom: 2px solid white; border-right: 2px solid white; transform-origin:center; transform:rotate(45deg); width:20px; height: 20px; top:28px; left:29px;"></div>
            <div id="{{id}}-value" style="overflow:hidden; position:absolute; width:78px; height: 39px; color:white; font-size:26px; text-align: center; font-family:serif;z-index:1;">
                0
            </div>
        </div>
        <div id="{{id}}-top-mag" style="display:none; color:#00f500; position:absolute;font-size:22px;margin-left:370px; top:64px;">MAG</div>
    </div>
    <!-- ownship -->
    <div id="{{id}}-ownship" style="z-index:1;">
        <div style="position:absolute; margin-left:306px; margin-top:300px;">
            <!-- <i class="fas fa-2x fa-location-arrow" style="color: #00fefe; transform-origin:center; transform:rotate(-45deg);"></i> -->
            <object id="{{id}}-daa-ownship" data="{{baseUrl}}svgs/ownship.svg" type="image/svg+xml" style="width:22px;position:absolute;"></object>
        </div>
    </div>
</div>`;

export const compassBandsTemplate = `{{#each segments}}<div id={{id}} from={{from}} to={{to}} style="top:{{top}}px; height:{{height}}px;{{#if ../dash}} background-image: repeating-linear-gradient(0deg,transparent,transparent 7px,{{../color}} 0px,{{../color}} 14px);{{else}} background-color:{{../color}};{{/if}} position:absolute; width:8px; left:{{left}}px;"></div>
{{/each}}`;
