# WellClear JAVA_versions to be compiled
JAVA_VERSIONS = 1.0.1 1.0.2 2.0.e 2.0.f
CPP_VERSIONS = 2.0.e 2.0.f # this should always be a subset of the JAVA_VERSION

JAVAC = javac
JAR   = jar
CPP   = c++

# Lite installation (don't downlad if directories exist, don't make DAIDALUS libraries if they exist)
lite =

# $(call file-exists, file-name)
#   Return non-null if a file exists.
file-exists = $(wildcard $(1))
version1 = $(shell echo $(1) | grep "WellClear-1.")

# url of the github repositories
github = curl --output /dev/null --silent --head --fail "https://codeload.github.com/nasa/WellClear/zip/v$(1)"

# download templates
DOWNLOAD_TARGETS = $(foreach ver,$(JAVA_VERSIONS), download-$(ver))
define download-template
download-$(1):
	@echo "\n\033[0;32m ** Downloading WellClear $(1) from GitHub **\033[0m"
	-@test -d "WellClear-$(1)/DAIDALUS" -a -n "$(lite)" || (\
	curl https://codeload.github.com/nasa/WellClear/zip/v$(1) > WellClear-$(1).zip &&\
	unzip -qn WellClear-$(1).zip &&\
	rm WellClear-$(1).zip)
endef
download-all = $(foreach ver,$(JAVA_VERSIONS),$(eval $(call download-template,$(ver))))

# compilation templates
COMPILE_JAVA_TARGETS = $(foreach ver,$(JAVA_VERSIONS), compile-java-$(ver))
define compile-java-template
compile-java-$(1):
	@echo "\n\033[0;32m ** Building WellClear-$(1).jar **\033[0m"
	@test ! -f "WellClear-$(1)/DAIDALUS/Java/Makefile" -o -n "$(lite)" || (cd WellClear-$(1)/DAIDALUS/Java && make lib)
	@if [ -e WellClear-$(1)/DAIDALUS/Java/lib/$(if $(call version1,WellClear-$(1)),DAIDALUS.jar,DAIDALUS2.jar) ]; then \
	  cd utils; $(JAVAC) -cp ../WellClear-$(1)/DAIDALUS/Java/lib/$(if $(call version1,WellClear-$(1)),DAIDALUS.jar,DAIDALUS2.jar) $(if $(call version1,WellClear-$(1)),DAABands.java,DAABandsV2.java DAAMonitorsV2.java) && $(JAR) cfe ../WellClear-$(1).jar $(if $(call version1,WellClear-$(1)),DAABands,DAABandsV2) *.class && unzip -qn ../WellClear-$(1)/DAIDALUS/Java/lib/$(if $(call version1,WellClear-$(1)),DAIDALUS.jar,DAIDALUS2.jar) -d temp; \
	  cd temp; $(JAR) uf ../../WellClear-$(1).jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class && cd ../ && rm -rf temp; \
	else echo "*** Directory WellClear-$(1)/DAIDALUS/Java not found"; fi
endef
compile-java-all = $(foreach ver,$(JAVA_VERSIONS),$(eval $(call compile-java-template,$(ver))))

COMPILE_CPP_TARGETS = $(foreach ver,$(CPP_VERSIONS),compile-cpp-$(ver))
define compile-cpp-template
compile-cpp-$(1): 
	@echo "\n\033[0;32m ** Building WellClear-$(1).exe **\033[0m"
	@test ! -f "WellClear-$(1)/DAIDALUS/C++/Makefile" -o -n "$(lite)" || (cd WellClear-$(1)/DAIDALUS/C++ && make lib)
	@if [ -e WellClear-$(1)/DAIDALUS/C++/lib/$(if $(call version1,WellClear-$(1)),DAIDALUS.a,DAIDALUS2.a) ]; then \
	  cd utils; $(CPP)  $(if $(call version1,WellClear-$(1)),DAABands.cpp,DAABandsV2.cpp) -std=c++11 -I../WellClear-$(1)/DAIDALUS/C++/include ../WellClear-$(1)/DAIDALUS/C++/lib/$(if $(call version1,WellClear-$(1)),DAIDALUS.a,DAIDALUS2.a) -o ../WellClear-$(1).exe; \
	else echo "*** Directory WellClear-$(1)/DAIDALUS/C++ not found"; fi	
endef
compile-cpp-all = $(foreach ver,$(CPP_VERSIONS),$(eval $(call compile-cpp-template,$(ver))))

