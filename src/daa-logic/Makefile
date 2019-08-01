# WellClear versions to be compiled
VERSIONS = 1.0.1 1.0.2 2.0.e

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
	-@cd utils && $(JAVAC) -cp ../WellClear-$(1)/DAIDALUS/Java/src $(if $(call version1, WellClear-$(1)) , DAABands.java, DAABandsV2.java ) ../WellClear-$(1)/DAIDALUS/Java/src/gov/nasa/larcfm/IO/*.java ../WellClear-$(1)/DAIDALUS/Java/src/gov/nasa/larcfm/Util/*.java ../WellClear-$(1)/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD/*.java
	-@cd utils && $(JAR) cfe ../WellClear-$(1).jar $(if $(call version1, WellClear-$(1)) , DAABands, DAABandsV2 ) *.class
	-@cd WellClear-$(1)/DAIDALUS/Java/src && $(JAR) uf ../../../../WellClear-$(1).jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class
	$(if $(call file-exists, WellClear-$(1)/DAIDALUS/Java/src/gov/nasa/larcfm/Util/GreatCircle.java) \
		 , @unzip -vl WellClear-$(1).jar && unzip -c WellClear-$(1).jar META-INF/MANIFEST.MF \
		 , rm -f WellClear-$(1).jar)
endef
compile-all = $(foreach ver,$(VERSIONS),$(eval $(call compile-template,$(ver))))

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
all: download compile los1.x daa2xyz

download: $(DOWNLOAD_TARGETS)

compile: $(COMPILE_TARGETS)

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

los1.x:
	@echo "\n\033[0;32m ** Building DAALoSRegion **\033[0m"
	-@cd utils && $(JAVAC) -cp ../WellClear-1.0.1/DAIDALUS/Java/src DAALoSRegion.java ../WellClear-1.0.1/DAIDALUS/Java/src/gov/nasa/larcfm/IO/*.java ../WellClear-1.0.1/DAIDALUS/Java/src/gov/nasa/larcfm/Util/*.java ../WellClear-1.0.1/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD/*.java
	-@cd utils && $(JAR) cfe ../LoSRegion-1.0.1.jar DAALoSRegion *.class
	-@cd WellClear-1.0.1/DAIDALUS/Java/src && $(JAR) uf ../../../../LoSRegion-1.0.1.jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class
	unzip -vl LoSRegion-1.0.1.jar

daa2xyz:
	@echo "\n\033[0;32m ** Building DAA2XYZ for Daidalus 2.x **\033[0m"
	-@cd utils && $(JAVAC) -cp ../WellClear-2.0.e/DAIDALUS/Java/src DAA2XYZ.java ../WellClear-2.0.e/DAIDALUS/Java/src/gov/nasa/larcfm/IO/*.java ../WellClear-2.0.e/DAIDALUS/Java/src/gov/nasa/larcfm/Util/*.java ../WellClear-2.0.e/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD/*.java
	-@cd utils && $(JAR) cfe ../DAA2XYZ-2.0.e.jar DAA2XYZ *.class
	-@cd WellClear-2.0.e/DAIDALUS/Java/src && $(JAR) uf ../../../../DAA2XYZ-2.0.e.jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class
	unzip -vl DAA2XYZ-2.0.e.jar


# these final commands expand the templates
$(call download-all)
$(call compile-all)
$(call clean-all)
