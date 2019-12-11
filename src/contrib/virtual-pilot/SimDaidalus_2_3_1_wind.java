/* ====================================================================
 *  Author:      Victor Carreño
 *  Date: 29 April 2019
 *  version 2.3.1
 * 
 *  The development of this program has been funded under contract to
 *  the National Aeronautics and Space Administration.
 *
 *  Copyright (c) 2019 United States Government as represented by
 *  the National Aeronautics and Space Administration.  No copyright
 *  is claimed in the United States under Title 17, U.S.Code. All Other
 *  Rights Reserved.
 * ====================================================================
 *
 *  Version 2.3.1 redesigns the wrapper to dynamically change the alerting time
 *  based on the closest point of approach. This method avoids the complexity of
 *  having to check and determine if the traffic aircraft is changeing direction,
 *  horizontal speed, or vertical speed.
 * 
 *  Version 2.3.0 adds a wrapper around the DAIDALUS resolution to maintain
 *  the resolution for a duration equivalent to the time that the pilot/virtual pilot
 *  requires to implement the resolution. This prevents the resolution/resolution bands
 *  from disappearing while the pilot is performing the maneuver and then re-appearing 
 *  if the pilot does not follow through with the maneuver.
 *
 *  Version 2.2.1 fixes an error in the vritual pilot module. The virtual 
 *  pilot could have returned an invalid heading or vertical speed (Infinity or NaN).
 *
 *  Version 2.2.0 adds wind to the simulation. The initial conditions
 *  are aircraft's true wind speed and heading. The wind is added to the 
 *  aircraft's true air speed and heading to produce the ground speed
 *  and direction.
 * 
 *  The severity of the encounter is evaluated with and witout virtual
 *  pilot intervention.
 * 
 *
 *  Input:
 *    file.ic:  file with the aircraft initial conditions in the "daa" format
 *              The initial conditions should have units of:
 *              NAME   lat   lon   alt  heading as     vs    time
 *              [none] [deg] [deg] [ft] [deg]   [knot] [fpm] [s]
 *    file.config:  configuaration file (optional).
 *        if no configuarion file is specified, the configuarion is identical to WC_SC_228_std.txt
 *
 *
 *  Output:
 *     There are two outputs from this program:
 *
 *     1st.
 *     file.daa:  file containing the states of the aircraft in "daa" format.
 *     output parameters:   NAME   lat   lon   alt  trk   gs     vs    time
 *     parameters' units:   [none] [deg] [deg] [ft] [deg] [knot] [fpm] [s]
 *
 *     2nd.
 *     The severity of each run with minimum horizontal, minim  vertical and 
 *     other data is written directly to the terminal. The format is comma 
 *     separated values.
 *   
 *     Examples of usage:
 *     java SimDaidalus_2_3_0_wind --conf sim.conf scenario_1.ic
 *     java SimDaidalus_2_3_0_wind --conf sim.conf scenario_1.ic > scenario_1_severity.data
 *     
 */

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.util.Optional;

import gov.nasa.larcfm.Util.*;

import gov.nasa.larcfm.ACCoRD.*;

import static gov.nasa.larcfm.ACCoRD.DaidalusParameters.VERSION;

public class SimDaidalus_2_3_1_wind {

	static protected Boolean VERBOSE = false;

	static protected void print (String str) {
		if (VERBOSE) {
			System.out.print(str);
		}
	}


	static protected void println (String str) {
		if (VERBOSE) {
			System.out.println(str);
		}
	}

	static String VP_VERSION = "2.3.1-" + VERSION;

    static Optional<Detection3D> detector;
    
    static void printHelpMsg() {
		System.out.println();
		//System.out.println("SimDaidalus:\n\tGenerates a file in \"daa\" format with the states of the aircraft");
		System.out.println("Usage:");
		System.out.println("\033[0;32m  java -jar SimDaidalus_2_3_2_wind-<WellClearVersion>.jar --config wellclear.conf [options] file.ic\033[0m\n");
		System.out.println("  wellclear.conf is a text file containing the WellClear configuration.");
		System.out.println("  file.ic is a text file containing the initial conditions of the simulation.\n");
		System.out.println("  An example file.ic is as follows:");
		System.out.println("     NAME        lat          lon      alt      trk     gs    vs   time");
		System.out.println("    [none]      [deg]        [deg]     [ft]   [deg]  [knot] [fpm] [s]");
		System.out.println("   ownship, 37.00000000, -76.897000, 6500.00, 270.00, 160.0, 0.00, 0.0");
		System.out.println("    a63ed4, 37.08200,  -77.00000000, 6500.00, 180.00, 160.0, 0.00, 0.0");
		System.out.println("    a63ed5, 37.08200,  -77.00000000, 5500.00, 180.00, 160.0, 0.00, 0.0");
		System.out.println("\nOptions:");
		System.out.println("  --wind (x,y,z)\n\tWind vector, in knots, e.g., 0,50,0");
		System.out.println("  --delay val\n\tPilot delay, in seconds (default: 5secs)");
		System.out.println("  --steps val\n\tSimulation steps, in seconds (default: 320secs)");
		System.out.println("  --output file.daa\n\tWrite output file file.daa");
		System.out.println("  --version \n\tShow well clear version number");
		System.exit(0);
    }

