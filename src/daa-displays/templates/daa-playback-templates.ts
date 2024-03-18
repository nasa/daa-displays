import { DEFAULT_VOICE_PITCH, DEFAULT_VOICE_RATE } from "../daa-voice";
import { DAA_FILE_EXTENSIONS } from "../../config";

export const playbackTemplate: string = `
<div id="{{id}}" class="simulation-controls" style="position:absolute;">
    <div class="input-group input-group-sm mb-3" style="width:{{width}}px;left:{{left}}px;top:{{top}}px;">
        <div class="container-fluid" style="padding:0px;">
            <div class="row">
                <div class="col-sm">

                    <div class="input-group input-group-sm mb-3">
                        <div class="input-group-prepend">
                            <span class="btn-sm sim-control" style="text-align:center; background-color:#e9ecef; border:1px solid #ced4da; white-space:nowrap;vertical-align: middle;">Simulation Speed</span>
                        </div>
                        <input id="{{id}}-speed-input" style="text-align:center;" type="number" value="10" min="1" max="1000" step="1" aria-label="simulation speed" class="form-control">
                    </div>
                </div>
                <div class="col-sm">

                    <div class="input-group input-group-sm mb-3" style="display:none; margin-right:30px;">
                        <span class="btn-sm sim-control" style="text-align:center; background-color:#e9ecef; border:1px solid #ced4da; white-space:nowrap; vertical-align: middle; width:100%;">
                            Simulation step: 
                            <span id="{{id}}-curr-sim-step" style="margin-left:4px; margin-right:4px;">0</span>
                            of
                            <span id="{{id}}-tot-sim-steps" style="margin-left:4px; margin-right:4px;">0</span>
                        </span>
                    </div>
                    <div class="input-group input-group-sm mb-3">
                        <span class="btn-sm" style="text-align:left; background-color:#e9ecef; border:1px solid #ced4da; white-space:nowrap;vertical-align: middle; min-width:200px; width:100%;">
                            Current Time: 
                            <span style="float:right; text-align:right;">
                                <span id="{{id}}-curr-sim-time" style="user-select: all; margin-left:4px; margin-right:4px;">0</span><span>sec</span>
                            </span>
                        </span>
                    </div>

                </div>
                <div class="col-sm">
    
                    <div class="input-group mb-3">
                        <div class="btn-group btn-group-toggle" role="group" aria-label="View">
                            <button type="button" class="btn btn-sm btn-warning sim-control" id="{{id}}-back" style="width:86px;" alt="Step backward"><i class="fa fa-step-backward"></i></button>
                            <button type="button" class="btn btn-sm btn-danger sim-control" id="{{id}}-pause" style="width:86px;">Stop</button>
                            <button type="button" class="btn btn-sm btn-primary sim-control" id="{{id}}-play" style="width:90px;">Play</button>
                            {{#if multiplay}}
                            <div class="btn-group btn-group-sm integrated-multiplay-controls" role="group">
                                <button id="multiplay-group" type="button" class="btn btn-secondary btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                </button>
                                <div class="dropdown-menu" style="padding:0px !important;" aria-labelledby="multiplay-group">
                                {{#each multiplay}}
                                    <a class="dropdown-item" class="{{cssClass}} btn btn-sm btn-secondary">{{label}}</a>
                                {{/each}}
                                </div>
                            </div>
                            {{/if}}
                            <button type="button" class="btn btn-sm btn-warning sim-control" id="{{id}}-step" style="width:86px;" alt="Step forward"><i class="fa fa-step-forward"></i></button>
                        </div>
                    </div>

                </div>
            </div>
            <div class="row">
                <div class="col-sm">
                </div>
                <div class="col-sm">
                    <div class="input-group input-group-sm mb-3" style="display:none;">
                        <button id="{{id}}-goto" type="button" class="btn btn-sm btn-secondary sim-control" style="width:84px;">GoTo</button>
                        <input id="{{id}}-goto-input" class="form-control" style="text-align:center;" type="number" value="0" min="0" aria-label="goto">
                    </div>
                    <div class="input-group input-group-sm mb-3">
                        <button id="{{id}}-goto-time" type="button" class="btn btn-sm btn-secondary sim-control">Go to Time</button>
                        <input id="{{id}}-goto-time-input" class="form-control" style="text-align:center;" type="text" value="0" aria-label="goto-time">
                    </div>
                </div>
                <div class="col-sm">
                </div>
            </div>
        </div>
    </div>
</div>`;

