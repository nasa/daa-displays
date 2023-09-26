if [ -z "$1" ]; then
    echo "Release branch needs to be provided, e.g., v2.0.x"
    exit
fi
git submodule add -b $1 https://github.com/nasa/daidalus.git $1
git submodule update --init
echo "Update releases, if needed, and then run: cd ..;make"
