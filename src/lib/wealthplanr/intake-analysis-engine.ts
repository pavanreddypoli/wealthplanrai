/**
 * WealthPlanrAI — Intake Analysis Engine
 * ==========================================================================
 *
 * COMPLIANCE POSITIONING:
 *   WealthPlanrAI is an EDUCATION + INTAKE + ADVISOR ENABLEMENT platform.
 *   It is NOT an investment adviser, broker-dealer, insurance producer, or
 *   mortgage lender. This engine produces:
 *     - Educational analysis using standardized planning frameworks
 *     - Framework-aligned products for licensed advisor REVIEW (advisor view)
 *     - Educational topic flags for client preparation (client view)
 *
 *   Specific products named in the advisor view represent FRAMEWORK ALIGNMENT
 *   only — they are NOT recommendations from WealthPlanrAI. The licensed
 *   advisor receiving the report is solely responsible for suitability,
 *   fiduciary obligations, regulatory compliance, supervision, disclosures,
 *   and all client recommendations.
 *
 *   See compliance-module.ts for all disclaimer text and audit trail logic.
 *
 * FRAMEWORK BASIS:
 *   NASAA Series 65 "Recommendations & Strategies" suitability framework.
 *   Every aligned-product output is traceable to specific client data points
 *   and the framework principle that justified its inclusion.
 *
 * ARCHITECTURE:
 *   Input  (ClientIntakeProfile)
 *     │
 *     ├─► classifyStatedObjective()           — what the client SAYS they want
 *     ├─► computeRiskCapacityCeiling()        — what their circumstances support
 *     ├─► deriveFinalObjective()              — min(stated, capacity)
 *     ├─► computeFrameworkAllocation()        — Rule of 100 + adjustments
 *     ├─► buildAlignedProducts()              — objective → product universe
 *     ├─► applySuitabilityFilters()           — sophistication, tax, liquidity, values
 *     ├─► computePerGoalAllocations()         — time-horizon per goal
 *     ├─► chooseBondStrategy()                — ladder / barbell / bullet
 *     ├─► generateTaxConsiderations()         — asset location, account type
 *     ├─► detectPlanningFlags()               — concentration, mismatches, gaps
 *     │
 *     ▼
 *   Output (IntakeAnalysisOutput) → wrapped in DisclaimerEnvelope before display
 *
 * Last updated: 2026-05
 * ==========================================================================
 */

import {
  ADVISOR_PDF_DISCLAIMER,
  CLIENT_PDF_DISCLAIMER,
  DISCLAIMER_VERSION,
} from './compliance-module';

// ============================================================================
// SECTION 1 — TYPE DEFINITIONS
// ============================================================================

/**
 * The 8 standard Series 65 investment objectives.
 * Ordered from least risky (0) to most risky (7).
 */
export enum InvestmentObjective {
  PreservationOfCapital = 'preservation_of_capital',
  SafetyOfPrincipal = 'safety_of_principal',
  TaxAdvantagedIncome = 'tax_advantaged_income',
  ModerateIncome = 'moderate_income',
  ModerateGrowth = 'moderate_growth',
  HighYieldIncome = 'high_yield_income',
  AggressiveGrowth = 'aggressive_growth',
  Speculation = 'speculation',
}

/** Rank order used for ceiling/min comparisons. */
const OBJECTIVE_RANK: Record<InvestmentObjective, number> = {
  [InvestmentObjective.PreservationOfCapital]: 0,
  [InvestmentObjective.SafetyOfPrincipal]: 1,
  [InvestmentObjective.TaxAdvantagedIncome]: 2,
  [InvestmentObjective.ModerateIncome]: 3,
  [InvestmentObjective.ModerateGrowth]: 4,
  [InvestmentObjective.HighYieldIncome]: 5,
  [InvestmentObjective.AggressiveGrowth]: 6,
  [InvestmentObjective.Speculation]: 7,
};

export enum RiskTolerance {
  Conservative = 'conservative',
  ModerateConservative = 'moderate_conservative',
  Moderate = 'moderate',
  ModerateAggressive = 'moderate_aggressive',
  Aggressive = 'aggressive',
}

export enum InvestmentExperience {
  Limited = 'limited',         // few or no products held; needs basics
  Moderate = 'moderate',       // mutual funds, ETFs, basic stocks
  Sophisticated = 'sophisticated', // options, alts, complex products
}

export enum IncomeSource {
  W2Employment = 'w2',
  SelfEmployed1099 = '1099',
  BusinessOwner = 'business_owner',
  RetireeFixed = 'retiree_fixed',
  Mixed = 'mixed',
  Unemployed = 'unemployed',
}

export enum ClientType {
  IndividualRetail = 'individual_retail',
  JointHousehold = 'joint_household',
  Business = 'business',
  Trust = 'trust',
  Estate = 'estate',
  Foundation = 'foundation',
}

export enum GoalType {
  Retirement = 'retirement',
  CollegeFunding = 'college_funding',
  HomePurchase = 'home_purchase',
  EmergencyFund = 'emergency_fund',
  BusinessFunding = 'business_funding',
  WealthTransfer = 'wealth_transfer',
  CharitableGiving = 'charitable_giving',
  MajorPurchase = 'major_purchase',
  DebtPayoff = 'debt_payoff',
}

export interface Goal {
  type: GoalType;
  targetYear: number;            // calendar year
  targetAmount: number;          // dollars
  currentSaved?: number;         // dollars
  monthlyContribution?: number;  // dollars
  priority: 'high' | 'medium' | 'low';
}

export interface Holding {
  type: string;                  // 'individual_stock' | 'mutual_fund' | 'etf' | 'bond' | etc
  description: string;
  value: number;
  isEmployerStock?: boolean;
  accountType?: 'taxable' | 'traditional_401k' | 'roth_401k' | 'traditional_ira' | 'roth_ira' | 'hsa' | '529' | 'other_tax_deferred';
}

export interface InsuranceCoverage {
  termLife?: number;
  wholeLife?: number;
  iul?: number;
  vul?: number;
  disability?: { monthlyBenefit: number };
  longTermCare?: boolean;
  health?: boolean;
  hasUmbrella?: boolean;
}

export interface ClientIntakeProfile {
  // Identity & Type
  clientType: ClientType;
  fullName?: string;

  // Demographics
  age: number;
  spouseAge?: number;
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  dependents: { count: number; ages?: number[]; specialNeeds?: boolean };
  healthStatus?: 'excellent' | 'good' | 'fair' | 'poor';

  // Financial — Income side
  annualIncome: number;
  spouseIncome?: number;
  incomeSource: IncomeSource;
  marginalTaxBracket: number;    // e.g., 0.24 for 24%
  state?: string;                // for state-tax / muni residency considerations

  // Financial — Balance sheet
  assets: number;
  liabilities: number;
  liquidAssets: number;          // cash, MMF, brokerage minus locked positions
  retirementAssets: number;      // 401k/IRA balances

  // Liquidity & cash flow
  monthlyExpenses: number;
  emergencyFundMonths: number;   // months of expenses currently in cash equivalents
  nearTermExpense?: { amount: number; monthsAway: number };

  // Investment profile
  investmentExperience: InvestmentExperience;
  productExperience: string[];   // ['individual_stocks','mutual_funds','etfs','options','alts',...]
  riskTolerance: RiskTolerance;
  statedObjective?: InvestmentObjective; // optional self-classification

  // Goals (per-goal time horizons)
  goals: Goal[];

  // Current portfolio
  currentHoldings: Holding[];

  // Insurance
  insurance: InsuranceCoverage;

  // Estate
  estate: {
    hasWill: boolean;
    hasTrust: boolean;
    beneficiariesNamed: boolean;
    powerOfAttorney: boolean;
    healthcareDirective: boolean;
    estateValue?: number;
  };

  // Values & exclusions
  esgImportance?: 'high' | 'medium' | 'low' | 'none';
  religiousScreen?: 'none' | 'christian_general' | 'catholic' | 'islamic_halal' | 'jewish' | 'other';
  sectorExclusions?: string[];   // ['tobacco','alcohol','gambling','firearms','fossil_fuels',...]

  // Behavioral / preference signals (optional)
  managementStylePreference?: 'active' | 'passive' | 'either';
  costSensitivity?: 'high' | 'medium' | 'low';
}

// ----- Output types -------------------------------------------------------

export interface AssetAllocation {
  equity: number;        // percentage 0-100
  fixedIncome: number;
  cash: number;
  alternatives: number;  // REITs, commodities, hedge funds, etc.
  // Equity sub-allocation
  equityBreakdown: {
    largeCapDomestic: number;     // % of equity sleeve
    midCapDomestic: number;
    smallCapDomestic: number;
    international: number;
    emergingMarkets: number;
    sectorTilts: number;
  };
  // Fixed income sub-allocation
  fixedIncomeBreakdown: {
    treasuries: number;            // % of FI sleeve
    investmentGradeCorporate: number;
    municipals: number;
    highYield: number;
    tips: number;
    international: number;
  };
}

