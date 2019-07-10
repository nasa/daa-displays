# Simple Makefile to build daa-displays

all: wellclear-1.x
	@echo "\033[0;32m ** Done! **\033[0m"
	@echo "\033[0;32m ** To start DaNTi, type ./danti in the command prompt and open Google Chrome at http://localhost:8082 **\033[0m"

wellclear-1.x:
	@cd daa-logic && make
	@echo "\033[0;32m ** Completing installation... **\033[0m"
	@npm install
	@cd daa-server && npm install

wellclear:
	@cd daa-logic && make compile-wellclear-1.0.1 && make compile-wellclear-1.0.2 && make compile-wellclear-2.0.e
	@echo "\033[0;32m ** Completing installation... **\033[0m"
	@npm install
	@cd daa-server && npm install
	@echo "\033[0;32m ** Done! **\033[0m"

clean: cleandaa removewellclear

cleandaa:
	cd daa-logic && make clean
	rm -rf node_modules
	rm -rf daa-server/node_modules

removewellclear:
	rm -rf daa-logic/WellClear-1.0.1
	rm -rf daa-logic/WellClear-1.0.2
	rm -f daa-logic/WellClear-1.0.1.zip
	rm -f daa-logic/WellClear-1.0.2.zip


