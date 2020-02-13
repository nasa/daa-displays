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

// implementation based on DrawMultiBands.java

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.util.ArrayList;

import gov.nasa.larcfm.ACCoRD.BandsRegion;
import gov.nasa.larcfm.ACCoRD.Daidalus;
import gov.nasa.larcfm.ACCoRD.DaidalusFileWalker;
import gov.nasa.larcfm.Util.f;

import static gov.nasa.larcfm.ACCoRD.DaidalusParameters.VERSION;

public class DAABandsV2 {

	protected String tool_name = "DAABandsV2";

	Daidalus daa = null;

	protected String daaConfig = null;
	protected String scenario = null;
	protected String ofname = null; // output file name
	protected String ifname = null; // input file name

	PrintWriter printWriter = null;

	DAABandsV2 () {
		/* Create Daidalus object and setting the configuration parameters */
		this.daa = new Daidalus();
	}

	String getScenario() {
		return this.scenario;
	}
	String getConfigFileName() {
		return this.daaConfig;
	}
	String getDaaConfig () {
		if (daaConfig != null) {
			return daaConfig.split("/")[ this.daaConfig.split("/").length - 1 ];
		}
		return null;
	}
	String getOutputFileName() {
		return this.ofname;
	}
	String getInputFileName() {
		return this.ifname;
	}

	protected void printHelpMsg() {
		System.out.println("Version: DAIDALUS " + getVersion());
		System.out.println("Generates a file that can be rendered in daa-displays");
		System.out.println("Usage:");
		System.out.println("  " + tool_name + " [options] file");
		System.out.println("Options:");
		System.out.println("  --help\n\tPrint this message");
		System.out.println("  --version\n\tPrint WellClear version");
		System.out.println("  --config <file.conf>\n\tLoad configuration <file.conf>");
		System.out.println("  --output <file.json>\n\tOutput file <file.json>");
		System.out.println("  --list-monitors\n\tReturns the list of available monitors, in JSON format");
		System.exit(0);
	}

	/**
	 * Returns the list of monitors in json format
	 */
	String printMonitorList() {
		DAAMonitorsV2 monitors = new DAAMonitorsV2(null);
		int n = monitors.getSize();
		String res = "";
		for (int i = 0; i < n; i++) {
			res += "\"" + monitors.getLabel(i + 1) + "\"";
			if (i < n - 1) { res += ", "; }
		}
		return "[ " + res + " ]";
	}

	// protected static String region2str(BandsRegion r) {
	// 	switch (r) {
	// 		case NONE: return "0";
	// 		case FAR: return "1";
	// 		case MID: return "2";
	// 		case NEAR: return "3";
	// 		case RECOVERY: return "4";
	// 		default: return "-1";
	// 	}
	// }

	protected static void printArray(PrintWriter out, ArrayList<String> info, String label) {
		out.println("\"" + label + "\": [");
		int n = info.size();
		for (int i = 0; i < n; i++) {
			out.print(info.get(i));
			if (i < n - 1) {
				out.println(",");
			} else {
				out.println("");
			}
		}
		out.println("]");
	}

	protected static void printMonitors (PrintWriter out, DAAMonitorsV2 monitors, ArrayList<ArrayList<String>> info) {
		out.println("[ ");
		int len = monitors.getSize();
		for (int i = 0; i < len; i++) {
			int monitorID = i + 1;
			String legend = monitors.getLegend(monitorID);
			String color = monitors.getColor(monitorID);
			String label = monitors.getLabel(monitorID);
			out.print("{ \"id\": \"" + (monitorID) + "\",\n");
			out.print("\"name\": \"" + label + "\",\n");
			out.print("\"color\": \"" + color + "\",\n");
			out.println("\"legend\": " + legend + ",\n");
			DAABandsV2.printArray(out, info.get(i), "results");
			if (i < len - 1) {
				out.println("}, ");
			} else {
				out.println("} ");
			}
		}
		out.println(" ]");
	}

	Boolean loadDaaConfig () {
		if (daa != null) {
			if (daaConfig != null) {
				Boolean paramLoaded = this.daa.loadFromFile(daaConfig);
				if (paramLoaded) {
					System.out.println("** Configuration file " + daaConfig + " loaded successfully!");
					return true;
				} else {
					System.err.println("** Error: Configuration file " + daaConfig + " could not be loaded. Using default WellClear configuration.");
				}
			} else {
				System.err.println("** Warning: Configuration file not specified. Using default WellClear configuration.");
			}
		} else {
			System.err.println("** Error: Daidalus is not initialized.");
		}
		return false;
	}
	
