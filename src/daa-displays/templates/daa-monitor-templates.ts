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
    <b>Aircraft Data</b>
    <div class="aircraft-data" style="text-align:left;"></div>
</div>
<br>
<div style="color:white; margin-top:6px; margin-left:16px; text-align:center;">
    <b>Encounter Information</b>
    <div class="encounter-data" style="text-align:left;"></div>
</div>`;

export const flightDataTemplate = `
<div class="container" id="{{id}}-list" style="color:white; margin-top:16px; white-space:nowrap;">
<div id="flight-time-{{flight.ownship.id}}">Time: {{currentTime}}</div>
{{#if flight}}
{{#if flight.ownship}}
    <div class="flight-data" style="margin-top:10px;" id="flight-{{flight.ownship.id}}">
        <div id="flight-name-{{flight.ownship.id}}">{{flight.ownship.id}}</div>
        <div style="padding-left:10px;" id="flight-position-{{flight.ownship.id}}">lat: {{flight.ownship.s.lat}}, lon: {{flight.ownship.s.lon}}, alt: {{flight.ownship.s.alt}}</div>
        <div style="padding-left:10px;" id="flight-velocity-{{flight.ownship.id}}">x: {{flight.ownship.v.x}}, y: {{flight.ownship.v.y}}, z: {{flight.ownship.v.z}}</div>
    </div>
{{/if}}
{{#each flight.traffic}}
    <div class="flight-data" style="margin-top:10px;" id="flight-{{id}}">
        <div id="flight-name-{{id}}">{{id}}</div>
        <div style="padding-left:10px;" id="flight-position-{{id}}">lat: {{s.lat}}, lon: {{s.lon}}, alt: {{s.alt}}</div>
        <div style="padding-left:10px;" id="flight-velocity-{{id}}">x: {{v.x}}, y: {{v.y}}, z: {{v.z}}</div>
    </div>
{{/each}}
{{else}}<div style="text-align:center;">N/A</div>{{/if}}
</div>`;

export const encounterDataTemplate = `
<div class="container" id="{{id}}-list" style="color:white; margin-top:16px; white-space:nowrap;">
{{#if currentTime}}
<div>Time: {{currentTime}}s</div>
<!-- ownship -->
{{#if ownship}}
<div>Ownship</div>
    <div style="padding-left:10px;">
        <div>Identifier: {{ownship.ownship}}</div>
        <div>Heading: {{ownship.heading.val}} {{ownship.heading.units}} - Track: {{ownship.track.val}} {{track.units}}</div>
        <div>Air Speed: {{ownship.airspeed.val}} {{ownship.airspeed.units}} ({{ownship.airspeed.internal}} m/s) - Ground Speed: {{ownship.groundspeed.val}} {{ownship.groundspeed.units}} ({{ownship.groundspeed.internal}} m/s)</div>
        <div>Vertical Speed: {{ownship.verticalspeed.val}} {{ownship.verticalspeed.units}} ({{ownship.verticalspeed.internal}} m/s)</div>
    </div>
{{/if}}
<!-- traffic -->
{{#if traffic}}
<div style="margin-top:10px;">Traffic</div>
{{#each traffic}}
    <div style="{{#if @first}}{{else}}margin-top:10px;{{/if}}padding-left:10px;">
        <div>Identifier: {{traffic}}</div>
        <div>Alert Level: {{alert.alert}} - Alerter: {{alert.alerter}}</div>
        <div>Heading: {{heading.val}} {{heading.units}} - Track: {{track.val}} {{track.units}}</div>
        <div>Air Speed: {{airspeed.val}} {{airspeed.units}} ({{airspeed.internal}} m/s) - Ground Speed: {{groundspeed.val}} {{groundspeed.units}} ({{groundspeed.internal}} m/s)</div>
        <div>Vertical Speed: {{verticalspeed.val}} {{verticalspeed.units}} ({{verticalspeed.internal}} m/s)</div>
        <div>Horizontal Separation: {{metrics.separation.horizontal.val}} {{metrics.separation.horizontal.units}} ({{metrics.separation.horizontal.internal}} m)</div>
        <div>Vertical Separation: {{metrics.separation.vertical.val}} {{metrics.separation.vertical.units}} ({{metrics.separation.vertical.internal}} m)</div>
        <div>Horizontal Closure Rate: {{metrics.closurerate.horizontal.val}} {{metrics.closurerate.horizontal.units}} ({{metrics.closurerate.horizontal.internal}} m/s)</div>
        <div>Vertical Closure Rate: {{metrics.closurerate.vertical.val}} {{metrics.closurerate.vertical.units}} ({{metrics.closurerate.vertical.internal}} m/s)</div>
        <div>Horizontal Miss Distance: {{metrics.missdistance.horizontal.val}} {{metrics.missdistance.horizontal.units}} ({{metrics.missdistance.horizontal.internal}} m/s)</div>
        <div>Vertical Miss Distance: {{metrics.missdistance.vertical.val}} {{metrics.missdistance.vertical.units}} ({{metrics.missdistance.vertical.internal}} m/s)</div>
        <div>Time to Horizontal Closest Point of Approach: {{metrics.tcpa.val}} {{metrics.tcpa.units}}</div>
        <div>Time to Co-Altitude: {{metrics.tcoa.val}} {{metrics.tcoa.units}}</div>
        <div>Modified Tau: {{metrics.taumod.val}} {{metrics.taumod.units}}</div>
    </div>
{{/each}}
{{/if}}
{{else}}<div style="text-align:center;">N/A</div>{{/if}}
</div>`;

// {{#each metrics}}
// <div style="padding-left:10px;" id="flight-{{@key}}-{{id}}">{{@key}}:
//     {{#if this.hor.val}} {{this.hor.val}}{{this.hor.units}}{{/if}}
//     {{#if this.ver.val}} {{this.ver.val}}{{this.ver.units}}{{/if}}
//     {{#if this.hor.time.val}} {{this.hor.time.val}}{{this.hor.time.units}}{{/if}}
//     {{#if this.hor.distance.val}} {{this.hor.distance.val}}{{this.hor.distance.units}}{{/if}}
//     {{#if this.val}} {{this.val}}{{this.units}}{{/if}}
// </div>
// {{/each}}
