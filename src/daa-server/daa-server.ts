import * as ws from 'ws';
import * as express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { PVSioProcess } from './daa-pvsioProcess'
import { JavaProcess } from './daa-javaProcess';
import { JavaMsg, LoadScenarioRequest, LoadConfigRequest, WebSocketMessage, LLAPosition, DAAScenario, DAADataXYZ, ConfigData, ConfigFile } from './utils/daa-server';
import * as utils from '../daa-displays/daa-utils';
import * as fsUtils from './utils/fsUtils';



class DAAServer {
    useCache: boolean = false;
    httpServer: http.Server;
    wsServer: ws.Server;
    pvsioProcess: PVSioProcess; // TODO: create an array of processes for parallel execution of multiple pvs files
    javaProcess: JavaProcess; // TODO: create array of processes
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
    private async loadDaaServerConfiguration (fileName: string) {
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
                    console.info(`Server port: ${port}`)
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
    private async activatePVSioProcess () {
        // try to start a pvsio process
        let configIsOk: boolean = true;
        if (this.config && !this.config.pvs) { configIsOk = false; console.error(`Configuration file does not include attribute "pvs"`); }
        // if (this.config && !this.config.contextFolder) { configIsOk = false; console.error(`Configuration file does not include attribute contextFolder`); }
        // if (this.config && !this.config.file) { configIsOk = false; console.error(`Configuration file does not include attribute pvsFile`); }
        // if (this.config && !this.config.theory) { configIsOk = false; console.error(`Configuration file does not include attribute pvsTheory`); }
        if (configIsOk && !this.pvsioProcess) {
            this.pvsioProcess = new PVSioProcess(this.config.pvs);
            await this.pvsioProcess.activate();
            console.info('PVSio ready!');
            return true;
        }
        return false;
    }
    private async activateJavaProcess () {
        // try to start a java process
        let configIsOk: boolean = true;
        // if (this.config && !this.config.java) { configIsOk = false; console.error(`Configuration file does not include attribute "pvs"`); }
        // if (this.config && !this.config.contextFolder) { configIsOk = false; console.error(`Configuration file does not include attribute contextFolder`); }
        // if (this.config && !this.config.file) { configIsOk = false; console.error(`Configuration file does not include attribute pvsFile`); }
        if (configIsOk && !this.javaProcess) {
            this.javaProcess = new JavaProcess();
            return true;
        }
        return false;  
    }
    private async loadScenario (scenarioName: string, scenarioPath: string, ownship?: { ownshipSequenceNumber?: number, ownshipName?: string}): Promise<DAAScenario> {
        const filePath: string = path.join(scenarioPath, scenarioName);
        console.log(`Reading file ${filePath}`);
        let buf: Buffer = null;
        let daaScenario: DAAScenario = {
            scenarioName: scenarioName,
            lla: {},
            daa: [],
            length: 0,
            steps: []
        };
        try {
            buf = await fs.readFileSync(filePath);
        } catch (readError) {
            console.error(`Error while reading ${filePath}`, readError);
        }
        if (buf) {
            // console.log(buf.toLocaleString());
            const lines: string[] = buf.toLocaleString().split("\n");
            if (lines && lines.length > 2) {
                if (!ownship || ownship === {}) {
                    console.log("Ownship is first aircraft in the list");
                    ownship = { ownshipSequenceNumber: 0 }; // by default, the ownship is the first in the list, unless a name has been specified, see following line of code
                }
                let ownshipName: string = (ownship && ownship.ownshipName) ? ownship.ownshipName : null;
                // console.log(`labels: ${lines[0]}`);
                // console.log(`units: ${lines[1]}`);
                for (let i = 2; i < lines.length; i++) {
                    // console.log(`reading line ${i}`);
                    const match: RegExpMatchArray = /(\w+)\s*,\s*([+-]?\d*.?\d*)\s*,\s*([+-]?\d*.?\d*)\s*,\s*([+-]?\d*.?\d*)\s*,\s*([+-]?\d*.?\d*)\s*,\s*([+-]?\d*.?\d*)\s*,\s*([+-]?\d*.?\d*)\s*,\s*([+-]?\d*.?\d*)\s*/g.exec(lines[i]);
                    if (match && match.length === 9) {
                        const name: string = match[1];
                        const lat: string = match[2];
                        const lon: string = match[3];
                        const alt: string = match[4];
                        const time: string = match[8];
                        let vx: string = "err";
                        let vy: string = "err";
                        let vz: string = "err";
                        if (/\s*NAME\s*,?\s*lat\s*,?\s*lon\s*,?\s*alt\s*,?\s*trk\s*,?\s*gs,?\s*vs,?\s*time/gi.test(lines[0])) {
                            //&& /\[none\]\s*,?\s*\[deg\]\s*,?\s*\[deg\]\s*,?\s*\[ft\]\s*,?\[deg\]\s*,?\s*\[knot\]\s*,?\s*\[fpm\]\s*,?\s*\[s\]/gi.test(lines[1])) {
                            // console.log(`TRK-GS-VS file format detected...`);
                            const trk: number = utils.deg2rad(+match[5]); // match[5] is in deg, we need rad to make the computation
                            const gs: number = +match[6]; // kn
                            const vs: string = match[7];  // kn
                            // see also trkgs2vx in Daidalus Velocity.java
                            vx = (gs * Math.sin(trk)).toString();
                            vy = (gs * Math.cos(trk)).toString(); 
                            vz = vs;
                        } else if (/\s*NAME\s*,?\s*lat\s*,?\s*lon\s*,?\s*alt\s*,?\s*vx\s*,?\s*vy\s*,?\s*vz\s*,?\s*time/gi.test(lines[0])) {
                            // console.log(`VX-VY-VZ file format detected...`);
                            vx = match[5];
                            vy = match[6];
                            vz = match[7];
                        } else {
                            console.error("Unsupported format :/");
                        }
                        const data: DAADataXYZ = { name, time, lat, lon, alt, vx, vy, vz };
                        // populate daa format
                        daaScenario.daa.push(data);
                        // populate lla format
                        daaScenario.lla[time] = daaScenario.lla[time] || { ownship: null, traffic: [] };
                        // identify ownship name
                        if (!ownshipName && ownship && !isNaN(ownship.ownshipSequenceNumber) && ownship.ownshipSequenceNumber === (i - 2)) {
                            ownshipName = name.toLocaleLowerCase();
                        }
                        const lladata: LLAPosition = {
                            id: name,
                            s: { lat, lon, alt },
                            v: { x: vx, y: vy, z: vz }
                        };
                        if (name.toLocaleLowerCase() === ownshipName) {
                            daaScenario.lla[time].ownship = lladata;
                            // console.log(`Ownship information successfully loaded: ${JSON.stringify(daaScenario.lla[time].ownship)}`);
                        } else {
                            daaScenario.lla[time].traffic.push(lladata);
                            // console.log(`Traffic information successfully loaded: ${JSON.stringify(data)}`);
                        }
                        // console.log(`name: ${name}, lat: ${lat}, lon: ${lon}, alt: ${alt}, vx: ${vx}, vy: ${vy}, vz: ${vz}, time: ${time}`);
                    }
                    daaScenario.steps = Object.keys(daaScenario.lla);
                }
                daaScenario.length = Object.keys(daaScenario.lla).length;
                console.log(`${daaScenario.length} data lines loaded successfully from scenario ${scenarioName}`);
                // ordering traffic data by ID
                console.log("Sorting LLA data...");
                Object.keys(daaScenario.lla).forEach((time: string) => {
                    daaScenario.lla[time].traffic = daaScenario.lla[time].traffic.sort((a: LLAPosition, b: LLAPosition) => {
                        return (a.id > b.id) ? 1 : -1;
                    });
                });
                console.log("Done!");
            }
        }
        return daaScenario;
    }

    private async trySend (wsocket, content: WebSocketMessage<any>, msg?: string) {
        msg = msg || "data";
        try {
            if (content && wsocket) {
                console.log(`sending ${msg} to client...`);
                if (content.time) {
                    content.time.server = { sent: new Date().toISOString() };
                }
                // console.log(JSON.stringify(content));
                wsocket.send(JSON.stringify(content));
                console.log(`${msg} sent`);
            }
        } catch (sendError) {
            console.error(`Error while sending ${msg} :/`);
        }
    }
    // Just one level of recursion, i.e., current folder and first-level sub-folders.
    // This is sufficient to navigate symbolic links placed in the current folder.
    private async listFilesRecursive (folderName: string, ext: string[]): Promise<string[]> {
        const listFilesInFolder = async (folder: string) => {
            const elems: string[] = await fs.readdirSync(folder);
            if (elems && elems.length > 0) {
                const allFiles: string[] = elems.filter(async (name: string) => {
                    return await fs.lstatSync(path.join(folder, name)).isFile();
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
        const files: string[] = await listFilesInFolder(folderName);
        // check sub-folders, just one level
        const elems: string[] = await fs.readdirSync(folderName);
        if (elems && elems.length > 0) {
            for (let i = 0; i < elems.length; i++) {
                // console.log(`Reading ${elems[i]}`);
                const pt: string = path.join(folderName, elems[i]);
                const isSymbolicLink: boolean = await fs.lstatSync(pt).isSymbolicLink();
                const isFolder: boolean = await fs.lstatSync(pt).isDirectory();
                if (isFolder || isSymbolicLink) {
                    const subfolder: string = elems[i];
                    try {
                        // console.log(`Reading subfolder ${subfolder}`);
                        const sfiles: string[] = await listFilesInFolder(path.join(folderName, subfolder));
                        if (sfiles && sfiles.length > 0) {
                            sfiles.forEach((name: string) => {
                                name = `${subfolder}/${name}`;
                                files.push(name);
                            });
                        }
                    } catch (subfolderError) {
                        console.warn(`[daa-server.listFileRecursive] ignoring subfolder ${subfolder} (read error)`);
                    }
                }
            }
        }
        return files;
    }
    async activate () {
        // try to load configuration file
        await this.loadDaaServerConfiguration("daa-server.json");
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
        app.get('/airspace', (req, res) => {
            res.sendFile(path.join(daaDisplaysRoot, 'gods.html'));
        });
        app.get('/3d', (req, res) => {
            res.sendFile(path.join(daaDisplaysRoot, '3d.html'));
        });
        app.get('/3D', (req, res) => {
            res.sendFile(path.join(daaDisplaysRoot, '3d.html'));
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
        // create http server
        this.httpServer = http.createServer(app);
        this.httpServer.listen(this.config.port, "0.0.0.0", async () => {
            const url: string = "http://" + this.httpServer.address().address + ":" + this.httpServer.address().port;
            // console.info(`Server folder ${daaDisplaysRoot}`);
            console.info(`DAAServer ready at ${url}`);
        });
        // add support for websocket connections
        this.wsServer = new ws.Server({
            server: this.httpServer
        });
        // handle messages received from client
        this.wsServer.on('connection', (wsocket) => {
            console.info("ws client connected");
            wsocket.on('message', async (msg: string) => {
                console.info(`Received new message ${msg}`);
                try {
                    const content: WebSocketMessage<any> = JSON.parse(msg);
                    // console.info("Message parsed successfully!")
                    switch (content['type']) {
                        case 'java': {
                            const data: JavaMsg = <JavaMsg> content.data;
                            const bandsFile: string = fsUtils.getBandsFileName(data);
                            if (bandsFile) {
                                await this.activateJavaProcess();
                                const wellClearFolder: string = path.join(__dirname, "../daa-logic");
                                const wellClearVersion: string = await this.javaProcess.getVersion(wellClearFolder, data.daaLogic);
                                const outputFileName: string = fsUtils.getBandsFileName({ daaConfig: data.daaConfig, scenarioName: data.scenarioName });
                                const outputFolder: string = path.join(__dirname, "../daa-output", wellClearVersion);
                                try {
                                    if (this.useCache && fs.existsSync(path.join(outputFolder, bandsFile))) {
                                        console.log(`Reading bands file ${bandsFile} from cache`);
                                    } else {
                                        await this.javaProcess.exec(wellClearFolder, data.daaLogic, data.daaConfig, data.scenarioName, outputFileName);                                    
                                    }
                                    try {
                                        const buf: Buffer = fs.readFileSync(path.join(outputFolder, bandsFile));
                                        content.data = buf.toLocaleString();
                                        this.trySend(wsocket, content, "daa bands");
                                    } catch (readError) {
                                        console.error(`Error while reading daa bands file ${path.join(outputFolder, bandsFile)}`);
                                        this.trySend(wsocket, null, "daa bands");
                                    }
                                } catch (execError) {
                                    console.error(`Error while executing java process`, execError);
                                    this.trySend(wsocket, null, "daa bands");
                                }
                            } else {
                                console.error(`Error while generating daa bands file (filename is null) :/`);
                            }
                            break;
                        }
                        case 'java-los': {
                            const data: JavaMsg = <JavaMsg> content.data;
                            const losFile: string = fsUtils.getLoSFileName(data);
                            if (losFile) {
                                await this.activateJavaProcess();
                                const losLogic: string = data.daaLogic;
                                const losFolder: string = path.join(__dirname, "../daa-logic");
                                const losVersion: string = await this.javaProcess.getVersion(losFolder, losLogic);
                                const outputFileName: string = fsUtils.getLoSFileName({ daaConfig: data.daaConfig, scenarioName: data.scenarioName });
                                const outputFolder: string = path.join(__dirname, "../daa-output", losVersion);
                                try {
                                    if (this.useCache && fs.existsSync(path.join(outputFolder, losFile))) {
                                        console.log(`Reading daa los regions file ${losFile} from cache`);
                                    } else {
                                        await this.javaProcess.exec(losFolder, losLogic, data.daaConfig, data.scenarioName, outputFileName);
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
                            const data: JavaMsg = <JavaMsg> content.data;
                            const outputFile: string = data.scenarioName.replace(".ic", ".daa");
                            if (outputFile) {
                                await this.activateJavaProcess();
                                const virtualPilot: string = data.daaLogic;
                                const virtualPilotFolder: string = path.join(__dirname, "../contrib/virtual-pilot");
                                console.log("folder:" + virtualPilotFolder);
                                const outputFileName: string = fsUtils.getVirtualPilotFileName({ daaConfig: data.daaConfig, scenarioName: data.scenarioName });
                                console.log("fileName:" + outputFileName);
                                const outputFolder: string = path.join(__dirname, "../../daa-output/virtual_pilot");
                                // use the .ic file to generate the .daa file
                                try {
                                    await this.javaProcess.exec(virtualPilotFolder, virtualPilot, data.daaConfig, data.scenarioName, outputFileName, { contrib: true });
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
                        case 'list-daa-files': {
                            const scenarioFolder: string = path.join(__dirname, "../daa-scenarios");
                            let daaFiles: string[] = null;
                            try {
                                daaFiles = await this.listFilesRecursive(scenarioFolder, ['.daa', '.txt']);
                            } catch (listError) {
                                console.error(`Error while reading scenario folder`, listError);
                            } finally {
                                content.data = JSON.stringify(daaFiles);
                                console.log(content.data);
                                this.trySend(wsocket, content, "daa file list");
                            }
                            break;
                        }
                        case 'list-ic-files': {
                            const scenarioFolder: string = path.join(__dirname, "../daa-scenarios");
                            let icFiles: string[] = null;
                            try {
                                icFiles = await this.listFilesRecursive(scenarioFolder, ['.ic']);
                            } catch (listError) {
                                console.error(`Error while reading scenario folder`, listError);
                            } finally {
                                content.data = JSON.stringify(icFiles);
                                console.log(content.data);
                                this.trySend(wsocket, content, "ic file list");
                            }
                            break;
                        }
                        case 'list-conf-files':
                        case 'list-config-files': {
                            const configurationsFolder: string = path.join(__dirname, "../daa-config");
                            let confFiles: string[] = null;
                            try {
                                confFiles = await this.listFilesRecursive(configurationsFolder, ['.conf']);
                            } catch (confError) {
                                console.error(`Error while reading configuratios folder`, confError);
                            } finally {
                                content.data = JSON.stringify(confFiles);
                                console.log(content.data);
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
                                    console.log(fileContent);
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
                                    console.log(content.data);
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
                                const allFiles: string[] = await fs.readdirSync(wellclearLogicFolder);
                                if (allFiles) {
                                    let wellclearVersions: string[] = [];
                                    try { 
                                        let jarFiles = allFiles.filter(async (name: string) => {
                                            return await fs.lstatSync(path.join(wellclearLogicFolder, name)).isDirectory();
                                        });
                                        jarFiles = jarFiles.filter((name: string) => {
                                            return name.startsWith("WellClear-") && name.endsWith(".jar");
                                        });
                                        wellclearVersions = jarFiles.map((name: string) => {
                                            return name.slice(0, name.length - 4);
                                        });
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
                                const allFiles: string[] = await fs.readdirSync(wellclearLogicFolder);
                                if (allFiles) {
                                    let wellclearVersions: string[] = [];
                                    try { 
                                        let jarFiles = allFiles.filter(async (name: string) => {
                                            return await fs.lstatSync(path.join(wellclearLogicFolder, name)).isDirectory();
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
                                const allFiles: string[] = await fs.readdirSync(virtualPilotFolder);
                                if (allFiles) {
                                    let virtualPilotVersions: string[] = [];
                                    try { 
                                        let jarFiles = allFiles.filter(async (name: string) => {
                                            return await fs.lstatSync(path.join(virtualPilotFolder, name)).isDirectory();
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
            });
            wsocket.on('close', () => {
                console.info('ws connection has been closed :/');
            });
            wsocket.on('error', (err: Error) => {
                console.error('ws connection error ', err);
            });
        });
        this.wsServer.on('error', (err: Error) => {
            console.error('wsServer error ', err);
        });
    }
}

const server = new DAAServer();
server.activate();
