all:
	@for f in *; do \
	if [ -d "$$f" ]; then \
		echo "\033[0;32m** Building $$f **\033[0m"; cd $$f/Java; make lib; cd ../C++; make lib; cd ../..; \
	fi done

clean:
	@for f in *; do \
	if [ -d "$$f" ]; then \
		echo "\033[0;32m** Building $$f **\033[0m"; cd $$f/Java; make clean; cd ../C++; make clean; cd ../..; \
	fi done
