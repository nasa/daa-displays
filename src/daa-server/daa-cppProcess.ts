/**
 * @module CppProcess
 * Java process wrapper
 * @author Paolo Masci
 * @date 2019.11.05
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

import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as fsUtils from './utils/fsUtils';

export class CppProcess {
	async exec (desc: {
		daaFolder: string, 
		daaLogic: string, 
		daaConfig: string, 
		daaScenario: string, 
		outputFileName: string,
		ownshipName: string,
		wind?: { deg?: string, knot?: string }
	},
	opt?: { 
		contrib?: boolean 
	}): Promise<string> {
		opt = opt || {};
		if (desc) {
			const daaFolder: string = desc.daaFolder
			const daaLogic: string = desc.daaLogic || "DAIDALUSv2.0.2.jar";
			const daaConfig = desc.daaConfig || "2.x/DO_365B_no_SUM.conf";
			const daaScenario = desc.daaScenario || "H1.daa";
			const ownshipName: string = desc.ownshipName;
			const wind: { deg: string, knot: string } = { deg: desc?.wind?.deg || "0", knot: desc?.wind?.knot };
			const outputFileName: string = desc.outputFileName || fsUtils.getBandsFileName({ daaConfig, ownshipName, scenarioName: daaScenario, wind });
			const ver: string = await this.getVersion(daaFolder, daaLogic);
			const daaOutput: string = path.resolve("../daa-output");
			const f1: string = path.join(daaOutput, ver);
			const outputFolder: string = path.join(f1, "cpp");
			// make sure the output folder exists, otherwise the Java files will generate an exception while trying to write the output
			if (!fs.existsSync(daaOutput)) { fs.mkdirSync(daaOutput); }
			if (!fs.existsSync(f1)) { fs.mkdirSync(f1); }
			if (!fs.existsSync(outputFolder)) { fs.mkdirSync(outputFolder); }
			const outputFilePath: string = opt.contrib ? path.join("..", outputFolder, outputFileName) : path.join(outputFolder, outputFileName);
			return new Promise((resolve, reject) => {
				const wellClearScenario: string = path.join(__dirname, "../daa-scenarios", daaScenario);
				const wellClearConfig: string = path.join(__dirname, "../daa-config", daaConfig);
				const cmds: string[] = [
					`cd ${daaFolder}`,
					`./${daaLogic} --conf ${wellClearConfig} ${ownshipName ? `--ownship ${ownshipName}` : ""} --output ${outputFilePath} --wind "{ deg: ${wind.deg}, knot: ${wind.knot} }" ${wellClearScenario}`
				];
				const cmd = cmds.join(" && ");
				console.info(`Executing ${cmd}`);
				exec(cmd, (error, stdout, stderr) => {
					if (error) {
					console.error(`exec error: ${error}`);
					return;
					} else if (stderr) {
						console.error(`stderr: ${stderr}`);  
					}
					console.info(`stdout: ${stdout}`);
				const match: RegExpMatchArray = /.(\d+\.\d+(\.\d+)?)/g.exec(stdout);
				console.log(`DAIDALUS++ version: ${match[1]}`);
				if (match && match[1]) {
					resolve(match[1]);
				} else {
					console.warn("Unable to identify Daildalus version");
					resolve("xx.yy.zz");
				}
				});
			});
		}
		return Promise.resolve(null);
	}
	async getVersion (folder: string, daaLogic: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const cmds: string[] = [
				`cd ${folder}`,
				`./${daaLogic} --version`
			];
			const cmd = cmds.join(" && ");
			console.info("Executing " + cmd);
			exec(cmd, (error, stdout, stderr) => {
				if (error) {
					console.error(`exec error: ${error}`);
					return;
				} else if (stderr) {
					console.error(`stderr: ${stderr}`);  
				}
				console.info(`stdout: ${stdout}`);
				resolve(stdout.trim());
			});
		});
	}
	/**
	 * Returns the list of monitors
	 */
	async getMonitorList (folder: string, daaLogic: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const cmds: string[] = [
				`cd ${folder}`,
				`./${daaLogic} --list-monitors`
			];
			const cmd = cmds.join(" && ");
			console.info("Executing " + cmd);
			exec(cmd, (error, stdout, stderr) => {
				if (error) {
					console.error(`exec error: ${error}`);
					return;
				} else if (stderr) {
					console.error(`stderr: ${stderr}`);  
				}
				console.info(`stdout: ${stdout}`);
				resolve(stdout.trim());
			});
		});
	}
	/**
	 * Returns the list of alerters
	 */
	async getAlerters (folder: string, daaLogic: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const cmds: string[] = [
				`cd ${folder}`,
				`./${daaLogic} --list-alerters`
			];
			const cmd = cmds.join(" && ");
			console.info("Executing " + cmd);
			exec(cmd, (error, stdout, stderr) => {
				if (error) {
					console.error(`exec error: ${error}`);
					return;
				} else if (stderr) {
					console.error(`stderr: ${stderr}`);  
				}
				console.info(`stdout: ${stdout}`);
				resolve(stdout.trim());
			});
		});
	}
	/**
	 * Activates the process
	 */
	async activate () {
		// no need to do anything in this impleentation
	}
}