    static int region2value(BandsRegion r) {
		switch (r) {
			case NONE: return 0;
			case FAR: return 1;
			case MID: return 2;
			case NEAR: return 3;
			case RECOVERY: return 4;
			default: return -1;
		}
	}
	
    public static void main(String[] args) {
		if (args == null || args.length == 0) {
			printHelpMsg();
		}

		PrintWriter out = new PrintWriter(System.out);
		String config = null;
		String scenario = null;
		String output = null;

		// Wind variable.
		Velocity wind = Velocity.makeVxyz(0.0, 0.0, 0.0);

		// Pilot delay
		Double pilot_delay = 5.0;

					
		// Simulaton duration, seconds (number of steps).
		int sim_duration = 320;
	
		/* Read options */
		int a = 0;
		for (; a < args.length && args[a].startsWith("-"); a++) {
			if (args[a].equals("--help") || args[a].equals("-help") || args[a].equals("-h")) {
				printHelpMsg();
			} else if (args[a].startsWith("--conf") || args[a].startsWith("-conf") || args[a].equals("-c")) {
				config = args[++a];
			} else if (args[a].startsWith("--output") || args[a].startsWith("-output") || args[a].equals("-o")) {
				output = args[++a];
			} else if (args[a].startsWith("--version") || args[a].startsWith("-version") || args[a].equals("-v")) {
				// System.out.println(SimDaidalus_2_3_1_wind.VP_VERSION);
				System.out.println(VERSION);
				System.exit(0);
			} else if (args[a].startsWith("--delay") || args[a].startsWith("-delay") || args[a].startsWith("-d")) {
				pilot_delay = Double.parseDouble(args[++a]);
			} else if (args[a].startsWith("--steps") || args[a].startsWith("-steps") || args[a].startsWith("-s")) {
				sim_duration = Integer.parseInt(args[++a]);
			} else if (args[a].startsWith("--wind") || args[a].startsWith("-wind") || args[a].startsWith("-w")) {
				// Define wind. Wind is specified in the direction that it is blowing,
				// not where is coming from.
				// For example, an easterly wind is a wind in the 270 direction.
				// Wind out of the south at 50 knots.
				// wind = Velocity.makeVxyz(0.0, 50.0, 0.0); // x-knots, y-knots, z-fpm. 
				// Wind out of the west at 50 knots.
				// wind = Velocity.makeVxyz(50, 0, 0); // x-knots, y-knots, z-fpm.
				// Wind out of the south-east at 65 knots.
				// wind = Velocity.makeVxyz(-45.961941, 45.961941, 0);
				String[] w = args[++a].split(",");
				if (w.length == 3) {
					wind = Velocity.makeVxyz(Double.parseDouble(w[0]), Double.parseDouble(w[1]), Double.parseDouble(w[2]));
				} else {
					System.err.println("Warning: invalid wind vector provided from command line " + args[a]);
					System.out.println("Using default wind vector " + wind);
				}
			} else if (args[a].startsWith("-")) {
				System.err.println("** Error: Invalid option " + args[a]);
				System.exit(1);
			}
		}
		if (config == null) {
			System.err.println("** Error: Expecting a WellClear configuration file. ***\n Try --help for usage.");
			System.exit(1);
		}
		if (a+1 != args.length) {
			System.err.println("** Error: Expecting one .ic input file. ***\n Try --help for usage.");
			System.exit(1);
		}

		String input = args[a];
		File file = new File(input);
		if (!file.exists() || !file.canRead()) {
			System.err.println("** Error: File " + input + " cannot be read");
			System.exit(1);
		}
		try {
			String name = file.getName();
			scenario = name.contains(".") ? name.substring(0, name.lastIndexOf('.')):name;
			if (output == null) {
				output = scenario + ".daa";
			} 
			out = new PrintWriter(new BufferedWriter(new FileWriter(output)),true);
			// System.out.println(" ");
			// System.out.println("Writing file "+output+"   ");
		} catch (Exception e) {
			System.err.println("** Error: "+e);
			System.exit(1);
		}

		System.out.println("-----------------------------------");
		System.out.println("WellClear config: " + config);
		System.out.println("Wind vector: " + wind);
		System.out.println("Pilot delay: " + pilot_delay);
		System.out.println("Simulation steps: " + sim_duration);
		System.out.println("Input file: " + input);
		System.out.println("Output file: " + output);
		System.out.println("-----------------------------------");
	
		/***** Variable declarations and object construction. *******/
		/*****                                                 *******/
		
		// Time varaibles.
		double time_ic, time_sim, time_conflict;
		// Start counting when hor direction is inside band 2 (MID) or 3 (NEAR).
		double hd_delay_clock = 0.0;
		// Start counting when ver speed is inside band 2 (MID) or 3 (NEAR).
		double vs_delay_clock = 0.0;
		double time_impl_delay;

		// Resolution variables.
		int hor_dir_region, hor_dir_region_initial, ver_speed_region;
		double hor_dir_reso_right, hor_dir_reso_left;
		double ver_speed_reso_up, ver_speed_reso_down;
		boolean validR, validL;
		boolean conflict_resolution_mode = false;
		double time2CPA;
		Alerter alerter; AlertThresholds athr;
		double alerting_time_param;
	
		// State variables own
		double heading_own, heading_own_new, trk_own, trk_own_new;
		double airspeed_own, gs_own;
		Velocity velocity_own_ground, velocity_own_air;
		double initial_heading = 0.0;
		double initial_vert_speed = 0.0;
		double initial_alt;
		double ver_speed_own, ver_speed_own_new;
		Position position_own;
		Vect2 hd_vs_new;
		Velocity g_velocity_own;
		
		// State variables traffic
		double heading_traf, trk_traf;
		double airspeed_traf;
		Velocity velocity_traf_ground, velocity_traf_air;
		double ver_speed_traf;
		Position position_traf;
		
		// Severity variables.
		Vect2 min_horizontal_distance = new Vect2(100000.0, 1000.0);
		Vect2 min_vertical_distance =   new Vect2(100000.0, 1000.0);
		Vect3 max_squircle = new Vect3(0.0, 100000.0, 100000.0);
		Vect3 severity;
	
		// Create a Daidalus object and set the configuration parameters.
		Daidalus daa = new Daidalus();
		if (config != null && !daa.loadFromFile(config)) {
			System.err.println("** Error: Configuration file "+config+" not found");
			System.exit(1);
		}
		
		ConflictData det;
	
		/* Get initial conditions from input file.
		The input file should have a header and the state of the 
		ownship and traffic aircraft.  

		The initial conditions are specified in terms of track and ground speed.
		Once the wind is defined, the horizontal direction will be heading and 
		the horizontal speed will be true airspeed.
		*/
		
		/* Creat a DaidalusFileWalker */
		DaidalusFileWalker walker = new DaidalusFileWalker(input);

		// Print output file header.
		out.println("NAME     lat          lon           alt          trk         gs           vs         time");
        out.println("[none]   [deg]        [deg]         [ft]         [deg]       [knot]       [fpm]      [s]");
	
		// Get states from the initial conditions file.
		// The initial conditions file has earth reference states. That is, track and ground speed.
		walker.readState(daa);
		String name_traf = daa.getAircraftStateAt(1).getId();

		// Assign values to alerter and alerThresholds variables.
		alerter = daa.getAlerterAt(1); // alerter for aircraft 1.
		athr = alerter.getLevel(2); // Threshold parameters for Level 2 for aircraft 1.
		
		// Get the initial time.
		time_ic = daa.getCurrentTime();

		
		// System.out.print("severity %,         hor at worst sev,   vert at worst sev, ");
		// System.out.print(" min hor,            vert at min hor,   hor at min vert,   min vertical, ");
		// System.out.println("    imple delay 2 ");

		// Set the wind field in the Daidalus object.
		// The calcualted resolutions will be heading, 
		// airspeed, and vertical speed.
		daa.setWindVelocityTo(wind);

		// Get the alerter and threshold parameters.
		alerter = daa.getAlerterAt(1);
		athr = alerter.getLevel(2);
		alerting_time_param = athr.getAlertingTime();
		
		// The time at the start of the simulation is the initial conditions time.
		time_sim = time_ic;
			
		// Assign a pilot delay.
		time_impl_delay = pilot_delay;

		/******* Start simulation loop ******************/
		/*******                       ******************/
			
		for (int j=0; j < sim_duration; j++) {

			/* Write states to output file. */
			writeState(daa, out);
			
			// Determine severity of encounter. 
			// severity returns (squircle severity, range, vertical_distance). 
			severity = severity(daa);

			// System.out.print(" time "+time_sim);
			// System.out.println(" severity "+severity.x()+" range "+severity.y()+" vertical dist "+severity.z());
	    
			if (severity.x() > max_squircle.x()) {
				max_squircle = severity;
			}

			// Only count minimum horizontal distance if the vertical distance is
			// 450 feet or less.
			if (severity.y() < min_horizontal_distance.x() && severity.z()*3.281 <= 450.0) {
				min_horizontal_distance = new Vect2(severity.y(), severity.z());
			}
	    
			// Only count minimum vertical distance if the horizontal distance is
			// 5,000 feet of less.
			if (severity.z() < min_vertical_distance.y() && severity.y()*3.281 <= 5000.0) {
				min_vertical_distance = new Vect2(severity.y(), severity.z());
			}

			// Set the wind field in the Daidalus object.
			// The calcualted resolutions will be heading, 
			// airspeed, and vertical speed.
			daa.setWindVelocityTo(wind);
			
			if (j == 0) {
				// Save the initial heading, vertical speed, and altitude to implement recovery.
				initial_heading = daa.getOwnshipState().horizontalDirection(); // radians.
				initial_vert_speed = daa.getOwnshipState().verticalSpeed(); // meters/second.
				initial_alt = daa.getOwnshipState().getPosition().alt(); // meters.
			}
	    
			// Current heading and vertical speed, own.
			heading_own = daa.getOwnshipState().horizontalDirection(); // radians.
			ver_speed_own = daa.getOwnshipState().verticalSpeed(); 
			airspeed_own = daa.getOwnshipState().horizontalSpeed(); // meters/sec.

			// Ground velocity.
			g_velocity_own = daa.getOwnshipState().getGroundVelocity(); // degrees, knots, feet/min.

			println("");
			print(" Time "+time_sim);
			print(" Ground Velocity vector own "+g_velocity_own);
			println(" heading own "+heading_own*180/Math.PI+" airspeed "+airspeed_own*3600/1852);
			
			//  Obtain resolutions.
			// Horizontal
			hor_dir_reso_right = daa.horizontalDirectionResolution(true);
			hor_dir_reso_left = daa.horizontalDirectionResolution(false);
			
			print("  heading reso right  "+hor_dir_reso_right*180/Math.PI);
			println(" heading reso left  "+hor_dir_reso_left*180/Math.PI);

			// Vertical
			ver_speed_reso_up = daa.verticalSpeedResolution(true);
			ver_speed_reso_down = daa.verticalSpeedResolution(false);

			
			print("ver speed reso up "+ver_speed_reso_up*60*3.28084);
			println("  ver speed reso down "+ver_speed_reso_down*60*3.28084);
			
			det = daa.violationOfAlertThresholds(1,2);
			println(" time to cpa 2D "+det.tcpa2D()+"; time to cpa 3D "+det.tcpa3D()+"; time to coalt "+det.tcoa());

			
			/* Wrapper to dynamically adjust the alerting time of DAIDALUS to prevent
			* resolution bands from disapearing and reapearing as the pilot implements
			* the resolution maneuver.
			*/

			// Check if ownship's heading or vertical speed are inside conflict bands 
			hor_dir_region = region2value(daa.regionOfHorizontalDirection(heading_own));
			ver_speed_region = region2value(daa.regionOfVerticalSpeed(ver_speed_own));
			println("Region of current direction "+hor_dir_region+"  Region of vertical speed "+ver_speed_region);

			if (hor_dir_region != ver_speed_region) {
				println(" ************************************************************************** ");
				println(" ********* horizontal direction and vertical speed regions not equal ****** ");
				println(" ************************************************************************** ");		    
			}
	    
	    	if (hor_dir_region >= 2 || ver_speed_region >= 2) {
				// Was ownship in conflict prior to this detection?
				if (conflict_resolution_mode == false) {
					// Ownship heading, vs, and alt at the time conflict is detected
					initial_heading = daa.getOwnshipState().horizontalDirection(); // radians.
					initial_vert_speed = daa.getOwnshipState().verticalSpeed(); // meters/second.
					initial_alt = daa.getOwnshipState().getPosition().alt(); // meters.
				}
				conflict_resolution_mode = true;
				det = daa.violationOfAlertThresholds(1,2);
				time2CPA = det.tcpa2D();
		
				// Get the alerter and threshold parameters.
				alerter = daa.getAlerterAt(1);
				athr = alerter.getLevel(2);

				// If time to CPA greater than 60 seconds, set alerting time to CPA.
				if (time2CPA > alerting_time_param) {
					athr.setAlertingTime(time2CPA);
				}

				// Start timers for pilot's delay.
				hd_delay_clock = hd_delay_clock + 1.0;
				vs_delay_clock = vs_delay_clock + 1.0;
	    	}

			// Adjust the alerting time parameter so that it is not greater than the look
			// ahead time but no less than the configured alerting time parameter.
			if (athr.getAlertingTime() > det.tcpa2D()) {
				athr.setAlertingTime(Math.max(alerting_time_param, det.tcpa2D()));
			}
	    
			// Check if ownship is clear of conflict.
			hor_dir_region_initial = region2value(daa.regionOfHorizontalDirection(initial_heading));
			// Check if ownship's heading and initial ownship's heading are conflict free.
			if (hor_dir_region < 2 && hor_dir_region_initial < 2) {
				conflict_resolution_mode = false;
				// Set alerting time to original parameter.
				athr.setAlertingTime(alerting_time_param);
				// Reset timer for pilot's delay.
				hd_delay_clock = 0.0;
			}
	    
			println(" AlertThresholds  "+athr);
			// System.out.println(" Parameters in daa "+daa);
			
			println("heading Bands [deg,deg]"); 
	    	for (int i=0; i < daa.horizontalDirectionBandsLength(); ++i) {
				Interval ii = daa.horizontalDirectionIntervalAt(i,"deg");
				println("  "+daa.horizontalDirectionRegionAt(i)+":\t"+ii.toString(2));
	    	} 


	    	/* End Wrapper  */


	    
			// Implement Resolutions with virtual pilot. 
			hd_vs_new = virtual_pilot(hor_dir_region, ver_speed_region,
										heading_own, ver_speed_own,
										hd_delay_clock, vs_delay_clock,
										hor_dir_reso_right, hor_dir_reso_left,
										ver_speed_reso_up, ver_speed_reso_down,
										time_impl_delay,
										initial_heading, initial_vert_speed,
										daa, time_sim);
	    
			heading_own_new = hd_vs_new.x(); // First component is heading.
			ver_speed_own_new = hd_vs_new.y(); // Second componenent is ver speed.

			// Get the states of the aircraft.

			position_own = daa.getOwnshipState().getPosition(); // radians, radians, meters.
			airspeed_own = daa.getOwnshipState().horizontalSpeed(); // meters/second.

			position_traf = daa.getAircraftStateAt(1).getPosition(); // radians, radians, meters.
			velocity_traf_air = daa.getAircraftStateAt(1).getVelocity(); // radians, meters/sec, meters/sec.

			// Make velocity vector with the new heading and vertical speed.
			velocity_own_air = Velocity.mkTrkGsVs(heading_own_new, airspeed_own, ver_speed_own_new);

			// Add wind to the air velocity vectors.
			velocity_own_ground = velocity_own_air.Add(wind);
			velocity_traf_ground = velocity_traf_air.Add(wind);

			// Put the ownship and traffic aircraft in the Daidalus object.
			daa.setOwnshipState("ownship", position_own, velocity_own_ground, time_sim);
			daa.addTrafficState(name_traf,position_traf,velocity_traf_ground, time_sim);

			// Step simulation time.
			time_sim = time_sim + 1.0;

			// Move aircraft by one second. 
	    	dynamics(time_sim, daa);

	    
		} // End Simulation loop.
	
		print(+max_squircle.x()*100+", "+max_squircle.y()*3.281+", "+max_squircle.z()*3.281);
		print(", "+min_horizontal_distance.x()*3.281+", "+min_horizontal_distance.y()*3.281);
		print(", "+min_vertical_distance.x()*3.281+", "+min_vertical_distance.y()*3.281);
		println(", "+time_impl_delay);
		
		// Write last state.
		writeState(daa, out);
		
		out.close();
	
    } //End main.
    
    
    /* Method to write the state of aircraft to output file in the daa format */
    static void writeState(Daidalus daa, PrintWriter out){
	
		// Write state to output file
		out.print(daa.getOwnshipState().getId());
		out.printf(", %.8f",daa.getOwnshipState().getPosition().latitude());
		out.printf(", %.8f",daa.getOwnshipState().getPosition().longitude());
		out.printf(", %.6f",daa.getOwnshipState().getPosition().altitude());
		out.printf(", %.6f",(Units.to("deg",daa.getOwnshipState().horizontalDirection())));
		out.printf(", %.6f",(Units.to("knot",daa.getOwnshipState().horizontalSpeed())));
		out.printf(", %.6f",(Units.to("fpm",daa.getOwnshipState().verticalSpeed())));
		out.printf(", %.3f",daa.getCurrentTime());
		out.println(" ");
		
		out.print(daa.getAircraftStateAt(1).getId()+" ");
		out.printf(", %.8f",daa.getAircraftStateAt(1).getPosition().latitude());
		out.printf(", %.8f",daa.getAircraftStateAt(1).getPosition().longitude());
		out.printf(", %.6f",daa.getAircraftStateAt(1).getPosition().altitude());
		out.printf(", %.6f",(Units.to("deg",daa.getAircraftStateAt(1).horizontalDirection())));
		out.printf(", %.6f",(Units.to("knot",daa.getAircraftStateAt(1).horizontalSpeed())));
		out.printf(", %.6f",(Units.to("fpm",daa.getAircraftStateAt(1).verticalSpeed())));
		out.printf(", %.3f",daa.getCurrentTime());
		out.println(" ");
    }

  

    
    /* Method to implement the selected resolutions with delays.
     * Returns new horizontal direction in radians and
     * vertical speed in meters/second.
     */
    static Vect2 virtual_pilot(int hor_dir_region, int ver_speed_region,
								double hor_dir_own, double ver_speed_own,
								double hd_d_clock, double vs_d_clock,
								double hor_dir_reso_right, double hor_dir_reso_left,
								double ver_speed_reso_up, double ver_speed_reso_down,
								double time_impl_delay, 
								double initial_horizontal_direction, double initial_vertical_speed,
								Daidalus daa, double time) {
	
		double hd_guidance = hor_dir_own;
		double vs_guidance = ver_speed_own;
		double hd_new = hor_dir_own;
		double vs_new = ver_speed_own;
		// Turn rate for implementing horizontal direction changes.
		double turn_rate = 0.05235987756; // radians/sec. (3 deg/sec)
		double max_climb_rate = 6.223; // meters/second. 6.223 m/s = 1225 fpm.
		double max_descent_rate = -6.223; // meters/second. -6.223 m/s = -1225 fpm.
		boolean validR, validL, valid_current;
		boolean validUP, validDOWN, valid_currentVS;
		double implement_right = 0.0;
		double implement_left = 0.0;
		double implement_up = 0.0;
		double implement_down = 0.0;

		// Select if resolutions are going to be based on MID or NEAR bands.
		// MID: resolution_level == 2.     NEAR: resolution_level == 3.
		int resolution_level = 2;
		
		// Select which resolutions are going to be implemented.
		// resolution_type: (no resolution, 0); (hor direction, 1); (ver speed, 2); (both hor and ver, 3).
		int resolution_type = 1;

		// Select which horizontal direction resolution to implement.
		// hd_resolution_type: (smallest, 1); (turn right, 2); (turn left, 3).
		int hd_resolution_type = 3;

		// Select which vertical speed resolution to implement.
		// vs_resolution_type: (smallest change, 1); (increase vs, 2); (decrease vs, 3); (smallest absolute, 4).
		int vs_resolution_type = 4;

		// The ownship trajecotry is in a conflict band (2 or 3) and the delay has been reached.
		if (  (resolution_level == 2 && hor_dir_region >= 2 && ver_speed_region >= 2 &&
			hd_d_clock >= time_impl_delay && vs_d_clock >= time_impl_delay) ||
			(resolution_level == 3 && hor_dir_region == 3 && ver_speed_region == 3 &&
			hd_d_clock >= time_impl_delay && vs_d_clock >= time_impl_delay)  ) { // Implement.
			
			/** Horizontal direction resolution **/
			if (resolution_type == 1 || resolution_type == 3) {
				// Check if there are valid resolutions to the right and left.
				validR = !(Double.isInfinite(hor_dir_reso_right) || Double.isNaN(hor_dir_reso_right));
				validL = !(Double.isInfinite(hor_dir_reso_left) || Double.isNaN(hor_dir_reso_left));
				valid_current = (validR || validL);

				if (valid_current) {
					implement_right = hor_dir_reso_right;
					implement_left = hor_dir_reso_left;
					if (validR && validL) {
					// Implement the selected hd resolution type.
					}
					else {
					if (validR) { // No valid left resolution.
						hd_resolution_type = 2; // Implement right regardeless of type selected.
					}
					else { // No valid right resolution.
						hd_resolution_type = 3; // Implement left regardless of type selected.
					}
					}
				} else { hd_resolution_type = 0; } // No valid resolutions.

				// Implement the horizontal resolution.
				switch (hd_resolution_type) {
					case 0: hd_guidance = hor_dir_own; // No turn.
							break;
					case 1: print(" time "+time);
							print("  heading "+hor_dir_own*180/Math.PI+"  reso right "+implement_right*180/Math.PI);
						println("  reso left "+implement_left*180/Math.PI);
						print(" turn delta right "+Util.turnDelta(hor_dir_own, implement_right)*180/Math.PI);
						println(" turn delta left "+Util.turnDelta(hor_dir_own, implement_left)*180/Math.PI);
						if (Util.turnDelta(hor_dir_own, implement_right) <
							Util.turnDelta(hor_dir_own, implement_left)) { // Smallest turn.
							hd_guidance = implement_right;
						}
							else {
							hd_guidance = implement_left;
						}
							break;
					case 2: hd_guidance = implement_right;
							break;
					case 3: hd_guidance = implement_left;
							break;
				}
				
				// Turn at the defined turn_rate.
				if (Util.turnDelta(hor_dir_own, hd_guidance) > turn_rate) { // Difference > turn_rate.
					// Is the guidance to turn clockwise (right) or counter clockwise (left)?
					if (Util.clockwise(hor_dir_own, hd_guidance)) { // Turn to the right.
						hd_new = hor_dir_own + turn_rate; // Add turn_rate to current heading.
					}
					else { // Turn to the left.
						hd_new = hor_dir_own - turn_rate;  // Subtract turn_rate to current heading.
					}
				}
				else { hd_new = hd_guidance; } // Difference < turn_rate. Make new track = guidance.
			} else { // Do not implement horizontal direction resolution.
				hd_new = hor_dir_own;
			}
			
			/** Vertical speed resolution **/
			if (resolution_type == 2 || resolution_type == 3) {
				// Check if there are valid resolutions to the right and left.
				validUP = !(Double.isInfinite(ver_speed_reso_up) || Double.isNaN(ver_speed_reso_up));
				validDOWN = !(Double.isInfinite(ver_speed_reso_down) || Double.isNaN(ver_speed_reso_down));
				valid_currentVS = (validUP || validDOWN);

				if (valid_currentVS) {
					implement_up = ver_speed_reso_up;
					implement_down = ver_speed_reso_down;
					if (validUP && validDOWN) {
						// Implement the selected vs resolution type.
					} else {
						if (validUP) { // No valid down resolution.
							vs_resolution_type = 2; // Implement up regardeless of type selected.
						}
						else { // No valid up resolution.
							vs_resolution_type = 3; // Implement down regardless of type selected.
						}
					}
				} else { vs_resolution_type = 0; } // No valid resolutions.

				// Implement the vertical speed resolution.
				switch (vs_resolution_type) {
				case 0: vs_guidance = ver_speed_own;
						break;
				case 1: if (Math.abs(ver_speed_reso_up - ver_speed_own) <
						Math.abs(ver_speed_own - ver_speed_reso_down)) { // Smallest relative resolution.
						vs_guidance = implement_up;
					}
					else {
						vs_guidance = implement_down;
					}
						break;
				case 2: vs_guidance = implement_up;
						break;
				case 3: vs_guidance = implement_down;
						break;
				case 4: if (Math.abs(ver_speed_reso_up) < Math.abs(ver_speed_reso_down)) {
					vs_guidance = implement_up;
					}
					else {
					vs_guidance = implement_down;
					}
						break;
				}

				// Limit the vertical speed to the maximum climb or descent rate.
				if (vs_guidance >= 0.0) {
					if (vs_guidance > max_climb_rate) { // If guidance exceeds max climb rate, meters/sec.
						vs_new = max_climb_rate; // Climb at maximum climb rate.
					} else { 
						vs_new = vs_guidance; // Climb at the guidance climb rate.
					} 
				} else { // vs_guidance is negative.
					if (vs_guidance < max_descent_rate) { // If guidance exceed max descent rate, m/s.
						vs_new = max_descent_rate; // Descend at maximum descent rate.
					} else {
						vs_new = vs_guidance; // Descend at the guidance descent rate.	
					} 
				}
			} else { // Do not implement vertical speed resolution.
				vs_new = ver_speed_own;
			}

		} // End implement

		
		/** Recovery from maneuver to stay well clear **/
		// Recovery refers to returning to the original flight path, not
		// to re-establishing well clear after a loss of well clear.

		boolean init_hor_dir_in_conflict = true;
		boolean init_ver_speed_in_conflict = true;
		
		// Check if the initial horizontal direction is inside a conflict band.
		if (region2value(daa.regionOfHorizontalDirection(initial_horizontal_direction)) < 2) {
			hd_guidance = initial_horizontal_direction;
			init_hor_dir_in_conflict = false;
		}

		// Check if the initial vertical speed is inside a conflict band.
		if (region2value(daa.regionOfVerticalSpeed(initial_vertical_speed)) < 2) {
			vs_guidance = initial_vertical_speed;
			init_ver_speed_in_conflict = false;
		}

		// If the initial horizontal direction is not in conflict, change direction to initial direction.
		if (init_hor_dir_in_conflict == false) {
			// Implement a turn rate defined by varaible turn_rate.
			if (Util.turnDelta(hor_dir_own, hd_guidance) > turn_rate) { // Difference > turn_rate.
				// Is the guidance to turn clockwise (right) or counter clockwise (left)?
				if (Util.clockwise(hor_dir_own, hd_guidance)) { // Turn to the right.
					hd_new = hor_dir_own + turn_rate; // Add turn_rate to current heading.
				}
				else { // Turn to the left.
					hd_new = hor_dir_own - turn_rate;  // Subtract turn_rate to current heading.
				}
			} else { hd_new = hd_guidance; } // Difference < turn_rate. Make new track = guidance.
		}

		// If the initial vertical speed is not in conflict, change to initial vertical speed.
		if (init_ver_speed_in_conflict == false) {
			if (vs_guidance >= 0.0) {
				if (vs_guidance > max_climb_rate) { // If guidance exceeds max climb rate, meters/sec.
					vs_new = max_climb_rate; // Climb at maximum climb rate.
				} else { 
					vs_new = vs_guidance; // Climb at the guidance climb rate.
				} 
			}
			else { // vs_guidance is negative.
				if (vs_guidance < max_descent_rate) { // If guidance exceed max descent rate, m/s.
					vs_new = max_descent_rate; // Descend at maximum descent rate.
				} else {
					vs_new = vs_guidance; // Descend at the guidance descent rate.
				} 
			}
		}

		
		return new Vect2(hd_new, vs_new); // radians, meters/second.

    } // End virtual pilot

