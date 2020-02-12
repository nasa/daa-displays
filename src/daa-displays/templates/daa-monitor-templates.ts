export const monitorPanelTemplate = `
<div style="color: white; margin-top:6px; margin-left:16px; text-align: center;">
    <b>Monitors</b>
</div>
</div>`;

export const monitorTemplate = `<div class="container" id="{{id}}-list" style="color:white; margin-top:16px;">
{{#each monitors}}
<div class="row monitor" id="{{id}}" style="margin-top:10px;">
    <div class="input-group mb-3">
        <div class="input-group-prepend col-1">
            {{#if checkbox}}<div class="input-group-text" style="background-color:transparent; border: 1px solid transparent;">
                <input type="radio" name="{{../id}}-group" id="{{id}}-checkbox">
            </div>{{/if}}
        </div>
        <div class="col-1">
            <div id="{{id}}-status" style="border-radius:20px; background-color:{{color}}; width:20px; height: 20px; margin-right:10px; margin-top:3px; text-align:center; color:{{textcolor}}; font-size:small;">{{text}}</div>
        </div>
        <div class="col" id="{{id}}-label" style="white-space:nowrap;">{{name}}</div>
    </div>
</div>
{{/each}}</div>`;