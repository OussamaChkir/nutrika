// F9: the contract between the Insights components and the server actions. The components
// receive the actions as props, so Storybook uses stubs and never bundles server code.

export interface InsightsActions {
    setEnabled(enabled: boolean): Promise<{ ok: boolean }>;
    deleteAll(): Promise<{ ok: boolean }>;
}
