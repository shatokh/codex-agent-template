# Technology-agnostic artifact verification

Date: 2026-10-07. Scope: the approved first-stage core.

## Deterministic evidence

The artifact suite covers application, command-line, library, documentation, and tabletop fixtures in Codex, Claude, and combined modes. These are local generation/doctor checks, not a heavy test matrix imposed on generated projects. Commands found or inferred in a fixture are not executed by generation.

Checks cover opt-in defaults, role-to-skill dependencies, root/reference reachability, native wrapper fields, model inheritance, restricted reader tools, default verifier boundaries, content diagnostics, configuration compatibility, reviewed update/replay, and preservation of user-edited roles. Package smoke executes the extracted CLI from an unrelated cwd and includes all three roles, new skills, and packs.

The role doctor accepts the generated flat quoted TOML and generated YAML field set. It rejects widened role defaults and missing workflow links. This is not a general-purpose TOML/YAML parser or a proof of runtime-enforced isolation.

The three repository Codex role files also parsed successfully with Python's standard-library tomllib, preserving their four fields and read-only defaults. This independent syntax check does not establish native agent discovery.

## Native evidence and limits

Codex CLI 0.160.1 app-server skills/list discovered all seven core skills enabled with zero discovery errors in an isolated generated project and separate CODEX_HOME. No model turn was started. UI metadata was added to the three new skills and retains implicit selection.

An offline Codex debug prompt-input check exposed role references in root instructions; that alone does not prove custom roles loaded. App-server config/read did not expose a resolved role catalog. An ephemeral thread/start returned a read-only policy with networkAccess=false, without a model turn; that describes the parent thread, not each custom delegate. Native delegate selection and its effective policy remain unverified and doctor reports that limitation.

Claude Code is unavailable locally, so live Claude role discovery/behavior is unverified. Generated Claude definitions are checked structurally against the documented format and tool/skill contract. No real model eval sessions were run. The bundled Python skill validator lacks PyYAML; project frontmatter validation and native Codex skill discovery provide the available checks instead.

## Behavioral scenarios prepared for human-scored evaluation

Use the opt-in runner with the relevant skill and scenario. Default mode previews only:

```sh
node scripts/eval-skills.mjs --skill repo-discovery --scenario discovery-unavailable
node scripts/eval-skills.mjs --skill bug-investigator --scenario bug-unreproduced
node scripts/eval-skills.mjs --skill verify-change --scenario verification-blocked
node scripts/eval-skills.mjs --skill review-agent --scenario review-no-diff
node scripts/eval-skills.mjs --skill feature-planner --scenario feature-existing-approval
node scripts/eval-skills.mjs --skill verify-change --scenario no-code
node scripts/eval-skills.mjs --skill clean-chat-handoff --scenario handoff
node scripts/eval-skills.mjs --skill repo-discovery --scenario typo
```

For each skill, evaluate relevant requests and routing exclusions, including typo and already-approved-choice fixtures. Rubrics check unsupported facts, unnecessary approvals, scope drift, inability to reproduce, unsafe command assumptions, and honest acceptance gaps. These scenarios are prepared, not scored evidence. Repeat baseline/treatment sessions in the same intended runtime/model before claiming behavioral improvement. Explicit skill injection does not measure automatic selection.
