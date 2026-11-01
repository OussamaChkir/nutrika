import { beforeEach, describe, expect, it, vi } from "vitest";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@vercel/analytics", () => ({ track }));

import { sanitizeProperties, trackEvent } from "./analytics";

beforeEach(() => { track.mockReset(); track.mockImplementation(() => undefined); });

describe("sanitizeProperties", () => {
    it("keeps primitives and drops undefined, objects and arrays", () => {
        expect(
            sanitizeProperties({ a: 1, b: "x", c: true, d: null, e: undefined, f: { x: 1 }, g: [1] })
        ).toEqual({ a: 1, b: "x", c: true, d: null });
    });

    it("never lets health or identity properties through", () => {
        expect(
            sanitizeProperties({ allergies: "milk", Weight: 70, dateOfBirth: "1990", email: "a@b.c", userId: "1", ok: 1 })
        ).toEqual({ ok: 1 });
    });

    it("truncates long strings to 255 characters", () => {
        expect(sanitizeProperties({ s: "a".repeat(400) }).s).toHaveLength(255);
    });
});

describe("trackEvent", () => {
    it("sends the event name and its properties", () => {
        trackEvent("scan_completed", { withProfile: true });
        expect(track).toHaveBeenCalledWith("scan_completed", { withProfile: true });
    });

    it("sends no properties object for events without properties", () => {
        trackEvent("profile_created");
        expect(track).toHaveBeenCalledWith("profile_created", undefined);
    });

    it("never throws when analytics fails", () => {
        track.mockImplementation(() => {
            throw new Error("blocked by ad blocker");
        });
        // An uncaught error here would fail the test on its own.
        trackEvent("list_created");
        expect(track).toHaveBeenCalledTimes(1);
    });
});
