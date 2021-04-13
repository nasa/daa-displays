/*
 * Copyright (c) 2015-2020 United States Government as represented by
 * the National Aeronautics and Space Administration.  No copyright
 * is claimed in the United States under Title 17, U.S.Code. All Other
 * Rights Reserved.
 */

#ifndef DAAMONITORSV2_H_
#define DAAMONITORSV2_H_

#include "Daidalus.h"


using namespace larcfm;

class DAAMonitorsV2 {

protected:

  static const int N_MONITORS = 4;

  int monitorColor[N_MONITORS];

  // preferred resolutions
  double resolutionTrk;
  BandsRegion::Region regionTrk;
  double resolutionGs;
  BandsRegion::Region regionGs;
  double resolutionVs;
  BandsRegion::Region regionVs;
  double resolutionAlt;
  BandsRegion::Region regionAlt;

  // other resolutions
  double resolutionTrk_other;
  BandsRegion::Region regionTrk_other;
  double resolutionGs_other;
  BandsRegion::Region regionGs_other;
  double resolutionVs_other;
  BandsRegion::Region regionVs_other;
  double resolutionAlt_other;
  BandsRegion::Region regionAlt_other;

  // current regions
  BandsRegion::Region currentRegionTrk;
  BandsRegion::Region currentRegionGs;
  BandsRegion::Region currentRegionVs;
  BandsRegion::Region currentRegionAlt;

  static int bandsRegionToInt(BandsRegion::Region b);

  void computeResolutions(Daidalus& daa);

  void computeCurrentRegions(Daidalus& daa);

  static std::string color2string(int color);

  /**
   * Monitor 1: valid finite resolutions
   * - Resolution is finite and region is not NONE nor RECOVERY (yellow monitor).
   * - Resolution is finite and region is UNKNOWN (red monitor).
   */
  int checkM1(double resolution, BandsRegion::Region region) const;

  static std::string labelM1();

  static std::string legendM1();

  /**
   * Monitor 2: consistent resolutions
   * - If region is not RECOVERY and any resolution is NaN and other resolutions are not NaN (yellow monitor).
   */
  int checkM2_preferred(double resolution, BandsRegion::Region region) const;

  int checkM2_other(double resolution_, BandsRegion::Region region) const;

  static std::string labelM2();

  static std::string legendM2();

  /**
   * Monitor 3: Valid non-zero alerts
   * - Traffic aircraft has a non-zero alert and the region of the current value (heading, speed) is lower than the traffic alert (yellow monitor)
   * - Traffic aircraft has a non-zero alert and the region of the current value (heading, speed) is UNKNOWN (red monitor)
   *   Color order is NONE < FAR < MID < NEAR < RECOVERY. 
   */
  int checkM3(Daidalus& daa, BandsRegion::Region currentRegion) const;

  static std::string labelM3();

  static std::string legendM3();

  /**
   * Monitor 4: NONE and RECOVERY
   * NONE and RECOVERY appear in the same list of bands (yellow monitor)
   */
  int checkM4Trk(Daidalus& daa) const;

  int checkM4Hs(Daidalus& daa) const;

  int checkM4Vs(Daidalus& daa) const;

  int checkM4Alt(Daidalus& daa) const;

  static std::string labelM4();

  static std::string legendM4();

public:

  DAAMonitorsV2();

  static const int GREEN=0;
  static const int YELLOW=1;
  static const int RED=2;

  static int getSize();

  void check(Daidalus& daa);

  static std::string getLabel(int monitorID);

  std::string getColor(int monitorID) const;

  static std::string getLegend(int monitorID);

  std::string m1();

  std::string m2();

  std::string m3(Daidalus& daa);

  std::string m4(Daidalus& daa);

  // NB: You need to update the following items when adding new monitors: N_MONITORS, monitorColor, getLegend and getLabel

};

#endif
