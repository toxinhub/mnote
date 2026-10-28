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
- The mobile layout uses the existing top bar, slide-in sidebar/backdrop, workspace, note grid, mobile create button, bottom navigation, composer and detail dialog.
- The existing script loads only `entries` with `status=approved`; public submissions are inserted with `status=pending`.
- The note grid uses JavaScript positioning and responsive column counts. Any desktop grid override must account for this existing inline positioning.
- To protect public mobile, new public styling belongs in a separate stylesheet linked with `media="(min-width: 1024px)"`. Any new public desktop script must guard itself with the same breakpoint. Existing mobile CSS blocks and mobile event/data paths must not be rewritten.

## Audit: admin and backend

- `admin.html` currently contains its own CSS, markup and JavaScript.
- Sign-in uses the existing Supabase Auth password flow; the signed-in user is checked against `public.admin_users`.
- Existing admin operations are reads, edits, status updates and permanent deletion on `public.entries`.
- Supabase RLS is enabled on `entries` and `admin_users`. Admin update/delete policies check the authenticated user's membership in `admin_users`; public reads are limited to approved entries unless the authenticated user is an admin; public inserts must remain pending.
- Current `entries` fields include title, artist, idea, song_url, start_time, end_time, mood, platform, progress, tags, visual, status, admin_note, submitted_by, created_at and updated_at.
- The current database has no activity/audit-log table. A durable log of who performed which action and when requires an explicit schema decision; no table or policy will be added without approval.

## Planned files

- `index.html`: add only a desktop-media stylesheet link and, if needed, a desktop script include; no existing mobile rule or public-mobile behavior should be edited.
- `public-desktop.css`: desktop-only public-site presentation.
- `public-desktop.js`: optional desktop-only keyboard palette, deep-link handling and desktop enhancements; must no-op below 1024px.
- `admin.html`: retain existing sign-in and Supabase operations while improving the admin UI.
- `admin-redesign.css`: admin-only responsive styling (the admin page is separate from the public page).
- This file records the baseline, audit and rollback procedure.

## Required verification before release

- Compare public site at 375px, 390px and 430px before/after; visual and behavior must remain unchanged.
- Check desktop public at 1024px, 1280px and 1920px.
- Check admin at 320px, 390px, 430px, 1024px and 1920px.
- Test submit -> pending -> admin review -> approve -> public visibility, plus reject, edit, restore/reopen and permanent delete.
- Confirm actual browser behavior before claiming pixel-identical mobile output; source inspection alone is not a visual regression test.
