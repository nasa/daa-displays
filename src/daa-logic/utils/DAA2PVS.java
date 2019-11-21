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

// implementation based on DrawMultiBands.java

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.Optional;
import java.nio.file.FileSystems;

import gov.nasa.larcfm.ACCoRD.BandsRegion;
import gov.nasa.larcfm.ACCoRD.Daidalus;
import gov.nasa.larcfm.ACCoRD.DaidalusFileWalker;
import gov.nasa.larcfm.ACCoRD.KinematicBandsParameters;
import gov.nasa.larcfm.ACCoRD.KinematicMultiBands;
import gov.nasa.larcfm.Util.Units;
import gov.nasa.larcfm.Util.Util;
import gov.nasa.larcfm.Util.f;

public class DAA2PVS {

	protected String tool_name = "DAA2PVS";

	Daidalus daa = null;

	protected String daaConfig = null;
	protected String scenario = null;
	protected String ofname = null; // output file name
	protected String ifname = null; // input file name

	PrintWriter printWriter = null;

	DAA2PVS () {
		/* Create Daidalus object and setting the configuration parameters */
		this.daa = new Daidalus();
	}

	String getVersion () {
		return KinematicBandsParameters.VERSION;
	}

	String getDaaConfig () {
		return daaConfig;
	}

	String getInputFileName () {
		return ifname;
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

	protected void printHelpMsg() {
		System.out.println("Version: DAIDALUS " + getVersion());
		System.out.println("Generates a file that can be processed with the Python script drawmultibands.py");
		System.out.println("Usage:");
		System.out.println("  " + tool_name + " [options] file");
		System.out.println("Options:");
		System.out.println("  --help\n\tPrint this message");
		System.out.println("  --config <file.conf>\n\tLoad configuration <file.conf>");
		System.out.println("  --output <file.json>\n\tOutput file <file.json>");
		System.exit(0);
    }
    

	Boolean loadDaaConfig () {
		if (daa != null) {
			if (daaConfig != null) {
				Boolean paramLoaded = this.daa.parameters.loadFromFile(daaConfig);
				if (paramLoaded) {
					// System.out.println("** Configuration file " + daaConfig + " loaded successfully!");
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

	protected void parseCliArgs (String[] args) {
		// System.out.println(args.toString());
		if (args != null && args.length == 0) {
			printHelpMsg();
			System.exit(0);
		}
		for (int a = 0; a < args.length; a++) {
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
			}
		}
		if (scenario != null && ofname == null) {
			ofname = scenario + ".daa.pvs";
		}
	}

	protected Boolean createPrintWriter () {
		try {
			printWriter = new PrintWriter(new BufferedWriter(new FileWriter(ofname)), true);
			// System.out.println("Creating output file " + ofname);
		} catch (Exception e) {
			System.err.println("** Error: " + e);
			return false;
		}
		return true;
	}
	protected Boolean closePrintWriter () {
		if (printWriter != null) {
			printWriter.close();
			return true;
		}
		return false;
	}

	public void walkFile () {
		if (ofname != null) { this.createPrintWriter(); }

		/* Create DaidalusFileWalker */
		DaidalusFileWalker walker = new DaidalusFileWalker(ifname);

		/* Processing the input file time step by time step and writing output file */
		if (ofname != null) {
			printWriter.println("(:");
		}
		while (!walker.atEnd()) {
			walker.readState(daa);
			String ans =  daa.aircraftListToPVS(8); // 8 is the precision
			if (ofname != null) {
				printWriter.print("(" + daa.getCurrentTime() + ", " + ans + ")");
				if (!walker.atEnd()) {
					printWriter.println(",");
				}
			} else {
				System.out.println(ans);
			}
		}

		if (ofname != null) {
			printWriter.println("\n:)");
			this.closePrintWriter();
			System.out.println("Created file " + ofname);
		}

	}

	String getPvsConfiguration () {
		return this.daa.parameters.toPVS(8);
	}

	public static void main(String[] args) {
		DAA2PVS daa2pvs = new DAA2PVS();
		daa2pvs.parseCliArgs(args);

		if (daa2pvs.getDaaConfig() != null) {
			daa2pvs.loadDaaConfig();
			String out = daa2pvs.getPvsConfiguration();
			if (out != null) {
				try {
					String configFile = daa2pvs.getDaaConfig() + ".pvs";
					PrintWriter conf = new PrintWriter(new BufferedWriter(new FileWriter(configFile)),true);
					conf.println(out);
					conf.close();
					System.out.println("Created file " + configFile);
				} catch (IOException ex) {
					System.out.println(out);
				}
			}
		}

		if (daa2pvs.getInputFileName() != null) {
			daa2pvs.walkFile();
		}
	}
}