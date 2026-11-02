# Playbook: From Architecture Analysis

Use this playbook when the user wants verifier candidates from the codebase
itself, especially hidden conventions that agents may miss without deep local
knowledge.

## Workflow

1. Map the target area.
   - Identify entrypoints, package boundaries, config files, shared helpers,
     route directories, generated artifacts, and tests.
   - Read local AGENTS.md or package docs if present, but let the code confirm
     what is actually practiced.
2. Look for opinionated patterns.
   - Repeated helper functions or wrapper APIs.
   - Public module boundaries and forbidden internal imports.
   - Naming conventions for files, exports, routes, configs, or migrations.
   - Generated files paired with source files.
   - Framework-specific structure, decorators, hooks, or providers.
   - Test placement and fixture patterns.
3. Compare common paths with outliers.
   - If almost every route uses a helper, inspect the few that do not before
     proposing a verifier.
   - If a pattern is inconsistent for legitimate reasons, document the
     exception in `relevant_when` or reject the candidate.
4. Find the checkable signal.
   - For file-scope rules, prefer imports, API calls, extensions, and directory
     paths.
   - For paths-scope rules, use path shape and required companion files.
   - For diff-scope rules, use changed-file relationships.
5. Triage candidates into verifier, lint/test, docs/context, or skip.
6. Draft verifiers only for conventions that are both important and observable.

## Useful Searches

Adapt these to the repo:

```sh
rg -n "from ['\\\"](@|\\.\\.|src|apps|packages)" <target-dir>
rg -n "TODO|FIXME|deprecated|do not|instead|helper|wrapper" <target-dir>
rg -n "generate|generated|do not edit|openapi|types\\.d\\.ts" <target-dir>
rg --files <target-dir> | sed -n '1,200p'
```

Also inspect package exports, route registration, config loading, database
access, API clients, and test utilities. These areas often encode invariants
that agents break by copying a nearby but wrong pattern.

## Candidate Signals

Good architecture-derived verifiers often enforce:

- Use the sanctioned helper or wrapper when a distinctive import/API call is
  present.
- Respect public package boundaries instead of importing private implementation
  files.
- Keep generated artifacts synchronized with source changes.
- Put new files in the established directory and naming pattern.
- Use the local test fixture or factory rather than ad hoc setup.
- Include required provider, middleware, schema, or registration calls in files
  that match a specific framework marker.

Avoid rules that require understanding intent across the whole product, runtime
state, performance measurements, or subjective design judgment.

## Validation Against The Codebase

Before presenting a verifier as ready:

1. Run the candidate's applicability signal across the repo with `rg` or file
   globs.
2. Check at least a few positive matches and negative matches.
3. Confirm known-good examples would pass.
4. Confirm at least one realistic bad example would fail.
5. Narrow the manifest include globs or `relevant_when` if unrelated files match.

If you cannot identify both positive and negative examples, label the candidate
as exploratory and ask for more evidence before writing verifier JSON.
