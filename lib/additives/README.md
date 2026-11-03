# Additive explanations (F6)

A curated knowledge base: one JSON file per additive in `data/`, validated by `schema.ts`.
Nothing is generated live. The product page shows an entry only when it is **reviewed**.

## Add or change an entry

1. Copy an existing file in `data/` to `e<code>.json` (lower case, e.g. `e330.json`).
2. Fill every field in English and French. Tone rules: no fear words, say what is known and
   what is not, quote a regulator's wording instead of inventing one.
3. Add at least one https source (EFSA opinion, JECFA, EU regulation). Open it and check each
   claim against it. If you could not, say so in `review.notes`.
4. Register the file in `registry.ts` (one import and one array entry).
5. Run `npm test`. The tests check the schema, EN/FR, wording, sources and the registry.

## Review

New entries start as `"status": "draft"`. Drafts are hidden in production (visible in
development and Storybook, with a "Draft" notice). To publish, a person who checked the
sources sets:

```json
"review": { "status": "reviewed", "reviewedAt": "2026-11-20", "reviewer": "Name", "notes": "" }
```

## Which additives first

`node scripts/top-additives.mjs` (read-only) lists the additives that appear most in your
saved products and scan history. Start with those.

## Switching it on

`NEXT_PUBLIC_FF_INGREDIENT_EXPLANATIONS=1` (needs a redeploy). The section only appears on a
product that has at least one reviewed additive.
