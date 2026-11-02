# Playbook: From A Context File

Use this playbook when verifier candidates come from AGENTS.md, CLAUDE.md,
Cursor rules, skill files, tile rules, or repo documentation that already tells
agents how to write code.

## Workflow

1. Find relevant context files.
   - Start with AGENTS.md in the repo root and any nested AGENTS.md files near
     the code the user cares about.
   - Also inspect CLAUDE.md, `.cursor/rules`, skill `SKILL.md` files, tile
     rules, and local docs if the user points to them.
2. Split instructions into atomic statements. Keep the original wording and
   source path nearby for traceability.
3. Discard process-only guidance such as "ask before refactoring", "run tests",
   "do not commit", or "prefer simple approaches" unless it creates an
   observable repository invariant.
4. For each remaining statement, ask:
   - Can a judge decide pass/fail by reading one file, a path list, or a diff?
   - What exact file path, extension, import, API call, config marker, or diff
     shape makes it applicable?
   - Would a failure be actionable in review?
5. Draft one verifier per concrete rule. Preserve the invariant, but rewrite
   vague prose into a binary instruction and checklist.
6. Keep source references in `context` or `references` when useful so future
   maintainers know where the rule came from.

## AGENTS.md-Specific Guidance

AGENTS.md often mixes repo policy, coding style, workflow instructions, and
generated-file rules. Treat these differently:

- Generated-file sync rules often make good `diff` verifiers because they depend
  on which files changed together.
- Import extension rules, framework conventions, helper usage, or file-location
  rules often make good `file` verifiers.
- "Always run lint/tests" is not a verifier; it is agent process guidance.
- "Never edit generated files by hand" is usually not directly judgeable unless
  the diff contains a recognizable generated file and source change pattern.

## Candidate Notes Template

Use this intermediate table before writing JSON:

| Source    | Raw instruction | Candidate invariant | Scope           | Applicability signal        | Decision                      |
| --------- | --------------- | ------------------- | --------------- | --------------------------- | ----------------------------- |
| AGENTS.md | "..."           | "..."               | file/diff/paths | import/path/API/diff marker | verifier / docs / lint / skip |

## Example

Raw context:

> After modifying backend route handlers, request/response schemas, or TypeBox
> types that affect the API contract, regenerate OpenAPI and frontend types.

Verifier candidate:

- Scope: `diff`
- Relevant when: `Diff that changes apps/backend route handlers, request or
response schemas, or TypeBox API contract types`
- Instruction: `Backend API contract changes are accompanied by regenerated
OpenAPI and frontend API type artifacts.`
- Checklist:
  - `openapi-updated`: `The diff includes the backend OpenAPI artifact when API
contract source files changed.`
  - `frontend-types-updated`: `The diff includes regenerated frontend API types
when backend API contract source files changed.`

This is suitable because the evidence is the change set, not a single file.