// this template has all controls on a single line
export const integratedPlaybackTemplate: string = `
<div id="{{id}}" class="simulation-controls" style="position:absolute;">
    <div class="input-group input-group-sm mb-3" style="width:{{width}}px;left:{{left}}px;top:{{top}}px;">
        <div class="container-fluid" style="padding:0px;">
            <div class="row">
                <div class="col-sm">

                    <div class="input-group input-group-sm mb-3">
                        <div class="input-group-prepend">
                            <span class="btn-sm sim-control" style="text-align:center; background-color:#e9ecef; border:1px solid #ced4da; white-space:nowrap;vertical-align: middle;">Simulation Speed</span>
                        </div>
                        <input id="{{id}}-speed-input" style="text-align:center;" type="number" value="10" min="1" max="1000" step="1" aria-label="simulation speed" class="form-control">
                    </div>
                </div>
                <div class="col-sm">

                    <div class="input-group input-group-sm mb-3" style="display:none; margin-right:30px;">
                        <span class="btn-sm sim-control" style="text-align:center; background-color:#e9ecef; border:1px solid #ced4da; white-space:nowrap; vertical-align: middle; width:100%;">
                            Simulation step: 
                            <span id="{{id}}-curr-sim-step" style="margin-left:4px; margin-right:4px;">0</span>
                            of
                            <span id="{{id}}-tot-sim-steps" style="margin-left:4px; margin-right:4px;">0</span>
                        </span>
                    </div>
                    <div class="input-group input-group-sm mb-3">
                        <span class="btn-sm" style="text-align:left; background-color:#e9ecef; border:1px solid #ced4da; white-space:nowrap;vertical-align: middle; min-width:200px; width:100%;">
                            Time: 
                            <span id="{{id}}-curr-sim-time" style="user-select: all; margin-left:4px; margin-right:4px;">0</span><span>sec</span>
                        </span>
                    </div>

                </div>
                <div class="col-sm">
    
                    <div class="input-group mb-3">
                        <div class="btn-group btn-group-toggle" role="group" aria-label="View">
                            <button type="button" class="btn btn-sm btn-warning sim-control" id="{{id}}-back" style="width:86px;" alt="Step backward"><i class="fa fa-step-backward"></i></button>
                            <button type="button" class="btn btn-sm btn-danger sim-control" id="{{id}}-pause" style="width:86px;">Stop</button>
                            <button type="button" class="btn btn-sm btn-primary sim-control" id="{{id}}-play" style="width:90px;">Play</button>
                            {{#if multiplay}}
                            <div class="btn-group btn-group-sm integrated-multiplay-controls" role="group">
                                <button id="multiplay-group" type="button" class="btn btn-sm btn-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                </button>
                                <div class="dropdown-menu" style="padding:0px !important;" aria-labelledby="multiplay-group">
                                {{#each multiplay}}
                                    <a id="{{id}}" class="dropdown-item btn btn-sm btn-secondary {{cssClass}}">{{label}}</a>
                                {{/each}}
                                </div>
                            </div>
                            {{/if}}
                            <button type="button" class="btn btn-sm btn-warning sim-control" id="{{id}}-step" style="width:86px;" alt="Step forward"><i class="fa fa-step-forward"></i></button>
                        </div>
                    </div>

                </div>
                <div class="col-sm">
                    <div class="input-group input-group-sm mb-3" style="display:none;">
                        <button id="{{id}}-goto" type="button" class="btn btn-sm btn-secondary sim-control" style="width:84px;">GoTo</button>
                        <input id="{{id}}-goto-input" class="form-control" style="text-align:center;" type="number" value="0" min="0" aria-label="goto">
                    </div>
                    <div class="input-group input-group-sm mb-3">
                        <button id="{{id}}-goto-time" type="button" class="btn btn-sm btn-secondary sim-control">Go to Time</button>
                        <input id="{{id}}-goto-time-input" class="form-control" style="text-align:center;" type="text" value="0" aria-label="goto-time">
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>`;

export const activationPanel: string =`
<div id="{{id}}-activation-panel" class="activation-panel" style="position:absolute;width:100%;">
    <div class="input-group mb-3" style="width:{{width}}px; margin-right:30px;">
        <div class="btn-group btn-group-toggle" role="group" aria-label="View">
            <button type="button" class="btn btn-sm btn-success load-scenario-btn" style="white-space:nowrap; width:{{width}}px;">Load Selected Scenario and Configuration</button>
        </div>
    </div>
</div>`;