	protected String jsonHeader () {
		return "\"Info\": "
				+ "{ \"version\": " + "\"" + getVersion() + "\", \"configuration\": " + "\"" + this.getDaaConfig() + "\" },\n"
				+   "\"Scenario\": \"" + this.scenario + "\",";  
	}

	protected String jsonBands (
		Daidalus daa, DAAMonitorsV2 monitors,
		ArrayList<String> alertsArray, ArrayList<String> trkArray, ArrayList<String> gsArray, ArrayList<String> vsArray, ArrayList<String> altArray, 
		ArrayList<String> resTrkArray, ArrayList<String> resGsArray, ArrayList<String> resVsArray, ArrayList<String> resAltArray, 
		ArrayList<String> monitorM1Array, ArrayList<String> monitorM2Array, ArrayList<String> monitorM3Array 
	) {
		String hs_units = daa.getUnitsOf("step_hs");
		String vs_units = daa.getUnitsOf("step_vs");
		String alt_units = daa.getUnitsOf("step_alt");
		String trk_units = daa.getUnitsOf("step_hdir");

		// traffic alerts
		String time = f.FmPrecision(daa.getCurrentTime());
		String alerts = "{ \"time\": " + time + ", \"alerts\": [ ";
		String tmp = "";
		for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
			int alert = daa.alertLevel(ac);
			String ac_name = daa.getAircraftStateAt(ac).getId();
			if (tmp != "") { tmp += ", "; }
			tmp += "{ \"ac\": \"" + ac_name + "\", \"alert\": \"" + alert + "\" }";
		}
		alerts += tmp;
		alerts += " ]}";
		alertsArray.add(alerts);

		// bands
		String trk = "{ \"time\": " + time;
		trk += ", \"bands\": [ ";
		for (int i = 0; i < daa.horizontalDirectionBandsLength(); i++) {
			trk += "{ \"range\": " + daa.horizontalDirectionIntervalAt(i, trk_units);
			trk += ", \"units\": \"" +  trk_units + "\"";
			trk += ", \"alert\": \"" + daa.horizontalDirectionRegionAt(i) + "\" }";
			if (i < daa.horizontalDirectionBandsLength() - 1) { trk += ", "; }
		}
		trk += " ]}";
		trkArray.add(trk);

		String gs = "{ \"time\": " + time;
		gs += ", \"bands\": [ ";
		for (int i = 0; i < daa.horizontalSpeedBandsLength(); i++) {
			gs += "{ \"range\": " + daa.horizontalSpeedIntervalAt(i, hs_units);
			gs += ", \"units\": \"" + hs_units + "\"";
			gs += ", \"alert\": \"" + daa.horizontalSpeedRegionAt(i) + "\" }";
			if (i < daa.horizontalSpeedBandsLength() - 1) { gs += ", "; }
		}
		gs += " ]}";
		gsArray.add(gs);

		String vs = "{ \"time\": " + time;
		vs += ", \"bands\": [ ";
		for (int i = 0; i < daa.verticalSpeedBandsLength(); i++) {
			vs += "{ \"range\": " + daa.verticalSpeedIntervalAt(i, vs_units);
			vs += ", \"units\": \"" + vs_units + "\"";
			vs += ", \"alert\": \"" + daa.verticalSpeedRegionAt(i) + "\" }";
			if (i < daa.verticalSpeedBandsLength() - 1) { vs += ", "; }
		}
		vs += " ]}";
		vsArray.add(vs);
		
		String alt = "{ \"time\": " + time;
		alt += ", \"bands\": [ ";
		for (int i = 0; i < daa.altitudeBandsLength(); i++) {
			alt += "{ \"range\": " + daa.altitudeIntervalAt(i, alt_units);
			alt += ", \"units\": \"" + alt_units + "\"";
			alt += ", \"alert\": \"" + daa.altitudeRegionAt(i) + "\" }";
			if (i < daa.altitudeBandsLength() - 1) { alt += ", "; }
		}
		alt += " ]}";
		altArray.add(alt);

		// resolutions
		String resTrk = "{ \"time\": " + time;
		Boolean preferredTrk = daa.preferredHorizontalDirectionRightOrLeft();
		double valueTrk = daa.horizontalDirectionResolution(preferredTrk, trk_units);
		BandsRegion alertTrk = daa.regionOfHorizontalDirection(valueTrk, trk_units);
		resTrk += ", \"resolution\": { \"val\": \"" + valueTrk + "\", \"units\": \"" + trk_units + "\", \"alert\": \"" + alertTrk + "\" }"; // resolution can be number, NaN or infinity
		resTrk += " }";
		resTrkArray.add(resTrk);

