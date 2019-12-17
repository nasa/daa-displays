export const checkButtons: string = `
<div id="{{id}}-checkbox-series" style="position:absolute; left:{{left}}px; top:{{top}}px; width:1040px; height:40px; background-color:#333333;">
        <div style="margin-left:44px; width:960px; height:40px; background-color: #333333;">
                <div id="{{id}}-checkbox1" class="form-check" style="position:absolute; left:0px; color:white; width:207px; height:40px; border: 2px solid white; border-radius: 6px 0 0 6px; padding-top:4px; padding-left: 28px; font-size:20px; font-family:sans-serif;">
                        <input type="checkbox" name="{{id}}-topcheck" class="form-check-input" id="{{id}}-checkbox-1" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-checkbox-1" style="margin-left:4px;">nrthup</label>
                </div>
                <div id="{{id}}-checkbox1-overlay" style="position:absolute; left:0px; width:207px; height:40px; cursor:pointer;">
                </div>
                <div id="{{id}}-checkbox2" class="form-check" style="position:absolute; left: 208px; color:white; width:207px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:20px; font-family:sans-serif;">
                        <input type="checkbox" name="{{id}}-topcheck" class="form-check-input" id="{{id}}-checkbox-2" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-checkbox-2" style="margin-left:4px;">call-sign</label>
                </div>
                <div id="{{id}}-checkbox2-overlay" style="position:absolute; left:208px; width:207px; height:40px; cursor:pointer;">
                </div>
                <div id="{{id}}-checkbox3" class="form-check" style="position:absolute; left: 416px; color:white; width:207px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:20px; font-family:sans-serif;">
                        <input type="checkbox" name="{{id}}-topcheck" class="form-check-input" id="{{id}}-checkbox-3" style="transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-checkbox-3" style="margin-left:4px;">terrain</label>
                </div>
                <div id="{{id}}-checkbox3-overlay" style="position:absolute; left:416px; width:207px; height:40px; cursor:pointer;">
                </div>
                <div id="{{id}}-checkbox4" class="form-check" style="position:absolute; left: 624px; color:white; width:207px; height:40px; border: 2px solid white; padding-top:4px; padding-left: 28px; font-size:20px; font-family:sans-serif;">
                        <input type="checkbox" name="{{id}}-topcheck" class="form-check-input" id="{{id}}-checkbox-4" style="display:none; transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-checkbox-4" style="margin-left:4px;"></label>
                </div>
                <div id="{{id}}-checkbox4-overlay" style="position:absolute; left:624px; width:207px; height:40px; cursor:pointer;">
                </div>    
                <div id="{{id}}-checkbox5" class="form-check" style="position:absolute; left: 832px; color:white; width:207px; height:40px; border: 2px solid white; border-radius: 0 6px 6px 0; padding-top:4px; padding-left: 28px; font-size:20px; font-family:sans-serif;">
                        <input type="checkbox" name="{{id}}-topcheck" class="form-check-input" id="{{id}}-checkbox-5" style="display:none; transform:scale(1.5);">
                        <label class="form-check-label" for="{{id}}-checkbox-5" style="margin-left:4px;"></label>
                </div>
                <div id="{{id}}-checkbox5-overlay" style="position:absolute; left:832px; width:207px; height:40px; cursor:pointer;">
                </div>
        </div>
</div>
`;