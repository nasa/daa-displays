export const monitorPanelTemplate = `
<div style="color: white; margin-top:6px; margin-left:16px; text-align: center;">
    <b>Properties</b>
</div>`;

export const monitorTemplate = `
<div class="container" id="{{id}}-list" style="color:white; margin-top:16px;">
{{#each monitors}}
    <div class="row monitor" id="{{id}}">
        <div class="input-group mb-3">
            <div class="input-group-prepend col-1">
                {{#if checkbox}}<div class="input-group-text" style="background-color:transparent; border: 1px solid transparent;">
                    <input type="radio" name="{{../id}}-group" id="{{id}}-checkbox" class="{{../id}}-checkbox">
                </div>{{/if}}
            </div>
            <div class="col-1">
                <div id="{{id}}-status" style="border-radius:20px; background-color:{{color}}; width:20px; height: 20px; margin-right:10px; margin-top:3px; text-align:center; color:{{textcolor}}; font-size:small;">{{text}}</div>
            </div>
            <div class="col" id="{{id}}-label">{{name}}</div>
        </div>
    </div>
{{/each}}
</div>`;

export const flightDataPanelTemplate = `
<div style="color:white; margin-top:6px; margin-left:16px; text-align:center;">
    <b>Encounter Information</b>
    <div class="encounter-data" style="text-align:left;"></div>
</div>`;

// This template is used for DAIDALUS 1.x
export const flightDataTemplate = `
<div class="container" id="{{id}}-list" style="color:white; margin-top:16px; white-space:nowrap;">
{{#if currentTime}}
<div><b>Time</b>: {{currentTime}} s</div>
{{#if ownship}}
<div><b>Ownship</b></div>
<div style="padding-left:10px;">
    <div>Identifier: {{ownship.id}}</div>
    <div>lat: {{ownship.s.lat}} deg, lon: {{ownship.s.lon}} deg, alt: {{ownship.s.alt}} ft</div>
    <div>vx: {{ownship.v.x}} m/s, vy: {{ownship.v.y}} m/s, vz: {{ownship.v.z}} m/s</div>
</div>
{{/if}}
{{#if traffic}}
<div style="margin-top:10px;"><b>Traffic</b></div>
{{#each traffic}}
<div style="{{#if @first}}{{else}}margin-top:10px;{{/if}}padding-left:10px;">
    <div>Identifier: {{id}}</div>
    <div>lat: {{s.lat}} deg, lon: {{s.lon}} deg, alt: {{s.alt}} ft</div>
    <div>vx: {{v.x}} m/s, vy: {{v.y}} m/s, vz: {{v.z}} m/s</div>
</div>
{{/each}}
{{/if}}
{{else}}<div style="text-align:center;">N/A</div>{{/if}}
</div>`;

