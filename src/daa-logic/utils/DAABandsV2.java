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
import java.util.Hashtable;
import java.util.ArrayList;

import gov.nasa.larcfm.ACCoRD.BandsRegion;
import gov.nasa.larcfm.ACCoRD.Daidalus;
import gov.nasa.larcfm.ACCoRD.DaidalusFileWalker;
import gov.nasa.larcfm.ACCoRD.DaidalusParameters;
import gov.nasa.larcfm.Util.Units;
import gov.nasa.larcfm.Util.Util;
import gov.nasa.larcfm.Util.f;

import static gov.nasa.larcfm.ACCoRD.DaidalusParameters.VERSION;

public class DAABandsV2 {

	static void printHelpMsg() {
		System.out.println("Version: DAIDALUS V-" + DaidalusParameters.VERSION);
		System.out.println("Generates a file that can be rendered in daa-displays");
		System.out.println("Usage:");
		System.out.println("  DAABandsV2 [options] file");
		System.out.println("Options:");
		System.out.println("  --help\n\tPrint this message");
		System.out.println("  --version\n\tPrint WellClear version");
		System.out.println("  --config <file.conf>\n\tLoad configuration <file.conf>");
		System.out.println("  --output <file.json>\n\tOutput file <file.json>");
		System.exit(0);
	}

	static String region2str(BandsRegion r) {
		switch (r) {
		case NONE: return "0";
		case FAR: return "1";
		case MID: return "2";
		case NEAR: return "3";
		case RECOVERY: return "4";
		default: return "-1";
		}
	}

	private static void printBands(PrintWriter out, ArrayList bands, String label) {
		out.println("\"" + label + "\": [");
		for (int i = 0; i < bands.size(); i++) {
			out.print(bands.get(i));
			if (i < bands.size() - 1) {
				out.println(",");
			} else {
				out.println("");
			}
		}
		out.println("]");
	}

