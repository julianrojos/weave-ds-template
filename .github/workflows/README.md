# `.github/workflows/`

Continuous integration. The place a gate becomes enforcement rather than a suggestion.

The scripts themselves live in [`scripts/`](../../scripts/README.md) and
[`packages/react/scripts/`](../../packages/react/scripts/README.md); this directory only decides
**when they run and on what**.

## What is here

| Workflow                     | Jobs     | What it protects                |
| ---------------------------- | -------- | ------------------------------- |
| [`verify.yml`](./verify.yml) | `verify` | Every gate on every push and PR |

### `verify`

Runs the same **set** of gates as `pnpm verify`, one step per gate, each with a comment stating what
that gate catches that nothing else would. Then two **reports** — contract coverage and the
token-policy paint report — which print and never fail.

Steps are separate rather than one `pnpm verify` call on purpose: a failure names itself in the
GitHub UI without anyone reading a log.

**The same set, not the same order** — and the difference matters. This job builds tokens early;
`pnpm verify` builds late. A gate must not depend on output produced earlier only in CI, or local and
remote verification can disagree.

## Why gates live here and not only in `pnpm verify`

**A contract whose breach produces no build error has to be gated in CI, or it is enforced on
whichever machine happens to run `verify`.**

That is the rule this directory exists to satisfy, and it is why the two lists must stay in step: a
gate added to `package.json` and not to `verify.yml` is a gate that protects the author and nobody
else. When you add one, add it in both places, with a comment here saying what it catches.

## What is deliberately absent

No deploy, release or publish workflow exists yet. This instance has no accepted release decision,
and an unused publishing pipeline would break quietly before the day it was first needed.