# clean templates
CLEAN_TARGETS = $(foreach ver,$(JAVA_VERSIONS),clean-$(ver))
define clean-template
clean-$(1):
	@echo "\n\033[0;33m ** Removing .class files in WellClear-$(1) **\033[0m"
	-cd WellClear-$(1)/DAIDALUS/Java/src && rm *.class
	-cd WellClear-$(1)/DAIDALUS/Java/src/gov/nasa/larcfm/ACCoRD && rm *.class
	-cd WellClear-$(1)/DAIDALUS/Java/src/gov/nasa/larcfm/IO && rm *.class
	-cd WellClear-$(1)/DAIDALUS/Java/src/gov/nasa/larcfm/Util && rm *.class
endef
clean-all = $(foreach ver,$(JAVA_VERSIONS),$(eval $(call clean-template,$(ver))))

# makefile targets
all: download compile daa2json daa2xyz daa2pvs daa2pvsv2 #los-1.0.1 los-1.0.2 los-2.0.e 

download-wellclear-2.0.e:
	@echo "\n\033[0;32m ** Downloading WellClear 2.0.e from LaRC **\033[0m"
	-@test -d WellClear-2.0.e || (\
	mkdir WellClear-2.0.e &&\
	curl https://shemesh.larc.nasa.gov/fm/DAIDALUS/RELEASE2e-Feb-15-20.tgz > WellClear-2.0.e.tgz &&\
	tar xvzf WellClear-2.0.e.tgz &&\
	mv RELEASE2e WellClear-2.0.e/DAIDALUS &&\
	rm WellClear-2.0.e.tgz)

download-wellclear-2.0.f:
	@echo "\n\033[0;32m ** Downloading WellClear 2.0.f from LaRC **\033[0m"
	-@curl https://shemesh.larc.nasa.gov/fm/DAIDALUS/RELEASE2f-Apr-03-20.tgz > WellClear-2.0.f.tgz &&\
	tar xvzf WellClear-2.0.f.tgz &&\
	(test ! -d WellClear-2.0.f || rm -rf WellClear-2.0.f) &&\
	mkdir WellClear-2.0.f &&\
	mv RELEASE2f WellClear-2.0.f/DAIDALUS &&\
	rm WellClear-2.0.f.tgz

download-wellclear-2.0.g:
	@echo "\n\033[0;32m ** Downloading WellClear 2.0.g from LaRC **\033[0m"
	-@curl https://shemesh.larc.nasa.gov/fm/DAIDALUS/RELEASE2g-May-20-20.tgz > WellClear-2.0.g.tgz &&\
	tar xvzf WellClear-2.0.g.tgz &&\
	(test ! -d WellClear-2.0.g || rm -rf WellClear-2.0.g) &&\
	mkdir WellClear-2.0.g &&\
	mv RELEASE2g WellClear-2.0.g/DAIDALUS &&\
	rm WellClear-2.0.g.tgz


download: $(DOWNLOAD_TARGETS) download-wellclear-2.0.e download-wellclear-2.0.f

compile: $(COMPILE_JAVA_TARGETS) $(COMPILE_CPP_TARGETS) 

clean: clean-utils clean-jar clean-exe $(CLEAN_TARGETS)

clean-utils:
	@echo "\n\033[0;33m ** Removing .class files in utils **\033[0m"
	@-cd utils && rm *.class

clean-jar:
	@echo "\n\033[0;33m ** Removing .jar files **\033[0m"
	@-rm *.jar

clean-exe:
	@echo "\n\033[0;33m ** Removing .exe files **\033[0m"
	@-rm *.exe

remove-downloads:
	@echo "\n\033[0;33m ** Removing downloaded JAVA_versions of WellClear **\033[0m"
	@-rm -r WellClear-*
	@-rm WellClear-*.zip

define los-template
los-$(1):
	@echo "\n\033[0;32m ** Building DAALoSRegion for WellClear-$(1) **\033[0m"
	-@cd utils && $(JAVAC) -cp ../WellClear-$(1)/DAIDALUS/Java/lib/$(if $(call version1,WellClear-$(1)),DAIDALUS.jar,DAIDALUS2.jar) $(if $(call version1,WellClear-$(1)),DAALoSRegion.java DAABandsV2.java DAALoSRegionV2.java DAAMonitorsV2.java) && $(JAR) cfe ../LoSRegion-$(1).jar $(if $(call version1,WellClear-$(1)),DAALoSRegion,DAALoSRegionV2) *.class
	-@cd WellClear-$(1)/DAIDALUS/Java/src && $(JAR) uf ../../../../LoSRegion-$(1).jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class
##	unzip -vl LoSRegion-$(1).jar
endef

los-all = $(foreach ver,$(JAVA_VERSIONS),$(eval $(call los-template,$(ver))))

