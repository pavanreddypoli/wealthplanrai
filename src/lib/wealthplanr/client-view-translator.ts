/**
 * WealthPlanrAI — Client View Translator
 * ==========================================================================
 *
 * Pure translator that converts an advisor-facing IntakeAnalysisOutput into
 * a client-facing educational summary.
 *
 * COMPLIANCE PHILOSOPHY:
 *   The advisor view names specific products (with disclaimers). The client
 *   view does NOT name specific products. Instead, it presents:
 *     - Educational topics to discuss with a licensed professional
 *     - Quantitative facts ("emergency fund covers ~3 months", "projected
 *       retirement gap ~$X") with explicit disclaimer that these are
 *       educational reference points, not advice
 *     - Qualitative ranges ("appears below typical benchmarks") for areas
 *       where specific numbers would imply prescription
 *     - Plain-English framework references
 *
 *   Every output here is wrapped with the client disclaimer envelope.
 *
 * Last updated: 2026-05
 * ==========================================================================
 */

import {
  IntakeAnalysisOutput,
  InvestmentObjective,
  AlignedProduct,
  PlanningFlag,
  GoalAllocation,
  OBJECTIVE_DISPLAY_NAMES,
} from './intake-analysis-engine';
import {
  CLIENT_PDF_DISCLAIMER,
  DISCLAIMER_VERSION,
} from './compliance-module';

// ============================================================================
// SECTION 1 — CLIENT VIEW TYPES
// ============================================================================

/**
 * Topics the client should discuss with a licensed advisor.
 * Phrased educationally — never prescriptive, never product-specific.
 */
export interface ClientPlanningTopic {
  area: 'protection' | 'cash_flow' | 'retirement' | 'investments' | 'tax' | 'estate' | 'goals';
  title: string;                     // "Income protection coverage review"
  educationalSummary: string;        // 1-3 sentences explaining the topic
  whyItMatters: string;              // educational rationale
  whatToDiscussWithAdvisor: string;  // bullet-style prompt for the conversation
  priorityForDiscussion: 'high' | 'medium' | 'low';
  /** Optional educational fact — see ClientFact for shape. */
  educationalFacts?: ClientFact[];
}

/**
 * Educational fact — quantitative when useful, qualitative when safer.
 * Always carries a `referenceOnly` flag to remind UI to render disclaimer.
 */
export interface ClientFact {
  kind: 'quantitative' | 'qualitative';
  label: string;
  value: string;                     // formatted display value
  educationalContext: string;        // explains what the number/range means
  referenceOnly: true;               // marker — must render with disclaimer
}

/**
 * The full client-facing educational summary.
 */
export interface ClientEducationalSummary {
  // ── Disclaimer envelope (always present, displayed prominently) ───────
  disclaimerVersion: string;
  watermark: string;                 // e.g. "EDUCATIONAL SUMMARY ONLY"
  fullDisclaimer: string;            // CLIENT_PDF_DISCLAIMER text
  notFinancialAdvice: true;
  consultLicensedProfessional: string;

  // ── Header ────────────────────────────────────────────────────────────
  generatedAt: string;
  reportTitle: string;
  introduction: string;

  // ── Overall picture (educational, no product names) ───────────────────
  overallEducationalScore: number;      // 0-100, framed as "readiness", not "health"
  overallScoreNarrative: string;
  scoreDisclaimer: string;

  // ── Six area summaries (educational categories) ───────────────────────
  areaSummaries: Array<{
    area: ClientPlanningTopic['area'];
    label: string;
    score: number;
    qualitativeBand: 'strong' | 'developing' | 'needs attention' | 'priority area';
    educationalNote: string;
  }>;

  // ── Topics for advisor conversation (the heart of the client report) ──
  topicsForAdvisorDiscussion: ClientPlanningTopic[];

  // ── Goals view ────────────────────────────────────────────────────────
  goalEducationalSummaries: ClientGoalSummary[];

  // ── Framework reference (educational, no specific product names) ──────
  investmentFrameworkReference: {
    educationalProfile: string;        // "Long-horizon growth focus"
    profileExplanation: string;        // plain-English educational text
    illustrativeAllocationRange: string; // "Approximately 60-70% equities, 25-35% bonds, ~5% cash"
    disclaimer: string;                // explicit reminder
  };

