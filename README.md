# m}note — Song journal

A small, Keep-inspired journal for saving songs, the memories and feelings attached to them, and favorite moments.

## Public journal

The GitHub Pages frontend is a static HTML page backed by Supabase.

- Browse the public library of approved song entries
- Search by song, artist, note, mood, or tag
- Explore the tag list and pinned songs
- Open a song detail view with its note, favorite moment, and YouTube links
- Submit a song entry for admin review

New public submissions are created with `pending` status. They are not displayed in the public library until an administrator approves them.

## Admin workflow

Open [admin.html](./admin.html) or use the Admin sign in link on the public page.

The existing admin page uses Supabase Auth and checks membership in `admin_users`. Admins can review pending entries, approve or reject them, and edit existing entries. The frontend redesign does not change the existing Supabase project, database records, authentication setup, or approval states.

## Data and security

- Supabase is the source of truth for song entries.
- The public page selects only entries whose status is `approved`.
- Visitor submissions use `pending` status.
- Admin operations continue to use the existing admin authentication and database policies.
- Pinned songs are stored in the current browser only; they are not account-synced.

Do not place Supabase service-role keys or other server secrets in this static repository. Public client configuration must be protected by the project's Supabase Row Level Security policies.

## GitHub Pages

In the repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select the default branch and the root folder, then save. GitHub Pages publishes the static site after the commit is built.

## Notes

This repository does not host music files. YouTube links and thumbnails are used as references.