export interface AlignedProduct {
  category: 'protect' | 'grow' | 'legacy';
  product: string;
  status: 'aligned' | 'consider' | 'not_applicable' | 'excluded';
  rationale: string;
  clientDataPointsUsed: string[];   // ["age=58","income=200k","horizon=7yr"]
  priority: 'high' | 'medium' | 'low';
  excludedReason?: string;
}

export interface PlanningFlag {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'concentration' | 'liquidity' | 'insurance_gap' | 'estate_gap'
    | 'risk_mismatch' | 'sophistication_mismatch' | 'tax_inefficiency'
    | 'allocation_drift' | 'goal_funding_gap';
  message: string;
  advisorDiscussionTopic: string;
}

export interface GoalAllocation {
  goal: Goal;
  yearsToGoal: number;
  bucket: 'short' | 'short_intermediate' | 'intermediate' | 'long' | 'very_long';
  alignedAllocation: AssetAllocation;
  fundingStatus: 'on_track' | 'behind' | 'critical' | 'overfunded' | 'unknown';
  fundingGap?: number;                        // shortfall in projected dollars at goal year
  indicativeMonthlyContribution?: number;    // to close the gap
}

export interface TaxConsideration {
  topic: 'asset_location' | 'account_type' | 'roth_conversion' | 'tax_loss_harvesting' | 'muni_consideration' | 'qualified_dividend';
  message: string;
  estimatedAnnualBenefit?: number; // qualitative okay if not calculable
  rationale: string;
}

export type BondStrategy = 'ladder' | 'barbell' | 'bullet' | 'none';

export interface IntakeAnalysisOutput {
  // ── Disclaimer envelope (always present) ──────────────────────────────
  disclaimerVersion: string;
  notFinancialAdvice: true;
  noAdvisorRelationship: true;
  educationalNotice: string;
  productsAreFrameworkAligned: true;       // products named are NOT recommendations
  advisorResponsibleForRecommendations: true;

  // ── Classification ────────────────────────────────────────────────────
  frameworkObjective: InvestmentObjective;
  statedObjective: InvestmentObjective;
  riskCapacityCeiling: InvestmentObjective;
  classificationRationale: string;

  // ── Allocation ────────────────────────────────────────────────────────
  frameworkAllocation: AssetAllocation;
  ruleOf100Reference: { equity: number; fixedIncome: number };
  allocationAdjustments: string[];   // human-readable adjustment reasons

  // ── Framework-aligned products (advisor view) ─────────────────────────
  alignedProducts: AlignedProduct[];
  consideredButExcludedProducts: AlignedProduct[];

  // ── Per-goal ──────────────────────────────────────────────────────────
  perGoalAllocations: GoalAllocation[];

  // ── Strategies ────────────────────────────────────────────────────────
  bondStrategy: BondStrategy;
  bondStrategyRationale: string;
  managementStyle: 'active' | 'passive' | 'core_satellite';
  managementStyleRationale: string;

  // ── Tax ───────────────────────────────────────────────────────────────
  taxConsiderations: TaxConsideration[];

  // ── Flags ─────────────────────────────────────────────────────────────
  planningFlags: PlanningFlag[];

  // ── Scoring ───────────────────────────────────────────────────────────
  subScores: {
    cashflow: number;
    retirement: number;
    insurance: number;
    tax: number;
    estate: number;
    investments: number;
    diversification: number;   // NEW: 7th sub-score
  };
  overallScore: number;

  // ── Compliance trail ──────────────────────────────────────────────────
  complianceNotes: string[];
  advisorReportDisclaimer: string;
  clientReportDisclaimer: string;
}

// ============================================================================
// SECTION 2 — CONSTANTS & LOOKUP TABLES
// ============================================================================

/**
 * Objective → Recommended product universe.
 * Source: Series 65 "Goals & Objectives" chapter.
 */
const OBJECTIVE_PRODUCT_MAP: Record<InvestmentObjective, {
  recommended: string[];
  avoid: string[];
}> = {
  [InvestmentObjective.PreservationOfCapital]: {
    recommended: ['Money market funds', 'Treasury bills', 'Short-term CDs', 'Treasury floating-rate notes'],
    avoid: ['Long-duration bonds', 'Equities', 'Junk bonds', 'Options', 'Leveraged ETFs'],
  },
  [InvestmentObjective.SafetyOfPrincipal]: {
    recommended: ['Treasury notes (2-10yr)', 'Treasury bonds', 'TIPS', 'Investment-grade corporate bonds (short)', 'GNMA / agency MBS'],
    avoid: ['High-yield bonds', 'Small-cap equities', 'Options', 'Alternatives'],
  },
  [InvestmentObjective.TaxAdvantagedIncome]: {
    recommended: ['Municipal bonds (in-state preferred)', 'Municipal bond funds', 'Preferred stock (esp. for corp clients)', 'Qualified dividend stocks'],
    avoid: ['Munis in retirement accounts (wastes exemption)', 'Corporate bonds in taxable account at high bracket'],
  },
  [InvestmentObjective.ModerateIncome]: {
    recommended: ['Investment-grade corporate bonds', 'Preferred stock', 'Dividend-paying large-cap stocks', 'Utility & consumer staple equities', 'Bond mutual funds / ETFs'],
    avoid: ['Junk bonds', 'Pure growth stocks (no dividend)', 'Speculative options'],
  },
  [InvestmentObjective.ModerateGrowth]: {
    recommended: ['Large-cap growth stocks', 'Mid-cap stocks', 'Defensive stocks (utilities, staples, pharma)', 'Broad-market index funds (S&P 500, Total Market)', 'Balanced funds'],
    avoid: ['Speculative penny stocks', 'Naked options', 'Single-sector concentration'],
  },
  [InvestmentObjective.HighYieldIncome]: {
    recommended: ['High-yield (junk) bond funds', 'Distressed preferred stock', 'Senior loan funds', 'Some BDCs'],
    avoid: ['Treasuries (yield too low for objective)', 'For elderly/conservative clients (suitability mismatch)'],
  },
  [InvestmentObjective.AggressiveGrowth]: {
    recommended: ['Small-cap stocks', 'Sector funds (technology, energy, biotech)', 'Emerging market equity funds', 'Growth-style mutual funds/ETFs', 'Mid-cap growth'],
    avoid: ['Bonds (no growth)', 'Money market funds (ex-cash sleeve)', 'Cash beyond reserve'],
  },
  [InvestmentObjective.Speculation]: {
    recommended: ['Options (covered calls, protective puts; long calls/puts only for sophisticated)', 'Penny stocks', 'Leveraged ETFs', 'Inverse ETFs', 'Concentrated single-stock positions'],
    avoid: ['Recommend ONLY for sophisticated investors with disposable wealth'],
  },
};

/**
 * Objective → Target asset allocation baseline (before age/circumstance adjustments).
 * Each line: equity / fixed income / cash / alternatives.
 */
