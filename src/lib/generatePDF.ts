import type { ScoreResults } from '@/lib/scoring'

// ── Types ──────────────────────────────────────────────────────────────────────

interface PillarData {
  name: string
  score: number
  status: string
  findings: string[]
}

interface ProductRec {
  title: string
  explanation: string
  priority: string
}

interface AssessmentForPDF {
  clientName: string
  clientEmail: string | null
  riskProfile: string
  overallScore: number
  scoreResults: ScoreResults | null
  answers: Record<string, unknown>
  createdAt: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function n(val: unknown): number {
  return parseFloat(String(val ?? '0')) || 0
}

function score2status(score: number, labels: [string, string, string]): string {
  if (score >= 80) return labels[0]
  if (score >= 50) return labels[1]
  return labels[2]
}

function scoreRGB(score: number): [number, number, number] {
  if (score >= 80) return [22, 163, 74]   // green
  if (score >= 50) return [245, 158, 11]  // amber
  return [239, 68, 68]                    // red
}

function getProtectFindings(a: Record<string, unknown>): string[] {
  const f: string[] = []
  if (a.hasLifeInsurance !== 'yes')                                              f.push('No life insurance detected')
  if (a.hasDisabilityInsurance !== 'yes' && a.hasDisabilityInsurance !== 'employer') f.push('No disability insurance')
  if (!a.hasHealthInsurance || a.hasHealthInsurance === 'none')                  f.push('No health insurance coverage')
  if (a.hasLongTermCare !== 'yes')                                               f.push('No long-term care insurance')
  if (a.hasWill !== 'yes')                                                       f.push('No will on file')
  if (a.hasPOA !== 'yes')                                                        f.push('No power of attorney')
  if (a.hasHealthcareDirective !== 'yes')                                        f.push('No healthcare directive')
  return f.length ? f.slice(0, 4) : ['Protection coverage adequate']
}

function getGrowFindings(a: Record<string, unknown>): string[] {
  const f: string[] = []
  if (a.maxing401k === 'no')                                                     f.push('Not maximizing 401(k)')
  const accounts = (a.retirementAccounts as string[]) ?? []
  if (!accounts.includes('roth_ira') && !accounts.includes('roth401k'))          f.push('No Roth account detected')
  if (n(a.currentRetirementSavings) === 0)                                       f.push('No retirement savings yet')
  if (a.hasbudget !== 'yes')                                                     f.push('No formal monthly budget')
  return f.length ? f.slice(0, 4) : ['Growth trajectory appears solid']
}

function getLegacyFindings(a: Record<string, unknown>): string[] {
  const f: string[] = []
  if (a.hasTrust !== 'yes')                                                      f.push('No living trust')
  if (a.hasBeneficiaries !== 'yes')                                              f.push('Beneficiary designations may be outdated')
  if (a.lastReviewedEstate === 'never' || a.lastReviewedEstate === '5yr+')       f.push('Estate plan not reviewed recently')
  return f.length ? f.slice(0, 3) : ['Core legacy documents present']
}

function getProductRecs(a: Record<string, unknown>): ProductRec[] {
  const recs: ProductRec[] = []
  if (a.hasLifeInsurance !== 'yes')
    recs.push({ title: 'Term Life Insurance or IUL', explanation: "Protect your family's financial future and replace lost income.", priority: 'High' })
  if (a.maxing401k === 'no')
    recs.push({ title: 'Maximize 401(k) Contributions', explanation: 'Reduce taxable income and accelerate tax-deferred growth.', priority: 'High' })
  const accounts = (a.retirementAccounts as string[]) ?? []
  if (!accounts.includes('roth_ira') && !accounts.includes('roth401k'))
    recs.push({ title: 'Open a Roth IRA', explanation: 'Build tax-free retirement income.', priority: 'High' })
  const risk    = a.riskTolerance as string
  const horizon = a.investmentHorizon as string
  if ((risk === 'conservative' || risk === 'moderate') && (horizon === '10-20' || horizon === '20+'))
    recs.push({ title: 'Fixed Indexed Annuity (FIA)', explanation: 'Principal protection with market-linked growth potential.', priority: 'Medium' })
  if (a.hasDisabilityInsurance !== 'yes' && a.hasDisabilityInsurance !== 'employer')
    recs.push({ title: 'Own-Occupation Disability Insurance', explanation: 'Replace 60–70% of income if unable to work.', priority: 'High' })
  if (a.hasTrust !== 'yes' && n(a.estateValue) > 500_000)
    recs.push({ title: 'Revocable Living Trust', explanation: 'Avoid probate — assets pass directly to beneficiaries.', priority: 'Medium' })
  return recs
}

// ── PDF Generator ─────────────────────────────────────────────────────────────

export async function generateAssessmentPDF(assessment: AssessmentForPDF): Promise<Buffer> {
  // Dynamic import to avoid SSR/client-side bundling issues
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W   = doc.internal.pageSize.getWidth()
  const H   = doc.internal.pageSize.getHeight()
  const BLUE: [number, number, number] = [37, 99, 235]
  const DARK: [number, number, number] = [17, 24, 39]
  const GRAY: [number, number, number] = [107, 114, 128]

  const date    = new Date(assessment.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const answers = assessment.answers
  const sr      = assessment.scoreResults

  function newPage() {
    doc.addPage()
    // Page footer
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text('RedCube Financial — Confidential Client Report', 14, H - 8)
    doc.text(`Page ${doc.getNumberOfPages()}`, W - 14, H - 8, { align: 'right' })
  }

  function sectionHeader(text: string, y: number): number {
    doc.setFillColor(...BLUE)
    doc.rect(14, y, W - 28, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text(text.toUpperCase(), 17, y + 5.5)
    return y + 13
  }

  // ── PAGE 1: Cover ─────────────────────────────────────────────────────────

  doc.setFillColor(...BLUE)
  doc.rect(0, 0, W, 80, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(191, 219, 254)
  doc.text('REDCUBE FINANCIAL', 14, 22)

  doc.setFontSize(26)
  doc.setTextColor(255, 255, 255)
  doc.text('Client Financial', 14, 40)
  doc.text('Assessment Report', 14, 52)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(191, 219, 254)
  doc.text('CONFIDENTIAL — FOR ADVISOR USE ONLY', 14, 68)

  // Client info block
  doc.setFillColor(249, 250, 251)
  doc.roundedRect(14, 90, W - 28, 55, 4, 4, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...DARK)
  doc.text(assessment.clientName, 22, 106)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...GRAY)
  doc.text(`Email: ${assessment.clientEmail ?? 'Not provided'}`, 22, 117)
  doc.text(`Date: ${date}`, 22, 126)
  doc.text(`Risk Profile: ${assessment.riskProfile.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`, 22, 135)

  // Overall score circle
  doc.setFillColor(...BLUE)
  doc.circle(W - 35, 117, 20, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.text(String(assessment.overallScore), W - 35, 121, { align: 'center' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('/ 100', W - 35, 128, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text('Prepared by RedCube Financial', 14, H - 20)
  doc.text('This report is confidential and intended for the named advisor only.', 14, H - 14)

  // ── PAGE 2: Client Profile ────────────────────────────────────────────────

  newPage()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...DARK)
  doc.text('Client Profile', 14, 24)

  let y = 34
  y = sectionHeader('Personal Information', y)

  const personalRows: [string, string][] = [
    ['Full Name',         assessment.clientName],
    ['Email',             assessment.clientEmail ?? '—'],
    ['Date of Birth',     String(answers.dob ?? '—')],
    ['Marital Status',    String(answers.maritalStatus ?? '—')],
    ['Employment Status', String(answers.employmentStatus ?? '—')],
    ['Occupation',        String(answers.occupation ?? '—')],
    ['State',             String(answers.state ?? '—')],
    ['Dependents',        String(answers.dependents ?? '—')],
  ]

  autoTable(doc, {
    startY: y,
    body: personalRows,
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, textColor: GRAY }, 1: { textColor: DARK } },
    margin: { left: 14, right: 14 },
  })

  y = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 60
  y += 8

  y = sectionHeader('Financial Snapshot', y)

  const financialRows: [string, string][] = [
    ['Annual Gross Income',         answers.grossIncome   ? `$${Number(answers.grossIncome).toLocaleString()}`   : '—'],
    ['Monthly Expenses',            answers.monthlyExpenses ? `$${Number(answers.monthlyExpenses).toLocaleString()}` : '—'],
    ['Monthly Savings',             answers.monthlySavings ? `$${Number(answers.monthlySavings).toLocaleString()}` : '—'],
    ['Total Investable Assets',     answers.investableAssets ? `$${Number(answers.investableAssets).toLocaleString()}` : '—'],
    ['Current Retirement Savings',  answers.currentRetirementSavings ? `$${Number(answers.currentRetirementSavings).toLocaleString()}` : '—'],
    ['Emergency Fund Coverage',     String(answers.emergencyFundMonths ?? '—') + ' months'],
    ['Tax Bracket',                 answers.taxBracket ? `${answers.taxBracket}%` : '—'],
  ]

  autoTable(doc, {
    startY: y,
    body: financialRows,
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 75, textColor: GRAY }, 1: { textColor: DARK } },
    margin: { left: 14, right: 14 },
  })

  // ── PAGE 3: Three Pillars Scorecard ──────────────────────────────────────

  newPage()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...DARK)
  doc.text('Three Pillars Scorecard', 14, 24)

  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))
  const protect = sr ? clamp((sr.sub_scores.insurance + sr.sub_scores.estate) / 2) : 0
  const grow    = sr ? clamp((sr.sub_scores.investments + sr.sub_scores.retirement + sr.sub_scores.cashflow + sr.sub_scores.tax) / 4) : 0
  const legacy  = sr ? clamp(sr.sub_scores.estate) : 0

  const pillars: PillarData[] = [
    { name: 'PROTECT',        score: protect, status: score2status(protect, ['Fully Protected', 'Partially Protected', 'Needs Protection']), findings: getProtectFindings(answers) },
    { name: 'GROW',           score: grow,    status: score2status(grow,    ['Strong Growth',   'Moderate Growth',     'Growth Gap']),        findings: getGrowFindings(answers) },
    { name: 'LEAVE A LEGACY', score: legacy,  status: score2status(legacy,  ['Legacy Ready',    'Partial Legacy Plan', 'Legacy Gap']),         findings: getLegacyFindings(answers) },
  ]

  y = 34
  for (const pillar of pillars) {
    const rgb = scoreRGB(pillar.score)
    y = sectionHeader(pillar.name, y)

    // Score row
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(28)
    doc.setTextColor(...rgb)
    doc.text(`${pillar.score}`, 14, y + 8)

    doc.setFontSize(11)
    doc.setTextColor(...GRAY)
    doc.text('/ 100', 30, y + 8)

    doc.setFontSize(10)
    doc.setTextColor(...DARK)
    doc.text(`Status: ${pillar.status}`, 60, y + 8)

    y += 16

    // Findings
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    for (const finding of pillar.findings) {
      doc.text(`• ${finding}`, 18, y)
      y += 6
    }
    y += 8
  }

  // Sub-score table
  if (sr) {
    y = sectionHeader('Sub-Score Breakdown', y)
    const subRows = Object.entries(sr.sub_scores).map(([k, v]) => [k.charAt(0).toUpperCase() + k.slice(1), `${v}/100`])
    autoTable(doc, {
      startY: y,
      head: [['Category', 'Score']],
      body: subRows,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: 'bold' },
      margin: { left: 14, right: 14 },
    })
  }

  // ── PAGE 4: Detailed Findings ─────────────────────────────────────────────

  newPage()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...DARK)
  doc.text('Detailed Findings', 14, 24)

  y = 34
  const sections = [
    { name: 'Protection & Insurance', findings: getProtectFindings(answers) },
    { name: 'Growth & Retirement',    findings: getGrowFindings(answers) },
    { name: 'Legacy Planning',         findings: getLegacyFindings(answers) },
  ]

  for (const sec of sections) {
    y = sectionHeader(sec.name, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...DARK)
    for (const finding of sec.findings) {
      doc.text(`• ${finding}`, 18, y)
      y += 7
    }
    y += 6
    if (y > H - 40) { newPage(); y = 20 }
  }

  // ── PAGE 5: Recommendations ──────────────────────────────────────────────

  newPage()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...DARK)
  doc.text('Recommendations', 14, 24)

  const recs = getProductRecs(answers)
  const recRows = recs.map((r, i) => [`${i + 1}. ${r.title}`, r.explanation, r.priority])

  autoTable(doc, {
    startY: 34,
    head: [['Strategy / Product', 'Rationale', 'Priority']],
    body: recRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 5, lineColor: [229, 231, 235], lineWidth: 0.3 },
    headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70, textColor: DARK },
      1: { cellWidth: 90, textColor: GRAY },
      2: { cellWidth: 22, halign: 'center', textColor: DARK },
    },
    margin: { left: 14, right: 14 },
  })

  // Priority recommendations from scoring engine
  if (sr?.recommendations.length) {
    y = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100
    y += 10
    y = sectionHeader('Scoring Engine Recommendations', y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    const sorted = [...sr.recommendations].sort((a, b) => {
      const ord: Record<string, number> = { high: 0, medium: 1, low: 2 }
      return (ord[a.priority] ?? 2) - (ord[b.priority] ?? 2)
    }).slice(0, 6)
    for (const rec of sorted) {
      if (y > H - 30) { newPage(); y = 20 }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...DARK)
      doc.text(`[${rec.priority.toUpperCase()}] ${rec.category}`, 18, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...GRAY)
      const lines = doc.splitTextToSize(rec.message, W - 40) as string[]
      doc.text(lines, 18, y)
      y += lines.length * 5 + 5
    }
  }

  // ── PAGE 6: Disclaimer ────────────────────────────────────────────────────

  newPage()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...DARK)
  doc.text('Regulatory Disclaimer', 14, 24)

  const disclaimerText = 'This financial assessment report is prepared by RedCube Financial and is for informational and educational purposes only. It does not constitute investment advice, insurance advice, legal advice, or tax advice. The information provided is based solely on self-reported data and has not been independently verified. Past performance is not indicative of future results. All investment strategies involve risk, including possible loss of principal. Insurance products and annuities involve risks and limitations — please read all product materials carefully before purchasing. Fixed Indexed Annuities (FIAs) and Indexed Universal Life (IUL) policies are insurance products, not securities, and are not FDIC insured. Securities, when applicable, are offered through registered broker-dealers and are subject to FINRA and SEC regulations. RedCube Financial advisors may be licensed insurance agents and/or registered investment advisors. This report does not establish an advisor-client relationship. Please consult with a licensed financial advisor, attorney, and tax professional before making any financial decisions. RedCube Financial is not responsible for actions taken based on this report without professional consultation.'

  const dlines = doc.splitTextToSize(disclaimerText, W - 28) as string[]
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text(dlines, 14, 38)

  y = 38 + dlines.length * 4.5 + 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...DARK)
  doc.text('RedCube Financial', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text('contact@redcubefinancial.com', 14, y + 7)
  doc.text('www.redcubefinancial.com', 14, y + 13)

  // ── Return as Buffer ──────────────────────────────────────────────────────

  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}
