// F5: read a label photo with Google's Gemini API.
//
// Order of checks (cheapest and safest first): flag, signed in, key configured, region rule,
// consent for the CURRENT tier, size, real file type, daily limits. The photo is held in memory
// only: it is never written to disk or the database, and neither it nor the result is logged.
// Failures that are ours or Google's give the scan back.

import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/flags";
import { checkRegion, parseDailyBudget, parseTier } from "@/lib/label/access";
import { extractLabel, isValidModelName } from "@/lib/label/gemini";
import { MAX_UPLOAD_BYTES, sniffImageType } from "@/lib/label/image";
import { refundScan, reserveScan } from "@/lib/label/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const json = (body: unknown, status = 200) =>
    NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
    if (!isFeatureEnabled("labelScan")) return json({ ok: false, error: "disabled" }, 404);

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return json({ ok: false, error: "unauthorized" }, 401);

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const model = process.env.GEMINI_MODEL?.trim() ?? "";
    if (!apiKey || !isValidModelName(model)) return json({ ok: false, error: "not_configured" }, 503);

    const tier = parseTier(process.env.GEMINI_TIER);
    const access = checkRegion(tier, request.headers.get("x-vercel-ip-country"));
    if (!access.allowed) return json({ ok: false, error: access.reason }, 403);

    // Refuse huge bodies before reading them.
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_UPLOAD_BYTES + 64 * 1024) return json({ ok: false, error: "too_large" }, 413);

    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return json({ ok: false, error: "bad_request" }, 400);
    }

    // The user agreed to the text that matches the CURRENT tier. If the tier changed since the
    // screen was opened, they must see the new text first.
    if (form.get("consent") !== tier) return json({ ok: false, error: "consent_required" }, 409);

    const file = form.get("image");
    if (!(file instanceof File) || file.size === 0) return json({ ok: false, error: "bad_request" }, 400);
    if (file.size > MAX_UPLOAD_BYTES) return json({ ok: false, error: "too_large" }, 413);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = sniffImageType(bytes);
    if (!mimeType) return json({ ok: false, error: "bad_type" }, 415);

    const reservation = await reserveScan(userId, parseDailyBudget(process.env.GEMINI_DAILY_BUDGET));
    if (!reservation.ok) return json({ ok: false, error: reservation.reason }, 429);

    const result = await extractLabel({ imageBase64: Buffer.from(bytes).toString("base64"), mimeType, apiKey, model });
    if (!result.ok) {
        // Not the user's fault (Google busy, bad output, our setup): give the scan back.
        await refundScan(reservation.id);
        const status = result.error === "busy" ? 503 : result.error === "config" ? 502 : result.error === "timeout" ? 504 : 502;
        // A configuration problem is logged by kind only (never the image or text).
        if (result.error === "config") console.error("Label scan: Gemini refused the request (check GEMINI_API_KEY and GEMINI_MODEL)");
        return json({ ok: false, error: result.error }, status);
    }

    return json({ ok: true, extraction: result.extraction, remaining: reservation.remaining });
}
