# Telc Deutsch A2 · B1 Vocabulary App

A vocabulary study app for Telc German A2 and B1 exams with:
- 🇩🇪 German words with articles, plurals, conjugations
- 🇬🇧 English meanings (multiple per word)
- 🇧🇩 Bengali translations
- 📚 Vocab list with search & filters (seeded randomization)
- 🃏 Anki-style flashcards with SRS scoring
- ❓ Quiz mode (multiple choice)
- 📊 Progress stats
- 🔐 Google Sign-In with Firebase Firestore for cross-device sync
- 👤 Guest mode for local-only learning

## Progress Sync

**Two modes available:**
- **Guest Mode**: Learn locally with browser storage only
- **Signed In**: Sign in with Google to sync progress across devices via Firebase

On first visit, choose your mode. Switch anytime via the header button.

## Development

```bash
npm install
npm run dev
```

## Deploy

Push to `main` branch → GitHub Actions deploys to GitHub Pages automatically.

## Adding words

Edit `src/data/a2.json` or `src/data/b1.json` to add more words.
