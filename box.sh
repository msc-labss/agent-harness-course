#!/bin/sh
# Runs the agent inside a container that can see only this folder.
# Usage: ANTHROPIC_API_KEY=... ./box.sh "make the tests pass"
exec docker run --rm --cap-drop ALL --security-opt no-new-privileges \
  --user "$(id -u):$(id -g)" -e HOME=/tmp -e ANTHROPIC_API_KEY \
  -v "$PWD":/work -w /work node:22-slim node agent.mjs "$@"
