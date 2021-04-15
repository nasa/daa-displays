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

#include "Daidalus.h"
#include "WCV_tvar.h"
#include "DaidalusFileWalker.h"
#include <cstring>
#include <regex>

using namespace larcfm;


class DAABands {

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
		Daidalus daa;
		std::ofstream* printWriter;

		DAABands () {
			tool_name = "DAABands";
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
			std::cout << "  --version\n\tPrint DAIDALUS version" << std::endl;
			std::cout << "  --config <file.conf>\n\tLoad configuration <file.conf>" << std::endl;
			std::cout << "  --wind <wind_info>\n\tLoad wind vector information, a JSON object enclosed in double quotes \"{ deg: d, knot: m }\", where d and m are eals" << std::endl;
			std::cout << "  --output <file.json>\n\tOutput file <file.json>" << std::endl;
			exit(0);
		}

		static std::string jsonInt(const std::string& label, int val) {
			std::string json = "";
			json += "\""+label+"\": "+Fmi(val);
			return json;
		}

		static std::string jsonString(const std::string& label, const std::string& str) {
			std::string json = "";
			json += "\""+label+"\": \""+str+"\"";
			return json;
		}

		std::string region2str (const BandsRegion::Region& r) const {
			switch (r) {
				case BandsRegion::Region::NONE: return "0";
				case BandsRegion::Region::FAR: return "1";
				case BandsRegion::Region::MID: return "2";
				case BandsRegion::Region::NEAR: return "3";
				case BandsRegion::Region::RECOVERY: return "4";
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

		bool loadDaaConfig () {
			if (daa_config.empty() == false) {
				bool paramLoaded = daa.parameters.loadFromFile(daa_config);
				if (paramLoaded) {
					std::cout << "** Configuration file " << daa_config << " loaded successfully!" << std::endl;
					return true;
				} else {
					std::cerr << "** Error: Configuration file " << daa_config << " could not be loaded. Using default DAIDALUS configuration." << std::endl;
				}
			} else {
				std::cerr << "** Warning: Configuration file not specified. Using default DAIDALUS configuration." << std::endl;
			}
			return false;
		}

		bool loadWind () {
			if (!wind.empty()) {
				// std::cout << "Loading wind " << wind << std::endl;
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
				Velocity windVelocity = Velocity::makeTrkGsVs(deg, "deg", knot, "knot", fpm, "fpm");
				daa.setWindField(windVelocity);
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
			std::vector<std::string>* ownshipArray,
			std::vector<std::string>* alertsArray, std::vector<std::string>* trkArray, std::vector<std::string>* gsArray, std::vector<std::string>* vsArray, std::vector<std::string>* altArray,
			std::vector<std::string>* resTrkArray, std::vector<std::string>* resGsArray, std::vector<std::string>* resVsArray, std::vector<std::string>* resAltArray
		) {
			std::string hs_units = daa.parameters.getUnits("gs_step");
			std::string vs_units = daa.parameters.getUnits("vs_step");
			std::string alt_units = daa.parameters.getUnits("alt_step");
			std::string hdir_units = daa.parameters.getUnits("trk_step");

			// load wind settings at each step -- wind is not persistent in DAIDALUS
			loadWind();

			// ownship
			std::string time = Fm8(daa.getCurrentTime());
			std::string own = "{ \"time\": " + time; 
			own += ", \"heading\": { \"val\": \"" + Fm8(daa.getAircraftState(0).track(hdir_units)) + "\"";
			own += ", \"units\": \"" + hdir_units + "\" }";
			own += ", \"airspeed\": { \"val\": \"" + Fm8(daa.getAircraftState(0).groundSpeed(hs_units)) + "\"";
			own += ", \"units\": \"" + hs_units + "\" }";
			own += " }";
			ownshipArray->push_back(own);

			// traffic alerts
			std::string alerts = "{ \"time\": " + time + ", \"alerts\": [ ";
			for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) { // aircraft 0 is the ownship
				int alert_level = daa.alerting(ac);
				std::string ac_name = daa.getAircraftState(ac).getId();
				if (ac > 1) { alerts += ", "; }
				BandsRegion::Region alert_region = BandsRegion::UNKNOWN;
				if (alert_level == 0) {
					alert_region = BandsRegion::NONE;
				} else {
					alert_region = daa.parameters.alertor.getLevel(alert_level).getRegion();
				}
				alerts += "{ " + jsonString("ac",ac_name)
				+ ", " + jsonInt("alert_level",alert_level)
				+ ", " + jsonString("alert_region",BandsRegion::to_string(alert_region))
				+ "}";
			}
			alerts += " ]}";
			alertsArray->push_back(alerts);

			// bands
			KinematicMultiBands bands;
			daa.kinematicMultiBands(bands);

			std::string trk = "{ \"time\": " + time;
			trk += ", \"bands\": [ ";
			for (int i = 0; i < bands.trackLength(); i++) {
				trk += "{ \"range\": " + bands.track(i, hdir_units).toString();
				trk += ", \"units\": \"" + hdir_units + "\"";
				trk += ", \"region\": \"" + BandsRegion::to_string(bands.trackRegion(i));
				trk += "\" }";
				if (i < bands.trackLength() - 1) { trk += ", "; }
			}
			trk += " ]}";
			trkArray->push_back(trk);

			std::string gs = "{ \"time\": " + time;
			gs += ", \"bands\": [ ";
			for (int i = 0; i < bands.groundSpeedLength(); i++) {
				gs += "{ \"range\": " + bands.groundSpeed(i, hs_units).toString();
				gs += ", \"units\": \"" + hs_units + "\"";
				gs += ", \"region\": \"" + BandsRegion::to_string(bands.groundSpeedRegion(i));
				gs += "\" }";
				if (i < bands.groundSpeedLength() - 1) { gs += ", "; }
			}
			gs += " ]}";
			gsArray->push_back(gs);

			std::string vs = "{ \"time\": " + time;
			vs += ", \"bands\": [ ";
			for (int i = 0; i < bands.verticalSpeedLength(); i++) {
				vs += "{ \"range\": " + bands.verticalSpeed(i, vs_units).toString();
				vs += ", \"units\": \"" + vs_units + "\"";
				vs += ", \"region\": \"" + BandsRegion::to_string(bands.verticalSpeedRegion(i));
				vs += "\" }";
				if (i < bands.verticalSpeedLength() - 1) { vs += ", "; }
			}
			vs += " ]}";
			vsArray->push_back(vs);

			std::string alt = "{ \"time\": " + time;
			alt += ", \"bands\": [ ";
			for (int i = 0; i < bands.altitudeLength(); i++) {
				alt += "{ \"range\": " + bands.altitude(i, alt_units).toString();
				alt += ", \"units\": \"" + alt_units + "\"";
				alt += ", \"region\": \"" + BandsRegion::to_string(bands.altitudeRegion(i));
				alt += "\" }";
				if (i < bands.altitudeLength() - 1) { alt += ", "; }
			}
			alt += " ]}";
			altArray->push_back(alt);

			// config
			std::string stats = "\"hs\": { \"min\": " + std::to_string(bands.getMinGroundSpeed(hs_units))
				+ ", \"max\": " + std::to_string(bands.getMaxGroundSpeed(hs_units))
				+ ", \"units\": \"" + hs_units + "\" },\n"
				+ "\"vs\": { \"min\": " + std::to_string(bands.getMinVerticalSpeed(vs_units))
				+ ", \"max\": " + std::to_string(bands.getMaxVerticalSpeed(vs_units))
				+ ", \"units\": \"" + vs_units + "\" },\n"
				+ "\"alt\": { \"min\": " + std::to_string(bands.getMinAltitude(alt_units))
				+ ", \"max\": " + std::to_string(bands.getMaxAltitude(alt_units))
				+ ", \"units\": \"" + alt_units + "\" },\n"
				+ "\"MostSevereAlertLevel\": \"" + std::to_string(daa.parameters.alertor.mostSevereAlertLevel()) + "\"";
			return stats;
		}

		void walkFile () {
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
			DaidalusFileWalker walker(ifname);

			*printWriter << "{\n\"Info\": ";
			*printWriter << jsonHeader() << "," << std::endl;
			*printWriter << "\"Scenario\": \"" + scenario + "\"," << std::endl;
			*printWriter << "\"Wind\": { \"deg\": \"" << Units::to("deg", daa.getWindField().compassAngle()) 
			<< "\", \"knot\": \"" << Units::to("knot", daa.getWindField().gs()) 
			<< "\" }," << std::endl;

			std::vector<std::string>* trkArray = new std::vector<std::string>();
			std::vector<std::string>* gsArray = new std::vector<std::string>();
			std::vector<std::string>* vsArray = new std::vector<std::string>();
			std::vector<std::string>* altArray = new std::vector<std::string>();
			std::vector<std::string>* alertsArray = new std::vector<std::string>();
			std::vector<std::string>* ownshipArray = new std::vector<std::string>();

			std::vector<std::string>* resTrkArray = new std::vector<std::string>();
			std::vector<std::string>* resGsArray = new std::vector<std::string>();
			std::vector<std::string>* resVsArray = new std::vector<std::string>();
			std::vector<std::string>* resAltArray = new std::vector<std::string>();

			std::string jsonStats = "";

			/* Processing the input file time step by time step and writing output file */
			while (!walker.atEnd()) {
				walker.readState(daa);
				jsonStats = jsonBands(
					ownshipArray, alertsArray, 
					trkArray, gsArray, vsArray, altArray,
					resTrkArray, resGsArray, resVsArray, resAltArray
				);
			}

			*printWriter << jsonStats + "," << std::endl;

			printArray(*printWriter, ownshipArray, "Ownship");
			*printWriter << ",\n";
			printArray(*printWriter, alertsArray, "Alerts");
			*printWriter << ",\n";
			printArray(*printWriter, trkArray, "Heading Bands");
			*printWriter << ",\n";
			printArray(*printWriter, gsArray, "Horizontal Speed Bands");
			*printWriter << ",\n";
			printArray(*printWriter, vsArray, "Vertical Speed Bands");
			*printWriter << ",\n";
			printArray(*printWriter, altArray, "Altitude Bands");
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
			return Daidalus::release();
			// return DaidalusParameters::VERSION; //VERSION;
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
				} else if (startsWith(args[a], "--version") || startsWith(args[a], "-version")) {
					std::cout << getVersion() << std::endl;
					exit(0);
				} else if (a < length - 1 && (startsWith(args[a], "--conf") || startsWith(args[a], "-conf") || std::strcmp(args[a], "-c") == 0)) {
					daa_config = args[++a];
				} else if (a < length - 1 && (startsWith(args[a], "--out") || startsWith(args[a], "-out") || std::strcmp(args[a], "-o") == 0)) {
					ofname = args[++a];
				} else if (a < length - 1 && (startsWith(args[a], "--wind") || startsWith(args[a], "-wind"))) {
					wind = args[++a];
				} else if (startsWith(args[a], "-")) {
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
	DAABands daaBands;
	daaBands.parseCliArgs(argv, argc);
	daaBands.loadDaaConfig();
	daaBands.walkFile();
}
