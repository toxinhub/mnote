# m}note redesign safety record

## Baseline and rollback

- Production baseline commit: `ac2bb0032a8a0dab0a52709fc905f06c0b8277a1`
- Backup branch: `backup/pre-redesign-2026-10-28`
- Work branch: `redesign/admin-mobile-desktop-public-desktop`
- Production branch: `main` (left unchanged during this work).

To inspect the original version, open the backup branch in GitHub or browse the baseline commit above. Do not merge the redesign branch until the mobile regression checks and admin workflow checks pass. If a later release must be rolled back, revert the redesign merge commit on `main`; do not delete Supabase data or reset the database.

## Audit: public site

- `index.html` currently contains the public HTML, CSS and JavaScript in one file.
- The mobile UI is built by shared base styles plus media queries at `max-width:760px`, `max-width:390px`, and additional breakpoint / interaction rules (including 1050px and 1400px).
- The existing script loads only `entries` with `status=approved`; public submissions are inserted with `status=pending`.
- The note grid uses JavaScript positioning and responsive column counts. Any desktop grid override must account for this existing inline positioning.
- To protect public mobile, new public styling belongs in a separate stylesheet linked with `media="(min-width: 1024px)"`. Any new public desktop script must guard itself with the same breakpoint. Existing mobile CSS blocks and mobile event/data paths must not be rewritten.

## Audit: admin and backend

- `admin.html` currently contains its own CSS, markup and JavaScript.
- Sign-in uses the existing Supabase Auth password flow; the signed-in user is checked against `public.admin_users`.
- Existing admin operations are reads, edits, status updates and permanent deletion on `public.entries`.
- Supabase RLS is enabled on `entries` and `admin_users`. Admin update/delete policies check the authenticated user's membership in `admin_users`; public reads are limited to approved entries unless the authenticated user is an admin; public inserts must remain pending.
- Current `entries` fields include title, artist, idea, song_url, start_time, end_time, mood, platform, progress, tags, visual, status, admin_note, submitted_by, created_at and updated_at.
- The owner explicitly approved a durable admin activity log. `public.admin_activity_log` has been added as an additive schema change with RLS enabled, admin-only SELECT/INSERT policies, actor identity checks, no authenticated UPDATE/DELETE grants, and a nullable entry reference so delete records can survive entry deletion. Existing `entries` and `admin_users` structures were not changed.
- The admin UI writes approve, reject, restore, edit, permanent-delete, bulk-approve and bulk-reject events. Bulk events record the count and entry IDs. If the audit insert fails, the entry action remains completed and the UI warns that the log could not be saved.

## Planned files

- `index.html`: add only a desktop-media stylesheet link and, if needed, a desktop script include; no existing mobile rule or public-mobile behavior should be edited.
- `public-desktop.css`: desktop-only public-site presentation.
- `public-desktop.js`: optional desktop-only keyboard palette, deep-link handling and desktop enhancements; must no-op below 1024px.
- `admin.html`: retain existing sign-in and Supabase operations while adding the Activity log view and recording supported admin actions.
- `admin-redesign.css`: responsive admin-only layout; mobile bottom navigation and desktop card density.
- This file records the baseline, audit and rollback procedure.

## Database rollback note

The GitHub backup branch rolls back site code only. It intentionally does not drop `public.admin_activity_log` or delete audit records. The table is additive and safe to leave in place if the UI is reverted; removing it would destroy the audit trail and should require a separate explicit decision.

## Current implementation status

- Added the admin-only responsive stylesheet with a mobile bottom navigation bar and a desktop navigation rail.
- Added the Labels index, derived from existing `entries.tags` data (no new labels table).
- Added the Activity log view and logging for approve, reject, restore, edit and permanent delete.
- Bulk approve/reject, swipe-to-approve/reject with undo, keyboard shortcuts for selected bulk actions, and source-level CI checks are implemented. The CI run passed on the latest checked commit.
- Source-level checks confirm the original inline CSS and existing CSS media-query rules are unchanged, the mobile grid logic is retained below 1024px, and the desktop script exits below that breakpoint. This is not a pixel-level visual comparison.
- Database verification confirmed RLS is enabled on `admin_activity_log`; only authenticated users have table SELECT/INSERT grants, and policies further restrict those operations to admins. The entry foreign key uses `ON DELETE SET NULL` so permanent deletion does not erase the audit record or get blocked by it.
- Added an index for `admin_activity_log.entry_id` to cover its foreign key.
- Supabase security advisor reports one setting-level warning: leaked-password protection is disabled. This must be enabled in Supabase Auth settings; the available project tools do not expose that setting.
- Supabase performance advisor still lists unused indexes on the new activity log and an existing entries index. These are informational and expected before the related query paths have used them; do not remove them based only on this fresh-project advisory.

## Required verification before release

- Compare public site at 375px, 390px and 430px before/after; visual and behavior must remain unchanged.
- Check desktop public at 1024px, 1280px and 1920px.
- Check admin at 320px, 390px, 430px, 1024px and 1920px.
- Test submit -> pending -> admin review -> approve -> public visibility, plus reject, edit, restore/reopen and permanent delete.
- Confirm actual browser behavior before claiming pixel-identical mobile output; source inspection alone is not a visual regression test.
