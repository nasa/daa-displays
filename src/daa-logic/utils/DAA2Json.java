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

// implementation based on Chorus.HorizView.java

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;

import gov.nasa.larcfm.ACCoRD.Daidalus;
import gov.nasa.larcfm.ACCoRD.DaidalusFileWalker;
import gov.nasa.larcfm.ACCoRD.SUMData;
import gov.nasa.larcfm.ACCoRD.TrafficState;
import gov.nasa.larcfm.Util.EuclideanProjection;
import gov.nasa.larcfm.Util.LatLonAlt;
import gov.nasa.larcfm.Util.Position;
import gov.nasa.larcfm.Util.Units;
import gov.nasa.larcfm.Util.Vect3;
import gov.nasa.larcfm.Util.Velocity;
import gov.nasa.larcfm.Util.f;

import gov.nasa.larcfm.Util.Projection;

import static gov.nasa.larcfm.ACCoRD.DaidalusParameters.VERSION;


public class DAA2Json {

	protected Boolean VERBOSE = true;

	protected Daidalus daa = null;
	protected String daaConfig = null;
	protected static final int precision = 16;

	// 1 degree latitude is 69 miles and 60nmi
	// 1 degree longitude is ~69 miles and ~60nmi
	// 1 nautical mile is 1.15078 miles

	public DAA2Json (Daidalus daa) {
		this.daa = daa;
	}

	protected String format(double val) {
		String tmp = f.FmPrecision(val, precision);
		int max = precision + 8;
		int padding = max - tmp.length();
		return tmp + " ".repeat(padding);
	}
	protected String format(String str) {
		int max = precision + 8;
		int padding = max - str.length();
		return str + " ".repeat(padding);
	}

	public String printXYZ(TrafficState ownship, TrafficState intruder, double time) {
		// current intruder position
		Vect3 si = intruder.get_s(); // projected position of the intruder
		Velocity vi = intruder.get_v(); // projected velocity of the intruder
		SUMData sum = intruder.sum();
		return format(intruder.getId()) 
					+ format(si.x) + format(si.y) + format(si.z) 
					+ format(vi.x) + format(vi.y) + format(vi.z)
					+ format(time)
					+ format(intruder.getAlerterIndex()) 
					+ format(sum.get_s_EW_std())
					+ format(sum.get_s_NS_std())
					+ format(sum.get_s_EN_std())
					+ format(sum.get_sz_std())
					+ format(sum.get_v_EW_std())
					+ format(sum.get_v_NS_std())
					+ format(sum.get_v_EN_std())
					+ format(sum.get_vz_std())
					;
	}

	public String printLLA(TrafficState ownship, TrafficState intruder, double time) {
		// current intruder position
		Vect3 si = intruder.get_s(); // projected position of the intruder
		Velocity vi = intruder.get_v(); // projected velocity of the intruder

		// --- the following shows how to perform inverse transformation
		Position po = ownship.getPosition(); // ownship position in lat lon
		EuclideanProjection eprj = Projection.createProjection(po);
		LatLonAlt lla = eprj.inverse(si);
		Position px = Position.mkLatLonAlt(lla.lat(), lla.lon(), lla.alt());
		Velocity vx = eprj.inverseVelocity(si, vi, true);
		
		return "{ "
				+ "\"id\": \"" + intruder.getId() + "\", " 
				+ "\"s\": { "
				+ "\"lat\": \"" + f.FmPrecision(Units.to("deg", px.lat()), precision) + "\", " 
				+ "\"lon\": \"" + f.FmPrecision(Units.to("deg", px.lon()), precision) + "\", " 
				+ "\"alt\": \"" + f.FmPrecision(Units.to("ft", px.alt()), precision) + "\" }, "
				+ "\"v\": { " 
				+ "\"x\": \"" + f.FmPrecision(Units.to("knot", vx.x), precision) + "\", " 
				+ "\"y\": \"" + f.FmPrecision(Units.to("knot", vx.y), precision) + "\", " 
				+ "\"z\": \"" + f.FmPrecision(Units.to("fpm", vx.z), precision) + "\" }"
				+ " }";
	}

