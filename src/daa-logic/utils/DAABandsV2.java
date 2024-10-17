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
import java.util.Optional;

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

class JsonBands {
	public DAAMonitorsV2 monitors;
	public List<String> ownshipArray;
	public List<String> alertsArray;
	public List<String> metricsArray; 
	public List<String> windVectorsArray; 
	public List<String> trkArray;
	public List<String> gsArray;
	public List<String> vsArray;
	public List<String> altArray; 
	public List<String> resTrkArray; 
	public List<String> resGsArray;
	public List<String> resVsArray; 
	public List<String> resAltArray; 
	public List<String> contoursArray;
	public List<String> hazardZonesArray;
	public List<String> monitorM1Array;
	public List<String> monitorM2Array; 
	public List<String> monitorM3Array; 
	public List<String> monitorM4Array;

	/**
	 * Constructor
	 */
	public JsonBands () {
		trkArray = new ArrayList<String>();
		gsArray = new ArrayList<String>();
		vsArray = new ArrayList<String>();
		altArray = new ArrayList<String>();
		alertsArray = new ArrayList<String>();

		windVectorsArray = new ArrayList<String>();

		ownshipArray = new ArrayList<String>();
		metricsArray = new ArrayList<String>();

		resTrkArray = new ArrayList<String>();
		resGsArray = new ArrayList<String>();
		resVsArray = new ArrayList<String>();
		resAltArray = new ArrayList<String>();

		contoursArray = new ArrayList<String>();
		hazardZonesArray = new ArrayList<String>();

		monitors = new DAAMonitorsV2();
		monitorM1Array = new ArrayList<String>();
		monitorM2Array = new ArrayList<String>();
		monitorM3Array = new ArrayList<String>();
		monitorM4Array = new ArrayList<String>();
	}
}

public class DAABandsV2 {

	protected static final int precision16 = 16;
	protected static final String tool_name = "DAABandsV2";
	protected static final double latOffset = 37.0298687;
	protected static final double lonOffset = -76.3452218;
	protected static final double latlonThreshold = 0.3;

	// these two flags are used to enable/disable printing of metrics and polygons
	// disabling printing of metrics and polygons does not affect the computation of bands and will improve performance
	protected boolean PRINT_METRICS = true;
	protected boolean PRINT_POLYGONS = true;

	// the following flag and offset are introduced to avoid a region 
	// in the atlantic ocean where worldwind is unable to render maps at certain zoom levels
	// (all rendering layers disappear in that region when the zoom level is below ~2.5NMI)
	protected boolean llaFlag = false;

	protected String daaConfig = null;
	protected String daaAlerter = null;
	protected String scenario = null;
	protected String ofname = null; // output file name
	protected String ifname = null; // input file name
	protected int    precision = 2; // Precision of printed outputs
	protected String ownshipName = null; // ownship name

	/* Units are loaded from configuration file */
	protected String hs_units = "m/s";
	protected String vs_units = "m/s";
	protected String alt_units = "m";
	protected String hdir_units = "deg";
	protected String hrec_units = "m";
	protected String vrec_units = "m";
	protected String time_units = "s";

	protected String wind = null; // constant wind field, specified from the command line, overrides wind vectors
	protected String wind_deg = "0";
	protected String wind_knot = "0";
	protected Velocity windVelocity = null;

	// printWriter creates a single file with all the data.
	protected PrintWriter printWriter = null;
	// these additional printers break down the output into smaller chunks, useful for handling large datasets.
	protected PrintWriter printWriterFiles = null; // the list of output files
	protected PrintWriter printWriterInfo = null; // .info file
	protected PrintWriter printWriterOwnship = null; // .ownship file
	protected PrintWriter printWriterAlerts = null; // .alerts file
	protected PrintWriter printWriterWind = null; // .wind file
	protected PrintWriter printWriterMetrics = null; // .metrics file
	protected PrintWriter printWriterMonitors = null; // .monitors file
	protected PrintWriter printWriterAltBands = null; // .alt-bands file
	protected PrintWriter printWriterVsBands = null; // .vs-bands file
	protected PrintWriter printWriterHsBands = null; // .hs-bands file
	protected PrintWriter printWriterHdBands = null; // .hd-bands file
	protected PrintWriter printWriterAltRes = null; // .alt-res file
	protected PrintWriter printWriterVsRes = null; // .vs-res file
	protected PrintWriter printWriterHsRes = null; // .hs-res file
	protected PrintWriter printWriterHdRes = null; // .hd-res file
	protected PrintWriter printWriterContours = null; // .contours file
	protected PrintWriter printWriterHazardZones = null; // .hazardzones file
	protected String chunks[] = {
		".info", ".ownship", ".alerts", ".wind", ".metrics", ".monitors", 
		".hd-bands", ".vs-bands", ".hs-bands", ".alt-bands",
		".hd-res", ".vs-res", ".hs-res", ".alt-res",
		".contours", ".hazardzones"
	};