const OBJECTIVE_ALLOCATION_BASELINE: Record<InvestmentObjective, AssetAllocation> = {
  [InvestmentObjective.PreservationOfCapital]: {
    equity: 0, fixedIncome: 30, cash: 70, alternatives: 0,
    equityBreakdown: { largeCapDomestic: 0, midCapDomestic: 0, smallCapDomestic: 0, international: 0, emergingMarkets: 0, sectorTilts: 0 },
    fixedIncomeBreakdown: { treasuries: 100, investmentGradeCorporate: 0, municipals: 0, highYield: 0, tips: 0, international: 0 },
  },
  [InvestmentObjective.SafetyOfPrincipal]: {
    equity: 10, fixedIncome: 75, cash: 15, alternatives: 0,
    equityBreakdown: { largeCapDomestic: 80, midCapDomestic: 10, smallCapDomestic: 0, international: 10, emergingMarkets: 0, sectorTilts: 0 },
    fixedIncomeBreakdown: { treasuries: 50, investmentGradeCorporate: 30, municipals: 0, highYield: 0, tips: 20, international: 0 },
  },
  [InvestmentObjective.TaxAdvantagedIncome]: {
    equity: 25, fixedIncome: 70, cash: 5, alternatives: 0,
    equityBreakdown: { largeCapDomestic: 70, midCapDomestic: 15, smallCapDomestic: 0, international: 15, emergingMarkets: 0, sectorTilts: 0 },
    fixedIncomeBreakdown: { treasuries: 10, investmentGradeCorporate: 15, municipals: 65, highYield: 0, tips: 10, international: 0 },
  },
  [InvestmentObjective.ModerateIncome]: {
    equity: 35, fixedIncome: 60, cash: 5, alternatives: 0,
    equityBreakdown: { largeCapDomestic: 75, midCapDomestic: 10, smallCapDomestic: 0, international: 15, emergingMarkets: 0, sectorTilts: 0 },
    fixedIncomeBreakdown: { treasuries: 25, investmentGradeCorporate: 50, municipals: 10, highYield: 5, tips: 10, international: 0 },
  },
  [InvestmentObjective.ModerateGrowth]: {
    equity: 60, fixedIncome: 35, cash: 5, alternatives: 0,
    equityBreakdown: { largeCapDomestic: 55, midCapDomestic: 15, smallCapDomestic: 10, international: 15, emergingMarkets: 5, sectorTilts: 0 },
    fixedIncomeBreakdown: { treasuries: 30, investmentGradeCorporate: 50, municipals: 5, highYield: 5, tips: 10, international: 0 },
  },
  [InvestmentObjective.HighYieldIncome]: {
    equity: 30, fixedIncome: 65, cash: 5, alternatives: 0,
    equityBreakdown: { largeCapDomestic: 60, midCapDomestic: 15, smallCapDomestic: 10, international: 15, emergingMarkets: 0, sectorTilts: 0 },
    fixedIncomeBreakdown: { treasuries: 10, investmentGradeCorporate: 25, municipals: 0, highYield: 60, tips: 5, international: 0 },
  },
  [InvestmentObjective.AggressiveGrowth]: {
    equity: 85, fixedIncome: 10, cash: 5, alternatives: 0,
    equityBreakdown: { largeCapDomestic: 40, midCapDomestic: 15, smallCapDomestic: 20, international: 15, emergingMarkets: 10, sectorTilts: 0 },
    fixedIncomeBreakdown: { treasuries: 30, investmentGradeCorporate: 60, municipals: 0, highYield: 10, tips: 0, international: 0 },
  },
  [InvestmentObjective.Speculation]: {
    equity: 90, fixedIncome: 0, cash: 5, alternatives: 5,
    equityBreakdown: { largeCapDomestic: 25, midCapDomestic: 15, smallCapDomestic: 30, international: 10, emergingMarkets: 10, sectorTilts: 10 },
    fixedIncomeBreakdown: { treasuries: 0, investmentGradeCorporate: 0, municipals: 0, highYield: 0, tips: 0, international: 0 },
  },
};

/** Time-horizon buckets used for per-goal allocations. */
const HORIZON_BUCKETS = [
  { name: 'short' as const,              maxYears: 2,  baseObjective: InvestmentObjective.PreservationOfCapital },
  { name: 'short_intermediate' as const, maxYears: 5,  baseObjective: InvestmentObjective.SafetyOfPrincipal },
  { name: 'intermediate' as const,       maxYears: 10, baseObjective: InvestmentObjective.ModerateIncome },
  { name: 'long' as const,               maxYears: 20, baseObjective: InvestmentObjective.ModerateGrowth },
  { name: 'very_long' as const,          maxYears: 99, baseObjective: InvestmentObjective.AggressiveGrowth },
];

/**
 * Sophistication gate: products that require InvestmentExperience >= Sophisticated.
 * Series 65 explicit requirement: don't recommend complex products without
 * confirming client understanding.
 */
const SOPHISTICATION_GATED_PRODUCTS = [
  'Options', 'Naked options', 'Long calls', 'Long puts', 'Covered calls',
  'Protective puts', 'Leveraged ETFs', 'Inverse ETFs',
  'Hedge funds', 'Private equity', 'Structured notes',
  'Variable Universal Life (VUL)', 'Indexed Universal Life (IUL)',
  'Limited partnerships', 'Penny stocks', 'Distressed debt',
];

/** Insurance product universe (for the existing PDF matrix). */
const INSURANCE_PRODUCTS = [
  'Term Life Insurance', 'Whole Life Insurance', 'Universal Life Insurance',
  'Indexed Universal Life (IUL)', 'Variable Universal Life (VUL)',
  'Disability Insurance', 'Critical Illness Insurance',
  'Long-Term Care Insurance', 'Health Insurance', 'Accident Insurance',
  'Income Replacement Insurance', 'Key Person Insurance',
];

const GROWTH_VEHICLES = [
  '401(k)', 'Roth IRA', 'Traditional IRA', 'SEP IRA', 'SIMPLE IRA',
  'HSA', '529 Plan', 'Brokerage Accounts', 'Mutual Funds', 'ETFs',
  'Individual Stocks', 'Robo Advisory Portfolios',
  'Fixed Annuities', 'Fixed Indexed Annuities (FIA)', 'MYGA',
  'Variable Annuities', 'IUL (dual-purpose)', 'VUL (dual-purpose)',
];

const LEGACY_VEHICLES = [
  'Will', 'Revocable Trust', 'Irrevocable Trust',
  'Power of Attorney', 'Healthcare Directive',
  'Whole Life Insurance (estate liquidity)', 'IUL (estate)',
  'Annuity Beneficiary Structures', 'Charitable Remainder Trust',
  'Charitable Lead Trust', 'Estate Freeze (GRATs)',
  'Annual Gifting', 'Business Succession Plan',
];

// ============================================================================
// SECTION 3 — STEP FUNCTIONS
// ============================================================================

/**
 * Step 1 — Classify the client's STATED investment objective.
 * Uses self-reported objective if provided; otherwise infers from risk tolerance + age.
 */
export function classifyStatedObjective(profile: ClientIntakeProfile): InvestmentObjective {
  if (profile.statedObjective) return profile.statedObjective;

  const { age, riskTolerance } = profile;

  // Map risk tolerance + life stage to default stated objective.
  if (riskTolerance === RiskTolerance.Conservative) {
    return age >= 70 ? InvestmentObjective.PreservationOfCapital : InvestmentObjective.SafetyOfPrincipal;
  }
  if (riskTolerance === RiskTolerance.ModerateConservative) {
    return age >= 65 ? InvestmentObjective.SafetyOfPrincipal : InvestmentObjective.ModerateIncome;
  }
  if (riskTolerance === RiskTolerance.Moderate) {
    return age >= 60 ? InvestmentObjective.ModerateIncome : InvestmentObjective.ModerateGrowth;
  }
  if (riskTolerance === RiskTolerance.ModerateAggressive) {
    // ModerateAggressive ≈ classic 70/30 — Moderate Growth, regardless of age.
    // Aggressive Growth is reserved for clients who explicitly identify as Aggressive.
    return InvestmentObjective.ModerateGrowth;
  }
  // Aggressive
  return age >= 60 ? InvestmentObjective.ModerateGrowth : InvestmentObjective.AggressiveGrowth;
}

/**
 * Step 2 — Compute the client's RISK CAPACITY CEILING.
 * This is independent of what the client SAYS they want — it's what they
 * can actually absorb without endangering their financial security.
 *
 * Series 65 principle: "the less risky choice is often the best answer"
 * when stated tolerance and circumstances disagree.
 */
