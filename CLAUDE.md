# STONE Web — operating rules for Claude

## 0. Identity and communication
- Project: STONE luxury natural-stone website. Next.js + TypeScript, locales ru/en, roles
  Guest/Client/Admin. Deployed to Cloudflare for testing and portable to other hosts (see docs/adr).
- Talk to the user in concise Russian: outcome → material uncertainty → one next action.
  Code, commits and docs are in English.
- Design source of truth: Figma 1vEGuD9cYYFNynyByUGHwF (read-only here). Governance and design history:
  the STONE agent system at
  C:/Users/nartsiss/Documents/Codex/2026-10-03/prompt-engineer-llm-engineer-ai-system/outputs/stone-agent-system
- Preserve the incumbent concept, palette, typefaces and D020 art direction. "Premium" means craft,
  not more gold, blur or motion.

## 1. Task lifecycle: obra/superpowers is the backbone
Every request runs through superpowers skills, invoked via the Skill tool (not from memory).
superpowers:using-superpowers applies at session start: check for a relevant skill before any action,
including clarifying questions.

1. Intake (Russian): restate the request in one or two sentences. Recommend a model and effort
   (section 2) and the extra domain skills/agents (sections 3–4), one line of reasoning each.
2. Investigate: read the affected code, the related Figma node (get_design_context, get_screenshot,
   get_motion_context for motion) and docs/ANIMATIONS.md or the relevant ADR.
3. Design → superpowers:brainstorming. Ask one question at a time, only questions that change the
   result. For animations, typical questions cover the trigger, which elements move, the desired feel
   (calm/snappy/heavy), mobile behaviour and repetition. Get approval of the design. Save the spec to
   docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md.
   Trivial changes (copy, one token, one CSS value) may skip brainstorming. Say so explicitly.
