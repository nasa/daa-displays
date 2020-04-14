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

// implementation based on DAABandsV2.java and DaidalusAlerting.cpp
// compilation command: c++ DAABandsV2.cpp -I../WellClear-2.0.e/DAIDALUS/C++/include ../WellClear-2.0.e/DAIDALUS/C++/lib/DAIDALUS2e.a -std=c++11
// execution command: ./a.out -conf ../../daa-config/2.x/AA_WC_2-Levels.conf ../../daa-scenarios/H1.daa

#include "Daidalus.h"
#include "WCV_tvar.h"
#include "DaidalusFileWalker.h"
#include <cstring>
#include <regex>

class DaidalusWrapperInterface {
	public:
	    virtual void adjustAlertingTime();
};

class DAAMonitorsV2 {

protected:

	larcfm::Daidalus* daa;

	static const int N_MONITORS = 4;
	int monitorColor[N_MONITORS] = { -1, -1, -1, -1 };

	// preferred resolutions
    double resolutionTrk;
    larcfm::BandsRegion::Region regionTrk;
    double resolutionGs;
    larcfm::BandsRegion::Region regionGs;
    double resolutionVs;
    larcfm::BandsRegion::Region regionVs;
    double resolutionAlt;
    larcfm::BandsRegion::Region regionAlt;

    // other resolutions
    double resolutionTrk_other;
    larcfm::BandsRegion::Region regionTrk_other;
    double resolutionGs_other;
    larcfm::BandsRegion::Region regionGs_other;
    double resolutionVs_other;
    larcfm::BandsRegion::Region regionVs_other;
    double resolutionAlt_other;
    larcfm::BandsRegion::Region regionAlt_other;

    // current regions
    larcfm::BandsRegion::Region currentRegionTrk;
    larcfm::BandsRegion::Region currentRegionGs;
    larcfm::BandsRegion::Region currentRegionVs;
    larcfm::BandsRegion::Region currentRegionAlt;

    static int bandsRegionToInt (larcfm::BandsRegion::Region b) {
        if (b == larcfm::BandsRegion::NONE) {
            return 0;
        }
        if (b == larcfm::BandsRegion::FAR) {
            return 1;
        }
        if (b == larcfm::BandsRegion::MID) {
            return 2;
        }
        if (b == larcfm::BandsRegion::NEAR) {
            return 3;
        }
        if (b == larcfm::BandsRegion::RECOVERY) {
            return 4;
        }
        return -1;
    }

    void computeResolutions () {
        bool preferredTrk = daa->preferredHorizontalDirectionRightOrLeft();
		resolutionTrk = daa->horizontalDirectionResolution(preferredTrk);
		regionTrk = daa->regionOfHorizontalDirection(resolutionTrk);
		resolutionTrk_other = daa->horizontalDirectionResolution(!preferredTrk);
		regionTrk_other = daa->regionOfHorizontalDirection(resolutionTrk_other);

		bool preferredGs = daa->preferredHorizontalSpeedUpOrDown();
		resolutionGs = daa->horizontalSpeedResolution(preferredGs);
		regionGs = daa->regionOfHorizontalSpeed(resolutionGs);
		resolutionGs_other = daa->horizontalSpeedResolution(!preferredGs);
		regionGs_other = daa->regionOfHorizontalSpeed(resolutionGs_other);

        bool preferredVs = daa->preferredVerticalSpeedUpOrDown();
		resolutionVs = daa->verticalSpeedResolution(preferredVs);
		regionVs = daa->regionOfVerticalSpeed(resolutionVs);
		resolutionVs_other = daa->verticalSpeedResolution(!preferredVs);
		regionVs_other = daa->regionOfVerticalSpeed(resolutionVs_other);

        bool preferredAlt = daa->preferredAltitudeUpOrDown();
		resolutionAlt = daa->altitudeResolution(preferredAlt);
		regionAlt = daa->regionOfAltitude(resolutionAlt);
        resolutionAlt_other = daa->altitudeResolution(!preferredAlt);
		regionAlt_other = daa->regionOfAltitude(resolutionAlt_other);
    }

    void computeCurrentRegions () {
        double heading = daa->getOwnshipState().horizontalDirection();
        currentRegionTrk = daa->regionOfHorizontalDirection(heading);
        std::cout << "heading: " << heading << " region: " << currentRegionTrk << std::endl;

        double hspeed = daa->getOwnshipState().horizontalSpeed();
        currentRegionGs = daa->regionOfHorizontalSpeed(hspeed);
        std::cout << "hspeed: " << hspeed << " region: " << currentRegionGs << std::endl;

        double vspeed = daa->getOwnshipState().verticalSpeed();
        currentRegionVs = daa->regionOfVerticalSpeed(vspeed);
        std::cout << "vspeed: " << vspeed << " region: " << currentRegionVs << std::endl;

        double alt = daa->getOwnshipState().altitude();
        currentRegionAlt = daa->regionOfAltitude(alt);
        std::cout << "alt: " << alt << " region: " << currentRegionAlt << std::endl;
    }

