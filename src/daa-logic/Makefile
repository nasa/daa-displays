versions := $(shell cd ../..;ls -1d daidalus-submodules/v* | sed -e "s:daidalus-submodules/v::g")

JAVAC = javac
JAR   = jar
CPP   = c++

current=v2.0.w

all: compile

which-daidalus:
	@echo "Available DAIDALUS submodules: $(versions)"

version1 = $(shell echo "v$(1)" | grep "v1.")

DAIDALUS_DIR=../../../daidalus-submodules

# compilation templates

COMPILE_JAVA_TARGETS = $(foreach ver,$(versions),compile-java-$(ver))
define compile-java-template
compile-java-$(1):
	@echo "\033[0;32m** Building DAIDALUSv$(1).jar **\033[0m"
	cd utils; $(JAVAC) -cp $(DAIDALUS_DIR)/v$(1)/Java/lib/$(if $(call version1,$(1)),DAIDALUS.jar,DAIDALUS2.jar) $(if $(call version1,$(1)),DAABands.java,DAABandsV2.java DAAMonitorsV2.java) && cp -f $(DAIDALUS_DIR)/v$(1)/Java/lib/$(if $(call version1,$(1)),DAIDALUS.jar,DAIDALUS2.jar) ../DAIDALUSv$(1).jar && echo "Main-Class: $(if $(call version1,$(1)),DAABands,DAABandsV2)" > mf && $(JAR) umf mf ../DAIDALUSv$(1).jar $(if $(call version1,$(1)),DAABands.class,DAABandsV2.class DAAMonitorsV2.class) && rm -f mf
endef
compile-java-all = $(foreach ver,$(versions),$(eval $(call compile-java-template,$(ver))))

COMPILE_CPP_TARGETS = $(foreach ver,$(versions),compile-cpp-$(ver))
define compile-cpp-template
compile-cpp-$(1): 
	@echo "\033[0;32m** Building DAIDALUSv$(1).exe **\033[0m"
	cd utils; $(CPP) $(if $(call version1,$(1)),DAABands.cpp,DAABandsV2.cpp) -std=c++11 -I$(DAIDALUS_DIR)/v$(1)/C++/include $(DAIDALUS_DIR)/v$(1)/C++/lib/$(if $(call version1,$(1)),DAIDALUS.a,DAIDALUS2.a) -o ../DAIDALUSv$(1).exe
endef
compile-cpp-all = $(foreach ver,$(versions),$(eval $(call compile-cpp-template,$(ver))))

CODEV1 = DAA2PVS
define codev1-template
codev1-$(1):
	@echo "\033[0;32m** Building $(1)-1.x **\033[0m"
	-cd utils && $(JAVAC) -cp  $(DAIDALUS_DIR)/v1.0.2/Java/lib/DAIDALUS.jar $(1).java && cp -f $(DAIDALUS_DIR)/v1.0.2/Java/lib/DAIDALUS.jar ../$(1)-1.x.jar && echo "Main-Class: $(1)" > mf && $(JAR) umf mf ../$(1)-1.x.jar $(1).class && rm -f mf
endef
codev1-all = $(foreach code,$(CODEV1),$(eval $(call codev1-template,$(code))))
COMPILE_CODEV1_TARGETS = $(foreach code,$(CODEV1),codev1-$(code))

CODEV2 = DAA2XYZ DAA2Json DAA2PVSV2
define codev2-template
codev2-$(1):
	@echo "\033[0;32m** Building $(1)-2.x **\033[0m"
	-cd utils && $(JAVAC) -cp  $(DAIDALUS_DIR)/$(current)/Java/lib/DAIDALUS2.jar $(1).java && cp -f $(DAIDALUS_DIR)/$(current)/Java/lib/DAIDALUS2.jar ../$(1)-2.x.jar && echo "Main-Class: $(1)" > mf && $(JAR) umf mf ../$(1)-2.x.jar $(1).class && rm -f mf
endef
codev2-all = $(foreach code,$(CODEV2),$(eval $(call codev2-template,$(code))))
COMPILE_CODEV2_TARGETS = $(foreach code,$(CODEV2),codev2-$(code))

compile: $(COMPILE_JAVA_TARGETS) $(COMPILE_CPP_TARGETS) $(COMPILE_CODEV1_TARGETS) $(COMPILE_CODEV2_TARGETS)

clean:
	@echo "\033[0;33m** Removing binary files **\033[0m"
	-@rm *.jar *.exe utils/*.class


# these final commands expand the templates
$(call compile-java-all)
$(call compile-cpp-all)
$(call codev1-all)
$(call codev2-all)