  // ── Closing ───────────────────────────────────────────────────────────
  nextStepsEducational: string[];      // generic next-step prompts (consult an advisor, review documents, etc.)
  closingDisclaimer: string;
}

export interface ClientGoalSummary {
  goalLabel: string;
  goalYear: number;
  yearsAway: number;
  educationalStatus: 'on a positive track' | 'progressing' | 'may need attention' | 'priority for advisor discussion' | 'no progress data provided';
  educationalNotes: string;
  /** Optional gap figure. Always shown with disclaimer. */
  approximateGap?: ClientFact;
  topicForAdvisor: string;
}

// ============================================================================
// SECTION 2 — TRANSLATION MAPS
// ============================================================================

/**
 * Map advisor-facing planning flag categories → client-friendly topic areas.
 */
const FLAG_TO_AREA: Record<PlanningFlag['category'], ClientPlanningTopic['area']> = {
  concentration: 'investments',
  liquidity: 'cash_flow',
  insurance_gap: 'protection',
  estate_gap: 'estate',
  risk_mismatch: 'investments',
  sophistication_mismatch: 'investments',
  tax_inefficiency: 'tax',
  allocation_drift: 'investments',
  goal_funding_gap: 'goals',
};

/**
 * Map flag severity → client priority. We intentionally soften "critical" to
 * "high" — the client report is not the place for alarming language.
 */
