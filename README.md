# Nutrika 🥗

A mobile-first web application for scanning product barcodes to discover nutritional scores, health insights, and allergen warnings. Similar to Yuka, built with Next.js 15.

![Nutrika](https://via.placeholder.com/800x400?text=Nutrika+-+Know+What+You+Eat)

## Features

- 📱 **Mobile-First Design** - PWA-ready with responsive UI
- 📷 **Barcode Scanner** - Scan EAN/UPC/QR codes using your camera
- 🎯 **Smart Scoring** - Custom 0-100 score with A-E grading
- ⚠️ **Health Insights** - Positive and negative aspects highlighted
- 🥜 **Allergen Warnings** - Severity-based allergen detection
- 👥 **User Contributions** - Add products or suggest edits
- 🛡️ **Admin Panel** - Review and moderate contributions
- 🔐 **Authentication** - Email/password and Google OAuth

## Tech Stack

- **Framework**: Next.js 15 (App Router, React Server Components)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: MongoDB with Prisma ORM
- **Authentication**: Auth.js (NextAuth.js v5)
- **Data Source**: Open Food Facts API
- **Barcode Scanning**: @zxing/library

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- (Optional) Google OAuth credentials

### Installation

1. **Clone the repository**
   ```bash
   cd nutrika
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your values:
   ```env
   DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/nutrika"
   AUTH_SECRET="generate-with-openssl-rand-base64-32"
   AUTH_GOOGLE_ID="your-google-client-id"       # Optional
   AUTH_GOOGLE_SECRET="your-google-client-secret" # Optional
   ```

4. **Generate Prisma client**
   ```bash
   npm run db:generate
   ```

5. **Push schema to database**
   ```bash
   npm run db:push
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open the app**
   
   Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
nutrika/
├── app/
│   ├── (auth)/           # Sign in/up pages
│   ├── admin/            # Admin panel
│   ├── add-product/      # Product contribution form
│   ├── product/[barcode]/ # Product detail page
│   ├── profile/          # User profile
│   ├── scan/             # Barcode scanner
│   ├── api/              # API routes
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── barcode-scanner.tsx
│   ├── score-badge.tsx
│   ├── positives-list.tsx
│   ├── negatives-list.tsx
│   ├── allergen-tags.tsx
│   └── nutrition-table.tsx
├── lib/
│   ├── auth.ts           # Auth.js config
│   ├── db.ts             # Prisma client
│   ├── openfoodfacts.ts  # OFF API client
│   ├── scoring.ts        # Score algorithm
│   ├── utils.ts          # Utilities
│   └── validators.ts     # Zod schemas
├── prisma/
│   └── schema.prisma     # Database schema
└── public/
    └── manifest.json     # PWA manifest
```

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

## Creating an Admin User

1. Create a regular user account through the UI
2. Open MongoDB shell or Atlas UI
3. Update the user's role:
   ```javascript
   db.User.updateOne(
     { email: "your@email.com" },
     { $set: { role: "ADMIN" } }
   )
   ```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Other Platforms

```bash
npm run build
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Data Attribution

Product data is sourced from [Open Food Facts](https://world.openfoodfacts.org), a free, open, collaborative database of food products from around the world.

## License

MIT License - feel free to use this project for your own purposes.

---

Made with ❤️ for healthier food choices
