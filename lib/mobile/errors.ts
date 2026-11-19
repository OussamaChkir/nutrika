// How the services' short error names map to HTTP answers. Pure, so it is testable.
// The services (lib/shopping/service.ts, lib/profiles/service.ts) return one of these names.

export type ServiceErrorName = "invalid" | "not_found" | "limit" | "unauthorized" | "disabled" | "failed";

export interface HttpFailure {
    status: number;
    code: "invalid_request" | "not_found" | "limit_reached" | "unauthorized" | "feature_disabled" | "server_error";
    message: string;
}

const TABLE: Record<ServiceErrorName, HttpFailure> = {
    invalid: { status: 400, code: "invalid_request", message: "The request is not valid." },
    not_found: { status: 404, code: "not_found", message: "Not found." },
    limit: { status: 409, code: "limit_reached", message: "A limit has been reached." },
    unauthorized: { status: 401, code: "unauthorized", message: "Please sign in again." },
    disabled: { status: 404, code: "feature_disabled", message: "This feature is not available." },
    failed: { status: 500, code: "server_error", message: "Something went wrong. Please try again." },
};

export function failureFor(error: ServiceErrorName): HttpFailure {
    return TABLE[error] ?? TABLE.failed;
}
