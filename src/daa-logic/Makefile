# Simple Makefile to build DAIDALUS library and example applications

SRCS  = $(wildcard src/gov/nasa/larcfm/IO/*.java src/gov/nasa/larcfm/Util/*.java src/gov/nasa/larcfm/ACCoRD/*.java)
OBJS  = $(SRCS:.java=.class)
JAVAC = javac
JAR   = jar

all: WellClear-1.0.1 WellClear-1.0.2 #WellClear-2.0.e

WellClear-1.0.1: download-wellclear-1.0.1 compile-wellclear-1.0.1

compile-wellclear-1.0.1:
	@echo "\033[0;32m ** Building WellClear-1.0.1.jar **\033[0m"
	@cd utils && $(JAVAC) -cp ../WellClear-1.0.1/DAIDALUS/Java/src DAABands.java ../WellClear-1.0.1/DAIDALUS/Java/src/gov/nasa/larcfm/IO/*.java ../WellClear-1.0.1/DAIDALUS/Java/src/gov/nasa/larcfm/Util/*.java ../WellClear-1.0.1/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD/*.java
	@cd utils && $(JAR) cfe ../WellClear-1.0.1.jar DAABands *.class
	@cd WellClear-1.0.1/DAIDALUS/Java/src && $(JAR) uf ../../../../WellClear-1.0.1.jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class
	@unzip -vl WellClear-1.0.1.jar
	@unzip -c WellClear-1.0.1.jar META-INF/MANIFEST.MF

download-wellclear-1.0.1:
	@echo "\033[0;32m ** Downloading WellClear 1.0.1 from GitHub **\033[0m"
	@curl https://codeload.github.com/nasa/WellClear/zip/v1.0.1 > WellClear-1.0.1.zip
	@unzip -qn WellClear-1.0.1.zip && rm -f WellClear-1.0.1.zip

WellClear-1.0.2: download-wellclear-1.0.2 compile-wellclear-1.0.2

compile-wellclear-1.0.2:
	@echo "\033[0;32m ** Building WellClear-1.0.2.jar **\033[0m"
	@cd utils && $(JAVAC) -cp ../WellClear-1.0.2/DAIDALUS/Java/src DAABands.java ../WellClear-1.0.2/DAIDALUS/Java/src/gov/nasa/larcfm/IO/*.java ../WellClear-1.0.2/DAIDALUS/Java/src/gov/nasa/larcfm/Util/*.java ../WellClear-1.0.2/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD/*.java
	@cd utils && $(JAR) cfe ../WellClear-1.0.2.jar DAABands *.class
	@cd WellClear-1.0.2/DAIDALUS/Java/src && $(JAR) uf ../../../../WellClear-1.0.2.jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class
	@unzip -vl WellClear-1.0.2.jar
	@unzip -c WellClear-1.0.2.jar META-INF/MANIFEST.MF

download-wellclear-1.0.2:
	@echo "\033[0;32m ** Downloading WellClear 1.0.2 from GitHub **\033[0m"
	@curl https://codeload.github.com/nasa/WellClear/zip/v1.0.2 > WellClear-1.0.2.zip
	@unzip -qn WellClear-1.0.2.zip && rm -f WellClear-1.0.2.zip

WellClear-2.0.e: compile-wellclear-2.0.e

compile-wellclear-2.0.e:
	@echo "\033[0;32m ** Building WellClear-2.0.e.jar **\033[0m"
	@cd utils && $(JAVAC) -cp ../WellClear-2.0.e/DAIDALUS/Java/src DAABandsV2.java ../WellClear-2.0.e/DAIDALUS/Java/src/gov/nasa/larcfm/IO/*.java ../WellClear-2.0.e/DAIDALUS/Java/src/gov/nasa/larcfm/Util/*.java ../WellClear-2.0.e/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD/*.java
	@cd utils && $(JAR) cfe ../WellClear-2.0.e.jar DAABandsV2 *.class
	@cd WellClear-2.0.e/DAIDALUS/Java/src/ && $(JAR) uf ../../../../WellClear-2.0.e.jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class
	@unzip -vl WellClear-2.0.e.jar
	@unzip -c WellClear-2.0.e.jar META-INF/MANIFEST.MF

clean: cleandaa2pvs cleanwellclear

cleandaa2pvs:
	cd utils && rm -f *.class
	rm -f *.jar

cleanwellclear:
	cd WellClear-2.0.e/DAIDALUS/Java/src && rm -f *.class
	cd WellClear-2.0.e/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD && rm -f *.class
	cd WellClear-2.0.e/DAIDALUS/Java/src/gov/nasa/larcfm/IO && rm -f *.class
	cd WellClear-2.0.e/DAIDALUS/Java/src/gov/nasa/larcfm/Util && rm -f *.class

removewellclear:
	rm -rf WellClear-1.0.1
	rm -rf WellClear-1.0.2
	rm -f WellClear-1.0.1.zip
	rm -f WellClear-1.0.2.zip
