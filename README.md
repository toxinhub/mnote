# m}note

A personal music journal for saving meaningful song moments, creative ideas, and visual inspiration.

## Current prototype

The initial interface is a single static page in `index.html`. It includes:

- Song and idea capture form
- Song library, idea library, visual archive, and timeline
- Search, mood filters, and progress status
- Browser-local storage and JSON export
- Responsive desktop and mobile navigation

## Important data note

This is an early prototype. Entries are stored in the current browser using `localStorage`; they are **not** synced between devices and are not protected by an account. Use **Export notes** to download a backup. Do not store sensitive information in this prototype.

## GitHub Pages

In the repository, open **Settings → Pages**. Under **Build and deployment**, select **Deploy from a branch**, choose the `main` branch and `/(root)` folder, then save. Wait for the deployment to finish before opening the published site.

## Planned next steps

1. Test and refine the interface on mobile and desktop.
2. Add a Supabase database and authentication with row-level security.
3. Migrate browser-only notes to secure cloud storage and add backup/export tools.
4. Add richer visual references and optional AI-assisted organisation.

m}note is a personal project; no music files are hosted by this prototype.
