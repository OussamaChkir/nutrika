# Nutrika 🥗

A mobile-first web application for scanning product barcodes to discover nutritional scores, health insights, and allergen warnings. Built with Next.js 16.


## Features

- 📱 **Mobile-First Design** - PWA-ready with responsive UI
- 📷 **Barcode Scanner** - Scan EAN/UPC/QR codes using your camera
- 🎯 **Smart Scoring** - Custom 0-100 score with A-E grading
- ⚠️ **Health Insights** - Positive and negative aspects highlighted
- 🥜 **Allergen Warnings** - Severity-based allergen detection
- 👥 **User Contributions** - Add products or suggest edits
- 🛡️ **Admin Panel** - Review and moderate contributions
- 🔐 **Authentication** - Email/password and Google OAuth


## Scoring Algorithm

Products start with a base score of **75 points** (clamped between 0 and 100) and are adjusted based on nutritional values, processing level, additives, and labels:

| Factor | Condition | Impact |
|--------|-----------|--------|
| **Sugar** | > 22.5g / 100g | -20 points |
| | > 10g / 100g | -10 points |
| | < 5g / 100g | +3 points |
| **Saturated Fat** | > 5g / 100g | -10 points |
| | < 1.5g / 100g | +3 points |
| **Salt** | > 1.5g / 100g | -10 points |
| | < 0.3g / 100g | +3 points |
| **Fiber** | > 3g / 100g | +8 points |
| **Protein** | > 10g / 100g | +8 points |
| **NOVA Group** | Group 4 (Ultra-processed) | -10 points |
| | Group 3 (Processed) | -5 points |
| | Group 1 (Unprocessed / Minimally processed) | +8 points |
| **Additives** | Controversial additives (E102, E250, E951, etc.) | -6 points each (max -20) |
| | Zero additives | +5 points |
| **Labels & Certifications** | Organic / Bio | +5 points |
| | Fair-trade | +3 points |
| | Vegan | +3 points |
| | Vegetarian | +2 points |

When Nutri-Score is available, the final score is blended:
- **80%** custom score + **20%** Nutri-Score baseline (`50` + Grade bonus: A: +10, B: +5, C: 0, D: -5, E: -10).

### Grades

| Score | Grade | Color |
|-------|-------|-------|
| 85–100 | A | 🟢 Green |
| 70–84 | B | 🟡 Lime |
| 50–69 | C | 🟠 Orange |
| 30–49 | D | 🔴 Red |
| 0–29 | E | 🔴 Dark Red |


## Development

```bash
cp .env.example .env     # fill in the values
npm install
npm run dev              # http://localhost:3000
npm test                 # unit tests (scoring)
```


## AI score explanations

Product pages can show an "Explain this score" card: a short, plain-language explanation of
the score, written by an LLM in the user's language (English or French). It is served by the
separate [nutrika-ai](https://github.com/OussamaChkir/nutrika-ai) service (FastAPI + Gemini).

- The LLM only explains values already computed by `lib/scoring.ts`; it never changes them.
- Explanations are cached in MongoDB (`ProductExplanation`) per product, language and prompt
  version, so each one is generated once. A changed score invalidates the cache.
- Generating a new explanation requires a signed-in user (10 per hour). Cached ones are public.
- The feature is off unless `NUTRIKA_AI_URL` is set.

```bash
# 1. run nutrika-ai (see its README), then in this repo's .env:
NUTRIKA_AI_URL="http://localhost:8000"
NUTRIKA_AI_KEY=""            # must equal SERVICE_API_KEY on the service, if you set one
# 2. create the new collection's index and regenerate the client
npx prisma db push && npx prisma generate
```


Made with ❤️ for healthier food choices
