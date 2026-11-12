# Agent harness course: the companion repository

The code of the free agent harness course on the
[MSC Labs YouTube channel](https://www.youtube.com/@msclabs): seven short episodes on running
coding agents with nobody watching, safely.

An agent is a model plus a harness. The harness is everything around the model: it gives the
model tools, runs them, and decides what the model sees next. This repository starts with the
smallest harness that works and adds, episode by episode, what it needs before you can leave
it alone.

## What is here

- `agent.mjs`: a whole coding agent in one file: a loop and one HTTPS request to the Claude
  API. No SDK, no dependencies. At `ep1` it is 79 lines with one tool, a free `shell`. From
  `ep2` it has four narrow tools (`list_files`, `read_file`, `write_file`, `run_tests`) and
  checks every path against `policy.json` before it touches a file.
- `policy.json` (from `ep2`): the files the agent may not read and may not write.
- `src/slugify.js` and `test/`: a tiny project with a bug. `npm test` shows 1 test passing
  and 2 failing. It is the agent's job to fix it. From `ep6` there are two more test files,
  for code that does not exist yet (`truncate`, `titleCase`): three tasks for three runs.
  From `ep7` there is a fourth, `test/round.test.js`, whose two tests want two different
  answers for `round(2.5)`: a task no code can finish.
- `box.sh`: runs the agent inside a Docker container. Up to `ep2` the container sees this
  whole folder, holds the API key and has open internet. From `ep3` it mounts only the files
  the agent needs (most of them read-only), holds no key, and sits on a network with no way
  out except the gate. `./box.sh --test` runs `npm test` in the same box, without the agent.
  From `ep5` the agent works on a copy of `src` and `test`, and the run ends with a proposal,
  `proposal/change.patch`, and its hash. Nothing in the project changes.
- `apply.sh` (from `ep5`): applies the proposal, but only if you pass the hash of the proposal
  you read: `./apply.sh <hash>`. If the proposal changed since, or the project did, it refuses.
  Every apply is written to `control/approvals.log`.
- `notes/progress.md` (from `ep6`): the agent's memory between runs: a task list and lessons.
  The harness puts it in front of the model at the start of every run; the agent ticks one
  task per run and adds what the next run must know. From `ep7` the task list is gone from
  it: the agent's box no longer holds the list of work, only the lessons.
- `notes/ideas.md` (from `ep7`): where the agent writes work it noticed but was not given,
  and questions only a person can answer. Nothing in it runs until you put it in `work.json`.
- `work.json` (from `ep7`): the open tasks, at most `slots` of them, each with a kill line in
  tokens. You edit it; the agent's box does not contain it.
- `work.mjs` (from `ep7`): plain code `night.sh` runs on your machine: the next open task, the
  tokens a task has spent (from the gate's ledger), and closing a task as `done` or `killed`
  in `control/work.log`. A closed task never opens again by itself. With more open tasks than
  slots it refuses, and nothing runs.
- `night.sh` (from `ep6`): runs the agent again and again, each run fresh, until the tests pass
  in the agent's copy. The loop runs the tests itself; it does not take the agent's word. Run
  it again after it stopped and it picks up where it was. In the morning: `./apply.sh <hash>`.
  From `ep7` it works through the open tasks of `work.json`, one at a time: a task closes when
  its own test passes, or at its kill line, and the loop goes on to the next one.
- `gate.mjs` (from `ep3`): the only way out of the box. It holds the API key and forwards one
  request, `POST /v1/messages`, to the Claude API. Everything else gets a 403. From `ep4` it
  also keeps the bill: it counts requests and tokens, refuses when a budget is spent, writes
  every request to `control/ledger.jsonl`, and refuses while `control/STOP` exists. From `ep7`
  every ledger row names its task, and the gate refuses once a task has spent its kill line.
- `budget.json` (from `ep4`): the most requests and tokens one run may use, and the most
  tokens a day. The gate reads it; the agent's box does not contain it.

## Run it

You need Node 22 or newer, Docker, and a Claude API key. Give the key a low spend limit.

    git clone https://github.com/msc-labss/agent-harness-course.git
    cd agent-harness-course
    git checkout ep1
    npm test
    ANTHROPIC_API_KEY=... ./box.sh "make the tests pass"
    npm test

In the video the run took 4 requests and about 5,000 input tokens, about 3 cents at list
price. An agent works differently on every run; yours will not match line for line.

**Do not run `node agent.mjs` directly on your machine.** At `ep1` the agent runs any shell
command the model asks for, with your permissions, and it asks nobody. From `ep2` its tools
are narrow, but `run_tests` still runs code the agent wrote, and that code is not checked
against the policy. Up to `ep2` the container limits what
it can touch to this folder, but it does not limit the network, and code inside can read the
API key. From `ep3` the box has no secret, no key and no internet. What is left: code in the
box can still call the model through the gate, on your bill. From `ep4` the gate stops at
the budget in `budget.json`, and `touch control/STOP` from another terminal stops a run at its
next request. The budget is checked before each request, so a run can pass it by one request.
From `ep5` the agent cannot change the project at all: read `proposal/change.patch` before you
apply it. The hash proves the proposal is the one you read, not that it is good.
From `ep6` the folder `notes/` is the one place in the project the agent writes directly.
If you throw a proposal away, reset `notes/progress.md` too (`git checkout notes`), or the
notes will say more is done than is.
From `ep7` a kill line, like the budget, is checked before each request, so a task can pass
it by one request. A killed task's work stays in the agent's copy and in the proposal: read
it before you apply. Killing a task does not tell you why it failed; the agent's lessons and
`notes/ideas.md` might. To open a closed task again, delete its line from `control/work.log`.

## Follow along

Each episode has a tag: the repository as it is at the **end** of that episode.

| Episode | What happens | Tag |
|---|---|---|
| 1 | [What is an agent harness? A coding agent in 79 lines](https://youtu.be/0vBuKF1SVsk) | `ep1` |
| 2 | [Lock down a coding agent: narrow tools, not a shell](https://youtu.be/SGwmQtdegW4) | `ep2` |
| 3 | [Put a coding agent in a box: no secret, no key, no internet](https://youtu.be/vqbAGWRW6Nk) | `ep3` |
| 4 | [Give a coding agent a budget and a stop switch](https://youtu.be/0ijkzB06kDQ) | `ep4` |
| 5 | [An approval gate for a coding agent: it proposes, you approve](https://youtu.be/Row9BKa5U8g) | `ep5` |
| 6 | [Coding agent runs that survive the night: notes, a loop, a check](https://youtu.be/ryWDiVnqFTI) | `ep6` |

## Notes

- This is an independent course. MSC Labs is not affiliated with Anthropic.
- The agent calls `claude-opus-5-5` through the Claude API; change `MODEL` in `agent.mjs` to
  use another Claude model.
- Licence of this repository: MIT.
