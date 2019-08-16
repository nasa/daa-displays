# WellClear WELLCLEAR_VERSION to be used
WELLCLEAR_VERSION = 2.0.e

# definitions necessary for javac
SRCS  = $(wildcard src/gov/nasa/larcfm/IO/*.java src/gov/nasa/larcfm/Util/*.java src/gov/nasa/larcfm/ACCoRD/*.java)
OBJS  = $(SRCS:.java=.class)
JAVAC = javac
JAR   = jar

all: SimDaidalus BatchSimDaidalus

SimDaidalus:
	@echo "\n\033[0;32m ** Building JAR file for SimDaidalus **\033[0m"
	-@cd ../../daa-logic/utils && $(JAVAC) -cp ../WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src ../../contrib/virtual-pilot/SimDaidalus_2_3_1_wind.java ../WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src/gov/nasa/larcfm/IO/*.java ../WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src/gov/nasa/larcfm/Util/*.java ../WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD/*.java
	-$(JAR) cfe SimDaidalus_2_3_1_wind-$(WELLCLEAR_VERSION).jar SimDaidalus_2_3_1_wind *.class
	-@cd ../../daa-logic/WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src && $(JAR) uf ../../../../../contrib/virtual-pilot/SimDaidalus_2_3_1_wind-$(WELLCLEAR_VERSION).jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class
	-unzip -vl SimDaidalus_2_3_1_wind-$(WELLCLEAR_VERSION).jar
	-rm *.class

BatchSimDaidalus:
	@echo "\n\033[0;32m ** Building JAR file for BatchSimDaidalus_2_3_1 **\033[0m"
	-@cd ../../daa-logic/utils && $(JAVAC) -cp ../WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src ../../contrib/virtual-pilot/BatchSimDaidalus_2_3_1.java ../WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src/gov/nasa/larcfm/IO/*.java ../WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src/gov/nasa/larcfm/Util/*.java ../WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD/*.java
	-$(JAR) cfe BatchSimDaidalus_2_3_1-$(WELLCLEAR_VERSION).jar BatchSimDaidalus_2_3_1 *.class
	-@cd ../../daa-logic/WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src && $(JAR) uf ../../../../../contrib/virtual-pilot/BatchSimDaidalus_2_3_1-$(WELLCLEAR_VERSION).jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class
	-unzip -vl BatchSimDaidalus_2_3_1-$(WELLCLEAR_VERSION).jar
	-rm *.class

clean:
	@echo "\n\033[0;33m ** Removing .class files in contrib/virtual-pilot **\033[0m"
	-rm *.class
	@echo "\n\033[0;33m Done!\033[0m"
