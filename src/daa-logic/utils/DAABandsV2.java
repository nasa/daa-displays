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

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.List;

import gov.nasa.larcfm.ACCoRD.Alerter;
import gov.nasa.larcfm.ACCoRD.BandsRegion;
import gov.nasa.larcfm.ACCoRD.Daidalus;
import gov.nasa.larcfm.ACCoRD.DaidalusFileWalker;
import gov.nasa.larcfm.ACCoRD.TrafficState;
import gov.nasa.larcfm.Util.f;
import gov.nasa.larcfm.Util.Velocity;
import gov.nasa.larcfm.Util.Units;
import gov.nasa.larcfm.Util.Vect3;
import gov.nasa.larcfm.Util.Position;
import gov.nasa.larcfm.Util.LatLonAlt;
import gov.nasa.larcfm.Util.Projection;
import gov.nasa.larcfm.Util.EuclideanProjection;
import gov.nasa.larcfm.ACCoRD.Detection3D;
import gov.nasa.larcfm.ACCoRD.RecoveryInformation;
import gov.nasa.larcfm.ACCoRD.WCV_tvar;

import static gov.nasa.larcfm.ACCoRD.DaidalusParameters.VERSION;

public class DAABandsV2 {

	protected static final int precision16 = 16;
	protected static final String tool_name = "DAABandsV2";
	protected static final double latOffset = 37.0298687;
	protected static final double lonOffset = -76.3452218;
	protected static final double latlonThreshold = 0.3;

	// the following flag and offset are introduced to avoid a region 
	// in the atlantic ocean where worldwind is unable to render maps at certain zoom levels
	// (all rendering layers disappear in that region when the zoom level is below ~2.5NMI)
	protected boolean llaFlag = false;

	protected String daaConfig = null;
	protected String scenario = null;
	protected String ofname = null; // output file name
	protected String ifname = null; // input file name
	protected int    precision = 2; // Precision of printed outputs

	/* Units are loaded from configuration file */
	protected String hs_units = "m/s";
	protected String vs_units = "m/s";
	protected String alt_units = "m";
	protected String hdir_units = "deg";
	protected String hrec_units = "m";
	protected String vrec_units = "m";
	protected String time_units = "s";

	protected String wind = null;

	protected PrintWriter printWriter = null;

	public Daidalus daa = null;

	public DAABandsV2 () {
		/* Create Daidalus object and setting the configuration parameters */
		daa = new Daidalus();
	}

	public String getScenario() {
		return scenario;
	}

	public String getConfigFileName() {
		return daaConfig;
	}

	public String getConfig () {
		if (daaConfig != null) {
			String[] qid = daaConfig.split("/");
			return qid[qid.length - 1 ];
		}
		return null;
	}

	public String getOutputFileName() {
		return ofname;
	}

	public String getInputFileName() {
		return ifname;
	}

	public void printHelpMsg() {
		System.out.println("Version: DAIDALUS " + getVersion());
		System.out.println("Generates a file that can be rendered in daa-displays");
		System.out.println("Usage:");
		System.out.println("  " + tool_name + " [options] file");
		System.out.println("Options:");
		System.out.println("  --help\n\tPrint this message");
		System.out.println("  --version\n\tPrint DAIDALUS version");
		System.out.println("  --precision <n>\n\tPrecision of output values");
		System.out.println("  --config <file.conf>\n\tLoad configuration <file.conf>");
		System.out.println("  --wind <wind_info>\n\tLoad wind vector information, a JSON object enclosed in double quotes \"{ deg: d, knot: m }\", where d and m are reals");
		System.out.println("  --output <file.json>\n\tOutput file <file.json>");
		System.out.println("  --list-monitors\n\tReturns the list of available monitors, in JSON format");
		System.exit(0);
	}

	public static String jsonInt(String label, int val) {
		String json = "";
		json += "\""+label+"\": "+f.Fmi(val);
		return json;
	}
	
	public static String jsonString(String label, String str) {
		String json = "";
		json += "\""+label+"\": \""+str+"\"";
		return json;
	}
	
	/**
	 * Returns the list of monitors in json format
	 */
	public String printMonitorList() {
		int n = DAAMonitorsV2.getSize();
		String res = "";
		for (int i = 0; i < n; i++) {
			res += "\"" + DAAMonitorsV2.getLabel(i + 1) + "\"";
			if (i < n - 1) { res += ", "; }
		}
		return "[ " + res + " ]";
	}

	public static void printArray(PrintWriter out, List<String> info, String label) {
		out.println("\"" + label + "\": [");
		boolean comma = false;
		for (String str : info) {
			if (comma) {
				out.println(",");
			} else {
				comma = true;
			}
			out.print(str);
		}
		out.println("\n]");
	}

