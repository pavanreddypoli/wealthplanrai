# WealthPlanrAI — Intake Analysis Engine Spec (v2, Compliance-First)

**Status:** Drop-in ready
**Files:**
- `src/lib/compliance-module.ts` — disclaimer constants, AI sanitizer, audit trail, marketing guardrails
- `src/lib/intake-analysis-engine.ts` — Series 65-aligned framework analysis
- `src/lib/client-view-translator.ts` — advisor analysis → client educational summary

**Replaces / augments:** `src/lib/scoring.ts`
**Compliance basis:** WealthPlanrAI is an EDUCATION + INTAKE + ADVISOR ENABLEMENT platform. NOT an investment adviser, broker-dealer, insurance producer, or mortgage lender.

---

## What changed from v1 (`recommendation-engine.ts`)

The Series 65 logic is preserved. What changed is the **framing, packaging, and compliance scaffolding** so the platform's outputs match what regulators allow an education-first platform to produce.

| v1 | v2 |
|---|---|
| `recommendation-engine.ts` | `intake-analysis-engine.ts` |
| `ClientProfile` | `ClientIntakeProfile` |
| `RecommendationOutput` | `IntakeAnalysisOutput` |
| `RecommendedProduct` | `AlignedProduct` |
| `RiskFlag` | `PlanningFlag` |
| `TaxRecommendation` | `TaxConsideration` |
| `recommendedProducts[]` | `alignedProducts[]` |
| `excludedProducts[]` | `consideredButExcludedProducts[]` |
| `targetAllocation` | `frameworkAllocation` |
| `taxRecommendations[]` | `taxConsiderations[]` |
| `riskFlags[]` | `planningFlags[]` |
| `analyzeClient()` | `analyzeIntake()` (with `analyzeClient` alias for back-compat) |
| Single output | Two-track output: advisor (specific products + disclaimers) + client (educational topics, no product names) |
| No disclaimer fields | Every output carries: `disclaimerVersion`, `notFinancialAdvice: true`, `noAdvisorRelationship: true`, `productsAreFrameworkAligned: true`, `advisorResponsibleForRecommendations: true`, plus `advisorReportDisclaimer` and `clientReportDisclaimer` text |
| Status `'recommended'` | Status `'aligned'` (with `'consider'`, `'not_applicable'`, `'excluded'` unchanged) |
| Rationales like "Aligns with primary objective" | Rationales like "Framework-aligned with X objective per Series 65 product universe. Specific product selection and final suitability remain the licensed advisor's determination." |
| No AI guardrails | `sanitizeAiOutput()` rewrites prescriptive language; `sanitizeAiOutputStrict()` returns null on violation to trigger regeneration |
| No marketing guardrails | `checkMarketingCopy()` blocks disallowed terms ("we recommend", "guaranteed returns", etc.) |
| No audit trail | Full audit trail schema + helpers (consents, events, versioning) |
| No advisor agreement | 7 advisor agreement clauses ready for signup flow |

---

## Architecture overview

```
                        ┌─────────────────────────┐
                        │  ClientIntakeProfile     │
                        │  (questionnaire data)    │
                        └────────────┬─────────────┘
                                     │
                                     ▼
                  ┌──────────────────────────────────┐
                  │  intake-analysis-engine.ts       │
                  │  analyzeIntake(profile)          │
                  │                                   │
                  │  1. classifyStatedObjective       │
                  │  2. computeRiskCapacityCeiling    │
                  │  3. deriveFinalObjective (min)    │
                  │  4. computeFrameworkAllocation    │
                  │  5. buildAlignedProducts          │
                  │  6. computePerGoalAllocations     │
                  │  7. chooseBondStrategy            │
                  │  8. chooseManagementStyle         │
                  │  9. generateTaxConsiderations     │
                  │ 10. detectPlanningFlags           │
                  │ 11. computeSubScores              │
                  └────────────┬──────────────────────┘
                               │
                               ▼
                  ┌──────────────────────────────────┐
                  │  IntakeAnalysisOutput             │
                  │  (with disclaimer envelope)       │
                  └────────┬─────────────┬────────────┘
                           │             │
                ADVISOR ◄──┤             ├──► CLIENT
                           │             │
                           │             ▼
                           │   ┌─────────────────────────────┐
                           │   │  client-view-translator.ts   │
                           │   │  translateForClient(output)  │
                           │   │  • educational topics        │
                           │   │  • NO product names          │
                           │   │  • quantitative + qualitative│
                           │   │  • full disclaimers          │
                           │   └────────────┬────────────────┘
                           │                │
                           ▼                ▼
                  ┌─────────────────┐  ┌─────────────────┐
                  │ Advisor PDF     │  │ Client PDF      │
                  │ (specific       │  │ (educational    │
                  │  products +     │  │  topics +       │
                  │  rationales +   │  │  ranges +       │
                  │  data points +  │  │  watermark)     │
                  │  full disclaim) │  │                 │
                  └─────────────────┘  └─────────────────┘

         All AI free-text generation passes through:
         compliance-module.ts → sanitizeAiOutput() / Strict
         All marketing copy passes through: checkMarketingCopy()
         All assessments record events via: audit trail helpers
```

