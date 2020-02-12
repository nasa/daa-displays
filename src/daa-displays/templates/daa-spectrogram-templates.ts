export const spectrogramTemplate: string = `
<div id="{{id}}" style="position:absolute;{{#if label.top}} margin-top:30px;{{/if}}">
    {{#if label.top}}
    <div style="position:absolute; white-space:nowrap; height:30px; top:-23px;">{{label.top}}</div>
    {{/if}}{{#if label.left}}
    <div style="position:absolute; transform:rotate(-90deg); height:{{height}}px;">{{label.left}}</div>{{/if}}
    <div style="position:absolute; width:{{width}}px; height:{{height}}px; background-color:#2c3541de;">
        {{#if markers}}<div class="spectrogram-x-axis" style="position:absolute;">
            <button id="{{id}}-x-min" data-toggle="modal-min" class="btn btn-sm" style="position:absolute; top:{{height}}px; margin-top:-1px; left:{{markers.start.left}}px; white-space:nowrap; border-radius:0px; border-left: #2c3541de 1px solid;">{{markers.start.label}}</button>
            <button id="{{id}}-x-min" data-toggle="modal-min" class="btn btn-sm" style="position:absolute; top:{{height}}px; margin-top:-1px; left:{{markers.mid.left}}px; white-space:nowrap; border-radius:0px; border-left: #2c3541de 1px solid;">{{markers.mid.label}}</button>
            <button id="{{id}}-x-min" data-toggle="modal-min" class="btn btn-sm" style="position:absolute; top:{{height}}px; margin-top:-1px; margin-left:-0.4px; left:{{markers.end.left}}px; white-space:nowrap; border-radius:0px; border-left: #2c3541de 1px solid;">{{markers.end.label}} [sec]</button>
        </div>{{/if}}
        <div id="{{id}}-overlay-monitor" class="spectrogram-overlay-monitor" style="position:absolute; display:block; height:6px; top:{{markers.top}}px; width:{{width}}px; background:black;">
            {{#each grid}}
            <div id="{{../id}}-monitor-{{@index}}" class="spectrogram-monitor-element"
                 style="display:none; opacity:1; text-align:center; left:{{left}}px; top:-9px; width:{{width}}px; position:absolute; cursor:pointer;"
                 data-toggle="tooltip" data-placement="bottom" data-html="true" boundary="window"
                 title="<div>Syntactic difference at step {{@index}}</div>">
                <i class="fa fa-caret-up spectrogram-monitor-marker" style="color:#ffc107; margin-left:-3px; margin-top:4px;"></i>
            </div>
            {{/each}}
        </div>
        <div class="spectrogram-y-axis" style="position:absolute; left:{{width}}px; height:{{height}}px;">
            <button id="{{id}}-y-max" data-toggle="modal-max" class="btn btn-sm" style="position:absolute; white-space:nowrap; margin-top:-12px;">{{to}} {{units}}</button>
            <button id="{{id}}-y-min" data-toggle="modal-min" class="btn btn-sm" style="position:absolute; top:{{height}}px; margin-top:-25px; white-space:nowrap;">{{from}} {{units}}</button>
        </div>
        <div id="{{id}}-cursor" style="transform-origin:top; background-color:steelblue; opacity: 0.4; left:0px; top:0px; height:{{cursor.height}}px; width:{{cursor.width}}px; position:absolute;"></div>
    </div>
    <div id="{{id}}-spectrogram-data"></div>
</div>`;

export const spectrogramBandTemplate: string = `
<div id="{{stepID}}" class="step_{{step}}" style="position:absolute; left:{{left}}px; opacity:0.9; height:{{height}}px; width:{{width}}px; overflow:hidden;"
    data-toggle="tooltip" data-placement="top" data-html="true" boundary="window"
    title="<div>Time {{time}}{{tooltip}}</div>">
    {{#each bands}}
        {{#each this}}
        <div alert="{{@../key}}" from="{{from}} ({{units}})" to="{{to}} ({{units}})" style="top:{{top}}px; height:{{height}}px; width:{{width}}px; {{#if dash}} background-image: repeating-linear-gradient(45deg,transparent,transparent 2px,{{color}} 0px,{{color}} 4px);{{else}} background-color:{{color}};{{/if}} position:absolute;"></div>
        {{/each}}
    {{/each}}
    {{#if marker}}
        <div marker="{{marker.value}} ({{marker.units}})" style="top:{{marker.top}}px; height:{{marker.height}}px; width:{{marker.width}}px; background-color:{{marker.color}}; position:absolute;"></div>
    {{/if}}
    {{#if resolution}}
        <div resolution="{resolution.value}} ({{resolution.units}})" style="top:{{resolution.top}}px; height:{{resolution.height}}px; width:{{resolution.width}}px; background-color:{{resolution.color}}; position:absolute;"></div>
    {{/if}}
</div>`;

export const spectrogramAlertsTemplate: string = `
<div id="{{stepID}}" class="step_{{step}}" style="position:absolute; left:{{left}}px; opacity:0.9; height:{{height}}px; width:{{width}}px; overflow:hidden;"
    data-toggle="tooltip" data-placement="top" data-html="true" boundary="window"
    title="<div>Time {{time}}</div><div style='white-space:nowrap;'>Alerts: [ {{alerts}} ]</div>">
    {{#each bands}}
        {{#each this}}
        <div alert="{{@../key}}" alert_level="{{to}}" style="top:{{top}}px; border-radius:{{indicator.radius}}px; height:{{indicator.radius}}px; width:{{indicator.radius}}px; margin-top: {{indicator.marginTop}}px; {{#if dash}} background-image: repeating-linear-gradient(45deg,transparent,transparent 2px,{{color}} 0px,{{color}} 4px);{{else}} background-color:{{color}};{{/if}} position:absolute;"></div>
        {{/each}}
    {{/each}}
</div>`;
