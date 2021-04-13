/**

   Notices:

   Copyright 2016 United States Government as represented by the
   Administrator of the National Aeronautics and Space Administration. No
   copyright is claimed in the United States under Title 17,
   U.S. Code. All Other Rights Reserved.

   Disclaimers

   No Warranty: THE SUBJECT SOFTWARE IS PROVIDED "AS IS" WITHOUT ANY
   WARRANTY OF ANY KIND, EITHER EXPRESSED, IMPLIED, OR STATUTORY,
   INCLUDING, BUT NOT LIMITED TO, ANY WARRANTY THAT THE SUBJECT SOFTWARE
   WILL CONFORM TO SPECIFICATIONS, ANY IMPLIED WARRANTIES OF
   MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR FREEDOM FROM
   INFRINGEMENT, ANY WARRANTY THAT THE SUBJECT SOFTWARE WILL BE ERROR
   FREE, OR ANY WARRANTY THAT DOCUMENTATION, IF PROVIDED, WILL CONFORM TO
   THE SUBJECT SOFTWARE. THIS AGREEMENT DOES NOT, IN ANY MANNER,
   CONSTITUTE AN ENDORSEMENT BY GOVERNMENT AGENCY OR ANY PRIOR RECIPIENT
   OF ANY RESULTS, RESULTING DESIGNS, HARDWARE, SOFTWARE PRODUCTS OR ANY
   OTHER APPLICATIONS RESULTING FROM USE OF THE SUBJECT SOFTWARE.
   FURTHER, GOVERNMENT AGENCY DISCLAIMS ALL WARRANTIES AND LIABILITIES
   REGARDING THIRD-PARTY SOFTWARE, IF PRESENT IN THE ORIGINAL SOFTWARE,
   AND DISTRIBUTES IT "AS IS."

   Waiver and Indemnity: RECIPIENT AGREES TO WAIVE ANY AND ALL CLAIMS
   AGAINST THE UNITED STATES GOVERNMENT, ITS CONTRACTORS AND
   SUBCONTRACTORS, AS WELL AS ANY PRIOR RECIPIENT.  IF RECIPIENT'S USE OF
   THE SUBJECT SOFTWARE RESULTS IN ANY LIABILITIES, DEMANDS, DAMAGES,
   EXPENSES OR LOSSES ARISING FROM SUCH USE, INCLUDING ANY DAMAGES FROM
   PRODUCTS BASED ON, OR RESULTING FROM, RECIPIENT'S USE OF THE SUBJECT
   SOFTWARE, RECIPIENT SHALL INDEMNIFY AND HOLD HARMLESS THE UNITED
   STATES GOVERNMENT, ITS CONTRACTORS AND SUBCONTRACTORS, AS WELL AS ANY
   PRIOR RECIPIENT, TO THE EXTENT PERMITTED BY LAW.  RECIPIENT'S SOLE
   REMEDY FOR ANY SUCH MATTER SHALL BE THE IMMEDIATE, UNILATERAL
   TERMINATION OF THIS AGREEMENT.
 **/

#include "DAAMonitorsV2.h"

using namespace larcfm;

DAAMonitorsV2::DAAMonitorsV2 () {
	for (int i=0;i<N_MONITORS;++i) {
		monitorColor[i] = -1;
	}

	resolutionTrk = NaN;
	regionTrk = BandsRegion::UNKNOWN;
	resolutionGs = NaN;
	regionGs = BandsRegion::UNKNOWN;
	resolutionVs = NaN;
	regionVs = BandsRegion::UNKNOWN;
	resolutionAlt = NaN;
	regionAlt = BandsRegion::UNKNOWN;

	resolutionTrk_other = NaN;
	regionTrk_other = BandsRegion::UNKNOWN;
	resolutionGs_other = NaN;
	regionGs_other = BandsRegion::UNKNOWN;
	resolutionVs_other = NaN;
	regionVs_other = BandsRegion::UNKNOWN;
	resolutionAlt_other = NaN;
	regionAlt_other = BandsRegion::UNKNOWN;

	currentRegionTrk = BandsRegion::UNKNOWN;
	currentRegionGs = BandsRegion::UNKNOWN;
	currentRegionVs = BandsRegion::UNKNOWN;
	currentRegionAlt = BandsRegion::UNKNOWN;

}

