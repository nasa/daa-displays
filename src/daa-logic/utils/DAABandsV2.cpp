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
#include "DaidalusFileWalker.h"
#include "WCV_tvar.h"
#include "Units.h"
#include <regex>

using namespace larcfm;

class DAABandsV2 {

protected:

	static const int precision16 = 16;
	static const std::string tool_name;
	static const double latOffset;
	static const double lonOffset;
	static const double latlonThreshold;

	// the following flag and offset are introduced to avoid a region
	// in the atlantic ocean where worldwind is unable to render maps at certain zoom levels
	// (all rendering layers disappear in that region when the zoom level is below ~2.5NMI)
	bool llaFlag;

	std::string daaConfig;
	std::string scenario;
	std::string ofname; // output file name
	std::string ifname; // input file name
	int precision;

	/* Units are loaded from configuration file */
	std::string hs_units;
	std::string vs_units;
	std::string alt_units;
	std::string hdir_units;
	std::string hrec_units;
	std::string vrec_units;
	std::string time_units;

	std::string wind;

	std::ofstream* printWriter;

public:

	Daidalus daa;

	DAABandsV2 () {
		llaFlag = false;
		daaConfig = "";
		scenario = "";
		ofname = "";
		ifname = "";
		precision = 2;
		hs_units = "m/s";
		vs_units = "m/s";
		alt_units = "m";
		hdir_units = "deg";
		hrec_units = "m";
		vrec_units = "m";
		time_units = "s";
		wind = "";
		printWriter = NULL;
	}

	std::string getScenario() const {
		return scenario;
	}

	std::string getConfigFileName() const {
		return daaConfig;
	}

	std::string getConfig () const {
		if (!daaConfig.empty()) {
			int slash = daaConfig.find_last_of("/");
			if (slash >= 0) {
				return daaConfig.substr(slash + 1);
			}
		}
		return daaConfig;
	}

	std::string getOutputFileName() const {
		return ofname;
	}

