# Tessl Change Verify Verifier Authoring

Use this reference when the user wants to design verifier candidates, write
verifier JSON, or decide what should be enforced by `tessl change verify`.
Verifiers are checked-in JSON files used by the `tessl change verify` CLI as
LLM-as-judge review rules.

If the user needs command syntax, CLI availability, or troubleshooting, use
[cli-usage.md](cli-usage.md). This reference focuses on verifier authoring.

## Start With The Source

Pick the playbook that matches the user's source material:

| Source                | Use when                                                                                                                     | Reference                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Context file          | The repo has AGENTS.md, CLAUDE.md, Cursor rules, skills, rules, or docs that already tell agents how code should be written. | `references/from-context-file.md`      |
| Historical PRs        | The user wants verifiers grounded in real review pain or recurring feedback.                                                 | `references/historical-pr-feedback.md` |
| Architecture analysis | The repo has opinionated patterns, helper APIs, naming conventions, or hidden structures that agents may miss.               | `references/architecture-analysis.md`  |

Only load the reference file for the chosen playbook unless the user explicitly
wants multiple sources combined.

## What Makes A Good Verifier

Extract fewer, stronger verifiers. A good verifier should be easy for a small
judge model and a human reviewer to score the same way.

Use a rule only when all of these are true:

- **Concrete and binary:** the judge can answer "does this code follow it?" by
  inspecting the target. Good: "Fastify route files return via typed response
  helpers." Weak: "handle errors well."
- **Clear applicability:** the verifier says exactly when it applies using a
  checkable signal such as a filename, symbol, import, API call, config marker,
  decorator, or diff shape. Keep repository and application path filtering in
  `tessl.json`, not verifier prose. A rule whose invariant is itself a filename
  or relative placement requirement may state that requirement, but its
  `tessl.json` scope must include both compliant and violating paths.
- **Output-focused:** the rule checks committed code or repo structure, not the
  agent's session behavior. "Run tests after editing" is process guidance, not a
  verifier. "Generated API types are committed with backend schema changes" can
  be a diff-scope verifier.
- **Low ambiguity:** a reader should not need careful interpretation, project
  folklore, or runtime access to decide pass/fail.
- **Worth gating:** the rule catches mistakes that would otherwise reach review
  or CI, and failures should cause action.

Skip vague style aspirations, broad best-practice advice, agent behavior rules,
workflow instructions, and checks that require live services, browser state,
logs, or runtime behavior the judge cannot see.

## Verifier Shape

Draft each verifier as one JSON file under the repo's configured `verifiers/`
directory. Keep one invariant per verifier.

Required fields:

```json
{
  "name": "Short human label",
  "instruction": "One tight sentence stating the rule positively.",
  "relevant_when": "Checkable predicate for when this verifier applies.",
  "context": "One or two sentences explaining why this invariant matters.",
  "scope": "file",
  "scope_reason": "A single file contains all evidence needed for this rule.",
  "checklist": [
    {
      "name": "binary-check-name",
      "rule": "A yes/no check the judge can score by inspection."
    }
  ]
}
```

Use `scope` deliberately:

- `file`: one file is judged at a time. The judge sees its path and current
  contents. This is the default and should cover most rules.
- `paths`: one supplied set of file paths is judged together. The judge sees no
  file contents. Use for layout, naming, or required companion files.
- `diff`: the judge sees unified patches for the applicable changed files, not
  their complete contents. Use for synchronization rules like generated files
  committed alongside source changes.

Ensure `relevant_when` and every checklist item can be decided using only the
evidence supplied to the judge. Distinguish “evidence is absent” from “the
implementation fails”: when the scope does not establish the premise, return
not applicable. Do not infer data provenance from generated types, names, or
props alone.

Checklist items should be 1-3 binary checks. Give each check a stable, readable
`name` and one independently decidable responsibility. Remove overlap between
items, ensure allowances do not contradict the main rule, and state exactly when
a check should return not applicable. Use item-level `relevant_when` only when a
sub-check is narrower than the verifier itself.

## Applicability Discipline

Most bad verifiers fail because `relevant_when` is too broad. Write predicates
the judge can verify literally.

Prefer:

- `TypeScript file that imports FastifyPluginAsync or FastifyInstance from 'fastify'`
- `Markdown file named SKILL.md whose contents include YAML frontmatter`
- `TypeScript or TSX file that imports useState or useReducer from 'react'`
- `Diff that modifies TypeBox declarations defining an API response schema`

Avoid:

- `Backend file`
- `React component`
- `Database code`
- `Skill documentation`
- `Any TypeScript file`

If the rule depends on project-wide setup that a per-file judge cannot see, add
`project_when`. Use it for predicates like a dependency in `package.json`, a
framework config file, or a repo-level glob. Do not use `project_when` when an
import, path, extension, or API call in the target file is enough.

## Scope For Durability