export function computeRiskCapacityCeiling(profile: ClientIntakeProfile): {
  ceiling: InvestmentObjective;
  factors: string[];
} {
  const factors: string[] = [];
  let ceilingRank = OBJECTIVE_RANK[InvestmentObjective.Speculation]; // start unrestricted

  const netWorth = profile.assets - profile.liabilities;
  const debtToAsset = profile.assets > 0 ? profile.liabilities / profile.assets : 1;
  const liquidityCoverage = profile.monthlyExpenses > 0
    ? profile.liquidAssets / profile.monthlyExpenses
    : 0;

  // Age-driven capacity ceilings
  if (profile.age >= 75) {
    ceilingRank = Math.min(ceilingRank, OBJECTIVE_RANK[InvestmentObjective.ModerateIncome]);
    factors.push('Age 75+: capacity capped at Moderate Income');
  } else if (profile.age >= 65) {
    ceilingRank = Math.min(ceilingRank, OBJECTIVE_RANK[InvestmentObjective.ModerateGrowth]);
    factors.push('Age 65+: capacity capped at Moderate Growth');
  }

  // Income source: fixed-income retirees can't take growth/speculation risk on core money
  if (profile.incomeSource === IncomeSource.RetireeFixed && netWorth < 1_500_000) {
    ceilingRank = Math.min(ceilingRank, OBJECTIVE_RANK[InvestmentObjective.ModerateIncome]);
    factors.push('Retiree on fixed income with NW <$1.5M: capacity capped at Moderate Income');
  }

  if (profile.incomeSource === IncomeSource.Unemployed) {
    ceilingRank = Math.min(ceilingRank, OBJECTIVE_RANK[InvestmentObjective.SafetyOfPrincipal]);
    factors.push('No employment income: capacity capped at Safety of Principal');
  }

  // Liquidity stress
  if (liquidityCoverage < 3) {
    ceilingRank = Math.min(ceilingRank, OBJECTIVE_RANK[InvestmentObjective.ModerateGrowth]);
    factors.push('Less than 3 months emergency liquidity: build reserve before aggressive risk');
  }

  // High debt load
  if (debtToAsset > 0.5) {
    ceilingRank = Math.min(ceilingRank, OBJECTIVE_RANK[InvestmentObjective.ModerateGrowth]);
    factors.push('Debt-to-asset > 50%: prioritize debt paydown over aggressive growth');
  }

  // Net-worth uplift: the doc's "80yo multi-millionaire" exception
  // High net worth + non-essential investable funds → can lift ceiling back up
  // (only if other factors don't dominate)
  if (netWorth >= 5_000_000 && liquidityCoverage >= 12) {
    // Don't *cap* at all — they can speculate within a play sleeve
    factors.push('NW $5M+ with ample liquidity: capacity ceiling lifted (play sleeve allowed)');
    ceilingRank = OBJECTIVE_RANK[InvestmentObjective.Speculation];
  } else if (netWorth >= 2_000_000 && profile.age < 70) {
    factors.push('NW $2M+ and under 70: aggressive growth capacity preserved');
    ceilingRank = Math.max(ceilingRank, OBJECTIVE_RANK[InvestmentObjective.AggressiveGrowth]);
  }

  // Sophistication ceiling — can't recommend speculation to inexperienced
  if (profile.investmentExperience === InvestmentExperience.Limited) {
    ceilingRank = Math.min(ceilingRank, OBJECTIVE_RANK[InvestmentObjective.ModerateGrowth]);
    factors.push('Limited investment experience: capacity capped at Moderate Growth pending education');
  }

  // Find the objective matching the final ceiling rank
  const ceiling = (Object.keys(OBJECTIVE_RANK) as InvestmentObjective[])
    .find((k) => OBJECTIVE_RANK[k] === ceilingRank) ?? InvestmentObjective.ModerateGrowth;

  return { ceiling, factors };
}

/**
 * Step 3 — Derive the FINAL primary objective.
 * Rule: min(stated objective, capacity ceiling).
 * Series 65: "err on the side of caution" — when in doubt, less risk wins.
 */
export function deriveFinalObjective(
  stated: InvestmentObjective,
  ceiling: InvestmentObjective,
): { objective: InvestmentObjective; wasCapped: boolean } {
  const statedRank = OBJECTIVE_RANK[stated];
  const ceilingRank = OBJECTIVE_RANK[ceiling];
  if (statedRank > ceilingRank) {
    return { objective: ceiling, wasCapped: true };
  }
  return { objective: stated, wasCapped: false };
}

/**
 * Step 4 — Compute target asset allocation.
 * Start from objective baseline + Rule of 100, then apply named adjustments.
 */
export function computeFrameworkAllocation(
  profile: ClientIntakeProfile,
  objective: InvestmentObjective,
): { allocation: AssetAllocation; ruleOf100: { equity: number; fixedIncome: number }; adjustments: string[] } {
  const baseline = OBJECTIVE_ALLOCATION_BASELINE[objective];
  const ruleOf100Equity = Math.max(0, Math.min(100, 100 - profile.age));
  const ruleOf100 = { equity: ruleOf100Equity, fixedIncome: 100 - ruleOf100Equity };

  // Start from the objective baseline (this already encodes the right shape).
  const allocation: AssetAllocation = JSON.parse(JSON.stringify(baseline));
  const adjustments: string[] = [];

  // Adjust toward the Rule of 100 if the spread is large (reconcile age vs objective).
  // Pull 1/3 of the gap rather than half, to keep objective baseline as the dominant driver.
  const drift = ruleOf100Equity - allocation.equity;
  if (Math.abs(drift) > 20) {
    const shift = Math.round(drift / 3);
    allocation.equity = clamp(allocation.equity + shift, 0, 100);
    allocation.fixedIncome = clamp(allocation.fixedIncome - shift, 0, 100);
    adjustments.push(`Rule of 100 reconciliation (age ${profile.age}): equity ${shift > 0 ? '+' : ''}${shift}pp`);
  }

  const netWorth = profile.assets - profile.liabilities;

  // High net worth uplift
  if (netWorth >= 2_000_000 && objective !== InvestmentObjective.PreservationOfCapital) {
    allocation.equity = clamp(allocation.equity + 5, 0, 95);
    allocation.fixedIncome = clamp(allocation.fixedIncome - 5, 0, 100);
    adjustments.push('+5pp equity: high net worth allows additional risk capacity');
  }

  // Tax-bracket muni tilt
  if (profile.marginalTaxBracket >= 0.32 && allocation.fixedIncome > 0) {
    const beforeMuni = allocation.fixedIncomeBreakdown.municipals;
    allocation.fixedIncomeBreakdown.municipals = Math.min(70, beforeMuni + 25);
    allocation.fixedIncomeBreakdown.investmentGradeCorporate = Math.max(0, allocation.fixedIncomeBreakdown.investmentGradeCorporate - 15);
    allocation.fixedIncomeBreakdown.treasuries = Math.max(0, allocation.fixedIncomeBreakdown.treasuries - 10);
    adjustments.push('Marginal bracket ≥32%: muni allocation increased within fixed income sleeve');
  }

  // Dependents → bias toward stability
  if (profile.dependents.count >= 3 && objective === InvestmentObjective.AggressiveGrowth) {
    allocation.equity = clamp(allocation.equity - 5, 0, 100);
    allocation.fixedIncome = clamp(allocation.fixedIncome + 5, 0, 100);
    adjustments.push('-5pp equity: 3+ dependents argues for additional stability');
  }

  // Short emergency fund → bump cash
  if (profile.emergencyFundMonths < 3) {
    const cashShift = Math.min(5, allocation.equity);
    allocation.equity -= cashShift;
    allocation.cash += cashShift;
    adjustments.push(`+${cashShift}pp cash: emergency fund <3 months — build reserve first`);
  }

  // Normalize totals
  normalizeAllocation(allocation);

  return { allocation, ruleOf100, adjustments };
}

/**
 * Step 5 — Build product recommendations from the objective universe + suitability filters.
 */
export function buildAlignedProducts(
  profile: ClientIntakeProfile,
  objective: InvestmentObjective,
): { recommended: AlignedProduct[]; excluded: AlignedProduct[] } {
  const recommended: AlignedProduct[] = [];
  const excluded: AlignedProduct[] = [];

  const universe = OBJECTIVE_PRODUCT_MAP[objective];
  const dataPoints = [
    `age=${profile.age}`,
    `objective=${objective}`,
    `bracket=${(profile.marginalTaxBracket * 100).toFixed(0)}%`,
    `experience=${profile.investmentExperience}`,
    `netWorth=${profile.assets - profile.liabilities}`,
  ];

  // ---- Investment products from objective universe ----
  for (const product of universe.recommended) {
    const sophGated = SOPHISTICATION_GATED_PRODUCTS.some((p) => product.includes(p));
    if (sophGated && profile.investmentExperience !== InvestmentExperience.Sophisticated) {
      excluded.push({
        category: 'grow',
        product,
        status: 'excluded',
        rationale: 'Requires Sophisticated investment experience.',
        clientDataPointsUsed: [`experience=${profile.investmentExperience}`],
        priority: 'medium',
        excludedReason: 'Sophistication gate: client has not held similar products. Document understanding before recommending.',
      });
      continue;
    }
    recommended.push({
      category: 'grow',
      product,
      status: 'aligned',
      rationale: `Framework-aligned with ${humanize(objective)} objective per the Series 65 product universe. Specific product selection and final suitability remain the licensed advisor's determination.`,
      clientDataPointsUsed: dataPoints,
      priority: 'high',
    });
  }

  for (const product of universe.avoid) {
    excluded.push({
      category: 'grow',
      product,
      status: 'not_applicable',
      rationale: `Inconsistent with the ${humanize(objective)} objective under the Series 65 framework.`,
      clientDataPointsUsed: dataPoints,
      priority: 'low',
      excludedReason: 'Mismatched to framework objective.',
    });
  }

  // ---- Account-type recommendations ----
  buildAccountTypeConsiderations(profile, recommended);

  // ---- Insurance recommendations ----
  buildInsuranceConsiderations(profile, recommended, excluded);

  // ---- Legacy / estate recommendations ----
  buildLegacyConsiderations(profile, recommended);

  // ---- Tax filters ----
  applyTaxFilters(profile, recommended, excluded);

  // ---- Values filters ----
  applyValuesFilters(profile, recommended, excluded);

  return { recommended, excluded };
}