    static void dynamics(double time_sim, Daidalus daa) {

	// Get aircraft current states.
	double lat_own = daa.getOwnshipState().getPosition().lat(); // radians.
	double lon_own = daa.getOwnshipState().getPosition().lon(); // radians.
	double alt_own = daa.getOwnshipState().getPosition().alt(); // meters.
	double trk_own = daa.getOwnshipState().horizontalDirection(); // radians.
	double gs_own = daa.getOwnshipState().horizontalSpeed(); // meters/sec.
	double vs_own = daa.getOwnshipState().verticalSpeed(); // meters/sec.

	String name_traf = daa.getAircraftStateAt(1).getId();
	double lat_traf = daa.getAircraftStateAt(1).getPosition().lat(); // radians.
	double lon_traf = daa.getAircraftStateAt(1).getPosition().lon(); // radians.
	double alt_traf = daa.getAircraftStateAt(1).getPosition().alt(); // meters.
	double trk_traf = daa.getAircraftStateAt(1).horizontalDirection(); // radians.
	double gs_traf = daa.getAircraftStateAt(1).horizontalSpeed(); // meters/sec.
	double vs_traf = daa.getAircraftStateAt(1).verticalSpeed(); // meters/sec.

	// Convertion constants. The altitude is in meters. Average radius of the Earth = 3437.74677078 NM.
	double lat_constant_radNM = 1.0/(3437.74677078+alt_own/1852); // Radians of latitude per NM, rad/NM.
	double lat_constant_radmeter = lat_constant_radNM/1852.0; // Radians of latitude per meter, rad/meter.
	double lon_constant_radNM_own = 1.0/((3437.74677078+alt_own/1852.0)*Math.sin(Math.PI/2 - lat_own)); // Radians of longitude per NM.
	double lon_constant_radmeter_own = lon_constant_radNM_own/1852.0; // Radians of longitude per meter.
	double lon_constant_radNM_traf = 1.0/((3437.74677078+alt_own/1852.0)*Math.sin(Math.PI/2 - lat_traf)); // Radians of longitude per NM.
	double lon_constant_radmeter_traf = lon_constant_radNM_traf/1852.0; // Radians of longitude per meter.
		    
	// Calculate the new states
	double lat_own_new = lat_own + gs_own*Math.cos(trk_own)*lat_constant_radmeter;
	double lon_own_new = lon_own + gs_own*Math.sin(trk_own)*lon_constant_radmeter_own;
	double alt_own_new = alt_own + vs_own;
		    
	double lat_traf_new = lat_traf + gs_traf*Math.cos(trk_traf)*lat_constant_radmeter;
	double lon_traf_new = lon_traf + gs_traf*Math.sin(trk_traf)*lon_constant_radmeter_own;
	double alt_traf_new = alt_traf + vs_traf;

	Position position_own_new = Position.mkLatLonAlt(lat_own_new, lon_own_new, alt_own_new);
	Velocity velocity_own_new = Velocity.mkTrkGsVs(trk_own, gs_own, vs_own);

	// Put new ownship state in the Daidalus object.
	daa.setOwnshipState("ownship", position_own_new, velocity_own_new, time_sim);

	Position position_traf_new = Position.mkLatLonAlt(lat_traf_new, lon_traf_new, alt_traf_new);
	Velocity velocity_traf_new = Velocity.mkTrkGsVs(trk_traf, gs_traf, vs_traf);

	// Put new traffic state in the Daidalus object.
	daa.addTrafficState(name_traf,position_traf_new,velocity_traf_new, time_sim);
	
    } // dynamics
	