	std::string getInputFileName() const {
		return ifname;
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

	void printHelpMsg() const {
		std::cout << "Version: DAIDALUS " << getVersion() << std::endl;
		std::cout << "Generates a file that can be rendered in daa-displays" << std::endl;
		std::cout << "Usage:" << std::endl;
		std::cout << "  " << tool_name << " [options] file" << std::endl;
		std::cout << "Options:" << std::endl;
		std::cout << "  --help\n\tPrint this message" << std::endl;
		std::cout << "  --version\n\tPrint DAIDALUS version" << std::endl;
		std::cout << "  --precision <n>\n\tPrecision of output values" << std::endl;
		std::cout << "  --config <file.conf>\n\tLoad configuration <file.conf>" << std::endl;
		std::cout << "  --wind <wind_info>\n\tLoad wind vector information, a JSON object enclosed in double quotes \"{ deg: d, knot: m }\", where d and m are eals" << std::endl;
		std::cout << "  --output <file.json>\n\tOutput file <file.json>" << std::endl;
		std::cout << "  --list-monitors\nReturns the list of available monitors, in JSON format" << std::endl;
		exit(0);
	}

	std::string printMonitorList() const {
		int n = DAAMonitorsV2::getSize();
		std::string res = "";
		for (int i = 0; i < n; i++) {
			res += "\"" + DAAMonitorsV2::getLabel(i + 1) + "\"";
			if (i < n - 1) { res += ", "; }
		}
		return "[ " + res + " ]";
	}

	std::string region2str (const BandsRegion::Region& r) const {
		switch (r) {
		case BandsRegion::NONE: return "0";
		case BandsRegion::FAR: return "1";
		case BandsRegion::MID: return "2";
		case BandsRegion::NEAR: return "3";
		case BandsRegion::RECOVERY: return "4";
		default: return "-1";
		}
	}

	void printArray (std::ofstream& out, const std::vector<std::string>& info, const std::string& label) const {
		out << "\"" << label << "\": [" << std::endl;
		bool comma = false;
		std::vector<std::string>::const_iterator str_ptr;
		for (str_ptr=info.begin(); str_ptr != info.end(); ++str_ptr) {
			if (comma) {
				out << "," << std::endl;
			} else {
				comma = true;
			}
			out << (*str_ptr);
		}
		out << "\n]" << std::endl;
	}

	void printMonitors (std::ofstream& out, const DAAMonitorsV2& monitors, const std::vector< std::vector<std::string> >& info) const {
		out << " [" << std::endl;
		int len = DAAMonitorsV2::getSize();
		for (int i = 0; i < len; i++) {
			int monitorID = i + 1;
			std::string legend = DAAMonitorsV2::getLegend(monitorID);
			std::string color = monitors.getColor(monitorID);
			std::string label = DAAMonitorsV2::getLabel(monitorID);
			out << "{ \"id\": \"" << monitorID << "\",\n";
			out << "\"name\": \"" << label << "\",\n";
			out << "\"color\": \"" << color << "\",\n";
			out << "\"legend\": " << legend << ",\n";
			printArray(out, info[i], "results");
			if (i < len - 1) {
				out << "}, " << std::endl;
			} else {
				out << "} " << std::endl;
			}
		}
		out << "]" << std::endl;
	}

	bool loadDaaConfig () {
		if (!daaConfig.empty()) {
			bool paramLoaded = daa.loadFromFile(daaConfig);
			if (paramLoaded) {
				std::cout << "** Configuration file " << daaConfig << " loaded successfully!" << std::endl;
				hs_units = daa.getUnitsOf("step_hs");
				vs_units = daa.getUnitsOf("step_vs");
				alt_units = daa.getUnitsOf("step_alt");
				hrec_units = daa.getUnitsOf("min_horizontal_recovery");
				vrec_units = daa.getUnitsOf("min_vertical_recovery");
				return true;
			} else {
				std::cerr << "** Error: Configuration file " << daaConfig << " could not be loaded. Using default DAIDALUS configuration." << std::endl;
			}
		} else {
			std::cerr << "** Warning: Configuration file not specified. Using default DAIDALUS configuration." << std::endl;
		}
		return false;
	}

	bool loadWind () {
		if (!wind.empty()) {
			double deg = 0;
			double knot = 0;
			double fpm = 0;
			const std::regex re_deg(".*\\bdeg\\s*:\\s*(.*)");
			std::smatch match_deg;
			std::regex_match(wind, match_deg, re_deg);
			if (match_deg.size() == 2) {
				deg = std::stod(match_deg[1].str());
			}

			const std::regex re_knot(".*\\bknot\\s*:\\s*(.*)");
			std::smatch match_knot;
			std::regex_match(wind, match_knot, re_knot);
			if (match_knot.size() == 2) {
				knot = std::stod(match_knot[1].str());
			}
			Velocity windVelocity = Velocity::makeTrkGsVs(deg, "deg", knot, "knot", fpm, "fpm");
			daa.setWindVelocityFrom(windVelocity);
			return true;
		}
		return false;
	}

	std::string jsonHeader () const {
		std::string json = "";
		json += "\"Info\": { \"version\": \"" + getVersion() + "\"";
		json +=	", \"configuration\": \"" + getConfig()+ "\" },\n";
		json += "\"Scenario\": \"" + scenario + "\",\n";
		Velocity wind = daa.getWindVelocityFrom();
		json += "\"Wind\": { \"deg\": \"" + fmt(wind.compassAngle("deg")) + "\"";
		json += ", \"knot\": \"" + fmt(wind.groundSpeed("knot"))+"\"";
		//json += ", \"enabled\": \"" + wind.isZero() + "\"";
		json += " },";
		return json;
	}

	bool isBelowLLAThreshold(const TrafficState& ownship, const TrafficState& intruder) const {
		// current intruder position
		Vect3 si = intruder.get_s(); // projected position of the intruder

		Position po = ownship.getPosition(); // ownship position in lat lon
		EuclideanProjection eprj = Projection::createProjection(po);
		LatLonAlt lla = eprj.inverse(si);
		Position px = Position::mkLatLonAlt(lla.lat(), lla.lon(), lla.alt());

		return std::abs(Units::to("deg", px.lat())) < latlonThreshold
				&& std::abs(Units::to("deg", px.lon())) < latlonThreshold;
	}

	void adjustThreshold () {
		std::string input = ifname;
		Daidalus daidalus = daa;
		DaidalusFileWalker walker(input);
		while (!walker.atEnd()) {
			walker.readState(daidalus);
			TrafficState ownship = daidalus.getOwnshipState();
			if (isBelowLLAThreshold(ownship, ownship)) {
				llaFlag = true;
				//System.out.println("LLA flag is TRUE");
				return;
			}
			for (int idx = 0; idx <= daidalus.lastTrafficIndex(); idx++) {
				TrafficState traffic = daidalus.getAircraftStateAt(idx);
				if (isBelowLLAThreshold(ownship, traffic)) {
					llaFlag = true;
					//System.out.println("LLA flag is TRUE");
					return;
				}
			}
		}
		//System.out.println("LLA flag is FALSE");
		llaFlag = false;
	}

	/**
	 * Utility function, returns LLA coordinates of a point in space
	 * @param pi Position of the intruder
	 * @param po Position of the ownship
	 */
	LatLonAlt getLatLonAlt (const Position& pi, const Position& po) const {
		if (pi.isLatLon()) {
			return pi.lla();
		}
		EuclideanProjection eprj = Projection::createProjection(po);
		return eprj.inverse(pi.vect3());
	}

	std::string printPolygon (const std::vector<Position>& ply, const Position& po) const {
		std::string polygon = "";
		bool comma = false;
		std::vector<Position>::const_iterator pi_ptr;
		for (pi_ptr = ply.begin(); pi_ptr != ply.end(); ++pi_ptr) {
			Position pi = *pi_ptr;
			LatLonAlt lla = getLatLonAlt(pi, po);
			std::string lat = llaFlag ? FmPrecision(Units::to("deg", lla.lat()) + latOffset, precision16)
					: FmPrecision(Units::to("deg", lla.lat()), precision16);
			std::string lon = llaFlag ? FmPrecision(Units::to("deg", lla.lon()) + lonOffset, precision16)
					: FmPrecision(Units::to("deg", lla.lon()), precision16);
			if (comma) {
				polygon += ",\n";
			} else {
				comma = true;
			}
			polygon += "\t\t{ \"lat\": \"" + lat;
			polygon += "\", \"lon\": \"" + lon;
			polygon += "\", \"alt\": \"" + fmt(Units::to("ft", lla.alt()));
			polygon += "\" }";
		}
		polygon = "\t[\n" + polygon + "\n\t]";
		return polygon;
	}

	std::string printPolygons (const std::vector< std::vector<Position> >& polygons, const Position& po) const {
		std::string res = "";
		bool comma = false;
		std::vector< std::vector<Position> >::const_iterator ply_ptr;
		for (ply_ptr = polygons.begin(); ply_ptr != polygons.end(); ++ ply_ptr) {
			if (comma) {
				res += ",\n";
			} else {
				comma = true;
			}
			res += printPolygon(*ply_ptr, po);
		}
		return "[ \n" + res + "]";
	}

	std::string fmt(double val) const {
		return FmPrecision(val,precision);
	}

	static std::string getCompatibleInternalUnit(const std::string& unit) {
		std::string internalunits[]  = {"m", "s", "rad", "m/s", "m/s^2", "rad/s"};
		for (int i=0; i < 6; ++i) {
			if (Units::isCompatible(unit,internalunits[i])) {
				return internalunits[i];
			}
		}
		return "";
	}

	std::string jsonValUnits(const std::string& label, double val, const std::string& units) const {
		std::string json = "";
		json += "\""+label+"\": { ";
		json += "\"val\": \"" + fmt(Units::to(units,val)) + "\"";
		json += ", \"units\": \"" + units + "\"";
		if (Units::getFactor(units) != 1.0) {
			json += ", \"internal\": \"" + fmt(val) + "\"";
			std::string internalunit = getCompatibleInternalUnit(units);
			if (internalunit.empty()) {
				json += ", \"internal_units\": \"" + internalunit + "\"";
			}
		}
		json += " }";
		return json;
	}

	std::string jsonValueRegion(const std::string& label, double val, const std::string& units, BandsRegion::Region region) const {
		std::string json = "\""+label+"\": {";
		json += jsonValUnits("valunit",val,units);
		json += ", "+jsonString("region",BandsRegion::to_string(region));
		json += " }";
		return json;
	}

	std::string jsonVect3(const std::string& label, const Vect3& v) const {
		std::string json = "";
		json += "\""+label+"\": { ";
		json += "\"x\": \"" + fmt(v.x) + "\"";
		json += ", \"y\": \"" + fmt(v.y) + "\"";
		json += ", \"z\": \"" + fmt(v.z) + "\"";
		json += " }";
		return json;
	}

	std::string jsonAircraftState(const TrafficState& ac, bool wind) const {
		Velocity av = ac.getAirVelocity();
		Velocity gv = ac.getGroundVelocity();
		std::string json = "{ ";
		json += "\"id\": \""+ ac.getId()+"\"";
		json += ", "+jsonVect3("s",ac.get_s());
		json += ", "+jsonVect3("v",ac.get_v());
		json += ", "+jsonValUnits("altitude",ac.altitude(),alt_units);
		json += ", "+jsonValUnits("track",gv.compassAngle(),hdir_units);
		json += ", "+jsonValUnits("heading",av.compassAngle(),hdir_units);
		json += ", "+jsonValUnits("groundspeed",gv.gs(),hs_units);
		json += ", "+jsonValUnits("airspeed",av.gs(),hs_units);
		json += ", "+jsonValUnits("verticalspeed",ac.verticalSpeed(),vs_units);
		json += ", \"wind\": "+Fmb(wind);
		json += " }";
		return json;
	}

	std::string jsonAircraftMetrics(int ac_idx) {
		int alerter_idx = daa.alerterIndexBasedOnAlertingLogic(ac_idx);
		Alerter alerter = daa.getAlerterAt(alerter_idx);
		int corrective_level = daa.correctiveAlertLevel(alerter_idx);
		Detection3D* detector = alerter.getDetectorPtr(corrective_level);
		double taumod = (detector != NULL && detector->getSimpleSuperClassName() == "WCV_tvar") ? daa.modifiedTau(ac_idx,((WCV_tvar*)detector)->getDTHR()) : NaN;
		std::string json = "{ ";
		json += "\"separation\": { "+jsonValUnits("horizontal",daa.currentHorizontalSeparation(ac_idx),hrec_units) +
				", "+jsonValUnits("vertical",daa.currentVerticalSeparation(ac_idx),vrec_units) + " }";
		json += ", \"missdistance\": { "+jsonValUnits("horizontal",daa.predictedHorizontalMissDistance(ac_idx),hrec_units) +
				", "+jsonValUnits("vertical",daa.predictedVerticalMissDistance(ac_idx),vrec_units) + " }";
		json += ", \"closurerate\": { "+jsonValUnits("horizontal",daa.horizontalClosureRate(ac_idx),hs_units) +
				", "+jsonValUnits("vertical",daa.verticalClosureRate(ac_idx),vs_units) + " }";
		json += ", "+jsonValUnits("tcpa",daa.timeToHorizontalClosestPointOfApproach(ac_idx),time_units);
		json += ", "+jsonValUnits("tcoa",daa.timeToCoAltitude(ac_idx),time_units);
		json += ", "+jsonValUnits("taumod",taumod,time_units);
		json += " }";
		return json;
	}

	std::string jsonBands (
			DAAMonitorsV2& monitors,
			std::vector<std::string>& ownshipArray,
			std::vector<std::string>& alertsArray,
			std::vector<std::string>& metricsArray,
			std::vector<std::string>& trkArray,
			std::vector<std::string>& gsArray,
			std::vector<std::string>& vsArray,
			std::vector<std::string>& altArray,
			std::vector<std::string>& resTrkArray,
			std::vector<std::string>& resGsArray,
			std::vector<std::string>& resVsArray,
			std::vector<std::string>& resAltArray,
			std::vector<std::string>& contoursArray,
			std::vector<std::string>& hazardZonesArray,
			std::vector<std::string>& monitorM1Array,
			std::vector<std::string>& monitorM2Array,
			std::vector<std::string>& monitorM3Array,
			std::vector<std::string>& monitorM4Array) {

		// ownship
		std::string time = fmt(daa.getCurrentTime());
		std::string own = "{ \"time\": " + time;
		own += ", \"acstate\": " + jsonAircraftState(daa.getOwnshipState(), !daa.getWindVelocityTo().isZero());
		own += " }";
		ownshipArray.push_back(own);

		// traffic alerts
		std::string alerts = "{ \"time\": " + time + ", \"alerts\": [ ";
		for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
			int alerter_idx = daa.alerterIndexBasedOnAlertingLogic(ac);
			Alerter alerter = daa.getAlerterAt(alerter_idx);
			int alert_level = daa.alertLevel(ac);
			std::string ac_name = daa.getAircraftStateAt(ac).getId();
			if (ac > 1) { alerts += ", "; }
			alerts += "{ " + jsonString("ac",ac_name)
							+ ", " + jsonInt("alert_level",alert_level)
							+ ", " + jsonString("alert_region",BandsRegion::to_string(daa.regionOfAlertLevel(alerter_idx,alert_level)))
							+ ", " + jsonString("alerter",alerter.getId())
							+ ", " + jsonInt("alerter_idx",alerter_idx)
							+ "}";
		}
		alerts += " ]}";
		alertsArray.push_back(alerts);

		// Traffic aircraft
		std::string traffic = "{ \"time\": " + time + ", \"aircraft\": [ ";
		for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
			if (ac > 1) { traffic += ", "; }
			traffic += "{ \"acstate\": " + jsonAircraftState(daa.getAircraftStateAt(ac), !daa.getWindVelocityTo().isZero());
			traffic += ", \"metrics\": " + jsonAircraftMetrics(ac);
			traffic += " }";
		}
		traffic += " ]}";
		metricsArray.push_back(traffic);

