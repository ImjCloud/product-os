# Prototype-to-2.0 migration map

The import workflow reads the original browser state saved under `product-os-v1` and maps each legacy project into an organisation-scoped Product OS product. The original export is retained in the `LegacyImport.sourcePayload` JSON field for audit and recovery.

| Prototype (`Product OS.html`) | Product OS 2.0 destination | Mapping notes |
|---|---|---|
| `S.proj[]` | `Product` | Legacy project IDs are mapped to Product IDs; products are matched by name within the selected organisation. |
| `S.fb[]` | `ActionItem` | The original UI labels this collection Action points. `text` → `title`; `status` Open/In-progress/Done → TODO/IN_PROGRESS/DONE; severity → priority; `owner` → `assigneeLabel`; `due` → `dueAt`; `req` → `requirementId`. Source, segment, theme, sentiment, link and reference are preserved in the description and original payload. |
| `S.req[]` | `Requirement` | `title`, `problem`, `story` → `userStory`, `ac` → `acceptance`, `status`, `owner`, `reach`, `impact`, `conf` → `confidence`, `effort`, and `rel` → `releaseId`. |
| `S.rel[]` | `Release` + `ReleaseCheck[]` | `ver` → `version`, `date` → `targetDate`, `status`, `ck` → five checklist rows, and `log` → decision log. A legacy Ready release with incomplete checks is imported as Planning. |
| `S.met[]` | `Metric` | `name`, `base` → `baseline`, `target`, `act` → `actual`, `rel` → `releaseId`, `date` → `reviewDate`. Direction defaults to HIGHER_IS_BETTER because the legacy model did not store direction. |

## Safeguards and behaviour

1. The API validates the export structure with Zod before preview or import.
2. Preview reports counts, broken relationship references, missing projects, invalid dates and legacy Ready releases with incomplete checklists.
3. Commit is transactional and organisation-scoped; write permissions are required.
4. Legacy project, requirement and release IDs are mapped to new database IDs before dependent records are inserted.
5. Broken requirement/release references are left unassigned and surfaced in preview warnings.
6. Existing workspace data is not deleted. Existing products are matched by name; existing releases with the same product/version are reused without overwriting their checklist or decision history.
7. An organisation-scoped SHA-256 fingerprint rejects an exact repeat import.
8. The original normalized source payload, import counts, warnings and audit event are retained.

See [LEGACY_IMPORT.md](./LEGACY_IMPORT.md) for user steps.