4. Plan → superpowers:writing-plans. Save to docs/superpowers/plans/YYYY-MM-DD-<topic>.md.
5. Isolate → superpowers:using-git-worktrees (branch feat/*, fix/*, anim/*, chore/*).
6. Build → superpowers:subagent-driven-development, run sequentially (one implementer, then its
   reviewer), or superpowers:executing-plans. Always under superpowers:test-driven-development.
7. Bugs/failing checks → superpowers:systematic-debugging first. No guess-fixes.
8. Review → superpowers:requesting-code-review. Feedback → superpowers:receiving-code-review.
9. Prove → superpowers:verification-before-completion: CI/test output, a preview URL, and
   screenshots at 1440 and 390 for UI work.
10. Finish → superpowers:finishing-a-development-branch → push and open a PR to main. Report in Russian:
    outcome, PR/preview link, one next action.

Precedence: user > this file > superpowers defaults. Helper limits (section 4), approval gates
(section 7) and the Figma read-only rule override any superpowers default. Approval of a brainstorming
design counts as human approval for exactly that scope.

## 2. Model recommendation
Recommend a model at intake and whenever the task's nature changes. Switch only with the user's
consent. Never claim a model is active unless the session confirms it. If the lineup has changed,
check it with the claude-api skill.

| Task type | Model | Effort |
|---|---|---|
| Architecture, ADRs, auth/security, data model, hard bugs, complex scroll/choreographed motion | Opus 5.5 | high |
| Standard components, pages from Figma, single animations, tests, refactors | Sonnet 5.5 | medium |
| Copy/translation edits, token tweaks, small CSS fixes, lookups | Haiku 5.5 | low |
| Long multi-step autonomous work | Opus 5.5 | high; fast mode only if the user chooses it |

## 3. Skills: pick the minimum that fits and name them at intake
Invoke the skills via the Skill tool. Verify that a skill exists in the current session before naming it.
- Process: always obra/superpowers per section 1. superpowers:dispatching-parallel-agents is allowed
  only in fast mode (max two helpers). Use superpowers:writing-skills when the user asks to create a
  project-specific skill (for example, a reusable STONE motion recipe).
- Motion: animation-vocabulary (turn the user's description into exact terms), animate (build),
  emil-design-eng and apple-design (feel and polish), vercel-react-view-transitions (page/route
  transitions), improve-animations and find-animation-opportunities (audits, read-only),
  mobile-native (touch and mobile feel).
- UI quality: stone-art-direction and stone-design-qa (brand fidelity), web-design-guidelines,
  break-ui (worst-case data), ui-ux-pro-max (reference data; never overrides STONE brand).
- React/Next: vercel-react-best-practices, vercel-composition-patterns.
- Engineering: engineering:architecture (ADRs), engineering:system-design,
  engineering:testing-strategy, engineering:deploy-checklist, engineering:documentation,
  security-review, code-review, simplify.
- Figma (read-only): Figma MCP read tools. Never use use_figma or other write tools here.
- STONE governance: stone-source-router (resolve guidance conflicts), stone-handoff (Claude ↔ Codex).

## 4. Agents: delegation limits
- Normal mode (default): the lead does the work and uses at most ONE helper at a time, for a clearly
  independent task or a mandatory specialist check. Fast mode is the user's choice only and allows at
  most TWO helpers with separate scopes. Helpers never spawn further agents.
- Give each helper a bounded brief: goal, files/node ids, constraints, done-when. Ask for a short
  report (150–250 words).
- Typical helpers: voltagent-lang:nextjs-developer, voltagent-lang:typescript-pro,
  voltagent-lang:react-specialist, voltagent-core-dev:auth-integration-engineer,
  voltagent-infra:deployment-engineer, voltagent-qa-sec:security-auditor,
  voltagent-qa-sec:accessibility-tester, voltagent-qa-sec:test-automator,
  voltagent-qa-sec:performance-engineer, voltagent-qa-sec:code-reviewer,
  voltagent-qa-sec:ui-ux-tester, impeccable:impeccable-finish-reviewer.
- Independent QA: the implementer never approves its own QA for significant work. Use a separate
  reviewer agent, or state honestly that independent review was not possible.

## 5. Animation protocol (inside the section 1 lifecycle)
1. Name the effect (animation-vocabulary). In superpowers:brainstorming, write a mini-spec: elements, trigger, properties,
   duration, easing/spring, interruption behaviour, exit, reduced-motion fallback and mobile behaviour.
2. Choose the tool per task and explain the choice in one line: CSS transitions/keyframes for simple
   states; Motion (motion/react) for React enter/exit, layout and gestures; View Transitions for
   route changes; GSAP only for complex scroll timelines, after approval as a new dependency.
3. Animate transform and opacity. Avoid layout-thrashing properties. Respect
   prefers-reduced-motion. Make it keyboard- and focus-safe. Do not block interaction.
4. Put motion tokens (durations, easings) in src/styles/tokens and reuse them.
5. Verify in the browser at desktop and 390px. Report the preview URL.
6. Record the animation in docs/ANIMATIONS.md: name, location, spec, tokens, and the PR.

## 6. Engineering standards
- TypeScript strict. Server-side authorization in src/server for every protected action and route.
- All strings in messages/ru.json and en.json, with parity enforced by a test.
- Keep platform-specific code only in src/server/platform/. Keep .env.example current.
- Branch naming: feat/*, fix/*, anim/*, chore/*. Use Conventional Commits. Open a PR to main. CI must be
  green. Never force-push or commit to main directly.
- Done means: spec and plan in docs/superpowers/, tests written first (TDD) and passing, CI green,
  visual check against Figma for UI changes, docs updated, verification evidence in the report.
- Superpowers for every developer: .claude/settings.json enables the superpowers plugin from
  obra/superpowers-marketplace. docs/DEVELOPMENT.md has the manual install commands.

## 7. Approval required (stop and ask)
Visual deviation from Figma or the palette/typefaces; new heavy dependencies; changes to auth, roles
or data model; hosting/adapter changes; deleting pages or features; any Figma edit (route it through the
STONE single-writer lifecycle instead).

## 8. Never
Commit or print secrets or test credentials. Enter credentials or tokens into web dashboards. Create
accounts. Rely on client-side hiding for security. Present unconfirmed prices as real. Claim tests,
deploys or reviews that did not run.

## 9. Repository notes
- Next.js 16.4 ships its own agent rules in `AGENTS.md`: read the bundled docs in
  `node_modules/next/dist/docs/` before using a Next.js API.
- Cloudflare (OpenNext) builds run only on Linux/WSL/CI; on Windows use `pnpm dev`, `pnpm build`,
  `pnpm start`. See docs/DEVELOPMENT.md.
