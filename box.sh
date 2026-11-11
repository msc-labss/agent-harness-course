#!/bin/sh
# Runs the agent in a box with no secret, no API key and no internet.
# One gate leads out, to the model API only.
# Usage: ANTHROPIC_API_KEY=... ./box.sh "make the tests pass"
#        ./box.sh --test          (npm test in the same box, no agent)
set -e
if [ "$1" = "--test" ]; then set -- npm test; else set -- node agent.mjs "$@"; fi
lock="--rm --cap-drop ALL --security-opt no-new-privileges --read-only --tmpfs /tmp"
lock="$lock --user $(id -u):$(id -g) -e HOME=/tmp"

docker network create --internal agent-box >/dev/null
trap 'docker rm -f gate >/dev/null 2>&1; docker network rm agent-box >/dev/null' EXIT

# The gate holds the key and is the only container with a way out.
docker run -d $lock --name gate -e ANTHROPIC_API_KEY \
  -v "$PWD/gate.mjs":/gate.mjs:ro node:22-slim node /gate.mjs >/dev/null
docker network connect agent-box gate

# The agent: no key, no internet, and only the files it needs.
docker run $lock --network agent-box -w /work \
  -v "$PWD/agent.mjs":/work/agent.mjs:ro \
  -v "$PWD/policy.json":/work/policy.json:ro \
  -v "$PWD/package.json":/work/package.json:ro \
  -v "$PWD/src":/work/src -v "$PWD/test":/work/test \
  node:22-slim "$@"