---

## How the two views differ

### Advisor view (`IntakeAnalysisOutput.alignedProducts[]`)

Names specific products with full rationale and data points used:

```
Product:    "Term Life Insurance (~$4.5M)"
Status:     aligned
Rationale:  "Has 2 dependents and $450K income but $1M coverage.
            Industry guideline: 10× income."
Priority:   high
Data used:  ["age=38", "dependents=2", "income=450000"]
```

PDF footer carries `ADVISOR_PDF_DISCLAIMER` stating that products are framework-aligned, not WealthPlanrAI recommendations, and that the advisor is solely responsible for suitability/fiduciary/compliance/supervision.

### Client view (`ClientEducationalSummary.topicsForAdvisorDiscussion[]`)

Names topics, not products:

```
Topic:        "Protection coverage review"
Summary:      "Your reported insurance coverage may not fully match
              the protection needs of your situation."
Why matters:  "Insurance fills the gap between your assets and the
              financial impact of unexpected events. The right
              coverage depends on dependents, debts, income, health,
              and existing assets."
Discuss:      "Ask a licensed insurance professional to review your
              full coverage (life, disability, long-term care,
              umbrella, health) against your actual needs and
              existing assets."
Priority:     high
```

Quantitative facts are allowed when educationally useful, but always carry `referenceOnly: true` and an educational context note. PDF watermark on every page: "EDUCATIONAL SUMMARY ONLY — NOT FINANCIAL ADVICE".

---

## Compliance properties (verified by test-compliance.ts)

| Property | Where enforced | Verified by |
|---|---|---|
| Every analysis carries disclaimer envelope | `analyzeIntake()` always populates 6 disclaimer fields | `test-compliance.ts` PART 1 |
| Advisor view names products with rationale + data points | `buildAlignedProducts()` includes both | PART 2 |
| Client view never names specific products | `client-view-translator.ts` only passes flag→topic translations | PART 3 |
| AI sanitizer rewrites/blocks prescriptive language | `sanitizeAiOutput()`, `sanitizeAiOutputStrict()` | PART 4 |
| Marketing copy blocked on disallowed terms | `checkMarketingCopy()` | PART 5 |
| Audit trail records consents + events | `newAuditTrail()`, `recordConsent()`, `recordEvent()` | PART 6 |
| Disclaimer envelope wrappable around any payload | `wrapWithDisclaimer<T>()` | PART 7 |
| Advisor agreement clauses defined | `ADVISOR_AGREEMENT_ITEMS` | PART 8 |
| Series 65 logic preserved across rename | `analyzeIntake()` produces same objectives as v1 | PART 9 |

---

## Required app integrations

These integrations must happen for the compliance posture to actually take effect. The engine alone is necessary but not sufficient.

### 1. Intake consent gate (BEFORE any assessment input)

Render a modal/page on first visit that displays `INTAKE_CONSENT_ITEMS` from `compliance-module.ts`. User must check all 6 boxes (all are `required: true`). On submit, call `recordConsent()` for each item with the user's IP and user-agent. Cannot proceed to questionnaire without complete consents.

### 2. Advisor signup gate

Render `ADVISOR_AGREEMENT_ITEMS` (7 clauses) at advisor signup. Same pattern — all required, all recorded. Cannot create advisor account without complete agreement.

### 3. Disclaimer rendering

- Website footer: render `FOOTER_DISCLAIMER` on every page
- Assessment header: render disclaimer banner with link to `MASTER_DISCLAIMER`
- Results page: render `educationalNotice` + link to full disclaimer
- Client PDF: header watermark `PDF_WATERMARK_HEADER` on every page; footer `CLIENT_PDF_DISCLAIMER` on every page
- Advisor PDF: header watermark on every page; footer `ADVISOR_PDF_DISCLAIMER` on every page
- AI output cards: append `AI_OUTPUT_DISCLAIMER`

### 4. AI output guardrail

Any AI free-text generation (advisor email body, summary text, AI advisor chat) must:

```ts
const aiOutput = await callClaudeApi(prompt);
const result = sanitizeAiOutputStrict(aiOutput);
if (result === null) {
  // regenerate or fall back to template
} else {
  display(result);
}
```

Strict mode is the safer default for client-facing surfaces. Use the non-strict (rewriting) version only for advisor-facing surfaces where rephrased text is acceptable, and always log violations to the audit trail.

### 5. Marketing copy lint