		// bands
		std::string trkBands = "{ \"time\": " + time;
		trkBands += ", \"bands\": [ ";
		for (int i = 0; i < daa.horizontalDirectionBandsLength(); i++) {
			trkBands += "{ \"range\": " + daa.horizontalDirectionIntervalAt(i, hdir_units).toString();
			trkBands += ", \"units\": \"" +  hdir_units + "\"";
			trkBands += ", \"region\": \"" + BandsRegion::to_string(daa.horizontalDirectionRegionAt(i)) + "\" }";
			if (i < daa.horizontalDirectionBandsLength() - 1) { trkBands += ", "; }
		}
		trkBands += " ]}";
		trkArray.push_back(trkBands);

		std::string gsBands = "{ \"time\": " + time;
		gsBands += ", \"bands\": [ ";
		for (int i = 0; i < daa.horizontalSpeedBandsLength(); i++) {
			gsBands += "{ \"range\": " + daa.horizontalSpeedIntervalAt(i, hs_units).toString();
			gsBands += ", \"units\": \"" + hs_units + "\"";
			gsBands += ", \"region\": \"" + BandsRegion::to_string(daa.horizontalSpeedRegionAt(i)) + "\" }";
			if (i < daa.horizontalSpeedBandsLength() - 1) { gsBands += ", "; }
		}
		gsBands += " ]}";
		gsArray.push_back(gsBands);