export const daidalusParametersTemplate: string = `
<select id="{{id}}-list" class="form-control" size="16" style="overflow:auto;">
    {{#each daidalus.parameters}}
    <option id="{{../id}}-{{@key}}">{{@key}}: {{this}}</option>
    {{/each}}
</select>`;

export const daidalusVersionsTemplate: string = `
<select id="{{id}}-list" class="form-control sim-selector" size="1">
    {{#each versions}}
    <option {{#if @first}}selected {{/if}}id="{{../id}}-{{this}}">{{this}}</option>
    {{/each}}
</select>`;

export const windSettingsTemplate: string = `
<select id="{{id}}-list-degs" class="form-control sim-selector {{id}}-list" size="1">
    {{#each degs}}
    <option {{#if @first}}selected {{/if}}id="{{../id}}-{{this}}" value="{{this}}">{{this}} deg</option>
    {{/each}}
</select>
<select id="{{id}}-list-knots" class="form-control sim-selector {{id}}-list" size="1">
    {{#each knots}}
    <option {{#if @first}}selected {{/if}}id="{{../id}}-{{this}}" value="{{this}}">{{this}} knot</option>
    {{/each}}
</select>`;

export const windDivTemplate: string = `
<div id="{{id}}" style="position:absolute; top:0px; height:60px; width:400px; margin-left:660px;"></div>
`;

export const configDivTemplate: string = `
<div id="{{id}}" class="input-group" style="height:31px;width:400px; margin-left:4px;"></div>
`;

export const daidalusVersionDivTemplate: string = `
<div id="{{id}}" class="input-group" style="height:31px;width:400px; margin-left:4px;"></div>
`;

// export const displayDivTemplate: string = `
// <div class="row" style="margin-top:20px; margin-left:auto; text-align:center;">
// {{#each aircraft}}
//     <div class="card" style="width:856px; height:742px; margin:20px;">
//         <div id="daa-display-{{@index}}" class="multi-view-display">
//             <!-- tail number -->
//             <div class="card-header" style="margin-bottom:10px;">{{this}}</div>
//             <!-- display -->
//             <div style="background-color:white;transform:scale(0.8);transform-origin:top left;">
//             <div id="daa-disp-{{@index}}" style="margin-top:10px;">
//             </div>
//             </div>
//         </div>
//     </div>
// {{/each}}
// </div>
// `;

export const displayDivTemplate: string = `
<style>
.multi-view-display-list {
    width:120px;
    position:relative;
    min-height:{{dispHeight}}px;
    margin-top:102px;
}
.multi-view-display-options {
    width:120px;
    position:absolute;
    min-height:{{dispHeight}}px;
    margin-top:42px;
    transform: scale(0.84);
    transform-origin: top left;
}
.multi-view-display-minimized {
    margin:6px;
}
.multi-view-display {
    position:relative;
    margin-top:54px;
    margin-left:10px;
    width:{{dispWidth}}px;
    height:{{dispHeight}}px;
}
.multi-view-tail-number {
    position:absolute;
    top:{{height}}px;
    left:4px;
    width:{{width}}px;
}
.tail-number-label {
    text-align:center;
    background-color:#e9ecef; 
    border:1px solid #ced4da; 
    white-space:nowrap;
    vertical-align:middle; 
    width:{{width}}px;
    font-weight:bold;
    font-size:x-large !important;
    cursor:default !important;
}
.hide-multi-view-display-btn {
    margin-left:1px;
    min-width:170px;
    font-size:x-large !important;
}
</style>
<script>
function reveal (id, cssdisp) { $(id).css({ display: cssdisp || 'block'}); }
function hide (id) { $(id).css({ display: 'none'}); }
</script>
<div style="display:grid; grid-template-columns: auto auto;">

    <!-- display options -->
    <div class="multi-view-display-options"></div>
    <!-- display list -->
    <div class="multi-view-display-list">
        {{#each aircraft}}
        <div id="show-daa-display-{{@index}}-btn" class="multi-view-display-btn" style="display:none;">
            <button class="btn btn-outline-primary btn-sm multi-view-display-minimized" type="button" 
                    onclick="hide('#show-daa-display-{{@index}}-btn');reveal('#multi-view-display-{{@index}}', 'grid');">
            Show display {{this}}
            </button>
        </div>
        {{/each}}
    </div>

    <!-- display grid (1xN) -->
    <div>
        {{#each aircraft}}
        <div id="multi-view-display-{{@index}}" style="display:grid; grid-template-columns: auto auto;">
            <div style="position:relative;transform:scale(0.8);transform-origin:top left;">
                <div id="daa-display-{{@index}}" class="multi-view-display collapse show">
                    <!-- display -->
                    <div id="daa-disp-{{@index}}" style="margin-top:10px;"></div>
                    <!-- tail number -->
                    <div class="multi-view-tail-number">
                        <div class="input-group input-group-sm">
                            <div class="input-group-prepend" style="position:absolute;">
                                <button class="btn btn-sm btn-dark hide-multi-view-display-btn" type="button"
                                        onclick="reveal('#show-daa-display-{{@index}}-btn');hide('#multi-view-display-{{@index}}');">
                                    Hide
                                </button>
                            </div>
                            <div class="btn btn-sm tail-number-label">
                                {{this}}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div>
                <div id="simulation-plot-{{@index}}" style="position:relative; top:85px;"></div>
            </div>
        </div>
        {{/each}}
    </div>
</div>
`;

