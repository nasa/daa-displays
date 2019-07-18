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
import gov.nasa.larcfm.ACCoRD.KinematicBandsParameters;

import gov.nasa.larcfm.Util.Vect3;
import gov.nasa.larcfm.Util.Velocity;
import gov.nasa.larcfm.Util.EuclideanProjection;
import gov.nasa.larcfm.Util.LatLonAlt;
import gov.nasa.larcfm.Util.Position;
import gov.nasa.larcfm.Util.Projection;
import gov.nasa.larcfm.Util.Units;
import gov.nasa.larcfm.ACCoRD.Detection3D;
import gov.nasa.larcfm.ACCoRD.TrafficState;

import gov.nasa.larcfm.Util.f;


public class DAALoSRegion {

	protected Boolean VERBOSE = true;

	protected static final EuclideanProjection eprj = Projection.createProjection(Position.ZERO_LL);
	protected Daidalus daa = null;
	protected Detection3D detector = null;
	protected int alertLevel = 2;
	protected String daaConfig = null;

	// 1 degree latitude is 69 miles and 60nmi
	// 1 degree longitude is ~69 miles and ~60nmi
	// 1 nautical mile is 1.15078 miles
	protected int sectorNMI = 5; // each sector is 5nmi x 5nmi
	protected final String sectorUnits = "nmi";
	protected int xmax = 4;
	protected int ymax = 4;

