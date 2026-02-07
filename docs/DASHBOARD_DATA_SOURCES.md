# Dashboard Data Sources Audit

## Summary

✅ **Good news**: The dashboard already uses **real MongoDB data**. No CSV files exist in this project.

---

## Current Data Sources

### Dashboard Page (`app/admin/page.tsx`)

| Data | Source | Type |
|------|--------|------|
| Books, CDs, DVDs, Clips, Lyrics, Messages, Photos, Shows, Texts counts | MongoDB via Mongoose | ✅ Real |
| CD/DVD Track counts | MongoDB `components_*_tracks` collections | ✅ Real |
| Latest 5 updated items | MongoDB `.find().sort({updatedAt: -1}).limit(5)` | ✅ Real |
| Cloudinary usage (storage, bandwidth) | `cloudinary.api.usage()` | ✅ Real (read-only) |

### Cloudinary Operations

| File | Operation | Safety |
|------|-----------|--------|
| `lib/cloudinary.ts` | `usage()` only | ✅ Read-only |
| `lib/cloudinary-helpers.ts` | Soft delete (marks `deleted: true` in DB) | ✅ Safe |
| `lib/upload.ts` | Uses soft delete via cloudinary-helpers | ✅ Safe |
| `scripts/cleanup-cloudinary.ts` | `uploader.destroy()` | ⚠️ Manual script with confirmation |

---

## Risk Assessment

| Item | Risk | Mitigation Needed |
|------|------|-------------------|
| CSV mock data | **None** - CSVs don't exist | N/A |
| Cloudinary destructive ops | **Low** - only in manual script | Add `DISABLE_CLOUDINARY_DELETE` guardrail |
| Dashboard fake data | **None** - uses real MongoDB | N/A |

---

## Recommended Actions

1. **Cloudinary Safety**: Add env guardrail `DISABLE_CLOUDINARY_DELETE=true` to block `destroy()` calls
2. **Shows Soft Delete**: Implement `showStatus` field as planned
3. **Messages Rate Limit**: Add time-based anti-spam as planned

No CSV removal needed - they don't exist.
