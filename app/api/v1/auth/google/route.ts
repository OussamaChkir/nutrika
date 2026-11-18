import { handleSocialSignIn } from "@/lib/mobile/social-signin";

// POST /api/v1/auth/google – { idToken, nonce?, device? } from the native Google Sign-In.
export async function POST(request: Request) {
    return handleSocialSignIn(request, "google");
}
