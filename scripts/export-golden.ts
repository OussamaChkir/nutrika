/**
 * Export an evaluation set for the nutrika-ai service.
 *
 *   npx tsx scripts/export-golden.ts --out ../nutrika-ai/evals/golden.jsonl
 *
 * Options:
 *   --out <file>            where to write the JSONL (default: print to stdout)
 *   --per-category <n>      products per category (default 5, about 60 candidates in total)
 *   --country <tag>         Open Food Facts country tag (default en:france)
 *   --categories a,b,c      override the category tags
 *
 * Needs internet access (Open Food Facts). It waits about 6.5 s between searches to respect
 * their rate limit, so a full run takes roughly 80 seconds.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildGoldenSet, discoverProducts, makeTranslator, type Translators } from "./golden";

function arg(name: string): string | undefined {
    const i = process.argv.indexOf(`--${name}`);
    return i !== -1 ? process.argv[i + 1] : undefined;
}

function loadTranslators(): Translators {
    const make = (locale: "en" | "fr") => {
        const messages = JSON.parse(
            readFileSync(resolve(__dirname, `../messages/${locale}.json`), "utf-8")
        );
        return makeTranslator(messages.ScoreMessages);
    };
    return { en: make("en"), fr: make("fr") };
}

async function main() {
    const out = arg("out");
    const products = await discoverProducts({
        perCategory: Number(arg("per-category") ?? 5),
        country: arg("country") ?? "en:france",
        categories: arg("categories")?.split(",").map((c) => c.trim()),
        onWarn: (message) => console.error(`warning: ${message}`),
    });
    console.error(`fetched ${products.length} products`);

    const { cases, skipped } = buildGoldenSet(products, loadTranslators());
    console.error(`built ${cases.length} cases, skipped`, skipped);

    const jsonl = cases.map((c) => JSON.stringify(c)).join("\n") + "\n";
    if (out) {
        writeFileSync(out, jsonl);
        console.error(`wrote ${out}`);
    } else {
        process.stdout.write(jsonl);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