daa2xyz:
	@echo "\n\033[0;32m ** Building DAA2XYZ for Daidalus 2.x **\033[0m"
	-@cd utils && $(JAVAC) -cp ../WellClear-2.0.e/DAIDALUS/Java/lib/DAIDALUS2.jar DAA2XYZ.java && $(JAR) cfe ../DAA2XYZ-2.0.e.jar DAA2XYZ *.class && cd ../WellClear-2.0.e/DAIDALUS/Java/src && $(JAR) uf ../../../../DAA2XYZ-2.0.e.jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class
## 	&& cd ../../../../ && unzip -vl DAA2XYZ-2.0.e.jar

daa2json:
	@echo "\n\033[0;32m ** Building DAA2Json for Daidalus 2.x **\033[0m"
	@cd utils && $(JAVAC) -cp ../WellClear-2.0.e/DAIDALUS/Java/lib/DAIDALUS2.jar DAA2Json.java && $(JAR) cfe ../DAA2Json-2.x.jar DAA2Json *.class && cd ../WellClear-2.0.e/DAIDALUS/Java/src && $(JAR) uf ../../../../DAA2Json-2.x.jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class
##	&& cd ../../../../ && unzip -vl DAA2Json-2.x.jar

daa2pvs:
	@echo "\n\033[0;32m ** Building DAA2PVS for Daidalus 1.x **\033[0m"
	@cd utils && $(JAVAC) -cp ../WellClear-1.0.2/DAIDALUS/Java/lib/DAIDALUS.jar DAA2PVS.java && $(JAR) cfe ../DAA2PVS-1.x.jar DAA2PVS *.class && cd ../WellClear-1.0.2/DAIDALUS/Java/src && $(JAR) uf ../../../../DAA2PVS-1.x.jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class
##	&& cd ../../../../ && unzip -vl DAA2PVS-1.x.jar
	-@cp utils/DAABands.pvs WellClear-1.0.1/PVS
	-@cp utils/DAABands.pvs WellClear-1.0.2/PVS

daa2pvsv2:
	@echo "\n\033[0;32m ** Building DAA2PVS for Daidalus 2.x **\033[0m"
	@cd utils && $(JAVAC) -cp ../WellClear-2.0.e/DAIDALUS/Java/lib/DAIDALUS2.jar DAA2PVSV2.java && $(JAR) cfe ../DAA2PVS-2.x.jar DAA2PVSV2 *.class && cd ../WellClear-2.0.e/DAIDALUS/Java/src && $(JAR) uf ../../../../DAA2PVS-2.x.jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class
##	&& cd ../../../../ && unzip -vl DAA2PVS-2.x.jar

ver?=2.0.x
compile-jar:
	@echo "\n\033[0;32m ** Building WellClear-$(ver).jar **\033[0m"
	@test ! -f "WellClear-$(ver)/DAIDALUS/Java/Makefile" -o -n "$(lite)" || (cd WellClear-$(ver)/DAIDALUS/Java && make lib)
	@if [ -e "WellClear-$(ver)/DAIDALUS/Java/lib/DAIDALUS2.jar" ]; then \
	  cd utils; $(JAVAC) -cp ../WellClear-$(ver)/DAIDALUS/Java/lib/DAIDALUS2.jar DAABandsV2.java DAAMonitorsV2.java && $(JAR) cfe ../WellClear-$(ver).jar DAABandsV2 *.class && unzip -qn ../WellClear-$(ver)/DAIDALUS/Java/lib/DAIDALUS2.jar -d temp; \
	  cd temp; $(JAR) uf ../../WellClear-$(ver).jar gov/nasa/larcfm/IO/*.class gov/nasa/larcfm/Util/*.class gov/nasa/larcfm/ACCoRD/*.class && cd ../ && rm -rf temp; \
	else echo "*** Directory WellClear-$(ver)/DAIDALUS/Java not found"; fi

##	unzip -vl WellClear-$(ver).jar
##	unzip -c WellClear-$(ver).jar META-INF/MANIFEST.MF

compile-cpp:
	@echo "\n\033[0;32m ** Building WellClear-$(ver).exe **\033[0m"
	@test ! -f "WellClear-$(ver)/DAIDALUS/C++/Makefile" -o -n "$(lite)" || (cd WellClear-$(ver)/DAIDALUS/C++ && make lib)
	@if [ -e "WellClear-$(ver)/DAIDALUS/C++/lib/DAIDALUS2.a" ]; then \
	  cd utils; $(CPP) DAABandsV2.cpp -std=c++11 -I../WellClear-$(ver)/DAIDALUS/C++/include ../WellClear-$(ver)/DAIDALUS/C++/lib/DAIDALUS2.a -o ../WellClear-$(ver).exe; \
	else echo "*** Directory WellClear-$(ver)/DAIDALUS/C++ not found"; fi	

# these final commands expand the templates
$(call download-all)
$(call compile-java-all)
$(call compile-cpp-all)
$(call clean-all)
$(call los-all)
