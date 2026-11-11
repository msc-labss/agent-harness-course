# Agent harness course: the companion repository

The code of the free agent harness course on the
[MSC Labs YouTube channel](https://www.youtube.com/@msclabs): six short episodes on running
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
  and 2 failing. It is the agent's job to fix it.
- `box.sh`: runs the agent inside a Docker container that can see only this folder.

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
against the policy. The container limits what it
can touch to this folder. It does not limit the network, and the agent inside can read the
API key it was given. Later episodes deal with both.

## Follow along

Each episode has a tag: the repository as it is at the **end** of that episode.

| Episode | What happens | Tag |
|---|---|---|
| 1 | [What is an agent harness? A coding agent in 79 lines](https://youtu.be/0vBuKF1SVsk) | `ep1` |
| 2 | [Lock down a coding agent: narrow tools, not a shell](https://youtu.be/SGwmQtdegW4) | `ep2` |
| 3 | Put it in a box: container and network | coming |
| 4 | Budgets and a stop switch | coming |
| 5 | An approval gate | coming |
| 6 | Runs that survive the night | coming |

## Notes

- This is an independent course. MSC Labs is not affiliated with Anthropic.
- The agent calls `claude-opus-5-5` through the Claude API; change `MODEL` in `agent.mjs` to
  use another Claude model.
- Licence of this repository: MIT.