		std::string vsBands = "{ \"time\": " + time;
		vsBands += ", \"bands\": [ ";
		for (int i = 0; i < daa.verticalSpeedBandsLength(); i++) {
			vsBands += "{ \"range\": " + daa.verticalSpeedIntervalAt(i, vs_units).toString();
			vsBands += ", \"units\": \"" + vs_units + "\"";
			vsBands += ", \"region\": \"" + BandsRegion::to_string(daa.verticalSpeedRegionAt(i)) + "\" }";
			if (i < daa.verticalSpeedBandsLength() - 1) { vsBands += ", "; }
		}
		vsBands += " ]}";
		vsArray.push_back(vsBands);

		std::string altBands = "{ \"time\": " + time;
		altBands += ", \"bands\": [ ";
		for (int i = 0; i < daa.altitudeBandsLength(); i++) {
			altBands += "{ \"range\": " + daa.altitudeIntervalAt(i, alt_units).toString();
			altBands += ", \"units\": \"" + alt_units + "\"";
			altBands += ", \"region\": \"" + BandsRegion::to_string(daa.altitudeRegionAt(i)) + "\" }";
			if (i < daa.altitudeBandsLength() - 1) { altBands += ", "; }
		}
		altBands += " ]}";
		altArray.push_back(altBands);