function buildAccountTypeConsiderations(profile: ClientIntakeProfile, out: AlignedProduct[]) {
  const dp = [`age=${profile.age}`, `income=${profile.annualIncome}`, `bracket=${profile.marginalTaxBracket}`];

  // 401(k) — always recommended for W-2 employees
  if (profile.incomeSource === IncomeSource.W2Employment || profile.incomeSource === IncomeSource.Mixed) {
    out.push({
      category: 'grow',
      product: '401(k) contribution to employer match',
      status: 'aligned',
      rationale: 'Free money via employer match; tax-deferred growth.',
      clientDataPointsUsed: dp,
      priority: 'high',
    });
  }

  // Roth vs Traditional decision
  if (profile.marginalTaxBracket <= 0.22 && profile.age < 50) {
    out.push({
      category: 'grow',
      product: 'Roth IRA (priority over Traditional)',
      status: 'aligned',
      rationale: 'Current bracket ≤22% and long horizon: Roth likely beats Traditional on after-tax basis.',
      clientDataPointsUsed: dp,
      priority: 'high',
    });
  } else if (profile.marginalTaxBracket >= 0.32) {
    out.push({
      category: 'grow',
      product: 'Traditional 401(k) / Backdoor Roth IRA',
      status: 'aligned',
      rationale: 'High current bracket: maximize tax-deferred contributions; consider backdoor Roth for above-limit income.',
      clientDataPointsUsed: dp,
      priority: 'high',
    });
  }

  // SEP / Solo 401(k) for self-employed
  if (profile.incomeSource === IncomeSource.SelfEmployed1099 || profile.incomeSource === IncomeSource.BusinessOwner) {
    out.push({
      category: 'grow',
      product: 'SEP IRA or Solo 401(k)',
      status: 'aligned',
      rationale: 'Self-employed: significantly higher contribution limits than IRA.',
      clientDataPointsUsed: dp,
      priority: 'high',
    });
  }

  // 529 for education
  const collegeGoal = profile.goals.find((g) => g.type === GoalType.CollegeFunding);
  if (collegeGoal) {
    out.push({
      category: 'grow',
      product: '529 College Savings Plan',
      status: 'aligned',
      rationale: 'Tax-free growth for qualified education expenses; possible state tax deduction.',
      clientDataPointsUsed: ['has_college_goal=true'],
      priority: 'high',
    });
  }

  // HSA — always recommended if HDHP
  out.push({
    category: 'grow',
    product: 'Health Savings Account (HSA) — if HDHP-eligible',
    status: 'consider',
    rationale: 'Triple tax advantage: pre-tax in, tax-free growth, tax-free out for medical.',
    clientDataPointsUsed: dp,
    priority: 'medium',
  });
}

function buildInsuranceConsiderations(
  profile: ClientIntakeProfile,
  out: AlignedProduct[],
  excluded: AlignedProduct[],
) {
  const dp = [`age=${profile.age}`, `dependents=${profile.dependents.count}`, `income=${profile.annualIncome}`];

  // Term life — if dependents and income but no/insufficient coverage
  const lifeCoverage = (profile.insurance.termLife ?? 0) + (profile.insurance.wholeLife ?? 0)
    + (profile.insurance.iul ?? 0) + (profile.insurance.vul ?? 0);
  const lifeCoverageBenchmark = profile.dependents.count > 0 ? profile.annualIncome * 10 : 0;

  if (lifeCoverageBenchmark > 0 && lifeCoverage < lifeCoverageBenchmark * 0.5) {
    out.push({
      category: 'protect',
      product: `Term Life Insurance (~$${formatMoney(lifeCoverageBenchmark)})`,
      status: 'aligned',
      rationale: `Has ${profile.dependents.count} dependent(s) and ${formatMoney(profile.annualIncome)} income but ${formatMoney(lifeCoverage)} coverage. Industry guideline: 10× income.`,
      clientDataPointsUsed: dp,
      priority: 'high',
    });
  } else if (lifeCoverageBenchmark > 0 && lifeCoverage < lifeCoverageBenchmark) {
    out.push({
      category: 'protect',
      product: 'Increase Term Life Coverage',
      status: 'consider',
      rationale: 'Existing coverage below 10× income guideline.',
      clientDataPointsUsed: dp,
      priority: 'medium',
    });
  }

  // Whole / IUL / VUL — only for high income with maxed-out tax-advantaged
  if (profile.annualIncome >= 250_000 && profile.marginalTaxBracket >= 0.32) {
    out.push({
      category: 'protect',
      product: 'Whole Life or Indexed Universal Life (estate liquidity)',
      status: 'consider',
      rationale: 'High-income/HNW client: permanent life can serve estate liquidity and tax-deferred cash value.',
      clientDataPointsUsed: dp,
      priority: 'medium',
    });
  } else {
    excluded.push({
      category: 'protect',
      product: 'Whole Life / IUL / VUL',
      status: 'not_applicable',
      rationale: 'Permanent life products are typically suitable only for high-income/HNW clients with maxed-out tax-advantaged accounts.',
      clientDataPointsUsed: dp,
      priority: 'low',
      excludedReason: 'Income/tax bracket below threshold for permanent life rationale.',
    });
  }

  // Disability — for working-age employed clients
  if (profile.age < 65 && profile.incomeSource !== IncomeSource.RetireeFixed && !profile.insurance.disability) {
    out.push({
      category: 'protect',
      product: 'Long-Term Disability Insurance',
      status: 'aligned',
      rationale: 'Working-age client without DI: most likely "income event" before retirement is disability, not death.',
      clientDataPointsUsed: dp,
      priority: 'high',
    });
  }

  // LTC — typically 50+
  if (profile.age >= 50 && profile.age <= 70 && !profile.insurance.longTermCare) {
    out.push({
      category: 'protect',
      product: 'Long-Term Care Insurance (or hybrid LTC/life)',
      status: 'consider',
      rationale: 'Best premiums at age 50-65; without LTC, retirement assets are exposed to extended care costs.',
      clientDataPointsUsed: dp,
      priority: 'medium',
    });
  }

  // Umbrella — high net worth or asset exposure
  if ((profile.assets - profile.liabilities) >= 500_000 && !profile.insurance.hasUmbrella) {
    out.push({
      category: 'protect',
      product: 'Umbrella Liability Insurance',
      status: 'aligned',
      rationale: 'Net worth ≥$500k exposed to liability claims beyond auto/home limits.',
      clientDataPointsUsed: [`netWorth=${profile.assets - profile.liabilities}`],
      priority: 'medium',
    });
  }

  // Key person — for business owners
  if (profile.incomeSource === IncomeSource.BusinessOwner) {
    out.push({
      category: 'protect',
      product: 'Key Person Insurance / Buy-Sell Funding',
      status: 'consider',
      rationale: 'Business owner: protects business continuity from death/disability of key personnel.',
      clientDataPointsUsed: dp,
      priority: 'medium',
    });
  }
}

function buildLegacyConsiderations(profile: ClientIntakeProfile, out: AlignedProduct[]) {
  const e = profile.estate;
  const dp = [`age=${profile.age}`, `dependents=${profile.dependents.count}`];

  if (!e.hasWill) {
    out.push({
      category: 'legacy',
      product: 'Last Will & Testament',
      status: 'aligned',
      rationale: 'No will = state intestacy laws govern asset distribution; potentially years in probate.',
      clientDataPointsUsed: dp,
      priority: 'high',
    });
  }

  if (!e.beneficiariesNamed) {
    out.push({
      category: 'legacy',
      product: 'Beneficiary Designations Review',
      status: 'aligned',
      rationale: 'Beneficiary designations supersede the will and bypass probate — must be current.',
      clientDataPointsUsed: dp,
      priority: 'high',
    });
  }

  if (!e.powerOfAttorney) {
    out.push({
      category: 'legacy',
      product: 'Durable Power of Attorney',
      status: 'aligned',
      rationale: 'Without POA, family must petition court for financial decisions if you become incapacitated.',
      clientDataPointsUsed: dp,
      priority: 'high',
    });
  }

  if (!e.healthcareDirective) {
    out.push({
      category: 'legacy',
      product: 'Healthcare Directive / Living Will',
      status: 'aligned',
      rationale: 'Documents your medical wishes if you cannot speak for yourself.',
      clientDataPointsUsed: dp,
      priority: 'high',
    });
  }

  // Trust — for higher net worth or specific situations
  const netWorth = profile.assets - profile.liabilities;
  if (!e.hasTrust && (netWorth >= 1_000_000 || profile.dependents.specialNeeds)) {
    out.push({
      category: 'legacy',
      product: profile.dependents.specialNeeds ? 'Special Needs Trust' : 'Revocable Living Trust',
      status: 'aligned',
      rationale: profile.dependents.specialNeeds
        ? 'Special-needs dependent: SNT preserves benefits while providing supplemental support.'
        : 'NW ≥$1M: trust avoids probate, provides privacy, and structures inheritance.',
      clientDataPointsUsed: [...dp, `netWorth=${netWorth}`],
      priority: profile.dependents.specialNeeds ? 'high' : 'medium',
    });
  }

  // Federal estate tax planning — 2026 exemption considerations
  if (netWorth >= 10_000_000) {
    out.push({
      category: 'legacy',
      product: 'Advanced Estate Tax Strategies (ILIT, GRAT, gifting)',
      status: 'consider',
      rationale: 'NW approaches/exceeds federal estate tax exemption — proactive transfer strategies are typically a topic for advisor discussion at this level.',
      clientDataPointsUsed: [`netWorth=${netWorth}`],
      priority: 'high',
    });
  }
}