	public static void main(String[] args) {
		PrintWriter out = new PrintWriter(System.out);
		String config = null;
		String scenario = null;
		String output = null;

		/* Reading and processing options */
		int a=0;
		for (;a < args.length && args[a].startsWith("-"); ++a) {
			if (args[a].equals("--help") || args[a].equals("-help") || args[a].equals("-h")) {
				printHelpMsg();
			} else if (args[a].startsWith("--conf") || args[a].startsWith("-conf") || args[a].equals("-c")) {
				config = args[++a];
			} else if (args[a].startsWith("--out") || args[a].startsWith("-out") || args[a].equals("-o")) {
				output = args[++a];
			} else if (args[a].startsWith("--version") || args[a].startsWith("-version")) {
				System.out.println(VERSION);
				System.exit(0);
			} else if (args[a].startsWith("-")) {
				System.err.println("** Error: Invalid option ("+args[a]+")");
				System.exit(1);
			}
		}
		if (a+1 != args.length) {
			System.err.println("** Error: Expecting exactly one input file. Try --help for usage.");
			System.exit(1);
		} 
		String input = args[a];
		File file = new File(input);
		if (!file.exists() || !file.canRead()) {
			System.err.println("** Error: File "+input+" cannot be read");
			System.exit(1);
		}
		try {
			String name = file.getName();
			scenario = name.contains(".") ? name.substring(0, name.lastIndexOf('.')) : name;
			if (output == null) {
				output = scenario + ".json";
			} 
			out = new PrintWriter(new BufferedWriter(new FileWriter(output)),true);
			System.out.println("Writing file " + output);
		} catch (Exception e) {
			System.err.println("** Error: "+e);
			System.exit(1);
		}

		/* Create Daidalus object and setting the configuration parameters */
		Daidalus daa  = new Daidalus();

		if (config != null && !daa.loadFromFile(config)) {
		    System.err.println("** Error: Configuration file " + config + " not found");
		    System.exit(1);
		}

		/* Creating a DaidalusFileWalker */
		DaidalusFileWalker walker = new DaidalusFileWalker(input);
		String hs_units = daa.getUnitsOf("step_hs");
		String vs_units = daa.getUnitsOf("step_vs");
		String alt_units = daa.getUnitsOf("step_alt");

		String conf = (config != null) ? config.split("/")[config.split("/").length - 1] : "";

		out.print("{\n\"WellClear\": ");
		out.println("{ \"version\": " + "\"" + VERSION + "\", \"configuration\": " + "\"" + conf + "\" },");
		
        out.println("\"Scenario\": \"" + scenario + "\",");  

		String str_to = "";
		String str_trko = "";
		String str_gso = "";
		String str_vso = "";
		String str_alto = "";
		ArrayList trkArray = new ArrayList();
		ArrayList gsArray = new ArrayList();
		ArrayList vsArray = new ArrayList();
		ArrayList altArray = new ArrayList();
		ArrayList alertsArray = new ArrayList();

		/* Processing the input file time step by time step and writing output file */
		while (!walker.atEnd()) {
			walker.readState(daa);
			
			str_to += f.FmPrecision(daa.getCurrentTime())+" ";

			double trko = Util.to_pi(daa.getOwnshipState().horizontalDirection());
			str_trko += f.FmPrecision(Units.to("deg",trko))+" ";

			double gso = daa.getOwnshipState().horizontalSpeed();
			str_gso += f.FmPrecision(Units.to(hs_units,gso))+" ";

			double vso = daa.getOwnshipState().verticalSpeed();
			str_vso += f.FmPrecision(Units.to(vs_units,vso))+" ";

			double alto = daa.getOwnshipState().altitude();
			str_alto += f.FmPrecision(Units.to(alt_units,alto))+" ";

			String time = f.FmPrecision(daa.getCurrentTime());
			String alerts = "{ \"time\": " + time + ", \"alerts\": [ ";
			String tmp = "";
			for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
				int alert = daa.alerting(ac);
				String ac_name = daa.getAircraftStateAt(ac).getId();
				if (tmp != "") { tmp += ", "; }
				tmp += "{ \"ac\": \"" + ac_name + "\", \"alert\": \"" + alert + "\" }";
			}
			alerts += tmp;
			alerts += " ]}";
			alertsArray.add(alerts);

			String trk = "{ \"time\": " + time;
			trk += ", \"bands\": [ ";
			for (int i = 0; i < daa.horizontalDirectionBandsLength(); i++) {
				trk += "{ \"range\": " + daa.horizontalDirectionIntervalAt(i, "deg");
				trk += ", \"units\": \"deg\"";
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
		}

		out.println("\"hs\": { \"min\": " + daa.getMinHorizontalSpeed(hs_units) 
							+ ", \"max\": " + daa.getMaxHorizontalSpeed(hs_units) 
							+ ", \"units\": \"" + hs_units + "\" },");
		out.println("\"vs\": { \"min\": " + daa.getMinVerticalSpeed(vs_units)
							+ ", \"max\": " + daa.getMaxVerticalSpeed(vs_units)
							+ ", \"units\": \"" + vs_units + "\" },");
		out.println("\"alt\": { \"min\": " + daa.getMinAltitude(alt_units)
							+ ", \"max\": " + daa.getMaxAltitude(alt_units)
							+ ", \"units\": \"" + alt_units + "\" },");

		out.println("\"MostSevereAlertLevel\": \"" + daa.mostSevereAlertLevel(1) + "\",");

		DAABandsV2.printBands(out, alertsArray, "Alerts");
		out.println(",");
		DAABandsV2.printBands(out, trkArray, "Heading Bands");
		out.println(",");
		DAABandsV2.printBands(out, gsArray, "Horizontal Speed Bands");
		out.println(",");
		DAABandsV2.printBands(out, vsArray, "Vertical Speed Bands");
		out.println(",");
		DAABandsV2.printBands(out, altArray, "Altitude Bands");
		out.println("}");

		out.close();
	}
}