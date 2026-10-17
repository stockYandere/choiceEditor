set -eu
# Publish the built editor APK as the self-update feed read by AppUpdater (release/update.json + release/editor.apk).
# Refuses an APK signed with any key other than the pinned one, since installed editors only accept their own key.
TASK="$(cd "$(dirname "$0")" && pwd)"
SDK=${ANDROID_TOOLS:?Set ANDROID_TOOLS to the build tools directory}
NAME=$(sed -n 's/.*android:versionName="\([^"]*\)".*/\1/p' "$TASK/AndroidManifest.xml")
CODE=$(sed -n 's/.*android:versionCode="\([0-9]*\)".*/\1/p' "$TASK/AndroidManifest.xml")
APK="$TASK/v$NAME-Event-Game-Editor.apk"
[ -f "$APK" ] || { echo "Build v$NAME first (build.sh)"; exit 1; }
CERT=$("$SDK/apksigner" verify --print-certs "$APK" 2>/dev/null | sed -n 's/.*certificate SHA-256 digest: //p' | head -1)
[ "$CERT" = "$(cat "$TASK/release/signing-cert.sha256")" ] || { echo "APK is not signed with the pinned editor key; installed editors would reject it."; exit 1; }
cp "$APK" "$TASK/release/editor.apk"
NOTES=$(head -1 "$TASK/RELEASE-v$NAME.md" 2>/dev/null | sed 's/^# *//')
TASK_DIR="$TASK" CODE="$CODE" NAME="$NAME" NOTES="$NOTES" python3 - <<'PY'
import hashlib,json,os
from pathlib import Path
root=Path(os.environ['TASK_DIR']);apk=root/'release/editor.apk';data=apk.read_bytes()
feed={'versionCode':int(os.environ['CODE']),'versionName':os.environ['NAME'],'apk':'editor.apk','size':len(data),'sha256':hashlib.sha256(data).hexdigest(),'notes':os.environ['NOTES']}
(root/'release/update.json').write_text(json.dumps(feed,ensure_ascii=False,indent=1)+'\n')
print('update feed', feed['versionName'], feed['versionCode'], feed['size'])
PY
