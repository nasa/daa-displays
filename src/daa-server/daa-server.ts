import * as ws from 'ws';
import * as express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { PVSioProcess } from './daa-pvsioProcess'
import { JavaProcess } from './daa-javaProcess';
import { CppProcess } from './daa-cppProcess';
import { ExecMsg, LoadScenarioRequest, LoadConfigRequest, WebSocketMessage, ConfigFile, ScenarioDescriptor, SaveScenarioRequest } from './utils/daa-server';
import * as fsUtils from './utils/fsUtils';
import WebSocket = require('ws');
import { AddressInfo } from 'net';

const VERBOSE: boolean = false;

const helpMsg: string = `
  Usage: node daa-server.js [options]
  Options:
    -pvsio               (Enables the pvsio process; pvsio must be in the execution path; requires nasalib)
    -pvsio <path>        (Enables the pvsio process; the given pvsio path is used for executing the pvsio environment; requires nasalib)
    -fast                (Enables optimizations, including caching of simulation results)
    -port <port number>  (The server will use the given port)
`;

class DAAServer {
    pvsioPath: string = null;
    pvsioProcessEnabled: boolean = false;
    useCache: boolean = false;
    httpServer: http.Server;
    wsServer: ws.Server;
    pvsioProcess: PVSioProcess; // TODO: create an array of processes for parallel execution of multiple pvs files
    javaProcess: JavaProcess; // TODO: create array of processes
    cppProcess: CppProcess; 
    config: {
        port: number; // ws server port
        pvs: string; // pvs executable
        java: string; // java executable
        // contextFolder: string;
        // file: string;
        // theory: string;
    }
    constructor (port?: number) {
        this.config = {
            port: port || 8082,
            pvs: 'pvs',
            java: 'java'
            // ,
            // contextFolder: __dirname,
            // file: null,
            // theory: null
        };
    }
    protected getPvsioWellClearVersions (javaFiles: string[]): string[] {
        if (this.pvsioProcessEnabled && javaFiles && javaFiles.length) { 
            let versions: string[] = [];
            const wellclearLogicFolder: string = path.join(__dirname, "../daa-logic");
            for (let i = 0; i < javaFiles.length; i++) {
                const candidate: string = javaFiles[i].replace(".jar", "");
                const fname: string = path.join(wellclearLogicFolder, `${candidate}`, "PVS/DAABands.pvs");
                if (fs.existsSync(fname)) {
                    versions.push(`${candidate}.pvsio`);
                }
            }
            return versions;
        }
        return null;
    }
    protected async loadDaaServerConfiguration (fileName: string) {
        fileName = path.join(__dirname, fileName);
        try {
            console.info(`Loading configuration file ${fileName}`);
            const txt: Buffer = fs.readFileSync(fileName);
            // console.log(txt.toString());
            try {
                const tmp = JSON.parse(txt.toLocaleString());
                if (tmp && tmp.port) {
                    const port: number = parseInt(tmp.port);
                    this.config.port = port;
                    console.info(`Server port: ${port}`);
                }
                if (tmp && tmp.pvs) {
                    const pvs: string = tmp.pvs;
                    this.config.pvs = pvs;
                    // console.info(`PVSio executable: ${pvs}`)
                }
            } catch (malformedJson) {
                console.error(`Configuration file ${fileName} is not in JSON format :/`);
            }
        } catch (err) {
            console.error(`Configuration file ${fileName} not provided, using default server configuration.`);
        }
    }
    protected async activatePVSioProcess () {
        if (this.pvsioPath) {
            this.pvsioProcess = new PVSioProcess(path.join(this.pvsioPath, "pvs"));
            await this.pvsioProcess.activate();
        } else {
            console.error("[daa-server] Error: unable to activate pvsio process (pvs path is null)");
        }
    }
    protected async activateJavaProcess () {
        this.javaProcess = new JavaProcess();
    }
    protected async activateCppProcess () {
        this.cppProcess = new CppProcess();
    }
    protected trySend (wsocket: WebSocket, content: WebSocketMessage<any>, msg?: string) {
        msg = msg || "data";
        try {
            if (content && wsocket) {
                console.log(`sending ${msg} to client...`);
                if (content.time) {
                    content.time.server = { sent: new Date().toISOString() };
                }
                if (VERBOSE) {
                    console.dir(content, { depth: null });
                }
                wsocket.send(JSON.stringify(content));
                console.log(`${msg} sent`);
            }
        } catch (sendError) {
            console.error(`Error while sending ${msg} :/`);
        }
    }
    // Just one level of recursion, i.e., current folder and first-level sub-folders.
    // This is sufficient to navigate symbolic links placed in the current folder.
    protected listFilesRecursive (folderName: string, ext: string[]): string[] {
        const listFilesInFolderAndSubfolders = (folder: string) => {
            const elems: string[] = fs.readdirSync(folder);
            if (elems && elems.length > 0) {
                const allFiles: string[] = elems.filter((name: string) => {
                    return fs.lstatSync(path.join(folder, name)).isFile();
                });
                const allSubfolders: string[] = elems.filter((name: string) => {
                    return fs.lstatSync(path.join(folder, name)).isDirectory() || fs.lstatSync(path.join(folder, name)).isSymbolicLink();
                });
                let ans: string[] = [];
                if (allFiles) {
                    ans = allFiles.filter((name: string) => {
                        for (let i = 0; i < ext.length; i++) {
                            if (name.endsWith(ext[i])) {
                                return true;
                            }
                        }
                        return false;
                    });
                    
                }
                if (allSubfolders) {
                    for (let i in allSubfolders) {
                        const subf: string = path.join(folder, allSubfolders[i]);
                        const files: string[] = listFilesInFolder(subf);
                        if (files) {
                            ans = ans.concat(files.map((fileName: string) => {
                                return path.join(allSubfolders[i], fileName);
                            }));
                        }
                    }
                }
                if (ans.length > 0) {
                    return ans;
                }
            }
            return null;
        }
        const listFilesInFolder = (folder: string) => {
            const elems: string[] = fs.readdirSync(folder);
            if (elems && elems.length > 0) {
                const allFiles: string[] = elems.filter((name: string) => {
                    return fs.lstatSync(path.join(folder, name)).isFile();
                });
                if (allFiles) {
                    return allFiles.filter((name: string) => {
                        for (let i = 0; i < ext.length; i++) {
                            if (name.endsWith(ext[i])) {
                                return true;
                            }
                        }
                        return false;
                    });
                }
            }
            return null;
        }
        const files: string[] = listFilesInFolder(folderName);
        // check sub-folders, two levels
        const elems: string[] = fs.readdirSync(folderName);
        if (elems && elems.length > 0) {
            for (let i = 0; i < elems.length; i++) {
                // console.log(`Reading ${elems[i]}`);
                const pt: string = path.join(folderName, elems[i]);
                const isSymbolicLink: boolean = fs.lstatSync(pt).isSymbolicLink();
                const isFolder: boolean = fs.lstatSync(pt).isDirectory();
                if (isFolder || isSymbolicLink) {
                    const subfolder: string = elems[i];
                    try {
                        // console.log(`Reading subfolder ${subfolder}`);
                        const sfiles: string[] = listFilesInFolderAndSubfolders(path.join(folderName, subfolder));
                        if (sfiles && sfiles.length > 0) {
                            sfiles.forEach((name: string) => {
                                name = `${subfolder}/${name}`;
                                files.push(name);
                            });
                        }
                    } catch (subfolderError) {
                        console.warn(`[daa-server.listFileRecursive] ignoring subfolder ${subfolder} (read error)`, subfolderError);
                    }
                }
            }
        }
        return files;
    }
    async onMessageReceived (msg: string, wsocket: WebSocket): Promise<void> {
        console.info(`Received new message ${msg}`);
        try {
            const content: WebSocketMessage<any> = JSON.parse(msg);
            // console.info("Message parsed successfully!")
            switch (content['type']) {
                case 'exec': {
                    const data: ExecMsg = <ExecMsg> content.data;
                    const bandsFile: string = fsUtils.getBandsFileName(data);
                    if (bandsFile) {
                        const impl: string = data.daaLogic.endsWith(".jar") ? "java" 
                                                : data.daaLogic.endsWith(".exe") ? "cpp" 
                                                : data.daaLogic.endsWith(".pvsio") ? "pvsio"
                                                : null;
                        if (impl) {
                            const wellClearFolder: string = path.join(__dirname, "../daa-logic");
                            switch (impl) {
                                case "java": {
                                    await this.activateJavaProcess();
                                    break;
                                }
                                case "cpp": {
                                    await this.activateCppProcess();
                                    break;
                                }
                                case "pvsio": {
                                    await this.activateJavaProcess(); // this will be used to run utility functions converting daa configurations in pvs format
                                    await this.activatePVSioProcess();
                                    break;
                                }
                                default: {
                                    console.error("Error: unsupported implementation type :/ ", impl);
                                }
                            }
                            const wellClearVersion: string = 
                                    (impl === "java") ? await this.javaProcess.getVersion(wellClearFolder, data.daaLogic)
                                        : (impl === "cpp") ? await this.cppProcess.getVersion(wellClearFolder, data.daaLogic)
                                        : (impl === "pvsio") ? await this.pvsioProcess.getVersion(wellClearFolder, data.daaLogic)
                                        : null;
                            
                            const wind: { deg: string, knot: string } = data.wind || { deg: "0", knot: "0" };
                            
                            const outputFileName: string = fsUtils.getBandsFileName({ daaConfig: data.daaConfig, scenarioName: data.scenarioName, wind });
                            const outputFolder: string = path.join(__dirname, "../daa-output", wellClearVersion, impl);
                            try {
                                if (this.useCache && fs.existsSync(path.join(outputFolder, bandsFile))) {
                                    console.log(`Reading bands file ${bandsFile} from cache`);
                                } else {
                                    switch (impl) {
                                        case "java": {
                                            await this.javaProcess.exec({
                                                daaFolder: wellClearFolder, 
                                                daaLogic: data.daaLogic, 
                                                daaConfig: data.daaConfig, 
                                                daaScenario: data.scenarioName, 
                                                outputFileName: outputFileName,
                                                wind
                                            });
                                            break;
                                        }
                                        case "cpp": {
                                            await this.cppProcess.exec({
                                                daaFolder: wellClearFolder, 
                                                daaLogic: data.daaLogic, 
                                                daaConfig: data.daaConfig, 
                                                daaScenario: data.scenarioName, 
                                                outputFileName: outputFileName,
                                                wind
                                            });
                                            break;
                                        }
                                        case "pvsio": {
                                            //@TODO: implement pvs functions for setting wind
                                            const res: { configFile: string, scenarioFile: string } = await this.javaProcess.daa2pvs(wellClearFolder, data.daaLogic, data.daaConfig, data.scenarioName, `${data.scenarioName}.pvs`);
                                            try {
                                                const contextFolder: string = path.join(wellClearFolder, `WellClear-${wellClearVersion}`, "PVS");
                                                await this.pvsioProcess.pvsioMode(contextFolder, "DAABands");
                                                await this.pvsioProcess.exec(wellClearFolder, data.daaLogic, res.configFile, res.scenarioFile, outputFileName);
                                            } catch (pvsio_error) {
                                                console.error("[pvsio.exec] Error: ", pvsio_error);
                                            }
                                            break;
                                        }
                                        default: {
                                            console.error("Error: unsupported implementation type :/ ", impl);
                                        }
                                    }
                                }
                                try {
                                    const buf: Buffer = fs.readFileSync(path.join(outputFolder, bandsFile));
                                    const desc: ScenarioDescriptor = JSON.parse(buf.toLocaleString());
                                    // content.data = buf.toLocaleString();
                                    const keys: string[] = Object.keys(desc);
                                    for (let i = 0; i < keys.length; i++) {
                                        content.data = {
                                            key: keys[i],
                                            val: desc[keys[i]],
                                            idx: i,
                                            tot: keys.length
                                        };
                                        this.trySend(wsocket, content, `daa bands (part ${i + 1} of ${keys.length}, ${keys[i]})`);
                                    }
                                } catch (readError) {
                                    console.error(`Error while reading daa bands file ${path.join(outputFolder, bandsFile)}`);
                                    this.trySend(wsocket, null, "daa bands");
                                }
                            } catch (execError) {
                                console.error(`Error while executing java process`, execError);
                                this.trySend(wsocket, null, "daa bands");
                            }
                        } else {
                            console.error(`Error: unsupported implementation type :/`, data.daaLogic);
                        }
                    } else {
                        console.error(`Error while generating daa bands file (filename is null) :/`);
                    }
                    break;
                }
                case 'java-los': {
                    const data: ExecMsg = <ExecMsg> content.data;
                    const losFile: string = fsUtils.getLoSFileName(data);
                    if (losFile) {
                        await this.activateJavaProcess();
                        const losLogic: string = data.daaLogic;
                        const losFolder: string = path.join(__dirname, "../daa-logic");
                        const losVersion: string = await this.javaProcess.getVersion(losFolder, losLogic);
                        const outputFileName: string = fsUtils.getLoSFileName({ daaConfig: data.daaConfig, scenarioName: data.scenarioName });
                        const outputFolder: string = path.join(__dirname, "../daa-output", losVersion);
                        const wind: { deg: string, knot: string } = data.wind || { deg: "0", knot: "0" };
                        try {
                            if (this.useCache && fs.existsSync(path.join(outputFolder, losFile))) {
                                console.log(`Reading daa los regions file ${losFile} from cache`);
                            } else {
                                await this.javaProcess.exec({
                                    daaFolder: losFolder, 
                                    daaLogic: losLogic, 
                                    daaConfig: data.daaConfig, 
                                    daaScenario: data.scenarioName, 
                                    wind,
                                    outputFileName
                                });
                            }
                            try {
                                const buf: Buffer = fs.readFileSync(path.join(outputFolder, losFile));
                                content.data = buf.toLocaleString();
                                this.trySend(wsocket, content, "daa los regions");
                            } catch (readError) {
                                console.error(`Error while reading daa los regions file ${path.join(outputFolder, losFile)}`);
                                this.trySend(wsocket, null, "daa los regions");
                            }
                        } catch (execError) {
                            console.error(`Error while executing java process`, execError);
                            this.trySend(wsocket, null, "daa los regions");
                        }
                    } else {
                        console.error(`Error while generating daa los regions file (filename is null) :/`);
                    }
                    break;
                }
                case 'java-virtual-pilot': { // generate-daa-file-from-ic
                    const data: ExecMsg = <ExecMsg> content.data;
                    const outputFile: string = data.scenarioName.replace(".ic", ".daa");
                    if (outputFile) {
                        await this.activateJavaProcess();
                        const virtualPilot: string = data.daaLogic;
                        const virtualPilotFolder: string = path.join(__dirname, "../contrib/virtual-pilot");
                        console.log("folder:" + virtualPilotFolder);
                        const outputFileName: string = fsUtils.getVirtualPilotFileName({ daaConfig: data.daaConfig, scenarioName: data.scenarioName });
                        console.log("fileName:" + outputFileName);
                        const outputFolder: string = path.join(__dirname, "../../daa-output/virtual_pilot");
                        const wind: { deg: string, knot: string } = data.wind || { deg: "0", knot: "0" };
                        // use the .ic file to generate the .daa file
                        try {
                            await this.javaProcess.exec({
                                daaFolder: virtualPilotFolder, 
                                daaLogic: virtualPilot, 
                                daaConfig: data.daaConfig, 
                                daaScenario: data.scenarioName, 
                                wind,
                                outputFileName
                            }, { contrib: true });
                            console.log("executed");
                            try {
                                const buf: Buffer = fs.readFileSync(path.join(outputFolder, outputFile));
                                content.data = buf.toLocaleString();
                                this.trySend(wsocket, content, "daa virtual pilot");
                            } catch (readError) {
                                console.error(`Error while reading daa virtual pilot file ${path.join(outputFolder, outputFile)}`);
                                this.trySend(wsocket, null, "daa virtual pilot");
                            }
                        } catch (execError) {
                            console.error(`Error while executing java process`, execError);
                            this.trySend(wsocket, null, "daa virtual pilot");
                        }
                    } else {
                        console.error(`Error while generating daa virtual pilot file (filename is null) :/`);
                    }
                    break;
                }
                case 'save-daa-file': {
                    const data: SaveScenarioRequest = <SaveScenarioRequest> content.data;
                    const scenarioName: string = (data && data.scenarioName)? data.scenarioName : null;
                    if (scenarioName) {
                        const fileContent: string = data.scenarioContent;
                        if (fileContent) {
                            const outputFolder: string = "../daa-scenarios/";
                            const fname: string = path.join(outputFolder, scenarioName); 
                            try {
                                // write the file in the scenario folder
                                console.log(`[daa-server] Writing scenario file ${fname}`);
                                fs.writeFileSync(fname, fileContent);
                                // try to convert the file, to check if it's a valid daa file
                                console.log(`[daa-server] Generatig JSON file...`);
                                try {
                                    await this.javaProcess.daa2json(scenarioName, `${scenarioName}.json`);
                                    const jsonDaa: string = path.join(__dirname, outputFolder, `${scenarioName}.json`);
                                    content.data = await fsUtils.readFile(jsonDaa);
                                    this.trySend(wsocket, content, `scenario ${scenarioName}`);
                                    console.log(`[daa-server] Done!`);
                                } catch (conversionError) {
                                    console.error(`[daa-server] Error: unable to convert file ${fname}`);
                                    fs.unlinkSync(fname);
                                    this.trySend(wsocket, null, `scenario ${scenarioName}`);    
                                }
                            } catch (writeError) {
                                console.error(`[daa-server] Error: unable to write file ${fname}`);
                                this.trySend(wsocket, null, `scenario ${scenarioName}`);
                            }
                        }
                    }
                    break;
                }
                case 'load-daa-file': {
                    const data: LoadScenarioRequest = <LoadScenarioRequest> content.data;
                    const scenarioName: string = (data && data.scenarioName)? data.scenarioName : null;
                    if (scenarioName) {
                        await this.activateJavaProcess();
                        try {
                            await this.javaProcess.daa2json(scenarioName, `${scenarioName}.json`);
                            const jsonDaa: string = path.join(__dirname, "../daa-scenarios", `${scenarioName}.json`);
                            content.data = await fsUtils.readFile(jsonDaa);
                            this.trySend(wsocket, content, `scenario ${scenarioName}`);
                        } catch (javaError) {
                            console.error("[daa-server] Error: could not execute daa2json");
                            this.trySend(wsocket, null, `scenario ${scenarioName}`);
                        }
                        // const ownship: { ownshipName?: string, ownshipSequenceNumber?: number } = data.ownship;
                        // const scenarioFolder: string = path.join(__dirname, "../daa-scenarios");
                        // try {
                        //     const daaScenario: DAAScenario = await this.loadScenario(scenarioName, scenarioFolder, ownship);
                        //     content.data = JSON.stringify(daaScenario);
                        //     this.trySend(wsocket, content, `scenario ${scenarioName}`);
                        // } catch (loadError) {
                        //     console.error(`Error while loading scenario files :/`);
                        // }
                    } else {
                        console.error('Error: could not load .daa file :/ (filename was not specified)');
                    }
                    break;
                }
                case 'list-monitors': {
                    const data: ExecMsg = <ExecMsg> content.data;
                    const impl: string = data.daaLogic.endsWith(".jar") ? "java" 
                                            : data.daaLogic.endsWith(".exe") ? "cpp" 
                                            : data.daaLogic.endsWith(".pvsio") ? "pvsio"
                                            : null;
                    if (impl) {
                        const wellClearFolder: string = path.join(__dirname, "../daa-logic");
                        switch (impl) {
                            case "java": {
                                await this.activateJavaProcess();
                                break;
                            }
                            case "cpp": {
                                await this.activateCppProcess();
                                break;
                            }
                            case "pvsio": {
                                await this.activateJavaProcess(); // this will be used to run utility functions converting daa configurations in pvs format
                                await this.activatePVSioProcess();
                                break;
                            }
                            default: {
                                console.error("Error: unsupported implementation type :/ ", impl);
                            }
                        }
                        const monitorList: string = 
                                (impl === "java") ? await this.javaProcess.getMonitorList(wellClearFolder, data.daaLogic)
                                    : (impl === "cpp") ? await this.cppProcess.getMonitorList(wellClearFolder, data.daaLogic)
                                    : (impl === "pvsio") ? await this.pvsioProcess.getMonitorList(wellClearFolder, data.daaLogic)
                                    : null;
                        content.data = monitorList;
                        this.trySend(wsocket, content, "daa monitors");
                    }
                    break;
                }
                case 'list-daa-files': {
                    const scenarioFolder: string = path.join(__dirname, "../daa-scenarios");
                    let daaFiles: string[] = null;
                    try {
                        daaFiles = this.listFilesRecursive(scenarioFolder, ['.daa', '.txt']);
                    } catch (listError) {
                        console.error(`Error while reading scenario folder`, listError);
                    } finally {
                        content.data = JSON.stringify(daaFiles);
                        if (VERBOSE) {
                            console.dir(content.data, { depth: null });
                        }
                        this.trySend(wsocket, content, "daa file list");
                    }
                    break;
                }
                case 'list-ic-files': {
                    const scenarioFolder: string = path.join(__dirname, "../daa-scenarios");
                    let icFiles: string[] = null;
                    try {
                        icFiles = this.listFilesRecursive(scenarioFolder, ['.ic']);
                    } catch (listError) {
                        console.error(`Error while reading scenario folder`, listError);
                    } finally {
                        content.data = JSON.stringify(icFiles);
                        if (VERBOSE) {
                            console.dir(content.data, { depth: null });
                        }
                        this.trySend(wsocket, content, "ic file list");
                    }
                    break;
                }
                case 'list-conf-files':
                case 'list-config-files': {
                    const configurationsFolder: string = path.join(__dirname, "../daa-config");
                    let confFiles: string[] = null;
                    try {
                        confFiles = this.listFilesRecursive(configurationsFolder, ['.conf', '.txt']);
                    } catch (confError) {
                        console.error(`Error while reading configuratios folder`, confError);
                    } finally {
                        content.data = JSON.stringify(confFiles);
                        if (VERBOSE) {
                            console.dir(content.data, { depth: null });
                        }
                        this.trySend(wsocket, content, "configurations file list");
                    }
                    break;
                }
                case 'load-copilot-file': {
                    //...
                    break;
                }
                case 'load-conf-file':
                case 'load-config-file': {
                    const data: LoadConfigRequest = <LoadConfigRequest> content.data;
                    const configurationsFolder: string = path.join(__dirname, "../daa-config");
                    const configName: string = (data && data.config)? data.config : null;
                    if (configName) {
                        try {
                            const fileContent = fs.readFileSync(path.join(configurationsFolder, configName)).toLocaleString().trim();
                            // parse band parameters from the file content
                            if (VERBOSE) {
                                console.dir(fileContent, { depth: null });
                            }
                            const min_hs: RegExpMatchArray = /\bmin_hs\b\s*=\s*([\-\d\.]+)\s*\[([\w\/]+)\]/.exec(fileContent);
                            const max_hs: RegExpMatchArray = /\bmax_hs\b\s*=\s*([\-\d\.]+)\s*\[([\w\/]+)\]/.exec(fileContent);
                            const min_gs: RegExpMatchArray = /\bmin_gs\b\s*=\s*([\-\d\.]+)\s*\[([\w\/]+)\]/.exec(fileContent);
                            const max_gs: RegExpMatchArray = /\bmax_gs\b\s*=\s*([\-\d\.]+)\s*\[([\w\/]+)\]/.exec(fileContent);
                            const min_vs: RegExpMatchArray = /\bmin_vs\b\s*=\s*([\-\d\.]+)\s*\[([\w\/]+)\]/.exec(fileContent);
                            const max_vs: RegExpMatchArray = /\bmax_vs\b\s*=\s*([\-\d\.]+)\s*\[([\w\/]+)\]/.exec(fileContent);
                            const min_alt: RegExpMatchArray = /\bmin_alt\b\s*=\s*([\-\d\.]+)\s*\[([\w\/]+)\]/.exec(fileContent);
                            const max_alt: RegExpMatchArray = /\bmax_alt\b\s*=\s*([\-\d\.]+)\s*\[([\w\/]+)\]/.exec(fileContent);
                            const data: ConfigFile = {
                                fileContent,
                                "horizontal-speed": {
                                    from: (min_gs && min_gs.length > 1) ? min_gs[1] : (min_hs && min_hs.length > 1) ? min_hs[1] : null,
                                    to: (max_gs && max_gs.length > 1) ? max_gs[1] : (max_hs && max_hs.length > 1) ? max_hs[1] : null,
                                    units: (min_gs && min_gs.length > 2) ? min_gs[2] : (min_hs && min_hs.length > 2) ? min_hs[2] : null
                                },
                                "vertical-speed": {
                                    from: (min_vs && min_vs.length > 1) ? min_vs[1] : null,
                                    to: (max_vs && max_vs.length > 1) ? max_vs[1] : null,
                                    units: (min_vs && min_vs.length > 2) ? min_vs[2] : null
                                },
                                "altitude": {
                                    from: (min_alt && min_alt.length > 1) ? min_alt[1] : null,
                                    to: (max_alt && max_alt.length > 1) ? max_alt[1] : null,
                                    units: (min_alt && min_alt.length > 2) ? min_alt[2] : null
                                }
                            };
                            content.data = data;
                        } catch (loadConfFileError) {
                            console.error(`Error while reading configuratios file ${configName}`, loadConfFileError);
                        } finally {
                            if (VERBOSE) {
                                console.dir(content.data, { depth: null });
                            }
                            this.trySend(wsocket, content, `.conf file ${configName}`);
                        }
                    } else {
                        console.error('Error: could not load .conf file :/ (filename was not specified)');
                    }
                    break;
                }
                case 'list-wellclear-versions': {
                    const wellclearLogicFolder: string = path.join(__dirname, "../daa-logic");
                    try {
                        const ls: string[] = fs.readdirSync(wellclearLogicFolder);
                        if (ls) {
                            let wellclearVersions: string[] = [];
                            try { 
                                const allFiles: string[] = ls.filter((name: string) => {
                                    return fs.lstatSync(path.join(wellclearLogicFolder, name)).isDirectory() === false;
                                });
                                const javaFiles: string[] = allFiles.filter((name: string) => {
                                    return name.startsWith("DAIDALUSv") && name.endsWith(".jar");
                                });
                                wellclearVersions = (javaFiles) ? wellclearVersions.concat(javaFiles) : wellclearVersions;
                                const cppFiles: string[] = allFiles.filter((name: string) => {
                                    return name.startsWith("DAIDALUSv") && name.endsWith(".exe");
                                });
                                wellclearVersions = (cppFiles) ? wellclearVersions.concat(cppFiles) : wellclearVersions;

                                const pvsioFiles: string[] = this.getPvsioWellClearVersions(javaFiles);
                                wellclearVersions = (pvsioFiles) ? wellclearVersions.concat(pvsioFiles) : wellclearVersions;
                            } catch (statError) {
                                console.error(`Error while reading wellclear folder ${wellclearLogicFolder} :/`);
                            } finally {
                                content.data = JSON.stringify(wellclearVersions);
                                this.trySend(wsocket, content, "wellclear versions");
                            }
                        }
                    } catch (listError) {
                        console.error(`Error while reading wellclear folder ${wellclearLogicFolder} :/`);
                    }
                    break;
                }
                case 'list-los-versions': {
                    const wellclearLogicFolder: string = path.join(__dirname, "../daa-logic");
                    try {
                        const allFiles: string[] = fs.readdirSync(wellclearLogicFolder);
                        if (allFiles) {
                            let wellclearVersions: string[] = [];
                            try { 
                                let jarFiles = allFiles.filter(async (name: string) => {
                                    return fs.lstatSync(path.join(wellclearLogicFolder, name)).isDirectory();
                                });
                                jarFiles = jarFiles.filter((name: string) => {
                                    return name.startsWith("LoSRegion-") && name.endsWith(".jar");
                                });
                                wellclearVersions = jarFiles.map((name: string) => {
                                    return name.slice(0, name.length - 4);
                                });
                            } catch (statError) {
                                console.error(`Error while reading los folder ${wellclearLogicFolder} :/`);
                            } finally {
                                content.data = JSON.stringify(wellclearVersions);
                                this.trySend(wsocket, content, "los versions");
                            }
                        }
                    } catch (listError) {
                        console.error(`Error while reading wellclear folder ${wellclearLogicFolder} :/`);
                    }
                    break;
                }
                case 'list-virtual-pilot-versions': {
                    const virtualPilotFolder: string = path.join(__dirname, "../contrib/virtual-pilot");
                    try {
                        const allFiles: string[] = fs.readdirSync(virtualPilotFolder);
                        if (allFiles) {
                            let virtualPilotVersions: string[] = [];
                            try { 
                                let jarFiles = allFiles.filter(async (name: string) => {
                                    return fs.lstatSync(path.join(virtualPilotFolder, name)).isDirectory();
                                });
                                jarFiles = jarFiles.filter((name: string) => {
                                    return name.startsWith("SimDaidalus_") && name.endsWith(".jar");
                                });
                                virtualPilotVersions = jarFiles.map((name: string) => {
                                    return name.slice(0, name.length - 4);
                                });
                            } catch (statError) {
                                console.error(`Error while reading virtual pilot folder ${virtualPilotFolder} :/`);
                            } finally {
                                content.data = JSON.stringify(virtualPilotVersions);
                                this.trySend(wsocket, content, "virtual pilot versions");
                            }
                        }
                    } catch (listError) {
                        console.error(`Error while reading wellclear folder ${virtualPilotFolder} :/`);
                    }
                    break;
                }
                case "start-jasmine-test-runner": {
                    const open = require('open');
                    if (open) {
                        open("http://localhost:8082/test.html");
                    }
                    break;
                }
                default: {}
            }
        } catch (err) {
            console.error(`Error while parsing message :/`);
        }
    }
    parseCliArgs (args: string[]): void {
        if (args) {
            for (let i = 0; i < args.length; i++) {
                const elem: string = args[i].toLocaleLowerCase();
                switch (elem) {
                    case "-pvsio": {
                        this.pvsioProcessEnabled = true;
                        console.log("[daa-displays] PVSio process enabled");
                        if ((i + 1) < args.length && !args[i + 1].startsWith("-")) {
                            i++;
                            this.pvsioPath = args[i];
                            console.log("[daa-displays] PVSio path: ", this.pvsioPath);
                        }
                        break;
                    }
                    case "-port": {
                        if ((i + 1) < args.length && !isNaN(+args[i + 1])) {
                            i++;
                            this.config.port = +args[i];
                            console.info(`Server port: ${this.config.port}`)
                        } else {
                            console.warn("Warning: port number not provided, using default port " + this.config.port);
                        }
                    }
                    case "-fast": {
                        this.useCache = true;
                        console.log("[daa-displays] Developer mode");
                        break;
                    }
                    case "-help": {
                        console.log(helpMsg);
                        process.exit(1);
                    }
                    default: {
                        console.warn("[daa-server] Warning: unrecognized option ", args[i]);
                    }
                }
            }
        }
    }
    async activate () {
        // try to load configuration file
        await this.loadDaaServerConfiguration("daa-server.json");

        // parse command line arguments, if any
        const args: string[] = process.argv.slice(2);
        console.log("args: ", args);
        this.parseCliArgs(args);

        // create http service provider
        const app = express();
        const daaDisplaysRoot: string = path.join(__dirname, '..');
        app.use(express.static(daaDisplaysRoot));
        const daaLogicFolder: string = path.join(__dirname, '../daa-logic');
        app.use(express.static(daaLogicFolder));
        app.get('/split', (req, res) => {
            res.sendFile(path.join(daaDisplaysRoot, 'split.html'));
        });
        app.get('/split-view', (req, res) => { // alias for split
            res.sendFile(path.join(daaDisplaysRoot, 'split.html'));
        });
        app.get('/single', (req, res) => {
            res.sendFile(path.join(daaDisplaysRoot, 'single.html'));
        });
        app.get('/single-view', (req, res) => { // alias for single
            res.sendFile(path.join(daaDisplaysRoot, 'single.html'));
        });
        app.get('/top', (req, res) => {
            res.sendFile(path.join(daaDisplaysRoot, 'top.html'));
        });
        app.get('/top-view', (req, res) => { // alias for top
            res.sendFile(path.join(daaDisplaysRoot, 'top.html'));
        });
        app.get('/3d', (req, res) => {
            res.sendFile(path.join(daaDisplaysRoot, '3d.html'));
        });
        app.get('/3d-view', (req, res) => { // alias for 3d
            res.sendFile(path.join(daaDisplaysRoot, '3d.html'));
        });
        app.get('/3D', (req, res) => { // alias for 3d
            res.sendFile(path.join(daaDisplaysRoot, '3d.html'));
        });
        app.get('/3D-view', (req, res) => { // alias for 3d
            res.sendFile(path.join(daaDisplaysRoot, '3d.html'));
        });
        app.get('/danti', (req, res) => {
            res.sendFile(path.join(daaDisplaysRoot, 'danti.html'));
        });
        app.get('/danti-view', (req, res) => { // alias for danti
            res.sendFile(path.join(daaDisplaysRoot, 'danti.html'));
        });
        const daaTestFolder: string = path.join(__dirname, '../daa-test');
        app.use(express.static(daaTestFolder));
        app.get('/test', (req, res) => {
            res.sendFile(path.join(daaTestFolder, 'test-runner.html'));
        });
        app.get('/playground', (req, res) => {
            res.sendFile(path.join(daaTestFolder, 'playground.html'));
        });
        const tileServerFolder: string = path.join(__dirname, 'tileServer');
        // console.log(`### serving ${tileServerFolder}`);
        app.use(express.static(tileServerFolder));
        app.get('/WMTSCapabilities.xml', (req, res) => {
            // console.log("received request for WMTSCapabilities.xml");
            res.sendFile(path.join(tileServerFolder, 'osm', 'WMTSCapabilities.xml'));
        });
        // additional routing for external libraries
        app.use(/(\/\w+\/[^\/]+)?\/handlebars\.js/, express.static(path.join(daaDisplaysRoot, `node_modules/handlebars/dist/handlebars.min.js`)));
        app.use(/(\/\w+\/[^\/]+)?\/jquery\.js/, express.static(path.join(daaDisplaysRoot, `node_modules/jquery/dist/jquery.min.js`)));
        app.use(/(\/\w+\/[^\/]+)?\/underscore\.js/, express.static(path.join(daaDisplaysRoot, `node_modules/underscore/underscore-min.js`)));
        app.use(/(\/\w+\/[^\/]+)?\/backbone\.js/, express.static(path.join(daaDisplaysRoot, `node_modules/backbone/backbone.js`)));       
        app.use(/(\/\w+\/[^\/]+)?\/bootstrap\.bundle\.js/, express.static(path.join(daaDisplaysRoot, `node_modules/bootstrap/dist/js/bootstrap.bundle.min.js`)));

        // create http server
        this.httpServer = http.createServer(app);
        this.httpServer.listen(this.config.port, "0.0.0.0", async () => {
            const url: string = "http://" + (<AddressInfo>this.httpServer.address()).address + ":" + (<AddressInfo>this.httpServer.address()).port;
            // console.info(`Server folder ${daaDisplaysRoot}`);
            console.info(`daa-displays server ready at ${url}`);
        });
        // add support for websocket connections
        this.wsServer = new ws.Server({
            server: this.httpServer
        });
        // handle messages received from client
        this.wsServer.on('connection', (wsocket: WebSocket) => {
            console.info("daa-displays client connected");
            wsocket.on('message', (msg: string) => {
                this.onMessageReceived(msg, wsocket);
            });
            wsocket.on('close', () => {
                console.info('daa-displays cliend has closed the connection');
            });
            wsocket.on('error', (err: Error) => {
                console.error('daa-displays client connection error ', err);
            });
        });
        this.wsServer.on('error', (err: Error) => {
            console.error('daa-displays server error :X', err);
        });
    }
}

const server = new DAAServer();
server.activate();
