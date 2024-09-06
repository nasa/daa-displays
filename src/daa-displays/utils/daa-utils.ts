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

import { severity } from "../daa-utils";
import { Alert, AlertRegion, DaaBands } from "./daa-types";

/**
 * Returns a unique id
 */
 export function uuid (format?: string) {
	let d: number = new Date().getTime();
	format = format || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
	const uuid = format.replace(/[xy]/g, (c: string) => { //lgtm [js/insecure-randomness]
		const r: number = ((d + Math.random() * 16) % 16) | 0;
		d = Math.floor(d / 16);
		return (c === 'x' ? r : (r & 0x7 | 0x8)).toString(16);
	});
	return uuid;
}

/**
 * Colors
 * NOTE: worldwind uses values between 0..1, instead of 0..255
 */
export const COLORS: { [name: string]: [ 
	number, number, number, number // rgba
]} = {
	// shades of purple
	levender:    [ 230/255, 230/255, 250/255, 1 ],
	violet:      [ 238/255, 130/255, 238/255, 1 ],
	fuchsia:     [ 1,       0,       1,       1 ],
	magenta:     [ 1,       0,       1,       1 ],
	blueviolet:  [ 138/255, 43/255,  226/255, 1 ],
	darkviolet:  [ 148/255, 0,       211/255, 1 ],
	darkorchid:  [ 153/255, 50/255,  204/255, 1 ],
	darkmagenta: [ 139/255, 0,       139/255, 1 ],
	purple:      [ 128/255, 0,       128/255, 1 ],
	indigo:      [ 75/255,  0,       130/255, 1 ]
};

/**
 * Utility function, returns the IDs (tail numbers) of the aicraft whose alert >= minThreshold and <= maxThreshold
 * If we want to select a specific threshold, we can either have minThreshold === maxThreshold or use option alertLevel
 * The default threshold is AlertLevel.ALERT
 */
export function getAlertingAircraftMap (bands: DaaBands, opt?: { 
	minThreshold?: AlertRegion, maxThreshold?: AlertRegion
} | { alertRegion?: AlertRegion }): { [ac: string]: AlertRegion } {
	if (bands?.Alerts?.alerts?.length) {
		opt = opt || {};
		const min: AlertRegion = opt["alertRegion"] || opt["minThreshold"] || "NEAR";
		const max: AlertRegion = opt["alertRegion"] || opt["maxThreshold"] || "NEAR";
		const alerts: Alert[] = bands.Alerts.alerts.filter(alert => {
			return severity(alert.alert_region) >= severity(min) && severity(alert.alert_region) <= severity(max);
		}) || [];
		if (alerts?.length) {
			const alerting: { [ac: string]: AlertRegion } = {};
			for (let i = 0; i < alerts.length; i++) {
				alerting[alerts[i].ac] = alerts[i].alert_region;
			}
			return alerting;
		}
	}
	return {};
}