export const windSettingsInputGroupTemplate: string = `
<div class="input-group input-group-sm">
    <div class="input-group-prepend">
        <span class="input-group-text" id="{{id}}-deg-label">deg&nbsp;</span>
    </div>
    <input type="number" id="{{id}}-list-degs" style="font-size:1em !important;" class="form-control {{id}}-list" aria-label="direction" aria-describedby="{{id}}-deg-label">
    <div class="input-group-append">
        <select id="{{id}}-from-to-selector" style="display:none;" class="form-control sim-selector {{id}}-list" size="1">
            <option selected value="from">from</option>
            <option value="to">to</option>
        </select>
    </div>
</div>
<div class="input-group input-group-sm">
    <div class="input-group-prepend">
        <span class="input-group-text" id="{{id}}-knot-label">knot</span>
    </div>
    <input type="number" id="{{id}}-list-knots" class="form-control {{id}}-list" aria-label="magnitude" aria-describedby="{{id}}-knot-label">
</div>`;

export const daaScenariosListTemplate: string = `
<select id={{id}}-scenarios-list class="form-control" size="20" style="overflow:auto;">
    {{#each scenarios}}
    <option {{#if this.selected}}selected {{/if}}id="{{../id}}-scenario-{{this.id}}">{{this.name}}</option>
    {{/each}}
</select>`;

export const daidalusConfigurationsTemplate: string = `
<select id="{{id}}-list" class="form-control sim-selector" size="1">
    {{#each configurations}}
    <option id="{{../id}}-{{this}}">{{this}}</option>
    {{/each}}
</select>`;

// export const daidalusAttributesTemplate: string = `
// <select id={{id}}-list class="form-control" size="30" style="overflow:auto;margin-bottom:20px;">
//     <option id="{{id}}-{{fileName}}">## Configuration {{fileName}}</option>
//     {{#each attributes}}
//     <option id="{{../id}}-{{this}}">{{this}}</option>
//     {{/each}}
// </select>`;

export const daidalusAttributesTemplate: string = `
<div class="container" id="{{id}}-list" class="form-control" style="overflow:auto;margin-bottom:20px;">
    <div class="row">
        <div class="col-sm" style="white-space:nowrap; font-weight:bold;"># {{fileName}}</div>
    </div>
    {{#each attributes}}
    <div class="row">
        <div class="col-sm" style="white-space:nowrap;">{{this}}</div>
    </div>
    {{/each}}
</div>`;