	static std::string color2string (int color) {
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
    int checkM1 (double resolution, larcfm::BandsRegion::Region region) const {
        if (std::isfinite(resolution)) {
            if (region == larcfm::BandsRegion::UNKNOWN) {
                return RED;
            } else if (region != larcfm::BandsRegion::NONE && region != larcfm::BandsRegion::RECOVERY) {
                return YELLOW;
            }
        }
        return GREEN;
    }
	std::string labelM1 () const {
        return "M1: Finite resolution ⇒ Region is NONE or RECOVERY";
    }
	std::string legendM1 () const {
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
    int checkM2_preferred (double resolution, larcfm::BandsRegion::Region region) const {
		std::cout << resolution << std::endl;
        if (region != larcfm::BandsRegion::RECOVERY) {
            bool exists_resolution_not_NaN = !std::isnan(resolutionTrk) || !std::isnan(resolutionGs) || !std::isnan(resolutionVs);// || !std::isnan(resolutionAlt); M2 does not apply to altitude
            if (std::isnan(resolution) && exists_resolution_not_NaN) {
                return YELLOW;
            }
        }
        return GREEN;
    }
    int checkM2_other (double resolution_, larcfm::BandsRegion::Region region) const {
		std::cout << resolution_ << std::endl;
        if (region != larcfm::BandsRegion::RECOVERY) {
            bool exists_resolution_not_NaN = !std::isnan(resolutionTrk_other) || !std::isnan(resolutionGs_other) || !std::isnan(resolutionVs_other);// || !std::isnan(resolutionAlt_other); M2 does not apply to altitude
            if (std::isnan(resolution_) && exists_resolution_not_NaN) {
                return YELLOW;
            }
        }
        return GREEN;
    }
	std::string labelM2 () const {
        return "M2: One resolution is NaN ⇒ All resolutions are NaN";
    }
	std::string legendM2 () const {
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
    int checkM3 (larcfm::BandsRegion::Region currentRegion) const {
        for (int ac = 1; ac <= daa->lastTrafficIndex(); ac++) {
            int alert = daa->alertLevel(ac);
            int threshold = larcfm::BandsRegion::orderOfConflictRegion(daa->getCorrectiveRegion());
            if (alert > threshold) {
                if (currentRegion == larcfm::BandsRegion::UNKNOWN) {
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
	std::string labelM3 () const {
        return "M3: Band(current value) ≥ Alert(traffic)";
    }
	std::string legendM3 () const {
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
    int checkM4Trk () const {
		bool none = false;
		bool recovery = false;
		for (int i = 0; i < daa->horizontalDirectionBandsLength(); i++) {
			larcfm::BandsRegion::Region b = daa->horizontalDirectionRegionAt(i);
            if (b == larcfm::BandsRegion::NONE) {
                none = true;
            } else if (b == larcfm::BandsRegion::RECOVERY) {
                recovery = true;
            }
		}
        return (none && recovery) ? YELLOW : GREEN;
    }
    int checkM4Hs () const {
		bool none = false;
		bool recovery = false;
		for (int i = 0; i < daa->horizontalSpeedBandsLength(); i++) {
			larcfm::BandsRegion::Region b = daa->horizontalSpeedRegionAt(i);
            if (b == larcfm::BandsRegion::NONE) {
                none = true;
            } else if (b == larcfm::BandsRegion::RECOVERY) {
                recovery = true;
            }
		}
        return (none && recovery) ? YELLOW : GREEN;
    }
    int checkM4Vs () const {
		bool none = false;
		bool recovery = false;
		for (int i = 0; i < daa->verticalSpeedBandsLength(); i++) {
			larcfm::BandsRegion::Region b = daa->verticalSpeedRegionAt(i);
            if (b == larcfm::BandsRegion::NONE) {
                none = true;
            } else if (b == larcfm::BandsRegion::RECOVERY) {
                recovery = true;
            }
		}
        return (none && recovery) ? YELLOW : GREEN;
    }
    int checkM4Alt () const {
		bool none = false;
		bool recovery = false;
		for (int i = 0; i < daa->altitudeBandsLength(); i++) {
			larcfm::BandsRegion::Region b = daa->altitudeRegionAt(i);
            if (b == larcfm::BandsRegion::NONE) {
                none = true;
            } else if (b == larcfm::BandsRegion::RECOVERY) {
                recovery = true;
            }
		}
        return (none && recovery) ? YELLOW : GREEN;
    }
	std::string labelM4 () const {
        return "M4: It is never the case that NONE and RECOVERY appear in the same list of bands";
    }
	std::string legendM4 () const {
        std::string green_desc = "Valid region colors.";
        std::string yellow_desc = "Property failure: NONE and RECOVERY appear in the same list of bands.";
        return std::string("{ ") 
                + "\"green\": \"" + green_desc + "\", \"yellow\": \"" + yellow_desc + "\""
                + " }";
    }

public:
	DAAMonitorsV2 (larcfm::Daidalus* daa = NULL) : daa(daa) { }

    static const int GREEN = 0;
    static const int YELLOW = 1;
    static const int RED = 2;

	int getSize () const {
		return N_MONITORS;
	}

	void check () {
        computeResolutions();
        computeCurrentRegions();
	}

	std::string getLabel (int monitorID) const {
		if (monitorID <= N_MONITORS && monitorID > 0) {
            if (monitorID == 1) { return labelM1(); }
            if (monitorID == 2) { return labelM2(); }
            if (monitorID == 3) { return labelM3(); }
            if (monitorID == 4) { return labelM4(); }
        }
        return "unknown";
	}

	std::string getColor (int monitorID) const { // monitor ID starts from 1
        int index = monitorID - 1;
        if (index < N_MONITORS) {
            return color2string(monitorColor[index]);
        }
        return color2string(-1);
    }

	std::string getLegend (int monitorID) const {
        if (monitorID <= N_MONITORS && monitorID > 0) {
            if (monitorID == 1) { return legendM1(); }
            if (monitorID == 2) { return legendM2(); }
            if (monitorID == 3) { return legendM3(); }
			if (monitorID == 4) { return legendM4(); }
        }
        return "unknown";
    }

	std::string m1 () {
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

    std::string m2 () {
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

	std::string m3 () {
		int monitorIndex = 2;
        int hb = checkM3(currentRegionTrk);
        int hsb = checkM3(currentRegionGs);
        int vsb = checkM3(currentRegionVs);
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

	std::string m4 () {
		int monitorIndex = 3;
        int hb = checkM4Trk();
        int hsb = checkM4Hs();
        int vsb = checkM4Vs();
        int ab = checkM4Alt();

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

	// NB: You need to update the following items when adding new monitors: N_MONITORS, monitorColor, getLegend and getLabel

};

class DAABandsV2 {

protected:
	std::string tool_name;
	std::string daa_config;
	std::string scenario;
	std::string ofname; // output file name
	std::string ifname; // input file name
	std::string wind; // wind information

	std::string printBool (bool b) { return b ? "true" : "false"; }
	std::string printDouble (double d) {
		if (std::isnan(d)) {
			return (std::to_string(d).compare("nan") == 0) ? "NaN" : "-NaN";
		} else if (std::isinf(d)) {
			return (std::to_string(d).compare("inf") == 0) ? "Infinity" : "-Infinity";
		}
		return std::to_string(d);
	}


public:
	larcfm::Daidalus daa;
	std::ofstream* printWriter;

	DAABandsV2 () {
		tool_name = "DAABandsV2";
		daa_config = "";
		scenario = "";
		ofname = "";
		ifname = "";
		wind = "";
	}

	std::string getScenario() const {
		return scenario;
	}
	std::string getConfigFileName() const {
		return daa_config;
	}
	std::string getDaaConfig () const {
		if (!daa_config.empty()) {
			int slash = daa_config.find_last_of("/");
			if (slash >= 0) {
				return daa_config.substr(slash + 1);
			}
		}
		return daa_config;
	}
	std::string getOutputFileName() const {
		return ofname;
	}
	std::string getInputFileName() const {
		return ifname;
	}

	void printHelpMsg() {
		std::cout << "Version: DAIDALUS " << getVersion() << std::endl;
		std::cout << "Generates a file that can be rendered in daa-displays" << std::endl;
		std::cout << "Usage:" << std::endl;
		std::cout << "  " << tool_name << " [options] file" << std::endl;
		std::cout << "Options:" << std::endl;
		std::cout << "  --help\n\tPrint this message" << std::endl;
		std::cout << "  --version\n\tPrint WellClear version" << std::endl;
		std::cout << "  --config <file.conf>\n\tLoad configuration <file.conf>" << std::endl;
		std::cout << "  --wind <wind_info>\n\tLoad wind vector information, a JSON object enclosed in double quotes \"{ deg: d, knot: m }\", where d and m are eals" << std::endl;
		std::cout << "  --output <file.json>\n\tOutput file <file.json>" << std::endl;
		std::cout << "  --list-monitors\nReturns the list of available monitors, in JSON format" << std::endl;
		exit(0);
	}

	std::string printMonitorList() {
		DAAMonitorsV2 monitors;
		int n = monitors.getSize();
		std::string res = "";
		for (int i = 0; i < n; i++) {
			res += "\"" + monitors.getLabel(i + 1) + "\"";
			if (i < n - 1) { res += ", "; }
		}
		return "[ " + res + " ]";
	}

	std::string region2str (const larcfm::BandsRegion::Region& r) const {
		switch (r) {
			case larcfm::BandsRegion::Region::NONE: return "0";
			case larcfm::BandsRegion::Region::FAR: return "1";
			case larcfm::BandsRegion::Region::MID: return "2";
			case larcfm::BandsRegion::Region::NEAR: return "3";
			case larcfm::BandsRegion::Region::RECOVERY: return "4";
			default: return "-1";
		}
	}

	void printArray (std::ofstream& out, std::vector<std::string>* info, const std::string& label) {
		out << "\"" << label << "\": [" << std::endl;
		for (int i = 0; i < (*info).size(); i++) {
			out << (*info)[i];
			if (i < (*info).size() - 1) {
				out << "," << std::endl;
			} else {
				out << "" << std::endl;
			}
		}
		out << "]" << std::endl;
	}

	void printMonitors (std::ofstream& out, const DAAMonitorsV2& monitors, std::vector<std::vector<std::string>*>* info) {
		out << " [" << std::endl;
		int len = monitors.getSize();
		for (int i = 0; i < len; i++) {
			int monitorID = i + 1;
			std::string legend = monitors.getLegend(monitorID);
			std::string color = monitors.getColor(monitorID);
			std::string label = monitors.getLabel(monitorID);
			out << "{ \"id\": \"" << monitorID << "\",\n";
			out << "\"name\": \"" << label << "\",\n";
			out << "\"color\": \"" << color << "\",\n";
			out << "\"legend\": " << legend << ",\n";
			printArray(out, (*info)[i], "results");
			if (i < len - 1) {
				out << "}, " << std::endl;
			} else {
				out << "} " << std::endl;
			}
		}
		out << "]" << std::endl;
	}

	bool loadDaaConfig () {
		if (daa_config.empty() == false) {
			bool paramLoaded = daa.loadFromFile(daa_config);
			if (paramLoaded) {
				std::cout << "** Configuration file " << daa_config << " loaded successfully!" << std::endl;
				return true;
			} else {
				std::cerr << "** Error: Configuration file " << daa_config << " could not be loaded. Using default WellClear configuration." << std::endl;
			}
		} else {
			std::cerr << "** Warning: Configuration file not specified. Using default WellClear configuration." << std::endl;
		}
		return false;
	}

	bool loadWind () {
		if (!wind.empty()) {
			std::cout << "Loading wind " << wind << std::endl;
			double deg = 0;
			double knot = 0;
			double fpm = 0;
			const std::regex re_deg(".*\\bdeg\\s*:\\s*(.*)");
			std::smatch match_deg;
			std::regex_match(wind, match_deg, re_deg);
			if (match_deg.size() == 2) {
				// std::cout << "match size: " << match_deg.size() << std::endl;
				deg = std::stod(match_deg[1].str());
				// std::cout << deg << std::endl;
			}
			
			const std::regex re_knot(".*\\bknot\\s*:\\s*(.*)");
			std::smatch match_knot;
			std::regex_match(wind, match_knot, re_knot);
			if (match_knot.size() == 2) {
				// std::cout << "match size: " << match_knot.size() << std::endl;
				knot = std::stod(match_knot[1].str());
				// std::cout << knot << std::endl;
			}
			larcfm::Velocity windVelocity = larcfm::Velocity::makeTrkGsVs(deg, "deg", knot, "knot", fpm, "fpm");
			daa.setWindVelocityFrom(windVelocity);
			return true;
		}
		return false;
	}

	std::string jsonHeader () const {
		const std::string ans = std::string("{ \"version\": ") + std::string("\"") + getVersion() 
								+ std::string("\", \"configuration\": ") + std::string("\"") + getDaaConfig() + std::string("\" }"); 
		return ans;
	}

	std::string jsonBands (
		DAAMonitorsV2& monitors,
		std::vector<std::string>* alertsArray, std::vector<std::string>* trkArray, std::vector<std::string>* gsArray, std::vector<std::string>* vsArray, std::vector<std::string>* altArray,
		std::vector<std::string>* resTrkArray, std::vector<std::string>* resGsArray, std::vector<std::string>* resVsArray, std::vector<std::string>* resAltArray,
		std::vector<std::string>* monitorM1Array, std::vector<std::string>* monitorM2Array, std::vector<std::string>* monitorM3Array, std::vector<std::string>* monitorM4Array
	) {
		std::string hs_units = daa.getUnitsOf("step_hs");
		std::string vs_units = daa.getUnitsOf("step_vs");
		std::string alt_units = daa.getUnitsOf("step_alt");
		std::string trk_units = daa.getUnitsOf("step_hdir");

		// load wind settings at each step -- wind is not persistent in DAIDALUS
		loadWind();

		// traffic alerts
		std::string time = larcfm::FmPrecision(daa.getCurrentTime());
		std::string alerts = "{ \"time\": " + time + ", \"alerts\": [ ";
		std::string tmp = "";
		for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) { // aircraft 0 is the ownship
			int alert = daa.alertLevel(ac);
			std::string ac_name = daa.getAircraftStateAt(ac).getId();
			if (tmp != "") { tmp += ", "; }
			tmp += "{ \"ac\": \"" + ac_name;
			tmp += std::string("\", \"alert\": \"") + std::to_string(alert);
			tmp += "\" }";
		}
		alerts += tmp;
		alerts += " ]}";
		alertsArray->push_back(alerts);

		// bands
		std::string trk = "{ \"time\": " + time;
		trk += ", \"bands\": [ ";
		for (int i = 0; i < daa.horizontalDirectionBandsLength(); i++) {
			trk += "{ \"range\": " + daa.horizontalDirectionIntervalAt(i, trk_units).toString();
			trk += ", \"units\": \"" + trk_units + "\"";
			trk += ", \"alert\": \"" + larcfm::BandsRegion::to_string(daa.horizontalDirectionRegionAt(i));
			trk += "\" }";
			if (i < daa.horizontalDirectionBandsLength() - 1) { trk += ", "; }
		}
		trk += " ]}";
		trkArray->push_back(trk);

		std::string gs = "{ \"time\": " + time;
		gs += ", \"bands\": [ ";
		for (int i = 0; i < daa.horizontalSpeedBandsLength(); i++) {
			gs += "{ \"range\": " + daa.horizontalSpeedIntervalAt(i, hs_units).toString();
			gs += ", \"units\": \"" + hs_units + "\"";
			gs += ", \"alert\": \"" + larcfm::BandsRegion::to_string(daa.horizontalSpeedRegionAt(i));
			gs += "\" }";
			if (i < daa.horizontalSpeedBandsLength() - 1) { gs += ", "; }
		}
		gs += " ]}";
		gsArray->push_back(gs);

		std::string vs = "{ \"time\": " + time;
		vs += ", \"bands\": [ ";
		for (int i = 0; i < daa.verticalSpeedBandsLength(); i++) {
			vs += "{ \"range\": " + daa.verticalSpeedIntervalAt(i, vs_units).toString();
			vs += ", \"units\": \"" + vs_units + "\"";
			vs += ", \"alert\": \"" + larcfm::BandsRegion::to_string(daa.verticalSpeedRegionAt(i));
			vs += "\" }";
			if (i < daa.verticalSpeedBandsLength() - 1) { vs += ", "; }
		}
		vs += " ]}";
		vsArray->push_back(vs);
		
		std::string alt = "{ \"time\": " + time;
		alt += ", \"bands\": [ ";
		for (int i = 0; i < daa.altitudeBandsLength(); i++) {
			alt += "{ \"range\": " + daa.altitudeIntervalAt(i, alt_units).toString();
			alt += ", \"units\": \"" + alt_units + "\"";
			alt += ", \"alert\": \"" + larcfm::BandsRegion::to_string(daa.altitudeRegionAt(i));
			alt += "\" }";
			if (i < daa.altitudeBandsLength() - 1) { alt += ", "; }
		}
		alt += " ]}";
		altArray->push_back(alt);

		// resolutions
		std::string trkResolution = "{ \"time\": " + time;
		bool preferredTrk = daa.preferredHorizontalDirectionRightOrLeft();
		double resTrk = daa.horizontalDirectionResolution(preferredTrk, trk_units);
		double resTrk_sec = daa.horizontalDirectionResolution(!preferredTrk, trk_units);
		double resTrkInternal = daa.horizontalDirectionResolution(preferredTrk);
		double resTrkInternal_sec = daa.horizontalDirectionResolution(!preferredTrk);
		larcfm::BandsRegion::Region resTrkRegion = daa.regionOfHorizontalDirection(resTrkInternal);
		larcfm::BandsRegion::Region resTrkRegion_sec = daa.regionOfHorizontalDirection(resTrkInternal_sec);
		larcfm::TrafficState ownship = daa.getOwnshipState();
		double currentTrk = ownship.horizontalDirection(trk_units);
		larcfm::BandsRegion::Region currentTrkRegion = daa.regionOfHorizontalDirection(ownship.horizontalDirection());
		trkResolution += ", \"resolution\": { \"val\": \"" + printDouble(resTrk) + "\", \"units\": \"" + trk_units + "\", \"alert\": \"" + larcfm::BandsRegion::to_string(resTrkRegion) + "\" }"; // resolution can be number, NaN or infinity
		trkResolution += ", \"resolution-secondary\": { \"val\": \"" + printDouble(resTrk_sec) + "\", \"units\": \"" + trk_units + "\", \"alert\": \"" + larcfm::BandsRegion::to_string(resTrkRegion_sec) + "\" }"; // resolution can be number, NaN or infinity
		trkResolution += ", \"flags\": { \"preferred-resolution\": \"" + printBool(preferredTrk) + "\" }";
		trkResolution += ", \"ownship\": { \"val\": \"" + printDouble(currentTrk) + "\", \"units\": \"" + trk_units + "\", \"alert\": \"" + larcfm::BandsRegion::to_string(currentTrkRegion) + "\" }";
		trkResolution += " }";
		resTrkArray->push_back(trkResolution);

		std::string gsResolution = "{ \"time\": " + time;
		bool preferredGs = daa.preferredHorizontalSpeedUpOrDown();
		double resGs = daa.horizontalSpeedResolution(preferredGs, hs_units);
		double resGs_sec = daa.horizontalSpeedResolution(!preferredGs, hs_units);
		double resGsInternal = daa.horizontalSpeedResolution(preferredGs);
		double resGsInternal_sec = daa.horizontalSpeedResolution(!preferredGs);
		larcfm::BandsRegion::Region resGsRegion = daa.regionOfHorizontalSpeed(resGsInternal);
		larcfm::BandsRegion::Region resGsRegion_sec = daa.regionOfHorizontalSpeed(resGsInternal_sec);
		double currentGs = ownship.horizontalSpeed(hs_units);
		larcfm::BandsRegion::Region currentGsRegion = daa.regionOfHorizontalSpeed(ownship.horizontalSpeed());
		gsResolution += ", \"resolution\": { \"val\": \"" + printDouble(resGs) + "\", \"units\": \"" + hs_units + "\", \"alert\": \"" + larcfm::BandsRegion::to_string(resGsRegion) + "\" }"; // resolution can be number, NaN or infinity
		gsResolution += ", \"resolution-secondary\": { \"val\": \"" + printDouble(resGs_sec) + "\", \"units\": \"" + hs_units + "\", \"alert\": \"" + larcfm::BandsRegion::to_string(resGsRegion_sec) + "\" }"; // resolution can be number, NaN or infinity
		gsResolution += ", \"flags\": { \"preferred-resolution\": \"" + printBool(preferredGs) + "\" }";
		gsResolution += ", \"ownship\": { \"val\": \"" + printDouble(currentGs) + "\", \"units\": \"" + hs_units + "\", \"alert\": \"" + larcfm::BandsRegion::to_string(currentGsRegion) + "\" }";
		gsResolution += " }";
		resGsArray->push_back(gsResolution);

		std::string vsResolution = "{ \"time\": " + time;
		bool preferredVs = daa.preferredVerticalSpeedUpOrDown();
		double resVs = daa.verticalSpeedResolution(preferredVs, vs_units);
		double resVs_sec = daa.verticalSpeedResolution(!preferredVs, vs_units);
		double resVsInternal = daa.verticalSpeedResolution(preferredVs);
		double resVsInternal_sec = daa.verticalSpeedResolution(!preferredVs);
		larcfm::BandsRegion::Region resVsRegion = daa.regionOfVerticalSpeed(resVsInternal);
		larcfm::BandsRegion::Region resVsRegion_sec = daa.regionOfVerticalSpeed(resVsInternal_sec);
		double currentVs = ownship.verticalSpeed(vs_units);
		larcfm::BandsRegion::Region currentVsRegion = daa.regionOfVerticalSpeed(ownship.verticalSpeed());
		vsResolution += ", \"resolution\": { \"val\": \"" + printDouble(resVs) + "\", \"units\": \"" + vs_units + "\", \"alert\": \"" + larcfm::BandsRegion::to_string(resVsRegion) + "\" }"; // resolution can be number, NaN or infinity
		vsResolution += ", \"resolution-secondary\": { \"val\": \"" + printDouble(resVs_sec) + "\", \"units\": \"" + vs_units + "\", \"alert\": \"" + larcfm::BandsRegion::to_string(resVsRegion_sec) + "\" }"; // resolution can be number, NaN or infinity
		vsResolution += ", \"flags\": { \"preferred-resolution\": \"" + printBool(preferredVs) + "\" }";
		vsResolution += ", \"ownship\": { \"val\": \"" + printDouble(currentVs) + "\", \"units\": \"" + vs_units + "\", \"alert\": \"" + larcfm::BandsRegion::to_string(currentVsRegion) + "\" }";
		vsResolution += " }";
		resVsArray->push_back(vsResolution);

		std::string altResolution = "{ \"time\": " + time;
		bool preferredAlt = daa.preferredAltitudeUpOrDown();
		double resAlt = daa.altitudeResolution(preferredAlt, alt_units);
		double resAlt_sec = daa.altitudeResolution(!preferredAlt);
		double resAltInternal = daa.altitudeResolution(preferredAlt);
		double resAltInternal_sec = daa.altitudeResolution(!preferredAlt);
		larcfm::BandsRegion::Region resAltRegion = daa.regionOfAltitude(resAltInternal);
		larcfm::BandsRegion::Region resAltRegion_sec = daa.regionOfAltitude(resAltInternal_sec);
		double currentAlt = ownship.altitude(alt_units);
		larcfm::BandsRegion::Region currentAltRegion = daa.regionOfAltitude(ownship.altitude());
		altResolution += ", \"resolution\": { \"val\": \"" + printDouble(resAlt) + "\", \"units\": \"" + alt_units + "\", \"alert\": \"" + larcfm::BandsRegion::to_string(resAltRegion) + "\" }"; // resolution can be number, NaN or infinity
		altResolution += ", \"resolution-secondary\": { \"val\": \"" + printDouble(resAlt_sec) + "\", \"units\": \"" + alt_units + "\", \"alert\": \"" + larcfm::BandsRegion::to_string(resAltRegion_sec) + "\" }"; // resolution can be number, NaN or infinity
		altResolution += ", \"flags\": { \"preferred-resolution\": \"" + printBool(preferredAlt) + "\" }";
		altResolution += ", \"ownship\": { \"val\": \"" + printDouble(currentAlt) + "\", \"units\": \"" + alt_units + "\", \"alert\": \"" + larcfm::BandsRegion::to_string(currentAltRegion) + "\" }";
		altResolution += " }";
		resAltArray->push_back(altResolution);

		// monitors
		monitors.check();
		std::string monitorM1 = "{ \"time\": " + time
					+ ", " + monitors.m1()
					+ " }";
		monitorM1Array->push_back(monitorM1);

		std::string monitorM2 = "{ \"time\": " + time
					+ ", " + monitors.m2()
					+ " }";
		monitorM2Array->push_back(monitorM2);

		std::string monitorM3 = "{ \"time\": " + time
					+ ", " + monitors.m3()
					+ " }";
		monitorM3Array->push_back(monitorM3);

		std::string monitorM4 = "{ \"time\": " + time
					+ ", " + monitors.m4()
					+ " }";
		monitorM4Array->push_back(monitorM4);

		// config
		std::string stats = "\"hs\": { \"min\": " + std::to_string(daa.getMinHorizontalSpeed(hs_units))
					+ ", \"max\": " + std::to_string(daa.getMaxHorizontalSpeed(hs_units))
					+ ", \"units\": \"" + hs_units + "\" },\n"
					+ "\"vs\": { \"min\": " + std::to_string(daa.getMinVerticalSpeed(vs_units))
					+ ", \"max\": " + std::to_string(daa.getMaxVerticalSpeed(vs_units))
					+ ", \"units\": \"" + vs_units + "\" },\n"
					+ "\"alt\": { \"min\": " + std::to_string(daa.getMinAltitude(alt_units))
					+ ", \"max\": " + std::to_string(daa.getMaxAltitude(alt_units))
					+ ", \"units\": \"" + alt_units + "\" },\n"
					+ "\"MostSevereAlertLevel\": \"" + std::to_string(daa.mostSevereAlertLevel(1)) + "\"";
		return stats;
	}
	void walkFile (DaidalusWrapperInterface* wrapper) {
		if (ifname.empty()) {
			std::cerr << "** Error: Please specify a daa file" << std::endl;
			exit(1);
		}
		if (!inputFileReadable()) {
			std::cerr << "** Error: File " << getInputFileName() << " cannot be read" << std::endl;
			exit(1);
		}

		createPrintWriter();

		/* Create DaidalusFileWalker */
		larcfm::DaidalusFileWalker walker(ifname);
		// load wind settings
		loadWind();

		*printWriter << "{\n\"Info\": ";
		*printWriter << jsonHeader() << "," << std::endl;
		*printWriter << "\"Scenario\": \"" + scenario + "\"," << std::endl;
		*printWriter << "\"Wind\": { \"deg\": \"" << larcfm::Units::to("deg", daa.getWindVelocityFrom().compassAngle()) 
					 << "\", \"knot\": \"" << larcfm::Units::to("knot", daa.getWindVelocityFrom().gs()) 
					 << "\" }," << std::endl;

		std::vector<std::string>* trkArray = new std::vector<std::string>();
		std::vector<std::string>* gsArray = new std::vector<std::string>();
		std::vector<std::string>* vsArray = new std::vector<std::string>();
		std::vector<std::string>* altArray = new std::vector<std::string>();
		std::vector<std::string>* alertsArray = new std::vector<std::string>();

		std::vector<std::string>* resTrkArray = new std::vector<std::string>();
		std::vector<std::string>* resGsArray = new std::vector<std::string>();
		std::vector<std::string>* resVsArray = new std::vector<std::string>();
		std::vector<std::string>* resAltArray = new std::vector<std::string>();

		DAAMonitorsV2 monitors(&daa);

		std::vector<std::string>* monitorM1Array = new std::vector<std::string>();
		std::vector<std::string>* monitorM2Array = new std::vector<std::string>();
		std::vector<std::string>* monitorM3Array = new std::vector<std::string>();
		std::vector<std::string>* monitorM4Array = new std::vector<std::string>();

		std::string jsonStats = "";

		/* Processing the input file time step by time step and writing output file */
		while (!walker.atEnd()) {
			walker.readState(daa);
			if (wrapper != NULL) {
				wrapper->adjustAlertingTime();
			}
			jsonStats = jsonBands(
				monitors,
				alertsArray, 
				trkArray, gsArray, vsArray, altArray,
				resTrkArray, resGsArray, resVsArray, resAltArray,
				monitorM1Array, monitorM2Array, monitorM3Array, monitorM4Array
			);
		}

		*printWriter << jsonStats + "," << std::endl;

		printArray(*printWriter, alertsArray, "Alerts");
		*printWriter << ",\n";
		printArray(*printWriter, trkArray, "Heading Bands");
		*printWriter << ",\n";
		printArray(*printWriter, gsArray, "Horizontal Speed Bands");
		*printWriter << ",\n";
		printArray(*printWriter, vsArray, "Vertical Speed Bands");
		*printWriter << ",\n";
		printArray(*printWriter, altArray, "Altitude Bands");
		*printWriter << ",\n";
		printArray(*printWriter, resTrkArray, "Heading Resolution");
		*printWriter << ",\n";
		printArray(*printWriter, resGsArray, "Horizontal Speed Resolution");
		*printWriter << ",\n";
		printArray(*printWriter, resVsArray, "Vertical Speed Resolution");
		*printWriter << ",\n";
		printArray(*printWriter, resAltArray, "Altitude Resolution");
		*printWriter << ",\n";

		*printWriter << "\"Monitors\":\n";
		std::vector<std::vector<std::string>*>* info = new std::vector<std::vector<std::string>*>();
		info->push_back(monitorM1Array);
		info->push_back(monitorM2Array);
		info->push_back(monitorM3Array);
		info->push_back(monitorM4Array);
		printMonitors(*printWriter, monitors, info);

		*printWriter << "}\n";

		delete trkArray;
		delete vsArray;
		delete gsArray;
		delete altArray;
		delete resTrkArray;
		delete resVsArray;
		delete resGsArray;
		delete resAltArray;
		delete alertsArray;
		delete info;

		closePrintWriter();
	}

	std::string getFileName (std::string fname) const {
		if (fname.find_last_of("/")) {
			std::string str(fname);
			int name_start = str.find_last_of("/");
			return fname.substr(name_start + 1);
		}
		return fname;
	}

	std::string removeExtension (std::string fname) const {
		if (fname.find_last_of(".")) {
			int dot = fname.find_last_of(".");
			if (dot > 0) {
				return fname.substr(0, dot).c_str();
			}
		}
		return fname;
	}

	std::string getVersion () const {
		return larcfm::DaidalusParameters::VERSION; //VERSION;
	}

	void parseCliArgs (char* const args[], int length) {
		// System.out.println(args.toString());
		if (args == NULL || length <= 1) {
			printHelpMsg();
			exit(0);
		}
		for (int a = 1; a < length; a++) {
			if (std::strcmp(args[a], "--help") == 0 || std::strcmp(args[a], "-help") == 0 || std::strcmp(args[a], "-h") == 0) {
				printHelpMsg();
				exit(0);
			} else if (larcfm::startsWith(args[a], "--list-monitors") || larcfm::startsWith(args[a], "-list-monitors")) {
				std::cout << printMonitorList() << std::endl;
				exit(0);
			} else if (larcfm::startsWith(args[a], "--version") || larcfm::startsWith(args[a], "-version")) {
				std::cout << getVersion() << std::endl;
				exit(0);
			} else if (a < length - 1 && (larcfm::startsWith(args[a], "--conf") || larcfm::startsWith(args[a], "-conf") || std::strcmp(args[a], "-c") == 0)) {
				daa_config = args[++a];
			} else if (a < length - 1 && (larcfm::startsWith(args[a], "--out") || larcfm::startsWith(args[a], "-out") || std::strcmp(args[a], "-o") == 0)) {
				ofname = args[++a];
			} else if (a < length - 1 && (larcfm::startsWith(args[a], "--wind") || larcfm::startsWith(args[a], "-wind"))) {
				wind = args[++a];
			} else if (larcfm::startsWith(args[a], "-")) {
				std::cerr << "** Error: Invalid option (" << args[a] << ")" << std::endl;
			} else {
				ifname = args[a];
			}
		}
		scenario = removeExtension(getFileName(ifname));
		if (ofname.empty()) {
			ofname = "./" + scenario + ".json";
		}
	}

	bool inputFileReadable () {
		std::string inputFile = getInputFileName();
		std::ifstream file(inputFile);
		return file.good();
	}

	bool createPrintWriter () {
		printWriter = new std::ofstream(ofname);
		std::cout << "Creating output file " << ofname << std::endl;
		return true;
	}
	bool closePrintWriter () {
		if (printWriter != NULL) {
			printWriter->close();
			delete printWriter;
			return true;
		}
		return false;
	}

};

int main(int argc, char* argv[]) {
	DAABandsV2 daaBands;
	daaBands.parseCliArgs(argv, argc);
	daaBands.loadDaaConfig();
	daaBands.walkFile(NULL);
}

