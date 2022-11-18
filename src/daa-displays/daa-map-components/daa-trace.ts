/**
 * @module DAA_Trace
 * @date 2022.10.31
 * @description <div style="display:flex;"><div style="width:50%;">
 *              <b>DAA Trace.</b>
 *              <p>This widget renders a flight trace, i.e., the last n segments/waypoints of an aircraft route.</p>
 *              </div>
 *              </div>
 * 
 * @author Paolo Masci
 * @copyright
 * Copyright 2016 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration. No
 * copyright is claimed in the United States under Title 17,
 * U.S. Code. All Other Rights Reserved.
 * <br>
 * Disclaimers
 * <br>
 * No Warranty: THE SUBJECT SOFTWARE IS PROVIDED "AS IS" WITHOUT ANY
 * WARRANTY OF ANY KIND, EITHER EXPRESSED, IMPLIED, OR STATUTORY,
 * INCLUDING, BUT NOT LIMITED TO, ANY WARRANTY THAT THE SUBJECT SOFTWARE
 * WILL CONFORM TO SPECIFICATIONS, ANY IMPLIED WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR FREEDOM FROM
 * INFRINGEMENT, ANY WARRANTY THAT THE SUBJECT SOFTWARE WILL BE ERROR
 * FREE, OR ANY WARRANTY THAT DOCUMENTATION, IF PROVIDED, WILL CONFORM TO
 * THE SUBJECT SOFTWARE. THIS AGREEMENT DOES NOT, IN ANY MANNER,
 * CONSTITUTE AN ENDORSEMENT BY GOVERNMENT AGENCY OR ANY PRIOR RECIPIENT
 * OF ANY RESULTS, RESULTING DESIGNS, HARDWARE, SOFTWARE PRODUCTS OR ANY
 * OTHER APPLICATIONS RESULTING FROM USE OF THE SUBJECT SOFTWARE.
 * FURTHER, GOVERNMENT AGENCY DISCLAIMS ALL WARRANTIES AND LIABILITIES
 * REGARDING THIRD-PARTY SOFTWARE, IF PRESENT IN THE ORIGINAL SOFTWARE,
 * AND DISTRIBUTES IT "AS IS."
 * <br>
 * Waiver and Indemnity: RECIPIENT AGREES TO WAIVE ANY AND ALL CLAIMS
 * AGAINST THE UNITED STATES GOVERNMENT, ITS CONTRACTORS AND
 * SUBCONTRACTORS, AS WELL AS ANY PRIOR RECIPIENT.  IF RECIPIENT'S USE OF
 * THE SUBJECT SOFTWARE RESULTS IN ANY LIABILITIES, DEMANDS, DAMAGES,
 * EXPENSES OR LOSSES ARISING FROM SUCH USE, INCLUDING ANY DAMAGES FROM
 * PRODUCTS BASED ON, OR RESULTING FROM, RECIPIENT'S USE OF THE SUBJECT
 * SOFTWARE, RECIPIENT SHALL INDEMNIFY AND HOLD HARMLESS THE UNITED
 * STATES GOVERNMENT, ITS CONTRACTORS AND SUBCONTRACTORS, AS WELL AS ANY
 * PRIOR RECIPIENT, TO THE EXTENT PERMITTED BY LAW.  RECIPIENT'S SOLE
 * REMEDY FOR ANY SUCH MATTER SHALL BE THE IMMEDIATE, UNILATERAL
 * TERMINATION OF THIS AGREEMENT.
 **/

import { DAA_FlightPlan } from "./daa-flight-plan";

export const DEFAULT_MAX_TRACE_SIZE: number = 8;

export class DAA_Trace extends DAA_FlightPlan {
    protected max_trace_size: number = DEFAULT_MAX_TRACE_SIZE;

    /**
     * Utility function, sets the maximum trace size
     */
    setMaxTraceSize (n: number): void {
        if (n >= 0) {
            this.max_trace_size = n;
            this.trimWaypoints();
        }
    }

    /**
     * Utility function, removes the first waypoint
     */
    removeWaypoint (): boolean {
        if (this.waypoints.length > 0) {
            this.waypoints = this.waypoints.slice(1);
            this.layer?.removeRenderable(this.segments[0]);
            this.segments = this.segments.slice(1);
            return true;
        }
        return false;
    }

    /**
     * Internal function, trims the list of waypoints so that the number of waypoints stored in the trace matches max_trace_size
     */
    protected trimWaypoints (): void {
        if (this.waypoints.length > this.max_trace_size) {
            const n: number = this.waypoints.length - this.max_trace_size;
            for (let i = 0; i < n; i++) {
                this.removeWaypoint();
            }
        }
    }
    
}