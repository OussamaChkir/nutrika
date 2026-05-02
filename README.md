# Nutrika 🥗

A mobile-first web application for scanning product barcodes to discover nutritional scores, health insights, and allergen warnings. Similar to Yuka, built with Next.js 15.


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

Products are scored 0-100 based on:

| Factor | Impact |
|--------|--------|
| Sugar > 22.5g/100g | -30 points |
| Sugar > 10g/100g | -15 points |
| High saturated fat | -15 points |
| High salt | -15 points |
| Ultra-processed (NOVA 4) | -25 points |
| Bad additives (E102, E110, etc.) | -8 each |
| Good fiber | +5 points |
| High protein | +5 points |
| Organic certified | +5 points |

Score is blended with Nutriscore (60% custom + 40% Nutriscore).

### Grades

| Score | Grade | Color |
|-------|-------|-------|
| 90-100 | A | 🟢 Green |
| 75-89 | B | 🟡 Lime |
| 50-74 | C | 🟠 Orange |
| 25-49 | D | 🔴 Red |
| 0-24 | E | 🔴 Dark Red |


Made with ❤️ for healthier food choices