Choose verifier scope so the check stays attached to the code that owns the
invariant as the codebase grows and is refactored. The goal is not to minimize
judge calls at all costs; it is to avoid a verifier silently stopping after a
normal rename, extraction, or nearby new file.

Start from stable ownership boundaries such as paths, modules, packages, file
types, or architectural areas. Add content filters only when that ownership
boundary is too broad or noisy, and prefer signals that are likely to survive
ordinary refactors. For small, well-owned file sets, it is often better to let
the judge decide applicability than to add a brittle content filter.

For `file` and `paths` scopes, inspect
`tessl change verify --dry-run --all --show-files` during tuning and ask whether
the target list would still look right after expected code evolution. If a
method rename or helper extraction would cause the verifier to stop running
where the invariant matters, broaden or simplify the scope before tuning the
judge wording.

When a broad scope produces mostly not-applicable results, add a content filter
if possible. Configure `content` at `verify.groups.<group>.content` in
`tessl.json`, or at `verify.groups.<group>.verifiers.<verifier-id>.content` when
only one verifier needs it. Supported predicates are `containsAny`,
`containsAll`, `regexAny`, `regexAll`, `notContainsAny`, and `notRegexAny`; each
takes an array of strings. The filter names what makes the rule relevant, never
what the rule demands, and is sound only when every file that could violate the
rule contains at least one of its triggers. If you cannot cover every violation,
omit the content filter.

Judge the file that owns the complete behavior. Do not judge helper files
separately when the owning component supplies the behavior, and explicitly
identify accepted shared abstractions and delegated behavior.

## Candidate Triage

For each candidate, decide the right destination:

- **Verifier:** binary invariant, easy applicability, catches review mistakes.
- **Deterministic invariant check:** broad invariant that is deterministic and
  cheap to check with code. Use lint, typecheckers, ast-grep or Semgrep, schema
  validators, import-boundary checks, generated-artifact sync checks,
  contract/golden checks, broad invariant test suites, or custom validation
  scripts when practical. Keep fully deterministic checks out of `tessl.json`.
  If this is the right destination but the repo lacks a suitable deterministic
  tool, recommend the smallest conventional tool to add.
- **Specific test:** useful product correctness coverage for one behavior,
  implementation path, or regression. If a test would enforce a broad invariant
  across future files or changes, route it to deterministic invariant checks as
  a broad invariant test suite instead.
- **Docs/context:** useful guidance but not objectively judgeable.
- **No action:** too vague, too rare, or too expensive to review.

Split objective rules from subjective maintainability judgments. Avoid combining
several commands, exemptions, or architectural layers in one verifier.

Do NOT create LLM-judge verifiers for checks that a deterministic linter,
typechecker, structural-search rule, schema validator, contract check, custom
script, or ordinary test can own directly. Those checks belong in deterministic
tooling, not in a judge verifier. A judge verifier earns its cost only when the
invariant is real but not cheaply expressible in deterministic tooling.

When in doubt, write the candidate down with a rejection reason instead of
forcing it into verifier JSON.

## Authoring Workflow

1. Gather candidates from the chosen playbook.
2. Triage candidates against the good-verifier criteria.
3. Draft verifier JSON with tight `relevant_when`, clear `scope`, and 1-3 binary
   checklist items.
4. Place files under the package or repo `verifiers/` directory.
5. Add the verifier files to the active `tessl.json` (the repo-root manifest
   with verify groups).
   - Ensure the group's `path` glob matches the verifier files, for example
     `verifiers/*.json` or `verifiers/**/*.json`.
   - Set group-level `include` / `exclude` globs to the broad code area this
     verifier group is allowed to inspect.
   - Set group-level `level` to the default severity for the group (`warn` or
     `error`). `error` findings are CI-blocking (non-zero exit); `warn`
     findings are reported but non-blocking unless `--fail-on-warn` is set.
     Default checked-in verifier groups to `error`: a verifier that is worth
     committing should be worth gating on. Only choose `warn` as a deliberate,
     PR-justified downgrade — a temporary rollout window, an intentionally
     advisory check, or a verifier still being calibrated against real
     failures. A verifier that is not yet error-worthy should be rejected,
     tuned, or kept out of the manifest, not merged as `warn`.
   - Add verifier-level overrides when one verifier needs a narrower file set
     than the rest of the group, or when one verifier needs a different severity
     than the group default. For example, an `error`-default group can keep a
     small number of intentionally advisory verifiers downgraded to `warn`:

     ```json
     {
       "verify": {
         "groups": {
           "core": {
             "path": "verifiers/*.json",
             "level": "error",
             "include": ["src/**/*.ts"],
             "verifiers": {
               "gating-rule": {},
               "advisory-style-rule": { "level": "warn" }
             }
           }
         }
       }
     }
     ```

   - Severity is repo manifest policy, not part of the verifier JSON file. Keep
     severity out of verifier JSON so the same file can be shared across repos
     with different enforcement postures.
   - Treat `error` as the default posture for a merge-ready verifier. Do not
     reach for `warn` as a way to land a weak or subjective verifier — a rule
     whose sampled failures are not yet consistently real and actionable should
     be rejected, tuned, or kept out of the manifest until it is error-worthy.
     Use `warn` only as an explicit, PR-justified downgrade for a temporary
     rollout window, a calibration pass, or an intentionally advisory check.
   - Refine globs until the candidate file set matches the intended review
     surface. Do not rely on `relevant_when` alone to compensate for a very broad
     manifest scope.
   - Exclude generated files, tests, fixtures, and stories unless the verifier
     explicitly applies to them.
   - Add a content filter to broad scopes when it can cover every violation.

