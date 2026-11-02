// Read-only: which additives show up most in YOUR data? That is the first batch for F6.
//
//   node scripts/top-additives.mjs            # top 50
//   node scripts/top-additives.mjs --limit 80
//
// Needs DATABASE_URL (same as the app, e.g. from .env) and a generated Prisma client
// (`npx prisma generate`, already part of `npm run build`). It only reads: no writes.
// Output: a table, then JSON you can paste back into the chat or into a spreadsheet.
//
// Two counts per additive:
//   products: how many saved products contain it
//   scans:    how many scan-history rows point at a product that contains it (what users see most)
// Sorted by scans, then products. Codes are normalized like the app does ("en:e150d" -> "E150d").

import { PrismaClient } from "@prisma/client";

const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? Math.max(1, Number(process.argv[limitArg + 1]) || 50) : 50;

function normalize(raw) {
    const cleaned = String(raw).trim().replace(/^[a-z]{2}:/i, "").split("-")[0].replace(/\s+/g, "");
    const m = /^E(\d{3,4})([A-Za-z]{0,2})$/i.exec(cleaned);
    return m ? `E${m[1]}${m[2].toLowerCase()}` : null;
}

const prisma = new PrismaClient();
try {
    const products = await prisma.product.findMany({
        where: { status: "APPROVED" },
        select: { id: true, name: true, offData: true },
    });
    const scans = await prisma.scanHistory.findMany({ select: { productId: true } });

    const scansPerProduct = new Map();
    for (const s of scans) scansPerProduct.set(s.productId, (scansPerProduct.get(s.productId) ?? 0) + 1);

    const stats = new Map(); // code -> { products, scans, examples }
    for (const p of products) {
        const tags = p.offData && typeof p.offData === "object" ? p.offData.additives_tags : null;
        if (!Array.isArray(tags)) continue;
        const codes = new Set(tags.map(normalize).filter(Boolean));
        for (const code of codes) {
            const s = stats.get(code) ?? { products: 0, scans: 0, examples: [] };
            s.products += 1;
            s.scans += scansPerProduct.get(p.id) ?? 0;
            if (s.examples.length < 2) s.examples.push(p.name);
            stats.set(code, s);
        }
    }

    const top = [...stats.entries()]
        .sort((a, b) => b[1].scans - a[1].scans || b[1].products - a[1].products || a[0].localeCompare(b[0]))
        .slice(0, LIMIT)
        .map(([code, s]) => ({ code, ...s }));

    console.log(`Approved products: ${products.length}, scan rows: ${scans.length}, distinct additives: ${stats.size}\n`);
    console.table(top.map((t) => ({ code: t.code, products: t.products, scans: t.scans, example: t.examples[0] ?? "" })));
    console.log("\nJSON:\n" + JSON.stringify(top.map(({ code, products, scans }) => ({ code, products, scans })), null, 2));
} finally {
    await prisma.$disconnect();
}
