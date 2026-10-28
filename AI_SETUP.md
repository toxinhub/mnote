# Gemini AI setup for m}note

The main site now includes a Gemini-powered draft assistant for rewriting a note, suggesting a mood, suggesting labels, summarizing a note, and searching the already-approved song library.

## One-time setup

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey). Review the current Gemini API free-tier quotas and data-use terms before using it.
2. Open the [mnote Supabase Edge Function secrets page](https://supabase.com/dashboard/project/ekaxlxudxpkkozbyslub/functions/secrets).
3. Add a secret with:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** your Gemini API key
4. Save the secret. Supabase makes new function secrets available without another deployment.
5. Open [mnote](https://toxinhub.github.io/mnote/), refresh, open **New note**, and try one of the **AI assistant** actions.

**Never paste the Gemini API key into `index.html`, `admin.html`, GitHub, or a public issue.** The key is read only by the `mnote-ai` Edge Function.

## What the implementation does

- Calls Gemini from the Supabase Edge Function; the browser never receives the Gemini key.
- Offers **Rewrite note**, **Suggest mood**, **Suggest labels**, **Summarize**, and **Search my library**.
- Shows a preview first. Nothing is copied into the draft unless the user chooses **Use suggestion**.
- AI actions do not insert, update, approve, or reject database rows. The existing submit flow still creates a `pending` entry and the existing admin approval workflow remains in charge.
- Library search sends only a limited set of already-approved entries needed for matching. It does not send pending or rejected entries.
- The function accepts requests only from the published GitHub Pages origin and includes a best-effort per-instance rate limit and input-size limits. Origin checks are not a substitute for quotas; keep an eye on Gemini usage and configure provider-side limits where available.

## Troubleshooting

- **“Gemini is not configured yet”** — add `GEMINI_API_KEY` in the Supabase secrets page above.
- **“Gemini free-tier limit reached”** — wait for the provider quota window to reset or check the current limits in Google AI Studio.
- **Origin not allowed** — the published origin is `https://toxinhub.github.io`. For local testing, the function allows `localhost:4173` and `127.0.0.1:4173`.
- AI-generated text is a suggestion; check it before using it. It is never saved automatically.
