import type { ScoreResults } from '@/lib/scoring'

interface PillarScores {
  protect: number
  grow: number
  legacy: number
}

interface EmailParams {
  assessmentId: string
  clientName: string
  clientEmail: string | null
  overallScore: number
  riskProfile: string
  pillarScores: PillarScores
  topRecommendations: string[]
  scoreResults: ScoreResults | null
}

function getSgMail() {
  const key = process.env.SENDGRID_API_KEY
  if (!key || key === 'placeholder') throw new Error('SENDGRID_API_KEY not configured')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sgMail = require('@sendgrid/mail')
  sgMail.setApiKey(key)
  return sgMail
}

function buildEmailHtml(p: EmailParams): string {
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const date      = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const riskLabel = p.riskProfile.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())

  const pillarRows = [
    { name: 'PROTECT', score: p.pillarScores.protect },
    { name: 'GROW',    score: p.pillarScores.grow    },
    { name: 'LEGACY',  score: p.pillarScores.legacy  },
  ].map(r => `<tr><td style="padding:8px 16px;font-size:14px;color:#374151;">${r.name}</td><td style="padding:8px 16px;font-size:14px;font-weight:700;color:#1e40af;">${r.score}/100</td></tr>`).join('')

  const recItems = p.topRecommendations.map((r, i) =>
    `<li style="padding:6px 0;font-size:14px;color:#374151;">${i + 1}. ${r}</li>`,
  ).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">

    <!-- Header -->
    <div style="background:#2563eb;padding:32px 40px;">
      <p style="margin:0;color:#bfdbfe;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">RedCube Financial</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;">New Client Assessment Report</h1>
    </div>

    <!-- Body -->
    <div style="padding:32px 40px;">
      <p style="color:#6b7280;font-size:15px;line-height:1.6;">
        A new client has completed their financial assessment. Please review and follow up within 1 business day.
      </p>

      <!-- Client Summary -->
      <h2 style="font-size:13px;font-weight:700;color:#6b7280;letter-spacing:2px;text-transform:uppercase;margin:24px 0 12px;">Client Summary</h2>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <tr style="background:#f9fafb;"><td style="padding:10px 16px;font-size:13px;color:#6b7280;width:40%;">Name</td><td style="padding:10px 16px;font-size:14px;font-weight:600;color:#111827;">${p.clientName}</td></tr>
        <tr><td style="padding:10px 16px;font-size:13px;color:#6b7280;">Email</td><td style="padding:10px 16px;font-size:14px;color:#374151;">${p.clientEmail ?? '—'}</td></tr>
        <tr style="background:#f9fafb;"><td style="padding:10px 16px;font-size:13px;color:#6b7280;">Overall Score</td><td style="padding:10px 16px;font-size:14px;font-weight:700;color:#2563eb;">${p.overallScore}/100</td></tr>
        <tr><td style="padding:10px 16px;font-size:13px;color:#6b7280;">Risk Profile</td><td style="padding:10px 16px;font-size:14px;color:#374151;">${riskLabel}</td></tr>
        <tr style="background:#f9fafb;"><td style="padding:10px 16px;font-size:13px;color:#6b7280;">Date</td><td style="padding:10px 16px;font-size:14px;color:#374151;">${date}</td></tr>
      </table>

      <!-- Three Pillars -->
      <h2 style="font-size:13px;font-weight:700;color:#6b7280;letter-spacing:2px;text-transform:uppercase;margin:24px 0 12px;">Three Pillars Scorecard</h2>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <tr style="background:#f9fafb;">
          <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;">Pillar</th>
          <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;">Score</th>
        </tr>
        ${pillarRows}
      </table>

      <!-- Top Recommendations -->
      ${p.topRecommendations.length > 0 ? `
      <h2 style="font-size:13px;font-weight:700;color:#6b7280;letter-spacing:2px;text-transform:uppercase;margin:24px 0 12px;">Top Recommendations</h2>
      <ul style="margin:0;padding:0;list-style:none;">
        ${recItems}
      </ul>` : ''}

      <!-- CTA -->
      <div style="margin:32px 0;text-align:center;">
        <p style="color:#6b7280;font-size:14px;margin-bottom:16px;">Full detailed report attached as PDF</p>
        <a href="${appUrl}/results?id=${p.assessmentId}"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px;">
          View Full Report in Dashboard →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
        This email is intended for licensed financial advisors only. The information contained in this report is based on self-reported client data and does not constitute investment advice. RedCube Financial is not responsible for actions taken based on this report without professional consultation.
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function sendAdvisorReport(params: EmailParams, pdfBuffer: Buffer): Promise<void> {
  const sgMail  = getSgMail()
  const from    = process.env.SENDGRID_FROM_EMAIL ?? 'reports@redcubefinancial.com'
  const to      = process.env.ADVISOR_EMAIL       ?? 'advisor@redcubefinancial.com'
  const date    = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const safeName = (params.clientName ?? 'Client').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')

  await sgMail.send({
    from,
    to,
    subject: `New Client Assessment — ${params.clientName} — ${date}`,
    html: buildEmailHtml(params),
    attachments: [
      {
        content:     pdfBuffer.toString('base64'),
        filename:    `${safeName}_Assessment_${date.replace(/, /g, '_').replace(/ /g, '_')}.pdf`,
        type:        'application/pdf',
        disposition: 'attachment',
      },
    ],
  })
}
