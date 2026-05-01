import { Users } from 'lucide-react'

export default function ClientsPage() {
  return (
    <div className="p-6">
      <header className="bg-white border-b border-gray-200 px-6 h-14 flex items-center -mx-6 -mt-6 mb-6">
        <h1 className="font-heading text-base font-semibold text-gray-900">Clients</h1>
      </header>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
          <Users className="w-7 h-7 text-slate-300" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-gray-700">Client management coming soon</p>
          <p className="text-sm text-gray-400 mt-1">View and manage all your clients in one place.</p>
        </div>
      </div>
    </div>
  )
}
