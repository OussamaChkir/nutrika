"use server";

// F9 server actions: turn insights on or off, delete the scan records. Flag on, signed in, and
// every query scoped to session.user.id.

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/flags";

async function currentUserId(): Promise<string | null> {
    if (!isFeatureEnabled("scanInsights")) return null;
    const session = await auth();
    return session?.user?.id ?? null;
}

const refresh = () => {
    try {
        revalidatePath("/[locale]/insights", "page");
    } catch {
        // not fatal
    }
};

/** Turning off stops recording; records already stored stay until the user deletes them. */
export async function setScanInsights(enabled: boolean): Promise<{ ok: boolean }> {
    const userId = await currentUserId();
    if (!userId || typeof enabled !== "boolean") return { ok: false };
    try {
        await prisma.user.update({ where: { id: userId }, data: { scanInsightsOptIn: enabled } });
        refresh();
        return { ok: true };
    } catch {
        return { ok: false };
    }
}

export async function deleteScanEvents(): Promise<{ ok: boolean }> {
    const userId = await currentUserId();
    if (!userId) return { ok: false };
    try {
        await prisma.scanEvent.deleteMany({ where: { userId } });
        refresh();
        return { ok: true };
    } catch {
        return { ok: false };
    }
}
