# Phase 5 local verification — 2026-10-18

This records local engineering evidence, not owner acceptance or a deployment.
The working branch remains `feat/phase-4-auth`, HEAD `a94afcf`; the takeover changes
are uncommitted. The preserved original handoff describes an earlier implementation.
Exact manifests, logs and current screenshots are in
`C:\Users\nartsiss\Documents\Codex\2026-10-18\task\stone-phase5`.

## Executed checks

| Check                          | Result and limits                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit suite                     | 842 passed. The initial full attempt was 840/842: two request-editor tests queried the resting label before React cleared pending. The test now waits for the label and inherited fieldset enabled state; no action, error or revision assertion was removed. The adjacent successful-save scenario has the same explicit wait.                            |
| Complete browser suite         | 611 passed, 76 project/viewport skips, zero unexpected failures, zero retries. The new profile keyboard regression runs in RU/EN on desktop/mobile. The Orders mutation test now makes one mutation, then verifies persistent feedback, focus and selected details outside a filter.                                                                       |
| Ordinary and standalone builds | Both Next builds passed. The standalone build was tested from an independent source/dependency copy including uncommitted code. Existing ordinary/OpenNext configuration is preserved.                                                                                                                                                                     |
| README-only local setup        | 22.31 seconds from new env-file creation through seed and Client/Admin login in RU/EN, using a fresh PGlite directory and the documented alternative port 3100. The original recipe lacked the `.data` parent; this was fixed before the successful run.                                                                                                   |
| Prerequisites                  | Existing Node 24.14.0, npm 11.9, pinned installed dependencies and Chromium. Dependencies were copied with rebased junctions, not installed from the registry. The pnpm shim/cache was absent; the documented installed-tool fallback was used. Cold registry install and cold font download timing are not established.                                   |
| Relocated Node runtime         | 55 dependency links remain internal; `NODE_PATH` empty. Runs from a separate directory without source checkout resolution. Database health, Client/Admin sessions, guest guard, RU/EN routes and profile persistence across a server restart passed. All 17 observed CSS/font/image resources returned 200 when fetched without conditional cache headers. |
| Platform limits                | Windows runtime only. Docker/Podman/nerdctl were absent from PATH and normal installation locations; WSL returned help and had no installed-distro registry entries. No Linux environment was provisioned, and no Docker/OpenNext/Worker result is claimed.                                                                                                |

Final lint, format, explicit typecheck and preservation details are recorded in the
milestone's `verification-summary.json`. The complete browser suite also covers
the existing serious/critical axe gates and public carousel reduced-motion checks.
It does not establish every WCAG criterion, screen-reader behavior, remote database
behavior or Cloudflare CPU headroom.

## Verified fixes

- `ProfileForms.tsx`: entering edit mode focuses Name; Cancel and confirmed Save
  return focus to Edit. If disabling the input during an Enter submit leaves focus
  on BODY, a failed save restores Name. It does not move focus away from another
  intentionally focused element. Four component tests and four browser instances
  cover the transition and invalid Enter submission.
- `OrderStatusForm.tsx`, `OrdersView.tsx`, admin Orders page: refreshing status no
  longer remounts the selected form and discards success/focus. The stable order
  key and pinned selection retain the detail when a status filter excludes the
  updated row; RU/EN explain why the detail remains open. Pending submit prevents
  duplicate mutation while keeping the submit control focusable.
- `Favorites.tsx`: the mobile Account link keeps its full label in both locales.
  A shrinking link truncated Russian at 390 px; preventing shrink alone caused
  overflow at 320 px, so the header also wraps below 390 px. All six RU/EN checks
  at 320, 390 and 1440 have document width equal to viewport width; at the two
  mobile widths label and text widths agree (EN 102 px, RU 111 px).
- `TabBar.tsx`: independent review found adjacent RU labels overlapping at 320 px.
  Below 360 px only, reduced inner padding and label-based item widths separate
  labels while retaining the 12 px font, 52 px height and at least 44 px touch width.
  The existing browser test now checks actual text rectangles in RU/EN at 320,
  360, 375 and 390 px; it failed before the fix. The 390 px Figma geometry is retained.
- Node package: include public/static assets and migration SQL; reject build env
  files; remove inherited runtime credentials from the build child. Normalize
  traced Windows dependency junctions, and rebase them for relocation. Refuse an
  external/missing link, existing destination, physical source alias and missing
  filesystem root before copying. Only generated artifact links are rewritten.

