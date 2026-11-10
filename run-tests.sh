#!/bin/sh
# Runs every test-*.cjs. Browser tests need Playwright's Chromium (CHROMIUM_PATH, or Playwright's own download).
#   sh run-tests.sh            all tests, JOBS at a time (default 3)
#   sh run-tests.sh timer map  only tests whose file name contains one of the words
# The four tests that read build output (export-qa/player, export-qa/game.json) are skipped until it exists:
# run build.sh, then sh export-qa/prepare-fixtures.sh.
# A test that fails beside others is run once more alone, so a failure reported at the end is a real one.
cd "$(dirname "$0")" || exit 2
JOBS=${JOBS:-3}; LOGS=${TEST_LOGS:-${TMPDIR:-/tmp}/event-editor-tests}; rm -rf "$LOGS"; mkdir -p "$LOGS"
[ -n "${CHROMIUM_PATH:-}" ] || { [ -x /opt/pw-browsers/chromium ] && export CHROMIUM_PATH=/opt/pw-browsers/chromium; }
BUILT="test-apk-export-browser.cjs test-export-media-browser.cjs test-player-v22.cjs test-saves-browser.cjs"
list=""; skipped=""
for t in test-*.cjs; do
  if [ $# -gt 0 ]; then hit=""; for w in "$@"; do case "$t" in *"$w"*) hit=1;; esac; done; [ -n "$hit" ] || continue; fi
  case " $BUILT " in *" $t "*) if [ ! -f export-qa/player/index.html ] || [ ! -f export-qa/game.json ]; then skipped="$skipped $t"; continue; fi;; esac
  list="$list $t"
done
export LOGS
printf '%s\n' $list | xargs -P "$JOBS" -I{} sh -c 'if timeout "${TEST_TIMEOUT:-420}" node "{}" >"$LOGS/{}.log" 2>&1; then echo "ok   {}"; else echo "FAIL {}"; fi' >"$LOGS/summary.txt"
failed=$(grep '^FAIL' "$LOGS/summary.txt" | cut -c6-)
still=""
for t in $failed; do if timeout "${TEST_TIMEOUT:-420}" node "$t" >"$LOGS/$t.log" 2>&1; then echo "passed alone (failed beside others): $t"; else still="$still $t"; fi; done
total=$(printf '%s\n' $list | grep -c .)
[ -z "$skipped" ] || echo "skipped (run build.sh, then sh export-qa/prepare-fixtures.sh):$skipped"
if [ -n "$still" ]; then for t in $still; do echo "FAIL $t"; tail -5 "$LOGS/$t.log"; done; echo "$total run, $(printf '%s\n' $still | grep -c .) failed · logs in $LOGS"; exit 1; fi
echo "$total run, all passed"