export const sidePanelTemplate: string = `
<div class="container-fluid">
<div class="row">
    <nav id="sidebar-panel" class="col-md-2 d-none d-md-block bg-light sidebar">
        <div id="sidebar-resize" style="float:right; width:6px; cursor:col-resize; height:100%; background-color:#272b2f; cursor:col-resize;"></div>
        <div class="sidebar-sticky">
            <h6 class="zoomable-sidebar sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted" style="width:90%; transform:scale(1); transform-origin:top left;">
                <span><b>Scenarios</b></span>
                <div style="transform:scale(0.7); transform-origin:right; position:absolute; right:-16px; padding-bottom:10px;">
                    <div class="input-group input-group-sm" style="width:112px;">
                        <form id="{{id}}-external-scenario-file-form">
                            <div class="custom-file">
                                <input type="file" class="custom-file-input" id="{{id}}-external-scenario-file" accept="${DAA_FILE_EXTENSIONS.join(",")}">
                                <label class="custom-file-label" for="{{id}}-external-scenario-file"><i class="fa fa-upload" aria-hidden="true"></i></label>
                            </div>
                        </form>
                    </div>
                </div>
            </h6>
            <ul class="zoomable-sidebar nav flex-column mb-2" style="width:90%; margin-left:16px;">
                <li class="nav-item" id="{{id}}-scenarios">
                </li>
            </ul>

            <div class="single-view sidebar-optionals">
                <h6 class="zoomable-sidebar sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted">
                    <span class="sidebar-daidalus-configuration-attributes" style="white-space:nowrap;"><b>Daidalus Parameters</b></span>
                </h6>
                <div class="sidebar-daidalus-configuration-attributes zoomable-sidebar sidebar-config-optionals nav flex-column mb-2" style="margin-left:16px; border:1px solid lightgray; border-radius:4px; width:90%; overflow:auto;">
                    <div class="nav-item" id="sidebar-daidalus-configuration-attributes">
                    </div>
                </div>
            </div>
            <div class="split-view sidebar-optionals" style="display:none;">
                <h6 class="zoomable-sidebar sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted">
                    <span class="sidebar-daidalus-configuration-attributes-0 sidebar-daidalus-configuration-attributes-1" style="white-space:nowrap;"><b>Daidalus Parameters</b></span>
                </h6>
                <div class="container row zoomable-sidebar sidebar-daidalus-diff-configuration-attributes sidebar-config-optionals" style="padding:0; margin-left:16px; border:1px solid lightgray; border-radius:4px; width:90%;">
                    <div class="sidebar-daidalus-configuration-attributes-0 col-sm flex-column mb-2" style="overflow-x:auto; padding:0;">
                        <div class="nav-item" id="sidebar-daidalus-configuration-attributes-0">
                        </div>
                    </div>
                    <div class="sidebar-daidalus-configuration-attributes-1 col-sm flex-column mb-2" style="overflow-x:auto; padding:0;">
                        <div class="nav-item" id="sidebar-daidalus-configuration-attributes-1">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </nav>
</div>
</div>`;

export const sidebarAttributesColums: string = `
{{#each labels}}
<!-- index {{@index}}: {{this}} -->
<div class="sidebar-daidalus-configuration-attributes-{{@index}} col-sm flex-column mb-2" style="overflow-x:auto; padding:0;">
    <div class="nav-item" id="sidebar-daidalus-configuration-attributes-{{@index}}">
    </div>
</div>
{{/each}}
`;

export const loadingTemplate: string = `
<div id="{{id}}" class="daa-loading" style="position:absolute; width:0px; height:0px;">
    <div class="sk-cube-grid" style="width:{{width}}px; height:{{height}}px; margin-left:{{left}}px; margin-right:{{right}}px;">
        <div class="sk-cube sk-cube1"></div>
        <div class="sk-cube sk-cube2"></div>
        <div class="sk-cube sk-cube3"></div>
        <div class="sk-cube sk-cube4"></div>
        <div class="sk-cube sk-cube5"></div>
        <div class="sk-cube sk-cube6"></div>
        <div class="sk-cube sk-cube7"></div>
        <div class="sk-cube sk-cube8"></div>
        <div class="sk-cube sk-cube9"></div>
    </div>
</div>`;

export const navbarTemplate: string = `
<style>
.zoom-ctrl {
    position:absolute;
    left:16.5%;
    background:#343a40;
    z-index:2;
    transform:scale(0.8);
}
.navbar-integrated-simulation-controls {
    top:15px;
    left:30%;
    transform:scale(0.8);
    position:absolute;
    z-index:1;
}
.navbar-integrated-plot-controls {
    top:15px;
    left:30%;
    transform:scale(0.8);
    position:absolute;
    padding-left:1006px;
    z-index:0;
}
</style>
<script>
function home () {
    let home = window.location.origin;
    window.location.href = home;
}
</script>
<nav class="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
    <span class="navbar-brand col-sm-3 col-md-2 mr-0">
        <button class="btn btn-sm btn-dark" style="width:100%;"
            alt="Goto DAA-Displays Home Screen"
            onclick="home();">
            <span style="margin-right:4px;"><i class="fa fa-plane" aria-hidden="true"></i></span>
            DAA-Displays {{version}}
        </button>
    </span>
    {{#if zoomables}}
    <span class="zoom-ctrl">
        <div class="input-group input-group-sm mb-3" style="margin:0px !important;">
            <div class="input-group-prepend">
                <span class="btn-sm" style="text-align:center; color:white; border:1px solid #ced4da; white-space:nowrap;vertical-align: middle;">Window Zoom Level</span>
            </div>
            <button type="button" class="btn btn-sm btn-warning" id="{{id}}-zoom-minus"><i class="fa fa-minus"></i></button>
            <button type="button" class="btn btn-sm btn-primary" id="{{id}}-zoom-plus"><i class="fa fa-plus"></i></button>
        </div>
    </span>
    {{/if}}
    <span id="{{id}}-integrated-controls" class="navbar-integrated-simulation-controls"></span>
    <span id="{{id}}-integrated-controls-secondary" class="navbar-integrated-plot-controls"></span>
    <!-- <span class="daa-loading-status animated infinite pulse navbar-text col-sm-3 col-md-2 mr-0" style="color:white; display:none; float:right; font-size:xx-small; white-space:nowrap;"></span> -->
</nav>`;