		// resolutions
		std::string trkResolution = "{ \"time\": " + time;
		bool preferredTrk = daa.preferredHorizontalDirectionRightOrLeft();
		double resTrk = daa.horizontalDirectionResolution(preferredTrk);
		double resTrk_sec = daa.horizontalDirectionResolution(!preferredTrk);
		BandsRegion::Region resTrkRegion = daa.regionOfHorizontalDirection(resTrk);
		BandsRegion::Region resTrkRegion_sec = daa.regionOfHorizontalDirection(resTrk_sec);
		TrafficState ownship = daa.getOwnshipState();
		double currentTrk = ownship.horizontalDirection(hdir_units);
		BandsRegion::Region currentTrkRegion = daa.regionOfHorizontalDirection(ownship.horizontalDirection()); // we want to use internal units here, to minimize round-off errors
		bool isConflict = !ISNAN(resTrk);
		RecoveryInformation recoveryInfo = daa.horizontalDirectionRecoveryInformation();
		bool isRecovery = recoveryInfo.recoveryBandsComputed();
		bool isSaturated = recoveryInfo.recoveryBandsSaturated();
		std::string timeToRecovery = fmt(recoveryInfo.timeToRecovery());
		std::string nFactor = Fmi(recoveryInfo.nFactor());
		trkResolution += ", "+jsonValueRegion("preferred_resolution",resTrk,hdir_units,resTrkRegion);
		trkResolution += ", "+jsonValueRegion("other_resolution",resTrk_sec,hdir_units,resTrkRegion_sec);
		trkResolution += ", \"flags\": { \"conflict\": " + Fmb(isConflict) + ", \"recovery\": " + Fmb(isRecovery) + ", \"saturated\": " + Fmb(isSaturated) + ", \"preferred\": " + Fmb(preferredTrk) + " }";
		trkResolution += ", \"recovery\": { \"time\": \"" + timeToRecovery + "\", \"nfactor\": \"" + nFactor;
		trkResolution += "\", \"distance\": {"+jsonValUnits("horizontal",recoveryInfo.recoveryHorizontalDistance(),hrec_units);
		trkResolution += ", "+jsonValUnits("vertical",recoveryInfo.recoveryVerticalDistance(),vrec_units)+"}}";
		trkResolution += ", \"ownship\": { \"val\": \"" + fmt(currentTrk) + "\", \"units\": \"" + hdir_units + "\", \"region\": \"" + BandsRegion::to_string(currentTrkRegion) + "\" }";
		trkResolution += " }";
		resTrkArray.push_back(trkResolution);

