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

import java.util.ArrayList;

import gov.nasa.larcfm.ACCoRD.BandsRegion;
import gov.nasa.larcfm.ACCoRD.Daidalus;
import gov.nasa.larcfm.ACCoRD.DaidalusFileWalker;
import gov.nasa.larcfm.Util.f;

import static gov.nasa.larcfm.ACCoRD.DaidalusParameters.VERSION;


public class DAAMonitorsV2 {

    protected static int bandsRegionToInt (BandsRegion b) {
        if (b == BandsRegion.NONE) {
            return 0;
        }
        if (b == BandsRegion.FAR) {
            return 1;
        }
        if (b == BandsRegion.MID) {
            return 2;
        }
        if (b == BandsRegion.NEAR) {
            return 3;
        }
        if (b == BandsRegion.RECOVERY) {
            return 4;
        }
        return -1;
    }

    public static final int GREEN = 0;
    public static final int YELLOW = 1;
    public static final int RED = 2;

    protected Daidalus daa;

    // preferred resolutions
    protected double resolutionTrk;
    protected BandsRegion regionTrk;
    protected double resolutionGs;
    protected BandsRegion regionGs;
    protected double resolutionVs;
    protected BandsRegion regionVs;
    protected double resolutionAlt;
    protected BandsRegion regionAlt;

    // other resolutions
    protected double resolutionTrk_other;
    protected BandsRegion regionTrk_other;
    protected double resolutionGs_other;
    protected BandsRegion regionGs_other;
    protected double resolutionVs_other;
    protected BandsRegion regionVs_other;
    protected double resolutionAlt_other;
    protected BandsRegion regionAlt_other;

    // current regions
    protected BandsRegion currentRegionTrk;
    protected BandsRegion currentRegionGs;
    protected BandsRegion currentRegionVs;
    protected BandsRegion currentRegionAlt;


    int getSize() {
        return N_MONITORS;
    }

    
    DAAMonitorsV2 (Daidalus daa) {
        this.daa = daa;
    }

    void check () {
        this.computeResolutions();
        this.computeCurrentRegions();
    } 

    protected void computeResolutions () {
        Boolean preferredTrk = daa.preferredHorizontalDirectionRightOrLeft();
		resolutionTrk = daa.horizontalDirectionResolution(preferredTrk);
		regionTrk = daa.regionOfHorizontalDirection(resolutionTrk);
		resolutionTrk_other = daa.horizontalDirectionResolution(!preferredTrk);
		regionTrk_other = daa.regionOfHorizontalDirection(resolutionTrk_other);

		Boolean preferredGs = daa.preferredHorizontalSpeedUpOrDown();
		resolutionGs = daa.horizontalSpeedResolution(preferredGs);
		regionGs = daa.regionOfHorizontalSpeed(resolutionGs);
		resolutionGs_other = daa.horizontalSpeedResolution(!preferredGs);
		regionGs_other = daa.regionOfHorizontalSpeed(resolutionGs_other);

        Boolean preferredVs = daa.preferredVerticalSpeedUpOrDown();
		resolutionVs = daa.verticalSpeedResolution(preferredVs);
		regionVs = daa.regionOfVerticalSpeed(resolutionVs);
		resolutionVs_other = daa.verticalSpeedResolution(!preferredVs);
		regionVs_other = daa.regionOfVerticalSpeed(resolutionVs_other);

        Boolean preferredAlt = daa.preferredAltitudeUpOrDown();
		resolutionAlt = daa.altitudeResolution(preferredAlt);
		regionAlt = daa.regionOfAltitude(resolutionAlt);
        resolutionAlt_other = daa.altitudeResolution(!preferredAlt);
		regionAlt_other = daa.regionOfAltitude(resolutionAlt_other);
    }

    protected void computeCurrentRegions () {
        double heading = daa.getOwnshipState().horizontalDirection();
        currentRegionTrk = daa.regionOfHorizontalDirection(heading);
        // System.out.println("heading: " + heading + " region: " + currentRegionTrk);

        double hspeed = daa.getOwnshipState().horizontalSpeed();
        currentRegionGs = daa.regionOfHorizontalSpeed(hspeed);
        // System.out.println("hspeed: " + hspeed + " region: " + currentRegionGs);

        double vspeed = daa.getOwnshipState().verticalSpeed();
        currentRegionVs = daa.regionOfVerticalSpeed(vspeed);
        // System.out.println("vspeed: " + vspeed + " region: " + currentRegionVs);

        double alt = daa.getOwnshipState().altitude();
        currentRegionAlt = daa.regionOfAltitude(alt);
        // System.out.println("alt: " + alt + " region: " + currentRegionAlt);
    }

