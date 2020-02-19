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

class DaidalusWrapperInterface {
	public:
	    virtual void adjustAlertingTime();
};

class DAAMonitorsV2 {

protected:

	larcfm::Daidalus* daa;

	static const int N_MONITORS = 3;
	int monitorColor[N_MONITORS] = { -1, -1, -1 };

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
    double resolutionTrk_;
    larcfm::BandsRegion::Region regionTrk_;
    double resolutionGs_;
    larcfm::BandsRegion::Region regionGs_;
    double resolutionVs_;
    larcfm::BandsRegion::Region regionVs_;
    double resolutionAlt_;
    larcfm::BandsRegion::Region regionAlt_;

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
		resolutionTrk_ = daa->horizontalDirectionResolution(!preferredTrk);
		regionTrk_ = daa->regionOfHorizontalDirection(resolutionTrk_);

		bool preferredGs = daa->preferredHorizontalSpeedUpOrDown();
		resolutionGs = daa->horizontalSpeedResolution(preferredGs);
		regionGs = daa->regionOfHorizontalSpeed(resolutionGs);
		resolutionGs_ = daa->horizontalSpeedResolution(!preferredGs);
		regionGs_ = daa->regionOfHorizontalSpeed(resolutionGs_);

        bool preferredVs = daa->preferredVerticalSpeedUpOrDown();
		resolutionVs = daa->verticalSpeedResolution(preferredVs);
		regionVs = daa->regionOfVerticalSpeed(resolutionVs);
		resolutionVs_ = daa->verticalSpeedResolution(!preferredVs);
		regionVs_ = daa->regionOfVerticalSpeed(resolutionVs_);

        bool preferredAlt = daa->preferredAltitudeUpOrDown();
		resolutionAlt = daa->altitudeResolution(preferredAlt);
		regionAlt = daa->regionOfAltitude(resolutionAlt);
        resolutionAlt_ = daa->altitudeResolution(!preferredAlt);
		regionAlt_ = daa->regionOfAltitude(resolutionAlt_);
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
            bool exists_resolution_not_NaN = !std::isnan(resolutionTrk) || !std::isnan(resolutionGs) || !std::isnan(resolutionVs) || !std::isnan(resolutionAlt);
            if (std::isnan(resolution) && exists_resolution_not_NaN) {
                return YELLOW;
            }
        }
        return GREEN;
    }
    int checkM2_other (double resolution_, larcfm::BandsRegion::Region region) const {
		std::cout << resolution_ << std::endl;
        if (region != larcfm::BandsRegion::RECOVERY) {
            bool exists_resolution_not_NaN = !std::isnan(resolutionTrk_) || !std::isnan(resolutionGs_) || !std::isnan(resolutionVs_) || !std::isnan(resolutionAlt_);
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

	static std::string color2string (int color) {
        switch (color) {
            case GREEN: return "green";
            case YELLOW: return "yellow";
            case RED: return "red";
            default: return "grey";
        }
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
        }
        return "\"unknown\"";
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
        }
        return "\"unknown\"";
    }

	std::string m1 () {
        int hr = checkM1(resolutionTrk, regionTrk);
        int hsr = checkM1(resolutionGs, regionGs);
        int vsr = checkM1(resolutionVs, regionVs);
        int ar = checkM1(resolutionAlt, regionAlt);

        int hr_ = checkM1(resolutionTrk_, regionTrk_);
        int hsr_ = checkM1(resolutionGs_, regionGs_);
        int vsr_ = checkM1(resolutionVs_, regionVs_);
        int ar_ = checkM1(resolutionAlt_, regionAlt_);

        int max_color = std::max(hr, std::max(hsr, std::max(vsr, std::max(ar, std::max(hr_, std::max(hsr_, std::max(vsr_, ar_)))))));
        if (monitorColor[0] < max_color) { monitorColor[0] = max_color; }

        return std::string("\"color\": ") + "\"" + color2string(max_color) + "\""
            + ", \"details\":" 
            + " {"
            + " \"Heading\": " + "{ \"preferred\": \"" + color2string(hr) + "\", \"other\": \"" + color2string(hr_) + "\" }"
            + ", \"Horizontal Speed\": " + "{ \"preferred\": \"" + color2string(hsr) + "\", \"other\": \"" + color2string(hsr_) + "\" }"
            + ", \"Vertical Speed\": " + "{ \"preferred\": \"" + color2string(vsr) + "\", \"other\": \"" + color2string(vsr_) + "\" }"
            + ", \"Altitude\": " + "{ \"preferred\": \"" + color2string(ar) + "\", \"other\": \"" + color2string(ar_) + "\" }"
            + " }";
    }

    std::string m2 () {
        int hr = checkM2_preferred(resolutionTrk, currentRegionTrk);
        int hsr = checkM2_preferred(resolutionGs, currentRegionGs);
        int vsr = checkM2_preferred(resolutionVs, currentRegionVs);
        int ar = checkM2_preferred(resolutionAlt, currentRegionAlt);

        int hr_ = checkM2_other(resolutionTrk_, currentRegionTrk);
        int hsr_ = checkM2_other(resolutionGs_, currentRegionGs);
        int vsr_ = checkM2_other(resolutionVs_, currentRegionVs);
        int ar_ = checkM2_other(resolutionAlt_, currentRegionAlt);

        int max_color = std::max(hr, std::max(hsr, std::max(vsr, std::max(ar, std::max(hr_, std::max(hsr_, std::max(vsr_, ar_)))))));
        if (monitorColor[1] < max_color) { monitorColor[1] = max_color; }

        return std::string("\"color\": ") + "\"" + color2string(max_color) + "\""
            + ", \"details\":" 
            + " {"
            + " \"Heading\": " + "\"" + color2string(std::max(hr, hr_)) + "\""
            + ", \"Horizontal Speed\": " + "\"" + color2string(std::max(hsr, hsr_)) + "\""
            + ", \"Vertical Speed\": " + "\"" + color2string(std::max(vsr, vsr_)) + "\""
            + ", \"Altitude\": " + "\"" + color2string(std::max(ar, ar_)) + "\""
            + " }";
    }

	std::string m3 () {
        int hb = checkM3(currentRegionTrk);
        int hsb = checkM3(currentRegionGs);
        int vsb = checkM3(currentRegionVs);
        int ab = checkM3(currentRegionAlt);

        int max_color = std::max(hb, std::max(hsb, std::max(vsb, ab)));
        if (monitorColor[2] < max_color) { monitorColor[2] = max_color; }

        return std::string("\"color\": ") + "\"" + color2string(max_color) + "\""
            + ", \"details\":" 
            + " {"
            + " \"Heading\": " + "\"" + color2string(hb) + "\""
            + ", \"Horizontal Speed\": " + "\"" + color2string(hsb) + "\""
            + ", \"Vertical Speed\": " + "\"" + color2string(vsb) + "\""
            + ", \"Altitude\": " + "\"" + color2string(ab) + "\""
            + " }";
    }

};

