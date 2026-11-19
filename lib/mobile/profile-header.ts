/**
 * The app keeps the active profile id on the device and sends it in `X-Profile-Id`
 * (the web uses a cookie). It is only a hint: callers match it against the signed-in user's own
 * profiles, so a wrong or foreign id selects nothing.
 */
export const PROFILE_HEADER = "x-profile-id";

export function readProfileHeader(request: Request): string | null {
    const value = request.headers.get(PROFILE_HEADER)?.trim();
    return value && /^[a-f0-9]{24}$/i.test(value) ? value : null;
}
