export const checkButtons: string = `
<div id="{{id}}-checkbox-series" style="position:absolute; left:{{left}}px; top:{{top}}px; width:{{width}}px; height:40px; background-color:#333333;">
        <div style="margin-left:44px; width:0; height:40px; background-color: #333333;">
                {{#each viewOptions}}
                <div id="{{../id}}-checkbox{{@key}}" class="form-check" style="position:absolute; left:{{left}}px; color:white; width:{{../buttonWidth}}px; height:40px; border: 2px solid white; {{#if @first}}border-radius: 6px 0 0 6px;{{/if}}{{#if @last}}border-radius: 0 6px 6px 0;{{/if}} line-height:24px; padding-top:6px; padding-left: 28px; font-size:20px; font-family:sans-serif;">
                        <input type="checkbox" name="{{../id}}-topcheck" class="form-check-input" id="{{../id}}-checkbox-{{@key}}" style="transform:scale(1.5);display:{{#if label}}block{{else}}none{{/if}};">
                        <label class="form-check-label" for="{{../id}}-checkbox-{{@key}}" style="margin-left:4px;display:{{#if label}}block{{else}}none{{/if}};">{{label}}</label>
                </div>
                <div id="{{../id}}-checkbox{{@key}}-overlay" style="position:absolute; left:{{left}}px; width:{{../buttonWidth}}px; height:40px; cursor:{{#if label}}pointer{{else}}default{{/if}};"></div>
                {{/each}}
        </div>
</div>
`;