#!/bin/sh
# Runs the open tasks of work.json, one at a time, every run fresh.
# A task closes when its test passes (the loop checks, not the agent) or at its
# kill line (the gate stops it, the loop closes it). A closed task stays closed,
# and its slot stays empty: only you open a task, in work.json.
# Usage: ANTHROPIC_API_KEY=... ./night.sh [max runs]      then: ./apply.sh <hash>
max=${1:-8}
for run in $(seq 1 "$max"); do
  next=$(node work.mjs next) || { echo "$next"; exit 1; }
  [ -n "$next" ] || { echo "== no open task left: read notes/ideas.md"; exit 0; }
  set -- $next
  echo "== run $run of $max: $1"
  TASK=$1 KILL_AT=$2 ./box.sh --continue "Make $1 pass." || echo "run $run ended early"
  spent=$(node work.mjs spent "$1")
  if ./box.sh --check "$1" >/dev/null 2>&1; then node work.mjs close "$1" done
  elif [ "$spent" -ge "$2" ]; then node work.mjs close "$1" killed "$spent of $2 tokens"
  else echo "== not done: $1 fails, $spent of $2 tokens spent"; fi
  if [ -f control/STOP ]; then echo "== stopped by control/STOP"; exit 1; fi
done
echo "== stopped after $max runs"; exit 1
