# Simple Makefile to build daa-displays

all: compile install-dependencies
	@echo "\033[0;32m ** To start the DaNTi app, type ./restart.sh in the command prompt and open Google Chrome at http://localhost:8082 **\033[0m"

install-dependencies:
	@npm install
	@cd daa-server && npm install

compile:
	cd daa-logic && make all && make compile

clean:
	cd daa-logic && make clean