The original `/en/admin/orders` intermittent axe failure has **no established
historical cause**. These reproducible focus/feedback defects are separate findings;
green reruns do not retrospectively diagnose that failure.

## Visual, keyboard and motion evidence

`screenshots/` contains current RU/EN auth/account frames at 1440 and 390 and admin
frames at 1440 and 1024. The core matrix is 44 captures: sign-up, sign-in, sign-out,
account Overview/Orders/Favorites/Profile and admin Overview/Products/Add product/
Orders. Eight additional captures show the open sections menu, invalid profile
name and reflow states in both languages. Additional validation/empty/unavailable
states are retained with `state-verification.json`: 18 validation, password-error,
empty Orders/Favorites and auth-unavailable captures. Two further 320 px Account
captures bring the current set to 72 PNGs. The four core Account captures were
refreshed after the label fix; previous images remain in separate pre-fix folders.

`visual-pairs/` has 22 current EN/cached Figma comparisons and 22 EN/RU comparisons.
References are the existing `tests/visual/figma/pages-phase4a` PNGs and
`pagesPhase4a` map; they were not fetched anew or edited. Sign-in has no own frame
and uses the approved sign-up layout reference. Screenshot comparisons are visual
review evidence, not a pixel-percentage pass gate or owner approval.

The captures retain the real fixed mobile tab bar at the first viewport bottom.
The historical comparison script moved it to the document bottom for its montage;
that capture-method difference must not be mistaken for a layout change.

Keyboard and computed-style checks in both locales established:

- Sections open via Enter; Tab reaches links; Escape closes the disclosure and
  returns focus to its trigger. Profile Edit/invalid Enter/Cancel/Save retain focus.
- Normal motion: button transition `0.18s`, spinner `spin` with `1s` duration.
  Reduced motion: transition `0s`, spinner `none`/`0s`. Pending `aria-busy` remains
  true and the operation completes with focus restored.
- Account profile reflows without horizontal overflow at a 720×450 CSS viewport,
  equivalent in available layout space to 1440×900 at 200% browser zoom. This is
  explicitly a viewport reflow test; native browser zoom and a screen reader were
  not exercised. Below 1024 CSS pixels the approved admin notice replaces its
  controls. Consequently desktop admin operation at that effective zoom width
  remains a documented accessibility/owner decision, not a silent redesign.

Independent visual review conclusions are retained in the final milestone report.
All original owner checklist boxes remain pending, including Russian wording,
states without frames, sign-out shell and data-model differences.

## Test-environment findings retained

The first source export was inside an unrelated ancestor repository whose ignore
rule excluded its directory. Tailwind scanned zero files and emitted only 7,346
bytes of global CSS. A controlled scanner matrix excluded dependency-copy damage:
both identical native modules gave 203 files/4,172 candidates from the original
checkout cwd and zero from the export cwd. Giving only the disposable export its
own Git boundary restored the original 78,055-byte CSS. No ancestor ignore file was
changed; an exploratory application CSS change was removed. This was a validation
environment failure, not a shipped CSS defect.

The sandbox user's SWC cache ownership check rejected one build attempt; running
under the normal Windows user succeeded without changing permissions or security
settings. Earlier runtime harness attempts also exposed overly broad duplicate
text selectors, a listener attached after font loading, legitimate HTTP 304
revalidation and a pending button's changing accessible name. Those harness issues
were corrected and their logs retained; they are not reported as application bugs.

## Remaining acceptance and release gates

No migration, seed or authenticated runtime was executed on remote Neon. See
[`NEON_STONE_TEST_PLAN.md`](../NEON_STONE_TEST_PLAN.md) for the exact `stone-test`
target, the synthetic-data-only US region approval, preservation of existing `neon_auth`,
the complete migration history, recovery preflight and concrete runtime/CPU validation sequence.

Linux Docker/OpenNext verification, compressed Worker size/auth deduplication,
real Worker auth CPU, preview persistence, exact-commit CI, asset rights, final
copy and owner acceptance remain open. Nothing was pushed, merged or deployed.
Owner clarification on 2026-10-18: this is a test version for customer approval,
then source handover to another development team. Real payment/email integrations
and commercial operations are not demo blockers. At this Phase 5 checkpoint,
public creation/photo submission was unimplemented; its subsequently approved
implementation and new verification are in [public-request-demo.md](public-request-demo.md).
The Phase 5 request evidence above covers seeded admin records only.
A commercial launch would need separate requirements
and security/data-residency decisions under `SECURITY.md`.
