export const monitorPanelTemplate = `
<div style="color: white; margin-top:6px; margin-left:16px; text-align: center;">
    <b>Monitors</b>
</div>
</div>`;

export const monitorTemplate = `<div class="container" id="{{id}}-list" style="color:white; margin-top:16px;">
{{#each monitors}}
<div class="row monitor" id="{{id}}" style="margin-top:10px;">
    <div class="input-group mb-3">
        <div class="input-group-prepend">
            <div class="input-group-text" style="background-color:transparent; border: 1px solid transparent;">
            <input type="checkbox" aria-label="Checkbox for following text input" id="{{../id}}-{{id}}-checkbox">
            </div>
        </div>
        <div class="col-1">
            <div id="{{../id}}-{{id}}-status" style="border-radius:20px; background-color:{{color}}; width:20px; height: 20px; margin-right:10px; margin-top:3px; text-align:center; color:{{textcolor}}; font-size:small;">{{text}}</div>
        </div>
        <div class="col" id="{{../id}}-{{id}}-label" style="white-space:nowrap;">{{name}}</div>
    </div>
</div>
{{/each}}</div>`;

export const leftovers = `<div class="row monitor" id="monitor1" style="margin-top:10px;">
<div class="col-1">
    <div id="monitor1-status" style="border-radius:20px; background-color: greenyellow; width:20px; height: 20px; margin-right:10px; margin-top:3px; text-align:center; color:black; font-size:small;">{{text}}</div>
    <!-- <div id="status-y-monitor1" style="border-radius:20px; background-color: gold; width:20px; height: 20px; margin-right:10px; margin-top:3px; text-align:center; color:black;">Y</div>
    <div id="status-r-monitor1" style="border-radius:20px; background-color: crimson; width:20px; height: 20px; margin-right:10px; margin-top:3px; text-align:center; color:black;">R</div> -->
</div>
<div class="col" id="label-monitor1">Monitor 1</div>
<div class="col-3">
    <button id="monitor1-plot" type="button" class="btn btn-primary btn-sm">Plot</button>
    <!-- <input type="checkbox" name="monitor-checkbox" class="form-check-input" id="monitor1-checkbox" style="transform:scale(1.5); margin-left:5px; margin-top:7px;"> -->
</div>
</div>
<div class="row monitor" id="monitor2" style="margin-top:10px;">
<div class="col-1">
    <!-- <div id="status-g-monitor2" style="border-radius:20px; background-color: greenyellow; width:20px; height: 20px; margin-right:10px; margin-top:3px; text-align:center; color:black; font-size:small;">G</div> -->
    <div id="status-y-monitor2" style="border-radius:20px; background-color: gold; width:20px; height: 20px; margin-right:10px; margin-top:3px; text-align:center; color:black; font-size:small;">Y</div>
    <!-- <div id="status-r-monitor2" style="border-radius:20px; background-color: crimson; width:20px; height: 20px; margin-right:10px; margin-top:3px; text-align:center; color:black; font-size:small;">R</div> -->
</div>
<div class="col" id="label-monitor2">Monitor 2</div>
<div class="col-3">
    <button type="button" class="btn btn-primary btn-sm">Plot</button>
    <!-- <input type="checkbox" name="monitor-checkbox" class="form-check-input" id="monitor1-checkbox" style="transform:scale(1.5); margin-left:5px; margin-top:7px;"> -->
</div>
</div>
<div class="row monitor" id="monitor3" style="margin-top:10px;">
<div class="col-1">
    <!-- <div id="status-g-monitor2" style="border-radius:20px; background-color: greenyellow; width:20px; height: 20px; margin-right:10px; margin-top:3px; text-align:center; color:black; font-size:small;">G</div> -->
    <!-- <div id="status-y-monitor2" style="border-radius:20px; background-color: gold; width:20px; height: 20px; margin-right:10px; margin-top:3px; text-align:center; color:black; font-size:small;">Y</div> -->
    <div id="status-r-monitor2" style="border-radius:20px; background-color: crimson; width:20px; height: 20px; margin-right:10px; margin-top:3px; text-align:center; color:white; font-size:small;">R</div>
</div>
<div class="col" id="label-monitor3">Monitor 3</div>
<div class="col-3">
    <button type="button" class="btn btn-primary btn-sm">Plot</button>
    <!-- <input type="checkbox" name="monitor-checkbox" class="form-check-input" id="monitor1-checkbox" style="transform:scale(1.5); margin-left:5px; margin-top:7px;"> -->
</div>
</div>`;