export const spectrogramControls: string = `
<div id="{{id}}-spectrogram-controls-inner" style="position:absolute;width:100%;">
    <div class="input-group input-group-sm mb-3" style="width:{{width}}px;left:{{left}}px;top:{{top}}px;">
        <div class="container-fluid" style="padding:0px;">
            <div class="row">
                <div class="col-sm">
                    <div class="btn-group btn-group-toggle" role="group" aria-label="Plot Controls">
                        <button type="button" class="btn btn-sm btn-warning sim-control" id="{{id}}-reset" style="width:136px; white-space:nowrap;">Reset</button>
                        <button type="button" class="btn btn-sm btn-primary sim-control" id="{{id}}-plot" style="width:212px; white-space:nowrap;">Plot</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>`;

export const multiViewOptions: string = `
<div id="{{id}}-use-same-inner" class="sim-option" style="position:absolute;width:100%;">
    <div class="input-group input-group-sm mb-3" style="width:{{width}}px;left:{{left}}px;top:{{top}}px;">
        <div class="container-fluid" style="padding-top:1px;">
            <div class="row">
                <button id="{{id}}-use-same-config-btn" class="btn-sm use-same-config" style="width:{{innerWidth}}px; text-align:left; border:1px solid lightgray; margin-bottom:1px; white-space:nowrap;vertical-align: middle;">Use this config in all views</button>
            </div>
            <div class="row">
                <button id="{{id}}-use-same-logic-btn" class="btn-sm use-same-logic" style="width:{{innerWidth}}px; text-align:left; border:1px solid lightgray; margin-bottom:1px; white-space:nowrap;vertical-align: middle;">Use this version in all views</button>
            </div>
        </div>
    </div>
</div>
`;
export const voiceFeedbackControls: string = `
<div id="{{id}}-voice-feedback-controls-inner" class="simulation-controls" style="position:absolute;width:100%;">
    <div class="input-group input-group-sm mb-3" style="width:{{width}}px;left:{{left}}px;top:{{top}}px;">
        <div class="container-fluid" style="padding:1px;">
            <div class="row">
                <div class="col-sm">
                    <div class="input-group input-group-sm mb-3">
                        <div class="input-group-text">
                            <input type="checkbox" id="{{id}}-voice-feedback-checkbox" class="voice-feedback">
                        </div>
                        <div class="input-group-prepend">
                            <span class="btn-sm aural-guidance" style="width:200px; text-align:center; background-color:#e9ecef; border:1px solid #e9ecef; white-space:nowrap;vertical-align: middle;">Aural Guidance</span>
                        </div>
                        <select class="custom-select" style="text-align:center;" id="{{id}}-aural-guidance-list">
                            {{#each styles}}
                            <option value="{{name}}" {{#if @first}}selected{{/if}}>{{name}}</option>
                            {{/each}}
                        </select>
                        <input class="daa-voice-text" style="text-align:center; display:none;" readonly disabled type="text" value="" aria-label="aural guidance" class="form-control">
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-sm">
                    <div class="input-group input-group-sm mb-3">
                        <div class="input-group-prepend">
                            <span class="btn-sm voice-name" style="width:240px; text-align:center; background-color:#e9ecef; border:1px solid #ced4da; white-space:nowrap;vertical-align: middle;">Voice Name</span>
                        </div>
                        <select class="custom-select" style="text-align:center;" id="{{id}}-voice-name-list">
                            {{#each voices}}
                            <option value="{{name}}" {{#if @first}}selected{{/if}}>{{name}} ({{lang}})</option>
                            {{/each}}
                        </select>
                    </div>
                </div>
            </div>
            {{#if voices}}
            <div class="row">
                <div class="col-sm">
                    <div class="input-group input-group-sm mb-3">
                        <div class="input-group-prepend">
                            <span class="btn-sm voice-pitch" style="width:240px; text-align:center; background-color:#e9ecef; border:1px solid #ced4da; white-space:nowrap;vertical-align: middle;">Voice Pitch</span>
                        </div>
                        <input id="{{id}}-voice-pitch-input" style="text-align:center;" type="number" value="${DEFAULT_VOICE_PITCH}" min="0.5" max="2" step="0.1" aria-label="voice pitch" class="form-control">
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-sm">
                    <div class="input-group input-group-sm mb-3">
                        <div class="input-group-prepend">
                            <span class="btn-sm voice-rate" style="width:240px; text-align:center; background-color:#e9ecef; border:1px solid #ced4da; white-space:nowrap;vertical-align: middle;">Voice Rate</span>
                        </div>
                        <input id="{{id}}-voice-rate-input" style="text-align:center;" type="number" value="${DEFAULT_VOICE_RATE}" min="0.5" max="2" step="0.1" aria-label="voice rate" class="form-control">
                    </div>
                </div>
            </div>
            {{/if}}
        </div>
    </div>
</div>`;

