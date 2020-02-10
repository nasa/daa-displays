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

    protected static final int GREEN = 0;
    protected static final int YELLOW = 1;
    protected static final int RED = 2;

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
    double resolutionTrk_;
    BandsRegion regionTrk_;
    double resolutionGs_;
    BandsRegion regionGs_;
    double resolutionVs_;
    BandsRegion regionVs_;
    double resolutionAlt_;
    BandsRegion regionAlt_;

    // current regions
    BandsRegion currentRegionTrk;
    BandsRegion currentRegionGs;
    BandsRegion currentRegionVs;
    BandsRegion currentRegionAlt;

    // monitors color
    final int N_MONITORS = 3;
    int monitorColor[] = new int[]{ -1, -1, -1 };

    
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
		resolutionTrk_ = daa.horizontalDirectionResolution(!preferredTrk);
		regionTrk_ = daa.regionOfHorizontalDirection(resolutionTrk_);

		Boolean preferredGs = daa.preferredHorizontalSpeedUpOrDown();
		resolutionGs = daa.horizontalSpeedResolution(preferredGs);
		regionGs = daa.regionOfHorizontalSpeed(resolutionGs);
		resolutionGs_ = daa.horizontalSpeedResolution(!preferredGs);
		regionGs_ = daa.regionOfHorizontalSpeed(resolutionGs_);

        Boolean preferredVs = daa.preferredVerticalSpeedUpOrDown();
		resolutionVs = daa.verticalSpeedResolution(preferredVs);
		regionVs = daa.regionOfVerticalSpeed(resolutionVs);
		resolutionVs_ = daa.verticalSpeedResolution(!preferredVs);
		regionVs_ = daa.regionOfVerticalSpeed(resolutionVs_);

        Boolean preferredAlt = daa.preferredAltitudeUpOrDown();
		resolutionAlt = daa.altitudeResolution(preferredAlt);
		regionAlt = daa.regionOfAltitude(resolutionAlt);
        resolutionAlt_ = daa.altitudeResolution(!preferredAlt);
		regionAlt_ = daa.regionOfAltitude(resolutionAlt_);
    }

    protected void computeCurrentRegions () {
        double heading = daa.getOwnshipState().horizontalDirection();
        System.out.println("heading: " + heading);
        currentRegionTrk = daa.regionOfHorizontalDirection(heading);

        double hspeed = daa.getOwnshipState().horizontalSpeed();
        currentRegionGs = daa.regionOfHorizontalSpeed(hspeed);

        double vspeed = daa.getOwnshipState().verticalSpeed();
        currentRegionVs = daa.regionOfVerticalSpeed(vspeed);

        double alt = daa.getOwnshipState().altitude();
        currentRegionAlt = daa.regionOfAltitude(alt);
    }

    static String color2string (int color) {
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
    String getLegend (int monitorID) {
        if (monitorID <= N_MONITORS) {
            if (monitorID == 1) { return this.legendM1(); }
            if (monitorID == 2) { return this.legendM2(); }
            if (monitorID == 3) { return this.legendM3(); }
        }
        return "\"unknown\"";
    }
    String getLabel (int monitorID) {
        if (monitorID <= N_MONITORS) {
            if (monitorID == 1) { return this.labelM1(); }
            if (monitorID == 2) { return this.labelM2(); }
            if (monitorID == 3) { return this.labelM3(); }
        }
        return "\"unknown\"";
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
        String yellow_desc = "Abnormal condition: resolution is finite and region is not NONE nor RECOVERY.";
        String red_desc = "Abnormal condition: resolution is finite and region is UNKNOWN.";
        return "{ " 
                + "\"green\": \"" + green_desc + "\", \"yellow\": \"" + yellow_desc + "\", \"red\": \"" + red_desc + "\""
                + " }";
    }
    protected String labelM1 () {
        return "M1: Finite resolution ⇒ Region is NONE or RECOVERY";
    }
    String m1 () {
        int hr = checkM1(resolutionTrk, regionTrk);
        int hsr = checkM1(resolutionGs, regionGs);
        int vsr = checkM1(resolutionVs, regionVs);
        int ar = checkM1(resolutionAlt, regionAlt);

        int hr_ = checkM1(resolutionTrk_, regionTrk_);
        int hsr_ = checkM1(resolutionGs_, regionGs_);
        int vsr_ = checkM1(resolutionVs_, regionVs_);
        int ar_ = checkM1(resolutionAlt_, regionAlt_);

        int max_color = Math.max(hr, Math.max(hsr, Math.max(vsr, Math.max(ar, Math.max(hr_, Math.max(hsr_, Math.max(vsr_, ar_)))))));
        if (monitorColor[0] < max_color) { monitorColor[0] = max_color; }

        return "\"color\": " + "\"" + DAAMonitorsV2.color2string(max_color) + "\""
            + ", \"details\":" 
            + " {"
            + " \"Heading Resolution\": " + "{ \"preferred\": \"" + DAAMonitorsV2.color2string(hr) + "\", \"other\": \"" + DAAMonitorsV2.color2string(hr_) + "\" }"
            + ", \"Horizontal Speed Resolution\": " + "{ \"preferred\": \"" + DAAMonitorsV2.color2string(hsr) + "\", \"other\": \"" + DAAMonitorsV2.color2string(hsr_) + "\" }"
            + ", \"Vertical Speed Resolution\": " + "{ \"preferred\": \"" + DAAMonitorsV2.color2string(vsr) + "\", \"other\": \"" + DAAMonitorsV2.color2string(vsr_) + "\" }"
            + ", \"Altitude Resolution\": " + "{ \"preferred\": \"" + DAAMonitorsV2.color2string(ar) + "\", \"other\": \"" + DAAMonitorsV2.color2string(ar_) + "\" }"
            + " }";
    }

    /**
     * Monitor 2: consistent resolutions
     * - If region is not RECOVERY and any resolution is NaN and other resolutions are not NaN (yellow monitor).
     */
    protected int checkM2_preferred (double resolution, BandsRegion region) {
        if (region != BandsRegion.RECOVERY) {
            Boolean exists_resolution_not_NaN = !Double.isNaN(resolutionTrk) || !Double.isNaN(resolutionGs) || !Double.isNaN(resolutionVs) || !Double.isNaN(resolutionAlt);
            if (Double.isNaN(resolution) && exists_resolution_not_NaN) {
                return YELLOW;
            }
        }
        return GREEN;
    }
    protected int checkM2_other (double resolution_, BandsRegion region) {
        if (region != BandsRegion.RECOVERY) {
            Boolean exists_resolution_not_NaN = !Double.isNaN(resolutionTrk_) || !Double.isNaN(resolutionGs_) || !Double.isNaN(resolutionVs_) || !Double.isNaN(resolutionAlt_);
            if (Double.isNaN(resolution_) && exists_resolution_not_NaN) {
                return YELLOW;
            }
        }
        return GREEN;
    }
    protected String legendM2 () {
        String green_desc = "Consistent resolutions.";
        String yellow_desc = "Abnormal condition: a resolution is NaN and other resolutions are not NaN and region of current value is not RECOVERY.";
        return "{ " 
                + "\"green\": \"" + green_desc + "\", \"yellow\": \"" + yellow_desc + "\""
                + " }";
    }
    protected String labelM2 () {
        return "M2: A resolution is NaN ⇒ All resolutions are NaN";
    }
    String m2 () {
        int hr = checkM2_preferred(resolutionTrk, currentRegionTrk);
        int hsr = checkM2_preferred(resolutionGs, currentRegionGs);
        int vsr = checkM2_preferred(resolutionVs, currentRegionVs);
        int ar = checkM2_preferred(resolutionAlt, currentRegionAlt);

        int hr_ = checkM2_other(resolutionTrk_, currentRegionTrk);
        int hsr_ = checkM2_other(resolutionGs_, currentRegionGs);
        int vsr_ = checkM2_other(resolutionVs_, currentRegionVs);
        int ar_ = checkM2_other(resolutionAlt_, currentRegionAlt);

        int max_color = Math.max(hr, Math.max(hsr, Math.max(vsr, Math.max(ar, Math.max(hr_, Math.max(hsr_, Math.max(vsr_, ar_)))))));
        if (monitorColor[1] < max_color) { monitorColor[1] = max_color; }

        return "\"color\": " + "\"" + this.color2string(max_color) + "\""
            + ", \"details\":" 
            + " {"
            + " \"Heading Resolution\": " + "{ \"preferred\": \"" + this.color2string(hr) + "\", \"other\": \"" + this.color2string(hr_) + "\" }"
            + ", \"Horizontal Speed Resolution\": " + "{ \"preferred\": \"" + this.color2string(hsr) + "\", \"other\": \"" + this.color2string(hsr_) + "\" }"
            + ", \"Vertical Speed Resolution\": " + "{ \"preferred\": \"" + this.color2string(vsr) + "\", \"other\": \"" + this.color2string(vsr_) + "\" }"
            + ", \"Altitude Resolution\": " + "{ \"preferred\": \"" + this.color2string(ar) + "\", \"other\": \"" + this.color2string(ar_) + "\" }"
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
            if (alert > 0) {
                if (currentRegion == BandsRegion.UNKNOWN) {
                    return RED;
                } else if (currentRegion.orderOfConflictRegion() < alert) {
                    return YELLOW;
                }
            }
        }
        return GREEN;
    }
    protected String legendM3 () {
        String green_desc = "Valid non-zero alerts.";
        String yellow_desc = "Abnormal condition: traffic aircraft has a non-zero alert and the region of the current value (heading, speed) is lower than the traffic alert.";
        String red_desc = "Abnormal condition: traffic aircraft has a non-zero alert and the region of the current value (heading, speed) is UNKNOWN.";
        return "{ " 
                + "\"green\": \"" + green_desc + "\", \"yellow\": \"" + yellow_desc + "\", \"red\": \"" + red_desc + "\""
                + " }";
    }
    protected String labelM3 () {
        return "M3: Band(current value) ≥ Alert(traffic)";
    }
    String m3 () {
        int hb = checkM3(currentRegionTrk);
        int hsb = checkM3(currentRegionGs);
        int vsb = checkM3(currentRegionVs);
        int ab = checkM3(currentRegionAlt);

        int max_color = Math.max(hb, Math.max(hsb, Math.max(vsb, ab)));
        if (monitorColor[2] < max_color) { monitorColor[2] = max_color; }

        return "\"color\": " + "\"" + this.color2string(max_color) + "\""
            + ", \"details\":" 
            + " {"
            + " \"Heading Bands\": " + "\"" + this.color2string(hb) + "\""
            + ", \"Horizontal Speed Bands\": " + "\"" + this.color2string(hsb) + "\""
            + ", \"Vertical Speed Bands\": " + "\"" + this.color2string(vsb) + "\""
            + ", \"Altitude Bands\": " + "\"" + this.color2string(ab) + "\""
            + " }";
    }

}