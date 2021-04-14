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
    <div>Altitude: {{ownship.acstate.altitude.val}} {{ownship.acstate.altitude.units}} {{#if ownship.acstate.altitude.internal}}({{ownship.acstate.altitude.internal}} {{ownship.acstate.altitude.internal_units}}){{/if}}</div>
    <div>Heading: {{ownship.acstate.heading.val}} {{ownship.acstate.heading.units}} - Track: {{ownship.acstate.track.val}} {{ownship.acstate.track.units}}</div>
    <div>Air Speed: {{ownship.acstate.airspeed.val}} {{ownship.acstate.airspeed.units}} {{#if ownship.acstate.airspeed.internal}}({{ownship.acstate.airspeed.internal}} {{ownship.acstate.airspeed.internal_units}}){{/if}} - Ground Speed: {{ownship.acstate.groundspeed.val}} {{ownship.acstate.groundspeed.units}} {{#if ownship.acstate.groundspeed.internal}}({{ownship.acstate.groundspeed.internal}} {{ownship.acstate.groundspeed.internal_units}}){{/if}}</div>
    <div>Vertical Speed: {{ownship.acstate.verticalspeed.val}} {{ownship.acstate.verticalspeed.units}} {{#if ownship.acstate.verticalspeed.internal}}({{ownship.acstate.verticalspeed.internal}} {{ownship.acstate.verticalspeed.internal_units}}){{/if}}</div>
</div>
{{/if}}
<!-- Resolutions -->
{{#each resolutions}}
<div style="margin-top:10px;"><b>{{@key}}</b></div>
<div style="padding-left:10px;">
    <div>Conflict: {{flags.conflict}} - Recovery: {{flags.recovery}} - Saturated: {{flags.saturated}}</div>
    <div>Ownship Region: {{ownship.region}}</div>
    <div>Time to Recovery: {{recovery.time}} s</div>
    <div>Recovery N-Factor: {{recovery.nfactor}}</div>
    <div>Horizontal Recovery Separation: {{#if recovery.distance.horizontal}}{{recovery.distance.horizontal.val}} {{recovery.distance.horizontal.units}} {{#if recovery.distance.horizontal.internal}}({{recovery.distance.horizontal.internal}} {{recovery.distance.horizontal.internal_units}}){{/if}}{{else}}N/A{{/if}}</div>
    <div>Vertical Recovery Separation: {{#if recovery.distance.vertical}}{{recovery.distance.vertical.val}} {{recovery.distance.vertical.units}} {{#if recovery.distance.vertical.internal}}({{recovery.distance.vertical.internal}} {{recovery.distance.vertical.internal_units}}){{/if}}{{else}}N/A{{/if}}</div>
    <div>Preferred Direction: {{flags.preferred}}</div>
    <div>Preferred Resolution ({{preferred_resolution.region}}): {{preferred_resolution.val}} {{preferred_resolution.units}}</div>
    <div>Other Resolution ({{other_resolution.region}}): {{other_resolution.val}} {{other_resolution.units}}</div>
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
        <div>Altitude: {{acstate.altitude.val}} {{acstate.altitude.units}} ({{acstate.altitude.val}} m)</div>
        <div>Heading: {{acstate.heading.val}} {{acstate.heading.units}} - Track: {{acstate.track.val}} {{acstate.track.units}}</div>
        <div>Air Speed: {{acstate.airspeed.val}} {{acstate.airspeed.units}} {{#if acstate.airspeed.internal}}({{acstate.airspeed.internal}} m/s){{/if}} - Ground Speed: {{acstate.groundspeed.val}} {{acstate.groundspeed.units}} {{#if acstate.groundspeed.internal}}({{acstate.groundspeed.internal}} m/s){{/if}}</div>
        <div>Alert Level: {{alert.alert_level}} - Alerter: {{alert.alerter}}</div>
        <div>Vertical Speed: {{acstate.verticalspeed.val}} {{acstate.verticalspeed.units}} {{#if acstate.verticalspeed.internal}}({{acstate.verticalspeed.internal}} m/s){{/if}}</div>
        <div>Horizontal Separation: {{metrics.separation.horizontal.val}} {{metrics.separation.horizontal.units}} {{#if metrics.separation.horizontal.internal}}({{metrics.separation.horizontal.internal}} m){{/if}}</div>
        <div>Vertical Separation: {{metrics.separation.vertical.val}} {{metrics.separation.vertical.units}} {{#if metrics.separation.vertical.internal}}({{metrics.separation.vertical.internal}} m){{/if}}</div>
        <div>Horizontal Closure Rate: {{metrics.closurerate.horizontal.val}} {{metrics.closurerate.horizontal.units}} {{#if metrics.closurerate.horizontal.internal}}({{metrics.closurerate.horizontal.internal}} m/s){{/if}}</div>
        <div>Vertical Closure Rate: {{metrics.closurerate.vertical.val}} {{metrics.closurerate.vertical.units}} {{#if metrics.closurerate.vertical.internal}}({{metrics.closurerate.vertical.internal}} m/s){{/if}}</div>
        <div>Horizontal Miss Distance: {{metrics.missdistance.horizontal.val}} {{metrics.missdistance.horizontal.units}} {{#if metrics.missdistance.horizontal.internal}}({{metrics.missdistance.horizontal.internal}} m/s){{/if}}</div>
        <div>Vertical Miss Distance: {{metrics.missdistance.vertical.val}} {{metrics.missdistance.vertical.units}} {{#if metrics.missdistance.vertical.internal}}({{metrics.missdistance.vertical.internal}} m/s){{/if}}</div>
        <div>Time to Horizontal Closest Point of Approach: {{metrics.tcpa.val}} {{metrics.tcpa.units}}</div>
        <div>Time to Co-Altitude: {{metrics.tcoa.val}} {{metrics.tcoa.units}}</div>
        <div>Modified Tau: {{metrics.taumod.val}} {{metrics.taumod.units}}</div>
    </div>
{{/each}}
{{/if}}
{{else}}<div style="text-align:center;">N/A</div>{{/if}}
</div>`;