	public static void printMonitors (PrintWriter out, DAAMonitorsV2 monitors, List<List<String>> info) {
		out.println("[ ");
		int len = DAAMonitorsV2.getSize();
		for (int i = 0; i < len; i++) {
			int monitorID = i + 1;
			String legend = DAAMonitorsV2.getLegend(monitorID);
			String color = monitors.getColor(monitorID);
			String label = DAAMonitorsV2.getLabel(monitorID);
			out.print("{ \"id\": \"" + monitorID + "\",\n");
			out.print("\"name\": \"" + label + "\",\n");
			out.print("\"color\": \"" + color + "\",\n");
			out.println("\"legend\": " + legend + ",\n");
			printArray(out, info.get(i), "results");
			if (i < len - 1) {
				out.println("}, ");
			} else {
				out.println("} ");
			}
		}
		out.println(" ]");
	}

	public boolean loadConfig () {
		if (daa != null) {
			if (daaConfig != null) {
				boolean paramLoaded = daa.loadFromFile(daaConfig);
				if (paramLoaded) {
					System.out.println("** Configuration file " + daaConfig + " loaded successfully!");
					hs_units = daa.getUnitsOf("step_hs");
					vs_units = daa.getUnitsOf("step_vs");
					alt_units = daa.getUnitsOf("step_alt");
					hrec_units = daa.getUnitsOf("min_horizontal_recovery");
					vrec_units = daa.getUnitsOf("min_vertical_recovery");
					return true;
				} else {
					System.err.println("** Error: Configuration file " + daaConfig + " could not be loaded. Using default DAIDALUS configuration.");
				}
			} else {
				System.err.println("** Warning: Configuration file not specified. Using default DAIDALUS configuration.");
			}
		} else {
			System.err.println("** Error: Daidalus is not initialized.");
		}
		return false;
	}

	public boolean loadWind () {
		if (daa != null) {
			if (wind != null) {
				double deg = 0;
				double knot = 0;
				double fpm = 0;
				java.util.regex.Matcher match_deg = java.util.regex.Pattern.compile("\\bdeg\\s*:\\s*(\\d+(?:.\\d+)?)").matcher(wind);
				if (match_deg.find()) {
					deg = Double.parseDouble(match_deg.group(1));
				}
				java.util.regex.Matcher match_knot = java.util.regex.Pattern.compile("\\bknot\\s*:\\s*(\\d+(?:.\\d+)?)").matcher(wind);
				if (match_knot.find()) {
					knot = Double.parseDouble(match_knot.group(1));
				}
				Velocity windVelocity = Velocity.makeTrkGsVs(deg, "deg", knot, "knot", fpm, "fpm");
				daa.setWindVelocityFrom(windVelocity);
				return true;
			}
		} else {
			System.err.println("** Error: Daidalus is not initialized.");
		}
		return false;
	}