function applyTaxFilters(
  profile: ClientIntakeProfile,
  recommended: AlignedProduct[],
  excluded: AlignedProduct[],
) {
  // Munis only make sense at 24%+ bracket
  if (profile.marginalTaxBracket < 0.24) {
    for (let i = recommended.length - 1; i >= 0; i--) {
      if (recommended[i].product.toLowerCase().includes('municipal')) {
        const moved = recommended.splice(i, 1)[0];
        moved.status = 'not_applicable';
        moved.excludedReason = `Marginal bracket ${(profile.marginalTaxBracket * 100).toFixed(0)}% below 24% threshold; taxable bonds offer better after-tax yield.`;
        excluded.push(moved);
      }
    }
  }

  // Munis NEVER in retirement accounts
  excluded.push({
    category: 'grow',
    product: 'Municipal bonds INSIDE retirement accounts',
    status: 'excluded',
    rationale: 'Municipal bond interest is already federally tax-exempt; placing inside a tax-deferred account wastes the exemption.',
    clientDataPointsUsed: ['series_65_rule'],
    priority: 'high',
    excludedReason: 'Series 65 explicit rule: munis are unsuitable for retirement plans.',
  });
}

function applyValuesFilters(
  profile: ClientIntakeProfile,
  recommended: AlignedProduct[],
  excluded: AlignedProduct[],
) {
  if (profile.esgImportance === 'high') {
    recommended.push({
      category: 'grow',
      product: 'ESG-screened mutual funds / ETFs',
      status: 'aligned',
      rationale: 'Client identified ESG as high-priority screen.',
      clientDataPointsUsed: ['esgImportance=high'],
      priority: 'medium',
    });
  }

  if (profile.religiousScreen && profile.religiousScreen !== 'none') {
    const fundMap: Record<string, string> = {
      christian_general: 'Faith-based equity fund (e.g., New Covenant, Timothy Plan)',
      catholic: 'Catholic-values fund (e.g., LKCM Aquinas, Ave Maria)',
      islamic_halal: 'Shariah-compliant fund (e.g., Amana family)',
      jewish: 'Jewish-values fund (e.g., Six Thirteen Core Equity)',
    };
    const product = fundMap[profile.religiousScreen] ?? 'Religiously-screened mutual funds';
    recommended.push({
      category: 'grow',
      product,
      status: 'consider',
      rationale: `Client religious screen: ${profile.religiousScreen}. May reduce opportunity set; document acknowledgment.`,
      clientDataPointsUsed: [`religiousScreen=${profile.religiousScreen}`],
      priority: 'medium',
    });
  }

  if (profile.sectorExclusions && profile.sectorExclusions.length > 0) {
    recommended.push({
      category: 'grow',
      product: 'Custom-screened separately managed account (SMA)',
      status: 'consider',
      rationale: `Client excludes sectors: ${profile.sectorExclusions.join(', ')}. SMA allows direct exclusion at the security level.`,
      clientDataPointsUsed: [`sectorExclusions=${profile.sectorExclusions.join('|')}`],
      priority: 'low',
    });
  }
}

/**
 * Step 6 — Per-goal allocations.
 * Each goal gets its own time-horizon-appropriate allocation, capped by client's overall ceiling.
 */
export function computePerGoalAllocations(
  profile: ClientIntakeProfile,
  ceiling: InvestmentObjective,
): GoalAllocation[] {
  const currentYear = new Date().getFullYear();
  const ceilingRank = OBJECTIVE_RANK[ceiling];

  return profile.goals.map((goal) => {
    const yearsToGoal = Math.max(0, goal.targetYear - currentYear);
    const bucket = HORIZON_BUCKETS.find((b) => yearsToGoal <= b.maxYears) ?? HORIZON_BUCKETS[HORIZON_BUCKETS.length - 1];

    // Cap horizon-based objective at the client's overall ceiling.
    const horizonObj = bucket.baseObjective;
    const finalGoalObj = OBJECTIVE_RANK[horizonObj] > ceilingRank ? ceiling : horizonObj;
    const alignedAllocation = JSON.parse(JSON.stringify(OBJECTIVE_ALLOCATION_BASELINE[finalGoalObj])) as AssetAllocation;

    // Funding status calculation
    const fundingStatus = projectFundingStatus(goal, yearsToGoal, alignedAllocation);

    return {
      goal,
      yearsToGoal,
      bucket: bucket.name,
      alignedAllocation,
      fundingStatus: fundingStatus.status,
      fundingGap: fundingStatus.gap,
      indicativeMonthlyContribution: fundingStatus.recommendedMonthly,
    };
  });
}

function projectFundingStatus(
  goal: Goal,
  yearsToGoal: number,
  allocation: AssetAllocation,
): { status: GoalAllocation['fundingStatus']; gap?: number; recommendedMonthly?: number } {
  if (!goal.currentSaved && !goal.monthlyContribution) {
    return { status: 'unknown' };
  }
  // Approximate expected return from allocation
  const expectedReturn = (allocation.equity * 0.07 + allocation.fixedIncome * 0.04 + allocation.cash * 0.02 + allocation.alternatives * 0.06) / 100;
  const monthlyRate = expectedReturn / 12;
  const months = yearsToGoal * 12;

  // FV of current + FV of monthly contributions
  const fvCurrent = (goal.currentSaved ?? 0) * Math.pow(1 + expectedReturn, yearsToGoal);
  const fvMonthly = goal.monthlyContribution
    ? goal.monthlyContribution * (Math.pow(1 + monthlyRate, months) - 1) / (monthlyRate || 1e-9)
    : 0;
  const projected = fvCurrent + fvMonthly;
  const gap = goal.targetAmount - projected;

  if (gap <= 0) return { status: 'overfunded' };
  if (gap / goal.targetAmount < 0.10) return { status: 'on_track', gap };

  // Compute monthly needed to close gap
  const recommendedMonthly = monthlyRate > 0
    ? gap / ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
    : gap / months;

  if (gap / goal.targetAmount < 0.30) return { status: 'behind', gap, recommendedMonthly };
  return { status: 'critical', gap, recommendedMonthly };
}

/**
 * Step 7 — Choose bond strategy.
 */
export function chooseBondStrategy(
  profile: ClientIntakeProfile,
  objective: InvestmentObjective,
  goalAllocations: GoalAllocation[],
): { strategy: BondStrategy; rationale: string } {
  // No bonds allocated → no strategy
  const baseAlloc = OBJECTIVE_ALLOCATION_BASELINE[objective];
  if (baseAlloc.fixedIncome < 10) {
    return { strategy: 'none', rationale: 'Bond allocation below 10% — single bond fund sufficient.' };
  }

  // Specific dated goal? → bullet to that date
  const datedGoal = profile.goals.find((g) =>
    [GoalType.CollegeFunding, GoalType.HomePurchase, GoalType.MajorPurchase].includes(g.type)
    && g.targetYear - new Date().getFullYear() <= 15
  );
  if (datedGoal) {
    return {
      strategy: 'bullet',
      rationale: `Specific dated goal (${datedGoal.type}, target ${datedGoal.targetYear}) — bullet structure ensures principal available at goal date.`,
    };
  }

  // Income-focused retiree → ladder for staggered cashflow
  if (
    [InvestmentObjective.SafetyOfPrincipal, InvestmentObjective.ModerateIncome, InvestmentObjective.TaxAdvantagedIncome].includes(objective)
    || profile.incomeSource === IncomeSource.RetireeFixed
  ) {
    return {
      strategy: 'ladder',
      rationale: 'Income objective + bond allocation — laddered maturities provide staggered cash flow and reinvestment opportunities.',
    };
  }

  // Active rate view + flexibility → barbell
  if (profile.investmentExperience === InvestmentExperience.Sophisticated) {
    return {
      strategy: 'barbell',
      rationale: 'Sophisticated investor — barbell offers liquidity (short end) plus yield (long end) without intermediate exposure.',
    };
  }

  return {
    strategy: 'ladder',
    rationale: 'Default for standard fixed-income allocations: ladder provides predictable maturities and rate-environment flexibility.',
  };
}

