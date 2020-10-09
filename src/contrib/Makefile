JAVAC = javac
JAR   = jar
DAIDALUS_DIR=../../../daidalus-submodules

current=v2.0.w

all: compile 

VIRTUAL_PILOT = BatchSimDaidalus_2_3_1 SimDaidalus_2_3_1_wind
define virtual-pilot-template
virtual-pilot-$(1):
	@echo "\033[0;32m** Building $(1)-2.x **\033[0m"
	-cd virtual-pilot && $(JAVAC) -cp  $(DAIDALUS_DIR)/$(current)/Java/lib/DAIDALUS2.jar $(1).java && cp -f $(DAIDALUS_DIR)/$(current)/Java/lib/DAIDALUS2.jar ../$(1)-2.x.jar && echo "Main-Class: $(1)" > mf && $(JAR) umf mf ../$(1)-2.x.jar $(1).class && rm -f mf
endef
virtual-pilot-all = $(foreach code,$(VIRTUAL_PILOT),$(eval $(call virtual-pilot-template,$(code))))
VIRTUAL_PILOT_TARGETS = $(foreach code,$(VIRTUAL_PILOT),virtual-pilot-$(code))

compile: $(VIRTUAL_PILOT_TARGETS)

# these final commands expand the templates
$(call virtual-pilot-all)

clean:
	@echo "\033[0;33m** Removing .class and *.jar files **\033[0m"
	-rm -f *.jar
	-cd virtual-pilot; rm -f *.class
