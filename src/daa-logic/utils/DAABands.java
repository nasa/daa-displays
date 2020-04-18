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
import gov.nasa.larcfm.ACCoRD.KinematicBandsParameters;
import gov.nasa.larcfm.ACCoRD.KinematicMultiBands;
import gov.nasa.larcfm.Util.Units;
import gov.nasa.larcfm.Util.Util;
import gov.nasa.larcfm.Util.f;
import gov.nasa.larcfm.Util.Velocity;

public class DAABands {

	static void printHelpMsg() {
		System.out.println("Version: DAIDALUS V-" + KinematicBandsParameters.VERSION);
		System.out.println("Generates a file that can be processed with the Python script drawmultibands.py");
		System.out.println("Usage:");
		System.out.println("  DAABands [options] file");
		System.out.println("Options:");
		System.out.println("  --help\n\tPrint this message");
		System.out.println("  --version\n\tPrint WellClear version");
		System.out.println("  --config <file.conf>\n\tLoad configuration <file.conf>");
		System.out.println("  --wind <wind_info>\n\tLoad wind vector information, a JSON object enclosed in double quotes \"{ deg: d, knot: m }\", where d and m are reals");
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
    
    private static void printBands(PrintWriter out, ArrayList<String> bands, String label) {
		if (bands != null) {
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
	}

	protected static boolean loadWind (Daidalus daa, String wind) {
		if (daa != null) {
			if (wind != null) {
				System.out.println("Loading wind " + wind);
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
				daa.setWindField(windVelocity.Neg());
				return true;
			}
		} else {
			System.err.println("** Error: Daidalus is not initialized.");
		}
		return false;
	}

	public static void main(String[] args) {
		PrintWriter out = new PrintWriter(System.out);
		String config = null;
		String scenario = null;
		String output = null;
		String input = null;
		String wind = null;

		for (int a = 0; a < args.length; a++) {
			if (args[a].equals("--help") || args[a].equals("-help") || args[a].equals("-h")) {
				printHelpMsg();
				System.exit(0);
			} else if (args[a].startsWith("--version") || args[a].startsWith("-version")) {
				System.out.println(KinematicBandsParameters.VERSION);
                System.exit(0);
            } else if (a < args.length - 1 && (args[a].startsWith("--conf") || args[a].startsWith("-conf") || args[a].equals("-c"))) {
				config = args[++a];
			} else if (a < args.length - 1 && (args[a].startsWith("--out") || args[a].startsWith("-out") || args[a].equals("-o"))) {
				output = args[++a];
			} else if (a < args.length - 1 && (args[a].startsWith("-wind") || args[a].startsWith("--wind"))) {
				wind = args[++a];
			} else if (args[a].startsWith("-")) {
				System.err.println("** Warning: Invalid option (" + args[a] + ")");
			} else {
				input = args[a];
			}
		}
		File file = new File(input);
		if (!file.exists() || !file.canRead()) {
			System.err.println("** Error: File " + input + " cannot be read");
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
			System.err.println("** Error: " + e);
			System.exit(1);
		}

		/* Create Daidalus object and setting the configuration parameters */
		Daidalus daa = new Daidalus();
		// load wind settings
		loadWind(daa, wind);

		if (config != null && !daa.parameters.loadFromFile(config)) {
		    System.err.println("** Error: Configuration file " + config + " not found");
		    System.exit(1);
		}

		/* Creating a DaidalusFileWalker */
		DaidalusFileWalker walker = new DaidalusFileWalker(input);
		String hs_units = daa.parameters.getUnits("trk_step");
		String vs_units = daa.parameters.getUnits("vs_step");
        String alt_units = daa.parameters.getUnits("alt_step");
		String hdir_units = daa.parameters.getUnits("gs_step");

        String conf = (config != null) ? config.split("/")[config.split("/").length - 1] : "";

        out.print("{\n\"Info\": ");
		out.println("{ \"version\": " + "\"" + KinematicBandsParameters.VERSION + "\", \"configuration\": " + "\"" + conf + "\" },");
        out.println("\"Scenario\": \"" + scenario + "\",");
		out.println("\"Wind\": { \"deg\": \"" + Units.to("deg", daa.getWindField().Neg().compassAngle())  // we wanto to show FROM format
					+ "\", \"knot\": \"" + Units.to("knot", daa.getWindField().gs()) + "\" },");
		String str_to = "";
		String str_trko = "";
		String str_gso = "";
		String str_vso = "";
		String str_alto = "";
		ArrayList<String> trkArray = new ArrayList<String>();
		ArrayList<String> gsArray = new ArrayList<String>();
		ArrayList<String> vsArray = new ArrayList<String>();
		ArrayList<String> altArray = new ArrayList<String>();
		ArrayList<String> alertsArray = new ArrayList<String>();
		ArrayList<String> ownshipArray = new ArrayList<String>();

		/* Processing the input file time step by time step and writing output file */
		while (!walker.atEnd()) {
			walker.readState(daa);

			// load wind settings at each step --- wind is not persistent in DAIDALUS
			loadWind(daa, wind);

			str_to += f.Fm8(daa.getCurrentTime())+" ";

			double trko = Util.to_pi(daa.getOwnshipState().track());
			str_trko += f.Fm8(Units.to("deg",trko))+" ";

			double gso = daa.getOwnshipState().groundSpeed();
			str_gso += f.Fm8(Units.to(hdir_units,gso))+" ";

			double vso = daa.getOwnshipState().verticalSpeed();
			str_vso += f.Fm8(Units.to(vs_units,vso))+" ";

			double alto = daa.getOwnshipState().altitude();
			str_alto += f.Fm8(Units.to(alt_units,alto))+" ";

			KinematicMultiBands kb = daa.getKinematicMultiBands();

			// ownship
			String time = f.Fm8(daa.getCurrentTime());
			String own = "{ \"time\": " + time; 
			own += ", \"heading\": { \"val\": \"" + daa.getAircraftState(0).track(hdir_units) + "\"";
			own += ", \"units\": \"" + hdir_units + "\" }";
			own += ", \"airspeed\": { \"val\": \"" + daa.getAircraftState(0).groundSpeed(hs_units) + "\"";
			own += ", \"units\": \"" + hs_units + "\" }";
			own += " }";
			ownshipArray.add(own);

			String alerts = "{ \"time\": " + time + ", \"alerts\": [ ";
			String tmp = "";
			for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
				int alert = daa.alerting(ac);
				String ac_name = daa.getAircraftState(ac).getId();
				if (tmp != "") { tmp += ", "; }
				tmp += "{ \"ac\": \"" + ac_name + "\", \"alert\": \"" + alert + "\" }";
			}
			alerts += tmp;
			alerts += " ]}";
			alertsArray.add(alerts);

            String trk = "{ \"time\": " + time;
			trk += ", \"bands\": [ ";
			for (int i = 0; i < kb.trackLength(); i++) {
				trk += "{ \"range\": " + kb.track(i,"deg");
				trk += ", \"units\": \"deg\"";
                trk += ", \"alert\": \"" + kb.trackRegion(i) + "\" }";
                if (i < kb.trackLength() - 1) { trk += ", "; }
            }
            trk += " ]}";
			trkArray.add(trk);

            String gs = "{ \"time\": " + time;
			gs += ", \"bands\": [ ";
			for (int i = 0; i < kb.groundSpeedLength(); i++) {
				gs += "{ \"range\": " + kb.groundSpeed(i, hdir_units);
				gs += ", \"units\": \"" + hdir_units + "\"";
                gs += ", \"alert\": \"" + kb.groundSpeedRegion(i) + "\" }";
                if (i < kb.groundSpeedLength() - 1) { gs += ", "; }
			}
			gs += " ]}";
            gsArray.add(gs);
            
            String vs = "{ \"time\": " + time;
			vs += ", \"bands\": [ ";
			for (int i = 0; i < kb.verticalSpeedLength(); i++) {
				vs += "{ \"range\": " + kb.verticalSpeed(i, vs_units);
				vs += ", \"units\": \"" + vs_units + "\"";
                vs += ", \"alert\": \"" + kb.verticalSpeedRegion(i) + "\" }";
                if (i < kb.verticalSpeedLength() - 1) { vs += ", "; }
			}
			vs += " ]}";
            vsArray.add(vs);
            
            String alt = "{ \"time\": " + time;
			alt += ", \"bands\": [ ";
			for (int i = 0; i < kb.altitudeLength(); i++) {
				alt += "{ \"range\": " + kb.altitude(i, alt_units);
				alt += ", \"units\": \"" + alt_units + "\"";
                alt += ", \"alert\": \"" + kb.altitudeRegion(i) + "\" }";
                if (i < kb.altitudeLength() - 1) { alt += ", "; }
			}
			alt += " ]}";
            altArray.add(alt);
		}
		
		out.println("\"hs\": { \"min\": " + daa.parameters.getMinGroundSpeed(hdir_units) 
							+ ", \"max\": " + daa.parameters.getMaxGroundSpeed(hdir_units) 
							+ ", \"units\": \"" + hdir_units + "\" },");
		out.println("\"vs\": { \"min\": " + daa.parameters.getMinVerticalSpeed(vs_units)
							+ ", \"max\": " + daa.parameters.getMaxVerticalSpeed(vs_units)
							+ ", \"units\": \"" + vs_units + "\" },");
		out.println("\"alt\": { \"min\": " + daa.parameters.getMinAltitude(alt_units)
							+ ", \"max\": " + daa.parameters.getMaxAltitude(alt_units)
							+ ", \"units\": \"" + alt_units + "\" },");
		out.println("\"MostSevereAlertLevel\": \"" + daa.parameters.alertor.mostSevereAlertLevel() + "\",");

		DAABands.printBands(out, ownshipArray, "Ownship");
		out.println(",");
		DAABands.printBands(out, alertsArray, "Alerts");
		out.println(",");
        DAABands.printBands(out, trkArray, "Heading Bands");
		out.println(",");
		DAABands.printBands(out, gsArray, "Horizontal Speed Bands");
		out.println(",");
		DAABands.printBands(out, vsArray, "Vertical Speed Bands");
		out.println(",");
		DAABands.printBands(out, altArray, "Altitude Bands");
        out.println("}");
        
		out.close();
	}
}