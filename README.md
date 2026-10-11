# Nutrika 🥗

A mobile-first web application for scanning product barcodes to discover nutritional scores, health insights, and allergen warnings. Built with Next.js 15.


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


Made with ❤️ for healthier food choices
