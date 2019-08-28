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


public class DAA2XYZ {

	protected Boolean VERBOSE = true;

	protected Daidalus daa = null;
	protected String daaConfig = null;
	protected static final int precision = 16;

	// 1 degree latitude is 69 miles and 60nmi
	// 1 degree longitude is ~69 miles and ~60nmi
	// 1 nautical mile is 1.15078 miles

	public DAA2XYZ (Daidalus daa) {
		this.daa = daa;
	}

	protected String[] xyzLabels = {
		"NAME", "sx", "sy", "sz", "vx", "vy", "vz", "time", "alerter", "s_EW_std", "s_NS_std", "s_EN_std", "sz_std", "v_EW_std", "v_NS_std", "v_EN_std", "vz_std"
	};

	protected String[] xyzUnits = {
		"[none]", "[m]", "[m]", "[m]", "[m/s]", "[m/s]", "[m/s]", "[s]", "[none]", "[m]", "[m]", "[m]", "[m]", "[m/s]", "[m/s]", "[m/s]", "[m/s]"
	};

	public String printXYZDescriptor () {
		String res = "";
		for (int i = 0; i < xyzLabels.length; i++) {
			res += format(xyzLabels[i]);
		}
		res += "\n";
		for (int i = 0; i < xyzUnits.length; i++) {
			res += format(xyzUnits[i]);
		}
		return res;
	}

	public String printLatLonDescriptor () {
		return "NAME       lat      lon      alt     vx       vy       vz       time\n"
			+  "[none]     [deg]    [deg]    [ft]    [knot]   [knot]   [fpm]    [s]";
	}

	protected String repeat(String str, int n) {
		String ans = str;
		for (int i = 0; i < n; i++) {
			ans += " ";
		}
		return ans;
	}
	protected String format(double val) {
		String tmp = f.FmPrecision(val, precision);
		int max = precision + 8;
		int padding = max - tmp.length();
		String pp = " ";
		for (int i = 0; i < padding; i++) {
			pp += " ";
		}
		return tmp + pp;
	}
	protected String format(String str) {
		int max = precision + 8;
		int padding = max - str.length();
		return str + this.repeat(" ", padding);
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

	public String printLatLon(TrafficState ownship, TrafficState intruder, double time) {
		// current intruder position
		Vect3 si = intruder.get_s(); // projected position of the intruder
		Velocity vi = intruder.get_v(); // projected velocity of the intruder

		// --- the following shows how to perform inverse transformation
		Position po = ownship.getPosition(); // ownship position in lat lon
		EuclideanProjection eprj = Projection.createProjection(po);
		LatLonAlt lla = eprj.inverse(si);
		Position px = Position.mkLatLonAlt(lla.lat(), lla.lon(), lla.alt());
		Velocity vx = eprj.inverseVelocity(si, vi, true);
		
		return intruder.getId() + "\t" + f.FmPrecision(Units.to("deg", px.lat()), precision) + "\t" + f.FmPrecision(Units.to("deg", px.lon()), precision) + "\t" + f.FmPrecision(Units.to("ft", px.alt()), precision) + "\t" 
				+ f.FmPrecision(Units.to("knot", vx.x), precision) + "\t" + f.FmPrecision(Units.to("knot", vx.y), precision) + "\t" + f.FmPrecision(Units.to("fpm", vx.z), precision) + "\t" + f.FmPrecision(time, precision);
	}

	// public String printIntruderXYZ(TrafficState ownship, TrafficState intruder) {
	// 	// current ownship position
	// 	Position po = ownship.getPosition(); // ownship position in lat lon
	// 	Vect3 so = ownship.get_s(); // projected position of the ownship
	// 	Velocity vo = ownship.get_v(); // projected velocity of the ownship

	// 	// current intruder position
	// 	EuclideanProjection eprj = Projection.createProjection(po);
	// 	Position pi = intruder.getPosition(); // intruder position in lat lon
	// 	Vect3 si = intruder.get_s(); // projected position of the intruder
	// 	Velocity vi = intruder.get_v(); // projected velocity of the intruder

	// 	// --- the following shows how to perform inverse transformation
	// 	// LatLonAlt lla = eprj.inverse(si);
	// 	// Position px = Position.mkLatLonAlt(lla.lat(), lla.lon(), lla.alt());

	// 	// return "{"
	// 	// 		+ "\"pi\": \"" + pi + "\", \n" 
	// 	// 		+ "\"si.x\": \"" + si.x + "\", \n"
	// 	// 		+ "\"si.y\": \"" + si.y + "\", \n" 
	// 	// 		+ "\"lla.lat\": \"" + lla.lat() + "\", \n" 
	// 	// 		+ "\"lla.lon\": \"" + lla.lon() + "\", \n"
	// 	// 		+ "\"px\": \"" + px + "\" " 
	// 	// 		+ " }";
	// 	return intruder.getId() + "\t" + si.x + "\t" + si.y + "\t" + si.z + "\t" + vi.x + "\t" + vi.y + "\t" + vi.z + "\n";
	// }

	public static void printHelp () {
		System.out.println("Usage: java -jar DAA2XYZ-2.0.e.jar fname.daa\n");
	}

    public static void main(String[] args) {

		if (args == null || args.length == 0) {
			printHelp();
			return;
		}

		PrintWriter out = new PrintWriter(System.out);
		PrintWriter out2 = new PrintWriter(System.out);
		
		String scenario = null;
		String output = null;

		// Process args
		int a = 0;
		while (a < args.length && args[a].startsWith("-")) {
			if (args[a].equals("--help") || args[a].equals("-help") || args[a].equals("-h")) {
				// printHelpMsg();
			} else if (args[a].startsWith("--out") || args[a].startsWith("-out") || args[a].equals("-o")) {
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
				output = scenario + ".xyz";
			}
			out = new PrintWriter(new BufferedWriter(new FileWriter(output)),true);
			out2 = new PrintWriter(new BufferedWriter(new FileWriter(output + ".daa")),true);
			System.out.println("Writing output into file " + output);
		} catch (Exception e) {
			System.err.println("** Error: " + e);
			System.exit(1);
		}

		// create daidalus
		Daidalus daa = new Daidalus();
		DAA2XYZ daa2xyz = new DAA2XYZ(daa);

		out.println(daa2xyz.printXYZDescriptor());
		out2.println(daa2xyz.printLatLonDescriptor());

		// Process input file using DaidalusFileWalker
		DaidalusFileWalker walker = new DaidalusFileWalker(input);
		while (!walker.atEnd()) {
			double time = walker.getTime();
			walker.readState(daa);
			for (int idx = 0; idx <= daa.lastTrafficIndex(); idx++) {
				TrafficState ownship = daa.getOwnshipState();
				TrafficState traffic = daa.getAircraftStateAt(idx);
				out.println(daa2xyz.printXYZ(ownship, traffic, time));
				out2.println(daa2xyz.printLatLon(ownship, traffic, time));
			}
		}

		out.close();
	}
}