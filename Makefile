all: compile install-dependencies
	@echo "\033[0;32m ** To start the DaNTi app, type ./restart.sh in the command prompt and open Google Chrome at http://localhost:8082 **\033[0m"

compile:
	@npm install
	@echo "\033[0;32m ** Building dist folder for daa-displays **\033[0m"
	# generate javascript files
	npm run build
	# copy remaining files
	cp src/daa-test/*.html dist/daa-test/
	cp src/restart.sh dist/
	cp src/README.md dist/
	cp -R src/LICENSES dist/
	cp src/Makefile dist/
	cp -R src/daa-logic dist/
	cp -R src/daa-config dist/
	cp -R src/daa-scenarios dist/
	cp -R src/daa-output dist/
	cp src/daa-server/daa-server.json dist/daa-server/
	cp src/daa-server/package.json dist/daa-server
	cp src/daa-server/start-server.sh dist/daa-server
	cp -R src/daa-server/tileServer dist/daa-server
	cp -R src/daa-displays/svgs dist/daa-displays/
	cp -R src/daa-displays/ColladaModels dist/daa-displays/
	cp -R src/daa-displays/css dist/daa-displays/
	cp -R src/daa-displays/images dist/daa-displays
	cp -R src/daa-displays/wwd dist/daa-displays/
	# cp src/daa-displays/daa-interactive-map.js dist/daa-displays/
	cp src/index.html dist/
	cp src/split.html dist/
	cp src/gods.html dist/
	cp src/package.json dist/
	# compile java files
	cd dist && make compile
	@echo "\033[0;32m Done! \033[0m"

install-dependencies:
	@echo "\033[0;32m ** Installing dependencies **\033[0m"
	@cd dist && make install-dependencies
	@echo "\033[0;32m Done! \033[0m"

clean:
	@echo "\033[0;33m ** Removing dist folder, .class files, .jar files, and node_modules **\033[0m"
	-@rm -r dist
	-@rm -r node_modules
	-@cd src && rm -r node_modules
	-@cd src/daa-server && rm -r node_modules
	-@cd src/daa-logic && make clean
	@echo "\033[0;33m Done! \033[0m"