		std::string gsResolution = "{ \"time\": " + time;
		bool preferredGs = daa.preferredHorizontalSpeedUpOrDown();
		double resGs = daa.horizontalSpeedResolution(preferredGs);
		double resGs_sec = daa.horizontalSpeedResolution(!preferredGs);
		BandsRegion::Region resGsRegion = daa.regionOfHorizontalSpeed(resGs); // we want to use internal units here, to minimize round-off errors
		BandsRegion::Region resGsRegion_sec = daa.regionOfHorizontalSpeed(resGs_sec); // we want to use internal units here, to minimize round-off errors
		double currentGs = ownship.horizontalSpeed(hs_units);
		BandsRegion::Region currentGsRegion = daa.regionOfHorizontalSpeed(ownship.horizontalSpeed()); // we want to use internal units here, to minimize round-off errors
		isConflict = !ISNAN(resGs);
		recoveryInfo = daa.horizontalSpeedRecoveryInformation();
		isRecovery = recoveryInfo.recoveryBandsComputed();
		isSaturated = recoveryInfo.recoveryBandsSaturated();
		timeToRecovery = fmt(recoveryInfo.timeToRecovery());
		nFactor = Fmi(recoveryInfo.nFactor());
		gsResolution += ", "+jsonValueRegion("preferred_resolution",resGs,hs_units,resGsRegion);
		gsResolution += ", "+jsonValueRegion("other_resolution",resGs_sec,hs_units,resGsRegion_sec);
		gsResolution += ", \"flags\": { \"conflict\": " + Fmb(isConflict) + ", \"recovery\": " + Fmb(isRecovery) + ", \"saturated\": " + Fmb(isSaturated) + ", \"preferred\": " + Fmb(preferredGs) + " }";
		gsResolution += ", \"recovery\": { \"time\": \"" + timeToRecovery + "\", \"nfactor\": \"" + nFactor;
		gsResolution += "\", \"distance\": {"+jsonValUnits("horizontal",recoveryInfo.recoveryHorizontalDistance(),hrec_units);
		gsResolution += ", "+jsonValUnits("vertical",recoveryInfo.recoveryVerticalDistance(),vrec_units)+"}}";
		gsResolution += ", \"ownship\": { \"val\": \"" + fmt(currentGs) + "\", \"units\": \"" + hs_units + "\", \"region\": \"" + BandsRegion::to_string(currentGsRegion) + "\" }";
		gsResolution += " }";
		resGsArray.push_back(gsResolution);

		std::string vsResolution = "{ \"time\": " + time;
		bool preferredVs = daa.preferredVerticalSpeedUpOrDown();
		double resVs = daa.verticalSpeedResolution(preferredVs);
		double resVs_sec = daa.verticalSpeedResolution(!preferredVs);
		BandsRegion::Region resVsRegion = daa.regionOfVerticalSpeed(resVs); // we want to use internal units here, to minimize round-off errors
		BandsRegion::Region resVsRegion_sec = daa.regionOfVerticalSpeed(resVs_sec); // we want to use internal units here, to minimize round-off errors
		double currentVs = ownship.verticalSpeed(vs_units);
		BandsRegion::Region currentVsRegion = daa.regionOfVerticalSpeed(ownship.verticalSpeed()); // we want to use internal units here, to minimize round-off errors
		isConflict = !ISNAN(resVs);
		recoveryInfo = daa.verticalSpeedRecoveryInformation();
		isRecovery = recoveryInfo.recoveryBandsComputed();
		isSaturated = recoveryInfo.recoveryBandsSaturated();
		timeToRecovery = fmt(recoveryInfo.timeToRecovery());
		nFactor = Fmi(recoveryInfo.nFactor());
		vsResolution += ", "+jsonValueRegion("preferred_resolution",resVs,vs_units,resVsRegion);
		vsResolution += ", "+jsonValueRegion("other_resolution",resVs_sec,vs_units,resVsRegion_sec);
		vsResolution += ", \"flags\": { \"conflict\": " + Fmb(isConflict) + ", \"recovery\": " + Fmb(isRecovery) + ", \"saturated\": " + Fmb(isSaturated) + ", \"preferred\": " + Fmb(preferredVs) + " }";
		vsResolution += ", \"recovery\": { \"time\": \"" + timeToRecovery + "\", \"nfactor\": \"" + nFactor;
		vsResolution += "\", \"distance\": {"+jsonValUnits("horizontal",recoveryInfo.recoveryHorizontalDistance(),hrec_units);
		vsResolution += ", "+jsonValUnits("vertical",recoveryInfo.recoveryVerticalDistance(),vrec_units)+"}}";
		vsResolution += ", \"ownship\": { \"val\": \"" + fmt(currentVs) + "\", \"units\": \"" + vs_units + "\", \"region\": \"" + BandsRegion::to_string(currentVsRegion) + "\" }";
		vsResolution += " }";
		resVsArray.push_back(vsResolution);

