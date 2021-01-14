all:
	@echo "make clean"

clean:
	@echo "\033[0;33m** Removing JSON files in daa-output"
	@for f in * ; do \
		if [ -d "$$f" ]; then \
			rm -rf "$$f"; \
		fi done
