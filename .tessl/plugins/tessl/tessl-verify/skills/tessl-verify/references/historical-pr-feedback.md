# Playbook: From Historical PR Feedback

Use this playbook when the user wants verifiers grounded in repeated review
comments. The goal is to convert undocumented review expectations into early,
actionable checks.

## Workflow

1. Select about 50 relevant PRs.
   - Prefer recent merged PRs touching the target area.
   - Include PRs by agents if the goal is agent-readiness.
   - Narrow by labels, directories, teams, or time window when the repo is large.
2. Read review comments, requested changes, follow-up commits, and CI fixes.
   Look for feedback that appears multiple times or causes churn.
3. Cluster feedback into invariant candidates.
   - Same helper API repeatedly requested.
   - Same generated artifact repeatedly missed.
   - Same naming, location, routing, or test pattern repeatedly corrected.
   - Same framework-specific convention reviewers keep explaining.
4. For each cluster, inspect the final merged code to identify the concrete
   signal that distinguishes correct from incorrect code.
5. Triage the cluster:
   - Verifier if the invariant is binary and judgeable by file, path list, or
     diff.
   - Lint/test if deterministic tooling can catch it.
   - Docs/context if it is useful but subjective.
   - Skip if the feedback was one-off or project-specific in a way that cannot
     generalize.
6. Draft the verifier with evidence from representative PR comments and final
   code examples.

## What To Look For

Strong candidates usually sound like:

- "Use the existing helper instead of hand-rolling this."
- "This generated file also needs updating."
- "Routes in this package should return through this wrapper."
- "Do not import directly from this internal module; use the public package."
- "This pattern belongs under this directory and must be named this way."
- "This config only applies when this dependency or framework is present."

Weak candidates usually sound like:

- "This is hard to read."
- "Can you make this cleaner?"
- "Maybe add tests."
- "This approach feels brittle."
- "Please explain why."

The weak comments may still inspire docs or tests, but they are poor verifier
rules until you can express an observable invariant.

## PR Analysis Table

Capture enough evidence to justify each candidate:

| Pattern                         | Example PRs      | Reviewer feedback | Final-code signal                        | Proposed destination |
| ------------------------------- | ---------------- | ----------------- | ---------------------------------------- | -------------------- |
| Missing generated API artifacts | #123, #148, #172 | "Run api:sync"    | backend schema diff plus generated files | diff verifier        |
| Bypassing helper                | #156, #177       | "Use parseFoo()"  | direct import or manual parser           | file verifier        |

## Drafting From A Cluster

When a cluster is ready, write:

- `context`: mention the repeated review pattern and why catching it earlier
  matters.
- `relevant_when`: name the exact path/import/API/diff signal seen in PRs.
- `checklist`: encode the reviewer expectation as 1-3 binary checks.
- `scope_reason`: explain why file, paths, or diff is enough evidence.

Do not overfit to one PR's local names unless those names represent the repo's
actual invariant.
