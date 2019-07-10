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

interface PvsResponse {
    res: string;
    error: string;
};

const cmds: { [key: string]: string } = {
    'disable-gc-printout': '(setq *disable-gc-printout* t)'
};

class PvsLispParser {
    pvsOut: string;
    constructor () {
        this.pvsOut = "";
    }
    parse(data: string, cb: (pvsout: PvsResponse) => void) {
		this.pvsOut += data;
		// see also regexp from emacs-src/ilisp/ilisp-acl.el
		const PVS_COMINT_PROMPT_REGEXP: RegExp = /\s*pvs\(\d+\):|([\w\W\s]*)\spvs\(\d+\):/g;
		const PVSIO_PROMPT: RegExp = /\s<PVSio>/g;
		let ready: boolean = PVS_COMINT_PROMPT_REGEXP.test(data)
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
    private pvsExecutable: string = null;
    private pvsProcess: ChildProcess = null;
    private pvsProcessBusy: boolean = false;
	private cmdQueue: Promise<PvsResponse> = Promise.resolve({ res: null, error: null });	
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
	private pvsioExec(cmd: string): Promise<PvsResponse> {
		// utility function, automatically responds to lisp interactive commands, such as when pvs crashes into lisp
		async function getResult(pvsLispResponse: string): Promise<PvsResponse> {
            const ans: PvsResponse = JSON.parse(pvsLispResponse);
			if (/.*==>\s*(.*)\s*<PVSio>/.test(ans.res)) {
				let match: RegExpMatchArray = /.*==>\s*(.*)\s*<PVSio>/.exec(ans.res);
				ans.res = match[1];
                console.info("PVSio response: ", ans.res);
			}
			return ans; 
		}
		if (this.pvsProcessBusy) {
			const msg: string = "PVSio busy, cannot execute " + cmd + ":/";
			return Promise.reject(msg);
		}	
		this.pvsProcessBusy = true;
		const pvslispParser = new PvsLispParser();
		console.info("Executing command " + cmd);
		return new Promise(async (resolve, reject) => {
			let listener = (data: string) => {
				console.log(data); // this is the crude pvs lisp output, useful for debugging
				pvslispParser.parse(data, async (pvsOut: PvsResponse) => {
					this.pvsProcess.stdout.removeListener("data", listener); // remove listener otherwise this will capture the output of other commands
					this.pvsProcessBusy = false;
					resolve(pvsOut);
				});
			};
			this.pvsProcess.stdout.on("data", listener);
			this.pvsProcess.stdin.write(cmd + "\n");
		});
    }
    // private pvsExec(commandId: string, cmd: string): Promise<PvsResponse> {
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
	private async spawnProcess (): Promise<{}> {
		if (!this.pvsProcess) {
            this.pvsProcessBusy = true;
			return new Promise((resolve, reject) => {
                console.info("Spawning PVSio process " + this.pvsExecutable);
				this.pvsProcess = spawn(this.pvsExecutable, ["-raw"]);
				this.pvsProcess.stdout.setEncoding("utf8");
                this.pvsProcess.stderr.setEncoding("utf8");
                const pvsLispParser: PvsLispParser = new PvsLispParser();
                const _this = this;
				let listener = function (data: string) {
					console.log(data); // this is the crude pvs lisp output, useful for debugging
					pvsLispParser.parse(data, (ans: PvsResponse) => {
						// console.info(ans.res);
						_this.pvsProcess.stdout.removeListener("data", listener); // remove listener otherwise this will capture the output of other commands
						_this.pvsProcessBusy = false;
						resolve();
					});
				};
				this.pvsProcess.stdout.on("data", listener);
				this.pvsProcess.stderr.on("data", (data: string) => {
					console.log(data);
				});
			});
		}
	}
	async activate () {
        await this.spawnProcess();
	}
    async init (contextFolder: string, file: string, theory: string) {
        await this.pvsioExec(cmds['disable-gc-printout']);
        await this.pvsioExec(`(change-context "${contextFolder}" t)`);
        await this.pvsioExec(`(typecheck-file "${file}" nil nil nil)`);
        await this.pvsioExec('(load-pvs-attachments)');
        await this.pvsioExec(`(evaluation-mode-pvsio "${theory}" nil nil nil)`);
    }

}