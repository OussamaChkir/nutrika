import { handleSocialSignIn } from "@/lib/mobile/social-signin";

// POST /api/v1/auth/apple – { idToken, nonce?, fullName?, device? } from expo-apple-authentication.
export async function POST(request: Request) {
    return handleSocialSignIn(request, "apple");
}