	public String printDAA(TrafficState ownship, TrafficState intruder, double time) {
		// current intruder position
		Vect3 si = intruder.get_s(); // projected position of the intruder
		Velocity vi = intruder.get_v(); // projected velocity of the intruder

		// --- the following shows how to perform inverse transformation
		Position po = ownship.getPosition(); // ownship position in lat lon
		EuclideanProjection eprj = Projection.createProjection(po);
		LatLonAlt lla = eprj.inverse(si);
		Position px = Position.mkLatLonAlt(lla.lat(), lla.lon(), lla.alt());
		Velocity vx = eprj.inverseVelocity(si, vi, true);
		
		return "{ "
				+ "\"name\": \"" + intruder.getId() + "\", " 
				+ "\"time\": \"" + f.FmPrecision(time, precision) + "\", " 
				+ "\"lat\": \"" + f.FmPrecision(Units.to("deg", px.lat()), precision) + "\", " 
				+ "\"lon\": \"" + f.FmPrecision(Units.to("deg", px.lon()), precision) + "\", " 
				+ "\"alt\": \"" + f.FmPrecision(Units.to("ft", px.alt()), precision) + "\", "
				+ "\"vx\": \"" + f.FmPrecision(Units.to("knot", vx.x), precision) + "\", " 
				+ "\"vy\": \"" + f.FmPrecision(Units.to("knot", vx.y), precision) + "\", " 
				+ "\"vz\": \"" + f.FmPrecision(Units.to("fpm", vx.z), precision) + "\""
				+ " }";
	}

	public static void printHelp () {
		System.out.println("Usage: java -jar DAA2Json.jar <file.daa>\n");
	}

    public static void main(String[] args) {

		if (args == null || args.length == 0) {
			printHelp();
			return;
		}

		PrintWriter out = new PrintWriter(System.out);
		
		String scenario = null;
		String output = null;

		// Process args
		int a = 0;
		while (a < args.length && args[a].startsWith("-")) {
			if (args[a].equals("--help") || args[a].equals("-help") || args[a].equals("-h")) {
				// printHelpMsg();
			} else if (args[a].startsWith("--output") || args[a].startsWith("-output") || args[a].equals("-o")) {
				output = args[++a];
			} else if (args[a].startsWith("--version") || args[a].startsWith("-version")) {
				System.out.println(VERSION);
                System.exit(0);
            } else if (args[a].startsWith("-")) {
				System.err.println("** Error: Invalid option (" + args[a] + ")");
				System.exit(1);
			}
			a++;
		}

		String input = args[a];

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
			System.out.println("Writing output into file " + output);
		} catch (Exception e) {
			System.err.println("** Error: " + e);
			System.exit(1);
		}

		// create daidalus
		Daidalus daidalus = new Daidalus();
		DAA2Json daa2json = new DAA2Json(daidalus);

		out.println("{\n\t\"scenarioName\": \"" + scenario + "\",");

		String lla = "\t\"lla\": {\n"; // position array, grouped by aircraft type
		String daa = "\t\"daa\": [\n"; // position array, as in the original daa file
		String steps = "\t\"steps\": [ "; // time array
		// Process input file using DaidalusFileWalker
		DaidalusFileWalker walker = new DaidalusFileWalker(input);
		int i = 0;
		while (!walker.atEnd()) {
			double time = walker.getTime();
			walker.readState(daidalus);
			steps += "\"" + f.FmPrecision(time, precision) + "\""; // time at step i
			lla += "\t\t\"" + f.FmPrecision(time, precision) + "\": {\n"; // time at step i
			// print ownship state
			TrafficState ownship = daidalus.getOwnshipState();
			lla += "\t\t\t\"ownship\": " + daa2json.printLLA(ownship, ownship, time) + ",\n";
			lla += "\t\t\t\"traffic\": [\n";
			// print traffic state
			int nTraffic = 0;
			for (int idx = 0; idx <= daidalus.lastTrafficIndex(); idx++) {
				TrafficState traffic = daidalus.getAircraftStateAt(idx);
				daa += "\t\t" + daa2json.printDAA(ownship, traffic, time);
				if (idx < daidalus.lastTrafficIndex()) {
					daa += ",\n";
				}
				if (traffic.getId() != ownship.getId()) {
					nTraffic++;
					lla += "\t\t\t\t" + daa2json.printLLA(ownship, traffic, time);
					if (nTraffic < daidalus.lastTrafficIndex()) {
						lla += ",\n";
					}
				}
			}
			lla += "\n\t\t\t]\n\t\t}";
			if (!walker.atEnd()) {
				lla += ",\n";
				daa += ",\n";
				steps += ", ";
			}
			i++;
		}
		lla += "\n\t";
		steps += "]";

		out.println("\t\"length\": " + i + ", ");
		out.println(daa + "],");
		out.println(lla + "},");
		out.println(steps);
		out.println("}");

		out.close();
	}
}