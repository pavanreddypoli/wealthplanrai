import Link from 'next/link'
import { KeyRound, Bell, Trash2, ChevronRight } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div>
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 flex items-center gap-2">
        <a href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</a>
        <span>→</span>
        <span className="text-gray-900 font-medium">Settings</span>
      </div>

      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Sora,sans-serif' }}>
            Account Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your account preferences and security.
          </p>
        </div>

        <div className="space-y-4">

          {/* Change Password */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Security</h2>
            </div>
            <div className="divide-y divide-gray-100">
              <Link
                href="/auth/reset-password"
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Change Password</p>
                    <p className="text-xs text-gray-500 mt-0.5">Update your account password</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </Link>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
            </div>
            <div className="px-5 py-4 space-y-4">
              {[
                { label: 'New client assessment submitted',  desc: 'Get notified when a client completes their assessment', checked: true },
                { label: 'Client selects you as advisor',    desc: 'Get notified when a client chooses you', checked: true },
                { label: 'Weekly summary report',           desc: 'Weekly digest of your client activity', checked: false },
                { label: 'Commission payment received',     desc: 'Get notified when a referral commission is paid', checked: true },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bell className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-xs text-gray-400 italic">Coming soon</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-red-100">
              <h2 className="text-sm font-semibold text-red-700">Danger Zone</h2>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Delete Account</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    To delete your account, please contact{' '}
                    <a href="mailto:support@wealthplanrai.com" className="text-brand-600 hover:underline">
                      support@wealthplanrai.com
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
