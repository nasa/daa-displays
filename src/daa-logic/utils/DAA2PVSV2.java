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

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import gov.nasa.larcfm.ACCoRD.Daidalus;
import gov.nasa.larcfm.ACCoRD.DaidalusFileWalker;

import static gov.nasa.larcfm.ACCoRD.DaidalusParameters.VERSION;

public class DAA2PVSV2 {

    protected String tool_name = "DAA2PVSV2";

    Daidalus daa = null;

    protected String daaConfig = null;
    protected String scenario = null;
    protected String ofname = null; // output file name
    protected String ifname = null; // input file name

    PrintWriter printWriter = null;

    DAA2PVSV2 () {
	/* Create Daidalus object and setting the configuration parameters */
	daa = new Daidalus();
    }

    String getScenario() {
	return scenario;
    }
    String getConfigFileName() {
	return daaConfig;
    }
    String getDaaConfig () {
	if (daaConfig != null) {
	    return daaConfig.split("/")[ daaConfig.split("/").length - 1 ];
	}
	return null;
    }
    String getOutputFileName() {
	return ofname;
    }
    String getInputFileName() {
	return ifname;
    }

    protected void printHelpMsg() {
	System.out.println("Version: DAIDALUS " + getVersion());
	System.out.println("Converts Daidalus configurations in PVS format");
	System.out.println("Usage:");
	System.out.println("  " + tool_name + " [options] file");
	System.out.println("Options:");
	System.out.println("  --help\n\tPrint this message");
	System.out.println("  --config <file.conf>\n\tLoad configuration <file.conf>");
	System.out.println("  --output <file.json>\n\tOutput file <file.json>");
	System.exit(0);
    }

    boolean loadDaaConfig () {
	if (daa != null) {
	    if (daaConfig != null) {
		boolean paramLoaded = daa.loadFromFile(daaConfig);
		if (paramLoaded) {
		    return true;
		} else {
		    System.err.println("** Error: Configuration file " + daaConfig + " could not be loaded. Using default DAIDALUS configuration.");
		}
	    } else {
		System.err.println("** Warning: Configuration file not specified. Using default DAIDALUS configuration.");
	    }
	} else {
	    System.err.println("** Error: Daidalus is not initialized.");
	}
	return false;
    }
	
    public void walkFile () {

	/* Create DaidalusFileWalker */
	DaidalusFileWalker walker = new DaidalusFileWalker(ifname);

	/* Processing the input file time step by time step and writing output file */
	while (!walker.atEnd()) {
	    walker.readState(daa);
	    System.out.println(daa.toPVS());
	}

    }

    static String getFileName (String fname) {
	if (fname != null && fname.contains("/")) {
	    String[] comp = fname.split("/");
	    return comp[comp.length - 1];
	}
	return fname;
    }

    static String removeExtension (String fname) {
	return fname != null && fname.contains(".") ? 
	    fname.substring(0, fname.lastIndexOf('.')) 
	    : fname;
    }

    String getVersion () {
	return VERSION;
    }

    protected void parseCliArgs (String[] args) {
	if (args != null && args.length == 0) {
	    printHelpMsg();
	    System.exit(0);
	}
	int a = 0;
	for (; a < args.length && args[a].startsWith("-"); a++) {
	    if (args[a].equals("--help") || args[a].equals("-help") || args[a].equals("-h")) {
		printHelpMsg();
	    } else if (args[a].startsWith("--conf") || args[a].startsWith("-conf") || args[a].equals("-c")) {
		daaConfig = args[++a];
	    } else if (args[a].startsWith("--out") || args[a].startsWith("-out") || args[a].equals("-o")) {
		ofname = args[++a];
	    } else if (args[a].startsWith("--version") || args[a].startsWith("-version")) {
		System.out.println(getVersion());
		System.exit(0);
	    } else if (args[a].startsWith("-")) {
		System.err.println("** Error: Invalid option ("+args[a]+")");
		System.exit(1);
	    } else {
		// scenario name
		ifname = args[a];
		scenario = removeExtension(getFileName(ifname));
		if (ofname == null) {
		    ofname = scenario + ".json";
		}		
	    }
	}
    }

    public boolean inputFileReadable () {
	String inputFile = getInputFileName();
	File file = new File(inputFile);
	if (!file.exists() || !file.canRead()) {
	    return false;
	}
	return true;
    }

    protected boolean createPrintWriter () {
	try {
	    printWriter = new PrintWriter(new BufferedWriter(new FileWriter(ofname)),true);
	    System.out.println("Creating output file " + ofname);
	} catch (Exception e) {
	    System.err.println("** Error: " + e);
	    return false;
	}
	return true;
    }
    
    protected boolean closePrintWriter () {
	if (printWriter != null) {
	    printWriter.close();
	    return true;
	}
	return false;
    }

    String getPvsConfiguration () {
	String out = daa.toPVS();
	Matcher match = Pattern.compile("%%%\\s*Parameters\\s*:\\s*([^%]+)").matcher(out);
	if (match.find()) {
	    return match.group(1);
	}
	return null;
    }

    public static void main(String[] args) {
	DAA2PVSV2 daa2pvs = new DAA2PVSV2();
	daa2pvs.parseCliArgs(args);

	daa2pvs.loadDaaConfig();
	String out = daa2pvs.getPvsConfiguration();
	if (out != null) {
	    System.out.println(out);
	}
    }

}