	public boolean PROFILER_ENABLED = false;
	protected DAAProfiler profiler = null;

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
		return getFileName(daaConfig);
	}

	public String getOutputFileName() {
		return ofname;
	}

	public String getInputFileName() {
		return ifname;
	}

	/**
	 * Prints usage instructions
	 */
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
		System.out.println("  --alerter <alerter_name>\n\tSelects the given alerter for all aircraft");
		System.out.println("  --wind <wind_info>\n\tLoad wind vector information, a JSON object enclosed in double quotes \"{ deg: d, knot: m }\", where d and m are reals");
		System.out.println("  --output <file.json>\n\tOutput file <file.json>");
		System.out.println("  --ownship <tailnumber>\n\tOwnship name (tail number)");
		System.out.println("  --list-monitors\n\tReturns the list of available monitors, in JSON format");
		System.out.println("  --list-alerters <file.conf>\nReturns the list of alerters for a given configuration, in JSON format");
		System.out.println("  --profiler-on\n\tTurns on profiling");
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

	/**
	 * Returns the list of alerters in json format
	 */
	public String printAlerters() {
		int n = daa.numberOfAlerters();
		String res = "";
		for (int i = 0; i < n; i++) {
			// alerter numbers are 1-based
			res += "{ \"index\": " + (i + 1) + ", \"alerter\": \"" + daa.getAlerterAt(i + 1).getId() + "\" }";
			if (i < n - 1) { res += ", "; }
		}
		return "[ " + res + " ]";
	}

	/**
	 * Utility function, prints the loaded configuration parameters
	 */
	public String printConfig () {
		return daa.getParameterData().toString();
	}

	/**
	 * Utility function, prints parameters data
	 */
	public String printParameters() {
		if (daa != null && daa.getParameterData() != null) { 
			return daa.getParameterData().toString();
		}
		return null;
	}

	/**
	 * Utility function, prints a list on 'out' as a JSON array
	 */
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
	/**
	 * Utility function, prints each element in the list on 'out' as a separate line
	 */
	public static void printArray(PrintWriter out, List<String> info) {
		for (String str : info) {
			out.println(str);
		}
	}

	public static void printMonitors (PrintWriter out, DAAMonitorsV2 monitors, List<List<String>> info) {
		out.println("[ ");
		int len = DAAMonitorsV2.getSize();
		for (int i = 0; i < len; i++) {
			int monitorID = i + 1;
			String legend = DAAMonitorsV2.getLegend(monitorID);
			String color = monitors.getColor(monitorID);
			String label = DAAMonitorsV2.getLabel(monitorID);
			out.print("{ \"id\": \"" + monitorID + "\", ");
			out.print("\"name\": \"" + label + "\", ");
			out.print("\"color\": \"" + color + "\", ");
			out.print("\"legend\": " + legend + ",\n");
			printArray(out, info.get(i), "results");
			if (i < len - 1) {
				out.println("}\n,");
			} else {
				out.println("} ");
			}
		}
		out.println(" ]");
	}

	/**
	 * Utility function, loads the configuration indicated in daaConfig
	 */
	public boolean loadConfig () {
		if (daa != null) {
			if (daaConfig != null) {
				boolean paramLoaded = daa.loadFromFile(daaConfig);
				if (paramLoaded && daa.numberOfAlerters() > 0) {
					System.out.println("** Configuration file " + daaConfig + " loaded successfully!");
					hs_units = daa.getUnitsOf("step_hs");
					vs_units = daa.getUnitsOf("step_vs");
					alt_units = daa.getUnitsOf("step_alt");
					hrec_units = daa.getUnitsOf("min_horizontal_recovery");
					vrec_units = daa.getUnitsOf("min_vertical_recovery");
					return true;
				} else {
					System.err.println("** Error: Configuration file " + daaConfig + " could not be loaded.");
				}
			} else {
				System.err.println("** Error: Configuration file not specified.");
			}
		} else {
			System.err.println("** Error: Daidalus is not initialized.");
		}
		return false;
	}
	/**
	 * Utility function, selects the alerter indicated in daaAlerter
	 */
	public boolean loadSelectedAlerter () {
		if (daa != null) {
			// set alerter for ownship and traffic if an alerter has been specified at the command line
			if (daaAlerter != null) {
				daa.setAlerter(0, daaAlerter);
				daa.setOwnshipCentricAlertingLogic();
			}
		} else {
			System.err.println("** Error: Daidalus is not initialized.");
		}
		return false;
	}
	/**
	 * Utility function, loads wind data in the daa object from data indicated in the '-wind' parameter specified at the command line
	 */
	public boolean loadWind () {
		readWind();
		return loadWindVelocity();
	}
	/**
	 * Utility function, reads wind data indicated in the '-wind' parameter from command line
	 */
	public Velocity readWind () {
		if (daa != null) {
			if (wind != null) {
				double deg = 0;
				double knot = 0;
				double fpm = 0;
				java.util.regex.Matcher match_deg = java.util.regex.Pattern.compile("\\bdeg\\s*:\\s*(\\+?\\-?\\d+(?:.\\d+)?)").matcher(wind);
				if (match_deg.find()) {
					wind_deg = match_deg.group(1);
					deg = Double.parseDouble(wind_deg);
				}
				java.util.regex.Matcher match_knot = java.util.regex.Pattern.compile("\\bknot\\s*:\\s*(\\+?\\-?\\d+(?:.\\d+)?)").matcher(wind);
				if (match_knot.find()) {
					wind_knot = match_knot.group(1);
					knot = Double.parseDouble(wind_knot);
				}
				// set the wind only if either direction or intensity are different than 0
				if (knot != 0 || deg != 0) {
					windVelocity = Velocity.makeTrkGsVs(deg, "deg", knot, "knot", fpm, "fpm");
					return windVelocity;
				}
				// else
				wind = null;
			}
		} else {
			System.err.println("** Error: Daidalus is not initialized.");
		}
		return null;
	}
	/**
	 * Utility function, sets the wind velocity in the daa object
	 */
	public boolean loadWindVelocity () {
		if (windVelocity != null) {
			daa.setWindVelocityFrom(windVelocity);
			return true;
		}
		return false;
	}

	public String jsonHeader () {
		String json = "";
		json += "\"Info\": { \"language\": \"Java\", \"version\": \"" + getVersion() + "\""; 
		json +=	", \"configuration\": \"" + getConfig()+ "\"";
		if (daaAlerter != null) { json +=	", \"alerter\": \"" + daaAlerter + "\""; }
		json += " },\n";
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

	// @deprecated, this function was need for WWD, with LeafletJS this fix is not needed anymore
	public void adjustThreshold () {
		// String input = ifname;
		// Daidalus daidalus = daa;
		// DaidalusFileWalker walker = new DaidalusFileWalker(input);
		// if (this.ownshipName != null) { walker.setOwnship(ownshipName); }
		// while (!walker.atEnd()) {
		// 	walker.readState(daidalus);
		// 	TrafficState ownship = daidalus.getOwnshipState();
		// 	if (isBelowLLAThreshold(ownship, ownship)) {
		// 		llaFlag = true;
		// 		//System.out.println("LLA flag is TRUE");
		// 		return;
		// 	}
		// 	for (int idx = 0; idx <= daidalus.lastTrafficIndex(); idx++) {
		// 		TrafficState traffic = daidalus.getAircraftStateAt(idx);
		// 		if (isBelowLLAThreshold(ownship, traffic)) {
		// 			llaFlag = true;
		// 			//System.out.println("LLA flag is TRUE");
		// 			return;
		// 		}
		// 	}
		// }
		// //System.out.println("LLA flag is FALSE");
		// llaFlag = false;
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
				polygon += ", ";
			} else {
				comma = true;
			}
			polygon += "{ \"lat\": \"" + lat;
			polygon += "\", \"lon\": \"" + lon; 
			polygon += "\", \"alt\": \"" + fmt(Units.to("ft", lla.alt()));
			polygon += "\" }";
		}
		polygon = "[" + polygon + "]";
		return polygon;
	}

	public String printPolygons (List<List<Position>> polygons, Position po) {
		String res = "";
		boolean comma = false;
		for (List<Position> ply : polygons) {
			if (comma) {
				res += ", ";
			} else {
				comma = true;
			}
			res += printPolygon(ply, po);
		}
		return "[ " + res + " ]";
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

	public String jsonValueRegion(String label, double val, String units, BandsRegion region) {
		String json = "\""+label+"\": {";
		json += jsonValUnits("valunit",val,units);
		json += ", "+jsonString("region",region.toString());
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
		json += ", "+jsonValUnits("heading",ac.horizontalDirection(),hdir_units);
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
		Optional<Detection3D> d3d = alerter.getDetector(corrective_level);
		Detection3D detector = d3d.get();
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

	/**
	 * Utility function, performs tha computation of bands polygons and metrics
	 */
	public String jsonBands (JsonBands jb) {

		// ownship
		TrafficState ownship = daa.getOwnshipState();
		String time = fmt(daa.getCurrentTime());
		String own = "{ \"time\": " + time; 
		own += ", \"acstate\": " + jsonAircraftState(daa.getOwnshipState(), !daa.getWindVelocityTo().isZero());
		BandsRegion currentTrkRegion = daa.regionOfHorizontalDirection(ownship.horizontalDirection()); 
		own += ", "+jsonString("trk_region",currentTrkRegion.toString());
		BandsRegion currentGsRegion = daa.regionOfHorizontalSpeed(ownship.horizontalSpeed()); 
		own += ", "+jsonString("gs_region",currentGsRegion.toString());
		BandsRegion currentVsRegion = daa.regionOfVerticalSpeed(ownship.verticalSpeed()); 
		own += ", "+jsonString("vs_region",currentVsRegion.toString());
		BandsRegion currentAltRegion = daa.regionOfAltitude(ownship.altitude()); 
		own += ", "+jsonString("alt_region",currentAltRegion.toString());
		own += " }";
		jb.ownshipArray.add(own);

		// wind vectors
		Velocity wv = daa.getWindVelocityFrom();
		String windVectors = "{ \"time\": " + time; 
		windVectors += ", \"deg\": \"" + fmt(wv.compassAngle("deg")) + "\"";
		windVectors += ", \"knot\": \"" + fmt(wv.groundSpeed("knot"))  + "\"";
		windVectors += " }";
		jb.windVectorsArray.add(windVectors);

		// traffic alerts
		String alerts = "{ \"time\": " + time + ", \"alerts\": [ ";
		for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
			int alerter_idx = daa.alerterIndexBasedOnAlertingLogic(ac);
			Alerter alerter = daa.getAlerterAt(alerter_idx);
			int alert_level = daa.alertLevel(ac);
			BandsRegion alert_region = BandsRegion.UNKNOWN;
			if (alert_level == 0) {
				alert_region = BandsRegion.NONE;
			} else {
				alert_region = daa.regionOfAlertLevel(alerter_idx,alert_level);
			}
			String ac_name = daa.getAircraftStateAt(ac).getId();
			if (ac > 1) { alerts += ", "; }
			alerts += "{ " + jsonString("ac",ac_name) 
			+ ", " + jsonInt("alert_level",alert_level) 
			+ ", " + jsonString("alert_region",alert_region.toString())
			+ ", " + jsonString("alerter",alerter.getId())
			+ ", " + jsonInt("alerter_idx",alerter_idx)
			+ "}";
		}
		alerts += " ]}";
		jb.alertsArray.add(alerts);

		// Traffic aircraft
		String traffic = "{ \"time\": " + time + ", \"aircraft\": [ ";
		if (PRINT_METRICS) {
			for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
				if (ac > 1) { traffic += ", "; }
				traffic += "{ \"acstate\": " + jsonAircraftState(daa.getAircraftStateAt(ac), !daa.getWindVelocityTo().isZero());
				traffic += ", \"metrics\": " + jsonAircraftMetrics(ac);
				traffic += " }";
			}
		}
		traffic += " ]}";
		jb.metricsArray.add(traffic);

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
		jb.trkArray.add(trkBands);

		String gsBands = "{ \"time\": " + time;
		gsBands += ", \"bands\": [ ";
		for (int i = 0; i < daa.horizontalSpeedBandsLength(); i++) {
			gsBands += "{ \"range\": " + daa.horizontalSpeedIntervalAt(i, hs_units);
			gsBands += ", \"units\": \"" + hs_units + "\"";
			gsBands += ", \"region\": \"" + daa.horizontalSpeedRegionAt(i) + "\" }";
			if (i < daa.horizontalSpeedBandsLength() - 1) { gsBands += ", "; }
		}
		gsBands += " ]}";
		jb.gsArray.add(gsBands);

		String vsBands = "{ \"time\": " + time;
		vsBands += ", \"bands\": [ ";
		for (int i = 0; i < daa.verticalSpeedBandsLength(); i++) {
			vsBands += "{ \"range\": " + daa.verticalSpeedIntervalAt(i, vs_units);
			vsBands += ", \"units\": \"" + vs_units + "\"";
			vsBands += ", \"region\": \"" + daa.verticalSpeedRegionAt(i) + "\" }";
			if (i < daa.verticalSpeedBandsLength() - 1) { vsBands += ", "; }
		}
		vsBands += " ]}";
		jb.vsArray.add(vsBands);

		String altBands = "{ \"time\": " + time;
		altBands += ", \"bands\": [ ";
		for (int i = 0; i < daa.altitudeBandsLength(); i++) {
			altBands += "{ \"range\": " + daa.altitudeIntervalAt(i, alt_units);
			altBands += ", \"units\": \"" + alt_units + "\"";
			altBands += ", \"region\": \"" + daa.altitudeRegionAt(i) + "\" }";
			if (i < daa.altitudeBandsLength() - 1) { altBands += ", "; }
		}
		altBands += " ]}";
		jb.altArray.add(altBands);

		// resolutions
		String trkResolution = "{ \"time\": " + time;
		boolean preferredTrk = daa.preferredHorizontalDirectionRightOrLeft();
		double resTrk = daa.horizontalDirectionResolution(preferredTrk);
		double resTrk_sec = daa.horizontalDirectionResolution(!preferredTrk);
		BandsRegion resTrkRegion = daa.regionOfHorizontalDirection(resTrk); 
		BandsRegion resTrkRegion_sec = daa.regionOfHorizontalDirection(resTrk_sec); 
		boolean isConflict = !Double.isNaN(resTrk);
		RecoveryInformation recoveryInfo = daa.horizontalDirectionRecoveryInformation();
		boolean isRecovery = recoveryInfo.recoveryBandsComputed();
		boolean isSaturated = recoveryInfo.recoveryBandsSaturated();
		String timeToRecovery = fmt(recoveryInfo.timeToRecovery());
		String nFactor = f.Fmi(recoveryInfo.nFactor());
		trkResolution += ", "+jsonValueRegion("preferred_resolution",resTrk,hdir_units,resTrkRegion);
		trkResolution += ", "+jsonValueRegion("other_resolution",resTrk_sec,hdir_units,resTrkRegion_sec);
		trkResolution += ", \"flags\": { \"conflict\": " + isConflict + ", \"recovery\": " + isRecovery + ", \"saturated\": " + isSaturated + ", \"preferred\": " + preferredTrk + " }"; 
		trkResolution += ", \"recovery\": { \"time\": \"" + timeToRecovery + "\", \"nfactor\": \"" + nFactor;
		trkResolution += "\", \"distance\": {"+jsonValUnits("horizontal",recoveryInfo.recoveryHorizontalDistance(),hrec_units); 
		trkResolution += ", "+jsonValUnits("vertical",recoveryInfo.recoveryVerticalDistance(),vrec_units)+"}}"; 
		trkResolution += " }";
		jb.resTrkArray.add(trkResolution);

		String gsResolution = "{ \"time\": " + time;
		boolean preferredGs = daa.preferredHorizontalSpeedUpOrDown();
		double resGs = daa.horizontalSpeedResolution(preferredGs);
		double resGs_sec = daa.horizontalSpeedResolution(!preferredGs);
		BandsRegion resGsRegion = daa.regionOfHorizontalSpeed(resGs); // we want to use internal units here, to minimize round-off errors
		BandsRegion resGsRegion_sec = daa.regionOfHorizontalSpeed(resGs_sec); // we want to use internal units here, to minimize round-off errors
		isConflict = !Double.isNaN(resGs);
		recoveryInfo = daa.horizontalSpeedRecoveryInformation();
		isRecovery = recoveryInfo.recoveryBandsComputed();
		isSaturated = recoveryInfo.recoveryBandsSaturated();
		timeToRecovery = fmt(recoveryInfo.timeToRecovery());
		nFactor = f.Fmi(recoveryInfo.nFactor());
		gsResolution += ", "+jsonValueRegion("preferred_resolution",resGs,hs_units,resGsRegion);
		gsResolution += ", "+jsonValueRegion("other_resolution",resGs_sec,hs_units,resGsRegion_sec);
		gsResolution += ", \"flags\": { \"conflict\": " + isConflict + ", \"recovery\": " + isRecovery + ", \"saturated\": " + isSaturated + ", \"preferred\": " + preferredGs + " }"; 
		gsResolution += ", \"recovery\": { \"time\": \"" + timeToRecovery + "\", \"nfactor\": \"" + nFactor;
		gsResolution += "\", \"distance\": {"+jsonValUnits("horizontal",recoveryInfo.recoveryHorizontalDistance(),hrec_units); 
		gsResolution += ", "+jsonValUnits("vertical",recoveryInfo.recoveryVerticalDistance(),vrec_units)+"}}"; 
		gsResolution += " }";
		jb.resGsArray.add(gsResolution);

		String vsResolution = "{ \"time\": " + time;
		boolean preferredVs = daa.preferredVerticalSpeedUpOrDown();
		double resVs = daa.verticalSpeedResolution(preferredVs);
		double resVs_sec = daa.verticalSpeedResolution(!preferredVs);
		BandsRegion resVsRegion = daa.regionOfVerticalSpeed(resVs); // we want to use internal units here, to minimize round-off errors
		BandsRegion resVsRegion_sec = daa.regionOfVerticalSpeed(resVs_sec); // we want to use internal units here, to minimize round-off errors
		isConflict = !Double.isNaN(resVs);
		recoveryInfo = daa.verticalSpeedRecoveryInformation();
		isRecovery = recoveryInfo.recoveryBandsComputed();
		isSaturated = recoveryInfo.recoveryBandsSaturated();
		timeToRecovery = fmt(recoveryInfo.timeToRecovery());
		nFactor = f.Fmi(recoveryInfo.nFactor());
		vsResolution += ", "+jsonValueRegion("preferred_resolution",resVs,vs_units,resVsRegion);
		vsResolution += ", "+jsonValueRegion("other_resolution",resVs_sec,vs_units,resVsRegion_sec);
		vsResolution += ", \"flags\": { \"conflict\": " + isConflict + ", \"recovery\": " + isRecovery + ", \"saturated\": " + isSaturated + ", \"preferred\": " + preferredVs + " }"; 
		vsResolution += ", \"recovery\": { \"time\": \"" + timeToRecovery + "\", \"nfactor\": \"" + nFactor;
		vsResolution += "\", \"distance\": {"+jsonValUnits("horizontal",recoveryInfo.recoveryHorizontalDistance(),hrec_units); 
		vsResolution += ", "+jsonValUnits("vertical",recoveryInfo.recoveryVerticalDistance(),vrec_units)+"}}"; 
		vsResolution += " }";
		jb.resVsArray.add(vsResolution);

		String altResolution = "{ \"time\": " + time;
		boolean preferredAlt = daa.preferredAltitudeUpOrDown();
		double resAlt = daa.altitudeResolution(preferredAlt);
		double resAlt_sec = daa.altitudeResolution(!preferredAlt);
		BandsRegion resAltRegion = daa.regionOfAltitude(resAlt); // we want to use internal units here, to minimize round-off errors
		BandsRegion resAltRegion_sec = daa.regionOfAltitude(resAlt_sec); // we want to use internal units here, to minimize round-off errors
		isConflict = !Double.isNaN(resAlt);
		recoveryInfo = daa.altitudeRecoveryInformation();
		isRecovery = recoveryInfo.recoveryBandsComputed();
		isSaturated = recoveryInfo.recoveryBandsSaturated();
		timeToRecovery = fmt(recoveryInfo.timeToRecovery());
		nFactor = f.Fmi(recoveryInfo.nFactor());
		altResolution += ", "+jsonValueRegion("preferred_resolution",resAlt,alt_units,resAltRegion);
		altResolution += ", "+jsonValueRegion("other_resolution",resAlt_sec,alt_units,resAltRegion_sec);
		altResolution += ", \"flags\": { \"conflict\": " + isConflict + ", \"recovery\": " + isRecovery + ", \"saturated\": " + isSaturated + ", \"preferred\": " + preferredAlt + " }"; 
		altResolution += ", \"recovery\": { \"time\": \"" + timeToRecovery + "\", \"nfactor\": \"" + nFactor;
		altResolution += "\", \"distance\": {"+jsonValUnits("horizontal",recoveryInfo.recoveryHorizontalDistance(),hrec_units); 
		altResolution += ", "+jsonValUnits("vertical",recoveryInfo.recoveryVerticalDistance(),vrec_units)+"}}"; 
		altResolution += " }";
		jb.resAltArray.add(altResolution);

		// Contours and hazard zones are lists of polygons, and polygons are list of points.
		Position po = daa.getAircraftStateAt(0).getPosition();
		String contours =  "{ \"time\": " + time;
		contours += ",  \"data\": [ ";
		for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
			String ac_name = daa.getAircraftStateAt(ac).getId();
			List<List<Position>> polygons = new ArrayList<List<Position>>();
			if (PRINT_POLYGONS) { daa.horizontalContours(polygons, ac); }
			contours += "{ \"ac\": \"" + ac_name + "\", ";
			contours +=	"  \"polygons\": " + printPolygons(polygons, po) + "}";
			if (ac < daa.lastTrafficIndex()) {
				contours += ", ";
			}
		}
		contours += " ]}";
		jb.contoursArray.add(contours);

		String hazardZones =  "{ \"time\": " + time;
		hazardZones += ",  \"data\": [ ";
		for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
			String ac_name = daa.getAircraftStateAt(ac).getId();

			List<Position> ply_violation = new ArrayList<Position>();
			List<Position> ply_conflict = new ArrayList<Position>();
			if (PRINT_POLYGONS) {
				daa.horizontalHazardZone(ply_violation, ac, true, false);
				daa.horizontalHazardZone(ply_conflict, ac, false, false);
			}
			List<List<Position>> polygons = new ArrayList<List<Position>>();
			polygons.add(ply_violation);
			polygons.add(ply_conflict);

			hazardZones += "{ \"ac\": \"" + ac_name + "\",";
			hazardZones +=	"  \"polygons\": " + printPolygons(polygons, po) + "}";
			if (ac < daa.lastTrafficIndex()) {
				hazardZones += ", ";
			}
		}
		hazardZones += " ]}";
		jb.hazardZonesArray.add(hazardZones);

		if (PRINT_METRICS) {
			// monitors
			jb.monitors.check(daa);
			String monitorM1 = "{ \"time\": " + time
					+ ", " + jb.monitors.m1()
					+ " }";
			jb.monitorM1Array.add(monitorM1);

			String monitorM2 = "{ \"time\": " + time
					+ ", " + jb.monitors.m2()
					+ " }";
			jb.monitorM2Array.add(monitorM2);

			String monitorM3 = "{ \"time\": " + time
					+ ", " + jb.monitors.m3(daa)
					+ " }";
			jb.monitorM3Array.add(monitorM3);

			String monitorM4 = "{ \"time\": " + time
					+ ", " + jb.monitors.m4(daa)
					+ " }";
			jb.monitorM4Array.add(monitorM4);
		}

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
		// sanity checks
		if (ifname == "" || ifname == null) {
			System.err.println("** Error: Please specify a daa file");
			System.exit(1);
		}
		if (!inputFileReadable()) {
			System.err.println("** Error: File " + getInputFileName() + " cannot be read");
			System.exit(1);
		}

		// create output stream
		createPrintWriter();

		// create DaidalusFileWalker
		DaidalusFileWalker walker = new DaidalusFileWalker(ifname);
		if (ownshipName != null) { walker.setOwnship(ownshipName); }

		// create json bands object
		JsonBands jb = new JsonBands();
		// create jsonStats string with the results
		String jsonStats = "";

		/* Processing the input file time step by time step and writing output file */
		while (!walker.atEnd()) {
			// read a line in the daa file
			walker.readState(daa);
			// set alerter, if any is specified
			if (daaAlerter != null) { loadSelectedAlerter(); }
			// set wind, if a constant wind is specified
			if (windVelocity != null) { loadWindVelocity(); }
			// start profiler
			if (PROFILER_ENABLED) {
				if (profiler == null) { profiler = new DAAProfiler("Profiling DAIDALUS v" + VERSION + " with " + scenario); }
				profiler.start();
			}
			// compute the bands
			jsonStats = jsonBands(jb);
			// stop profiler
			if (PROFILER_ENABLED) {
				profiler.stop();
			}
		}

		printWriter.println("{\n" + jsonHeader() + "\n" + jsonStats + ",");
		printWriterInfo.println("{\n" + jsonHeader() + "\n" + jsonStats + "\n}");

		printArray(printWriter, jb.ownshipArray, "Ownship");
		printArray(printWriterOwnship, jb.ownshipArray);
		printWriter.println(",");

		printArray(printWriter, jb.alertsArray, "Alerts");
		printArray(printWriterAlerts, jb.alertsArray);
		printWriter.println(",");

		printArray(printWriter, jb.windVectorsArray, "WindVectors");
		printArray(printWriterWind, jb.windVectorsArray);
		printWriter.println(",");

		printArray(printWriter, jb.metricsArray, "Metrics");
		printArray(printWriterMetrics, jb.metricsArray);
		printWriter.println(",");

		printArray(printWriter, jb.trkArray, "Heading Bands");
		printArray(printWriterHdBands, jb.trkArray);
		printWriter.println(",");

		printArray(printWriter, jb.gsArray, "Horizontal Speed Bands");
		printArray(printWriterHsBands, jb.gsArray);
		printWriter.println(",");

		printArray(printWriter, jb.vsArray, "Vertical Speed Bands");
		printArray(printWriterVsBands, jb.vsArray);
		printWriter.println(",");

		printArray(printWriter, jb.altArray, "Altitude Bands");
		printArray(printWriterAltBands, jb.altArray);
		printWriter.println(",");

		printArray(printWriter, jb.resTrkArray, "Horizontal Direction Resolution");
		printArray(printWriterHdRes, jb.resTrkArray);
		printWriter.println(",");

		printArray(printWriter, jb.resGsArray, "Horizontal Speed Resolution");
		printArray(printWriterHsRes, jb.resGsArray);
		printWriter.println(",");

		printArray(printWriter, jb.resVsArray, "Vertical Speed Resolution");
		printArray(printWriterVsRes, jb.resVsArray);
		printWriter.println(",");

		printArray(printWriter, jb.resAltArray, "Altitude Resolution");
		printArray(printWriterAltRes, jb.resAltArray);
		printWriter.println(",");

		printArray(printWriter, jb.contoursArray, "Contours");
		printArray(printWriterContours, jb.contoursArray);
		printWriter.println(",");

		printArray(printWriter, jb.hazardZonesArray, "Hazard Zones");
		printArray(printWriterHazardZones, jb.hazardZonesArray);
		printWriter.println(",");

		printWriter.println("\"Monitors\": ");
		printWriterMonitors.println("{ \"Monitors\": ");
		List<List<String>> info = new ArrayList<List<String>>();
		info.add(jb.monitorM1Array);
		info.add(jb.monitorM2Array);
		info.add(jb.monitorM3Array);
		info.add(jb.monitorM4Array);
		printMonitors(printWriter, jb.monitors, info);
		printMonitors(printWriterMonitors, jb.monitors, info);
		printWriterMonitors.println("}");

		printWriter.println("}");
		closePrintWriter();

		if (PROFILER_ENABLED) {
			String profilerOutputFile = ofname + ".profiler.log";
			System.out.println("[PROFILER] Writing profiler output file " + profilerOutputFile);
			boolean success = profiler.printCollectedDataToFile(profilerOutputFile);
			System.out.println(success);
		}
	}

	public static String getFileName (String fname) {
		if (fname != null && fname.contains(File.separator)) {
			File file = new File(fname);
			return file.getName();
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
			} else if (args[a].startsWith("--list-alerters") || args[a].startsWith("-list-alerters")) {
				// list alerters for a given configuration
				if ((a + 1) < args.length) { daaConfig = args[++a]; }
				loadConfig();
				System.out.println(printAlerters());
				System.exit(0);
			} else if (args[a].startsWith("--version") || args[a].startsWith("-version")) {
				System.out.println(getVersion());
				System.exit(0);
			} else if (a < args.length - 1 && (args[a].startsWith("--prec") || args[a].startsWith("-prec") || args[a].equals("-p"))) {
				if (a + 1 < args.length) { precision = Integer.parseInt(args[++a]); }
			} else if (a < args.length - 1 && (args[a].startsWith("--conf") || args[a].startsWith("-conf") || args[a].equals("-c"))) {
				if (a + 1 < args.length) { daaConfig = args[++a]; }
			} else if (a < args.length - 1 && (args[a].startsWith("--alerter") || args[a].startsWith("-alerter") || args[a].equals("-a"))) {
				if (a + 1 < args.length) { daaAlerter = args[++a]; }
			} else if (a < args.length - 1 && (args[a].startsWith("--out") || args[a].startsWith("-out") || args[a].equals("-o"))) {
				if (a + 1 < args.length) { ofname = args[++a]; }
			} else if (a < args.length - 1 && (args[a].startsWith("--ownship") || args[a].startsWith("-ownship"))) {
				if (a + 1 < args.length) { ownshipName = args[++a]; }
			} else if (a < args.length - 1 && (args[a].startsWith("--wind") || args[a].startsWith("-wind"))) {
				if (a + 1 < args.length) { wind = args[++a]; }
			} else if (a < args.length - 1 && (args[a].startsWith("--profiler-on") || args[a].startsWith("-profiler-on"))) {
				PROFILER_ENABLED = true;
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

	/**
	 * Utility function, creates the output streams
	 */
	public boolean createPrintWriter () {
		try {
			System.out.println("Creating output file " + ofname);
			printWriter = new PrintWriter(new BufferedWriter(new FileWriter(ofname)), true);

			System.out.println("Creating output file " + ofname + ".files");
			printWriterFiles = new PrintWriter(new BufferedWriter(new FileWriter(ofname + ".files")),true);
			printWriterFiles.println("[");
			for (int i = 0; i < chunks.length; i++) {
				String fname = ofname + chunks[i];
				File f = new File(fname);
				System.out.println("Creating output file " + fname);
				switch (chunks[i]) {
					case ".info": { 
						printWriterInfo = new PrintWriter(new BufferedWriter(new FileWriter(fname)), true);
						printWriterFiles.println("{ \"file\": \"" + f.getName() + "\", \"type\": \"json\" }");
						break;
					}
					case ".ownship": {
						printWriterOwnship = new PrintWriter(new BufferedWriter(new FileWriter(fname)), true); 
						printWriterFiles.println("{ \"file\": \"" + f.getName() + "\", \"type\": \"array\", \"key\": \"Ownship\" }");
						break;
					}
					case ".alerts": { 
						printWriterAlerts = new PrintWriter(new BufferedWriter(new FileWriter(fname)), true);
						printWriterFiles.println("{ \"file\": \"" + f.getName() + "\", \"type\": \"array\", \"key\": \"Alerts\" }");
						break;
					}
					case ".wind": {
						printWriterWind = new PrintWriter(new BufferedWriter(new FileWriter(fname)), true);
						printWriterFiles.println("{ \"file\": \"" + f.getName() + "\", \"type\": \"array\", \"key\": \"WindVectors\" }");
						break; 
					}
					case ".metrics": { 
						printWriterMetrics = new PrintWriter(new BufferedWriter(new FileWriter(fname)), true); 
						printWriterFiles.println("{ \"file\": \"" + f.getName() + "\", \"type\": \"array\", \"key\": \"Metrics\" }");
						break;
					}
					case ".monitors": {
						printWriterMonitors = new PrintWriter(new BufferedWriter(new FileWriter(fname)), true);
						printWriterFiles.println("{ \"file\": \"" + f.getName() + "\", \"type\": \"json\", \"key\": \"Monitors\" }");
						break;
					}
					case ".hd-bands": { 
						printWriterHdBands = new PrintWriter(new BufferedWriter(new FileWriter(fname)), true);
						printWriterFiles.println("{ \"file\": \"" + f.getName() + "\", \"type\": \"array\", \"key\": \"Heading Bands\" }");
						break;
					}
					case ".vs-bands": { 
						printWriterVsBands = new PrintWriter(new BufferedWriter(new FileWriter(fname)), true); 
						printWriterFiles.println("{ \"file\": \"" + f.getName() + "\", \"type\": \"array\", \"key\": \"Vertical Speed Bands\" }");
						break;
					}
					case ".hs-bands": {
						printWriterHsBands = new PrintWriter(new BufferedWriter(new FileWriter(fname)), true);
						printWriterFiles.println("{ \"file\": \"" + f.getName() + "\", \"type\": \"array\", \"key\": \"Horizontal Speed Bands\" }");
						break;
					}
					case ".alt-bands": { 
						printWriterAltBands = new PrintWriter(new BufferedWriter(new FileWriter(fname)), true); 
						printWriterFiles.println("{ \"file\": \"" + f.getName() + "\", \"type\": \"array\", \"key\": \"Altitude Bands\" }");
						break; 
					}
					case ".hd-res": { 
						printWriterHdRes = new PrintWriter(new BufferedWriter(new FileWriter(fname)), true); 
						printWriterFiles.println("{ \"file\": \"" + f.getName() + "\", \"type\": \"array\", \"key\": \"Horizontal Direction Resolution\" }");
						break; 
					}
					case ".vs-res": { 
						printWriterVsRes = new PrintWriter(new BufferedWriter(new FileWriter(fname)), true); 
						printWriterFiles.println("{ \"file\": \"" + f.getName() + "\", \"type\": \"array\", \"key\": \"Vertical Speed Resolution\" }");
						break; 
					}
					case ".hs-res": { 
						printWriterHsRes = new PrintWriter(new BufferedWriter(new FileWriter(fname)), true); 
						printWriterFiles.println("{ \"file\": \"" + f.getName() + "\", \"type\": \"array\", \"key\": \"Horizontal Speed Resolution\" }");
						break; 
					}
					case ".alt-res": { 
						printWriterAltRes = new PrintWriter(new BufferedWriter(new FileWriter(fname)), true); 
						printWriterFiles.println("{ \"file\": \"" + f.getName() + "\", \"type\": \"array\", \"key\": \"Altitude Resolution\" }");
						break; 
					}
					case ".contours": { 
						printWriterContours = new PrintWriter(new BufferedWriter(new FileWriter(fname)), true); 
						printWriterFiles.println("{ \"file\": \"" + f.getName() + "\", \"type\": \"array\", \"key\": \"Contours\" }");
						break; 
					}
					case ".hazardzones": { 
						printWriterHazardZones = new PrintWriter(new BufferedWriter(new FileWriter(fname)), true); 
						printWriterFiles.println("{ \"file\": \"" + f.getName() + "\", \"type\": \"array\", \"key\": \"Hazard Zones\" }");
						break; 
					}
					default: {
						System.out.println("[DAABandsV2] Warning: unrecognized chunk " + chunks[i]);
						break;
					}
				}
				if (i < chunks.length - 1) { printWriterFiles.println(","); }
			}
			printWriterFiles.println("]");
		} catch (Exception e) {
			System.err.println("** Error: " + e);
			return false;
		}
		return true;
	}
	/**
	 * Utility function, closes the output streams
	 */
	public boolean closePrintWriter () {
		if (printWriter != null) {
			printWriter.close();
			printWriterFiles.close();
			printWriterInfo.close();
			printWriterOwnship.close();
			printWriterAlerts.close();
			printWriterWind.close();
			printWriterMetrics.close();
			printWriterAltBands.close();
			printWriterVsBands.close();
			printWriterHsBands.close();
			printWriterHdBands.close();
			printWriterAltRes.close();
			printWriterVsRes.close();
			printWriterHsRes.close();
			printWriterHdRes.close();
			printWriterContours.close();
			printWriterHazardZones.close();
			return true;
		}
		return false;
	}

	public static void main(String[] args) {
		DAABandsV2 daaBands = new DAABandsV2();
		daaBands.parseCliArgs(args);
		// daaBands.adjustThreshold(); // deprecated, this was needed for WWD
		daaBands.loadConfig();
		System.out.println(daaBands.printConfig()); // useful for debugging purposes
		Velocity wind = daaBands.readWind();
		if (wind != null) { System.out.println("Using constant wind vector: " + wind); }
		daaBands.walkFile();
	}

}
