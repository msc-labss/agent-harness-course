#!/bin/sh
# Runs the agent again and again: every run starts fresh and reads notes/progress.md.
# The loop decides when the work is done, by running the tests itself. Not the agent.
# It ends when the tests pass, when max runs are used up, or when control/STOP exists.
# Run it again and it picks up where it stopped: the copy and the notes are still there.
# Usage: ANTHROPIC_API_KEY=... ./night.sh [max runs]      then: ./apply.sh <hash>
max=${1:-5}
task="do the next task in notes/progress.md"
for run in $(seq 1 "$max"); do
  echo "== run $run of $max"
  ./box.sh --continue "$task" || echo "run $run ended early"
  if ./box.sh --check >/dev/null 2>&1; then
    echo "== verified: all tests pass after $run run(s)"
    exit 0
  fi
  echo "== not done: tests still fail"
  if [ -f control/STOP ]; then echo "== stopped by control/STOP"; exit 1; fi
done
echo "== not done after $max runs: read notes/progress.md"
exit 1