// NB: You need to update the following items when adding new monitors: N_MONITORS, monitorColor, getLegend and getLabel

int DAAMonitorsV2::bandsRegionToInt (BandsRegion::Region b) {
	if (b == BandsRegion::NONE) {
		return 0;
	}
	if (b == BandsRegion::FAR) {
		return 1;
	}
	if (b == BandsRegion::MID) {
		return 2;
	}
	if (b == BandsRegion::NEAR) {
		return 3;
	}
	if (b == BandsRegion::RECOVERY) {
		return 4;
	}
	return -1;
}

void DAAMonitorsV2::computeResolutions (Daidalus& daa) {
	bool preferredTrk = daa.preferredHorizontalDirectionRightOrLeft();
	resolutionTrk = daa.horizontalDirectionResolution(preferredTrk);
	regionTrk = daa.regionOfHorizontalDirection(resolutionTrk);
	resolutionTrk_other = daa.horizontalDirectionResolution(!preferredTrk);
	regionTrk_other = daa.regionOfHorizontalDirection(resolutionTrk_other);

	bool preferredGs = daa.preferredHorizontalSpeedUpOrDown();
	resolutionGs = daa.horizontalSpeedResolution(preferredGs);
	regionGs = daa.regionOfHorizontalSpeed(resolutionGs);
	resolutionGs_other = daa.horizontalSpeedResolution(!preferredGs);
	regionGs_other = daa.regionOfHorizontalSpeed(resolutionGs_other);

	bool preferredVs = daa.preferredVerticalSpeedUpOrDown();
	resolutionVs = daa.verticalSpeedResolution(preferredVs);
	regionVs = daa.regionOfVerticalSpeed(resolutionVs);
	resolutionVs_other = daa.verticalSpeedResolution(!preferredVs);
	regionVs_other = daa.regionOfVerticalSpeed(resolutionVs_other);

	bool preferredAlt = daa.preferredAltitudeUpOrDown();
	resolutionAlt = daa.altitudeResolution(preferredAlt);
	regionAlt = daa.regionOfAltitude(resolutionAlt);
	resolutionAlt_other = daa.altitudeResolution(!preferredAlt);
	regionAlt_other = daa.regionOfAltitude(resolutionAlt_other);
}

void DAAMonitorsV2::computeCurrentRegions (Daidalus& daa) {
	double heading = daa.getOwnshipState().horizontalDirection();
	currentRegionTrk = daa.regionOfHorizontalDirection(heading);
	std::cout << "heading: " << heading << " region: " << currentRegionTrk << std::endl;

	double hspeed = daa.getOwnshipState().horizontalSpeed();
	currentRegionGs = daa.regionOfHorizontalSpeed(hspeed);
	std::cout << "hspeed: " << hspeed << " region: " << currentRegionGs << std::endl;

	double vspeed = daa.getOwnshipState().verticalSpeed();
	currentRegionVs = daa.regionOfVerticalSpeed(vspeed);
	std::cout << "vspeed: " << vspeed << " region: " << currentRegionVs << std::endl;

	double alt = daa.getOwnshipState().altitude();
	currentRegionAlt = daa.regionOfAltitude(alt);
	std::cout << "alt: " << alt << " region: " << currentRegionAlt << std::endl;
}

std::string DAAMonitorsV2::color2string (int color) {
	switch (color) {
	case GREEN: return "green";
	case YELLOW: return "yellow";
	case RED: return "red";
	default: return "grey";
	}
}

/**
 * Monitor 1: valid finite resolutions
 * - Resolution is finite and region is not NONE nor RECOVERY (yellow monitor).
 * - Resolution is finite and region is UNKNOWN (red monitor).
 */
int DAAMonitorsV2::checkM1 (double resolution, BandsRegion::Region region) const {
	if (std::isfinite(resolution)) {
		if (region == BandsRegion::UNKNOWN) {
			return RED;
		} else if (region != BandsRegion::NONE && region != BandsRegion::RECOVERY) {
			return YELLOW;
		}
	}
	return GREEN;
}

std::string DAAMonitorsV2::labelM1 () {
	return "M1: Finite resolution ⇒ Region is NONE or RECOVERY";
}

