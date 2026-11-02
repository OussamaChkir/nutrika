import { describe, expect, it } from "vitest";

import { checkAccountDeletion } from "./account-delete";

const user = { email: "Sara@Example.com", role: "USER" };

describe("checkAccountDeletion", () => {
    it("accepts the own email, ignoring case and spaces", () => {
        expect(checkAccountDeletion(user, "  sara@example.com ")).toBe("ok");
    });
    it.each(["", "   ", "other@example.com", "sara@example.co", "DELETE"])("rejects %j", (typed) => {
        expect(checkAccountDeletion(user, typed)).toBe("email_mismatch");
    });
    it("never lets an admin delete themselves here, even with the right email", () => {
        expect(checkAccountDeletion({ ...user, role: "ADMIN" }, "sara@example.com")).toBe("admin_blocked");
    });
    it("premium users can delete", () => {
        expect(checkAccountDeletion({ ...user, role: "PREMIUM" }, "sara@example.com")).toBe("ok");
    });
});