    /* Method to implement resolutions using rules of the road as defined in
       Title 14 Code of Federal Regulations, Part 91, Section 91.113. */
    static Vect2 virtual_pilot_CFR() {

	Vect2 guidance = new Vect2(0.0, 0.0);
	
	return guidance;

	
    } // End virtual_pilot_CFR

    
    /* Method to calculate the severity of an encounter */
    /*                                                  */
    public static Vect3 severity(Daidalus daa) {
	Vect3 own_s =  daa.getOwnshipState().get_s();
	Vect3 traf_s = daa.getAircraftStateAt(1).get_s();
	Vect3 relative_s = own_s.Sub(traf_s);
	Vect2 rel_s_hor = relative_s.vect2();
	double range = rel_s_hor.norm();
	double vert_dist = Math.abs(own_s.z() - traf_s.z());
	double d_x = own_s.x() - traf_s.x();
	double d_y = own_s.y() - traf_s.y();
	double HMD;

	Vect3 own_v = daa.getOwnshipState().get_v();
	Vect3 traf_v = daa.getAircraftStateAt(1).get_v();
	Vect3 relative_v = own_v.Sub(traf_v);
	Vect2 rel_v_hor = relative_v.vect2();

	// To avoid division by zero, when range is zero, make it a small value.
	if (range == 0.0) {
	    range = 0.0000000001;
	}
	double closure = rel_s_hor.dot(rel_v_hor)/range;
	
	double v_x = own_v.x() - traf_v.x();
	double v_y = own_v.y() - traf_v.y();
	
	// System.out.println(" Range "+range/1852.0+" NM, vertical distance "+vert_dist+" m, "+vert_dist*3.281+" feet");
	// System.out.println(" Closure "+closure*3600.0/1852+" knots");

	// System.out.println(" Own state "+own_s.x()+", "+own_s.y()+", "+3.281*own_s.z());
	// System.out.println(" Traff state "+traf_s.x()+", "+traf_s.y()+", "+3.281*traf_s.z());

	// Severity based on three components as defined by SC-228:
	// 1. Range penetration (Horizontal Proximity, tau mod).
	// 2. Horizontal miss distance.
	// 3. Vertical distance.
	// The three components are aggregated using the Fernandez-Gausti's norm (Squircle).

	Alerter alerter = daa.getAlerterAt(1);
	detector = alerter.getDetector(2);
	
	double DMOD = ((WCV_TAUMOD)detector.get()).getDTHR();
	double H = ((WCV_TAUMOD)detector.get()).getZTHR();
	double tau = ((WCV_TAUMOD)detector.get()).getTTHR();

	// Range penetration.
	double S = Math.max(DMOD, 0.5*Math.sqrt(closure*closure*tau*tau + 4*DMOD*DMOD)-closure*tau);
	double RangePenetration = Math.min(range/S, 1);

	ConflictData det = daa.violationOfAlertThresholds(1,2); // (aircraft, alerting level)
	double t_CPA = det.tcpa2D();

	// Horizontal miss distance.
	if (t_CPA > 0) {
	    HMD = Math.sqrt( (d_x + v_x*t_CPA)*(d_x + v_x*t_CPA) + (d_y + v_y*t_CPA)*(d_y + v_y*t_CPA) );
	}
	else { HMD = range; }
		
	double HMDpen = Math.min(HMD/DMOD, 1);

	// Vertical distance.
	double VertPen = Math.min(vert_dist/H, 1);
	
	// System.out.println(" DMOD "+DMOD+" H "+H*3.281+" tau "+tau);
	// System.out.println(" range penetretion "+RangePenetration+" HMD "+HMDpen+ " Vertical dist "+VertPen);

	// Squircle

	double SLoWC = 1 - FG_norm(RangePenetration, HMDpen, VertPen);

	// System.out.println(" Severity "+SLoWC*100.0+" percent, horizontal "+range*3.281+"  vertical "+vert_dist*3.281);

	return new Vect3 (SLoWC, range, vert_dist);
	
	
    } // End severity
    
			      
    public static double rayleigh(double sig, java.util.Random r)
    {
	double a, b;

	a = sig*r.nextGaussian();
	b = sig*r.nextGaussian();
	return Math.sqrt(a*a + b*b);

    }

    public static double FG_norm(double a, double b, double c) {
	double d = Math.sqrt(a*a + b*b - a*a*b*b);
	double norm = Math.sqrt(c*c + d*d - c*c*d*d);
	return norm;
    }
    
}

  
