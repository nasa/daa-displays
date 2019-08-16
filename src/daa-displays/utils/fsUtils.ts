import * as fs from 'fs';
import * as path from 'path';

export function getBandsFileName (desc: { daaConfig: string, scenarioName: string }) {
    if (desc) {
        return `${getFilename(desc.daaConfig, { removeFileExtension: true })}-${getFilename(desc.scenarioName, { removeFileExtension: true })}.bands.json`;
    }
    return null;
}

export function getLoSFileName (desc: { daaConfig: string, scenarioName: string }) {
    if (desc) {
        return `${getFilename(desc.daaConfig, { removeFileExtension: true })}-${getFilename(desc.scenarioName, { removeFileExtension: true })}.LoS.json`;
    }
    return null;
}

export function getVirtualPilotFileName (desc: { daaConfig: string, scenarioName: string }) {
    if (desc) {
        return `${getFilename(desc.scenarioName, { removeFileExtension: true })}.ViP.daa`;
    }
    return null;
}

export async function stat(file: string): Promise<fs.Stats> {
	return new Promise<fs.Stats>((resolve, reject) => {
		fs.stat(file, (error, stat) => {
			// ignore errors for now
			resolve(stat);
		});
	});
};

export async function readDir(pvsContextFolder: string): Promise<string[]> {
	return new Promise<string[]>((resolve, reject) => {
		fs.readdir(pvsContextFolder, (error, children) => {
			// ignore errors for now
			resolve(children || []);
		});
	});
}

export async function readFile(path: string): Promise<string | null> {
	try {
		return await fs.readFileSync(path).toString('utf8');
	} catch (fileReadError) {
		console.error(fileReadError);
	}
	return null;
}
export async function writeFile(path: string, content: string): Promise<void> {
	return await fs.writeFileSync(path, content);
}

export async function fileExists(path: string): Promise<boolean> {
	return await fs.existsSync(path);
}

export function getFilename(fileName: string, opt?: { removeFileExtension?: boolean }): string {
	opt = opt || {};
	const pathlessFileName = fileName.includes("/") ? fileName.split("/").slice(-1)[0] : fileName;
	if (opt.removeFileExtension) {
		return pathlessFileName.split(".").slice(0, -1).join(".");
	}
	return pathlessFileName;
}
export function removeFileExtension(fileName: string): string {
	return fileName.split(".").slice(0, -1).join(".");
}
export function getFileExtension(fileName: string): string {
	return `.${fileName.split(".").slice(-1).join(".")}`;
}
export function getContextFolder(path: string): string {
	return path.split("/").slice(0, -1).join("/").replace("file://", "");
}
export function isPvsFile(fileName: string): boolean {
	return fileName.endsWith('.pvs') || fileName.endsWith('.tccs');
}
export function dirExists(path: string) {
	return fs.existsSync(path);
}
