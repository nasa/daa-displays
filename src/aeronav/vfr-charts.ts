/**
 * ## Notices
 * Copyright 2019 United States Government as represented by the Administrator 
 * of the National Aeronautics and Space Administration. All Rights Reserved.
 * 
 * ## Disclaimers
 * No Warranty: THE SUBJECT SOFTWARE IS PROVIDED "AS IS" WITHOUT ANY WARRANTY OF ANY KIND, 
 * EITHER EXPRESSED, IMPLIED, OR STATUTORY, INCLUDING, BUT NOT LIMITED TO, ANY WARRANTY 
 * THAT THE SUBJECT SOFTWARE WILL CONFORM TO SPECIFICATIONS, ANY IMPLIED WARRANTIES OF 
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR FREEDOM FROM INFRINGEMENT, 
 * ANY WARRANTY THAT THE SUBJECT SOFTWARE WILL BE ERROR FREE, OR ANY WARRANTY THAT 
 * DOCUMENTATION, IF PROVIDED, WILL CONFORM TO THE SUBJECT SOFTWARE. THIS AGREEMENT DOES NOT, 
 * IN ANY MANNER, CONSTITUTE AN ENDORSEMENT BY GOVERNMENT AGENCY OR ANY PRIOR RECIPIENT 
 * OF ANY RESULTS, RESULTING DESIGNS, HARDWARE, SOFTWARE PRODUCTS OR ANY OTHER APPLICATIONS 
 * RESULTING FROM USE OF THE SUBJECT SOFTWARE.  FURTHER, GOVERNMENT AGENCY DISCLAIMS 
 * ALL WARRANTIES AND LIABILITIES REGARDING THIRD-PARTY SOFTWARE, IF PRESENT IN THE 
 * ORIGINAL SOFTWARE, AND DISTRIBUTES IT "AS IS."
 * 
 * Waiver and Indemnity:  RECIPIENT AGREES TO WAIVE ANY AND ALL CLAIMS AGAINST THE 
 * UNITED STATES GOVERNMENT, ITS CONTRACTORS AND SUBCONTRACTORS, AS WELL AS ANY PRIOR 
 * RECIPIENT.  IF RECIPIENT'S USE OF THE SUBJECT SOFTWARE RESULTS IN ANY LIABILITIES, 
 * DEMANDS, DAMAGES, EXPENSES OR LOSSES ARISING FROM SUCH USE, INCLUDING ANY DAMAGES 
 * FROM PRODUCTS BASED ON, OR RESULTING FROM, RECIPIENT'S USE OF THE SUBJECT SOFTWARE, 
 * RECIPIENT SHALL INDEMNIFY AND HOLD HARMLESS THE UNITED STATES GOVERNMENT, 
 * ITS CONTRACTORS AND SUBCONTRACTORS, AS WELL AS ANY PRIOR RECIPIENT, TO THE EXTENT 
 * PERMITTED BY LAW.  RECIPIENT'S SOLE REMEDY FOR ANY SUCH MATTER SHALL BE THE IMMEDIATE, 
 * UNILATERAL TERMINATION OF THIS AGREEMENT.
 */

/**
 * VFR Chart descriptor
 */
export declare interface VfrChart {
    // filename of the sectional chart
    file: string,
    // bounding coordinates of the sectional chart
    west: number, 
    east: number, 
    north: number, 
    south: number,
    // date of the sectional chart
    date?: string | { begin: string, end: string },
    // optional offset, can be used fine-tune the chart position if needed
    // e.g., when there's a mismatch between the position of the chart wrt the street map
    // landmarks such as airports can be used to perform fine tuning of the chart position
    // x,y can be used for rigid translations
    // west, east, north, south can be used for stretching the dimensions of the chart
    offset?: { west?: number, east?: number, north?: number, south?: number, x?: number, y?: number },
    // optional description of the sectional chart
    description?: string
};

/**
 * List of VFR sectional charts used in daa-displays
 * Edit this array to add/remove VFR charts
 * The original GeoTIFF charts are 16000x12000 (300dpi)
 * For performance reasons, the GeoTIFF charts are down-scaled to a .png file of approx 8000x6000 (300dpi)
 */
export const VFR_CHARTS: VfrChart[] = [
    {
        file: "washington.png",
        west: -79.948223, 
        east: -71.651166, 
        north: 40.279218, 
        south: 35.498088,
        date: { begin: "20220127", end: "20220323" },
        offset: { x: 0.032, y: 0.01 } // landmark is langley airbase
    },
    {
        file: "atlanta.png",
        west: -89.244486, 
        east: -80.745892, 
        north: 36.621420, 
        south: 31.817510,
        date: { begin: "20220127", end: "20220323" }
    },
    {
        file: "miami.png",
        west: -83.777984, 
        east: -76.332757, 
        north: 28.549194, 
        south: 23.791146,
        date: { begin: "20220127", end: "20220323" }
    },
    {
        file: "jacksonville.png",
        west: -85.883729, 
        east: -78.431697, 
        north: 32.276964, 
        south: 27.485285,
        date: { begin: "20220127", end: "20220323" }
    },
    {
        file: "caribbean-2.png",
        west: -74.851295, 
        east: -60.227183, 
        north: 22.253764, 
        south: 12.716807,
        date: { begin: "20220127", end: "20220323" },
        description: "Puerto Rico / San Juan"
    },
    {
        file: "houston.png",
        west: -97.872848, 
        east: -90.440835, 
        north: 32.274675, 
        south: 27.557342,
        date: { begin: "20220127", end: "20220323" }
    },
    {
        file: "los-angeles.png",
        west: -122.395266, 
        east: -114.508713, 
        north: 36.672355, 
        south: 31.896578,
        date: { begin: "20220127", end: "20220323" }
    },
    {
        file: "san-francisco.png",
        west: -125.946499, 
        east: -117.633281, 
        north: 40.639460, 
        south: 35.857057,
        date: { begin: "20220127", end: "20220323" }
    },
    {
        file: "denver.png",
        west: -111.954316, 
        east: -103.709904, 
        north: 40.125550, 
        south: 35.323989,
        date: { begin: "20220127", end: "20220323" },
        offset: { x: -0.016, y: -0.04 } // landmark is centennial airport
    }
];