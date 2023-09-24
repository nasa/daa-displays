/* eslint-disable no-useless-escape */
/* eslint-disable no-async-promise-executor */
/**
 * @module PvsioProcess
 * @version 2019.02.07
 * PVSio process wrapper
 * @author Paolo Masci
 * @date 2019.04.26
 * @copyright 
 * Copyright 2016 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration. No
 * copyright is claimed in the United States under Title 17, 
 * U.S. Code. All Other Rights Reserved.
 *
 * Disclaimers
 *
 * No Warranty: THE SUBJECT SOFTWARE IS PROVIDED "AS IS" WITHOUT ANY
 * WARRANTY OF ANY KIND, EITHER EXPRESSED, IMPLIED, OR STATUTORY,
 * INCLUDING, BUT NOT LIMITED TO, ANY WARRANTY THAT THE SUBJECT SOFTWARE
 * WILL CONFORM TO SPECIFICATIONS, ANY IMPLIED WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR FREEDOM FROM
 * INFRINGEMENT, ANY WARRANTY THAT THE SUBJECT SOFTWARE WILL BE ERROR
 * FREE, OR ANY WARRANTY THAT DOCUMENTATION, IF PROVIDED, WILL CONFORM TO
 * THE SUBJECT SOFTWARE. THIS AGREEMENT DOES NOT, IN ANY MANNER,
 * CONSTITUTE AN ENDORSEMENT BY GOVERNMENT AGENCY OR ANY PRIOR RECIPIENT
 * OF ANY RESULTS, RESULTING DESIGNS, HARDWARE, SOFTWARE PRODUCTS OR ANY
 * OTHER APPLICATIONS RESULTING FROM USE OF THE SUBJECT SOFTWARE.
 * FURTHER, GOVERNMENT AGENCY DISCLAIMS ALL WARRANTIES AND LIABILITIES
 * REGARDING THIRD-PARTY SOFTWARE, IF PRESENT IN THE ORIGINAL SOFTWARE,
 * AND DISTRIBUTES IT "AS IS."
 *
 * Waiver and Indemnity: RECIPIENT AGREES TO WAIVE ANY AND ALL CLAIMS
 * AGAINST THE UNITED STATES GOVERNMENT, ITS CONTRACTORS AND
 * SUBCONTRACTORS, AS WELL AS ANY PRIOR RECIPIENT.  IF RECIPIENT'S USE OF
 * THE SUBJECT SOFTWARE RESULTS IN ANY LIABILITIES, DEMANDS, DAMAGES,
 * EXPENSES OR LOSSES ARISING FROM SUCH USE, INCLUDING ANY DAMAGES FROM
 * PRODUCTS BASED ON, OR RESULTING FROM, RECIPIENT'S USE OF THE SUBJECT
 * SOFTWARE, RECIPIENT SHALL INDEMNIFY AND HOLD HARMLESS THE UNITED
 * STATES GOVERNMENT, ITS CONTRACTORS AND SUBCONTRACTORS, AS WELL AS ANY
 * PRIOR RECIPIENT, TO THE EXTENT PERMITTED BY LAW.  RECIPIENT'S SOLE
 * REMEDY FOR ANY SUCH MATTER SHALL BE THE IMMEDIATE, UNILATERAL
 * TERMINATION OF THIS AGREEMENT.
 **/

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface PvsResponse {
    res: string;
    error: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const cmds: { [key: string]: string } = {
    'disable-gc-printout': '(setq *disable-gc-printout* t)'
};

class PvsLispParser {
    protected pvsOut: string;
    constructor () {
        this.pvsOut = "";
    }
    parse(data: string, cb: (pvsout: PvsResponse) => void): void {
		this.pvsOut += data;
		// see also regexp from emacs-src/ilisp/ilisp-acl.el
		const PVS_COMINT_PROMPT_REGEXP: RegExp = /\s*pvs\(\d+\):|([\w\W\s]*)\spvs\(\d+\):/g;
		const PVSIO_PROMPT: RegExp = /\s<PVSio>/g;
		const ready: boolean = PVS_COMINT_PROMPT_REGEXP.test(data)
								|| PVSIO_PROMPT.test(data);
		if (ready && cb) {
			const res: string = this.pvsOut;
			this.pvsOut = "";
            cb({
                res: res,
                error: null
            });
        }
    }
}

export class PVSioProcess {
    protected pvsExecutable: string = null;
    protected pvsProcess: ChildProcess = null;
    protected pvsProcessBusy: boolean = false;
	protected cmdQueue: Promise<PvsResponse> = Promise.resolve({ res: null, error: null });	
	protected pvsioModeActive: boolean = false;
	/**
	 * @constructor
	 * @param pvsExecutable Location of the pvs executable. Must be an absolute path.
	 * @param pvsFile Location of the pvs file. Must be an absolute path.
	 */
	constructor (pvsExecutable: string) {
		this.pvsExecutable = pvsExecutable;
	}
	/**
	 * Executes a pvs lisp command using the pvs process
	 * @param cmd PVSio commands to be evaluted
	 */
	protected pvsioExec(cmd: string): Promise<PvsResponse> {
		// utility function, automatically responds to lisp interactive commands, such as when pvs crashes into lisp
		// async function getResult(pvsLispResponse: string): Promise<PvsResponse> {
        //     const ans: PvsResponse = JSON.parse(pvsLispResponse);
		// 	if (/.*==>\s*(.*)\s*<PVSio>/.test(ans.res)) {
		// 		let match: RegExpMatchArray = /.*==>\s*(.*)\s*<PVSio>/.exec(ans.res);
		// 		ans.res = match[1];
        //         console.info("PVSio response: ", ans.res);
		// 	}
		// 	return ans; 
		// }
		if (this.pvsProcessBusy) {
			const msg: string = "PVSio busy, cannot execute " + cmd + ":/";
			return Promise.reject(msg);
		}
		this.pvsProcessBusy = true;
		const pvslispParser = new PvsLispParser();
		// console.info("Executing command " + cmd);
		console.log(cmd);
		return new Promise(async (resolve) => {
			const listener = (data: string) => {
				console.log(data); // this is the crude pvs lisp output, useful for debugging
				pvslispParser.parse(data, async (pvsOut: PvsResponse) => {
					// const match: RegExpMatchArray = /\<JSON\>([\w\W\s]+)\<\/\/JSON\>/.exec(data);
					// if (match && match.length > 1) {
					// 	const bands = JSON.parse(match[1]);
					// 	console.dir(bands, { depth: null });
					// }
					this.pvsProcess.stdout.removeListener("data", listener); // remove listener otherwise this will capture the output of other commands
					this.pvsProcessBusy = false;
					resolve(pvsOut);
				});
			};
			this.pvsProcess.stdout.on("data", listener);
			this.pvsProcess.stdin.write(cmd);
		});
    }
    // protected pvsExec(commandId: string, cmd: string): Promise<PvsResponse> {
	// 	this.pvsCmdQueue = new Promise((resolve, reject) => {
	// 		this.pvsCmdQueue.then(() => {
	// 			this.pvsExecAux(commandId, cmd).then((ans: PvsResponse) => {
	// 				resolve(ans);
	// 			});
	// 		});
	// 	});
	// 	return this.pvsCmdQueue;
	// }

	/**
	 * Starts the pvsio process
	 */
	protected async spawnProcess (): Promise<void> {
		if (!this.pvsProcess) {
            this.pvsProcessBusy = true;
			return new Promise((resolve) => {
                console.info("Spawning PVS process " + this.pvsExecutable); 
				const proc = spawn(this.pvsExecutable, ["-raw"]);
				proc.stdout.setEncoding("utf8");
                proc.stderr.setEncoding("utf8");
				const pvsLispParser: PvsLispParser = new PvsLispParser();
				// eslint-disable-next-line @typescript-eslint/no-this-alias
				const _this = this;
				function listener (data: string) {
					// console.log(data); // this is the crude pvs lisp output, useful for debugging
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					pvsLispParser.parse(data, (ans: PvsResponse) => {
						// console.info(ans.res);
						proc.stdout.removeListener("data", listener); // remove listener otherwise this will capture the output of other commands
						_this.pvsProcessBusy = false;
						console.log("PVS ready!");
						resolve();
					});
				}
				proc.stdout.on("data", (data: string) => {
					listener(data);
				});
				proc.stderr.on("data", (data: string) => {
					console.error(data);
				});
				this.pvsProcess = proc;
			});
		}
	}
	async activate () {
        await this.spawnProcess();
	}
    async pvsioMode (contextFolder: string, fileName: string, theoryName?: string): Promise<void> {
		if (this.pvsioModeActive === false) {
			theoryName = theoryName || fileName;
			await this.pvsioExec(`(setq *disable-gc-printout* t)`);
			await this.pvsioExec(`(change-context "${contextFolder}" t)`);
			await this.pvsioExec(`(typecheck-file "${fileName}" nil nil nil)`);
			await this.pvsioExec('(load-pvs-attachments)');
			await this.pvsioExec(`(evaluation-mode-pvsio "${theoryName}" nil nil)`);
			this.pvsioModeActive = true;
		}
	}
	async getVersion (wellClearFolder: string, daaLogic: string): Promise<string> {
		const match: RegExpMatchArray = /\w+\-([\w\.]+)\.pvsio/g.exec(daaLogic);
		if (match && match.length > 1) {
			console.log("[daa-pvsio-process] pvsio well-clear version " + match[1]);
			return match[1];
		}
		return "";
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async getMonitorList (wellClearFolder: string, daaLogic: string): Promise<string> {
		return "[]";
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async getAlerters (wellClearFolder: string, daaLogic: string): Promise<string> {
		return "[]";
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async exec (daaFolder: string, daaLogic: string, daaConfig: string, scenarioName: string, outputFileName: string, opt?: { contrib?: boolean }): Promise<string> {
		const match: RegExpMatchArray = /\w+\-([\w\.]+)\.pvsio/.exec(daaLogic);
		if (match && match.length > 1) {
			const ver: string = match[1];
			const f1: string = path.join("../daa-output", ver);
			try {
				const pvsConfig: string = fs.readFileSync(daaConfig).toLocaleString();
				await this.pvsioExec(`load_parameters(${pvsConfig});`)
				const pvsScenario: string = fs.readFileSync(scenarioName).toLocaleString();
				const response: PvsResponse = await this.pvsioExec(`LET scenario: Scenario = ${pvsScenario} IN print_json_bands(scenario,  (# version := "${ver}", configuration := "${daaConfig}", scenario := "${scenarioName}" #));`);
				if (response && response.res) {
					const json_bands: string = response.res.replace("==>", "").replace("TRUE", "").replace("<PVSio>", "");
					// console.log(json_bands);
					const outputFolder: string = path.join(f1, "pvsio");
					// make sure the output folder exists, otherwise the Java files will generate an exception while trying to write the output
					if (!fs.existsSync(f1)) { fs.mkdirSync(f1); }
					if (!fs.existsSync(outputFolder)) { fs.mkdirSync(outputFolder); }
					const outputFilePath: string = path.join(outputFolder, outputFileName);
					fs.writeFileSync(outputFilePath, json_bands);
				} else {
					console.error(response);
				}
			} catch (pvsio_error) {
				console.error("[daa-pvsio-process] Error: ", pvsio_error);
			}
		} else {
			console.error("[daa-pvsio-process] Error: could not identify pvsio well-clear version", daaLogic);
		}
		// await this.pvsioExec(`LET ${scenarioName}: Scenario = ${scenarioData};`);
		return null;
	}

}