	public String jsonHeader () {
		String json = "";
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

	public boolean isBelowLLAThreshold(TrafficState ownship, TrafficState intruder) {
		// current intruder position
		Vect3 si = intruder.get_s(); // projected position of the intruder

		Position po = ownship.getPosition(); // ownship position in lat lon
		EuclideanProjection eprj = Projection.createProjection(po);
		LatLonAlt lla = eprj.inverse(si);
		Position px = Position.mkLatLonAlt(lla.lat(), lla.lon(), lla.alt());

		return Math.abs(Units.to("deg", px.lat())) < latlonThreshold 
				&& Math.abs(Units.to("deg", px.lon())) < latlonThreshold;
	}

	public void adjustThreshold () {
		String input = ifname;
		Daidalus daidalus = daa;
		DaidalusFileWalker walker = new DaidalusFileWalker(input);
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
	public LatLonAlt getLatLonAlt (Position pi, Position po) {
		if (pi.isLatLon()) {
			return pi.lla();
		}
		EuclideanProjection eprj = Projection.createProjection(po);
		return eprj.inverse(pi.vect3());
	}

	public String printPolygon (List<Position> ply, Position po) {
		String polygon = "";
		boolean comma = false;
		for (Position pi:ply) {
			LatLonAlt lla = getLatLonAlt(pi, po);
			String lat = llaFlag ? f.FmPrecision(Units.to("deg", lla.lat()) + latOffset, precision16)
					: f.FmPrecision(Units.to("deg", lla.lat()), precision16);
			String lon = llaFlag ? f.FmPrecision(Units.to("deg", lla.lon()) + lonOffset, precision16)
					: f.FmPrecision(Units.to("deg", lla.lon()), precision16);
			if (comma) {
				polygon += ",\n";
			} else {
				comma = true;
			}
			polygon += "\t\t{ \"lat\": \"" + lat;
			polygon += "\", \"lon\": \"" + lon; 
			polygon += "\", \"alt\": \"" + fmt(Units.to("ft", lla.alt()));
			polygon += "\" }";
		}
		polygon = "\t[\n" + polygon + "\n\t]";
		return polygon;
	}

	public String printPolygons (List<List<Position>> polygons, Position po) {
		String res = "";
		boolean comma = false;
		for (List<Position> ply : polygons) {
			if (comma) {
				res += ",\n";
			} else {
				comma = true;
			}
			res += printPolygon(ply, po);
		}
		return "[ \n" + res + "]";
	}

	public String fmt(double val) {
		return f.FmPrecision(val,precision);
	}

	public static String getCompatibleInternalUnit(String unit) {
		String internalunits[]  = {"m", "s", "rad", "m/s", "m/s^2", "rad/s"};
		for (int i=0; i < 6; ++i) {
			if (Units.isCompatible(unit,internalunits[i])) {
				return internalunits[i];
			}
		}
		return "";
	}

	public String jsonValUnits(String label, double val, String units) {
		String json = "";
		json += "\""+label+"\": { ";
		json += "\"val\": \"" + fmt(Units.to(units,val)) + "\"";
		json += ", \"units\": \"" + units + "\"";
		if (Units.getFactor(units) != 1.0) {
			json += ", \"internal\": \"" + fmt(val) + "\"";
			String internalunit = getCompatibleInternalUnit(units);
			if (!internalunit.isEmpty()) {
				json += ", \"internal_units\": \"" + internalunit + "\"";
			}
		}
		json += " }";
		return json;
	}

	public String jsonVect3(String label, Vect3 v) {
		String json = "";
		json += "\""+label+"\": { ";
		json += "\"x\": \"" + fmt(v.x) + "\"";
		json += ", \"y\": \"" + fmt(v.y) + "\"";
		json += ", \"z\": \"" + fmt(v.z) + "\"";
		json += " }";
		return json;
	}

	public String jsonAircraftState(TrafficState ac, boolean wind) {
		Velocity av = ac.getAirVelocity();
		Velocity gv = ac.getGroundVelocity();
		String json = "{ ";
		json += "\"id\": \""+ ac.getId()+"\"";
		json += ", "+jsonVect3("s",ac.get_s());
		json += ", "+jsonVect3("v",ac.get_v());
		json += ", "+jsonValUnits("altitude",ac.altitude(),alt_units);
		json += ", "+jsonValUnits("track",gv.compassAngle(),hdir_units);
		json += ", "+jsonValUnits("heading",av.compassAngle(),hdir_units);
		json += ", "+jsonValUnits("groundspeed",gv.gs(),hs_units);
		json += ", "+jsonValUnits("airspeed",av.gs(),hs_units);
		json += ", "+jsonValUnits("verticalspeed",ac.verticalSpeed(),vs_units);
		json += ", \"wind\": "+wind;
		json += " }";
		return json;
	}

	public String jsonAircraftMetrics(int ac_idx) {
		int alerter_idx = daa.alerterIndexBasedOnAlertingLogic(ac_idx);
		Alerter alerter = daa.getAlerterAt(alerter_idx);
		int corrective_level = daa.correctiveAlertLevel(alerter_idx);
		Detection3D detector = alerter.getDetector(corrective_level).get();
		double taumod = (detector instanceof WCV_tvar) ? daa.modifiedTau(ac_idx,((WCV_tvar)detector).getDTHR()) : Double.NaN;
		String json = "{ ";
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

	public String jsonBands (
			DAAMonitorsV2 monitors,
			List<String> ownshipArray, 
			List<String> alertsArray, 
			List<String> metricsArray, 
			List<String> trkArray, 
			List<String> gsArray, 
			List<String> vsArray,
			List<String> altArray, 
			List<String> resTrkArray, 
			List<String> resGsArray, 
			List<String> resVsArray, 
			List<String> resAltArray, 
			List<String> contoursArray, 
			List<String> hazardZonesArray,
			List<String> monitorM1Array, 
			List<String> monitorM2Array, 
			List<String> monitorM3Array, 
			List<String> monitorM4Array) {

		// ownship
		String time = fmt(daa.getCurrentTime());
		String own = "{ \"time\": " + time; 
		own += ", \"acstate\": " + jsonAircraftState(daa.getOwnshipState(), !daa.getWindVelocityTo().isZero());
		own += " }";
		ownshipArray.add(own);

		// traffic alerts
		String alerts = "{ \"time\": " + time + ", \"alerts\": [ ";
		for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
			int alerter_idx = daa.alerterIndexBasedOnAlertingLogic(ac);
			Alerter alerter = daa.getAlerterAt(alerter_idx);
			int alert_level = daa.alertLevel(ac);
			String ac_name = daa.getAircraftStateAt(ac).getId();
			if (ac > 1) { alerts += ", "; }
			alerts += "{ " + jsonString("ac",ac_name) 
					+ ", " + jsonInt("alert_level",alert_level) 
					+ ", " + jsonString("alert_region",daa.regionOfAlertLevel(alerter_idx,alert_level).toString())
					+ ", " + jsonString("alerter",alerter.getId())
					+ ", " + jsonInt("alerter_idx",alerter_idx)
					+ "}";
		}
		alerts += " ]}";
		alertsArray.add(alerts);

		// Traffic aircraft
		String traffic = "{ \"time\": " + time + ", \"aircraft\": [ ";
		for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
			if (ac > 1) { traffic += ", "; }
			traffic += "{ \"acstate\": " + jsonAircraftState(daa.getAircraftStateAt(ac), !daa.getWindVelocityTo().isZero());
			traffic += ", \"metrics\": " + jsonAircraftMetrics(ac);
			traffic += " }";
		}
		traffic += " ]}";
		metricsArray.add(traffic);

		// bands
		String trkBands = "{ \"time\": " + time;
		trkBands += ", \"bands\": [ ";
		for (int i = 0; i < daa.horizontalDirectionBandsLength(); i++) {
			trkBands += "{ \"range\": " + daa.horizontalDirectionIntervalAt(i, hdir_units);
			trkBands += ", \"units\": \"" +  hdir_units + "\"";
			trkBands += ", \"region\": \"" + daa.horizontalDirectionRegionAt(i) + "\" }";
			if (i < daa.horizontalDirectionBandsLength() - 1) { trkBands += ", "; }
		}
		trkBands += " ]}";
		trkArray.add(trkBands);

		String gsBands = "{ \"time\": " + time;
		gsBands += ", \"bands\": [ ";
		for (int i = 0; i < daa.horizontalSpeedBandsLength(); i++) {
			gsBands += "{ \"range\": " + daa.horizontalSpeedIntervalAt(i, hs_units);
			gsBands += ", \"units\": \"" + hs_units + "\"";
			gsBands += ", \"region\": \"" + daa.horizontalSpeedRegionAt(i) + "\" }";
			if (i < daa.horizontalSpeedBandsLength() - 1) { gsBands += ", "; }
		}
		gsBands += " ]}";
		gsArray.add(gsBands);

		String vsBands = "{ \"time\": " + time;
		vsBands += ", \"bands\": [ ";
		for (int i = 0; i < daa.verticalSpeedBandsLength(); i++) {
			vsBands += "{ \"range\": " + daa.verticalSpeedIntervalAt(i, vs_units);
			vsBands += ", \"units\": \"" + vs_units + "\"";
			vsBands += ", \"region\": \"" + daa.verticalSpeedRegionAt(i) + "\" }";
			if (i < daa.verticalSpeedBandsLength() - 1) { vsBands += ", "; }
		}
		vsBands += " ]}";
		vsArray.add(vsBands);

		String altBands = "{ \"time\": " + time;
		altBands += ", \"bands\": [ ";
		for (int i = 0; i < daa.altitudeBandsLength(); i++) {
			altBands += "{ \"range\": " + daa.altitudeIntervalAt(i, alt_units);
			altBands += ", \"units\": \"" + alt_units + "\"";
			altBands += ", \"region\": \"" + daa.altitudeRegionAt(i) + "\" }";
			if (i < daa.altitudeBandsLength() - 1) { altBands += ", "; }
		}
		altBands += " ]}";
		altArray.add(altBands);

		// resolutions
		String trkResolution = "{ \"time\": " + time;
		boolean preferredTrk = daa.preferredHorizontalDirectionRightOrLeft();
		double resTrk = daa.horizontalDirectionResolution(preferredTrk, hdir_units);
		double resTrk_sec = daa.horizontalDirectionResolution(!preferredTrk, hdir_units);
		double resTrkInternal = daa.horizontalDirectionResolution(preferredTrk);
		double resTrkInternal_sec = daa.horizontalDirectionResolution(!preferredTrk);
		BandsRegion resTrkRegion = daa.regionOfHorizontalDirection(resTrkInternal); // we want to use internal units here, to minimize round-off errors
		BandsRegion resTrkRegion_sec = daa.regionOfHorizontalDirection(resTrkInternal_sec); // we want to use internal units here, to minimize round-off errors
		TrafficState ownship = daa.getOwnshipState();
		double currentTrk = ownship.horizontalDirection(hdir_units);
		BandsRegion currentTrkRegion = daa.regionOfHorizontalDirection(ownship.horizontalDirection()); // we want to use internal units here, to minimize round-off errors
		boolean isConflict = !Double.isNaN(resTrkInternal);
		RecoveryInformation recoveryInfo = daa.horizontalDirectionRecoveryInformation();
		boolean isRecovery = recoveryInfo.recoveryBandsComputed();
		boolean isSaturated = recoveryInfo.recoveryBandsSaturated();
		String timeToRecovery = fmt(recoveryInfo.timeToRecovery());
		String nFactor = f.Fmi(recoveryInfo.nFactor());
		trkResolution += ", \"preferred_resolution\": { \"val\": \"" + fmt(resTrk) + "\", \"units\": \"" + hdir_units + "\", \"region\": \"" + resTrkRegion + "\" }"; // resolution can be number, NaN or infinity
		trkResolution += ", \"other_resolution\": { \"val\": \"" + fmt(resTrk_sec) + "\", \"units\": \"" + hdir_units + "\", \"region\": \"" + resTrkRegion_sec + "\" }"; // resolution can be number, NaN or infinity
		trkResolution += ", \"flags\": { \"conflict\": " + isConflict + ", \"recovery\": " + isRecovery + ", \"saturated\": " + isSaturated + ", \"preferred\": " + preferredTrk + " }"; 
		trkResolution += ", \"recovery\": { \"time\": \"" + timeToRecovery + "\", \"nfactor\": \"" + nFactor;
		trkResolution += "\", \"distance\": {"+jsonValUnits("horizontal",recoveryInfo.recoveryHorizontalDistance(),hrec_units); 
		trkResolution += ", "+jsonValUnits("vertical",recoveryInfo.recoveryVerticalDistance(),vrec_units)+"}}"; 
		trkResolution += ", \"ownship\": { \"val\": \"" + fmt(currentTrk) + "\", \"units\": \"" + hdir_units + "\", \"region\": \"" + currentTrkRegion + "\" }";
		trkResolution += " }";
		resTrkArray.add(trkResolution);

		String gsResolution = "{ \"time\": " + time;
		boolean preferredGs = daa.preferredHorizontalSpeedUpOrDown();
		double resGs = daa.horizontalSpeedResolution(preferredGs, hs_units);
		double resGs_sec = daa.horizontalSpeedResolution(!preferredGs, hs_units);
		double resGsInternal = daa.horizontalSpeedResolution(preferredGs);
		double resGsInternal_sec = daa.horizontalSpeedResolution(!preferredGs);
		BandsRegion resGsRegion = daa.regionOfHorizontalSpeed(resGsInternal); // we want to use internal units here, to minimize round-off errors
		BandsRegion resGsRegion_sec = daa.regionOfHorizontalSpeed(resGsInternal_sec); // we want to use internal units here, to minimize round-off errors
		double currentGs = ownship.horizontalSpeed(hs_units);
		BandsRegion currentGsRegion = daa.regionOfHorizontalSpeed(ownship.horizontalSpeed()); // we want to use internal units here, to minimize round-off errors
		isConflict = !Double.isNaN(resGsInternal);
		recoveryInfo = daa.horizontalSpeedRecoveryInformation();
		isRecovery = recoveryInfo.recoveryBandsComputed();
		isSaturated = recoveryInfo.recoveryBandsSaturated();
		timeToRecovery = fmt(recoveryInfo.timeToRecovery());
		nFactor = f.Fmi(recoveryInfo.nFactor());
		gsResolution += ", \"preferred_resolution\": { \"val\": \"" + fmt(resGs) + "\", \"units\": \"" + hs_units + "\", \"region\": \"" + resGsRegion + "\" }"; // resolution can be number, NaN or infinity
		gsResolution += ", \"other_resolution\": { \"val\": \"" + fmt(resGs_sec) + "\", \"units\": \"" + hs_units + "\", \"region\": \"" + resGsRegion_sec + "\" }"; // resolution can be number, NaN or infinity
		gsResolution += ", \"flags\": { \"conflict\": " + isConflict + ", \"recovery\": " + isRecovery + ", \"saturated\": " + isSaturated + ", \"preferred\": " + preferredGs + " }"; 
		gsResolution += ", \"recovery\": { \"time\": \"" + timeToRecovery + "\", \"nfactor\": \"" + nFactor;
		gsResolution += "\", \"distance\": {"+jsonValUnits("horizontal",recoveryInfo.recoveryHorizontalDistance(),hrec_units); 
		gsResolution += ", "+jsonValUnits("vertical",recoveryInfo.recoveryVerticalDistance(),vrec_units)+"}}"; 
		gsResolution += ", \"ownship\": { \"val\": \"" + fmt(currentGs) + "\", \"units\": \"" + hs_units + "\", \"region\": \"" + currentGsRegion + "\" }"; 
		gsResolution += " }";
		resGsArray.add(gsResolution);

		String vsResolution = "{ \"time\": " + time;
		boolean preferredVs = daa.preferredVerticalSpeedUpOrDown();
		double resVs = daa.verticalSpeedResolution(preferredVs, vs_units);
		double resVs_sec = daa.verticalSpeedResolution(!preferredVs, vs_units);
		double resVsInternal = daa.verticalSpeedResolution(preferredVs);
		double resVsInternal_sec = daa.verticalSpeedResolution(!preferredVs);
		BandsRegion resVsRegion = daa.regionOfVerticalSpeed(resVsInternal); // we want to use internal units here, to minimize round-off errors
		BandsRegion resVsRegion_sec = daa.regionOfVerticalSpeed(resVsInternal_sec); // we want to use internal units here, to minimize round-off errors
		double currentVs = ownship.verticalSpeed(vs_units);
		BandsRegion currentVsRegion = daa.regionOfVerticalSpeed(ownship.verticalSpeed()); // we want to use internal units here, to minimize round-off errors
		isConflict = !Double.isNaN(resVsInternal);
		recoveryInfo = daa.verticalSpeedRecoveryInformation();
		isRecovery = recoveryInfo.recoveryBandsComputed();
		isSaturated = recoveryInfo.recoveryBandsSaturated();
		timeToRecovery = fmt(recoveryInfo.timeToRecovery());
		nFactor = f.Fmi(recoveryInfo.nFactor());
		vsResolution += ", \"preferred_resolution\": { \"val\": \"" + fmt(resVs) + "\", \"units\": \"" + vs_units + "\", \"region\": \"" + resVsRegion + "\" }"; // resolution can be number, NaN or infinity
		vsResolution += ", \"other_resolution\": { \"val\": \"" + fmt(resVs_sec) + "\", \"units\": \"" + vs_units + "\", \"region\": \"" + resVsRegion_sec + "\" }"; // resolution can be number, NaN or infinity
		vsResolution += ", \"flags\": { \"conflict\": " + isConflict + ", \"recovery\": " + isRecovery + ", \"saturated\": " + isSaturated + ", \"preferred\": " + preferredVs + " }"; 
		vsResolution += ", \"recovery\": { \"time\": \"" + timeToRecovery + "\", \"nfactor\": \"" + nFactor;
		vsResolution += "\", \"distance\": {"+jsonValUnits("horizontal",recoveryInfo.recoveryHorizontalDistance(),hrec_units); 
		vsResolution += ", "+jsonValUnits("vertical",recoveryInfo.recoveryVerticalDistance(),vrec_units)+"}}"; 
		vsResolution += ", \"ownship\": { \"val\": \"" + fmt(currentVs) + "\", \"units\": \"" + vs_units + "\", \"region\": \"" + currentVsRegion + "\" }"; 
		vsResolution += " }";
		resVsArray.add(vsResolution);

		String altResolution = "{ \"time\": " + time;
		boolean preferredAlt = daa.preferredAltitudeUpOrDown();
		double resAlt = daa.altitudeResolution(preferredAlt, alt_units);
		double resAlt_sec = daa.altitudeResolution(!preferredAlt, alt_units);
		double resAltInternal = daa.altitudeResolution(preferredAlt); 
		double resAltInternal_sec = daa.altitudeResolution(!preferredAlt);
		BandsRegion resAltRegion = daa.regionOfAltitude(resAltInternal); // we want to use internal units here, to minimize round-off errors
		BandsRegion resAltRegion_sec = daa.regionOfAltitude(resAltInternal_sec); // we want to use internal units here, to minimize round-off errors
		double currentAlt = ownship.altitude(alt_units);
		BandsRegion currentAltRegion = daa.regionOfAltitude(ownship.altitude()); // we want to use internal units here, to minimize round-off errors
		isConflict = !Double.isNaN(resAltInternal);
		recoveryInfo = daa.altitudeRecoveryInformation();
		isRecovery = recoveryInfo.recoveryBandsComputed();
		isSaturated = recoveryInfo.recoveryBandsSaturated();
		timeToRecovery = fmt(recoveryInfo.timeToRecovery());
		nFactor = f.Fmi(recoveryInfo.nFactor());
		altResolution += ", \"preferred_resolution\": { \"val\": \"" + fmt(resAlt) + "\", \"units\": \"" + alt_units + "\", \"region\": \"" + resAltRegion + "\" }"; // resolution can be number, NaN or infinity
		altResolution += ", \"other_resolution\": { \"val\": \"" + fmt(resAlt_sec) + "\", \"units\": \"" + alt_units + "\", \"region\": \"" + resAltRegion_sec + "\" }"; // resolution can be number, NaN or infinity
		altResolution += ", \"flags\": { \"conflict\": " + isConflict + ", \"recovery\": " + isRecovery + ", \"saturated\": " + isSaturated + ", \"preferred\": " + preferredAlt + " }"; 
		altResolution += ", \"recovery\": { \"time\": \"" + timeToRecovery + "\", \"nfactor\": \"" + nFactor;
		altResolution += "\", \"distance\": {"+jsonValUnits("horizontal",recoveryInfo.recoveryHorizontalDistance(),hrec_units); 
		altResolution += ", "+jsonValUnits("vertical",recoveryInfo.recoveryVerticalDistance(),vrec_units)+"}}"; 
		altResolution += ", \"ownship\": { \"val\": \"" + fmt(currentAlt) + "\", \"units\": \"" + alt_units + "\", \"region\": \"" + currentAltRegion + "\" }";
		altResolution += " }";
		resAltArray.add(altResolution);

		// Contours and hazard zones are lists of polygons, and polygons are list of points.
		Position po = daa.getAircraftStateAt(0).getPosition();
		String contours =  "{ \"time\": " + time;
		contours += ",\n  \"data\": [ ";
		for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
			String ac_name = daa.getAircraftStateAt(ac).getId();
			List<List<Position>> polygons = new ArrayList<List<Position>>();
			daa.horizontalContours(polygons, ac);
			contours += "{ \"ac\": \"" + ac_name + "\",\n";
			contours +=	"  \"polygons\": " + printPolygons(polygons, po) + "}";
			if (ac < daa.lastTrafficIndex()) {
				contours += ", ";
			}
		}
		contours += " ]}";
		contoursArray.add(contours);

		String hazardZones =  "{ \"time\": " + time;
		hazardZones += ",\n  \"data\": [ ";
		for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
			String ac_name = daa.getAircraftStateAt(ac).getId();

			List<Position> ply_violation = new ArrayList<Position>();
			daa.horizontalHazardZone(ply_violation, ac, true, false);
			List<Position> ply_conflict = new ArrayList<Position>();
			daa.horizontalHazardZone(ply_conflict, ac, false, false);
			List<List<Position>> polygons = new ArrayList<List<Position>>();
			polygons.add(ply_violation);
			polygons.add(ply_conflict);

			hazardZones += "{ \"ac\": \"" + ac_name + "\",\n";
			hazardZones +=	"  \"polygons\": " + printPolygons(polygons, po) + "}";
			if (ac < daa.lastTrafficIndex()) {
				hazardZones += ", ";
			}
		}
		hazardZones += " ]}";
		hazardZonesArray.add(hazardZones);