    protected static String color2string (int color) {
        switch (color) {
            case GREEN: return "green";
            case YELLOW: return "yellow";
            case RED: return "red";
            default: return "grey";
        }
    }

    String getColor (int monitorID) { // monitor ID starts from 1
        int index = monitorID - 1;
        if (index < N_MONITORS) {
            return DAAMonitorsV2.color2string(this.monitorColor[index]);
        }
        return DAAMonitorsV2.color2string(-1);
    }




    /**
     * Monitor 1: valid finite resolutions
     * - Resolution is finite and region is not NONE nor RECOVERY (yellow monitor).
     * - Resolution is finite and region is UNKNOWN (red monitor).
     */
    protected int checkM1 (double resolution, BandsRegion region) {
        if (Double.isFinite(resolution)) {
            if (region == BandsRegion.UNKNOWN) {
                return RED;
            } else if (region != BandsRegion.NONE && region != BandsRegion.RECOVERY) {
                return YELLOW;
            }
        }
        return GREEN;
    }
    protected String legendM1 () {
        String green_desc = "Valid finite resolution.";
        String yellow_desc = "Property failure: resolution is finite and region is not NONE nor RECOVERY.";
        String red_desc = "Property failure: resolution is finite and region is UNKNOWN.";
        return "{ " 
                + "\"green\": \"" + green_desc + "\", \"yellow\": \"" + yellow_desc + "\", \"red\": \"" + red_desc + "\""
                + " }";
    }
    protected String labelM1 () {
        return "M1: Finite resolution ⇒ Region is NONE or RECOVERY";
    }
    String m1 () {
        int monitorIndex = 0;
        int hr = checkM1(resolutionTrk, regionTrk);
        int hsr = checkM1(resolutionGs, regionGs);
        int vsr = checkM1(resolutionVs, regionVs);
        int ar = checkM1(resolutionAlt, regionAlt);

        int hr_other = checkM1(resolutionTrk_other, regionTrk_other);
        int hsr_other = checkM1(resolutionGs_other, regionGs_other);
        int vsr_other = checkM1(resolutionVs_other, regionVs_other);
        int ar_other = checkM1(resolutionAlt_other, regionAlt_other);

        int max_color = Math.max(hr, Math.max(hsr, Math.max(vsr, Math.max(ar, Math.max(hr_other, Math.max(hsr_other, Math.max(vsr_other, ar_other)))))));
        if (monitorColor[monitorIndex] < max_color) { monitorColor[monitorIndex] = max_color; }

        return "\"color\": " + "\"" + DAAMonitorsV2.color2string(max_color) + "\""
            + ", \"details\":" 
            + " {"
            + " \"Heading\": " + "\"" + DAAMonitorsV2.color2string(Math.max(hr, hr_other)) + "\""
            + ", \"Horizontal Speed\": " + "\"" + DAAMonitorsV2.color2string(Math.max(hsr, hsr_other)) + "\""
            + ", \"Vertical Speed\": " + "\"" + DAAMonitorsV2.color2string(Math.max(vsr, vsr_other)) + "\""
            + ", \"Altitude\": " + "\"" + DAAMonitorsV2.color2string(Math.max(ar, ar_other)) + "\""
            + " }";
    }

