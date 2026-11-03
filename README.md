# Indian Gaming Network

A desktop-first professional network for the Indian gaming industry. Gamers, testers, studios, streamers, and cosplay artists each get a role-based profile. Studios also get a Page that people can follow.

## Stack

- Next.js (App Router) and Tailwind CSS
- shadcn/ui
- Supabase Auth, Postgres, Storage, and Realtime
- Deploy target: Vercel

## What the MVP includes

- Email and password sign-up, plus a Google button once you enable that provider
- Role choice and onboarding. A studio must create a Page before finishing
- Role-specific profiles, portfolio items, and experience
- Feed posts that require a type: image, YouTube, job, or collab
- Likes and comments
- Playtest listings posted by a studio Page
- Express interest on playtests, jobs, and collabs, with an inbox to accept or decline
- Follow Pages only. There is no user-to-user follow
- Search across people, pages, posts, and playtests
- In-app alerts for comments, interest, and new followers

Payments, chat, and user-to-user follows are intentionally out of scope.

## Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql`.
3. In Authentication → Providers, keep Email enabled. For a small test group, turn off “Confirm email” so people can sign in immediately.
4. Optional: enable the Google provider and set the redirect URL to `https://your-domain/auth/callback` and `http://localhost:3000/auth/callback`.
5. In Project Settings → API, copy the project URL and the publishable key.

## Run it locally

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app shell renders without those keys, but sign-up, posts, and search need a configured project. This workspace was built before a live Supabase project was attached, so the signed-in flows were not exercised against a real database here.

## Deploy on Vercel

- Import the repository.
- Set the same three environment variables. Use your production URL for `NEXT_PUBLIC_SITE_URL`.
- In Supabase Authentication → URL configuration, add that site URL and `https://your-domain/auth/callback`.

## Product rules worth knowing

- The home feed is the whole community, newest first. “Following” shows posts published by Pages you follow.
- Every feed post must have a type. The database rejects a post that is missing the fields for that type.
- Playtests are listings on a Page. They do not appear as a fifth feed type. Job and collab posts also show on the Opportunities board.
- Profiles, pages, posts, and listings can be read without an account. Writing requires sign-in.
- `featured` columns exist on pages, posts, and playtests so a later paid placement can use them. Nothing charges money in this version.