	public Boolean setAlertLevel (int alertLevel) {
		if (this.daa != null) {
			this.alertLevel = alertLevel;
			this.detector = this.daa.parameters.alertor.detector(this.alertLevel).get(); // see ACCoRD.AlertLevels
			return true;
		}
		return false;
	}
	public DAALoSRegion (Daidalus daa) {
		this.daa = daa;
		this.setAlertLevel(2);
	}
	public DAALoSRegion (Daidalus daa, int alertLevel) {
		this.daa = daa;
		this.setAlertLevel(alertLevel);
	}
	public DAALoSRegion (Daidalus daa, int alertLevel, String daaConfig) {
		this.daa  = daa;
		// always load config before setting alert level
		this.loadDaaConfig(daaConfig);
		this.setAlertLevel(alertLevel);
	}
	public Boolean loadDaaConfig (String daaConfig) {
		if (this.daa != null) {
			if (daaConfig != null) {
				this.daaConfig = daaConfig;
				Boolean paramLoaded = this.daa.parameters.loadFromFile(daaConfig);
				if (paramLoaded) {
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
	public String getDaaConfigFileName () {
		if (this.daaConfig != null) {
			return this.daaConfig.split("/")[ this.daaConfig.split("/").length - 1 ];
		}
		return null;
	}

	public String printLosSettings (String scenario) {
		return "\"WellClear\": { \"version\": \"" + KinematicBandsParameters.VERSION + "\", \"configuration\": \"" + this.getDaaConfigFileName() + "\" },\n"
			+ "\"Scenario\": \"" + scenario + "\",\n"
			+ "\"Detector\": \"" + this.detector + "\",\n"
			+ "\"AlertLevel\": " + this.alertLevel + ",\n"
			+ "\"Grid\": { \"sectorSize\": " + this.sectorNMI + ", \"sectorUnits\": \"" + this.sectorUnits + "\", \"xmax\": " + this.xmax + ", \"ymax\": "+ this.ymax + " }";
	}

	public String printHorizontalLoSRegions () {
		TrafficState ownship = daa.getOwnshipState();
		String time = f.Fm8(ownship.getTime());
		String ans = "\"time\": " + time + ", \"conflicts\": [";
		for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
			TrafficState intruder = daa.getAircraftState(ac);
			String res = printHorizontalLosRegions(detector, ownship, intruder);
			ans += res;
			if (ac < daa.lastTrafficIndex()) {
				ans += ",\n";
			}
		}
		ans += "]";
		return "{ " + ans + " }";
	}

	// horizontal conflict regions, returns a String representation of a JSON object
    public String printHorizontalLosRegions(Detection3D detector, TrafficState ownship, TrafficState intruder) {
		if (detector != null && ownship != null && intruder != null) {
			if (ownship.getTime() == intruder.getTime()) {
				
				double delta = this.sectorNMI / 60.0; // sector size, in deg

				String tmp = ""; 
				// set ownship position
				// x and y are used to move the intruder's position over the horizontal plane
				int totConflictPoints = 0;
				for (int x = -xmax; x < xmax; x++) {
					for (int y = -ymax; y < ymax; y++) {
						//----------
						double deltaLat = delta * x; // deg
						double deltaLon = delta * y; // deg
						double deltaX = Units.to("rad", deltaLat);
						double deltaY = Units.to("rad", deltaLon);
						
						// Velocity vo = ownship.get_v();
			
						// Position px = Position.makeLatLonAlt(
						// 	deltaX + pi.latitude(),
						// 	deltaY + pi.longitude(),
						// 	pi.altitude()
						// );
						// // System.out.println("pi: " + pi);
						// // System.out.println("px: " + px);
						
						// Vect3 so = ownship.get_s();
						// Velocity vo = ownship.get_v();

						// Vect3 sx = eprj.project(px);
						// Velocity vi = intruder.get_v();

						// boolean conflict = detector.violation(so, vo, sx, vi);
						//-----------

						// current ownship position
						Position po = ownship.getPosition(); // actual position
						Vect3 so = ownship.get_s(); // projected position
						Velocity vo = ownship.get_v(); // velocity

						// current intruder position
						Position pi = intruder.getPosition();
						Vect3 si = intruder.get_s(); // projected position
						LatLonAlt lla = eprj.inverse(si);
						Position px = Position.mkLatLonAlt(lla.lat(), lla.lon(), lla.alt());


						Velocity vi = intruder.get_v(); // velocity
						
						// future intruder position
						// FIXME: the exploration of future positions should take into account current speed and velocity of the intruder
						// Vect3 sx = new Vect3(si.x + deltaX, si.y + deltaY, si.z);
						// how do I convert sx to latlonalt??
						// project velocity of the intruder wrt the position of the ownship
						Velocity vx = intruder.vel_to_v(po, vi);
						boolean los = false;//detector.violation(so, vo, sx, vx);

						if (this.VERBOSE || los) {
							totConflictPoints++;
							tmp += (tmp.equals("")) ? "\n" : ",\n";
							tmp += "{" 
										+ "\"lla.lat\": \"" + lla.lat() + "\", " 
										+ "\"lla.lon\": \"" + lla.lon() + "\", " 
										+ "\"si.x\": \"" + si.x + "\", "
										+ "\"si.y\": \"" + si.y + "\", " 
										// + "\"deltaX\": \"" + deltaX + "\", " 
										+ "\"px\": \"" + px + "\", " 

										+ "\"los\": " + los + ", " 
										+ "\"level\": " + this.alertLevel + ", " 
										+ "\"lat\": \"" + Units.convert("rad", "deg", pi.lat()) 
										+ "\", \"lon\": \"" + Units.convert("rad", "deg", pi.lon()) 
										+ "\", \"alt\": \"" + Units.convert("m", "ft", pi.alt()) + "\" }";
						}
					}
					tmp += "\n";
				}
				tmp = "{ \"ac\": \"" + intruder.getId() + "\", \"sectors\": [ " + tmp + "], \"length\": " + totConflictPoints + " }";
				return tmp;
			} else {
				System.err.println("Warning: Time mismatch between ownship and intruder");
			}
		}
		return null;
	}

    public static void main(String[] args) {

		PrintWriter out = new PrintWriter(System.out);
		String config = null;
		String scenario = null;
		String output = null;
		int alertLevel = 2;

		// Process args
		int a = 0;
		while (a < args.length && args[a].startsWith("-")) {
			if (args[a].equals("--help") || args[a].equals("-help") || args[a].equals("-h")) {
				// printHelpMsg();
			} else if (args[a].startsWith("--conf") || args[a].startsWith("-conf") || args[a].equals("-c")) {
				config = args[++a];
			} else if (args[a].startsWith("--out") || args[a].startsWith("-out") || args[a].equals("-o")) {
				output = args[++a];
			} else if (args[a].startsWith("--level") || args[a].startsWith("-level") || args[a].equals("-l")) {
				alertLevel = Integer.parseInt(args[++a]);
            } else if (args[a].startsWith("--version") || args[a].startsWith("-version")) {
				System.out.println(KinematicBandsParameters.VERSION);
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
				output = scenario + ".LoS.json";
			}
			out = new PrintWriter(new BufferedWriter(new FileWriter(output)),true);
			System.out.println("Writing output into file " + output);
		} catch (Exception e) {
			System.err.println("** Error: " + e);
			System.exit(1);
		}

		// create daidalus and los
		Daidalus daa = new Daidalus();
		DAALoSRegion los = new DAALoSRegion(daa, alertLevel, config);

		out.println("{");
		out.print(los.printLosSettings(scenario));
		out.println(",");
		out.println("\"LoS\": [");

		// Process input file using DaidalusFileWalker
		DaidalusFileWalker walker = new DaidalusFileWalker(input);
		while (!walker.atEnd()) {
			walker.readState(daa);
			out.println(los.printHorizontalLoSRegions());
			if (!walker.atEnd()) {
				out.println(",");
			};
		}

		out.println("]}");        
		out.close();
	}
}