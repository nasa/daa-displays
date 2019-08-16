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
import * as fsUtils from './utils/fsUtils';
import * as fs from 'fs';

export class JavaProcess {
	async exec (daaFolder: string, daaLogic: string, daaConfig: string, scenarioName: string, outputFileName: string, opt?: { contrib?: boolean }): Promise<string> {
		opt = opt || {};
		if (daaFolder && daaLogic && daaConfig && scenarioName && outputFileName) {
			daaLogic = daaLogic || "DAAtoPVS-1.0.1";
			daaConfig = daaConfig || "WC_SC_228_nom_b.txt";
			scenarioName = scenarioName || "H1.daa";
			const subFolder: string = await this.getVersion(daaFolder, daaLogic);
			const outputFolder: string = path.join("../daa-output/", subFolder);
			// make sure the output folder exists, otherwise the Java files will generate an exception while trying to write the output
			if (!fs.existsSync(outputFolder)) {
				fs.mkdirSync(outputFolder);
			}
			const outputFilePath: string = opt.contrib ? path.join("..", outputFolder, outputFileName) : path.join(outputFolder, outputFileName);
			return new Promise((resolve, reject) => {
				const wellClearScenario: string = path.join(__dirname, "../daa-scenarios", scenarioName);
				const wellClearConfig: string = path.join(__dirname, "../daa-config", daaConfig);
				const cmds: string[] = [
					`cd ${daaFolder}`,
					`java -jar ${daaLogic} --conf ${wellClearConfig} --output ${outputFilePath} ${wellClearScenario}`
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
					resolve(stdout);
				});
			});
		}
		return Promise.resolve(null);
	}
	// async execWellClear (daaLogic: string, daaConfig: string, scenarioName: string): Promise<string> {
	// 	const wellClearFolder: string = path.join(__dirname, "../daa-logic");
	// 	return await this.exec(wellClearFolder, daaLogic, daaConfig, scenarioName);
	// 	// daaLogic = daaLogic || "DAAtoPVS-1.0.1";
	// 	// daaConfig = daaConfig || "WC_SC_228_nom_b.txt";
	// 	// scenarioName = scenarioName || "H1.daa";
	// 	// const subFolder: string = await this.getVersion(wellClearFolder, daaLogic);
	// 	// const outputPath: string = path.join("../daa-output/", subFolder);
	// 	// // make sure the output folder exists, otherwise the Java files will generate an exception while trying to write the output
	// 	// if (!fs.existsSync(outputPath)) {
	// 	// 	fs.mkdirSync(outputPath);
	// 	// }
	// 	// const outputFileName: string = path.join(outputPath, fsUtils.getBandsFileName({ daaConfig, scenarioName }));
	// 	// return new Promise((resolve, reject) => {
	// 	// 	const wellClearScenario: string = path.join(__dirname, "../daa-scenarios", scenarioName);
	// 	// 	const wellClearConfig: string = path.join(__dirname, "../daa-config", daaConfig);
	// 	// 	const cmds: string[] = [
	// 	// 		`cd ${wellClearFolder}`,
	// 	// 		`java -jar ${daaLogic} --conf ${wellClearConfig} --output ${outputFileName} ${wellClearScenario}`
	// 	// 	];
	// 	// 	const cmd = cmds.join(" && ");
	// 	// 	console.info(`Executing ${cmd}`);
	// 	// 	exec(cmd, (error, stdout, stderr) => {
	// 	// 		if (error) {
	// 	// 		  console.error(`exec error: ${error}`);
	// 	// 		  return;
	// 	// 		} else if (stderr) {
	// 	// 			console.error(`stderr: ${stderr}`);  
	// 	// 		}
	// 	// 		console.info(`stdout: ${stdout}`);
	// 	// 		resolve(stdout);
	// 	// 	});
	// 	// });
	// }
	// async execLoS (losLogic: string, daaConfig: string, scenarioName: string): Promise<string> {
	// 	const losFolder: string = path.join(__dirname, "../daa-logic");
	// 	return await this.exec(losFolder, losLogic, daaConfig, scenarioName);
	// 	// losLogic = losLogic || "DAALoS-1.0.1";
	// 	// daaConfig = daaConfig || "WC_SC_228_nom_b.txt";
	// 	// scenarioName = scenarioName || "H1.daa";
	// 	// const wellClearFolder: string = path.join(__dirname, "../daa-logic");
	// 	// const subFolder: string = await this.getVersion(wellClearFolder, losLogic);
	// 	// const outputPath: string = path.join("../daa-output/", subFolder);
	// 	// // make sure the output folder exists, otherwise the Java files will generate an exception while trying to write the output
	// 	// if (!fs.existsSync(outputPath)) {
	// 	// 	fs.mkdirSync(outputPath);
	// 	// }
	// 	// const outputFileName: string = path.join(outputPath, fsUtils.getLoSFileName({ daaConfig, scenarioName }));
	// 	// return new Promise((resolve, reject) => {
	// 	// 	const wellClearScenario: string = path.join(__dirname, "../daa-scenarios", scenarioName);
	// 	// 	const wellClearConfig: string = path.join(__dirname, "../daa-config", daaConfig);
	// 	// 	const cmds: string[] = [
	// 	// 		`cd ${wellClearFolder}`,
	// 	// 		`java -jar ${losLogic} --conf ${wellClearConfig} --output ${outputFileName} ${wellClearScenario}`
	// 	// 	];
	// 	// 	const cmd = cmds.join(" && ");
	// 	// 	console.info(`Executing ${cmd}`);
	// 	// 	exec(cmd, (error, stdout, stderr) => {
	// 	// 		if (error) {
	// 	// 			console.error(`exec error: ${error}`);
	// 	// 			resolve(null);
	// 	// 		} else if (stderr) {
	// 	// 			console.error(`stderr: ${stderr}`);  
	// 	// 		}
	// 	// 		console.info(`stdout: ${stdout}`);
	// 	// 		resolve(stdout);
	// 	// 	});
	// 	// });
	// }
	// async execVirtualPilot (virtualPilotLogic: string, daaConfig: string, scenarioName: string): Promise<string> {
	// 	const virtualPilotFolder: string = path.join(__dirname, "../contrib/carreno");
	// 	return await this.exec(virtualPilotFolder, virtualPilotLogic, daaConfig, scenarioName);
	// 	// daaLogic = daaLogic || "SimDaidalus_2_3_1_wind";
	// 	// daaConfig = daaConfig || "WC_SC_228_nom_b.txt";
	// 	// scenarioName = scenarioName || "H1.ic";
	// 	// const virtualPilotFolder: string = path.join(__dirname, "../contrib/carreno");
	// 	// const subFolder: string = await this.getVersion(virtualPilotFolder, daaLogic);
	// 	// const outputPath: string = path.join("../daa-output/virtual_pilot", subFolder);
	// 	// // make sure the output folder exists, otherwise the Java files will generate an exception while trying to write the output
	// 	// if (!fs.existsSync(outputPath)) {
	// 	// 	fs.mkdirSync(outputPath);
	// 	// }
	// 	// const outputFileName: string = path.join(outputPath, fsUtils.getBandsFileName({ daaConfig, scenarioName }));
	// 	// return new Promise((resolve, reject) => {
	// 	// 	const wellClearScenario: string = path.join(__dirname, "../daa-scenarios", scenarioName);
	// 	// 	const wellClearConfig: string = path.join(__dirname, "../daa-config", daaConfig);
	// 	// 	const cmds: string[] = [
	// 	// 		`cd ${virtualPilotFolder}`,
	// 	// 		`java -jar ${daaLogic} --conf ${wellClearConfig} --output ${outputFileName} ${wellClearScenario}`
	// 	// 	];
	// 	// 	const cmd = cmds.join(" && ");
	// 	// 	console.info(`Executing ${cmd}`);
	// 	// 	exec(cmd, (error, stdout, stderr) => {
	// 	// 		if (error) {
	// 	// 		  console.error(`exec error: ${error}`);
	// 	// 		  return;
	// 	// 		} else if (stderr) {
	// 	// 			console.error(`stderr: ${stderr}`);  
	// 	// 		}
	// 	// 		console.info(`stdout: ${stdout}`);
	// 	// 		resolve(stdout);
	// 	// 	});
	// 	// });
	// }
	async getVersion (folder: string, daaLogic: string): Promise<string> {
		return new Promise((resolve, reject) => {
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
				console.info(`stdout: ${stdout}`);
				resolve(stdout.trim());
			});
		});
	}
	async activate () { }
}