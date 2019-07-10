export const spectrogramTemplate: string = `
<div id="{{id}}" style="position:absolute;{{#if label.top}} margin-top:30px;{{/if}}">
    {{#if label.top}}
    <div style="position:absolute; white-space:nowrap; height:30px; top:-30px;">{{label.top}}{{#if units}} ( <em>{{units}}</em> ){{/if}}</div>
    {{/if}}{{#if label.left}}
    <div style="position:absolute; transform:rotate(-90deg); height:{{height}}px;">{{label.left}}</div>{{/if}}
    <div style="position:absolute; width:{{width}}px; height:{{height}}px; background-color:#2c3541de;">
        <div id="{{id}}-overlay-grid" class="spectrogram-overlay-grid" style="position:absolute; display:none;">
            {{#each grid}}
            <div id="{{../id}}-vline_{{@index}}" style="opacity:0.5; border-right: 1px solid white; left:{{left}}px; top:0px; height:{{height}}px; width:{{width}}px; position:absolute;">{{#if xAxis}}
                <div class="spectrogram-x-axis" style="position:absolute; top:{{height}}px; width:{{width}}px; text-align:center;">{{@index}}</div>{{/if}}</div>
            {{/each}}
        </div>
        <div id="{{id}}-overlay-warning" class="spectrogram-overlay-warning" style="position:absolute; display:block;">
            {{#each grid}}
            <div id="{{../id}}-warning_{{@index}}" style="display:none; opacity:1; text-align:center; color:red; left:{{left}}px; top:78px; height:{{height}}px; width:{{width}}px; position:absolute;">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            {{/each}}
        </div>
        <div class="spectrogram-x-axis" style="position:absolute; left:{{width}}px; height:{{height}}px; margin-left:10px;">
            <button id="{{id}}-max" data-toggle="modal-max" class="btn btn-sm" style="position:absolute; white-space:nowrap; margin-top:-12px;">{{to}}</button>
            <button id="{{id}}-min" data-toggle="modal-min" class="btn btn-sm" style="position:absolute; top:{{height}}px; margin-top:-25px; white-space:nowrap;">{{from}}</button>
        </div>
        <div id="{{id}}-cursor" style="transform-origin:top; background-color:steelblue; opacity: 0.4; left:0px; top:0px; height:{{cursor.height}}px; width:{{cursor.width}}px; position:absolute;"></div>
    </div>
    <div id="{{id}}-spectrogram-data"></div>
</div>`;

export const spectrogramBandTemplate: string = `
<div id="{{stepID}}" class="step_{{step}}" style="position:absolute; left:{{left}}px; opacity:0.9; height:{{height}}px; width:{{width}}px; overflow:hidden;"
    data-toggle="tooltip" data-placement="top" data-html="true" boundary="window"
    title="<div>Step {{step}}</div>{{#each bands}}{{#each this}}<div style='white-space:nowrap;'>{{@../key}} [ {{from}}, {{to}} ]</div>{{/each}}{{/each}}">
    {{#each bands}}
        {{#each this}}
        <div alert="{{@../key}}" from="{{from}} ({{units}})" to="{{to}} ({{units}})" style="top:{{top}}px; height:{{height}}px; width:{{../../width}}px; {{#if dash}} background-image: repeating-linear-gradient(45deg,transparent,transparent 2px,{{color}} 0px,{{color}} 4px);{{else}} background-color:{{color}};{{/if}} position:absolute;"></div>
        {{/each}}
    {{/each}}
</div>`;

export const spectrogramAlertsTemplate: string = `
<div id="{{stepID}}" class="step_{{step}}" style="position:absolute; left:{{left}}px; opacity:0.9; height:{{height}}px; width:{{width}}px; overflow:hidden;"
    data-toggle="tooltip" data-placement="top" data-html="true" boundary="window"
    title="<div>Step {{step}}</div><div style='white-space:nowrap;'>Alerts: [ {{alerts}} ]</div>">
    {{#each bands}}
        {{#each this}}
        <div alert="{{@../key}}" from="{{from}} ({{units}})" to="{{to}} ({{units}})" style="top:{{top}}px; height:{{height}}px; width:{{../../width}}px; {{#if dash}} background-image: repeating-linear-gradient(45deg,transparent,transparent 2px,{{color}} 0px,{{color}} 4px);{{else}} background-color:{{color}};{{/if}} position:absolute;"></div>
        {{/each}}
    {{/each}}
</div>`;
