/**
 * @module JavaProcess
 * @version 2019.02.07
 * Java process wrapper
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

import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as fsUtils from './utils/fsUtils';
import { PROFILER_ENABLED } from '../config';

export class JavaProcess {
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
			const daaFolder: string = desc.daaFolder;
			const daaLogic: string = desc.daaLogic || "DAIDALUSv2.0.2.jar";
			const daaConfig: string = desc.daaConfig || "2.x/DO_365B_no_SUM.conf";
			const daaScenario: string = desc.daaScenario || "H1.daa";
			const ownshipName: string = desc.ownshipName;
			const wind: { deg: string, knot: string } = { deg: desc?.wind?.deg || "0", knot: desc?.wind?.knot };
			const outputFileName: string = desc.outputFileName || fsUtils.getBandsFileName({ daaConfig, ownshipName, scenarioName: daaScenario, wind });
			const ver: string = await this.getVersion(daaFolder, daaLogic);
			const daaOutput: string = path.resolve("../daa-output");
			const f1: string = path.resolve(daaOutput, ver);
			const outputFolder: string = path.resolve(f1, "java");
			// make sure the output folder exists, otherwise the Java files will generate an exception while trying to write the output
			if (!fs.existsSync(daaOutput)) { fs.mkdirSync(daaOutput); }
			if (!fs.existsSync(f1)) { fs.mkdirSync(f1); }
			if (!fs.existsSync(outputFolder)) { fs.mkdirSync(outputFolder); }
			const outputFilePath: string = opt.contrib ? path.resolve("..", outputFolder, outputFileName) : path.resolve(outputFolder, outputFileName);
			return new Promise((resolve) => {
				const scenario: string = path.resolve(__dirname, "../daa-scenarios", daaScenario);
				const config: string = path.resolve(__dirname, "../daa-config", daaConfig);
				const cmds: string[] = [
					`cd ${daaFolder}`,
					`java -jar ${daaLogic} ${PROFILER_ENABLED ? "--profiler-on " : "" } --conf ${config} ${ownshipName ? `--ownship ${ownshipName}` : ""} --output ${outputFilePath} --wind "{ deg: ${wind.deg}, knot: ${wind.knot} }" ${scenario}`
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
					console.info(`stdout: ${stdout?.trim()}`);
					const match: RegExpMatchArray = /.(\d+\.\d+(\.\d+)?)/g.exec(stdout);
					console.log(`DAIDALUSj version: ${match[1]}`);
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
	async daa2json (inputFileName: string, outputFileName: string, opt?: { ownshipName?: string }): Promise<string> {
		if (inputFileName && outputFileName) {
			const outputFolder: string = "../daa-scenarios/";
			// make sure the output folder exists, otherwise the Java files will generate an exception while trying to write the output
			if (!fs.existsSync(outputFolder)) {
				fs.mkdirSync(outputFolder);
			}
			const outputFilePath: string = path.join(outputFolder, outputFileName);
			return new Promise((resolve) => {
				const scenario: string = path.join(__dirname, "../daa-scenarios", inputFileName);
				const ownshipName: string = opt?.ownshipName;
				const cmds: string[] = [
					`cd ../daa-logic`,
					`java -jar DAA2Json-2.x.jar --output ${outputFilePath} ${ownshipName ? `--ownship ${ownshipName}` : ""} ${scenario}`
				];
				const cmd = cmds.join(" && ");
				console.info(`Executing ${cmd}`);
				try {
					exec(cmd, (error, stdout, stderr) => {
						if (error) {
							console.error(`exec error: ${error}`);
							return;
						} else if (stderr) {
							console.error(`stderr: ${stderr}`);  
						}
						console.info(`stdout: ${stdout?.trim()}`);
						resolve(stdout);
					});
				} catch (err) {
					console.error(`[daa-javaProcess] Error while converting daa file to json`, err);
				}
			});
		}
		return Promise.resolve(null);
	}
	// conveerts configuration file and .daa scenario file in pvs format
	async daa2pvs (wellClearFolder: string, daaLogic: string, daaConfig: string, scenarioName: string, outputFileName: string): Promise<{ configFile: string, scenarioFile: string }> {
		if (daaLogic) {
			return new Promise((resolve) => {
				const configFile: string = path.join(__dirname, "../daa-config", daaConfig);
				const outputFile: string = path.join(__dirname, "../daa-scenarios", outputFileName);
				const scenarioFile: string = path.join(__dirname, "../daa-scenarios", scenarioName);
				const cmds: string[] = [
					`cd ../daa-logic`,
					`java -jar DAA2PVS-1.x.jar -conf ${configFile} -output ${outputFile} ${scenarioFile}`
				];
				const cmd = cmds.join(" && ");
				console.info(`Executing ${cmd}`);
				exec(cmd, { maxBuffer: 1024 * 5000 }, (error, stdout, stderr) => {
					if (error) {
						console.error(`exec error: ${error}`);
						return resolve(null);
					} else if (stderr) {
						console.error(`stderr: ${stderr}`);
					}
					console.info(`stdout: ${stdout?.trim()}`);
					resolve({
						configFile: `${configFile}.pvs`,
						scenarioFile: outputFile
					});
				});
			});
		} else {
			console.error("[daa2pvs] Error: daaLogic is null");
		}
		return Promise.resolve(null);
	}
	async getVersion (folder: string, daaLogic: string): Promise<string> {
		return new Promise((resolve) => {
			const cmds: string[] = [
				`cd ${folder}`,
				`java -jar ${daaLogic} --version`
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
				console.info(`stdout: ${stdout?.trim()}`);
				resolve(stdout.trim());
			});
		});
	}
	/**
	 * Returns the list of monitors
	 */
	async getMonitorList (folder: string, daaLogic: string): Promise<string> {
		return new Promise((resolve) => {
			const cmds: string[] = [
				`cd ${folder}`,
				`java -jar ${daaLogic} --list-monitors`
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
				console.info(`stdout: ${stdout?.trim()}`);
				resolve(stdout.trim());
			});
		});
	}
	/**
	 * Returns the list of monitors
	 */
	async getAlerters (folder: string, daaLogic: string): Promise<string> {
		return new Promise((resolve) => {
			const cmds: string[] = [
				`cd ${folder}`,
				`java -jar ${daaLogic} --list-alerters`
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
				console.info(`stdout: ${stdout?.trim()}`);
				resolve(stdout.trim());
			});
		});
	}
	/**
	 * Activates the process
	 */
	async activate () {
		// no need to do anything in this implementation
	}
}