/**
 * Step 8 — Active vs passive recommendation.
 */
export function chooseManagementStyle(profile: ClientIntakeProfile): {
  style: 'active' | 'passive' | 'core_satellite';
  rationale: string;
} {
  if (profile.managementStylePreference === 'active') {
    return { style: 'active', rationale: 'Client preference: active management.' };
  }
  if (profile.managementStylePreference === 'passive') {
    return { style: 'passive', rationale: 'Client preference: passive management. Lower expense ratios; aligns with semi-strong EMH.' };
  }

  if (profile.costSensitivity === 'high' || profile.investmentExperience === InvestmentExperience.Limited) {
    return {
      style: 'passive',
      rationale: 'Default to passive: lower expenses (avg ~0.12% vs 0.60% active), and most active funds underperform benchmarks long-term.',
    };
  }

  return {
    style: 'core_satellite',
    rationale: 'Core-satellite: index funds form the core (low cost, broad diversification), with active satellite positions in sectors where security selection may add value.',
  };
}

/**
 * Step 9 — Tax recommendations (asset location, account types, etc.)
 */
export function generateTaxConsiderations(
  profile: ClientIntakeProfile,
  objective: InvestmentObjective,
): TaxConsideration[] {
  const recs: TaxConsideration[] = [];

  // Asset location
  recs.push({
    topic: 'asset_location',
    message: 'Place tax-inefficient holdings (REITs, HY bonds, actively managed funds) in tax-deferred accounts; keep tax-efficient holdings (broad index ETFs, munis, growth stocks) in taxable accounts.',
    rationale: 'Asset location optimization can add 0.10–0.75% annually to after-tax returns.',
  });

  // Roth conversion window
  if (profile.age >= 55 && profile.age <= 73 && profile.marginalTaxBracket <= 0.24) {
    recs.push({
      topic: 'roth_conversion',
      message: 'Consider Roth conversions during the "tax valley" (post-retirement, pre-RMDs) to lock in current bracket and reduce future RMDs.',
      rationale: `Client age ${profile.age}, current bracket ${(profile.marginalTaxBracket * 100).toFixed(0)}%. Conversions before RMDs at 73 reduce future taxable income.`,
    });
  }

  // Tax-loss harvesting
  if (profile.assets >= 200_000) {
    recs.push({
      topic: 'tax_loss_harvesting',
      message: 'Implement systematic tax-loss harvesting in taxable account.',
      rationale: 'Realized losses offset gains and up to $3,000 of ordinary income annually; carry forward indefinitely.',
    });
  }

  // Munis (already covered, but recap for tax doc)
  if (profile.marginalTaxBracket >= 0.32) {
    recs.push({
      topic: 'muni_consideration',
      message: 'Prioritize municipal bonds in taxable fixed-income sleeve, especially in-state issues for state tax exemption.',
      rationale: `Marginal bracket ${(profile.marginalTaxBracket * 100).toFixed(0)}% — taxable equivalent yield favors munis at this level.`,
    });
  }

  // Qualified dividends preference
  if (profile.marginalTaxBracket >= 0.24) {
    recs.push({
      topic: 'qualified_dividend',
      message: 'Favor qualified-dividend stocks over bond income in taxable accounts.',
      rationale: 'Qualified dividends taxed at LTCG rates (15-20%) vs ordinary rates on bond interest (up to 37%).',
    });
  }

  return recs;
}

/**
 * Step 10 — Detect risk flags (concentration, mismatches, sophistication, etc.)
 */
export function detectPlanningFlags(profile: ClientIntakeProfile, objective: InvestmentObjective): PlanningFlag[] {
  const flags: PlanningFlag[] = [];
  const totalHoldings = profile.currentHoldings.reduce((s, h) => s + h.value, 0);

  // Concentration: any single position >10%
  if (totalHoldings > 0) {
    for (const h of profile.currentHoldings) {
      const pct = h.value / totalHoldings;
      if (pct > 0.10) {
        flags.push({
          severity: pct > 0.25 ? 'critical' : 'high',
          category: 'concentration',
          message: `Single position "${h.description}" represents ${(pct * 100).toFixed(0)}% of investable assets.`,
          advisorDiscussionTopic: 'Reduce position over 12-24 months; harvest losses where available; reallocate to broader market exposure.',
        });
      }
    }

    // Employer stock concentration (Series 65 explicit warning)
    const employerStockTotal = profile.currentHoldings
      .filter((h) => h.isEmployerStock)
      .reduce((s, h) => s + h.value, 0);
    if (employerStockTotal / totalHoldings > 0.10) {
      flags.push({
        severity: 'high',
        category: 'concentration',
        message: `Employer stock = ${((employerStockTotal / totalHoldings) * 100).toFixed(0)}% of investable assets.`,
        advisorDiscussionTopic: 'Diversify employer stock — your job income is already correlated to this company. See Enron/SVB precedents.',
      });
    }
  }

  // Liquidity gap
  if (profile.emergencyFundMonths < 3) {
    flags.push({
      severity: profile.emergencyFundMonths < 1 ? 'critical' : 'high',
      category: 'liquidity',
      message: `Only ${profile.emergencyFundMonths.toFixed(1)} months of emergency reserves.`,
      advisorDiscussionTopic: 'Build 3-6 months of expenses in money market / high-yield savings before further investing.',
    });
  }

  // Risk mismatch (stated vs capacity)
  const stated = classifyStatedObjective(profile);
  const { ceiling } = computeRiskCapacityCeiling(profile);
  if (OBJECTIVE_RANK[stated] > OBJECTIVE_RANK[ceiling]) {
    flags.push({
      severity: 'medium',
      category: 'risk_mismatch',
      message: `Stated objective (${humanize(stated)}) exceeds risk capacity (${humanize(ceiling)}).`,
      advisorDiscussionTopic: 'Document conversation with client; recommend the lower-risk objective per Series 65 "err on caution" principle.',
    });
  }

  // Sophistication mismatch — sophisticated products requested by limited-experience client
  if (profile.investmentExperience === InvestmentExperience.Limited
    && (objective === InvestmentObjective.Speculation
        || profile.productExperience.some((p) => ['options', 'leveraged_etf', 'alternatives'].includes(p)))) {
    flags.push({
      severity: 'high',
      category: 'sophistication_mismatch',
      message: 'Client objective or product holdings exceed stated investment experience.',
      advisorDiscussionTopic: 'Educate client and document understanding before any complex-product recommendation.',
    });
  }

  // Insurance gaps
  if (profile.dependents.count > 0) {
    const totalLife = (profile.insurance.termLife ?? 0) + (profile.insurance.wholeLife ?? 0)
      + (profile.insurance.iul ?? 0) + (profile.insurance.vul ?? 0);
    if (totalLife < profile.annualIncome * 5) {
      flags.push({
        severity: 'high',
        category: 'insurance_gap',
        message: `Life insurance ${formatMoney(totalLife)} below 5× income with ${profile.dependents.count} dependent(s).`,
        advisorDiscussionTopic: `Recommend term life ~${formatMoney(profile.annualIncome * 10)} (10× guideline).`,
      });
    }
  }

  if (profile.age < 65 && profile.incomeSource !== IncomeSource.RetireeFixed && !profile.insurance.disability) {
    flags.push({
      severity: 'medium',
      category: 'insurance_gap',
      message: 'No long-term disability coverage during working years.',
      advisorDiscussionTopic: 'Long-term DI is statistically more important than life insurance for working-age clients.',
    });
  }

  // Estate gaps
  const e = profile.estate;
  if (!e.hasWill || !e.beneficiariesNamed || !e.powerOfAttorney || !e.healthcareDirective) {
    flags.push({
      severity: 'high',
      category: 'estate_gap',
      message: 'Foundational estate documents incomplete.',
      advisorDiscussionTopic: 'Complete will, beneficiary designations, POA, and healthcare directive — these are baseline requirements regardless of net worth.',
    });
  }

  // Goal funding gaps
  for (const goal of profile.goals) {
    if (goal.currentSaved !== undefined && goal.targetAmount > 0) {
      const yrsToGoal = Math.max(1, goal.targetYear - new Date().getFullYear());
      const projected = (goal.currentSaved ?? 0) * Math.pow(1.06, yrsToGoal)
        + (goal.monthlyContribution ?? 0) * 12 * yrsToGoal * 1.03; // rough
      if (projected < goal.targetAmount * 0.7) {
        flags.push({
          severity: 'medium',
          category: 'goal_funding_gap',
          message: `${humanize(goal.type)} (${goal.targetYear}): projected ${formatMoney(projected)} vs target ${formatMoney(goal.targetAmount)}.`,
          advisorDiscussionTopic: 'Increase monthly contribution or reset target.',
        });
      }
    }
  }

  return flags;
}

