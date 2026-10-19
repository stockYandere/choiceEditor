set -eu
TASK="$(cd "$(dirname "$0")" && pwd)"
SDK=${ANDROID_TOOLS:?Set ANDROID_TOOLS to the build tools directory}
ANDROID=${ANDROID_JAR:?Set ANDROID_JAR to the platform android.jar}
mkdir -p "$TASK/classes" "$TASK/dex" "$TASK/player-classes" "$TASK/player-dex"
python3 - "$TASK" <<'CLEAN'
from pathlib import Path
import sys
for folder in ['classes','player-classes','dex','player-dex']:
 for f in (Path(sys.argv[1])/folder).rglob('*'):
  if f.is_file(): f.unlink()
CLEAN
java -jar "$TASK/ecj.jar" -nowarn -8 -bootclasspath "$ANDROID:$SDK/core-lambda-stubs.jar" -d "$TASK/player-classes" "$TASK/src/com/example/splitstory/PlayerActivity.java" "$TASK/src/com/example/splitstory/PartitionStore.java"
"$SDK/d8" --lib "$ANDROID" --min-api 26 --output "$TASK/player-dex" "$TASK"/player-classes/com/example/splitstory/*.class
"$SDK/aapt" package -f -M "$TASK/player-shell/AndroidManifest.xml" -S "$TASK/player-res" -I "$ANDROID" -F "$TASK/assets/player-shell.apk"
TASK_DIR="$TASK" python3 - <<'SHELL'
import zipfile,os
from pathlib import Path
root=Path(os.environ['TASK_DIR'])
with zipfile.ZipFile(root/'assets/player-shell.apk','a',zipfile.ZIP_DEFLATED) as z:z.write(root/'player-dex/classes.dex','classes.dex')
# Regenerate the player entry whenever the shared UI changes.
html=(root/'assets/index.html').read_text().replace('<body>','<body class="standalone">').replace('<title>사건 게임 에디터</title>','<title>내 게임</title>')
for name in ['sample.js','advanced-sample.js','variation-sample.js','examples.js','media-pack.js','stage-editor.js','sound-library.js','story-map.js']:html=html.replace('<script src="'+name+'"></script>','')
html=html.replace('<script src="app.js">','<script src="player-bootstrap.js"></script><script src="app.js">')
(root/'assets/player-index.html').write_text(html)
SHELL
java -jar "$TASK/ecj.jar" -nowarn -8 -bootclasspath "$ANDROID:$SDK/core-lambda-stubs.jar" -classpath "$TASK/vendor/apksig.jar" -d "$TASK/classes" "$TASK/src/com/example/splitstory/MainActivity.java" "$TASK/src/com/example/splitstory/AppUpdater.java" "$TASK/src/com/example/splitstory/UpdateReceiver.java" "$TASK/src/com/example/splitstory/GameApkExporter.java" "$TASK/src/com/example/splitstory/ApkExportEngine.java" "$TASK/src/com/example/splitstory/CreatorKeys.java" "$TASK/src/com/example/splitstory/CreatorSigning.java" "$TASK/src/com/example/splitstory/PartitionStore.java"
"$SDK/d8" --lib "$ANDROID" --min-api 26 --output "$TASK/dex" "$TASK"/classes/com/example/splitstory/*.class "$TASK/vendor/apksig.jar"
"$SDK/aapt" package -f -M "$TASK/AndroidManifest.xml" -S "$TASK/res" -A "$TASK/assets" -I "$ANDROID" -F "$TASK/unsigned.apk"
TASK_DIR="$TASK" python3 - <<'PY'
import zipfile, os
from pathlib import Path
p=Path(os.environ['TASK_DIR'])
with zipfile.ZipFile(p/'unsigned.apk','a',zipfile.ZIP_DEFLATED) as z:
 z.write(p/'dex/classes.dex','classes.dex')
PY
"$SDK/zipalign" -f 4 "$TASK/unsigned.apk" "$TASK/aligned.apk"
# A new key would make builds that installed editors refuse as updates; unlock the saved one instead.
if [ ! -f "$TASK/signing.jks" ] && [ -f "$TASK/signing.jks.enc" ]; then echo "signing.jks is missing: run SIGNING_PASSPHRASE=... sh signing-key.sh open"; exit 1; fi
if [ ! -f "$TASK/signing.jks" ]; then
keytool -genkeypair -keystore "$TASK/signing.jks" -storepass event-vn-test -keypass event-vn-test -alias eventvn -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Event Editor Test'
fi
"$SDK/apksigner" sign --ks "$TASK/signing.jks" --ks-pass pass:event-vn-test --key-pass pass:event-vn-test --out "$TASK/v0.1.48-Event-Game-Editor.apk" "$TASK/aligned.apk"
"$SDK/apksigner" verify --verbose "$TASK/v0.1.48-Event-Game-Editor.apk"
"$SDK/aapt" dump badging "$TASK/v0.1.48-Event-Game-Editor.apk"