		// monitors
		monitors.check(daa);
		String monitorM1 = "{ \"time\": " + time
				+ ", " + monitors.m1()
				+ " }";
		monitorM1Array.add(monitorM1);

		String monitorM2 = "{ \"time\": " + time
				+ ", " + monitors.m2()
				+ " }";
		monitorM2Array.add(monitorM2);

		String monitorM3 = "{ \"time\": " + time
				+ ", " + monitors.m3(daa)
				+ " }";
		monitorM3Array.add(monitorM3);

		String monitorM4 = "{ \"time\": " + time
				+ ", " + monitors.m4(daa)
				+ " }";
		monitorM4Array.add(monitorM4);

		// config
		String stats = "\"hs\": { \"min\": " + fmt(daa.getMinHorizontalSpeed(hs_units)) 
		+ ", \"max\": " + fmt(daa.getMaxHorizontalSpeed(hs_units)) 
		+ ", \"units\": \"" + hs_units + "\" },\n"
		+ "\"vs\": { \"min\": " + fmt(daa.getMinVerticalSpeed(vs_units))
		+ ", \"max\": " + fmt(daa.getMaxVerticalSpeed(vs_units))
		+ ", \"units\": \"" + vs_units + "\" },\n"
		+ "\"alt\": { \"min\": " + fmt(daa.getMinAltitude(alt_units))
		+ ", \"max\": " + fmt(daa.getMaxAltitude(alt_units))
		+ ", \"units\": \"" + alt_units + "\" },\n"
		+ "\"MostSevereAlertLevel\": \"" + f.Fmi(daa.mostSevereAlertLevel(1)) + "\"";
		return stats;
	}

	public void walkFile () {
		if (ifname == "" || ifname == null) {
			System.err.println("** Error: Please specify a daa file");
			System.exit(1);
		}
		if (!inputFileReadable()) {
			System.err.println("** Error: File " + getInputFileName() + " cannot be read");
			System.exit(1);
		}

		createPrintWriter();

		/* Create DaidalusFileWalker */
		DaidalusFileWalker walker = new DaidalusFileWalker(ifname);

		printWriter.println("{\n" + jsonHeader());

		List<String> trkArray = new ArrayList<String>();
		List<String> gsArray = new ArrayList<String>();
		List<String> vsArray = new ArrayList<String>();
		List<String> altArray = new ArrayList<String>();
		List<String> alertsArray = new ArrayList<String>();
		List<String> ownshipArray = new ArrayList<String>();
		List<String> metricsArray = new ArrayList<String>();

		List<String> resTrkArray = new ArrayList<String>();
		List<String> resGsArray = new ArrayList<String>();
		List<String> resVsArray = new ArrayList<String>();
		List<String> resAltArray = new ArrayList<String>();

		List<String> contoursArray = new ArrayList<String>();
		List<String> hazardZonesArray = new ArrayList<String>();

		DAAMonitorsV2 monitors = new DAAMonitorsV2();

		List<String> monitorM1Array = new ArrayList<String>();
		List<String> monitorM2Array = new ArrayList<String>();
		List<String> monitorM3Array = new ArrayList<String>();
		List<String> monitorM4Array = new ArrayList<String>();

		String jsonStats = null;

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

		printWriter.println(jsonStats + ",");

		printArray(printWriter, ownshipArray, "Ownship");
		printWriter.println(",");
		printArray(printWriter, alertsArray, "Alerts");
		printWriter.println(",");
		printArray(printWriter, metricsArray, "Metrics");
		printWriter.println(",");
		printArray(printWriter, trkArray, "Heading Bands");
		printWriter.println(",");
		printArray(printWriter, gsArray, "Horizontal Speed Bands");
		printWriter.println(",");
		printArray(printWriter, vsArray, "Vertical Speed Bands");
		printWriter.println(",");
		printArray(printWriter, altArray, "Altitude Bands");
		printWriter.println(",");
		printArray(printWriter, resTrkArray, "Horizontal Direction Resolution");
		printWriter.println(",");
		printArray(printWriter, resGsArray, "Horizontal Speed Resolution");
		printWriter.println(",");
		printArray(printWriter, resVsArray, "Vertical Speed Resolution");
		printWriter.println(",");
		printArray(printWriter, resAltArray, "Altitude Resolution");
		printWriter.println(",");

		printArray(printWriter, contoursArray, "Contours");
		printWriter.println(",");
		printArray(printWriter, hazardZonesArray, "Hazard Zones");
		printWriter.println(",");

		printWriter.println("\"Monitors\": ");
		List<List<String>> info = new ArrayList<List<String>>();
		info.add(monitorM1Array);
		info.add(monitorM2Array);
		info.add(monitorM3Array);
		info.add(monitorM4Array);
		printMonitors(printWriter, monitors, info);

		printWriter.println("}");

		closePrintWriter();
	}

	public static String getFileName (String fname) {
		if (fname != null && fname.contains("/")) {
			String[] comp = fname.split("/");
			return comp[comp.length - 1];
		}
		return fname;
	}

	public static String removeExtension (String fname) {
		return fname != null && fname.contains(".") ? 
				fname.substring(0, fname.lastIndexOf('.')) 
				: fname;
	}

	public String getVersion () {
		return VERSION;
	}

	public DAABandsV2 parseCliArgs (String[] args) {
		if (args != null && args.length == 0) {
			printHelpMsg();
			System.exit(0);
		}
		for (int a = 0; a < args.length; a++) {
			if (args[a].equals("--help") || args[a].equals("-help") || args[a].equals("-h")) {
				printHelpMsg();
				System.exit(0);
			} else if (args[a].startsWith("--list-monitors") || args[a].startsWith("-list-monitors")) {
				System.out.println(printMonitorList());
				System.exit(0);
			} else if (args[a].startsWith("--version") || args[a].startsWith("-version")) {
				System.out.println(getVersion());
				System.exit(0);
			} else if (a < args.length - 1 && (args[a].startsWith("--prec") || args[a].startsWith("-prec") || args[a].equals("-p"))) {
				precision = Integer.parseInt(args[++a]);
			} else if (a < args.length - 1 && (args[a].startsWith("--conf") || args[a].startsWith("-conf") || args[a].equals("-c"))) {
				daaConfig = args[++a];
			} else if (a < args.length - 1 && (args[a].startsWith("--out") || args[a].startsWith("-out") || args[a].equals("-o"))) {
				ofname = args[++a];
			} else if (a < args.length - 1 && (args[a].startsWith("-wind") || args[a].startsWith("--wind"))) {
				wind = args[++a];
			} else if (args[a].startsWith("-")) {
				System.err.println("** Warning: Invalid option (" + args[a] + ")");
			} else {
				ifname = args[a];
			}
		}
		scenario = removeExtension(getFileName(ifname));
		if (ofname == null) {
			ofname = scenario + ".json";
		}
		return this;
	}

	public boolean inputFileReadable () {
		String inputFile = getInputFileName();
		File file = new File(inputFile);
		if (!file.exists() || !file.canRead()) {
			return false;
		}
		return true;
	}

	public boolean createPrintWriter () {
		try {
			printWriter = new PrintWriter(new BufferedWriter(new FileWriter(ofname)),true);
			System.out.println("Creating output file " + ofname);
		} catch (Exception e) {
			System.err.println("** Error: " + e);
			return false;
		}
		return true;
	}
	public boolean closePrintWriter () {
		if (printWriter != null) {
			printWriter.close();
			return true;
		}
		return false;
	}

	public static void main(String[] args) {
		DAABandsV2 daaBands = new DAABandsV2();
		daaBands.parseCliArgs(args);
		daaBands.adjustThreshold();
		daaBands.loadConfig();
		daaBands.loadWind();
		daaBands.walkFile();
	}

}
