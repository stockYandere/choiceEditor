set -eu
# Keeps the editor signing key in the repository only in encrypted form (signing.jks.enc).
#   SIGNING_PASSPHRASE=... sh signing-key.sh seal   # signing.jks -> signing.jks.enc
#   SIGNING_PASSPHRASE=... sh signing-key.sh open   # signing.jks.enc -> signing.jks (never committed)
# Installed editors accept self-updates only when they are signed with this same key.
TASK="$(cd "$(dirname "$0")" && pwd)"
PASS=${SIGNING_PASSPHRASE:?Set SIGNING_PASSPHRASE}
case "${1:-}" in
seal) openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -in "$TASK/signing.jks" -out "$TASK/signing.jks.enc" -pass env:SIGNING_PASSPHRASE
      openssl dgst -sha256 "$TASK/signing.jks" | awk '{print $NF}' > "$TASK/signing.jks.sha256";;
open) openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in "$TASK/signing.jks.enc" -out "$TASK/signing.jks.tmp" -pass env:SIGNING_PASSPHRASE 2>/dev/null || { rm -f "$TASK/signing.jks.tmp"; echo "Wrong passphrase or damaged key file"; exit 1; }
      [ "$(openssl dgst -sha256 "$TASK/signing.jks.tmp" | awk '{print $NF}')" = "$(cat "$TASK/signing.jks.sha256")" ] || { rm -f "$TASK/signing.jks.tmp"; echo "Wrong passphrase or damaged key file"; exit 1; }
      mv "$TASK/signing.jks.tmp" "$TASK/signing.jks";;
*) echo "usage: sh signing-key.sh seal|open"; exit 2;;
esac
