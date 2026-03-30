# WorshipFlow — Deployment Guide

## What you have
A full React app connected to Supabase (database + file storage) and Spotify.

---

## Step 1 — Install Node.js (one time only)
1. Go to https://nodejs.org
2. Download the "LTS" version and install it
3. Open Terminal (Mac) or Command Prompt (Windows)
4. Type `node -v` and press Enter — you should see a version number

---

## Step 2 — Set up the project on your computer
1. Download the worshipflow folder I gave you
2. Open Terminal and navigate to it:
   ```
   cd path/to/worshipflow
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Test it locally:
   ```
   npm start
   ```
   The app should open at http://localhost:3000

---

## Step 3 — Push to GitHub (free)
1. Go to https://github.com and create a free account
2. Click "New repository", name it `worshipflow`, make it **Private**
3. In Terminal inside your worshipflow folder:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/worshipflow.git
   git push -u origin main
   ```
   NOTE: The .env file is in .gitignore — your secrets stay safe.

---

## Step 4 — Deploy to Vercel (free)
1. Go to https://vercel.com and sign up with your GitHub account
2. Click "New Project"
3. Import your `worshipflow` repository
4. Before deploying, click "Environment Variables" and add these one by one:

   | Name | Value |
   |------|-------|
   | REACT_APP_SUPABASE_URL | https://xablulequmenjmtpotin.supabase.co |
   | REACT_APP_SUPABASE_ANON_KEY | (your anon key) |
   | REACT_APP_SPOTIFY_CLIENT_ID | e361174b2e6f4808b4b531a10d8a93e7 |
   | REACT_APP_SPOTIFY_CLIENT_SECRET | (your client secret) |
   | REACT_APP_SPOTIFY_REDIRECT_URI | https://YOUR-APP.vercel.app/callback |

5. Click Deploy — Vercel builds and hosts it automatically
6. You'll get a URL like `https://worshipflow-abc123.vercel.app`

---

## Step 5 — Update Spotify redirect URI
1. Go back to https://developer.spotify.com
2. Open your WorshipFlow app > Settings
3. Add your real Vercel URL to Redirect URIs:
   `https://your-app.vercel.app/callback`
4. Save

---

## Step 6 — Update Vercel environment variable
1. In Vercel > your project > Settings > Environment Variables
2. Update `REACT_APP_SPOTIFY_REDIRECT_URI` to your real URL
3. Redeploy (Vercel > Deployments > click the three dots > Redeploy)

---

## You're live!
- Director app: `https://your-app.vercel.app`
- Band view: `https://your-app.vercel.app/band`

Share the /band link with your team. Every time you update This Week and finalize the set, they see it instantly.

---

## Updating the app going forward
Any time you make changes:
```
git add .
git commit -m "describe what changed"
git push
```
Vercel auto-deploys every push. Done.