    /**
     * Monitor 2: consistent resolutions
     * - If region is not RECOVERY and any resolution is NaN and other resolutions are not NaN (yellow monitor).
     */
    protected int checkM2_preferred (double resolution, BandsRegion region) {
        if (region != BandsRegion.RECOVERY) {
            Boolean exists_resolution_not_NaN = !Double.isNaN(resolutionTrk) || !Double.isNaN(resolutionGs) || !Double.isNaN(resolutionVs);// || !Double.isNaN(resolutionAlt); M2 does not apply to altitude
            if (Double.isNaN(resolution) && exists_resolution_not_NaN) {
                return YELLOW;
            }
        }
        return GREEN;
    }
    protected int checkM2_other (double resolution_, BandsRegion region) {
        if (region != BandsRegion.RECOVERY) {
            Boolean exists_resolution_not_NaN = !Double.isNaN(resolutionTrk_other) || !Double.isNaN(resolutionGs_other) || !Double.isNaN(resolutionVs_other);// || !Double.isNaN(resolutionAlt_other); M2 does not apply to altitude
            if (Double.isNaN(resolution_) && exists_resolution_not_NaN) {
                return YELLOW;
            }
        }
        return GREEN;
    }
    protected String legendM2 () {
        String green_desc = "Consistent resolutions.";
        String yellow_desc = "Property failure: one resolution is NaN and other resolutions are not NaN and region of current value is not RECOVERY.";
        return "{ " 
                + "\"green\": \"" + green_desc + "\", \"yellow\": \"" + yellow_desc + "\""
                + " }";
    }
    protected String labelM2 () {
        return "M2: One resolution is NaN ⇒ All resolutions are NaN";
    }
    String m2 () {
        int monitorIndex = 1;
        int hr = checkM2_preferred(resolutionTrk, currentRegionTrk);
        int hsr = checkM2_preferred(resolutionGs, currentRegionGs);
        int vsr = checkM2_preferred(resolutionVs, currentRegionVs);
        int ar = GREEN; //checkM2_preferred(resolutionAlt, currentRegionAlt); M2 does not apply to altitude

        int hr_other = checkM2_other(resolutionTrk_other, currentRegionTrk);
        int hsr_other = checkM2_other(resolutionGs_other, currentRegionGs);
        int vsr_other = checkM2_other(resolutionVs_other, currentRegionVs);
        int ar_other = GREEN; //checkM2_other(resolutionAlt_other, currentRegionAlt); M2 does not apply to altitude

        int max_color = Math.max(hr, Math.max(hsr, Math.max(vsr, Math.max(ar, Math.max(hr_other, Math.max(hsr_other, Math.max(vsr_other, ar_other)))))));
        if (monitorColor[monitorIndex] < max_color) { monitorColor[monitorIndex] = max_color; }

        return "\"color\": " + "\"" + DAAMonitorsV2.color2string(max_color) + "\""
            + ", \"details\":" 
            + " {"
            + " \"Heading\": " + "\"" + DAAMonitorsV2.color2string(Math.max(hr, hr_other)) + "\""
            + ", \"Horizontal Speed\": " + "\"" + DAAMonitorsV2.color2string(Math.max(hsr, hsr_other)) + "\""
            + ", \"Vertical Speed\": " + "\"" + DAAMonitorsV2.color2string(Math.max(vsr, vsr_other)) + "\""
            + ", \"Altitude\": " + "\"" + DAAMonitorsV2.color2string(Math.max(ar, ar_other)) + "\""
            + " }";
    }

    /**
     * Monitor 3: Valid non-zero alerts
     * - Traffic aircraft has a non-zero alert and the region of the current value (heading, speed) is lower than the traffic alert (yellow monitor)
     * - Traffic aircraft has a non-zero alert and the region of the current value (heading, speed) is UNKNOWN (red monitor)
     *   Color order is NONE < FAR < MID < NEAR < RECOVERY. 
     */
    protected int checkM3 (BandsRegion currentRegion) {
        for (int ac = 1; ac <= daa.lastTrafficIndex(); ac++) {
            int alert = daa.alertLevel(ac);
            int threshold = daa.getCorrectiveRegion().orderOfConflictRegion();
            if (alert > threshold) {
                if (currentRegion == BandsRegion.UNKNOWN) {
                    return RED;
                } else {
                    int level = DAAMonitorsV2.bandsRegionToInt(currentRegion);
                    if (level < alert) {
                        // System.out.println("current region: " + level + " " + currentRegion + " alert: " + alert);
                        return YELLOW;
                    }
                }
            }
        }
        return GREEN;
    }
    protected String legendM3 () {
        String green_desc = "Valid non-zero alerts.";
        String yellow_desc = "Property failure: traffic aircraft has a non-zero alert and the region of the current value (heading, speed) is lower than the traffic alert.";
        String red_desc = "Property failure: traffic aircraft has a non-zero alert and the region of the current value (heading, speed) is UNKNOWN.";
        return "{ " 
                + "\"green\": \"" + green_desc + "\", \"yellow\": \"" + yellow_desc + "\", \"red\": \"" + red_desc + "\""
                + " }";
    }
    protected String labelM3 () {
        return "M3: Band(current value) ≥ Alert(traffic)";
    }
    String m3 () {
        int monitorIndex = 2;
        int hb = checkM3(currentRegionTrk);
        int hsb = checkM3(currentRegionGs);
        int vsb = checkM3(currentRegionVs);
        int ab = GREEN;//checkM3(currentRegionAlt); // M2 does not apply to altitude

        int max_color = Math.max(hb, Math.max(hsb, Math.max(vsb, ab)));
        if (monitorColor[monitorIndex] < max_color) { monitorColor[monitorIndex] = max_color; }

        return "\"color\": " + "\"" + DAAMonitorsV2.color2string(max_color) + "\""
            + ", \"details\":" 
            + " {"
            + " \"Heading\": " + "\"" + DAAMonitorsV2.color2string(hb) + "\""
            + ", \"Horizontal Speed\": " + "\"" + DAAMonitorsV2.color2string(hsb) + "\""
            + ", \"Vertical Speed\": " + "\"" + DAAMonitorsV2.color2string(vsb) + "\""
            + ", \"Altitude\": " + "\"" + DAAMonitorsV2.color2string(ab) + "\""
            + " }";
    }

