// F5: OPT-IN live evaluation of label reading on real photos. Skipped unless LABEL_EVAL_DIR is set.
//
// 1. Put ~30 label photos in a folder, each with a same-named .json file typed from the package:
//      biscuit.jpg + biscuit.json  ->  { "allergensContains": ["blé","lait"], "allergensMayContain": ["arachides"],
//                                        "ingredientsText": "...", "nutrition": { "sugars": 25, "salt": 0.6 } }
//    Include French, Arabic and English labels, tables per 100 g and per serving, drinks, and some bad photos.
// 2. Run (your key and model name; this spends your Gemini quota, about 1 request per photo):
//      LABEL_EVAL_DIR=./label-eval GEMINI_API_KEY=... GEMINI_MODEL=... \
//        npx vitest run --config vitest.unit.config.mts lib/label/eval.live
// 3. Read the printed table. The bar: nutrition right on >= 85% of labels and NO missed allergen.
//
// Photos are sent to Google exactly as in the app: use only your own test photos of product labels.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { compareCase, summarize, type CaseResult, type Expected } from "./eval";
import { extractLabel } from "./gemini";
import { sniffImageType } from "./image";

const dir = process.env.LABEL_EVAL_DIR;
const apiKey = process.env.GEMINI_API_KEY ?? "";
const model = process.env.GEMINI_MODEL ?? "";

describe.skipIf(!dir || !apiKey || !model)("label reading on real photos (live)", () => {
    it("meets the roadmap bar", async () => {
        const photos = readdirSync(dir!).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
        const results: CaseResult[] = [];
        const failures: string[] = [];
        for (const file of photos) {
            const base = file.replace(/\.[^.]+$/, "");
            const bytes = new Uint8Array(readFileSync(join(dir!, file)));
            const mimeType = sniffImageType(bytes);
            if (!mimeType) { failures.push(`${file}: not a JPEG, PNG or WebP`); continue; }
            let expected: Expected = {};
            try { expected = JSON.parse(readFileSync(join(dir!, `${base}.json`), "utf8")) as Expected; } catch { failures.push(`${file}: missing or invalid ${base}.json`); continue; }
            const out = await extractLabel({ imageBase64: Buffer.from(bytes).toString("base64"), mimeType, apiKey, model });
            if (!out.ok) { failures.push(`${file}: reading failed (${out.error})`); continue; }
            results.push(compareCase(base, expected, out.extraction.form));
            await new Promise((r) => setTimeout(r, 7000)); // stay under a 10 requests/minute limit
        }
        console.table(results.map((r) => ({ name: r.name, nutrients: `${r.nutrientsRight}/${r.nutrientsChecked}`, wrong: r.wrongNutrients.join(","), missedAllergens: r.missedAllergens.join(","), ingredientRecall: r.ingredientRecall === null ? "" : r.ingredientRecall.toFixed(2), CRITICAL: r.criticalMiss ? "YES" : "" })));
        console.log("Summary:", summarize(results), failures.length ? `\nNot evaluated:\n${failures.join("\n")}` : "");
        expect(summarize(results).passes).toBe(true);
    }, 30 * 60 * 1000);
});
