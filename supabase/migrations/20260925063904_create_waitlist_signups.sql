/*
# Create waitlist_signups table

1. New Tables
- `waitlist_signups`
  - `id` (uuid, primary key)
  - `email` (text, unique, not null) — the email address submitted via the landing page signup form
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `waitlist_signups`.
- INSERT-only public policy: anyone (anon + authenticated) can submit their email to join the waitlist. No SELECT/UPDATE/DELETE is granted publicly, so submitted emails cannot be read or modified through the anon key. This is an intentionally public write-only collection table.

3. Important notes
- This is a no-auth landing page; the app never renders a sign-in screen, so the anon-key client must be able to insert. The policy uses `TO anon, authenticated`.
- Only an INSERT policy is created. There is intentionally no SELECT policy for anon/authenticated, so the public cannot enumerate emails.
*/

CREATE TABLE IF NOT EXISTS waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_waitlist" ON waitlist_signups;
CREATE POLICY "anon_insert_waitlist"
ON waitlist_signups FOR INSERT
TO anon, authenticated
WITH CHECK (true);
