
/* ====================================================================
 *  Author: Victor Carreño
 *  Contributors: Paolo Masci
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
 **/

import gov.nasa.larcfm.ACCoRD.AlertThresholds;
import gov.nasa.larcfm.ACCoRD.Alerter;
import gov.nasa.larcfm.ACCoRD.BandsRegion;
import gov.nasa.larcfm.ACCoRD.ConflictData;
import gov.nasa.larcfm.ACCoRD.Daidalus;
import gov.nasa.larcfm.Util.Interval;
import gov.nasa.larcfm.Util.Velocity;

public class DaidalusWrapper implements DaidalusWrapperInterface {
    protected Daidalus daa;
    protected Velocity wind;
    protected Boolean conflict_resolution_mode = false;

    protected double initial_heading = 0;

    DaidalusWrapper (Daidalus daa) {
        this.daa = daa;
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

    public void setWind (double xknot, double yknot, double zfpm) {
        // Define wind. Wind is specified in the direction that it is blowing,
        // not where is coming from.
        // For example, an easterly wind is a wind in the 270 direction.

        // Define wind. Wind is specified in the direction that it is blowing,
        // not where is comming from.
        // For example, an easterly wind is a wind in the 270 direction.
        // Wind out of the south at 50 knots.
        // wind = Velocity.makeVxyz(0.0, 50.0, 0.0); // x-knots, y-knots, z-fpm. 
        // Wind out of the west at 50 knots.
        // wind = Velocity.makeVxyz(50, 0, 0); // x-knots, y-knots, z-fpm.
        // Wind out of the south-east at 65 knots.
        // wind = Velocity.makeVxyz(-45.961941, 45.961941, 0);
        wind = Velocity.makeVxyz(xknot, yknot, zfpm);
        daa.setWindVelocityTo(wind);
    }
    public void setWindSouth (double wind_speed) {
        // Wind out of the south at wind_speed knots.
        setWind(0, wind_speed, 0);
    }
    public void setWindWest (double wind_speed) {
        // Wind out of the west at wind_speed knots.
        setWind(wind_speed, 0, 0);
    }
    public void setWindSouthEast65 () {
        // Wind out of the west at wind_speed knots.
        setWind(-45.961941, 45.961941, 0);
    }
    public Velocity getWind () {
        return wind;
    }
    
    /* 
    * Wrapper to dynamically adjust the alerting time of DAIDALUS to prevent
    * resolution bands from disapearing and reapearing as the pilot implements
    * the resolution maneuver.
    */
    public void adjustAlertingTime () {
        if (this.daa != null) {
            // Current heading and vertical speed, own.
            double heading_own = daa.getOwnshipState().horizontalDirection(); // radians.
            double ver_speed_own = daa.getOwnshipState().verticalSpeed(); 
            double airspeed_own = daa.getOwnshipState().horizontalSpeed(); // meters/sec.
            // Ground velocity.
    	    Velocity g_velocity_own = daa.getOwnshipState().getGroundVelocity(); // degrees, knots, feet/min.
            double time_sim = daa.getCurrentTime();

            System.out.println();
            System.out.print(" Time " + time_sim);
            System.out.print(" Ground Velocity vector own " + g_velocity_own);
            System.out.println(" heading own " + heading_own * 180 / Math.PI + " airspeed " + airspeed_own * 3600 / 1852);

            // Check if ownship's heading or vertical speed are inside conflict bands 
            int hor_dir_region = region2value(this.daa.regionOfHorizontalDirection(heading_own));
            int ver_speed_region = region2value(this.daa.regionOfVerticalSpeed(ver_speed_own));
            System.out.println("Region of current direction " + hor_dir_region + "  Region of vertical speed " + ver_speed_region);

            // if (hor_dir_region != ver_speed_region) {
            //     System.err.println(" ************************************************************************** ");
            //     System.err.println(" ********* horizontal direction and vertical speed regions not equal ****** ");
            //     System.err.println(" ************************************************************************** ");		    
            // }
            
            // TODO: the following code takes into account only one intruder aircraft --- needs to be extended to n aircraft
            ConflictData det = this.daa.violationOfAlertThresholds(1, 2);
            Alerter alerter = daa.getAlerterAt(1); // alerter for aircraft 1.
            AlertThresholds athr = alerter.getLevel(2); // Threshold parameters for Level 2 for aircraft 1.
            double alerting_time_param = athr.getAlertingTime();

            if (hor_dir_region >= 2 || ver_speed_region >= 2) {
                // Save current heading
                if (this.conflict_resolution_mode == false) {
                    // Ownship heading, vs, and alt at the time conflict is detected
                    initial_heading = this.daa.getOwnshipState().horizontalDirection(); // radians.
                }
                this.conflict_resolution_mode = true;

                // obtain time of closest point of approach
                double time2CPA = det.tcpa2D();
                
                // Get the alerter and threshold parameters.
                alerter = this.daa.getAlerterAt(1);
                athr = alerter.getLevel(2);

                // If time to CPA greater than 60 seconds, set alerting time to CPA.
                if (time2CPA > alerting_time_param) {
                    athr.setAlertingTime(time2CPA);
                }
            }

            // Adjust the alerting time parameter so that it is not greater than the look
            // ahead time but no less than the configured alerting time parameter.
            if (athr.getAlertingTime() > det.tcpa2D()) {
                athr.setAlertingTime(Math.max(alerting_time_param, det.tcpa2D()));
            }
            
            // Check if ownship is clear of conflict.
            double hor_dir_region_initial = region2value(this.daa.regionOfHorizontalDirection(initial_heading));
            // Check if ownship's heading and initial ownship's heading are conflict free.
            if (hor_dir_region < 2 && hor_dir_region_initial < 2) {
                this.conflict_resolution_mode = false;
                // Set alerting time to original parameter.
                athr.setAlertingTime(alerting_time_param);
            }
            
            System.out.println(" AlertThresholds  " + athr);
            // System.out.println(" Parameters in daa "+daa);
            
            System.out.println("heading Bands [deg,deg]"); 
            for (int i = 0; i < this.daa.horizontalDirectionBandsLength(); ++i) {
                Interval ii = this.daa.horizontalDirectionIntervalAt(i, "deg");
                System.out.println("  " + this.daa.horizontalDirectionRegionAt(i) + ":\t" + ii.toString(2));
            }
        } else {
            System.err.println("[DaidalusWrapper] Warning: Daidalus object is null");
        }
    }
}