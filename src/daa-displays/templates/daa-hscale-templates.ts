export const FONT_FAMILY: string = "sans-serif";
export const FONT_SIZE: number = 20; //px
export const radioButtons: string = `
<div id="{{id}}-carousel-controls" class="carousel slide" style="position:absolute; left:{{left}}px; top:{{top}}px; width:{{width}}px; height:40px; background-color:#333333;">
    <div class="carousel-inner">
        <div class="carousel-item">
            <div style="margin-left:44px; width:960px; height:40px; background-color: #333333;">
                <div id="{{id}}-radio1" class="form-check" style="position:absolute; left:40px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                    <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-1" style="transform:scale(1.5);">
                    <label class="form-check-label" for="{{id}}-radio-1" style="margin-left:4px;">{{nmiRadios.[1]}}</label>
                </div>
                <div id="{{id}}-radio1-overlay" style="position:absolute; left:40px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>
                <div id="{{id}}-radio2" class="form-check" style="position:absolute; left: {{offsets.[1]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-2" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-2" style="margin-left:4px;">{{nmiRadios.[2]}}</label>
                </div>
                <div id="{{id}}-radio2-overlay" style="position:absolute; left:{{offsets.[1]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>
                <div id="{{id}}-radio3" class="form-check" style="position:absolute; left: {{offsets.[2]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-3" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-3" style="margin-left:4px;">{{nmiRadios.[3]}}</label>
                </div>
                <div id="{{id}}-radio3-overlay" style="position:absolute; left:{{offsets.[2]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>
                <div id="{{id}}-radio4" class="form-check" style="position:absolute; left: {{offsets.[3]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-4" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-4" style="margin-left:4px;">{{nmiRadios.[4]}}</label>
                </div>
                <div id="{{id}}-radio4-overlay" style="position:absolute; left:{{offsets.[3]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>    
                <div id="{{id}}-radio5" class="form-check" style="position:absolute; left: {{offsets.[4]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-5" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-5" style="margin-left:4px;">{{nmiRadios.[5]}}</label>
                </div>
                <div id="{{id}}-radio5-overlay" style="position:absolute; left:{{offsets.[4]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>
                <div id="{{id}}-radio6" class="form-check" style="position:absolute; left: {{offsets.[5]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-6" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-6" style="margin-left:4px;">{{nmiRadios.[6]}}</label>
                </div>
                <div id="{{id}}-radio6-overlay" style="position:absolute; left:{{offsets.[5]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>    
                <div id="{{id}}-radio7" class="form-check" style="position:absolute; left: {{offsets.[6]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-7" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-7" style="margin-left:4px;">{{nmiRadios.[7]}}</label>
                </div>
                <div id="{{id}}-radio7-overlay" style="position:absolute; left:{{offsets.[6]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div> 
                <div id="{{id}}-radio8" class="form-check" style="position:absolute; left: {{offsets.[7]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-8" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-8" style="margin-left:4px;">{{nmiRadios.[8]}}</label>
                </div>
                <div id="{{id}}-radio8-overlay" style="position:absolute; left:{{offsets.[7]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>
            </div>
        </div>
        <div class="carousel-item active">
            <div style="margin-left:44px; width:960px; height:40px; background-color: #333333;">
                <div id="{{id}}-radio9" class="form-check" style="position:absolute; left:40px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                    <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-9" style="transform:scale(1.5);">
                    <label class="form-check-label" for="{{id}}-radio-9" style="margin-left:4px;">{{nmiRadios.[9]}}</label>
                </div>
                <div id="{{id}}-radio9-overlay" style="position:absolute; left:40px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>
                <div id="{{id}}-radio10" class="form-check" style="position:absolute; left: {{offsets.[1]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-10" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-10" style="margin-left:4px;">{{nmiRadios.[10]}}</label>
                </div>
                <div id="{{id}}-radio10-overlay" style="position:absolute; left:{{offsets.[1]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>
                <div id="{{id}}-radio11" class="form-check" style="position:absolute; left: {{offsets.[2]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-11" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-11" style="margin-left:4px;">{{nmiRadios.[11]}}</label>
                </div>
                <div id="{{id}}-radio11-overlay" style="position:absolute; left:{{offsets.[2]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>
                <div id="{{id}}-radio12" class="form-check" style="position:absolute; left: {{offsets.[3]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-12" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-12" style="margin-left:4px;">{{nmiRadios.[12]}}</label>
                </div>
                <div id="{{id}}-radio12-overlay" style="position:absolute; left:{{offsets.[3]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>    
                <div id="{{id}}-radio13" class="form-check" style="position:absolute; left: {{offsets.[4]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-13" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-13" style="margin-left:4px;">{{nmiRadios.[13]}}</label>
                </div>
                <div id="{{id}}-radio13-overlay" style="position:absolute; left:{{offsets.[4]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>
                <div id="{{id}}-radio14" class="form-check" style="position:absolute; left: {{offsets.[5]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-14" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-14" style="margin-left:4px;">{{nmiRadios.[14]}}</label>
                </div>
                <div id="{{id}}-radio14-overlay" style="position:absolute; left:{{offsets.[5]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>    
                <div id="{{id}}-radio15" class="form-check" style="position:absolute; left: {{offsets.[6]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-15" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-15" style="margin-left:4px;">{{nmiRadios.[15]}}</label>
                </div>
                <div id="{{id}}-radio15-overlay" style="position:absolute; left:{{offsets.[6]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>    
                <div id="{{id}}-radio16" class="form-check" style="position:absolute; left: {{offsets.[7]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-16" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-16" style="margin-left:4px;">{{nmiRadios.[16]}}</label>
                </div>
                <div id="{{id}}-radio16-overlay" style="position:absolute; left:{{offsets.[7]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>
            </div>
        </div>
    </div>    

    <a class="carousel-control-prev" style="width:36px; background-color:#333333; opacity:1;" href="#{{id}}-carousel-controls" role="button" data-slide="prev">
        <div style="position:absolute; border-radius: 6px 0 0 6px; color:white; width:40px; height:40px; border: 2px solid white; cursor:pointer;">
        </div>
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="sr-only">Previous</span>
    </a>
    <a class="carousel-control-next" style="width:36px; background-color:#333333; opacity:1;" href="#{{id}}-carousel-controls" role="button" data-slide="next">
        <div style="position:absolute; border-radius: 0 6px 6px 0; color:white; width:40px; height:40px; border: 2px solid white; cursor:pointer;">
        </div>
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="sr-only">Next</span>
    </a>
</div>
`;