Pre-publish hook on landing page / email templates / blog posts:

```ts
const result = checkMarketingCopy(copy);
if (!result.passed) throw new Error(`Disallowed terms: ${result.violations}`);
```

### 6. Audit trail persistence

`AuditTrailEntry` should be a JSONB column on the assessments table. Every event (consent, assessment_started, assessment_completed, report_generated, pdf_downloaded, email_sent, advisor_assigned, ai_output_blocked) should be appended via `recordEvent()`.

---

## Field mapping — questionnaire to engine

Same field requirements as v1 spec. See the v1 spec doc for the full table, with these renames applied:

- `ClientProfile` → `ClientIntakeProfile`
- All other field names within the profile remain unchanged

New compliance-related fields can be added later for state-residency-specific disclosures (CCPA opt-out, GLBA acknowledgment, etc.) but are not required for v2 launch.

---

## Integration prompt for Claude Code

Hand this to Claude Code in your VS Code terminal:

```
Replace src/lib/scoring.ts with three files from the outputs folder:
  - compliance-module.ts        → src/lib/compliance-module.ts
  - intake-analysis-engine.ts   → src/lib/intake-analysis-engine.ts
  - client-view-translator.ts   → src/lib/client-view-translator.ts

Then update src/app/api/assessment/route.ts to:

1. Import { analyzeIntake } from '@/lib/intake-analysis-engine'
2. Import { translateForClient } from '@/lib/client-view-translator'
3. Import { newAuditTrail, recordEvent, verifyIntakeConsentsComplete }
   from '@/lib/compliance-module'
4. Build ClientIntakeProfile from form data (per spec field mapping)
5. BEFORE running analysis, verify intake consents are complete using
   verifyIntakeConsentsComplete(); reject 400 if not
6. Call analyzeIntake(profile) → store as recommendation_output jsonb
7. Call translateForClient(advisorAnalysis) → store as
   client_summary jsonb
8. Append events to audit_trail jsonb column
9. Return both summaries (with disclaimer envelopes) plus assessment id

Update Supabase migrations:
  - Add intake_consents jsonb column to clients table
  - Add advisor_agreement jsonb column to advisor_profiles table
  - Add recommendation_output jsonb column to assessments table
  - Add client_summary jsonb column to assessments table
  - Add audit_trail jsonb column to assessments table

Build a new component IntakeConsentGate.tsx that renders
INTAKE_CONSENT_ITEMS as required checkboxes. Block the questionnaire
flow until all are checked. On submit, POST to /api/consent which
calls recordConsent() for each item.

Build a new component AdvisorAgreementGate.tsx that renders
ADVISOR_AGREEMENT_ITEMS at advisor signup, blocking account creation
until all are accepted.

Update src/app/results/page.tsx to read client_summary jsonb (the
client view, NOT the advisor view) and render:
  - Watermark banner at top
  - Overall educational score (prominently labeled "educational
    reference, not financial advice")
  - Six area summary cards (cash flow, retirement, protection, tax,
    estate, investments)
  - Topics for advisor discussion (the heart of the page)
  - Goal summaries with educational status badges
  - Investment framework reference (educational profile, illustrative
    range, no product names)
  - Next steps (advisor consultation, document review, etc.)
  - Full disclaimer footer

Update the advisor dashboard / advisor PDF to read recommendation_output
jsonb (the advisor view) and include:
  - Cover page with ADVISOR_PDF_DISCLAIMER
  - Page header watermark on every page
  - Aligned products with rationale + clientDataPointsUsed
  - Considered-but-excluded products with reasons
  - Per-goal allocations
  - Bond strategy + management style
  - Tax considerations
  - Planning flags
  - Compliance trail page listing all complianceNotes
  - Footer disclaimer on every page

Update all email templates to:
  - Replace "we recommend" with "framework-aligned topics for
    discussion" and similar phrases
  - Add full disclaimer block at footer
  - Run all body text through sanitizeAiOutput() before sending

Update the marketing landing page copy to remove any disallowed terms
(use checkMarketingCopy() as a CI lint).

Run npm run build and report any errors.
```

---

## Test coverage

Run `npx ts-node test-compliance.ts` to verify:

- Disclaimer envelope is always present
- Advisor view names specific products with full rationale
- Client view never names specific products
- AI sanitizer rewrites prescriptive language correctly
- Marketing guardrail blocks disallowed terms
- Audit trail records consents and events
- All Series 65 scenarios still classify correctly

---

## Deferred for future iterations

- Per-state residency disclosure overlays (CCPA, GLBA, state-specific)
- Annuity suitability rules with state insurance compliance overlay
- Form ADV / Form CRS reference integration
- Multi-language disclaimers
- Voice/audio disclaimer handling for any future voice features
- Decumulation strategies + RMD logic
- Trust-specific allocations
