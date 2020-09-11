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
<div style="color: white; margin-top:6px; margin-left:16px; text-align: center;">
    <b>Traffic Data</b>
</div>`;

export const flightDataTemplate = `
<div class="container" id="{{id}}-list" style="color:white; margin-top:16px; white-space:nowrap;">
<div id="flight-time-{{flight.ownship.id}}">Time: {{currentTime}}</div>
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
</div>`;
