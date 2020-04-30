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

import java.util.Optional;
import gov.nasa.larcfm.ACCoRD.ConflictData;
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
	protected int xmax = 32;
	protected int ymax = 32;

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

	protected Vect3 alignToNMIGrid (Vect3 v) {
		return new Vect3(Math.floor(v.x * 60) / 60, Math.floor(v.y * 60) / 60, v.z);
	}

	public String jsonLosRegionsH (double dtime) {
		TrafficState ownship = daa.getOwnshipState();
		String time = f.Fm8(dtime);
		String ans = "\"time\": " + time + ", \"conflicts\": [";
		for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
			TrafficState intruder = daa.getAircraftStateAt(ac);
			String res = _jsonLosHRegions(ownship, intruder);
			ans += res;
			if (ac < daa.lastTrafficIndex()) {
				ans += ",\n";
			}
		}
		ans += "]";
		return "{ " + ans + " }";
	}

	protected String _jsonDetectLosHRegionAtTime(double t, Detection3D detector, TrafficState ownship, TrafficState intruder) {
		// get position information
		Vect3 so = ownship.get_s(); // projected ownship position
		Velocity vo = ownship.get_v(); // projected ownship velocity
		Vect3 si = intruder.get_s(); // projected intruder position
		Velocity vi = intruder.get_v(); // projected intruder velocity

		// create reference point for projections
		Position po = ownship.getPosition(); // current ownship position of the ownship (lat lon)
		EuclideanProjection eprj = Projection.createProjection(po); // reference point for projections is always the ownship

		// utilities for creating a formatted json object
		String ans = null;
		
		// estimate position of the ownship at time_in, and use this position as reference for the exploration of the airspace when searching for conflict regions
		Vect3 position_at_time_t = new Vect3(so.x + vo.x * t, so.y + vo.y * t, so.z); // maintain the same altitude
		Vect3 grid_sector = position_at_time_t; //this.alignToNMIGrid(position_at_time_t);
		// x and y are used to move the intruder's position over the horizontal plane
		double delta = Units.from("nmi", this.sectorNMI); // sector size, in meters
		for (int x = -xmax; x < xmax; x++) {
			// Boolean losDetected = false;
			for (int y = -ymax; y < ymax; y++) {
				double deltaX = delta * x;
				double deltaY = delta * y;

				// algorithm based on Chorus.HorizView.drawLoSCoverage
				Vect3 cso = grid_sector.Add(new Vect3(deltaX, deltaY, 0)); // position of the sector we want to test for conflicts
				double dt = so.distanceH(cso) / vo.gs(); // time necessary to get to position nso
				Velocity nvo = vo.mkTrk(cso.Sub(so).vect2().trk()); // new velocity vector of the ownship, computed by changing the heading of the current velocity vector of the ownship so that it points towards cso

				Vect3 nso = cso.mkZ(so.z+dt*vo.vs()); // move ownship "forward" in vertical space for this offset. // ??? what does it mean?
				Vect3 nsi = si.AddScal(dt, vi); // estimate new position of the intruder after time dt

				boolean los = detector.violation(nso, nvo, nsi, vi);

				// transform nso back to latlon, so we can render the point on the map
				LatLonAlt lla = eprj.inverse(cso); // position of the sector, in latlon
				Position px = Position.mkLatLonAlt(lla.lat(), lla.lon(), lla.alt()); // px is all in internal units, i.e., lat lon alt are in meters at this point

				if (this.VERBOSE || los) {
					ans = (ans == null) ? "\n" : ans + ",\n";
					ans += "\t{ " 
						+ "\"los\": " + los + ", " 
						+ "\"time\": \"" + t + "\", " // using strings because time can be Infinity
						+ "\"level\": " + this.alertLevel + ", " 
						+ "\"lat\": \"" + Units.to("deg", px.lat()) 
						+ "\", \"lon\": \"" + Units.to("deg", px.lon()) 
						+ "\", \"alt\": \"" + Units.to("ft", px.alt())
						+ "\" }";
				}
			}
		}
		return ans;
	}


	// horizontal conflict regions, returns a String representation of a JSON object
    protected String _jsonLosHRegions(TrafficState ownship, TrafficState intruder) {
		if (ownship != null && intruder != null) {
			int idx = intruder.getAlerterIndex();
			Optional<Detection3D> dd = daa.getAlerterAt(idx).getDetector(this.alertLevel);
			if (!dd.isPresent()) {
				System.err.println("[DAALoSRegionV2] Warning: Detection3D is null");
				return null;
			}
			Detection3D detector = dd.get();
			ConflictData det = this.daa.violationOfAlertThresholds(idx, this.alertLevel);

			// conflicts at current time
			String ans = this._jsonDetectLosHRegionAtTime(0, detector, ownship, intruder);
			// // conflicts at time in
			// if (det.time_in != 0) {
			// 	String ans_time_in = this._jsonDetectLosHRegionAtTime(det.time_in, detector, ownship, intruder);
			// 	if (ans == null) {
			// 		ans = ans_time_in;
			// 	} else { // ans != null
			// 		if (ans_time_in != null) {
			// 			ans += "," + ans_time_in;
			// 		}
			// 	}
			// }
			// // conflicts at time out
			// if (det.time_out != 0) {
			// 	String ans_time_out = this._jsonDetectLosHRegionAtTime(det.time_out, detector, ownship, intruder);
			// 	if (ans == null) {
			// 		ans = ans_time_out;
			// 	} else { // ans != null
			// 		if (ans_time_out != null) {
			// 			ans += "," + ans_time_out;
			// 		}
			// 	}
			// }

			ans = (ans == null) ? "" : ans;
			return "{ \"ac\": \"" + intruder.getId() + "\", \"detector\": \"" + det.toString() + "\", \"sectors\": [ " + ans + " ] }";
		}
		return null;
	}

	public void walkFile () {
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

		los.walkFile();
	}
}