		String resGs = "{ \"time\": " + time;
		Boolean preferredGs = daa.preferredHorizontalSpeedUpOrDown();
		double valueGs = daa.horizontalSpeedResolution(preferredGs, hs_units);
		BandsRegion alertGs = daa.regionOfHorizontalSpeed(valueGs, hs_units);
		resGs += ", \"resolution\": { \"val\": \"" + valueGs + "\", \"units\": \"" + hs_units + "\", \"alert\": \"" + alertGs + "\" }"; // resolution can be number, NaN or infinity
		resGs += " }";
		resGsArray.add(resGs);

		String resVs = "{ \"time\": " + time;
		Boolean preferredVs = daa.preferredVerticalSpeedUpOrDown();
		double valueVs = daa.verticalSpeedResolution(preferredVs, vs_units);
		BandsRegion alertVs = daa.regionOfVerticalSpeed(valueVs, vs_units);
		resVs += ", \"resolution\": { \"val\": \"" + valueVs + "\", \"units\": \"" + vs_units + "\", \"alert\": \"" + alertVs + "\" }"; // resolution can be number, NaN or infinity
		resVs += " }";
		resVsArray.add(resVs);

		String resAlt = "{ \"time\": " + time;
		Boolean preferredAlt = daa.preferredAltitudeUpOrDown();
		double valueAlt = daa.altitudeResolution(preferredAlt, alt_units);
		BandsRegion alertAlt = daa.regionOfAltitude(valueAlt, alt_units);
		resAlt += ", \"resolution\": { \"val\": \"" + valueAlt + "\", \"units\": \"" + alt_units + "\", \"alert\": \"" + alertAlt + "\" }"; // resolution can be number, NaN or infinity
		resAlt += " }";
		resAltArray.add(resAlt);

		// monitors
		monitors.check();
		String monitorM1 = "{ \"time\": " + time
					+ ", " + monitors.m1()
					+ " }";
		monitorM1Array.add(monitorM1);

		String monitorM2 = "{ \"time\": " + time
					+ ", " + monitors.m2()
					+ " }";
		monitorM2Array.add(monitorM2);

		System.out.println("time: " + time);
		String monitorM3 = "{ \"time\": " + time
					+ ", " + monitors.m3()
					+ " }";
		monitorM3Array.add(monitorM3);

