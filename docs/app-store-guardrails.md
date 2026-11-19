# App Store guardrails for the mobile API

Decision (19 Nov 2026, owner): the mobile app does **not** let users add or edit products, and must not
ship any feature likely to cause an App Store rejection. `lib/mobile/api-surface.test.ts` lists every
`/api/v1` endpoint and fails when one is added without review.

| Guideline | What it asks | How we stay inside it |
|---|---|---|
| 1.2 User-generated content | Filtering, reporting and blocking for anything users post for others | The app creates nothing others see: no add/edit product, no comments, no photos. Ratings are stars only; the API rejects free text and never returns other users' comments or names. Profile nicknames and the shopping list are private to the account |
| 3.1.1 In-app purchase | Digital features that are sold must use Apple IAP | v1 is fully free. No premium, purchase or subscription endpoint exists |
| 4.8 Login services | Offer Sign in with Apple next to Google | `POST /auth/apple` next to Google and email |
| 5.1.1(v) Account deletion | In-app deletion of the account and its data | `DELETE /me` (typed email confirmation) |
| 5.1.1(v) Sign in with Apple | Revoke the Apple token when deleting an Apple account | **Still to do** (needs the Apple Developer key) |
| 5.1.2(i) Sharing data with third-party AI | Say what is shared and get explicit permission first | No label photo scan in v1 (photos go to Google). Add it only with a consent screen in the app. The AI explanation sends product data, not personal data |
| 5.1.3 Health data | No ads or data brokers; do not store health data in iCloud | Profiles (allergens, conditions) need explicit consent, are deleted with the account, and are never shared |
| 1.4.1 Medical information | Be accurate; remind users to check with a doctor | Keep the "not medical advice" line on every health screen |
| 5.1.4 / 1.3 Kids | Extra rules for apps aimed at children | Do not choose the Kids category. Child profiles are managed by the adult account holder |
| 2.1 App completeness | Reviewers must be able to use every feature | Provide a demo account with a profile and scan history |
| 5.1.1 Privacy policy | Policy link in the app and in App Store Connect | Policy must cover health profiles, Open Food Facts and the AI service |

When adding an endpoint: read this table, then add it to `ALLOWED` in `lib/mobile/api-surface.test.ts`.