std::string DAAMonitorsV2::legendM1 () {
	std::string green_desc = "Valid finite resolution.";
	std::string yellow_desc = "Property failure: resolution is finite and region is not NONE nor RECOVERY.";
	std::string red_desc = "Property failure: resolution is finite and region is UNKNOWN.";
	return std::string("{ ")
	+ "\"green\": \"" + green_desc + "\", \"yellow\": \"" + yellow_desc + "\", \"red\": \"" + red_desc + "\""
	+ " }";
}

/**
 * Monitor 2: consistent resolutions
 * - If region is not RECOVERY and any resolution is NaN and other resolutions are not NaN (yellow monitor).
 */
int DAAMonitorsV2::checkM2_preferred (double resolution, BandsRegion::Region region) const {
	std::cout << resolution << std::endl;
	if (region != BandsRegion::RECOVERY) {
		bool exists_resolution_not_NaN = !std::isnan(resolutionTrk) || !std::isnan(resolutionGs) || !std::isnan(resolutionVs);// || !std::isnan(resolutionAlt); M2 does not apply to altitude
		if (std::isnan(resolution) && exists_resolution_not_NaN) {
			return YELLOW;
		}
	}
	return GREEN;
}

int DAAMonitorsV2::checkM2_other (double resolution_, BandsRegion::Region region) const {
	std::cout << resolution_ << std::endl;
	if (region != BandsRegion::RECOVERY) {
		bool exists_resolution_not_NaN = !std::isnan(resolutionTrk_other) || !std::isnan(resolutionGs_other) || !std::isnan(resolutionVs_other);// || !std::isnan(resolutionAlt_other); M2 does not apply to altitude
		if (std::isnan(resolution_) && exists_resolution_not_NaN) {
			return YELLOW;
		}
	}
	return GREEN;
}

std::string DAAMonitorsV2::labelM2 () {
	return "M2: One resolution is NaN ⇒ All resolutions are NaN";
}

std::string DAAMonitorsV2::legendM2 () {
	std::string green_desc = "Consistent resolutions.";
	std::string yellow_desc = "Property failure: one resolution is NaN and other resolutions are not NaN and region of current value is not RECOVERY.";
	return std::string("{ ")
	+ "\"green\": \"" + green_desc + "\", \"yellow\": \"" + yellow_desc + "\""
	+ " }";
}

/**
 * Monitor 3: Valid non-zero alerts
 * - Traffic aircraft has a non-zero alert and the region of the current value (heading, speed) is lower than the traffic alert (yellow monitor)
 * - Traffic aircraft has a non-zero alert and the region of the current value (heading, speed) is UNKNOWN (red monitor)
 *   Color order is NONE < FAR < MID < NEAR < RECOVERY.
 */
int DAAMonitorsV2::checkM3 (Daidalus& daa, BandsRegion::Region currentRegion) const {
	for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
		int alert = daa.alertLevel(ac);
		int threshold = BandsRegion::orderOfConflictRegion(daa.getCorrectiveRegion());
		if (alert > threshold) {
			if (currentRegion == BandsRegion::UNKNOWN) {
				return RED;
			} else {
				int level = bandsRegionToInt(currentRegion);
				if (level < alert) {
					std::cout << "current region: " << level << " " << currentRegion << " alert: " << alert << std::endl;
					return YELLOW;
				}
			}
		}
	}
	return GREEN;
}

std::string DAAMonitorsV2::labelM3 () {
	return "M3: Band(current value) ≥ Alert(traffic)";
}

std::string DAAMonitorsV2::legendM3 () {
	std::string green_desc = "Valid non-zero alerts.";
	std::string yellow_desc = "Property failure: traffic aircraft has a non-zero alert and the region of the current value (heading, speed) is lower than the traffic alert.";
	std::string red_desc = "Property failure: traffic aircraft has a non-zero alert and the region of the current value (heading, speed) is UNKNOWN.";
	return std::string("{ ")
	+ "\"green\": \"" + green_desc + "\", \"yellow\": \"" + yellow_desc + "\", \"red\": \"" + red_desc + "\""
	+ " }";
}

/**
 * Monitor 4: NONE and RECOVERY
 * NONE and RECOVERY appear in the same list of bands (yellow monitor)
 */
int DAAMonitorsV2::checkM4Trk (Daidalus& daa) const {
	bool none = false;
	bool recovery = false;
	for (int i = 0; i < daa.horizontalDirectionBandsLength(); i++) {
		BandsRegion::Region b = daa.horizontalDirectionRegionAt(i);
		if (b == BandsRegion::NONE) {
			none = true;
		} else if (b == BandsRegion::RECOVERY) {
			recovery = true;
		}
	}
	return (none && recovery) ? YELLOW : GREEN;
}