export const developersControls: string = `
<div class="input-group input-group-sm mb-3" style="top:{{top}}px; left:{{left}}px; min-width:{{width}}px; display:{{display}};">
  <div id="{{id}}-developer-mode-button" class="input-group-prepend">
    {{#if controls.showDeveloper}}<div class="input-group-text" style="width:{{width}}px;">
      <input id="{{id}}-developer-mode-checkbox" type="checkbox" aria-label="Enable developer mode">
      <span style="margin-left:4px; margin-right:28px;">Developer mode</span>
    </div>{{/if}}
    {{#if controls.showPlot}}<div class="input-group-text" style="width:{{width}}px;">
      <input id="{{id}}-show-plots-checkbox" type="checkbox" checked="true" aria-label="Show plot diagrams">
      <span style="margin-left:4px; margin-right:14px;">Show plot diagrams</span>
    </div>{{/if}}
    {{#if controls.showGuidance}}<div class="input-group-text" style="width:{{width}}px;">
      <input id="{{id}}-show-guidance-checkbox" type="checkbox" checked="true" aria-label="Show guidance">
      <span style="margin-left:4px; margin-right:14px;">Show guidance</span>
    </div>{{/if}}
  </div>
</div>`;

export const directiveGuidanceControls: string = `
<div id="{{id}}-directive-guidance-controls-inner" class="simulation-controls directive-guidance-controls" style="position:absolute;width:0px;height:0px;">
    <div class="input-group input-group-sm mb-3" style="width:{{width}}px;left:{{left}}px;top:{{top}}px;">
        <div class="container-fluid" style="padding:0px;">
            <div class="row">
                <div class="col-sm">
                    <div class="input-group input-group-sm mb-3">
                        <div class="input-group-text">
                            <input type="checkbox" id="{{id}}-directive-guidance-checkbox" class="directive-guidance">
                        </div>
                        <div class="input-group-prepend">
                            <span class="btn-sm directive-guidance" style="width:{{innerWidth}}px; text-align:center; background-color:#e9ecef; border:1px solid #e9ecef; white-space:nowrap;vertical-align: middle;">Directive Guidance for Heading</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>`;

export const resolutionPersistenceControls: string = `
<div id="{{id}}-resolution-persistence-controls-inner" class="simulation-controls persistence-controls" style="position:absolute;width:0px;height:0px;">
    <div class="input-group input-group-sm mb-3" style="width:{{width}}px;left:{{left}}px;top:{{top}}px;">
        <div class="container-fluid" style="padding:0px;">
            <div class="row">
                <div class="col-sm">
                    <div class="input-group input-group-sm mb-3">
                        <div class="input-group-text">
                            <input type="checkbox" id="{{id}}-resolution-persistence-checkbox" class="resolution-persistence">
                        </div>
                        <div class="input-group-prepend">
                            <span class="btn-sm resolution-persistence" style="width:{{innerWidth}}px; text-align:center; background-color:#e9ecef; border:1px solid #e9ecef; white-space:nowrap;vertical-align: middle;">Wedge Persistence On Traffic Alerts</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>`;

