lite = # Lite installation and quiet

# WellClear WELLCLEAR_VERSION to be used
WELLCLEAR_VERSION = 2.0.e

# definitions necessary for javac
SRCS  = $(wildcard src/gov/nasa/larcfm/IO/*.java src/gov/nasa/larcfm/Util/*.java src/gov/nasa/larcfm/ACCoRD/*.java)
OBJS  = $(SRCS:.java=.class)
JAVAC = javac
JAR   = jar

all: virtual-pilot #SimDaidalus #wrapper

virtual-pilot:
	cd virtual-pilot && make

wrapper:
	@echo "\n\033[0;32m ** Building JAR file for Daidalus Wrapper **\033[0m"
	-@cd ../daa-logic/utils && $(JAVAC) -cp ../WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src ../../contrib/SimDaidalus_2_3_1_wind.java ../WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src/gov/nasa/larcfm/IO/*.java ../WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src/gov/nasa/larcfm/Util/*.java ../WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD/*.java
	-$(JAR) cfe SimDaidalus_2_3_1_wind-$(WELLCLEAR_VERSION).jar SimDaidalus_2_3_1_wind *.class
	-@cd ../daa-logic/WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src && $(JAR) uf ../../../../../contrib/SimDaidalus_2_3_1_wind-$(WELLCLEAR_VERSION).jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class
	-unzip -vl SimDaidalus_2_3_1_wind-$(WELLCLEAR_VERSION).jar
	-rm *.class

SimDaidalus:
	@echo "\n\033[0;32m ** Building JAR file for SimDaidalus **\033[0m"
	-@cd ../daa-logic/utils && $(JAVAC) -cp ../WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src ../../contrib/SimDaidalus_2_3_1_wind.java ../WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src/gov/nasa/larcfm/IO/*.java ../WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src/gov/nasa/larcfm/Util/*.java ../WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD/*.java
	-$(JAR) cfe SimDaidalus_2_3_1_wind-$(WELLCLEAR_VERSION).jar SimDaidalus_2_3_1_wind *.class
	-@cd ../daa-logic/WellClear-$(WELLCLEAR_VERSION)/DAIDALUS/Java/src && $(JAR) uf ../../../../../contrib/SimDaidalus_2_3_1_wind-$(WELLCLEAR_VERSION).jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class
	-unzip -vl SimDaidalus_2_3_1_wind-$(WELLCLEAR_VERSION).jar
	-rm *.class

clean:
	@echo "\n\033[0;33m ** Removing .class files in contrib **\033[0m"
	-rm *.class
	@echo "\n\033[0;33m Done!\033[0m"
