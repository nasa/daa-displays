lite = # Lite installation and quiet

all: compile install-dependencies
	@echo "\033[0;32m ** To start DAA-Displays, type ./restart.sh in the command prompt and open Google Chrome at http://localhost:8082 **\033[0m"

install-dependencies:
	@npm install --loglevel=error
	@cd daa-server && npm install

compile:
	cd daa-logic && make all -e lite=$(lite) 
	cd contrib/virtual-pilot && make -e lite=$(lite) 

clean:
	cd daa-logic && make clean
