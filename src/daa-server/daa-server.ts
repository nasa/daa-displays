/**
 * ## Notices
 * Copyright 2019 United States Government as represented by the Administrator 
 * of the National Aeronautics and Space Administration. All Rights Reserved.
 * 
 * ## Disclaimers
 * No Warranty: THE SUBJECT SOFTWARE IS PROVIDED "AS IS" WITHOUT ANY WARRANTY OF ANY KIND, 
 * EITHER EXPRESSED, IMPLIED, OR STATUTORY, INCLUDING, BUT NOT LIMITED TO, ANY WARRANTY 
 * THAT THE SUBJECT SOFTWARE WILL CONFORM TO SPECIFICATIONS, ANY IMPLIED WARRANTIES OF 
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR FREEDOM FROM INFRINGEMENT, 
 * ANY WARRANTY THAT THE SUBJECT SOFTWARE WILL BE ERROR FREE, OR ANY WARRANTY THAT 
 * DOCUMENTATION, IF PROVIDED, WILL CONFORM TO THE SUBJECT SOFTWARE. THIS AGREEMENT DOES NOT, 
 * IN ANY MANNER, CONSTITUTE AN ENDORSEMENT BY GOVERNMENT AGENCY OR ANY PRIOR RECIPIENT 
 * OF ANY RESULTS, RESULTING DESIGNS, HARDWARE, SOFTWARE PRODUCTS OR ANY OTHER APPLICATIONS 
 * RESULTING FROM USE OF THE SUBJECT SOFTWARE.  FURTHER, GOVERNMENT AGENCY DISCLAIMS 
 * ALL WARRANTIES AND LIABILITIES REGARDING THIRD-PARTY SOFTWARE, IF PRESENT IN THE 
 * ORIGINAL SOFTWARE, AND DISTRIBUTES IT "AS IS."
 * 
 * Waiver and Indemnity:  RECIPIENT AGREES TO WAIVE ANY AND ALL CLAIMS AGAINST THE 
 * UNITED STATES GOVERNMENT, ITS CONTRACTORS AND SUBCONTRACTORS, AS WELL AS ANY PRIOR 
 * RECIPIENT.  IF RECIPIENT'S USE OF THE SUBJECT SOFTWARE RESULTS IN ANY LIABILITIES, 
 * DEMANDS, DAMAGES, EXPENSES OR LOSSES ARISING FROM SUCH USE, INCLUDING ANY DAMAGES 
 * FROM PRODUCTS BASED ON, OR RESULTING FROM, RECIPIENT'S USE OF THE SUBJECT SOFTWARE, 
 * RECIPIENT SHALL INDEMNIFY AND HOLD HARMLESS THE UNITED STATES GOVERNMENT, 
 * ITS CONTRACTORS AND SUBCONTRACTORS, AS WELL AS ANY PRIOR RECIPIENT, TO THE EXTENT 
 * PERMITTED BY LAW.  RECIPIENT'S SOLE REMEDY FOR ANY SUCH MATTER SHALL BE THE IMMEDIATE, 
 * UNILATERAL TERMINATION OF THIS AGREEMENT.
 */

import * as ws from 'ws';
import * as express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { PVSioProcess } from './daa-pvsioProcess'
import { JavaProcess } from './daa-javaProcess';
import { CppProcess } from './daa-cppProcess';
import { 
    ExecMsg, LoadScenarioRequest, LoadConfigRequest, WebSocketMessage, 
    ConfigFile, ScenarioDescriptor, SaveScenarioRequest, GetTailNumbersRequest, GetTailNumbersResponse, DaaServerCommand 
} from './utils/daa-types';
import * as fsUtils from './utils/fsUtils';
import WebSocket = require('ws');
import { AddressInfo } from 'net';
import { DaaFileContent, readDaaFileContent } from '../daa-displays/utils/daa-reader';

// flag for enabling verbose log, useful for debugging purposes but may reduce performance
const VERBOSE: boolean = false;

