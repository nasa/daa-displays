daidalus-releases=
only-danti=
only-java=$(only-danti)
only-cpp=

all: compile install-dependencies
	@echo "\033[0;32m** To start DAA-Displays, type ./restart.sh in the command prompt and open a browser at http://localhost:8082 **\033[0m"

install-dependencies:
	@npm install --loglevel=error
	@cd daa-server && npm install

compile:
	cd daa-logic && make -e daidalus-releases=$(daidalus-releases) -e only-java=$(only-java) -e only-cpp=$(only-cpp) -e only-danti=$(only-danti)
	@if [ -z "$(only-danti)" -a -z "$(only-cpp)" ]; then \
	  cd contrib && make ; \
	fi

clean:
	cd daa-logic && make clean
	cd daa-scenarios && make clean
	cd daa-output && make clean
	cd contrib && make clean
