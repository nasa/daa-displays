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

import java.io.FileWriter;
import java.io.PrintWriter;

/**
 * Simple profiler utility class for computing performance stats
 */

public class DAAProfiler {
    long start = 0; // start profiler
    long stop = 0; // stop profiler
    String message = null; // can be used to keep track of what we are profiling, e.g., "time to compute bands"
    String collected_data = ""; // data collected by the profiler, in millis, separated by SEPARATOR. Data is collected every time the stop method is invoked
    String SEPARATOR = " ";
    int LIMIT = 0; // 0 = "no limit"

    /**
     * Constructors
     */
    DAAProfiler () { }
    DAAProfiler (String title) {
        message = title;
    }

    /**
     * start profiler
     */
    void start () {
        start = System.currentTimeMillis();
    }

    /**
     * stop profiler and collect data
     */
    void stop () {
        stop = System.currentTimeMillis();
        try {
            collected_data += String.valueOf(stop - start) + SEPARATOR;
        } catch (Exception e) {
            System.err.println("[DAAProfiler] Warning: Runtime exception while collecting data " + e);
        }
    }

    /**
     * get elapsed time, in millis
     */
    long getElapsedTime () {
        long now = System.currentTimeMillis();
        return now - start;
    }

    /**
     * get total time, from start to stop, in millis
     */
    long getTotalTime () {
        return stop - start;
    }

    /**
     * print elapsed time
     */
    String printElapsedTime () {
        long elapsed = getElapsedTime();
        String msg = "[DAAProfiler] " + (message != null ? message : "") + ", Elapsed time:" + elapsed + "ms\n";
        return msg;
    }

    /**
     * print total time
     */
    String printTotalTime () {
        long total = getTotalTime();
        String msg = "[DAAProfiler] " + (message != null ? message : "") + ", Total time:" + total + "ms\n";
        return msg;
    }

    /**
     * return collected data as a string
     */
    String printCollectedData () {
        String[] dt = collected_data.split(SEPARATOR, LIMIT);
        String msg = "[DAAProfiler] " + (message != null ? message : "");
        if (dt.length > 0) {
            for (int i = 0; i < dt.length; i++) {
                msg += "\n" + dt[i] + "ms";
            }
            msg += "\n";
        } else {
            msg += "\nNo data collected\n";
        }
        return msg;
    }

    /**
     * print collected data to file
     */
    boolean printCollectedDataToFile (String fname) {
        try {
            FileWriter fileWriter = new FileWriter(fname);
            PrintWriter printWriter = new PrintWriter(fileWriter);
            printWriter.print(printCollectedData());
            printWriter.close();
        } catch (java.io.IOException ex) {
            System.err.println("[DAAProfiler] Warning: exception while printing data to file " + fname);
            return false;
        }
        return true;
    }
}