		std::string altResolution = "{ \"time\": " + time;
		bool preferredAlt = daa.preferredAltitudeUpOrDown();
		double resAlt = daa.altitudeResolution(preferredAlt);
		double resAlt_sec = daa.altitudeResolution(!preferredAlt);
		BandsRegion::Region resAltRegion = daa.regionOfAltitude(resAlt); // we want to use internal units here, to minimize round-off errors
		BandsRegion::Region resAltRegion_sec = daa.regionOfAltitude(resAlt_sec); // we want to use internal units here, to minimize round-off errors
		double currentAlt = ownship.altitude(alt_units);
		BandsRegion::Region currentAltRegion = daa.regionOfAltitude(ownship.altitude()); // we want to use internal units here, to minimize round-off errors
		isConflict = !ISNAN(resAlt);
		recoveryInfo = daa.altitudeRecoveryInformation();
		isRecovery = recoveryInfo.recoveryBandsComputed();
		isSaturated = recoveryInfo.recoveryBandsSaturated();
		timeToRecovery = fmt(recoveryInfo.timeToRecovery());
		nFactor = Fmi(recoveryInfo.nFactor());
		altResolution += ", "+jsonValueRegion("preferred_resolution",resAlt,alt_units,resAltRegion);
		altResolution += ", "+jsonValueRegion("other_resolution",resAlt_sec,alt_units,resAltRegion_sec);
		altResolution += ", \"flags\": { \"conflict\": " + Fmb(isConflict) + ", \"recovery\": " + Fmb(isRecovery) + ", \"saturated\": " + Fmb(isSaturated) + ", \"preferred\": " + Fmb(preferredAlt) + " }";
		altResolution += ", \"recovery\": { \"time\": \"" + timeToRecovery + "\", \"nfactor\": \"" + nFactor;
		altResolution += "\", \"distance\": {"+jsonValUnits("horizontal",recoveryInfo.recoveryHorizontalDistance(),hrec_units);
		altResolution += ", "+jsonValUnits("vertical",recoveryInfo.recoveryVerticalDistance(),vrec_units)+"}}";
		altResolution += ", \"ownship\": { \"val\": \"" + fmt(currentAlt) + "\", \"units\": \"" + alt_units + "\", \"region\": \"" + BandsRegion::to_string(currentAltRegion) + "\" }";
		altResolution += " }";
		resAltArray.push_back(altResolution);

