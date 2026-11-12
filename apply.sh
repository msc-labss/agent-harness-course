#!/bin/sh
# Applies the agent's proposal, but only the one you read.
# The hash you pass is your approval: if the proposal changed since, nothing is applied.
# Usage: ./apply.sh <hash printed by box.sh>
set -e
patch=proposal/change.patch
[ -f "$patch" ] || { echo "REFUSED: there is no proposal"; exit 1; }
now=$(sha256sum "$patch" | cut -c1-12)
if [ "$1" != "$now" ]; then
  echo "REFUSED: you approved ${1:-nothing}, the proposal is now $now"
  exit 1
fi
if ! patch -p1 --batch --dry-run < "$patch" >/dev/null; then
  echo "REFUSED: the project changed since this proposal was made"
  exit 1
fi
patch -p1 --batch < "$patch"
mkdir -p control
echo "$(date -u +%FT%TZ) applied $now" >> control/approvals.log
rm -rf proposal
echo "applied $now"