class DAABandsV2 {

protected:
	std::string tool_name;
	std::string daa_config;
	std::string scenario;
	std::string ofname; // output file name
	std::string ifname; // input file name

public:
	larcfm::Daidalus daa;
	std::ofstream* printWriter;

	DAABandsV2 () {
		tool_name = "DAABandsV2";
		daa_config = "";
		scenario = "";
		ofname = "";
		ifname = "";
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
	
	std::string jsonHeader () const {
		const std::string ans = std::string("{ \"version\": ") + std::string("\"") + getVersion() 
								+ std::string("\", \"configuration\": ") + std::string("\"") + getDaaConfig() + std::string("\" }"); 
		return ans;
	}

	std::string jsonBands (
		larcfm::Daidalus& daa, DAAMonitorsV2& monitors,
		std::vector<std::string>* alertsArray, std::vector<std::string>* trkArray, std::vector<std::string>* gsArray, std::vector<std::string>* vsArray, std::vector<std::string>* altArray,
		std::vector<std::string>* resTrkArray, std::vector<std::string>* resGsArray, std::vector<std::string>* resVsArray, std::vector<std::string>* resAltArray,
		std::vector<std::string>* monitorM1Array, std::vector<std::string>* monitorM2Array, std::vector<std::string>* monitorM3Array
	) {
		std::string hs_units = daa.getUnitsOf("step_hs");
		std::string vs_units = daa.getUnitsOf("step_vs");
		std::string alt_units = daa.getUnitsOf("step_alt");
		std::string trk_units = daa.getUnitsOf("step_hdir");

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
		std::string resTrk = "{ \"time\": " + time;
		bool preferredTrk = daa.preferredHorizontalDirectionRightOrLeft();
		double valueTrk = daa.horizontalDirectionResolution(preferredTrk, trk_units);
		larcfm::BandsRegion::Region alertTrk = daa.regionOfHorizontalDirection(valueTrk, trk_units);
		resTrk += ", \"resolution\": { \"val\": \"" + std::to_string(valueTrk) + "\", \"units\": \"" + trk_units + "\", \"alert\": \"" + larcfm::BandsRegion::to_string(alertTrk) + "\" }"; // resolution can be number, NaN or infinity
		resTrk += " }";
		resTrkArray->push_back(resTrk);

		std::string resGs = "{ \"time\": " + time;
		bool preferredGs = daa.preferredHorizontalSpeedUpOrDown();
		double valueGs = daa.horizontalSpeedResolution(preferredGs, hs_units);
		larcfm::BandsRegion::Region alertGs = daa.regionOfHorizontalSpeed(valueGs, hs_units);
		resGs += ", \"resolution\": { \"val\": \"" + std::to_string(valueGs) + "\", \"units\": \"" + hs_units + "\", \"alert\": \"" + larcfm::BandsRegion::to_string(alertGs) + "\" }"; // resolution can be number, NaN or infinity
		resGs += " }";
		resGsArray->push_back(resGs);

		std::string resVs = "{ \"time\": " + time;
		bool preferredVs = daa.preferredVerticalSpeedUpOrDown();
		double valueVs = daa.verticalSpeedResolution(preferredVs, vs_units);
		larcfm::BandsRegion::Region alertVs = daa.regionOfVerticalSpeed(valueVs, vs_units);
		resVs += ", \"resolution\": { \"val\": \"" + std::to_string(valueVs) + "\", \"units\": \"" + vs_units + "\", \"alert\": \"" + larcfm::BandsRegion::to_string(alertVs) + "\" }"; // resolution can be number, NaN or infinity
		resVs += " }";
		resVsArray->push_back(resVs);

		std::string resAlt = "{ \"time\": " + time;
		bool preferredAlt = daa.preferredAltitudeUpOrDown();
		double valueAlt = daa.altitudeResolution(preferredAlt, alt_units);
		larcfm::BandsRegion::Region alertAlt = daa.regionOfAltitude(valueAlt, alt_units);
		resAlt += ", \"resolution\": { \"val\": \"" + std::to_string(valueAlt) + "\", \"units\": \"" + alt_units + "\", \"alert\": \"" + larcfm::BandsRegion::to_string(alertAlt) + "\" }"; // resolution can be number, NaN or infinity
		resAlt += " }";
		resAltArray->push_back(resAlt);

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
		createPrintWriter();

		/* Create DaidalusFileWalker */
		larcfm::DaidalusFileWalker walker(ifname);

		*printWriter << "{\n\"Info\": ";
		*printWriter << jsonHeader() << "," << std::endl;
		*printWriter << "\"Scenario\": \"" + scenario + "\",";
		*printWriter << "\n";

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

		std::string jsonStats = "";

		/* Processing the input file time step by time step and writing output file */
		while (!walker.atEnd()) {
			walker.readState(daa);
			if (wrapper != NULL) {
				wrapper->adjustAlertingTime();
			}
			jsonStats = jsonBands(
				daa, monitors,
				alertsArray, 
				trkArray, gsArray, vsArray, altArray,
				resTrkArray, resGsArray, resVsArray, resAltArray,
				monitorM1Array, monitorM2Array, monitorM3Array
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
		if (args == NULL || length == 0) {
			std::cout << "Invalid args" << std::endl;
			printHelpMsg();
			exit(0);
		}
		int a = 1;
		for (; a < length && larcfm::startsWith(args[a], "-"); a++) {
			if (std::strcmp(args[a], "--help") == 0 || std::strcmp(args[a], "-help") == 0 || std::strcmp(args[a], "-h") == 0) {
				std::cout << "DAABandsV2 help" << std::endl;
				printHelpMsg();
				exit(0);
			} else if (larcfm::startsWith(args[a], "--list-monitors") || larcfm::startsWith(args[a], "-list-monitors")) {
				std::cout << printMonitorList() << std::endl;
				exit(0);
			} else if (larcfm::startsWith(args[a], "--conf") || larcfm::startsWith(args[a], "-conf") || std::strcmp(args[a], "-c") == 0) {
				daa_config = args[++a];
			} else if (larcfm::startsWith(args[a], "--out") || larcfm::startsWith(args[a], "-out") || std::strcmp(args[a], "-o") == 0) {
				ofname = args[++a];
			} else if (larcfm::startsWith(args[a], "--version") || larcfm::startsWith(args[a], "-version")) {
				std::cout << getVersion() << std::endl;
				exit(0);
			} else if (larcfm::startsWith(args[a], "-")) {
				std::cerr << "** Error: Invalid option (" << args[a] << ")" << std::endl;
				exit(1);
			}
		}
		ifname = args[a];
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
	if (!daaBands.inputFileReadable()) {
		std::cerr << "** Error: File " << daaBands.getInputFileName() << " cannot be read" << std::endl;
		exit(1);
	}
	daaBands.loadDaaConfig();
	daaBands.walkFile(NULL);
}