		// Contours and hazard zones are lists of polygons, and polygons are list of points.
		Position po = daa.getAircraftStateAt(0).getPosition();
		std::string contours =  "{ \"time\": " + time;
		contours += ",\n  \"data\": [ ";
		for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
			std::string ac_name = daa.getAircraftStateAt(ac).getId();
			std::vector< std::vector<Position> > polygons;
			daa.horizontalContours(polygons, ac);
			contours += "{ \"ac\": \"" + ac_name + "\",\n";
			contours +=	"  \"polygons\": " + printPolygons(polygons, po) + "}";
			if (ac < daa.lastTrafficIndex()) {
				contours += ", ";
			}
		}
		contours += " ]}";
		contoursArray.push_back(contours);

		std::string hazardZones =  "{ \"time\": " + time;
		hazardZones += ",\n  \"data\": [ ";
		for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
			std::string ac_name = daa.getAircraftStateAt(ac).getId();

			std::vector<Position> ply_violation;
			daa.horizontalHazardZone(ply_violation, ac, true, false);
			std::vector<Position> ply_conflict;
			daa.horizontalHazardZone(ply_conflict, ac, false, false);
			std::vector< std::vector<Position> > polygons;
			polygons.push_back(ply_violation);
			polygons.push_back(ply_conflict);

			hazardZones += "{ \"ac\": \"" + ac_name + "\",\n";
			hazardZones +=	"  \"polygons\": " + printPolygons(polygons, po) + "}";
			if (ac < daa.lastTrafficIndex()) {
				hazardZones += ", ";
			}
		}
		hazardZones += " ]}";
		hazardZonesArray.push_back(hazardZones);

		// monitors
		monitors.check(daa);
		std::string monitorM1 = "{ \"time\": " + time
				+ ", " + monitors.m1()
				+ " }";
		monitorM1Array.push_back(monitorM1);

		std::string monitorM2 = "{ \"time\": " + time
				+ ", " + monitors.m2()
				+ " }";
		monitorM2Array.push_back(monitorM2);

		std::string monitorM3 = "{ \"time\": " + time
				+ ", " + monitors.m3(daa)
				+ " }";
		monitorM3Array.push_back(monitorM3);

		std::string monitorM4 = "{ \"time\": " + time
				+ ", " + monitors.m4(daa)
				+ " }";
		monitorM4Array.push_back(monitorM4);

		// config
		std::string stats = "\"hs\": { \"min\": " + fmt(daa.getMinHorizontalSpeed(hs_units))
																								+ ", \"max\": " + fmt(daa.getMaxHorizontalSpeed(hs_units))
																								+ ", \"units\": \"" + hs_units + "\" },\n"
																								+ "\"vs\": { \"min\": " + fmt(daa.getMinVerticalSpeed(vs_units))
																								+ ", \"max\": " + fmt(daa.getMaxVerticalSpeed(vs_units))
																								+ ", \"units\": \"" + vs_units + "\" },\n"
																								+ "\"alt\": { \"min\": " + fmt(daa.getMinAltitude(alt_units))
																								+ ", \"max\": " + fmt(daa.getMaxAltitude(alt_units))
																								+ ", \"units\": \"" + alt_units + "\" },\n"
																								+ "\"MostSevereAlertLevel\": \"" + Fmi(daa.mostSevereAlertLevel(1)) + "\"";
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

		*printWriter << "{\n" + jsonHeader() << std::endl;

		std::vector<std::string> trkArray;
		std::vector<std::string> gsArray;
		std::vector<std::string> vsArray;
		std::vector<std::string> altArray;
		std::vector<std::string> alertsArray;
		std::vector<std::string> ownshipArray;
		std::vector<std::string> metricsArray;

		std::vector<std::string> resTrkArray;
		std::vector<std::string> resGsArray;
		std::vector<std::string> resVsArray;
		std::vector<std::string> resAltArray;

		std::vector<std::string> contoursArray;
		std::vector<std::string> hazardZonesArray;

		DAAMonitorsV2 monitors;

		std::vector<std::string> monitorM1Array;
		std::vector<std::string> monitorM2Array;
		std::vector<std::string> monitorM3Array;
		std::vector<std::string> monitorM4Array;

		std::string jsonStats = "";

		/* Processing the input file time step by time step and writing output file */
		while (!walker.atEnd()) {
			walker.readState(daa);
			jsonStats = jsonBands(
					monitors,
					ownshipArray, alertsArray, metricsArray,
					trkArray, gsArray, vsArray, altArray,
					resTrkArray, resGsArray, resVsArray, resAltArray,
					contoursArray, hazardZonesArray,
					monitorM1Array, monitorM2Array, monitorM3Array, monitorM4Array);
		}

		*printWriter << jsonStats + "," << std::endl;

		printArray(*printWriter, ownshipArray, "Ownship");
		*printWriter << ",\n";
		printArray(*printWriter, alertsArray, "Alerts");
		*printWriter << ",\n";
		printArray(*printWriter, metricsArray, "Metrics");
		*printWriter << ",\n";
		printArray(*printWriter, trkArray, "Heading Bands");
		*printWriter << ",\n";
		printArray(*printWriter, gsArray, "Horizontal Speed Bands");
		*printWriter << ",\n";
		printArray(*printWriter, vsArray, "Vertical Speed Bands");
		*printWriter << ",\n";
		printArray(*printWriter, altArray, "Altitude Bands");
		*printWriter << ",\n";
		printArray(*printWriter, resTrkArray, "Horizontal Direction Resolution");
		*printWriter << ",\n";
		printArray(*printWriter, resGsArray, "Horizontal Speed Resolution");
		*printWriter << ",\n";
		printArray(*printWriter, resVsArray, "Vertical Speed Resolution");
		*printWriter << ",\n";
		printArray(*printWriter, resAltArray, "Altitude Resolution");
		*printWriter << ",\n";

		printArray(*printWriter, contoursArray, "Contours");
		*printWriter << ",\n";
		printArray(*printWriter, hazardZonesArray, "Hazard Zones");
		*printWriter << ",\n";

		*printWriter << "\"Monitors\":\n";
		std::vector< std::vector<std::string> > info;
		info.push_back(monitorM1Array);
		info.push_back(monitorM2Array);
		info.push_back(monitorM3Array);
		info.push_back(monitorM4Array);
		printMonitors(*printWriter, monitors, info);

		*printWriter << "}\n";

		closePrintWriter();
	}

	std::string getFileName (const std::string& fname) const {
		if (fname.find_last_of("/")) {
			std::string str(fname);
			int name_start = str.find_last_of("/");
			return fname.substr(name_start + 1);
		}
		return fname;
	}

	std::string removeExtension (const std::string& fname) const {
		if (fname.find_last_of(".")) {
			int dot = fname.find_last_of(".");
			if (dot > 0) {
				return fname.substr(0, dot).c_str();
			}
		}
		return fname;
	}

	std::string getVersion () const {
		return DaidalusParameters::VERSION;
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
			} else if (startsWith(args[a], "--list-monitors") || startsWith(args[a], "-list-monitors")) {
				std::cout << printMonitorList() << std::endl;
				exit(0);
			} else if (startsWith(args[a], "--version") || startsWith(args[a], "-version")) {
				std::cout << getVersion() << std::endl;
				exit(0);
			} else if (a < length - 1 && (startsWith(args[a], "--prec") || startsWith(args[a], "-prec") || std::strcmp(args[a], "-p") == 0)) {
				precision = std::stoi(args[++a]);
			} else if (a < length - 1 && (startsWith(args[a], "--conf") || startsWith(args[a], "-conf") || std::strcmp(args[a], "-c") == 0)) {
				daaConfig = args[++a];
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

	bool inputFileReadable () const {
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

const std::string DAABandsV2::tool_name = "DAABandsV2";
const double DAABandsV2::latOffset = 37.0298687;
const double DAABandsV2::lonOffset = -76.3452218;
const double DAABandsV2::latlonThreshold = 0.3;

int main(int argc, char* argv[]) {
	DAABandsV2 daaBands;
	daaBands.parseCliArgs(argv, argc);
	daaBands.loadDaaConfig();
	daaBands.loadWind();
	daaBands.walkFile();
}