export const radioButtonsNoScroll: string = `
<div id="{{id}}-carousel-controls" class="carousel slide" style="position:absolute; left:{{left}}px; top:{{top}}px; width:{{width}}px; height:40px; background-color:#333333;">
    <div class="carousel-inner">
        <div class="carousel-item active">
            <div style="margin-left:44px; width:960px; height:40px; background-color: #333333;">

                <div id="{{id}}-radio8" class="form-check" style="position:absolute; left:40px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-8" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-8" style="margin-left:4px;">{{nmiRadios.[8]}}</label>
                </div>
                <div id="{{id}}-radio8-overlay" style="position:absolute; left:40px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>

                <div id="{{id}}-radio9" class="form-check" style="position:absolute; left:{{offsets.[1]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                    <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-9" style="transform:scale(1.5);">
                    <label class="form-check-label" for="{{id}}-radio-9" style="margin-left:4px;">{{nmiRadios.[9]}}</label>
                </div>
                <div id="{{id}}-radio9-overlay" style="position:absolute; left:{{offsets.[1]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>
                <div id="{{id}}-radio10" class="form-check" style="position:absolute; left: {{offsets.[2]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-10" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-10" style="margin-left:4px;">{{nmiRadios.[10]}}</label>
                </div>
                <div id="{{id}}-radio10-overlay" style="position:absolute; left:{{offsets.[2]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>
                <div id="{{id}}-radio11" class="form-check" style="position:absolute; left: {{offsets.[3]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-11" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-11" style="margin-left:4px;">{{nmiRadios.[11]}}</label>
                </div>
                <div id="{{id}}-radio11-overlay" style="position:absolute; left:{{offsets.[3]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>
                <div id="{{id}}-radio12" class="form-check" style="position:absolute; left: {{offsets.[4]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-12" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-12" style="margin-left:4px;">{{nmiRadios.[12]}}</label>
                </div>
                <div id="{{id}}-radio12-overlay" style="position:absolute; left:{{offsets.[4]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>    
                <div id="{{id}}-radio13" class="form-check" style="position:absolute; left: {{offsets.[5]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-13" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-13" style="margin-left:4px;">{{nmiRadios.[13]}}</label>
                </div>
                <div id="{{id}}-radio13-overlay" style="position:absolute; left:{{offsets.[5]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>
                <div id="{{id}}-radio14" class="form-check" style="position:absolute; left: {{offsets.[6]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-14" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-14" style="margin-left:4px;">{{nmiRadios.[14]}}</label>
                </div>
                <div id="{{id}}-radio14-overlay" style="position:absolute; left:{{offsets.[6]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>    
                <div id="{{id}}-radio15" class="form-check" style="position:absolute; left: {{offsets.[7]}}px; color:white; width:{{buttonWidth}}px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:${FONT_SIZE}px; font-family:${FONT_FAMILY};">
                        <input type="radio" name="{{id}}-botradio" class="form-check-input" id="{{id}}-radio-15" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-radio-15" style="margin-left:4px;">{{nmiRadios.[15]}}</label>
                </div>
                <div id="{{id}}-radio15-overlay" style="position:absolute; left:{{offsets.[7]}}px; width:{{buttonWidth}}px; height:40px; cursor:pointer;">
                </div>
                
            </div>
        </div>
    </div>  
    
<a class="carousel-control-prev" style="width:36px; background-color:#333333; opacity:1;" href="#{{id}}-carousel-controls" role="button" data-slide="prev">
<div id="{{id}}-carousel-control-prev" style="position:absolute; border-radius: 6px 0 0 6px; color:white; width:40px; height:40px; border: 2px solid white; cursor:pointer;">
</div>
<span class="carousel-control-prev-icon" aria-hidden="true"></span>
<span class="sr-only">Previous</span>
</a>
<a class="carousel-control-next" style="width:36px; background-color:#333333; opacity:1;" href="#{{id}}-carousel-controls" role="button" data-slide="next">
<div id="{{id}}-carousel-control-next" style="position:absolute; border-radius: 0 6px 6px 0; color:white; width:40px; height:40px; border: 2px solid white; cursor:pointer;">
</div>
<span class="carousel-control-next-icon" aria-hidden="true"></span>
<span class="sr-only">Next</span>
</a>

</div>
`;