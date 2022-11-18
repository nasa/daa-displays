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

import * as fs from 'fs';

/**
 * Generates the name of the file containing bands data.
 * The file name is built using conventions on config name, scenario name, wind values, and ownship name
 */
export function getBandsFileName (desc: { daaConfig: string, scenarioName: string, ownshipName: string, wind: { deg: string, knot: string } }) {
    if (desc) {
		if (desc.wind && desc.wind.knot && +desc.wind.knot > 0) {
			return desc?.ownshipName ? 
				`${getFilename(desc.daaConfig, { removeFileExtension: true })}-${getFilename(desc.scenarioName, { removeFileExtension: true })}-wind_${desc.wind.deg}_${desc.wind.knot}-ownship_${desc.ownshipName}.bands.json`
				: `${getFilename(desc.daaConfig, { removeFileExtension: true })}-${getFilename(desc.scenarioName, { removeFileExtension: true })}-wind_${desc.wind.deg}_${desc.wind.knot}.bands.json`;
		} else {
			return desc?.ownshipName ? 
				`${getFilename(desc.daaConfig, { removeFileExtension: true })}-${getFilename(desc.scenarioName, { removeFileExtension: true })}-ownship_${desc.ownshipName}.bands.json`
				: `${getFilename(desc.daaConfig, { removeFileExtension: true })}-${getFilename(desc.scenarioName, { removeFileExtension: true })}.bands.json`;
		}
    }
    return null;
}

/**
 * Generates the name of the json file containing the daa data.
 * The file name is built using conventions on scenario name and ownship name
 */
export function getDaaJsonFileName (desc: { scenarioName: string, ownshipName: string }) {
    if (desc) {
		return desc?.ownshipName ? 
			`${getFilename(desc.scenarioName, { removeFileExtension: true })}-ownship_${desc.ownshipName}.json`
			: `${getFilename(desc.scenarioName, { removeFileExtension: true })}.json`;
    }
    return null;
}

// obsolete
export function getLoSFileName (desc: { daaConfig: string, scenarioName: string }) {
    if (desc) {
        return `${getFilename(desc.daaConfig, { removeFileExtension: true })}-${getFilename(desc.scenarioName, { removeFileExtension: true })}.LoS.json`;
    }
    return null;
}

// obsolete
export function getVirtualPilotFileName (desc: { daaConfig: string, scenarioName: string }) {
    if (desc) {
        return `${getFilename(desc.scenarioName, { removeFileExtension: true })}.ViP.daa`;
    }
    return null;
}

export function stat(fname: string): fs.Stats {
	return fs.statSync(fname);
	// return new Promise<fs.Stats>((resolve, reject) => {
	// 	fs.stat(fname, (error, stat) => {
	// 		// ignore errors for now
	// 		resolve(stat);
	// 	});
	// });
};

/**
 * Returns the list of files and folders in a given directory
 */
export async function readDir(folder: string): Promise<string[]> {
	return new Promise<string[]>((resolve, reject) => {
		fs.readdir(folder, (error, children) => {
			// ignore errors for now
			resolve(children || []);
		});
	});
}

/**
 * Reads a text file
 */
export async function readFile(fname: string): Promise<string | null> {
	try {
		return fs.readFileSync(fname).toString('utf8');
	} catch (fileReadError) {
		console.error(fileReadError);
	}
	return null;
}
/**
 * Writes a text file
 */
export function writeFile(fname: string, content: string): void {
	return fs.writeFileSync(fname, content);
}

/**
 * Checks if a file exists
 */
export function fileExists(fname: string): boolean {
	return fs.existsSync(fname);
}
/**
 * Checks if a folder exists
 */
export function dirExists(folder: string) {
	return fs.existsSync(folder) && stat(folder)?.isDirectory();
}

/**
 * Returns the name of a given file
 */
export function getFilename(fname: string, opt?: { removeFileExtension?: boolean }): string {
	opt = opt || {};
	if (fname) {
		const pathlessFileName = fname.includes("/") ? fname.split("/").slice(-1)[0] : fname;
		if (opt.removeFileExtension) {
			return pathlessFileName.split(".").slice(0, -1).join(".");
		}
		return pathlessFileName;
	}
	return null;
}
// export function removeFileExtension(fileName: string): string {
// 	return fileName.split(".").slice(0, -1).join(".");
// }
/**
 * Returns the extension of a given file
 */
export function getFileExtension(fname: string): string {
	return fname ? `.${fname.split(".").slice(-1).join(".")}` : null;
}
/**
 * Returns the folder specified in a given file name specified using absolute path
 */
export function getContextFolder(fname: string): string {
	return fname ? fname.split("/").slice(0, -1).join("/").replace("file://", "") : null;
}