		String stats = "\"hs\": { \"min\": " + daa.getMinHorizontalSpeed(hs_units) 
					+ ", \"max\": " + daa.getMaxHorizontalSpeed(hs_units) 
					+ ", \"units\": \"" + hs_units + "\" },\n"
					+ "\"vs\": { \"min\": " + daa.getMinVerticalSpeed(vs_units)
					+ ", \"max\": " + daa.getMaxVerticalSpeed(vs_units)
					+ ", \"units\": \"" + vs_units + "\" },\n"
					+ "\"alt\": { \"min\": " + daa.getMinAltitude(alt_units)
					+ ", \"max\": " + daa.getMaxAltitude(alt_units)
					+ ", \"units\": \"" + alt_units + "\" },\n"
					+ "\"MostSevereAlertLevel\": \"" + daa.mostSevereAlertLevel(1) + "\"";
		return stats;
	}
	public void walkFile (DaidalusWrapperInterface wrapper) {
		this.createPrintWriter();

		/* Create DaidalusFileWalker */
		DaidalusFileWalker walker = new DaidalusFileWalker(ifname);

		printWriter.println("{" + this.jsonHeader());

		ArrayList<String> trkArray = new ArrayList<String>();
		ArrayList<String> gsArray = new ArrayList<String>();
		ArrayList<String> vsArray = new ArrayList<String>();
		ArrayList<String> altArray = new ArrayList<String>();
		ArrayList<String> alertsArray = new ArrayList<String>();

		ArrayList<String> resTrkArray = new ArrayList<String>();
		ArrayList<String> resGsArray = new ArrayList<String>();
		ArrayList<String> resVsArray = new ArrayList<String>();
		ArrayList<String> resAltArray = new ArrayList<String>();

		DAAMonitorsV2 monitors = new DAAMonitorsV2(daa);

		ArrayList<String> monitorM1Array = new ArrayList<String>();
		ArrayList<String> monitorM2Array = new ArrayList<String>();
		ArrayList<String> monitorM3Array = new ArrayList<String>();

		String jsonStats = null;

		/* Processing the input file time step by time step and writing output file */
		while (!walker.atEnd()) {
			walker.readState(daa);
			if (wrapper != null) {
				wrapper.adjustAlertingTime();
			}

			jsonStats = this.jsonBands(
				daa, monitors,
				alertsArray, 
				trkArray, gsArray, vsArray, altArray, 
				resTrkArray, resGsArray, resVsArray, resAltArray, 
				monitorM1Array, monitorM2Array, monitorM3Array
			);
		}

		printWriter.println(jsonStats + ",");

		DAABandsV2.printArray(printWriter, alertsArray, "Alerts");
		printWriter.println(",");
		DAABandsV2.printArray(printWriter, trkArray, "Heading Bands");
		printWriter.println(",");
		DAABandsV2.printArray(printWriter, gsArray, "Horizontal Speed Bands");
		printWriter.println(",");
		DAABandsV2.printArray(printWriter, vsArray, "Vertical Speed Bands");
		printWriter.println(",");
		DAABandsV2.printArray(printWriter, altArray, "Altitude Bands");
		printWriter.println(",");
		DAABandsV2.printArray(printWriter, resTrkArray, "Heading Resolution");
		printWriter.println(",");
		DAABandsV2.printArray(printWriter, resGsArray, "Horizontal Speed Resolution");
		printWriter.println(",");
		DAABandsV2.printArray(printWriter, resVsArray, "Vertical Speed Resolution");
		printWriter.println(",");
		DAABandsV2.printArray(printWriter, resAltArray, "Altitude Resolution");
		printWriter.println(",");

		printWriter.println("\"Monitors\": ");
		ArrayList<ArrayList<String>> info = new ArrayList();
		info.add(monitorM1Array);
		info.add(monitorM2Array);
		info.add(monitorM3Array);
		DAABandsV2.printMonitors(printWriter, monitors, info);

		printWriter.println("}");

		this.closePrintWriter();
	}

	static String getFileName (String fname) {
		if (fname != null && fname.contains("/")) {
			String[] comp = fname.split("/");
			return comp[comp.length - 1];
		}
		return fname;
	}

	static String removeExtension (String fname) {
		return fname != null && fname.contains(".") ? 
					fname.substring(0, fname.lastIndexOf('.')) 
					: fname;
	}

	String getVersion () {
		return VERSION;
	}

	protected DAABandsV2 parseCliArgs (String[] args) {
		// System.out.println(args.toString());
		if (args != null && args.length == 0) {
			printHelpMsg();
			System.exit(0);
		}
		int a = 0;
		for (; a < args.length && args[a].startsWith("-"); a++) {
			if (args[a].equals("--help") || args[a].equals("-help") || args[a].equals("-h")) {
				printHelpMsg();
				System.exit(0);
			} else if (args[a].startsWith("--list-monitors") || args[a].startsWith("-list-monitors")) {
				System.out.println(printMonitorList());
				System.exit(0);
			} else if (args[a].startsWith("--conf") || args[a].startsWith("-conf") || args[a].equals("-c")) {
				daaConfig = args[++a];
			} else if (args[a].startsWith("--out") || args[a].startsWith("-out") || args[a].equals("-o")) {
				ofname = args[++a];
			} else if (args[a].startsWith("--version") || args[a].startsWith("-version")) {
				System.out.println(getVersion());
				System.exit(0);
			} else if (args[a].startsWith("-")) {
				System.err.println("** Error: Invalid option ("+args[a]+")");
				System.exit(1);
			}
		}
		this.ifname = args[a];
		this.scenario = removeExtension(getFileName(this.ifname));
		if (ofname == null) {
			ofname = scenario + ".json";
		}
		return this;
	}

	public Boolean inputFileReadable () {
		String inputFile = getInputFileName();
		File file = new File(inputFile);
		if (!file.exists() || !file.canRead()) {
			return false;
		}
		return true;
	}

	protected Boolean createPrintWriter () {
		try {
			printWriter = new PrintWriter(new BufferedWriter(new FileWriter(ofname)),true);
			System.out.println("Creating output file " + ofname);
		} catch (Exception e) {
			System.err.println("** Error: " + e);
			return false;
		}
		return true;
	}
	protected Boolean closePrintWriter () {
		if (printWriter != null) {
			printWriter.close();
			return true;
		}
		return false;
	}

	public static void main(String[] args) {
		DAABandsV2 daaBands = new DAABandsV2();
		daaBands.parseCliArgs(args);
		if (!daaBands.inputFileReadable()) {
			System.err.println("** Error: File " + daaBands.getInputFileName() + " cannot be read");
			System.exit(1);
		}
		daaBands.loadDaaConfig();
		daaBands.walkFile(null);
	}

}