// This template is used for DAIDALUS 2.x
export const encounterDataTemplate = `
<div class="container" id="{{id}}-list" style="color:white; margin-top:16px; white-space:nowrap;">
{{#if currentTime}}
<div><b>Time</b>: {{currentTime}} s</div>
<!-- ownship -->
{{#if ownship}}
<div><b>Ownship</b></div>
<div style="padding-left:10px;">
    <div>Identifier: {{ownship.acstate.id}}</div>
    <div>sx: {{ownship.acstate.s.x}} m, sy: {{ownship.acstate.s.y}} m,  sz: {{ownship.acstate.s.z}} m</div>
    <div>vx: {{ownship.acstate.v.x}} m/s, vy: {{ownship.acstate.v.y}} m/s,  vz: {{ownship.acstate.v.z}} m/s</div>
    <div>Altitude: {{printValUnits ownship.acstate.altitude}}</div> 
    <div>{{#if ownship.acstate.wind}}Heading: {{printValUnits ownship.acstate.heading}} - {{/if}}Track: {{printValUnits ownship.acstate.track}}</div>
    <div>{{#if ownship.acstate.wind}}Air Speed: {{printValUnits ownship.acstate.airspeed}} - {{/if}}Ground Speed: {{printValUnits ownship.acstate.groundspeed}}</div>
    <div>Vertical Speed: {{printValUnits ownship.acstate.verticalspeed}}</div>
</div>
{{/if}}
<!-- Resolutions -->
{{#each resolutions}}
<div style="margin-top:10px;"><b>{{@key}}</b></div>
<div style="padding-left:10px;">
    <div>Conflict: {{flags.conflict}} - Recovery: {{flags.recovery}} - Saturated: {{flags.saturated}}</div>
    <div>Ownship Region: {{ownship.region}}</div>
    {{#if direction}}
    <div>Preferred Direction: {{#if flags.preferred}}{{direction.up}}{{else}}{{direction.down}}{{/if}} ({{flags.preferred}})</div>
    <div>Preferred Resolution ({{preferred_resolution.region}}): {{printValUnits preferred_resolution.valunit}}</div>
    <div>Other Resolution ({{other_resolution.region}}): {{printValUnits other_resolution.valunit}}</div>
    {{/if}}
    {{#if recovery}}
    <div>Time to Recovery: {{recovery.time}} s</div>
    <div>Recovery N-Factor: {{recovery.nfactor}}</div>
    <div>Horizontal Recovery Separation: {{printValUnits recovery.distance.horizontal}}</div>
    <div>Vertical Recovery Separation: {{printValUnits recovery.distance.vertical}}</div>
    {{/if}}
</div>
{{/each}}
<!-- traffic -->
{{#if traffic}}
<div style="margin-top:10px;"><b>Traffic</b></div>
{{#each traffic}}
    <div style="{{#if @first}}{{else}}margin-top:10px;{{/if}}padding-left:10px;">
        <div>Identifier: {{acstate.id}}</div>
	    <div>sx: {{acstate.s.x}} m, sy: {{acstate.s.y}} m,  sz: {{acstate.s.z}} m</div>
        <div>vx: {{acstate.v.x}} m/s, vy: {{acstate.v.y}} m/s,  vz: {{acstate.v.z}} m/s</div>
        <div>Altitude: {{printValUnits acstate.altitude}}</div>
        <div>Alert Level: {{alert.alert_level}} ({{alert.alert_region}}){{#if alert.alerter}} - Alerter: {{alert.alerter}} ({{alert.alerter_idx}}){{/if}}</div>
        <div>{{#if acstate.wind}}Heading: {{printValUnits acstate.heading}} - {{/if}}Track: {{printValUnits acstate.track}}</div>
        <div>{{#if acstate.wind}}Air Speed: {{printValUnits acstate.airspeed}} - {{/if}}Ground Speed: {{printValUnits acstate.groundspeed}}</div>
        <div>Vertical Speed: {{printValUnits acstate.verticalspeed}}</div>
        <div>Horizontal Separation: {{printValUnits metrics.separation.horizontal}}</div>
        <div>Vertical Separation: {{printValUnits metrics.separation.vertical}}</div>
        <div>Horizontal Closure Rate: {{printValUnits metrics.closurerate.horizontal}}</div>
        <div>Vertical Closure Rate: {{printValUnits metrics.closurerate.vertical}}</div>
        <div>Horizontal Miss Distance: {{printValUnits metrics.missdistance.horizontal}}</div>
        <div>Vertical Miss Distance: {{printValUnits metrics.missdistance.vertical}}</div>
        <div>Time to Horizontal Closest Point of Approach: {{printValUnits metrics.tcpa}}</div>
        <div>Time to Co-Altitude: {{printValUnits metrics.tcoa}}</div>
        <div>Modified Tau: {{printValUnits metrics.taumod}}</div>
    </div>
{{/each}}
{{/if}}
{{else}}<div style="text-align:center;">N/A</div>{{/if}}
</div>`;