int DAAMonitorsV2::checkM4Hs (Daidalus& daa) const {
	bool none = false;
	bool recovery = false;
	for (int i = 0; i < daa.horizontalSpeedBandsLength(); i++) {
		BandsRegion::Region b = daa.horizontalSpeedRegionAt(i);
		if (b == BandsRegion::NONE) {
			none = true;
		} else if (b == BandsRegion::RECOVERY) {
			recovery = true;
		}
	}
	return (none && recovery) ? YELLOW : GREEN;
}

int DAAMonitorsV2::checkM4Vs (Daidalus& daa) const {
	bool none = false;
	bool recovery = false;
	for (int i = 0; i < daa.verticalSpeedBandsLength(); i++) {
		BandsRegion::Region b = daa.verticalSpeedRegionAt(i);
		if (b == BandsRegion::NONE) {
			none = true;
		} else if (b == BandsRegion::RECOVERY) {
			recovery = true;
		}
	}
	return (none && recovery) ? YELLOW : GREEN;
}
int DAAMonitorsV2::checkM4Alt (Daidalus& daa) const {
	bool none = false;
	bool recovery = false;
	for (int i = 0; i < daa.altitudeBandsLength(); i++) {
		BandsRegion::Region b = daa.altitudeRegionAt(i);
		if (b == BandsRegion::NONE) {
			none = true;
		} else if (b == BandsRegion::RECOVERY) {
			recovery = true;
		}
	}
	return (none && recovery) ? YELLOW : GREEN;
}

std::string DAAMonitorsV2::labelM4 () {
	return "M4: It is never the case that NONE and RECOVERY appear in the same list of bands";
}

std::string DAAMonitorsV2::legendM4 () {
	std::string green_desc = "Valid region colors.";
	std::string yellow_desc = "Property failure: NONE and RECOVERY appear in the same list of bands.";
	return std::string("{ ")
	+ "\"green\": \"" + green_desc + "\", \"yellow\": \"" + yellow_desc + "\""
	+ " }";
}

int DAAMonitorsV2::getSize () {
	return N_MONITORS;
}

void  DAAMonitorsV2::check (Daidalus& daa) {
	computeResolutions(daa);
	computeCurrentRegions(daa);
}

std::string DAAMonitorsV2::getLabel (int monitorID) {
	if (monitorID <= N_MONITORS && monitorID > 0) {
		if (monitorID == 1) { return labelM1(); }
		if (monitorID == 2) { return labelM2(); }
		if (monitorID == 3) { return labelM3(); }
		if (monitorID == 4) { return labelM4(); }
	}
	return "unknown";
}

std::string DAAMonitorsV2::getColor (int monitorID) const { // monitor ID starts from 1
	int index = monitorID - 1;
	if (index < N_MONITORS) {
		return color2string(monitorColor[index]);
	}
	return color2string(-1);
}

std::string DAAMonitorsV2::getLegend (int monitorID) {
	if (monitorID <= N_MONITORS && monitorID > 0) {
		if (monitorID == 1) { return legendM1(); }
		if (monitorID == 2) { return legendM2(); }
		if (monitorID == 3) { return legendM3(); }
		if (monitorID == 4) { return legendM4(); }
	}
	return "unknown";
}

std::string DAAMonitorsV2::m1 () {
	int monitorIndex = 0;
	int hr = checkM1(resolutionTrk, regionTrk);
	int hsr = checkM1(resolutionGs, regionGs);
	int vsr = checkM1(resolutionVs, regionVs);
	int ar = checkM1(resolutionAlt, regionAlt);

	int hr_other = checkM1(resolutionTrk_other, regionTrk_other);
	int hsr_other = checkM1(resolutionGs_other, regionGs_other);
	int vsr_other = checkM1(resolutionVs_other, regionVs_other);
	int ar_other = checkM1(resolutionAlt_other, regionAlt_other);

	int max_color = std::max(hr, std::max(hsr, std::max(vsr, std::max(ar, std::max(hr_other, std::max(hsr_other, std::max(vsr_other, ar_other)))))));
	if (monitorColor[monitorIndex] < max_color) { monitorColor[monitorIndex] = max_color; }

	return std::string("\"color\": ") + "\"" + color2string(max_color) + "\""
			+ ", \"details\":"
			+ " {"
			+ " \"Heading\": " + "\"" + color2string(std::max(hr, hr_other)) + "\""
			+ ", \"Horizontal Speed\": " + "\"" + color2string(std::max(hsr, hsr_other)) + "\""
			+ ", \"Vertical Speed\": " + "\"" + color2string(std::max(vsr, vsr)) + "\""
			+ ", \"Altitude\": " + "\"" + color2string(std::max(ar, ar_other)) + "\""
			+ " }";
}