    /**
     * Monitor 4: NONE and RECOVERY
     * NONE and RECOVERY appear in the same list of bands (yellow monitor)
     */
    protected int checkM4Trk () {
        boolean none = false;
        boolean recovery = false;
        for (int i = 0; i < daa.horizontalDirectionBandsLength(); i++) {
			BandsRegion b = daa.horizontalDirectionRegionAt(i);
            if (b == BandsRegion.NONE) {
                none = true;
            } else if (b == BandsRegion.RECOVERY) {
                recovery = true;
            }
		}
        return (none && recovery) ? YELLOW : GREEN;
    }
    protected int checkM4Hs () {
        boolean none = false;
        boolean recovery = false;
        for (int i = 0; i < daa.horizontalSpeedBandsLength(); i++) {
			BandsRegion b = daa.horizontalSpeedRegionAt(i);
            if (b == BandsRegion.NONE) {
                none = true;
            } else if (b == BandsRegion.RECOVERY) {
                recovery = true;
            }
		}
        return (none && recovery) ? YELLOW : GREEN;
    }
    protected int checkM4Vs () {
        boolean none = false;
        boolean recovery = false;
        for (int i = 0; i < daa.verticalSpeedBandsLength(); i++) {
			BandsRegion b = daa.verticalSpeedRegionAt(i);
            if (b == BandsRegion.NONE) {
                none = true;
            } else if (b == BandsRegion.RECOVERY) {
                recovery = true;
            }
		}
        return (none && recovery) ? YELLOW : GREEN;
    }
    protected int checkM4Alt () {
        boolean none = false;
        boolean recovery = false;
        for (int i = 0; i < daa.altitudeBandsLength(); i++) {
			BandsRegion b = daa.altitudeRegionAt(i);
            if (b == BandsRegion.NONE) {
                none = true;
            } else if (b == BandsRegion.RECOVERY) {
                recovery = true;
            }
		}
        return (none && recovery) ? YELLOW : GREEN;
    }
    protected String legendM4 () {
        String green_desc = "Valid region colors.";
        String yellow_desc = "Property failure: NONE and RECOVERY appear in the same list of bands.";
        return "{ " 
                + "\"green\": \"" + green_desc + "\", \"yellow\": \"" + yellow_desc + "\""
                + " }";
    }
    protected String labelM4 () {
        return "M4: It is never the case that NONE and RECOVERY appear in the same list of bands";
    }
    String m4 () {
        int monitorIndex = 3;
        int hb = checkM4Trk();
        int hsb = checkM4Hs();
        int vsb = checkM4Vs();
        int ab = checkM4Alt();

        int max_color = Math.max(hb, Math.max(hsb, Math.max(vsb, ab)));
        if (monitorColor[monitorIndex] < max_color) { monitorColor[monitorIndex] = max_color; }

        return "\"color\": " + "\"" + DAAMonitorsV2.color2string(max_color) + "\""
            + ", \"details\":" 
            + " {"
            + " \"Heading\": " + "\"" + DAAMonitorsV2.color2string(hb) + "\""
            + ", \"Horizontal Speed\": " + "\"" + DAAMonitorsV2.color2string(hsb) + "\""
            + ", \"Vertical Speed\": " + "\"" + DAAMonitorsV2.color2string(vsb) + "\""
            + ", \"Altitude\": " + "\"" + DAAMonitorsV2.color2string(ab) + "\""
            + " }";
    }

    // NB: You need to update the following items when adding new monitors: N_MONITORS, monitorColor, getLegend and getLabel
    protected final int N_MONITORS = 4;
    protected int monitorColor[] = new int[]{ -1, -1, -1, -1 };
    String getLegend (int monitorID) {
        if (monitorID <= N_MONITORS && monitorID > 0) {
            if (monitorID == 1) { return this.legendM1(); }
            if (monitorID == 2) { return this.legendM2(); }
            if (monitorID == 3) { return this.legendM3(); }
            if (monitorID == 4) { return this.legendM4(); }
        }
        return "unknown";
    }
    String getLabel (int monitorID) {
        if (monitorID <= N_MONITORS && monitorID > 0) {
            if (monitorID == 1) { return this.labelM1(); }
            if (monitorID == 2) { return this.labelM2(); }
            if (monitorID == 3) { return this.labelM3(); }
            if (monitorID == 4) { return this.labelM4(); }
        }
        return "unknown";
    }
}