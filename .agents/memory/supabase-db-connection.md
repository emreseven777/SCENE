---
name: Supabase DB connection string
description: Why psql to the user's Supabase pooler failed and how to recover
---
The Supabase dashboard shows the URI with `[YOUR-PASSWORD]`; the user pasted it keeping the square brackets, and the password itself was also wrong (failed with and without brackets).
**Why:** pooler returns "password authentication failed" and nothing else, which is easy to misread as a username/host problem.
**How to apply:** ask the user to reset the DB password in Supabase (Project Settings → Database) and re-save SUPABASE_DB_URL without brackets; the Session pooler URI (port 5432) is fine. Fallback: user pastes the migration into the Supabase SQL Editor.
