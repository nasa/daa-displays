ifeq ($(strip $(daidalus-releases)),)
releases := $(shell cat releases | sed -e "s:\#.*::g")
else
releases := $(daidalus-releases)
endif

only-java=
only-cpp=

all: compile

releases:
	@echo "DAIDALUS releases:$(releases) [ make -e daidalus-releases=$(releases) -e only-java=$(only-java) -e only-cpp=$(only-cpp) ]"

compile:
	@for f in $(releases); do \
	if [ -d "$$f" ]; then \
	  if [ -d "$$f/Java" -a -f "$$f/Java/Makefile" -a -z "$(only-cpp)" ]; then \
	    echo "\033[0;32m** Building $$f/Java **\033[0m"; cd $$f/Java; make lib; cd ../..; \
	  fi; \
	  if [ -d "$$f/C++" -a -f "$$f/C++/Makefile" -a -z "$(only-java)" ]; then \
	    echo "\033[0;32m** Building $$f/C++ **\033[0m"; cd $$f/C++; make lib; cd ../..; \
	  fi \
	fi done

clean:
	@for f in $(releases); do \
	if [ -d "$$f" ]; then \
	  if [ -d "$$f/Java" -a -f "$$f/Java/Makefile" ]; then \
	    echo "\033[0;33m** Cleaning $$f/Java **\033[0m"; cd $$f/Java; make clean; cd ../..; \
	  fi; \
	  if [ -d "$$f/C++" -a -f "$$f/C++/Makefile" ]; then \
	    echo "\033[0;33m** Cleaning $$f/C++ **\033[0m"; cd $$f/C++; make clean; cd ../..; \
	  fi \
	fi done

submodules:
	git submodule update --init --remote


.PHONY: all compile clean submodules releases
