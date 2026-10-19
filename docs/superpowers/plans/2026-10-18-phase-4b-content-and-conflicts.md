# Phase 4b: shared product conflict checks and Site content

Authorized continuation of the approved Phase 4 spec. Preserve the verified
Promotions snapshot, Customers and auth work; no remote changes or release.

1. Reproduce full Product overwriting newer Promotions data. Add a shared monotonic
   revision to products. Product, Promotions and publish actions must compare and
   advance it atomically. Read product and translations in one snapshot; keep the
   original version paired with unsaved form data. Full updates use a single
   conditional UPDATE / translation-upsert CTE compatible with Neon HTTP. Conflicts
   write nothing. Guard first; preserve all existing editable fields and error UI.
2. Test both editor orders, concurrent writes, stale text/publication changes,
   unchanged translations on conflicts, rollback on failure, revision bounds,
   sequential saves and user input preservation. Review the additive migration.
3. Site content is limited to existing home texts ru/en (Phase 4 spec sections 2–3),
   with a fixed field allow-list and messages fallback. Inspect Figma Site content
   1440 1077:53429 / 1024 1077:56526. Keep its navigation/editor/preview composition;
   do not introduce arbitrary pages, HTML, uploads, link destinations, scheduling,
   draft/publish workflows, footer editing or a general CMS. Public interactions
   and assets remain those already approved for Home v2.
4. Add the approved site_content(key, locale, text) table locally; plain-text guarded
   edits, explicit saving, localized error handling, absent-content fallback and
   safe concurrent edits. Home reads overrides without interpreting them as ICU
   messages or HTML. Revalidate concrete locale home paths.
5. Run meaningful DB/component/browser tests, independent security/code review,
   lint/types/format/build and full e2e, inspect ru/en 1440/1024/390 screenshots.
   Save evidence and additive source copies. Do not apply remote migrations.

Production/Neon/Worker/CI verification and owner design acceptance are separate.