/**
 * Step 11 — Score sub-categories (0-100).
 */
export function computeSubScores(
  profile: ClientIntakeProfile,
  flags: PlanningFlag[],
): IntakeAnalysisOutput['subScores'] {
  // Penalty per flag by category
  const flagPenalty = (cat: PlanningFlag['category']) => {
    const sev = (s: PlanningFlag['severity']) => s === 'critical' ? 35 : s === 'high' ? 20 : s === 'medium' ? 10 : 5;
    return flags.filter((f) => f.category === cat).reduce((sum, f) => sum + sev(f.severity), 0);
  };

  const cashflow = clamp(100 - flagPenalty('liquidity') - (profile.emergencyFundMonths < 6 ? 10 : 0), 0, 100);

  // Retirement: % of income going into retirement
  const retirementContribRatio = profile.annualIncome > 0
    ? Math.min(1, (profile.goals.find((g) => g.type === GoalType.Retirement)?.monthlyContribution ?? 0) * 12 / profile.annualIncome)
    : 0;
  const retirement = clamp(Math.round(retirementContribRatio / 0.15 * 100), 0, 100);

  const insurance = clamp(100 - flagPenalty('insurance_gap'), 0, 100);
  const estate = clamp(100 - flagPenalty('estate_gap'), 0, 100);
  const tax = clamp(100 - flagPenalty('tax_inefficiency'), 0, 100);
  const investments = clamp(100 - flagPenalty('risk_mismatch') - flagPenalty('sophistication_mismatch'), 0, 100);
  const diversification = clamp(100 - flagPenalty('concentration'), 0, 100);

  return { cashflow, retirement, insurance, tax, estate, investments, diversification };
}

// ============================================================================
// SECTION 4 — MAIN ORCHESTRATOR
// ============================================================================

/**
 * Public entry point — runs the full pipeline and returns the intake analysis.
 *
 * IMPORTANT: This output is FRAMEWORK-ALIGNED ANALYSIS, not financial advice.
 * The licensed advisor receiving this output is solely responsible for
 * suitability, fiduciary obligations, and all client recommendations.
 * The output object includes disclaimer fields that MUST be displayed in
 * any UI surface that renders this data.
 */
export function analyzeIntake(profile: ClientIntakeProfile): IntakeAnalysisOutput {
  // Step 1-3: Objective classification
  const stated = classifyStatedObjective(profile);
  const { ceiling, factors: ceilingFactors } = computeRiskCapacityCeiling(profile);
  const { objective: primary, wasCapped } = deriveFinalObjective(stated, ceiling);

  const classificationRationale = wasCapped
    ? `Stated/inferred objective (${humanize(stated)}) exceeded the risk-capacity reference point (${humanize(ceiling)}) suggested by the client's circumstances. Per the Series 65 "err on the side of caution" principle, the framework objective is set to ${humanize(primary)} for educational analysis. Factors: ${ceilingFactors.join('; ')}.`
    : `Profile aligns with ${humanize(primary)} under the Series 65 framework. Capacity factors: ${ceilingFactors.join('; ') || 'no cap applied'}.`;

  // Step 4: Allocation
  const { allocation, ruleOf100, adjustments } = computeFrameworkAllocation(profile, primary);

  // Step 5: Products (framework-aligned, NOT recommendations)
  const { recommended: aligned, excluded } = buildAlignedProducts(profile, primary);

  // Step 6: Per-goal
  const perGoal = computePerGoalAllocations(profile, ceiling);

  // Step 7: Bond strategy
  const bond = chooseBondStrategy(profile, primary, perGoal);

  // Step 8: Management style
  const mgmt = chooseManagementStyle(profile);

  // Step 9: Tax
  const taxRecs = generateTaxConsiderations(profile, primary);

  // Step 10: Planning flags
  const flags = detectPlanningFlags(profile, primary);

  // Step 11: Sub-scores
  const subScores = computeSubScores(profile, flags);
  const overall = Math.round(
    (subScores.cashflow + subScores.retirement + subScores.insurance + subScores.tax
     + subScores.estate + subScores.investments + subScores.diversification) / 7
  );

  // Compliance trail
  const complianceNotes = [
    `Educational analysis based on the NASAA Series 65 suitability framework. Not financial advice.`,
    `Stated objective: ${humanize(stated)}. Risk-capacity reference: ${humanize(ceiling)}. Framework objective: ${humanize(primary)}${wasCapped ? ' (capped per "err on caution")' : ''}.`,
    `Rule of 100 reference: ${ruleOf100.equity}% equity / ${ruleOf100.fixedIncome}% fixed income.`,
    `Allocation framework adjustments: ${adjustments.join('; ') || 'none'}.`,
    `Sophistication gate active: ${profile.investmentExperience === InvestmentExperience.Sophisticated ? 'NO (sophisticated)' : 'YES — complex products excluded from aligned set'}.`,
    `${flags.length} planning flag(s) identified for advisor discussion.`,
    `Products named in this analysis represent framework alignment only; the licensed advisor reviewing this output is solely responsible for suitability determinations, fiduciary obligations, supervision, and client recommendations. WealthPlanrAI is not an investment adviser, broker-dealer, or insurance producer.`,
  ];

  return {
    // Disclaimer envelope
    disclaimerVersion: DISCLAIMER_VERSION,
    notFinancialAdvice: true,
    noAdvisorRelationship: true,
    educationalNotice:
      'This intake analysis is generated for educational and advisor-preparation purposes using standardized planning frameworks. It is not financial advice and does not create an advisor-client relationship.',
    productsAreFrameworkAligned: true,
    advisorResponsibleForRecommendations: true,

    // Classification
    frameworkObjective: primary,
    statedObjective: stated,
    riskCapacityCeiling: ceiling,
    classificationRationale,

    // Allocation
    frameworkAllocation: allocation,
    ruleOf100Reference: ruleOf100,
    allocationAdjustments: adjustments,

    // Products
    alignedProducts: aligned,
    consideredButExcludedProducts: excluded,

    // Per-goal
    perGoalAllocations: perGoal,

    // Strategies
    bondStrategy: bond.strategy,
    bondStrategyRationale: bond.rationale,
    managementStyle: mgmt.style,
    managementStyleRationale: mgmt.rationale,

    // Tax
    taxConsiderations: taxRecs,

    // Flags
    planningFlags: flags,

    // Scoring
    subScores,
    overallScore: overall,

    // Compliance trail + display disclaimers
    complianceNotes,
    advisorReportDisclaimer: ADVISOR_PDF_DISCLAIMER,
    clientReportDisclaimer: CLIENT_PDF_DISCLAIMER,
  };
}

/** @deprecated Use `analyzeIntake` — retained as alias for back-compat. */
export const analyzeClient = analyzeIntake;

// ============================================================================
// SECTION 5 — UTILITIES
// ============================================================================

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n.toFixed(0)}`;
}

function normalizeAllocation(a: AssetAllocation) {
  const total = a.equity + a.fixedIncome + a.cash + a.alternatives;
  if (Math.abs(total - 100) < 0.5) return;
  const factor = 100 / total;
  a.equity = Math.round(a.equity * factor);
  a.fixedIncome = Math.round(a.fixedIncome * factor);
  a.cash = Math.round(a.cash * factor);
  a.alternatives = 100 - a.equity - a.fixedIncome - a.cash;
}

// ============================================================================
// SECTION 6 — EXPORTED CONSTANTS (for UI / PDF rendering)
// ============================================================================

export const PRODUCT_CATALOGS = {
  insurance: INSURANCE_PRODUCTS,
  growth: GROWTH_VEHICLES,
  legacy: LEGACY_VEHICLES,
};

export const OBJECTIVE_DISPLAY_NAMES: Record<InvestmentObjective, string> = {
  [InvestmentObjective.PreservationOfCapital]: 'Preservation of Capital',
  [InvestmentObjective.SafetyOfPrincipal]: 'Safety of Principal',
  [InvestmentObjective.TaxAdvantagedIncome]: 'Tax-Advantaged Income',
  [InvestmentObjective.ModerateIncome]: 'Moderate Income',
  [InvestmentObjective.ModerateGrowth]: 'Moderate Growth',
  [InvestmentObjective.HighYieldIncome]: 'High-Yield Income',
  [InvestmentObjective.AggressiveGrowth]: 'Aggressive Growth',
  [InvestmentObjective.Speculation]: 'Speculation',
};