6. Validate structure:

```sh
tessl change verify lint <verifier.json>
```

7. Inspect `file` or `paths` scope before spending judge calls:

```sh
tessl change verify --dry-run --all --show-files
```

8. If scope is wrong, narrow or widen `tessl.json`, improve
   `relevant_when`, or use:

```sh
tessl change verify suggest-scopes --group <group-id>
```

## Tune Verifiers With Tessl Verify

Expect the first draft to need tuning. Verifier quality is hard to judge from
wording alone because the real question is how the judge applies it to real
files.

After wiring a `file` or `paths` verifier into the active `tessl.json`, run a
tiny sample:

```sh
tessl change verify --all --sample 5
```

For a `diff`-scope verifier, validate against a representative changed diff
without `--all`, because `--all` skips `diff`-scope verifiers:

```sh
tessl change verify --base <base-ref> --verifier <verifier-id>
```

For every failure, decide whether it matches the original invariant:

- **Real failure:** the code is actually wrong for the rule. Keep the failure and
  treat it as something worth gating on.
- **Judge overreach:** the code is fine, or the rule was applied to the wrong
  kind of file. Diagnose why the judge got it wrong, then refine the verifier
  wording, `relevant_when`, checklist, scope, or `tessl.json` include/exclude
  globs.

Also inspect not-applicable results. If most results are not applicable, tighten
the manifest scope or add a content filter.

Use `--dry-run` to inspect the complete candidate file set:

```sh
tessl change verify --dry-run --all --show-files
```

When running from a monorepo root, add `--recursive` so linked child manifests
are included.

Then increase sample size gradually:

```sh
tessl change verify --all --sample 20
tessl change verify --all --sample 50
tessl change verify --all
```

If the full run is intentionally large, read `tessl change verify --help` and raise
`--max-calls` deliberately. Each increase should answer: are the failures still
real failures, or is the verifier still overreaching?

When tuning:

- Prefer narrowing the manifest or verifier scope over adding vague checklist
  caveats.
- Make applicability signals easy for the judge to see: filename, symbol,
  import, API call, config marker, or diff shape. Keep repository and
  application path filtering in `tessl.json`.
- Split one broad verifier into smaller verifiers when failures mix unrelated
  concerns.
- Keep a rejection note for candidates that cannot be tuned into reliable,
  gate-worthy failures.
- Do not weaken the invariant just to make current code pass. Change the
  verifier only when the check is wrong or ambiguous.

Only treat a verifier as CI-ready when sampled failures are consistently real
violations of the original intent.

## Merge-Readiness Checklist

Before merging a verifier change (new verifier, scope change, or severity
change), confirm all of the following:

- [ ] `tessl change verify lint <verifier.json>` passes for every added or changed
      verifier file.
- [ ] For `file` and `paths` scopes,
      `tessl change verify --dry-run --all --show-files` shows the verifier
      matching the intended review surface, with no obviously wrong or empty
      target sets.
- [ ] A `diff`-scope verifier was run against a representative changed diff
      without `--all`.
- [ ] Generated files, tests, fixtures, and stories are excluded
      unless the verifier deliberately governs them.
- [ ] Sampled failures (`tessl change verify --all --sample <n>` for `file` and
      `paths` scopes) are real, specific, and actionable, not judge overreach
      or noise.
- [ ] Sampled not-applicable results are expected; broad scopes use a sound
      content filter where one can cover every violation.
- [ ] Every checklist item has one independently decidable responsibility, does
      not overlap another item, and states when it is not applicable.
- [ ] Effective severity is `error` unless the PR body explicitly justifies an
      advisory or calibration exception (temporary rollout window, intentionally
      advisory check, or a verifier still being calibrated).

If a verifier cannot clear this checklist, do not merge it as `warn` to get it
in. Reject it, tune it, or leave it out of the manifest until it is
error-worthy.

## Output When Helping A User

When proposing verifiers, return:

- A candidate table with source evidence, invariant, destination, and confidence.
- Draft JSON only for candidates that pass triage.
- Rejected candidates with a short reason.
- Follow-up validation commands, especially `verify lint` and `verify --dry-run`.

Do not present speculative or vibe-based candidates as ready-to-run verifiers.
