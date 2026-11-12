#!/bin/sh
# Runs the agent in a box with no secret, no API key and no internet.
# One gate leads out, to the model API only, and it keeps a budget (budget.json).
# The agent works on a copy. Its change comes out as a proposal: nothing is applied.
# Usage: ANTHROPIC_API_KEY=... ./box.sh "make the tests pass"
#        ./apply.sh <hash>        (apply the proposal you reviewed)
#        ./box.sh --test          (npm test in the same box, no agent)
#        ./box.sh --continue "…"  (keep the copy from the run before; night.sh uses it)
#        ./box.sh --check         (npm test on the agent's copy, no agent)
# Stop a run from another terminal: touch control/STOP
set -e
lock="--rm --cap-drop ALL --security-opt no-new-privileges --read-only --tmpfs /tmp"
lock="$lock --user $(id -u):$(id -g) -e HOME=/tmp"

if [ "$1" = "--test" ]; then
  work="$PWD"; mode=":ro"; set -- npm test
elif [ "$1" = "--check" ]; then
  work="$PWD/proposal/b"; mode=":ro"; set -- npm test
else
  # Two copies: a = the project as it is now, b = where the agent works.
  if [ "$1" = "--continue" ]; then shift; else rm -rf proposal; fi
  if [ ! -d proposal/b ]; then
    mkdir -p proposal/a proposal/b
    cp -r src test proposal/a/; cp -r src test proposal/b/
  fi
  work="$PWD/proposal/b"; mode=""; set -- node agent.mjs "$@"
fi

docker network create --internal agent-box >/dev/null
trap 'docker rm -f gate >/dev/null 2>&1; docker network rm agent-box >/dev/null' EXIT

# The gate holds the key, the budget and the ledger. None of them is in the agent's box.
mkdir -p control
docker run -d $lock --name gate -e ANTHROPIC_API_KEY \
  -v "$PWD/gate.mjs":/gate.mjs:ro -v "$PWD/budget.json":/budget.json:ro \
  -v "$PWD/control":/control node:22-slim node /gate.mjs >/dev/null
docker network connect agent-box gate

# The agent: no key, no internet, and only the files it needs.
status=0
docker run $lock --network agent-box -w /work \
  -v "$PWD/agent.mjs":/work/agent.mjs:ro \
  -v "$PWD/policy.json":/work/policy.json:ro \
  -v "$PWD/package.json":/work/package.json:ro \
  -v "$work/src":/work/src$mode -v "$work/test":/work/test$mode \
  -v "$PWD/notes":/work/notes \
  node:22-slim "$@" || status=$?

# Plain code turns the agent's work into a proposal. The real src and test are untouched.
if [ -z "$mode" ]; then
  (cd proposal && diff -ruN a b > change.patch) || true
  hash=$(sha256sum proposal/change.patch | cut -c1-12)
  files=$(grep -c '^+++ ' proposal/change.patch || true)
  echo "proposal: $files file(s) in proposal/change.patch, hash $hash"
  echo "read it, then apply it with: ./apply.sh $hash"
fi
exit $status