const SEVERITY_TO_PRIORITY: Record<PlanningFlag['severity'], 'high' | 'medium' | 'low'> = {
  critical: 'high',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

/**
 * Map advisor-facing investment objective → client-friendly profile name.
 * Educational only — never used to suggest products.
 */
const OBJECTIVE_TO_CLIENT_PROFILE: Record<InvestmentObjective, {
  profile: string;
  explanation: string;
  illustrativeRange: string;
}> = {
  [InvestmentObjective.PreservationOfCapital]: {
    profile: 'Capital preservation focus',
    explanation: 'This educational profile centers on keeping principal stable with minimal exposure to market fluctuation. People in this category often emphasize liquidity and short time horizons.',
    illustrativeRange: 'Illustrative range: predominantly cash-equivalent and short-term fixed-income exposure (typically 70%+).',
  },
  [InvestmentObjective.SafetyOfPrincipal]: {
    profile: 'Stability-oriented profile',
    explanation: 'This educational profile favors stable income and modest market exposure. People in this category typically have short-to-intermediate horizons.',
    illustrativeRange: 'Illustrative range: heavy fixed-income tilt with limited equity exposure (~10-15% equity).',
  },
  [InvestmentObjective.TaxAdvantagedIncome]: {
    profile: 'Tax-aware income focus',
    explanation: 'This educational profile emphasizes after-tax income generation. People in this category are often in higher tax brackets.',
    illustrativeRange: 'Illustrative range: significant tax-advantaged fixed-income exposure with modest equity (~25%).',
  },
  [InvestmentObjective.ModerateIncome]: {
    profile: 'Income-oriented balanced profile',
    explanation: 'This educational profile balances income generation with modest growth. Common for clients near or in early retirement.',
    illustrativeRange: 'Illustrative range: ~30-40% equity, ~55-65% fixed income, ~5% cash.',
  },
  [InvestmentObjective.ModerateGrowth]: {
    profile: 'Balanced growth profile',
    explanation: 'This educational profile balances long-term growth potential with some stability. Common for clients with intermediate-to-long horizons.',
    illustrativeRange: 'Illustrative range: ~55-65% equity, ~30-40% fixed income, ~5% cash.',
  },
  [InvestmentObjective.HighYieldIncome]: {
    profile: 'Yield-seeking income profile',
    explanation: 'This educational profile pursues higher income at the cost of higher credit and market risk. Suitability depends heavily on circumstances.',
    illustrativeRange: 'Illustrative range: heavy income-oriented allocation with elevated credit-risk exposure.',
  },
  [InvestmentObjective.AggressiveGrowth]: {
    profile: 'Long-horizon growth focus',
    explanation: 'This educational profile emphasizes long-term capital appreciation, accepting higher near-term volatility. Most common for clients with long time horizons and ample income.',
    illustrativeRange: 'Illustrative range: ~80-90% equity with broad diversification, ~10-15% fixed income, ~5% cash.',
  },
  [InvestmentObjective.Speculation]: {
    profile: 'Speculation-oriented profile',
    explanation: 'This profile is associated with the highest risk levels and is typically appropriate only for clients with disposable wealth and full understanding of potential losses.',
    illustrativeRange: 'Illustrative range: highly aggressive equity exposure including high-volatility positions.',
  },
};

// ============================================================================
// SECTION 3 — TRANSLATOR
// ============================================================================

/**
 * Main translator — produces a client-facing educational summary from the
 * advisor analysis. Always wraps output in the disclaimer envelope.
 */
export function translateForClient(analysis: IntakeAnalysisOutput): ClientEducationalSummary {
  const profile = OBJECTIVE_TO_CLIENT_PROFILE[analysis.frameworkObjective];

  const areaSummaries = buildAreaSummaries(analysis);
  const topics = buildTopicsForAdvisorDiscussion(analysis);
  const goalSummaries = buildGoalSummaries(analysis.perGoalAllocations);

  return {
    // Disclaimer envelope (must be displayed)
    disclaimerVersion: DISCLAIMER_VERSION,
    watermark: 'EDUCATIONAL SUMMARY ONLY — NOT FINANCIAL ADVICE',
    fullDisclaimer: CLIENT_PDF_DISCLAIMER,
    notFinancialAdvice: true,
    consultLicensedProfessional:
      'Consult a licensed Certified Financial Planner (CFP®), Registered Investment Adviser (RIA), CPA, or other qualified professional before making any financial decisions.',

    // Header
    generatedAt: new Date().toISOString(),
    reportTitle: 'Your Educational Financial Summary',
    introduction:
      'This educational summary uses standardized planning frameworks to help you understand your current financial picture and prepare for a productive conversation with a licensed financial professional. It is NOT financial advice, does NOT recommend any specific investment or product, and is NOT a substitute for personalized professional guidance.',

    // Overall
    overallEducationalScore: analysis.overallScore,
    overallScoreNarrative: buildOverallNarrative(analysis.overallScore),
    scoreDisclaimer:
      'Score is an educational reference based on your responses and standard planning frameworks. It is not a credit score, financial rating, or guarantee of any outcome.',

    // Areas
    areaSummaries,

    // Topics
    topicsForAdvisorDiscussion: topics,

    // Goals
    goalEducationalSummaries: goalSummaries,

    // Framework reference (no products)
    investmentFrameworkReference: {
      educationalProfile: profile.profile,
      profileExplanation: profile.explanation,
      illustrativeAllocationRange: profile.illustrativeRange,
      disclaimer:
        'This is an educational reference profile only — not a recommendation, not an investment plan, and not advice on which products or securities to buy or sell. Your actual situation may align with a different profile after a licensed advisor reviews your full circumstances.',
    },

    // Next steps
    nextStepsEducational: [
      'Review this summary in full, including all disclaimers.',
      'Schedule a conversation with a licensed financial professional (CFP®, RIA, CPA, or other licensed advisor as appropriate).',
      'Bring this summary, your current account statements, your most recent tax return, and any existing estate documents to the conversation.',
      'Use the "Topics for Advisor Discussion" section as a starting agenda — your advisor can prioritize and personalize based on your full circumstances.',
    ],
    closingDisclaimer: CLIENT_PDF_DISCLAIMER,
  };
}

// ============================================================================
// SECTION 4 — HELPERS
// ============================================================================

function buildOverallNarrative(score: number): string {
  if (score >= 80) {
    return 'Your responses suggest a relatively well-organized financial picture across the planning areas reviewed. There may still be valuable topics to discuss with a licensed advisor — such as optimization opportunities, tax efficiency, and long-term planning refinements.';
  }
  if (score >= 65) {
    return 'Your responses suggest several areas that are progressing well, alongside a few that may benefit from focused attention. A conversation with a licensed advisor can help prioritize next steps based on your full circumstances.';
  }
  if (score >= 45) {
    return 'Your responses indicate meaningful opportunities to strengthen multiple planning areas. A licensed advisor can help you create a structured plan to address these systematically.';
  }
  return 'Your responses indicate that several foundational planning areas may benefit from focused attention. A conversation with a licensed advisor is an important next step to develop a structured plan tailored to your situation.';
}

function buildAreaSummaries(analysis: IntakeAnalysisOutput): ClientEducationalSummary['areaSummaries'] {
  const s = analysis.subScores;
  const band = (n: number): 'strong' | 'developing' | 'needs attention' | 'priority area' => {
    if (n >= 80) return 'strong';
    if (n >= 60) return 'developing';
    if (n >= 40) return 'needs attention';
    return 'priority area';
  };

  return [
    {
      area: 'cash_flow',
      label: 'Cash Flow & Liquidity',
      score: s.cashflow,
      qualitativeBand: band(s.cashflow),
      educationalNote:
        'Cash flow and emergency reserves are the foundation of every plan. Strong reserves give you flexibility to handle unexpected expenses without disrupting longer-term goals.',
    },
    {
      area: 'retirement',
      label: 'Retirement Preparation',
      score: s.retirement,
      qualitativeBand: band(s.retirement),
      educationalNote:
        'Retirement preparation depends on time horizon, savings rate, and account types. Small changes in savings rate often have large long-term effects due to compounding.',
    },
    {
      area: 'protection',
      label: 'Protection & Insurance',
      score: s.insurance,
      qualitativeBand: band(s.insurance),
      educationalNote:
        'Protection planning addresses what happens if income, health, or life is disrupted. The right mix depends on dependents, debts, income sources, and existing coverage.',
    },
    {
      area: 'tax',
      label: 'Tax Awareness',
      score: s.tax,
      qualitativeBand: band(s.tax),
      educationalNote:
        'Tax efficiency can compound meaningfully over a lifetime. Account types, asset placement, and timing of taxable events all play a role.',
    },
    {
      area: 'estate',
      label: 'Estate & Legacy',
      score: s.estate,
      qualitativeBand: band(s.estate),
      educationalNote:
        'Estate planning ensures your wishes are carried out and your family has clarity if something happens to you. Foundational documents (will, beneficiary designations, POA, healthcare directive) are typically considered baseline regardless of net worth.',
    },
    {
      area: 'investments',
      label: 'Investment Approach',
      score: Math.round((s.investments + s.diversification) / 2),
      qualitativeBand: band(Math.round((s.investments + s.diversification) / 2)),
      educationalNote:
        'A clear investment approach considers risk tolerance, time horizon, and diversification. Concentration in a single position or asset class is a topic licensed advisors often address as a priority.',
    },
  ];
}

function buildTopicsForAdvisorDiscussion(analysis: IntakeAnalysisOutput): ClientPlanningTopic[] {
  const topics: ClientPlanningTopic[] = [];

  // Build topics from planning flags (the advisor flags are the most important signal)
  for (const flag of analysis.planningFlags) {
    topics.push(translatePlanningFlag(flag));
  }

  // Sort: high priority first
  topics.sort((a, b) => priorityRank(a.priorityForDiscussion) - priorityRank(b.priorityForDiscussion));

  // Deduplicate by title — multiple flags from the same category often translate
  // to the same client topic, and we don't want to repeat the topic in the report.
  // Keep the highest-priority instance of each title.
  const byTitle = new Map<string, ClientPlanningTopic>();
  for (const t of topics) {
    if (!byTitle.has(t.title)) byTitle.set(t.title, t);
  }
  const deduped = Array.from(byTitle.values());

  // Cap at top 8 topics for readability
  return deduped.slice(0, 8);
}

function translatePlanningFlag(flag: PlanningFlag): ClientPlanningTopic {
  const area = FLAG_TO_AREA[flag.category];
  const priority = SEVERITY_TO_PRIORITY[flag.severity];

  // Translate the advisor-facing flag into client educational language.
  // Note: we deliberately strip product specifics ("recommend term life $1M")
  // and replace with educational topic language.
  const translation = translateFlagToTopic(flag);

  return {
    area,
    title: translation.title,
    educationalSummary: translation.summary,
    whyItMatters: translation.whyItMatters,
    whatToDiscussWithAdvisor: translation.whatToDiscussWithAdvisor,
    priorityForDiscussion: priority,
    educationalFacts: translation.facts,
  };
}

function translateFlagToTopic(flag: PlanningFlag): {
  title: string;
  summary: string;
  whyItMatters: string;
  whatToDiscussWithAdvisor: string;
  facts?: ClientFact[];
} {
  switch (flag.category) {
    case 'concentration':
      return {
        title: 'Investment concentration review',
        summary: 'Your responses indicate a sizeable portion of your investments may be concentrated in a single position or company.',
        whyItMatters: 'Concentration in a single security can amplify both gains and losses. Major historical examples (Enron, Bear Stearns, Silicon Valley Bank) show how quickly concentrated positions can lose substantial value.',
        whatToDiscussWithAdvisor: 'Ask your advisor to review your full holdings, identify any overweight positions (especially employer stock), and discuss diversification strategies that fit your tax situation and goals.',
      };

    case 'liquidity':
      return {
        title: 'Emergency reserves review',
        summary: 'Your reported cash reserves appear lower than is commonly recommended for handling unexpected expenses.',
        whyItMatters: 'Without adequate reserves, an unexpected expense can force selling investments at a bad time or taking on high-interest debt. Standard planning frameworks often suggest 3-6 months of expenses in liquid form.',
        whatToDiscussWithAdvisor: 'Discuss the right reserve level for your situation, where to hold those reserves, and a plan to build them up if currently below target.',
      };

    case 'insurance_gap':
      return {
        title: 'Protection coverage review',
        summary: 'Your reported insurance coverage may not fully match the protection needs of your situation.',
        whyItMatters: 'Insurance fills the gap between your assets and the financial impact of unexpected events. The right coverage depends on dependents, debts, income, health, and existing assets.',
        whatToDiscussWithAdvisor: 'Ask a licensed insurance professional to review your full coverage (life, disability, long-term care, umbrella, health) against your actual needs and existing assets.',
      };

    case 'estate_gap':
      return {
        title: 'Estate planning documents review',
        summary: 'One or more foundational estate planning documents (will, beneficiary designations, power of attorney, healthcare directive) appear to be missing or outdated.',
        whyItMatters: 'Foundational documents ensure your wishes are followed and your family has clarity if something happens to you. They are typically considered baseline regardless of net worth.',
        whatToDiscussWithAdvisor: 'Talk with an estate planning attorney about completing or updating these documents. A licensed financial advisor can help coordinate beneficiary designations with the rest of your plan.',
      };

    case 'risk_mismatch':
      return {
        title: 'Risk tolerance vs. circumstances discussion',
        summary: 'Your stated risk preferences and your current financial circumstances may suggest different risk levels.',
        whyItMatters: 'How much risk you are *willing* to take and how much you *can* take are not always the same. Industry frameworks generally favor the lower of the two when they conflict.',
        whatToDiscussWithAdvisor: 'Walk through this with a licensed advisor — they can help reconcile your risk preferences with your time horizon, income stability, and net worth.',
      };

    case 'sophistication_mismatch':
      return {
        title: 'Investment complexity discussion',
        summary: 'Some investment types in your portfolio or interests may be more complex than your reported experience level.',
        whyItMatters: 'Complex products (options, leveraged ETFs, alternatives, certain insurance products) can behave in unexpected ways. Industry guidelines generally recommend confirming understanding before holding them.',
        whatToDiscussWithAdvisor: 'Ask a licensed advisor to walk you through how each complex product in your portfolio actually works, what could go wrong, and whether it still fits your situation.',
      };

    case 'tax_inefficiency':
      return {
        title: 'Tax-efficiency review',
        summary: 'There may be opportunities to improve the after-tax efficiency of your overall plan.',
        whyItMatters: 'Where you hold an investment can matter as much as which investment you choose. Tax-aware planning can compound meaningfully over decades.',
        whatToDiscussWithAdvisor: 'Discuss with a licensed advisor or CPA how account types, asset location, and timing of taxable events fit your specific situation.',
      };

    case 'allocation_drift':
      return {
        title: 'Portfolio allocation drift review',
        summary: 'Your reported portfolio allocation may have drifted from a balance suited to your stated objectives.',
        whyItMatters: 'Markets naturally push allocations away from their original targets over time. Periodic review (and rebalancing if appropriate) is a standard part of disciplined planning.',
        whatToDiscussWithAdvisor: 'Ask a licensed advisor to compare your current allocation against your stated objective and time horizon, and discuss how often to review going forward.',
      };

    case 'goal_funding_gap':
      return {
        title: 'Goal funding progress review',
        summary: 'One or more of your goals appear to be tracking below the level needed to reach the target you described.',
        whyItMatters: 'Small adjustments earlier (savings rate, target amount, target date) often require less effort than large adjustments closer to the goal date.',
        whatToDiscussWithAdvisor: 'Discuss the goal with a licensed advisor — they can help model trade-offs between savings rate, target date, and target amount to find a realistic path.',
      };
  }
}

function buildGoalSummaries(perGoal: GoalAllocation[]): ClientGoalSummary[] {
  const currentYear = new Date().getFullYear();
  return perGoal.map((g) => {
    const yearsAway = Math.max(0, g.goal.targetYear - currentYear);
    let educationalStatus: ClientGoalSummary['educationalStatus'] = 'no progress data provided';
    let approximateGap: ClientFact | undefined;
    let topic = '';

    switch (g.fundingStatus) {
      case 'overfunded':
      case 'on_track':
        educationalStatus = 'on a positive track';
        topic = `Discuss with a licensed advisor whether your current approach to ${humanizeGoal(g.goal.type)} is still optimal as your circumstances evolve.`;
        break;
      case 'behind':
        educationalStatus = 'progressing';
        topic = `Discuss adjustments — savings rate, target date, or target amount — to bring ${humanizeGoal(g.goal.type)} back on track.`;
        if (g.fundingGap !== undefined) {
          approximateGap = {
            kind: 'quantitative',
            label: `Approximate projected shortfall at ${g.goal.targetYear}`,
            value: formatMoney(g.fundingGap),
            educationalContext: 'Educational projection based on responses provided and standard return assumptions. Actual results will differ.',
            referenceOnly: true,
          };
        }
        break;
      case 'critical':
        educationalStatus = 'priority for advisor discussion';
        topic = `This is a high-priority topic for advisor discussion: realistic options for closing the gap on ${humanizeGoal(g.goal.type)}.`;
        if (g.fundingGap !== undefined) {
          approximateGap = {
            kind: 'quantitative',
            label: `Approximate projected shortfall at ${g.goal.targetYear}`,
            value: formatMoney(g.fundingGap),
            educationalContext: 'Educational projection only — actual results will vary based on market performance, contributions, and many other factors.',
            referenceOnly: true,
          };
        }
        break;
      case 'unknown':
        educationalStatus = 'no progress data provided';
        topic = `Provide more detail on current savings and contributions for ${humanizeGoal(g.goal.type)} to enable a more useful advisor discussion.`;
        break;
    }

    return {
      goalLabel: humanizeGoal(g.goal.type),
      goalYear: g.goal.targetYear,
      yearsAway,
      educationalStatus,
      educationalNotes: educationalNoteForBucket(g.bucket),
      approximateGap,
      topicForAdvisor: topic,
    };
  });
}

function educationalNoteForBucket(bucket: GoalAllocation['bucket']): string {
  switch (bucket) {
    case 'short':
      return 'Short time horizons (under 2 years) typically call for capital-preservation-focused approaches because there may not be time to recover from market declines.';
    case 'short_intermediate':
      return 'Short-to-intermediate horizons (2-5 years) typically call for stability-oriented approaches with limited equity exposure.';
    case 'intermediate':
      return 'Intermediate horizons (5-10 years) typically allow for balanced approaches between stability and growth.';
    case 'long':
      return 'Long horizons (10-20 years) typically allow for moderate-growth approaches with meaningful equity exposure.';
    case 'very_long':
      return 'Very long horizons (20+ years) historically allow for more growth-oriented approaches because there is more time to recover from market declines.';
  }
}

function priorityRank(p: 'high' | 'medium' | 'low'): number {
  return p === 'high' ? 0 : p === 'medium' ? 1 : 2;
}

function humanizeGoal(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n.toFixed(0)}`;
}
