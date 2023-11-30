ifeq ($(strip $(daidalus-releases)),)
releases := $(shell cat releases | sed -e "s:\#.*::g")
else
releases := $(daidalus-releases)
endif

all: compile

releases:
	@echo "DAA-Displays includes the following DAIDALUS releases:$(releases). To compile a particular release type: make -e daidalus-releases=vx.y.z"

compile:
	@for f in $(releases); do \
	if [ -d "$$f" ]; then \
	  if [ -d "$$f/Java" -a -f "$$f/Java/Makefile" ]; then \
	    echo "\033[0;32m** Building $$f/Java **\033[0m"; cd $$f/Java; make lib; cd ../C++; make lib; cd ..; \
	  fi; \
	  if [ -d "C++" -a -f "C++/Makefile" ]; then \
	    echo "\033[0;32m** Building $$f/C++ **\033[0m"; cd C++; make lib; cd ../..; \
	fi fi done

clean:
	@for f in $(releases); do \
	if [ -d "$$f" ]; then \
	  if [ -d "$$f/Java" -a -f "$$f/Java/Makefile" ]; then \
	    echo "\033[0;33m** Cleaning $$f/Java **\033[0m"; cd $$f/Java; make clean; cd ..; \
	  fi; \
	  if [ -d "C++" -a -f "C++/Makefile" ]; then \
	    echo "\033[0;33m** Cleaning $$f/C++ **\033[0m"; cd C++; make clean; cd ../..; \
	fi fi done

submodules:
	git submodule update --init --remote


.PHONY: all compile clean submodules releases
