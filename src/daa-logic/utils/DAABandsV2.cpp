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
		exit(0);
	}

	std::string region2str(const larcfm::BandsRegion::Region& r) const {
		switch (r) {
			case larcfm::BandsRegion::Region::NONE: return "0";
			case larcfm::BandsRegion::Region::FAR: return "1";
			case larcfm::BandsRegion::Region::MID: return "2";
			case larcfm::BandsRegion::Region::NEAR: return "3";
			case larcfm::BandsRegion::Region::RECOVERY: return "4";
			default: return "-1";
		}
	}

	void printBands(std::ofstream& out, std::vector<std::string>* bands, const std::string& label) {
		out << "\"" << label << "\": [" << std::endl;
		for (int i = 0; i < (*bands).size(); i++) {
			out << (*bands)[i];
			if (i < (*bands).size() - 1) {
				out << "," << std::endl;
			} else {
				out << "" << std::endl;
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

	std::string jsonBands (larcfm::Daidalus& daa, std::vector<std::string>* alertsArray, std::vector<std::string>* trkArray, std::vector<std::string>* gsArray, std::vector<std::string>* vsArray, std::vector<std::string>* altArray) {
		std::string hs_units = daa.getUnitsOf("step_hs");
		std::string vs_units = daa.getUnitsOf("step_vs");
		std::string alt_units = daa.getUnitsOf("step_alt");

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

		std::string trk = "{ \"time\": " + time;
		trk += ", \"bands\": [ ";
		for (int i = 0; i < daa.horizontalDirectionBandsLength(); i++) {
			trk += "{ \"range\": " + daa.horizontalDirectionIntervalAt(i, "deg").toString();
			trk += ", \"units\": \"deg\"";
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

		std::string jsonStats = "";

		/* Processing the input file time step by time step and writing output file */
		while (!walker.atEnd()) {
			walker.readState(daa);
			if (wrapper != NULL) {
				wrapper->adjustAlertingTime();
			}
			jsonStats = jsonBands(daa, alertsArray, trkArray, gsArray, vsArray, altArray);
		}

		*printWriter << jsonStats + "," << std::endl;

		printBands(*printWriter, alertsArray, "Alerts");
		*printWriter << ",\n";
		printBands(*printWriter, trkArray, "Heading Bands");
		*printWriter << ",\n";
		printBands(*printWriter, gsArray, "Horizontal Speed Bands");
		*printWriter << ",\n";
		printBands(*printWriter, vsArray, "Vertical Speed Bands");
		*printWriter << ",\n";
		printBands(*printWriter, altArray, "Altitude Bands");
		*printWriter << "}\n";

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

