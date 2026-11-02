---
name: tessl-verify
description: |
  Use for `tessl change verify`: setting up verifier JSON checks, authoring and
  tuning verifiers, running lint/dry-run/sample/local preflight checks, and
  rolling out CI verification gates for pull requests.
---

# tessl-verify

Guide users through `tessl change verify`, including verifier authoring, local
preflight, CI automation, and tuning.

Use this skill when the user mentions verifier JSON, `tessl.json` verify config,
CI verification gates, local verify failures, adding new LLM-as-judge checks, or
mining context/rules/PR feedback for verifier candidates.

References:

- [CLI usage](references/cli-usage.md) — command mental model, flags, and troubleshooting.
- [Verifier authoring](references/verifier-authoring.md) — how to design and tune verifier JSON.
- [From context file](references/from-context-file.md) — mine AGENTS.md, CLAUDE.md, rules, and docs.
- [Historical PR feedback](references/historical-pr-feedback.md) — mine recurring review feedback.
- [Architecture analysis](references/architecture-analysis.md) — mine code structure and hidden invariants.

## Workflow

1. **Inspect the current command help.** Use `tessl change verify --help`,
   `tessl change verify lint --help`, and
   `tessl change verify suggest-scopes --help` for current behavior.
2. **Classify the task.** If the repo already has verifier JSON and the user
   wants to run or automate it, follow "Run existing verifiers". If the user
   wants new rules, follow "Author or tune verifiers" first.
3. **Run existing verifiers locally.** Start with `tessl change verify` on the
   current diff. Use `--recursive` from monorepo roots when child manifests
   should be included.
4. **Preflight broad runs.** Before expensive or CI-bound runs, use lint,
   `--dry-run --all --show-files`, then `--sample <n>` to inspect scope and
   judge behavior.
5. **Author or tune verifiers.** Use
   [references/verifier-authoring.md](references/verifier-authoring.md). Create
   fewer, stronger binary invariants; inventory the repo's deterministic
   invariant tools (lint, typecheck, structural search, schema validation) and
   route each candidate to the right destination. Use lint, structural search, schema
   validation, typecheckers, or contract checks when they can own a broad
   invariant deterministically. If that is the right destination but no
   deterministic tool exists, recommend the smallest conventional tool to add.
   Apply the readiness checks in that reference before presenting a verifier as
   ready to run.
6. **Backtest representative PRs.** Ask for old PRs or recurring review issues.
   Run the verifier set against those diffs and compare findings with what
   humans cared about.
7. **Create advisory automation.** Add a GitHub Actions workflow that fetches
   the base ref, dry-runs scope, then runs `tessl change verify --github` with a
   deliberate `--max-calls`. The gate publishes annotations with the default
   `GITHUB_TOKEN`; to reach other repos or trigger CI instead, use a GitHub App
   installation token with target-repository access, or a fine-grained PAT in
   Actions secrets with the needed Contents and Actions permissions. Use a
   classic PAT in Actions secrets only when the integration cannot use either
   option. Pass the selected credential only through the workflow secret.
8. **Promote deliberately.** Treat `error` severity as gating policy in
   `tessl.json`; use `warn` only for explicit rollout or advisory exceptions.
9. **Feed learning back.** Use false positives, misses, noisy scopes, and mostly
   not-applicable results to tune verifier wording, `relevant_when`, checklist
   items, content filters, and manifest globs.

## Model choice

Verifier judging runs on an LLM. You can select and fix a specific judge with
`--model`; use `openai/gpt-6-luna` to prioritize reasoning or `jev` for cost and
speed.

Tune verifiers against the model you intend to run. Wording that scores well on
one judge can behave differently on another, so tuning against a different model
than you deploy leaves the results untrustworthy.

`tessl change verify --model jev` selects Jev, a native System One model that
returns a verdict and a confidence instead of a verdict and reasoning. It is
much cheaper and faster, and still under test.

When setting up or tuning verifiers, ask the user whether they want to use Jev.
If they do, tune against it, and remind them that `--model jev` must be set on
the runs, locally and in the CI gate, for the tuning to hold.

## Destination Triage

Use `tessl-verify` only for observable, binary invariants about committed files
that are hard to express deterministically. Process reminders belong in skills,
rules, or hooks. Broad invariants that can be checked deterministically belong
in lint, structural search, schema validation, typecheckers, contract/golden
checks, or custom validation scripts. If that is the right destination but no
deterministic home exists, recommend the smallest conventional tool to add.
Specific product behavior belongs in tests.