export const resolutionControls: string = `
<div id="{{id}}-resolution-controls-inner" class="simulation-controls resolution-controls" style="position:absolute; width:0px; height:0px;">
    <div class="input-group input-group-sm mb-3" style="width:{{width}}px;left:{{left}}px;top:{{top}}px;">
        <div class="container-fluid" style="padding:0px;">
            <div class="row">
                <div class="col-sm">
                    <div class="input-group input-group-sm mb-3">
                        <div class="input-group-text">
                            <input type="checkbox" id="{{id}}-max-compass-wedge-aperture-checkbox" class="max-compass-wedge-aperture">
                        </div>
                        <div class="input-group-prepend">
                            <span class="btn-sm max-compass-wedge-aperture" style="width:240px; text-align:center; background-color:#e9ecef; border:1px solid #ced4da; white-space:nowrap;vertical-align: middle;">Max Heading Wedge</span>
                        </div>
                        <input id="{{id}}-max-compass-wedge-aperture-input" style="text-align:center;" type="number" value="15" min="0" max="360" step="1" aria-label="heading wedge aperture" class="form-control">
                        <div class="input-group-append">
                            <span class="input-group-text">deg</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-sm">
                    <div class="input-group input-group-sm mb-3">
                        <div class="input-group-text">
                            <input type="checkbox" id="{{id}}-max-airspeed-wedge-aperture-checkbox" class="max-airspeed-wedge-aperture">
                        </div>
                        <div class="input-group-prepend">
                            <span class="btn-sm max-airspeed-wedge-aperture" style="width:240px; text-align:center; background-color:#e9ecef; border:1px solid #ced4da; white-space:nowrap;vertical-align: middle;">Max Horizontal Speed Notch</span>
                        </div>
                        <input id="{{id}}-max-airspeed-wedge-aperture-input" style="text-align:center;" type="number" value="50" min="0" step="1" aria-label="horizontal speed notch aperture" class="form-control">
                        <div class="input-group-append">
                            <span class="input-group-text">knot</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-sm">
                    <div class="input-group input-group-sm mb-3">
                        <div class="input-group-text">
                            <input type="checkbox" id="{{id}}-max-vspeed-wedge-aperture-checkbox" class="max-vspeed-wedge-aperture">
                        </div>
                        <div class="input-group-prepend">
                            <span class="btn-sm max-vspeed-wedge-aperture" style="width:240px; text-align:center; background-color:#e9ecef; border:1px solid #ced4da; white-space:nowrap;vertical-align: middle;">Max Vertical Speed Notch</span>
                        </div>
                        <input id="{{id}}-max-vspeed-wedge-aperture-input" style="text-align:center;" type="number" value="500" min="0" step="1" aria-label="vertical speed notch aperture" class="form-control">
                        <div class="input-group-append">
                            <span class="input-group-text">fpm</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-sm">
                    <div class="input-group input-group-sm mb-3">
                        <div class="input-group-text">
                            <input type="checkbox" id="{{id}}-max-altitude-wedge-aperture-checkbox" class="max-altitude-wedge-aperture">
                        </div>
                        <div class="input-group-prepend">
                            <span class="btn-sm max-altitude-wedge-aperture" style="width:240px; text-align:center; background-color:#e9ecef; border:1px solid #ced4da; white-space:nowrap;vertical-align: middle;">Max Altitude Notch</span>
                        </div>
                        <input id="{{id}}-max-altitude-wedge-aperture-input" style="text-align:center;" type="number" value="300" min="0" step="1" aria-label="altitude notch aperture" class="form-control">
                        <div class="input-group-append">
                            <span class="input-group-text">feet</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>`;


export const magVarControls: string = `
<div id="{{id}}-magvar-controls-inner" class="simulation-controls magvar-controls" style="position:absolute; width:0px; height:0px;">
    <div class="input-group input-group-sm mb-3" style="width:{{width}}px;left:{{left}}px;top:{{top}}px;">
        <div class="container-fluid" style="padding:0px;">
            <div class="row">
                <div class="col-sm">
                    <div class="input-group input-group-sm mb-3">
                        <div class="input-group-text">
                            <input type="checkbox" id="{{id}}-magvar-checkbox" class="magvar">
                        </div>
                        <div class="input-group-prepend">
                            <span class="btn-sm magvar" style="width:240px; text-align:center; background-color:#e9ecef; border:1px solid #ced4da; white-space:nowrap;vertical-align: middle;">Magnetic Variation</span>
                        </div>
                        <input id="{{id}}-magvar-input" style="text-align:center;" type="number" value="0" min="-360" max="360" step="1" aria-label="magnetic variation" class="form-control">
                        <div class="input-group-append">
                            <span class="input-group-text">deg</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>`;