std::string DAAMonitorsV2::m2 () {
	int monitorIndex = 1;
	int hr = checkM2_preferred(resolutionTrk, currentRegionTrk);
	int hsr = checkM2_preferred(resolutionGs, currentRegionGs);
	int vsr = checkM2_preferred(resolutionVs, currentRegionVs);
	int ar = GREEN; //checkM2_preferred(resolutionAlt, currentRegionAlt); M2 does not apply to altitude

	int hr_other = checkM2_other(resolutionTrk_other, currentRegionTrk);
	int hsr_other = checkM2_other(resolutionGs_other, currentRegionGs);
	int vsr_other = checkM2_other(resolutionVs_other, currentRegionVs);
	int ar_other = GREEN; //checkM2_other(resolutionAlt_other, currentRegionAlt); M2 does not apply to altitude

	int max_color = std::max(hr, std::max(hsr, std::max(vsr, std::max(ar, std::max(hr_other, std::max(hsr_other, std::max(vsr_other, ar_other)))))));
	if (monitorColor[monitorIndex] < max_color) { monitorColor[monitorIndex] = max_color; }

	return std::string("\"color\": ") + "\"" + color2string(max_color) + "\""
			+ ", \"details\":"
			+ " {"
			+ " \"Heading\": " + "\"" + color2string(std::max(hr, hr_other)) + "\""
			+ ", \"Horizontal Speed\": " + "\"" + color2string(std::max(hsr, hsr_other)) + "\""
			+ ", \"Vertical Speed\": " + "\"" + color2string(std::max(vsr, vsr_other)) + "\""
			+ ", \"Altitude\": " + "\"" + color2string(std::max(ar, ar_other)) + "\""
			+ " }";
}

std::string DAAMonitorsV2::m3 (Daidalus& daa) {
	int monitorIndex = 2;
	int hb = checkM3(daa,currentRegionTrk);
	int hsb = checkM3(daa,currentRegionGs);
	int vsb = checkM3(daa,currentRegionVs);
	int ab = GREEN; //checkM3(currentRegionAlt); M3 does not apply to altitude

	int max_color = std::max(hb, std::max(hsb, std::max(vsb, ab)));
	if (monitorColor[monitorIndex] < max_color) { monitorColor[monitorIndex] = max_color; }

	return std::string("\"color\": ") + "\"" + color2string(max_color) + "\""
			+ ", \"details\":"
			+ " {"
			+ " \"Heading\": " + "\"" + color2string(hb) + "\""
			+ ", \"Horizontal Speed\": " + "\"" + color2string(hsb) + "\""
			+ ", \"Vertical Speed\": " + "\"" + color2string(vsb) + "\""
			+ ", \"Altitude\": " + "\"" + color2string(ab) + "\""
			+ " }";
}

std::string DAAMonitorsV2::m4 (Daidalus& daa) {
	int monitorIndex = 3;
	int hb = checkM4Trk(daa);
	int hsb = checkM4Hs(daa);
	int vsb = checkM4Vs(daa);
	int ab = checkM4Alt(daa);

	int max_color = std::max(hb, std::max(hsb, std::max(vsb, ab)));
	if (monitorColor[monitorIndex] < max_color) { monitorColor[monitorIndex] = max_color; }

	return std::string("\"color\": ") + "\"" + color2string(max_color) + "\""
			+ ", \"details\":"
			+ " {"
			+ " \"Heading\": " + "\"" + color2string(hb) + "\""
			+ ", \"Horizontal Speed\": " + "\"" + color2string(hsb) + "\""
			+ ", \"Vertical Speed\": " + "\"" + color2string(vsb) + "\""
			+ ", \"Altitude\": " + "\"" + color2string(ab) + "\""
			+ " }";
}
