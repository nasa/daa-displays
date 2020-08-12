all: compile install-dependencies
	@echo "\033[0;32m** To start DAA-Displays, type ./restart.sh in the command prompt and open a browser at http://localhost:8082 **\033[0m"

install-dependencies:
	@npm install --loglevel=error
	@cd daa-server && npm install

compile:
	cd daa-logic && make 
	cd contrib && make 

clean:
	cd daa-logic && make clean
	cd contrib && make clean
