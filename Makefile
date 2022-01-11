all: npm dist daidalus compile install-dependencies
	@echo "\033[0;32m** To start DAA-Displays, type ./restart.sh in the command prompt and open a browser at http://localhost:8082 **\033[0m"

tsc: ts

ts:
	# generate javascript files
	npm run build
	# copy html files
	rsync src/*.html dist/

npm:
	@npm install
	# generate javascript files
	npm run build

dist:
	@echo "\033[0;32m** Copying dist folder **\033[0m"
	rsync src/daa-test/*.html dist/daa-test/
	rsync src/restart.sh src/kill.sh src/README.md src/Makefile src/*.html src/package.json dist/
	rsync -a src/LICENSES dist/
	rsync -a src/daa-logic dist/
	rsync -a src/daa-config dist/
	rsync -a src/daa-scenarios dist/
	rsync -a src/daa-output dist/
	rsync -a src/images dist/
	rsync src/daa-server/daa-server.json src/daa-server/package.json src/daa-server/start-server.sh dist/daa-server/
	-rsync src/daa-server/package-lock.json dist/daa-server
	rsync -a src/daa-server/tileServer dist/daa-server
	rsync -a src/daa-displays/svgs dist/daa-displays/
	rsync -a src/daa-displays/ColladaModels dist/daa-displays/
	rsync -a src/daa-displays/css dist/daa-displays/
	rsync -a src/daa-displays/images dist/daa-displays/
	rsync -a src/daa-displays/sounds dist/daa-displays/
	rsync -a src/daa-displays/themes dist/daa-displays/
	rsync -a src/daa-displays/wwd dist/daa-displays/
	rsync -a src/contrib dist/
	@echo "\033[0;32m** Done copying dist folder! **\033[0m"

daidalus:
	@echo "\033[0;32m** Making DAIDALUS submodules **\033[0m"
	git submodule update --init --remote
	@cd daidalus-submodules; make
	@echo "\033[0;32m** Done making DAIDALUS submodules! **\033[0m"

compile:
	@echo "\033[0;32m** Making Java and C++ applications **\033[0m"
	cd dist && make clean compile 
	@echo "\033[0;32mDone making Java and C++ applications! \033[0m"

install-dependencies:
	@echo "\033[0;32m** Installing dependencies **\033[0m"
	@cd dist && make install-dependencies 
	@echo "\033[0;32mDone installing dependencies! \033[0m"

resolutions:
	npm install -no-save npm-force-resolutions
	node node_modules/npm-force-resolutions/index.js

clean:
	@echo "\033[0;33m** Cleaning dist and daidalus-submodules folder **\033[0m"
	cd daidalus-submodules; make clean
	test ! -d dist || ( cd dist && make clean )
	@echo "\033[0;33mDone cleaning! \033[0m"

delete-dist:
	@echo "\033[0;33m** Removing dist folder, .class files, .jar files, and node_modules **\033[0m"
	-@rm -rf dist
	-@rm -rf node_modules
	-@cd src && rm -rf node_modules
	-@cd src/daa-server && rm -rf node_modules
	-@cd src/daa-logic && make clean
	@echo "\033[0;33m Done removing dist folder! \033[0m"

audit:
	npm audit
	cd src/daa-server && npm audit

audit-fix:
	npm audit fix
	cd src/daa-server && npm audit fix

.PHONY: dist
