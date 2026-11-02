# Tessl Change Verify CLI Usage

Use this reference as a thin orientation layer. The `tessl change verify`
command help is the source of truth for flags, examples, and current behavior.
Read the CLI help instead of reconstructing detailed instructions from memory.

`tessl change verify` is the canonical command; `tessl verify` is a back-compat
alias for it, so both forms run the same checks.

## Start With CLI Help

Before answering detailed `tessl change verify` usage questions or running non-trivial
commands, inspect the relevant help:

```sh
tessl change verify --help
tessl change verify lint --help
tessl change verify suggest-scopes --help
```

## CLI Availability

`tessl change verify` is built into the `tessl` CLI — no separate agent CLI or install
step. It reads the standard `TESSL_TOKEN` auth token from the environment.

For GitHub Actions, install the `tessl` CLI in the workflow and provide
`TESSL_TOKEN` as a repository or organization secret.

## Mental Model

`tessl change verify` is an LLM-as-judge review tool being introduced as a CI gate. It
checks source code against checked-in verifier JSON files that are generated
from context rules given to agents. You can also run the same checks locally to
catch issues before a branch reaches CI.

- `tessl.json` is the active project manifest. It defines verifier groups,
  points at verifier file globs, sets severity, and scopes which files are
  inspected. By default, `tessl change verify` runs the current project only.
  Recursive discovery of nested manifests when `--recursive` is used comes
  from `experimental.monorepo.childManifests`. Child directories and their
  manifests must resolve inside the project root, including through symlinks.
- Verifier JSON files are the runtime source of truth for rules. They usually
  live under `verifiers/` and contain the rule, applicability, context, judging
  scope, and checklist. Verifier JSON files do not carry severity — severity is
  repo manifest policy set in `tessl.json`.
- Group `level` sets the default severity (`warn` or `error`) for every
  verifier in the group. A verifier-level `level` entry under
  `verify.groups.<group>.verifiers.<verifier-id>` overrides that default for
  one verifier, so a group can hold both gating and advisory rules without
  being split. `error` findings are CI-blocking (non-zero exit); `warn`
  findings are reported but non-blocking unless `--fail-on-warn` is set.
  Checked-in verifiers default to `error`: a verifier worth committing should
  be worth gating on. `warn` is an explicit, PR-justified downgrade for a
  temporary rollout window, a calibration pass, or an intentionally advisory
  check — not the normal starting point for a new verifier. Severity belongs
  in `tessl.json` as repo policy; verifier JSON files should stay focused on
  the rule itself.
- Run and plan accept at most one positional path scope. Extra paths produce
  a usage error.
- `--dry-run` is the cheap safety step. Use it before broad or uncertain runs.
- The result cache lives under `~/.tessl/verify-cache/` (user home, shared
  across all projects); use CLI flags from `tessl change verify --help` when
  cache behavior matters. Judge responses must contain exactly the configured
  checklist names, in any order. Cached responses with invalid names are
  evaluated again and replaced by valid results.

## Existing Verifiers

If the repo already has `tessl.json` and verifier JSON files, the minimal
local preflight workflow is:

```sh
tessl change verify
```

Then review the results and fix any failures before pushing. By default,
`tessl change verify` is change-aware: changed source files are checked by all
applicable verifiers, changed verifier JSON or `tessl.json` rules are checked
against their full configured scope (including files outside the diff), and
unchanged verifiers are not run against unchanged files. Use `--all` for an
explicit full-repo audit.

In a monorepo, run from the root with `--recursive` when you need to include
the root project and linked child manifests:

```sh
tessl change verify --recursive
```

## New Repo Or New Verifiers

Use this workflow when adding `tessl change verify` to a repo, adding new verifier
rules, or changing verifier scope. Setup is manual: add a `verify` section to
`tessl.json`, then add verifier JSON files.

1. **Add verify config** — add a `verify` block to your `tessl.json` pointing
   at your verifier file globs and setting severity. See `tessl change verify --help`
   for the expected shape.

2. **Add verifier JSON files** — each file describes one rule: instruction,
   applicability, context, scope, and checklist. See
   [verifier-authoring.md](verifier-authoring.md) for authoring guidance.

3. **Lint the verifier files** before running anything else:

   ```sh
   tessl change verify lint <verifier.json>
   ```

4. **Dry-run with --show-files** to inspect scope without spending judge calls:

   ```sh
   tessl change verify --dry-run --all --show-files
   ```

5. **Sample** to check a smaller output set and validate rule wording and scope:

   ```sh
   tessl change verify --all --sample 50
   ```

6. **Full run** once the dry run and sample look right:

   ```sh
   tessl change verify --all
   ```

If the full run is intentionally large, use the CLI help to choose the right
`--max-calls` value:

```sh
tessl change verify --help
```

If verifier scopes look wrong, use scope suggestions or edit `tessl.json` directly:

```sh
tessl change verify suggest-scopes --group <group-id>
```

## Troubleshooting

Treat a `tessl change verify` failure as a real compliance issue first. Read the
failure, inspect the relevant code, and prefer fixing the code so it satisfies
the verifier.

Because verifiers use an LLM judge, false positives can happen. Only change a
verifier when the result shows the rule is being applied to the wrong files, the
applicability condition is too broad, or the wording is ambiguous enough that a
correct implementation is being rejected.

When changing a verifier, preserve the invariant. Clarify the rule, narrow its
scope, or improve `relevant_when`; do not weaken the intent just to make the
current change pass. If the task really changes the invariant, call that out as
a behavior or policy change and update the verifier deliberately.