// maximum lines read in the .daa file when finding tail numbers
const MAX_LINES: number = 20;

// help message
const helpMsg: string = `
  Usage: node daa-server.js [options]
  Options:
    -pvsio               (Enables the pvsio process; pvsio must be in the execution path; requires nasalib)
    -pvsio <path>        (Enables the pvsio process; the given pvsio path is used for executing the pvsio environment; requires nasalib)
    -fast                (Enables optimizations, including caching of simulation results)
    -port <port number>  (The server will use the given port)
`;

// views supported by the server
export const views: string[] = [ "danti", "single", "split", "multi", "top", "3d", "3D" ];

/**
 * DAAServer class
 */
export class DAAServer {
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
    /**
     * Constructor
     */
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
    protected getPvsioDaaVersions (javaFiles: string[]): string[] {
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
                        for (let i = 0; i < sfiles?.length; i++) {
                            const name: string = `${subfolder}/${sfiles[i]}`;
                            files.push(name);
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
        console.info(`\nReceived new message ${msg}`);
        try {
            const content: WebSocketMessage<any> = JSON.parse(msg);
            // console.info("Message parsed successfully!")
            const cmd: DaaServerCommand = content["type"];
            switch (cmd) {
                case DaaServerCommand.exec: { // execute the logic for generatating bands
                    const data: ExecMsg = <ExecMsg> content.data;
                    const wind: { deg: string, knot: string } = data?.wind || { deg: "0", knot: "0" };
                    const bandsFileName: string = fsUtils.getBandsFileName({ ...data, wind });
                    if (bandsFileName) {
                        const impl: string = data.daaLogic.endsWith(".jar") ? "java" 
                                                : data.daaLogic.endsWith(".exe") ? "cpp" 
                                                : data.daaLogic.endsWith(".pvsio") ? "pvsio"
                                                : null;
                        if (impl) {
                            const daaFolder: string = path.join(__dirname, "../daa-logic");
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
                            const daaVersion: string = 
                                    (impl === "java") ? await this.javaProcess.getVersion(daaFolder, data.daaLogic)
                                        : (impl === "cpp") ? await this.cppProcess.getVersion(daaFolder, data.daaLogic)
                                        : (impl === "pvsio") ? await this.pvsioProcess.getVersion(daaFolder, data.daaLogic)
                                        : null;
                            
                            const outputFolder: string = path.join(__dirname, "../daa-output", daaVersion, impl);
                            const bandsFile: string = path.resolve(outputFolder, bandsFileName);
                            // console.log(`[daa-server] Bands file`, { bandsFile });
                            try {
                                if (this.useCache && fs.existsSync(bandsFile)) {
                                    console.log(`Reading bands file from cache`, { bandsFile });
                                } else {
                                    // invoke the corresponding process to generate the bands file
                                    switch (impl) {
                                        case "java": {
                                            await this.javaProcess.exec({
                                                daaFolder, 
                                                daaLogic: data.daaLogic, 
                                                daaConfig: data.daaConfig, 
                                                daaScenario: data.scenarioName, 
                                                ownshipName: data.ownshipName,
                                                outputFileName: bandsFileName,
                                                wind
                                            });
                                            break;
                                        }
                                        case "cpp": {
                                            await this.cppProcess.exec({
                                                daaFolder, 
                                                daaLogic: data.daaLogic, 
                                                daaConfig: data.daaConfig, 
                                                daaScenario: data.scenarioName, 
                                                ownshipName: data.ownshipName,
                                                outputFileName: bandsFileName,
                                                wind
                                            });
                                            break;
                                        }
                                        case "pvsio": {
                                            //@TODO: implement pvs functions for setting wind
                                            const res: { configFile: string, scenarioFile: string } = await this.javaProcess.daa2pvs(daaFolder, data.daaLogic, data.daaConfig, data.scenarioName, `${data.scenarioName}.pvs`);
                                            try {
                                                const contextFolder: string = path.join(daaFolder, `WellClear-${daaVersion}`, "PVS");
                                                await this.pvsioProcess.pvsioMode(contextFolder, "DAABands");
                                                await this.pvsioProcess.exec(daaFolder, data.daaLogic, res.configFile, res.scenarioFile, bandsFileName);
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
                                    console.log(`[daa-server] Reading bands file ${bandsFile}`);
                                    const buf: Buffer = fs.readFileSync(bandsFile);
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
                                    console.error(`Error while reading daa bands file ${bandsFile}`);
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
                case DaaServerCommand.getTailNumbers: { // get tail numbers from a scenario file
                    const data: GetTailNumbersRequest = <GetTailNumbersRequest> (content.data);
                    const scenarioName: string = data.scenarioName;
                    if (scenarioName) {
                        const scenarioFolder: string = path.join(__dirname, "../daa-scenarios");
                        const daaFileContent: string = await fsUtils.readFile(path.join(scenarioFolder, scenarioName));
                        if (daaFileContent) {
                            const info: DaaFileContent = readDaaFileContent(daaFileContent, { maxLines: MAX_LINES, tailNumbersOnly: true });
                            const tailNumbers: string[] = [];
                            if (info?.ownship?.length && info.ownship[0]?.name) {
                                tailNumbers.push(info.ownship[0]?.name);
                            } else {
                                console.warn(`[daa-server] Warning: unable to find ownship data in ${scenarioName}`);
                            }
                            if (info?.traffic?.length && info.traffic[0]?.length) {
                                for (let i = 0; i < info.traffic[0].length; i++) {
                                    if (info.traffic[0][i].name) {
                                        tailNumbers.push(info.traffic[0][i].name);
                                    }
                                }
                            } else {
                                console.warn(`[daa-server] Warning: unable to find traffic data in ${scenarioName}`);
                            }
                            const res: GetTailNumbersResponse = { tailNumbers };
                            content.res = res;
                            // send message back to the client
                            this.trySend(wsocket, content, "tail numbers");
                        } else {
                            console.warn(`[daa-server] Warning: unable to open .daa file ${scenarioName}`);
                        }
                    }
                    break;
                }
                // case 'java-los': {
                //     const data: ExecMsg = <ExecMsg> content.data;
                //     const losFile: string = fsUtils.getLoSFileName(data);
                //     if (losFile) {
                //         await this.activateJavaProcess();
                //         const losLogic: string = data.daaLogic;
                //         const losFolder: string = path.join(__dirname, "../daa-logic");
                //         const losVersion: string = await this.javaProcess.getVersion(losFolder, losLogic);
                //         const outputFileName: string = fsUtils.getLoSFileName({ daaConfig: data.daaConfig, scenarioName: data.scenarioName });
                //         const outputFolder: string = path.join(__dirname, "../daa-output", losVersion);
                //         const wind: { deg: string, knot: string } = data.wind || { deg: "0", knot: "0" };
                //         try {
                //             if (this.useCache && fs.existsSync(path.join(outputFolder, losFile))) {
                //                 console.log(`Reading daa los regions file ${losFile} from cache`);
                //             } else {
                //                 await this.javaProcess.exec({
                //                     daaFolder: losFolder, 
                //                     daaLogic: losLogic, 
                //                     daaConfig: data.daaConfig, 
                //                     daaScenario: data.scenarioName,
                //                     ownshipName: data.ownshipName,
                //                     outputFileName,
                //                     wind
                //                 });
                //             }
                //             try {
                //                 const buf: Buffer = fs.readFileSync(path.join(outputFolder, losFile));
                //                 content.data = buf.toLocaleString();
                //                 this.trySend(wsocket, content, "daa los regions");
                //             } catch (readError) {
                //                 console.error(`Error while reading daa los regions file ${path.join(outputFolder, losFile)}`);
                //                 this.trySend(wsocket, null, "daa los regions");
                //             }
                //         } catch (execError) {
                //             console.error(`Error while executing java process`, execError);
                //             this.trySend(wsocket, null, "daa los regions");
                //         }
                //     } else {
                //         console.error(`Error while generating daa los regions file (filename is null) :/`);
                //     }
                //     break;
                // }
                // case DaaServerCommand.javaVirtualPilot: { // generate-daa-file-from-ic
                //     const data: ExecMsg = <ExecMsg> content.data;
                //     const outputFile: string = data.scenarioName.replace(".ic", ".daa");
                //     if (outputFile) {
                //         await this.activateJavaProcess();
                //         const virtualPilot: string = data.daaLogic;
                //         const virtualPilotFolder: string = path.join(__dirname, "../contrib/virtual-pilot");
                //         console.log("folder:" + virtualPilotFolder);
                //         const outputFileName: string = fsUtils.getVirtualPilotFileName({ daaConfig: data.daaConfig, scenarioName: data.scenarioName });
                //         console.log("fileName:" + outputFileName);
                //         const outputFolder: string = path.join(__dirname, "../../daa-output/virtual_pilot");
                //         const wind: { deg: string, knot: string } = data.wind || { deg: "0", knot: "0" };
                //         // use the .ic file to generate the .daa file
                //         try {
                //             await this.javaProcess.exec({
                //                 daaFolder: virtualPilotFolder, 
                //                 daaLogic: virtualPilot, 
                //                 daaConfig: data.daaConfig, 
                //                 daaScenario: data.scenarioName,
                //                 ownshipName: data.ownshipName,
                //                 outputFileName,
                //                 wind
                //             }, { contrib: true });
                //             console.log("executed");
                //             try {
                //                 const buf: Buffer = fs.readFileSync(path.join(outputFolder, outputFile));
                //                 content.data = buf.toLocaleString();
                //                 this.trySend(wsocket, content, "daa virtual pilot");
                //             } catch (readError) {
                //                 console.error(`Error while reading daa virtual pilot file ${path.join(outputFolder, outputFile)}`);
                //                 this.trySend(wsocket, null, "daa virtual pilot");
                //             }
                //         } catch (execError) {
                //             console.error(`Error while executing java process`, execError);
                //             this.trySend(wsocket, null, "daa virtual pilot");
                //         }
                //     } else {
                //         console.error(`Error while generating daa virtual pilot file (filename is null) :/`);
                //     }
                //     break;
                // }
                case DaaServerCommand.saveDaaFile: { // save a .daa scenario file
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
                                    const outputFileName: string = fsUtils.getDaaJsonFileName({ scenarioName, ownshipName: null });
                                    await this.javaProcess.daa2json(scenarioName, outputFileName);
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
                case DaaServerCommand.loadDaaFile: { // load a .daa scenario file
                    const data: LoadScenarioRequest = <LoadScenarioRequest> content.data;
                    const scenarioName: string = (data && data.scenarioName)? data.scenarioName : null;
                    const ownshipName: string = data?.ownshipName ? `${data.ownshipName}` : null;
                    if (scenarioName) {
                        await this.activateJavaProcess();
                        try {
                            const outputFileName: string = fsUtils.getDaaJsonFileName({ scenarioName, ownshipName });
                            await this.javaProcess.daa2json(scenarioName, outputFileName, { ownshipName });
                            const jsonDaa: string = path.join(__dirname, "../daa-scenarios", outputFileName);
                            content.data = await fsUtils.readFile(jsonDaa);
                            this.trySend(wsocket, content, `scenario ${scenarioName} ${ownshipName ? `(ownship: ${ownshipName})` : "" }`);
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
                case DaaServerCommand.listMonitors: { // return the list of available monitors
                    const data: ExecMsg = <ExecMsg> content.data;
                    const impl: string = data.daaLogic.endsWith(".jar") ? "java" 
                                            : data.daaLogic.endsWith(".exe") ? "cpp" 
                                            : data.daaLogic.endsWith(".pvsio") ? "pvsio"
                                            : null;
                    if (impl) {
                        const daaFolder: string = path.join(__dirname, "../daa-logic");
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
                                (impl === "java") ? await this.javaProcess.getMonitorList(daaFolder, data.daaLogic)
                                    : (impl === "cpp") ? await this.cppProcess.getMonitorList(daaFolder, data.daaLogic)
                                    : (impl === "pvsio") ? await this.pvsioProcess.getMonitorList(daaFolder, data.daaLogic)
                                    : null;
                        content.data = monitorList;
                        this.trySend(wsocket, content, "daa monitors");
                    }
                    break;
                }
                case DaaServerCommand.listDaaFiles: { // returns the list of available .daa scenario files
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
                case DaaServerCommand.listIcFiles: { // returns the list of available .ic scenario files
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
                case DaaServerCommand.listConfigFiles: { // returns the list of available daa configuration files
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
                // case 'load-copilot-file': {
                //     //...
                //     break;
                // }
                case DaaServerCommand.loadConfigFile: { // loads a daa configuration file
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
                case DaaServerCommand.listDaaVersions: { // returns the list of available daa logic
                    const daaLogicFolder: string = path.join(__dirname, "../daa-logic");
                    try {
                        const ls: string[] = fs.readdirSync(daaLogicFolder);
                        if (ls) {
                            let daaVersions: string[] = [];
                            try { 
                                const allFiles: string[] = ls.filter((name: string) => {
                                    return fs.lstatSync(path.join(daaLogicFolder, name)).isDirectory() === false;
                                });
                                const javaFiles: string[] = allFiles.filter((name: string) => {
                                    return name.startsWith("DAIDALUSv") && name.endsWith(".jar");
                                });
                                daaVersions = (javaFiles) ? daaVersions.concat(javaFiles) : daaVersions;
                                const cppFiles: string[] = allFiles.filter((name: string) => {
                                    return name.startsWith("DAIDALUSv") && name.endsWith(".exe");
                                });
                                daaVersions = (cppFiles) ? daaVersions.concat(cppFiles) : daaVersions;

                                const pvsioFiles: string[] = this.getPvsioDaaVersions(javaFiles);
                                daaVersions = (pvsioFiles) ? daaVersions.concat(pvsioFiles) : daaVersions;
                            } catch (statError) {
                                console.error(`Error while reading wellclear folder ${daaLogicFolder} :/`);
                            } finally {
                                content.data = JSON.stringify(daaVersions);
                                this.trySend(wsocket, content, "wellclear versions");
                            }
                        }
                    } catch (listError) {
                        console.error(`Error while reading wellclear folder ${daaLogicFolder} :/`);
                    }
                    break;
                }
                // case 'list-los-versions': {
                //     const wellclearLogicFolder: string = path.join(__dirname, "../daa-logic");
                //     try {
                //         const allFiles: string[] = fs.readdirSync(wellclearLogicFolder);
                //         if (allFiles) {
                //             let wellclearVersions: string[] = [];
                //             try { 
                //                 let jarFiles = allFiles.filter(async (name: string) => {
                //                     return fs.lstatSync(path.join(wellclearLogicFolder, name)).isDirectory();
                //                 });
                //                 jarFiles = jarFiles.filter((name: string) => {
                //                     return name.startsWith("LoSRegion-") && name.endsWith(".jar");
                //                 });
                //                 wellclearVersions = jarFiles.map((name: string) => {
                //                     return name.slice(0, name.length - 4);
                //                 });
                //             } catch (statError) {
                //                 console.error(`Error while reading los folder ${wellclearLogicFolder} :/`);
                //             } finally {
                //                 content.data = JSON.stringify(wellclearVersions);
                //                 this.trySend(wsocket, content, "los versions");
                //             }
                //         }
                //     } catch (listError) {
                //         console.error(`Error while reading wellclear folder ${wellclearLogicFolder} :/`);
                //     }
                //     break;
                // }
                // case DaaServerCommand.listVirtualPilotVersions: {
                //     const virtualPilotFolder: string = path.join(__dirname, "../contrib/virtual-pilot");
                //     try {
                //         const allFiles: string[] = fs.readdirSync(virtualPilotFolder);
                //         if (allFiles) {
                //             let virtualPilotVersions: string[] = [];
                //             try { 
                //                 let jarFiles = allFiles.filter(async (name: string) => {
                //                     return fs.lstatSync(path.join(virtualPilotFolder, name)).isDirectory();
                //                 });
                //                 jarFiles = jarFiles.filter((name: string) => {
                //                     return name.startsWith("SimDaidalus_") && name.endsWith(".jar");
                //                 });
                //                 virtualPilotVersions = jarFiles.map((name: string) => {
                //                     return name.slice(0, name.length - 4);
                //                 });
                //             } catch (statError) {
                //                 console.error(`Error while reading virtual pilot folder ${virtualPilotFolder} :/`);
                //             } finally {
                //                 content.data = JSON.stringify(virtualPilotVersions);
                //                 this.trySend(wsocket, content, "virtual pilot versions");
                //             }
                //         }
                //     } catch (listError) {
                //         console.error(`Error while reading wellclear folder ${virtualPilotFolder} :/`);
                //     }
                //     break;
                // }
                case DaaServerCommand.listAlertingVolumes: { // returns the list of alerting volumes indicated in a configuration file
                    const data: ExecMsg = <ExecMsg> content.data;
                    const impl: string = data.daaLogic.endsWith(".jar") ? "java" 
                                            : data.daaLogic.endsWith(".exe") ? "cpp" 
                                            : data.daaLogic.endsWith(".pvsio") ? "pvsio"
                                            : null;
                    if (impl) {
                        const daaFolder: string = path.join(__dirname, "../daa-logic");
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
                                (impl === "java") ? await this.javaProcess.getAlerters(daaFolder, data.daaLogic)
                                    : (impl === "cpp") ? await this.cppProcess.getAlerters(daaFolder, data.daaLogic)
                                    : (impl === "pvsio") ? await this.pvsioProcess.getAlerters(daaFolder, data.daaLogic)
                                    : null;
                        content.data = monitorList;
                        this.trySend(wsocket, content, "daa monitors");
                    }
                    break;
                }
                case DaaServerCommand.jasmine: { // run test cases with jasmine
                    const open = require('open');
                    if (open) {
                        open("http://localhost:8082/test.html");
                    }
                    break;
                }
                default: {
                    console.warn(`[daa-server] Warning: received unsupported message type ${content.type}`,  { content });
                    break;
                }
            }
        } catch (err) {
            console.error(`[daa-server] Error while parsing message :/`, err);
        }
    }
    /**
     * Utility function, parses command line arguments passed to the server
     */
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
    /**
     * Utility function, actvates the server functionalities
     */
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
        for (let i = 0; i < views?.length; i++) {
            app.get(`/${views[i]}`, (req, res) => { //lgtm [js/missing-rate-limiting]
                res.sendFile(path.join(daaDisplaysRoot, `${views[i]}.html`));
            });
            app.get(`/${views[i]}-view`, (req, res) => { //lgtm [js/missing-rate-limiting] alias for split
                res.sendFile(path.join(daaDisplaysRoot, `${views[i]}.html`));
            });
        }
        // app.get('/split', (req, res) => { //lgtm [js/missing-rate-limiting]
        //     res.sendFile(path.join(daaDisplaysRoot, 'split.html'));
        // });
        // app.get('/split-view', (req, res) => { //lgtm [js/missing-rate-limiting] alias for split
        //     res.sendFile(path.join(daaDisplaysRoot, 'split.html'));
        // });
        // app.get('/multi', (req, res) => { //lgtm [js/missing-rate-limiting]
        //     res.sendFile(path.join(daaDisplaysRoot, 'multi.html'));
        // });
        // app.get('/multi-view', (req, res) => { //lgtm [js/missing-rate-limiting] alias for split
        //     res.sendFile(path.join(daaDisplaysRoot, 'multi.html'));
        // });
        // app.get('/single', (req, res) => { //lgtm [js/missing-rate-limiting]
        //     res.sendFile(path.join(daaDisplaysRoot, 'single.html'));
        // });
        // app.get('/single-view', (req, res) => { //lgtm [js/missing-rate-limiting] alias for single
        //     res.sendFile(path.join(daaDisplaysRoot, 'single.html'));
        // });
        // app.get('/top', (req, res) => { //lgtm [js/missing-rate-limiting]
        //     res.sendFile(path.join(daaDisplaysRoot, 'top.html'));
        // });
        // app.get('/top-view', (req, res) => { //lgtm [js/missing-rate-limiting] alias for top
        //     res.sendFile(path.join(daaDisplaysRoot, 'top.html'));
        // });
        // app.get('/3d', (req, res) => { //lgtm [js/missing-rate-limiting]
        //     res.sendFile(path.join(daaDisplaysRoot, '3d.html'));
        // });
        // app.get('/3d-view', (req, res) => { //lgtm [js/missing-rate-limiting] alias for 3d
        //     res.sendFile(path.join(daaDisplaysRoot, '3d.html'));
        // });
        // app.get('/3D', (req, res) => { //lgtm [js/missing-rate-limiting] alias for 3d
        //     res.sendFile(path.join(daaDisplaysRoot, '3d.html'));
        // });
        // app.get('/3D-view', (req, res) => { //lgtm [js/missing-rate-limiting] alias for 3d
        //     res.sendFile(path.join(daaDisplaysRoot, '3d.html'));
        // });
        // app.get('/danti', (req, res) => { //lgtm [js/missing-rate-limiting]
        //     res.sendFile(path.join(daaDisplaysRoot, 'danti.html'));
        // });
        // app.get('/danti-view', (req, res) => { //lgtm [js/missing-rate-limiting] alias for danti
        //     res.sendFile(path.join(daaDisplaysRoot, 'danti.html'));
        // });
        const daaTestFolder: string = path.join(__dirname, '../daa-test');
        app.use(express.static(daaTestFolder));
        app.get('/test', (req, res) => {
            res.sendFile(path.join(daaTestFolder, 'test-runner.html'));
        });
        app.get('/playground', (req, res) => { //lgtm [js/missing-rate-limiting]
            res.sendFile(path.join(daaTestFolder, 'playground.html'));
        });
        const tileServerFolder: string = path.join(__dirname, 'tileServer');
        // console.log(`### serving ${tileServerFolder}`);
        app.use(express.static(tileServerFolder));
        app.get('/WMTSCapabilities.xml', (req, res) => { //lgtm [js/missing-rate-limiting]
            // console.log("received request for WMTSCapabilities.xml");
            res.sendFile(path.join(tileServerFolder, 'osm', 'WMTSCapabilities.xml'));
        });
        // additional routing for external libraries
        app.use(/(\/\w+\/[^\/]+)?\/handlebars\.js/, express.static(path.join(daaDisplaysRoot, `node_modules/handlebars/dist/handlebars.min.js`)));
        app.use(/(\/\w+\/[^\/]+)?\/jquery\.js/, express.static(path.join(daaDisplaysRoot, `node_modules/jquery/dist/jquery.min.js`)));
        app.use(/(\/\w+\/[^\/]+)?\/underscore\.js/, express.static(path.join(daaDisplaysRoot, `node_modules/underscore/underscore-min.js`)));
        app.use(/(\/\w+\/[^\/]+)?\/backbone\.js/, express.static(path.join(daaDisplaysRoot, `node_modules/backbone/backbone.js`)));       
        app.use(/(\/\w+\/[^\/]+)?\/bootstrap\.bundle\.js/, express.static(path.join(daaDisplaysRoot, `node_modules/bootstrap/dist/js/bootstrap.bundle.min.js`)));
        app.use(/(\/\w+\/[^\/]+)?\/leaflet\.js/, express.static(path.join(daaDisplaysRoot, `node_modules/leaflet/dist/leaflet.js`)));

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
                console.info('daa-displays client has closed the connection');
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

// instantiates & activates the server
const server = new DAAServer();
server.activate();
