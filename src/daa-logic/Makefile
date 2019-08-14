# WellClear versions to be compiled
VERSIONS = 1.0.1 1.0.2 2.0.e
VERSIONS_WITH_WRAPPER = 2.0.e

# definitions necessary for javac
SRCS  = $(wildcard src/gov/nasa/larcfm/IO/*.java src/gov/nasa/larcfm/Util/*.java src/gov/nasa/larcfm/ACCoRD/*.java)
OBJS  = $(SRCS:.java=.class)
JAVAC = javac
JAR   = jar

# $(call file-exists, file-name)
#   Return non-null if a file exists.
file-exists = $(wildcard $(1))
version1 = $(shell echo $(1) | grep "WellClear-1.")

# url of the github repositories
github = curl --output /dev/null --silent --head --fail "https://codeload.github.com/nasa/WellClear/zip/v$(1)"

# download templates
DOWNLOAD_TARGETS = $(foreach ver,$(VERSIONS), download-$(ver))
define download-template
download-$(1):
	@echo "\n\033[0;32m ** Downloading WellClear $(1) from GitHub **\033[0m" 
	-@curl https://codeload.github.com/nasa/WellClear/zip/v$(1) > WellClear-$(1).zip 
	-@unzip -qn WellClear-$(1).zip
	-@rm WellClear-$(1).zip
endef
download-all = $(foreach ver,$(VERSIONS),$(eval $(call download-template,$(ver))))

# compilation templates
COMPILE_TARGETS = $(foreach ver,$(VERSIONS), compile-$(ver))
define compile-template
compile-$(1):
	@echo "\n\033[0;32m ** Building WellClear-$(1).jar **\033[0m"
	@echo Compiling for WellClear version $(1)
	-@cd utils && $(JAVAC) -cp ../WellClear-$(1)/DAIDALUS/Java/src $(if $(call version1, WellClear-$(1)) , DAABands.java, DAABandsV2.java DaidalusWrapperInterface.java ) ../WellClear-$(1)/DAIDALUS/Java/src/gov/nasa/larcfm/IO/*.java ../WellClear-$(1)/DAIDALUS/Java/src/gov/nasa/larcfm/Util/*.java ../WellClear-$(1)/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD/*.java && $(JAR) cfe ../WellClear-$(1).jar $(if $(call version1, WellClear-$(1)) , DAABands, DAABandsV2 ) *.class && cd ../WellClear-$(1)/DAIDALUS/Java/src && $(JAR) uf ../../../../WellClear-$(1).jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class && cd ../../../../ && unzip -vl WellClear-$(1).jar && unzip -c WellClear-$(1).jar META-INF/MANIFEST.MF
	
	@echo "\n\033[0;32m ** Building DAALoSRegion-${1} **\033[0m"
	-@cd utils && $(JAVAC) -cp ../WellClear-$(1)/DAIDALUS/Java/src $(if $(call version1, WellClear-$(1)) , DAALoSRegion.java, DaidalusWrapperInterface.java DaidalusWrapper.java DAABandsV2.java DAALoSRegionV2.java ) ../WellClear-$(1)/DAIDALUS/Java/src/gov/nasa/larcfm/IO/*.java ../WellClear-$(1)/DAIDALUS/Java/src/gov/nasa/larcfm/Util/*.java ../WellClear-$(1)/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD/*.java && $(JAR) cfe ../LoSRegion-${1}.jar $(if $(call version1, WellClear-$(1)) , DAALoSRegion, DAALoSRegionV2 ) *.class && cd ../WellClear-${1}/DAIDALUS/Java/src && $(JAR) uf ../../../../LoSRegion-$(1).jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class && cd ../../../../ && unzip -vl LoSRegion-$(1).jar && unzip -c LoSRegion-$(1).jar META-INF/MANIFEST.MF
endef
compile-all = $(foreach ver,$(VERSIONS),$(eval $(call compile-template,$(ver))))


COMPILE_WRAPPERS = $(foreach ver,$(VERSIONS_WITH_WRAPPER), compile-wrapper$(ver))
define compile-wrapper
compile-wrapper$(1):
	@echo "\n\033[0;32m ** Building WellClear-WR-$(1).jar **\033[0m"
	@echo Compiling for WellClear version $(1) with Wrapper
	-@cd utils && $(JAVAC) -cp ../WellClear-$(1)/DAIDALUS/Java/src DAABandsV2.java DaidalusWrapperInterface.java DaidalusWrapper.java DAABandsV2Wrapper.java ../WellClear-$(1)/DAIDALUS/Java/src/gov/nasa/larcfm/IO/*.java ../WellClear-$(1)/DAIDALUS/Java/src/gov/nasa/larcfm/Util/*.java ../WellClear-$(1)/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD/*.java && $(JAR) cfe ../WellClear-WR-$(1).jar DAABandsV2Wrapper *.class *.class && cd ../WellClear-$(1)/DAIDALUS/Java/src && $(JAR) uf ../../../../WellClear-WR-$(1).jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class && cd ../../../../ && unzip -vl WellClear-WR-$(1).jar && unzip -c WellClear-WR-$(1).jar META-INF/MANIFEST.MF
endef
compile-all-wrappers = $(foreach ver,$(VERSIONS_WITH_WRAPPER),$(eval $(call compile-wrapper,$(ver))))

# clean templates
CLEAN_TARGETS = $(foreach ver,$(VERSIONS), clean-$(ver))
define clean-template
clean-$(1):
	@echo "\n\033[0;33m ** Removing .class files in WellClear-$(1) **\033[0m"
	-cd WellClear-$(1)/DAIDALUS/Java/src && rm *.class
	-cd WellClear-$(1)/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD && rm *.class
	-cd WellClear-$(1)/DAIDALUS/Java/src/gov/nasa/larcfm/IO && rm *.class
	-cd WellClear-$(1)/DAIDALUS/Java/src/gov/nasa/larcfm/Util && rm *.class
endef
clean-all = $(foreach ver,$(VERSIONS),$(eval $(call clean-template,$(ver))))

# makefile targets
all: download clean-jar compile daa2xyz #wrapper #los1.0.1 los1.0.2 los2.0.e 

download: $(DOWNLOAD_TARGETS)

compile: $(COMPILE_TARGETS) $(COMPILE_WRAPPERS)

clean: clean-utils clean-jar $(CLEAN_TARGETS)

clean-utils:
	@echo "\n\033[0;33m ** Removing .class files in utils **\033[0m"
	@-cd utils && rm *.class

clean-jar:
	@echo "\n\033[0;33m ** Removing .jar files **\033[0m"
	@-rm *.jar

remove-downloads:
	@echo "\n\033[0;33m ** Removing downloaded versions of WellClear **\033[0m"
	@-rm -r WellClear-*
	@-rm WellClear-*.zip

los1.0.1:
	@echo "\n\033[0;32m ** Building DAALoSRegion **\033[0m"
	-@cd utils && $(JAVAC) -cp ../WellClear-1.0.1/DAIDALUS/Java/src DAALoSRegion.java ../WellClear-1.0.1/DAIDALUS/Java/src/gov/nasa/larcfm/IO/*.java ../WellClear-1.0.1/DAIDALUS/Java/src/gov/nasa/larcfm/Util/*.java ../WellClear-1.0.1/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD/*.java
	-@cd utils && $(JAR) cfe ../LoSRegion-1.0.1.jar DAALoSRegion *.class
	-@cd WellClear-1.0.1/DAIDALUS/Java/src && $(JAR) uf ../../../../LoSRegion-1.0.1.jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class
	unzip -vl LoSRegion-1.0.1.jar

los1.0.2:
	@echo "\n\033[0;32m ** Building DAALoSRegion **\033[0m"
	-@cd utils && $(JAVAC) -cp ../WellClear-1.0.2/DAIDALUS/Java/src DAALoSRegion.java ../WellClear-1.0.2/DAIDALUS/Java/src/gov/nasa/larcfm/IO/*.java ../WellClear-1.0.2/DAIDALUS/Java/src/gov/nasa/larcfm/Util/*.java ../WellClear-1.0.2/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD/*.java
	-@cd utils && $(JAR) cfe ../LoSRegion-1.0.2.jar DAALoSRegion *.class
	-@cd WellClear-1.0.21/DAIDALUS/Java/src && $(JAR) uf ../../../../LoSRegion-1.0.2.jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class
	unzip -vl LoSRegion-1.0.2.jar

los2.0.e:
	@echo "\n\033[0;32m ** Building DAALoSRegionV2 **\033[0m"
	-@cd utils && $(JAVAC) -cp ../WellClear-2.0.e/DAIDALUS/Java/src DaidalusWrapperInterface.java DaidalusWrapper.java DAABandsV2.java DAALoSRegionV2.java ../WellClear-2.0.e/DAIDALUS/Java/src/gov/nasa/larcfm/IO/*.java ../WellClear-2.0.e/DAIDALUS/Java/src/gov/nasa/larcfm/Util/*.java ../WellClear-2.0.e/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD/*.java
	-@cd utils && $(JAR) cfe ../LoSRegion-2.0.e.jar DAALoSRegionV2 *.class
	-@cd WellClear-2.0.e/DAIDALUS/Java/src && $(JAR) uf ../../../../LoSRegion-2.0.e.jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class
	unzip -vl LoSRegion-2.0.e.jar

daa2xyz:
	@echo "\n\033[0;32m ** Building DAA2XYZ for Daidalus 2.x **\033[0m"
	-@cd utils && $(JAVAC) -cp ../WellClear-2.0.e/DAIDALUS/Java/src DAA2XYZ.java ../WellClear-2.0.e/DAIDALUS/Java/src/gov/nasa/larcfm/IO/*.java ../WellClear-2.0.e/DAIDALUS/Java/src/gov/nasa/larcfm/Util/*.java ../WellClear-2.0.e/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD/*.java && $(JAR) cfe ../DAA2XYZ-2.0.e.jar DAA2XYZ *.class && cd ../WellClear-2.0.e/DAIDALUS/Java/src && $(JAR) uf ../../../../DAA2XYZ-2.0.e.jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class && cd ../../../../ && unzip -vl DAA2XYZ-2.0.e.jar

wrapper:
	@echo "\n\033[0;32m ** Building WellClear-DW-2.0.e.jar **\033[0m"
	@echo Compiling for WellClear version 2.0.e with Daidalus Wrapper 2.3.1
	-@cd utils && $(JAVAC) -cp ../WellClear-2.0.e/DAIDALUS/Java/src DAABandsV2.java DaidalusWrapperInterface.java DaidalusWrapper.java DAABandsV2Wrapper.java ../WellClear-2.0.e/DAIDALUS/Java/src/gov/nasa/larcfm/IO/*.java ../WellClear-2.0.e/DAIDALUS/Java/src/gov/nasa/larcfm/Util/*.java ../WellClear-2.0.e/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD/*.java
	-@cd utils && $(JAR) cfe ../WellClear-DW-2.0.e.jar DAABandsV2Wrapper *.class
	-@cd WellClear-2.0.e/DAIDALUS/Java/src && $(JAR) uf ../../../../WellClear-DW-2.0.e.jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class
	-@unzip -vl WellClear-DW-2.0.e.jar && unzip -c WellClear-DW-2.0.e.jar META-INF/MANIFEST.MF


# these final commands expand the templates
$(call download-all)
$(call compile-all)
$(call compile-all-wrappers)
$(call clean-all)
