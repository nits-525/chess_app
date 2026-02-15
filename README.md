# Chess Arena

Anonymous real-time online chess — play against random opponents with synchronized timers. Built with React, Vite, TypeScript, and Firebase Realtime Database.

## Local development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure Firebase**  
   Copy `.env.example` to `.env` and fill in your Firebase project values (from [Firebase Console](https://console.firebase.google.com) → Project settings → Your apps).

3. **Run dev server**
   ```bash
   npm run dev
   ```
   Open the URL shown (e.g. http://localhost:5173).

4. **Build**
   ```bash
   npm run build
   ```
   Output is in `dist/`. Use `npm run preview` to test the production build locally.

## Deploy to GitHub Pages

1. **Push the repo to GitHub**  
   Use the default branch name `main` (the workflow triggers on `push` to `main`).

2. **Enable GitHub Pages**  
   In the repo: **Settings → Pages**  
   - **Source**: GitHub Actions  
   (No need to choose a branch; the workflow deploys the built site.)

3. **Optional: Firebase in production**  
   To use your own Firebase project on the live site, add [repository secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets) and pass them in the workflow:
   - In **Settings → Secrets and variables → Actions**, add:
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_DATABASE_URL`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_APP_ID`
   - In `.github/workflows/deploy-pages.yml`, under the “Build for GitHub Pages” step, add these to the `env` block (see [Using secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets#using-encrypted-secrets-in-a-workflow)).  
   If you don’t set them, the app still builds and runs with the placeholder config (matchmaking and games won’t work until real config is provided).

4. **Deploy**  
   Push to `main` or run the “Deploy to GitHub Pages” workflow manually (**Actions** tab → **Run workflow**).  
   The site will be at: `https://<your-username>.github.io/<repo-name>/`.

## Project structure

- `src/` — React app (matchmaking, game screen, board, timers)
- `src/controller/` — Game state and Firebase sync
- `src/engine/` — Chess rules (chess.js)
- `src/firebase/` — Firebase config, matchmaking, game sync
- `public/` — Static assets; `.nojekyll` ensures GitHub Pages doesn’t use Jekyll

## License

MIT
