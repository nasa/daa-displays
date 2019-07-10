all: install build
	cd dist && make wellclear-1.x
	@echo "\033[0;32m ** To start DaNTi, type ./restart.sh in the command prompt and open Google Chrome at http://localhost:8082 **\033[0m"

build:
	@echo "\033[0;32m ** Building daa-displays **\033[0m"
	npm run build
	cp src/daa-test/*.html dist/daa-test/
	cp src/danti dist/
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
	cp -R src/daa-displays/svgs dist/daa-displays/
	cp -R src/daa-displays/ColladaModels dist/daa-displays/
	cp -R src/daa-displays/css dist/daa-displays/
	cp -R src/daa-displays/images dist/daa-displays
	cp -R src/daa-displays/wwd dist/daa-displays/
	cp src/index.html dist/
	cp src/split.html dist/
	cp src/daa-displays/daa-interactive-map.js dist/daa-displays/
	cp src/package.json dist/

install:
	@echo "\033[0;32m ** Installing dependencies **\033[0m"
	npm install

clean:
	rm -rf dist
	rm -rf node_modules
	cd src && rm -rf node_modules
	cd src/daa-server && rm -rf node_modules
	cd src/daa-logic && make cleandaa2pvs
