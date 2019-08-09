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
import java.util.Optional;

import gov.nasa.larcfm.ACCoRD.ConflictData;
import gov.nasa.larcfm.ACCoRD.Daidalus;
import gov.nasa.larcfm.ACCoRD.DaidalusFileWalker;

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

import static gov.nasa.larcfm.ACCoRD.DaidalusParameters.VERSION;


public class DAALoSRegionV2 extends DAABandsV2 {

	protected String tool_name = "DAALoSRegionV2";

	protected int alertLevel = 2;

	// 1 degree latitude is 69 miles and 60nmi
	// 1 degree longitude is ~69 miles and ~60nmi
	// 1 nautical mile is 1.15078 miles or 1.852km
	protected int sectorNMI = 1; // each sector is 1nmi x 1nmi
	protected final String sectorUnits = "nmi";
	protected int xmax = 8;
	protected int ymax = 8;

	protected Boolean VERBOSE = false;

	@Override
	public String getVersion () {
		return "LoS-" + VERSION;
	}

	@Override
	protected String jsonHeader () {
		return "\"Info\": { \"version\": \"" + VERSION + "\", \"configuration\": \"" + this.getDaaConfig() + "\" },\n"
			+ "\"Scenario\": \"" + scenario + "\",\n"
			+ "\"AlertLevel\": " + this.alertLevel + ",\n"
			+ "\"Grid\": { \"sectorSize\": " + this.sectorNMI + ", \"sectorUnits\": \"" + this.sectorUnits + "\", \"xmax\": " + this.xmax + ", \"ymax\": "+ this.ymax + " }";
	}

	public Boolean setAlertLevel (int alertLevel) {
		if (this.daa != null) {
			this.alertLevel = alertLevel;
			return true;
		}
		return false;
	}

	public String jsonLosRegionsH (double dtime) {
		TrafficState ownship = daa.getOwnshipState();
		String time = f.Fm8(dtime);
		String ans = "\"time\": " + time + ", \"conflicts\": [";
		for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
			TrafficState intruder = daa.getAircraftStateAt(ac);
			String res = _jsonLosRegionsH(ownship, intruder);
			ans += res;
			if (ac < daa.lastTrafficIndex()) {
				ans += ",\n";
			}
		}
		ans += "]";
		return "{ " + ans + " }";
	}


	// horizontal conflict regions, returns a String representation of a JSON object
    protected String _jsonLosRegionsH(TrafficState ownship, TrafficState intruder) {
		if (ownship != null && intruder != null) {
			int idx = intruder.getAlerterIndex();
			Optional<Detection3D> dd = daa.getAlerterAt(idx).getDetector(this.alertLevel);
			if (!dd.isPresent()) {
				System.err.println("[DAALoSRegionV2] Warning: Detection3D is null");
				return null;
			}
			Detection3D detector = dd.get();
			ConflictData det = this.daa.violationOfAlertThresholds(idx, this.alertLevel);

			// estimate position of the intruder at time_in
			Position po = ownship.getPosition(); // current ownship position in lat lon
			EuclideanProjection eprj = Projection.createProjection(po); // reference point for projections is always the ownship
			Vect3 si = intruder.get_s(); // projected intruder position
			Velocity vi = intruder.get_v(); // projected intruder velocity

			// Vect3 cpa = si.Add(vi.Scal(time2CPA));
			Vect3 pos_at_time_in = new Vect3(si.x + vi.x * det.time_in, si.y + vi.y * det.time_in, si.z + vi.z * det.time_in);

			String ans = "";
			// x and y are used to move the intruder's position over the horizontal plane
			double delta = Units.from("nmi", this.sectorNMI); // sector size, in meters
			int totConflictPoints = 0;
			Boolean first = true;
			for (int x = 0; x < xmax; x++) {
				Boolean losDetected = false;
				for (int y = 0; y < ymax; y++) {
					double deltaX = Math.signum(vi.x) * delta * x; // meters, the sign of vi.x is used to scan the region in the airspace in front of the intruder aircraft -- the aircraft does not fly backwards
					double deltaY = Math.signum(vi.y) * delta * y; // meters, the sign of vi.y is used to scan the region in the airspace in front of the intruder aircraft

					// future intruder position
					Vect3 sx = pos_at_time_in.Add(new Vect3(deltaX, deltaY, 0)); // projected intruder position + delta
					Velocity vx = intruder.vel_to_v(po, vi); // projected velocity, wrt the ownship
					boolean los = detector.violation(ownship.get_s(), ownship.get_v(), sx, vx);

					// transforming sx back to latlon, this is necessary for rendering purposes
					LatLonAlt lla = eprj.inverse(sx); // intruder position in latlon
					Position px = Position.mkLatLonAlt(lla.lat(), lla.lon(), lla.alt()); // px is all in internal units, i.e., lat lon alt are in meters at this point

					if (this.VERBOSE || los) {
						totConflictPoints++;
						ans += (first) ? "\n" : ",\n";
						ans += "{ " 
							+ "\"los\": " + los + ", " 
							+ "\"time_in\": \"" + det.time_in + "\", " // using strings because time_in can be Infinity
							+ "\"level\": " + this.alertLevel + ", " 
							+ "\"lat\": \"" + Units.to("deg", px.lat()) 
							+ "\", \"lon\": \"" + Units.to("deg", px.lon()) 
							+ "\", \"alt\": \"" + Units.to("ft", px.alt())
							+ "\" }";
						first = false;
						losDetected = true;
					}
				}
				if (losDetected) {
					ans += "\n";
				}
			}
			ans = "{ \"ac\": \"" + intruder.getId() + "\", \"detector\": \"" + det.toString() + "\", \"sectors\": [ " + ans + " ], \"length\": " + totConflictPoints + " }";
			return ans;
		}
		return null;
	}

	public void walkFile (DaidalusWrapperInterface wrapper) {
		/* Create DaidalusFileWalker */
		DaidalusFileWalker walker = new DaidalusFileWalker(ifname);

		if (walker != null) {	
			this.createPrintWriter();
			printWriter.println("{" + this.jsonHeader() + ",");
			printWriter.println("\"LoS\": [\n");
			/* Process input file */
			while (!walker.atEnd()) {
				walker.readState(daa);
				double time = daa.getCurrentTime();
				// write output
				printWriter.println(this.jsonLosRegionsH(time));
				if (!walker.atEnd()) {
					printWriter.println(",");
				}
			}
			printWriter.println("\n]}");
			this.closePrintWriter();
		}
	}


	public static void main(String[] args) {
		DAALoSRegionV2 los = new DAALoSRegionV2();
		los.parseCliArgs(args);
		if (!los.inputFileReadable()) {
			System.err.println("** Error: File " + los.getInputFileName() + " cannot be read");
			System.exit(1);
		}
		los.loadDaaConfig();

		los.walkFile(null);
	}
}