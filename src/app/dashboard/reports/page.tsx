import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileDown } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, full_name, email, created_at, score, risk_profile, status, assigned_advisor_id, selected_advisor_id')
    .or(`selected_advisor_id.eq.${user.id},assigned_advisor_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const rows = assessments ?? []

  function scoreColor(score: number) {
    if (score >= 70) return 'text-green-600'
    if (score >= 50) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <div>
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 flex items-center gap-2">
        <a href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</a>
        <span>→</span>
        <span className="text-gray-900 font-medium">Reports</span>
      </div>

      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Sora,sans-serif' }}>
            Client Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Download PDF reports for each client assessment.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <FileDown className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-600">No reports yet</p>
              <p className="text-xs text-gray-400">Reports appear here once clients complete their assessment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Score</th>
                    <th className="px-4 py-3 text-left">Client PDF</th>
                    <th className="px-4 py-3 text-left">Advisor PDF</th>
                    <th className="px-4 py-3 text-left">Form Extract</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((a: any) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{a.full_name ?? 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{a.email ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${scoreColor(a.score ?? 0)}`}>
                          {a.score ?? 0}
                        </span>
                        <span className="text-gray-400 text-xs">/100</span>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`/api/assessment/download-pdf?id=${a.id}&type=client`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          Client
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`/api/assessment/download-pdf?id=${a.id}&type=advisor`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          Advisor
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`/api/assessment/download-pdf?id=${a.id}&type=extract`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          Extract
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
