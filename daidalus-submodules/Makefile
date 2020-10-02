all: submodules compile

compile:
	@for f in *; do \
	if [ -d "$$ff" -a -f "$$f/Java/Makefile" ]; then \
		echo "\033[0;32m** Building $$f/Java **\033[0m"; cd $$f/Java; make lib; cd ../C++; make lib; cd ..; \
	fi; \
	if [ -d "$$ff" -a -f "C++/Makefile" ]; then \
		echo "\033[0;32m** Building $$f/C++ **\033[0m"; cd C++; make lib; cd ../..; \
	fi done

clean:
	@for f in *; do \
	if [ -d "$$ff" -a -f "$$f/Java/Makefile" ]; then \
		echo "\033[0;32m** Cleaning $$f/Java **\033[0m"; cd $$f/Java; make clean; cd ..; \
	fi; \
	if [ -d "$$ff" -a -f "C++/Makefile" ]; then \
		echo "\033[0;32m** Cleaning $$f/C++ **\033[0m"; cd ../C++; make lib; cd ../..; \
	fi done

submodules:
	git submodule update --init --remote

