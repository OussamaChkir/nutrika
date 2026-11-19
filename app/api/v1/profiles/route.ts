import { pickActiveProfile } from "@/lib/profiles/active";
import { MAX_PROFILES_PER_USER } from "@/lib/profiles/constants";
import { createProfileFor, listProfilesFor } from "@/lib/profiles/service";
import { apiOk, authenticate, requireFlag, serviceError } from "@/lib/mobile/http";
import { readProfileHeader } from "@/lib/mobile/profile-header";

// GET /api/v1/profiles – the user's profiles. `activeProfileId` is the one products are scored for:
// the one named in X-Profile-Id if it is theirs, else the default, else the oldest.
export async function GET(request: Request) {
    const off = requireFlag("personalScore");
    if (off) return off;
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;

    try {
        const profiles = await listProfilesFor(authed.claims.userId);
        return apiOk({
            profiles,
            maxProfiles: MAX_PROFILES_PER_USER,
            activeProfileId: pickActiveProfile(profiles, readProfileHeader(request))?.id ?? null,
        });
    } catch (error) {
        console.error("v1 list profiles error:", error instanceof Error ? error.message : "unknown error");
        return serviceError("failed");
    }
}

// POST /api/v1/profiles – create a profile. Body = the profile fields plus `consent: true`
// (health data is only stored after an explicit tick). 409 `limit_reached` after 6 profiles.
export async function POST(request: Request) {
    const off = requireFlag("personalScore");
    if (off) return off;
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;

    const body = await request.json().catch(() => null);
    const result = await createProfileFor(authed.claims.userId, body);
    if (!result.ok) return serviceError(result.error);
    return apiOk({ profile: result.profile, makeActive: result.makeActive }, 201);
}
