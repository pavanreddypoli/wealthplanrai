/**
 * WealthPlanrAI — Questionnaire-to-Profile Adapter
 *
 * Converts the flat Record<string,unknown> produced by the assessment
 * questionnaire into the structured ClientIntakeProfile expected by the
 * Series 65 intake-analysis engine.
 *
 * The questionnaire (src/app/assessment/page.tsx FormData) stores all
 * answers as strings or string[]. This adapter normalizes, parses, and
 * maps them to the engine's typed input shape.
 */

import {
  ClientIntakeProfile,
  ClientType,
  IncomeSource,
  InvestmentExperience,
  RiskTolerance,
  GoalType,
} from './intake-analysis-engine'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(val: unknown, fallback = 0): number {
  const n = parseFloat((val as string) || '')
  return isNaN(n) ? fallback : n
}

function str(val: unknown): string {
  return (val as string) || ''
}

// ─── Main adapter ─────────────────────────────────────────────────────────────

export function flatAnswersToProfile(answers: Record<string, unknown>): ClientIntakeProfile {

  // ── Demographics ────────────────────────────────────────────────────────────
  const dobRaw  = str(answers.dob)
  const dobDate = dobRaw ? new Date(dobRaw) : null
  const dobYear = (dobDate && !isNaN(dobDate.getTime()))
    ? dobDate.getFullYear()
    : new Date().getFullYear() - 40
  const age = Math.max(18, new Date().getFullYear() - dobYear)

  const maritalRaw = str(answers.maritalStatus).toLowerCase()
  const maritalStatus = (['single', 'married', 'divorced', 'widowed'] as const)
    .includes(maritalRaw as 'single' | 'married' | 'divorced' | 'widowed')
    ? (maritalRaw as 'single' | 'married' | 'divorced' | 'widowed')
    : 'single'

  const dependents = { count: parseInt(str(answers.dependents)) || 0 }

  // ── Income & balance sheet ──────────────────────────────────────────────────
  const grossIncome  = parseNum(answers.grossIncome)
  const spouseIncome = parseNum(answers.spouseIncome)
  const otherIncome  = parseNum(answers.otherIncome)
  const annualIncome = grossIncome + spouseIncome + otherIncome

  const employmentStatus = str(answers.employmentStatus)
  const incomeSourceMap: Record<string, IncomeSource> = {
    employed:       IncomeSource.W2Employment,
    self_employed:  IncomeSource.SelfEmployed1099,
    business_owner: IncomeSource.BusinessOwner,
    retired:        IncomeSource.RetireeFixed,
    unemployed:     IncomeSource.Unemployed,
  }
  const incomeSource = incomeSourceMap[employmentStatus] ?? IncomeSource.Mixed

  const taxBracketNum = parseFloat(str(answers.taxBracket).replace('%', ''))
  const marginalTaxBracket = isNaN(taxBracketNum) ? 0.22 : taxBracketNum / 100

  const investableAssets = parseNum(answers.investableAssets)
  const retirementAssets = parseNum(answers.currentRetirementSavings)
  const homeValue        = parseNum(answers.homeValue)
  const assets           = investableAssets + retirementAssets + homeValue
  const liabilities      = parseNum(answers.mortgageBalance)
  const liquidAssets     = investableAssets

  // ── Cash flow ───────────────────────────────────────────────────────────────
  const monthlyExpenses = parseNum(answers.monthlyExpenses)

  const efMap: Record<string, number> = {
    '0': 0, 'none': 0, '1': 1, '2': 2, '3': 3, '4-6': 5, '6+': 7,
  }
  const emergencyFundMonths = efMap[str(answers.emergencyFundMonths)] ?? 0

  // ── Investment profile ──────────────────────────────────────────────────────
  const expRaw = str(answers.investmentExperience).toLowerCase()
  const investmentExperience =
    expRaw === 'professional' || expRaw === 'experienced'
      ? InvestmentExperience.Sophisticated
      : expRaw === 'intermediate'
        ? InvestmentExperience.Moderate
        : InvestmentExperience.Limited

  const retirementAccounts = (answers.retirementAccounts as string[] | undefined) ?? []
  const productExperience: string[] = []
  if (retirementAccounts.length > 0) {
    productExperience.push('mutual_funds', 'etfs')
  }
  if (answers.currentAllocation && answers.currentAllocation !== 'unsure') {
    productExperience.push('individual_stocks')
  }

  const riskMap: Record<string, RiskTolerance> = {
    conservative:         RiskTolerance.Conservative,
    moderate:             RiskTolerance.Moderate,
    moderately_aggressive: RiskTolerance.ModerateAggressive,
    aggressive:           RiskTolerance.Aggressive,
    very_aggressive:      RiskTolerance.Aggressive,
  }
  const riskTolerance = riskMap[str(answers.riskTolerance)] ?? RiskTolerance.Moderate

  // ── Goals ───────────────────────────────────────────────────────────────────
  const retirementAgeNum = parseInt(str(answers.retirementAge) || '65') || 65
  const currentAge       = new Date().getFullYear() - dobYear
  const goals = retirementAgeNum > currentAge
    ? [{
        type:                GoalType.Retirement,
        targetYear:          dobYear + retirementAgeNum,
        targetAmount:        parseNum(answers.retirementIncomeGoal) * 25,
        currentSaved:        parseNum(answers.currentRetirementSavings),
        monthlyContribution: parseNum(answers.monthlyRetirementContrib),
        priority:            'high' as const,
      }]
    : []

  // ── Insurance ───────────────────────────────────────────────────────────────
  const hasLife       = answers.hasLifeInsurance === 'yes'
  const hasDisability = answers.hasDisabilityInsurance === 'yes' || answers.hasDisabilityInsurance === 'employer'
  const insurance = {
    ...(hasLife ? { termLife: parseNum(answers.lifeCoverageAmount) } : {}),
    ...(hasDisability ? { disability: { monthlyBenefit: 0 } } : {}),
    longTermCare: answers.hasLongTermCare === 'yes',
    health:       !!answers.hasHealthInsurance && answers.hasHealthInsurance !== 'none',
    hasUmbrella:  answers.hasUmbrella === 'yes',
  }

  // ── Estate ──────────────────────────────────────────────────────────────────
  const estateValRaw = answers.estateValue
  const estate = {
    hasWill:              answers.hasWill === 'yes',
    hasTrust:             answers.hasTrust === 'yes',
    beneficiariesNamed:   answers.hasBeneficiaries === 'yes',
    powerOfAttorney:      answers.hasPOA === 'yes',
    healthcareDirective:  answers.hasHealthcareDirective === 'yes',
    ...(estateValRaw ? { estateValue: parseNum(estateValRaw) } : {}),
  }

  // ── Assemble profile ────────────────────────────────────────────────────────
  return {
    clientType: ClientType.IndividualRetail,
    age,
    maritalStatus,
    dependents,
    annualIncome,
    incomeSource,
    marginalTaxBracket,
    state: answers.state ? str(answers.state) : undefined,
    assets,
    liabilities,
    liquidAssets,
    retirementAssets,
    monthlyExpenses,
    emergencyFundMonths,
    investmentExperience,
    productExperience,
    riskTolerance,
    goals,
    currentHoldings: [],
    insurance,
    estate,
  }
}
