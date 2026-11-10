#!/bin/sh
# Builds what the four build-dependent tests read (export-qa/game.json, export-qa/player).
# Run after build.sh, with ANDROID_TOOLS and ANDROID_JAR set as for build.sh.
set -eu
cd "$(dirname "$0")/.."
: "${ANDROID_TOOLS:?Set ANDROID_TOOLS to the build tools directory}"
node export-qa/make-example.cjs
node test-export-media-browser.cjs   # also compiles the desktop export host into export-qa/media-work/classes
W=export-qa/qa-work; rm -rf "$W"; mkdir -p "$W"
java -cp export-qa/media-work/classes:classes:vendor/apksig.jar com.example.splitstory.NativeExportHost export-qa/game.json "$W/game.apk" rain_game_example '비가 그치기 전' 1
"$ANDROID_TOOLS/apksigner" verify "$W/game.apk"
unzip -q -o "$W/game.apk" 'assets/*' -d "$W"; rm -rf export-qa/player; mv "$W/assets" export-qa/player; rm -rf "$W"
echo "fixtures ready: export-qa/game.json, export-qa/player"
