export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  console.log('Dashboard layout cookies:',
    (await cookies()).getAll().map(c => c.name))
  console.log('Dashboard layout user:', user?.id)
  console.log('Dashboard layout user error:', error?.message)

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, advisor_type, plan, email')
    .eq('id', user.id)
    .single()

  return (
    <DashboardShell
      userEmail={user.email}
      userName={profile?.full_name ?? null}
      advisorType={profile?.advisor_type ?? null}
    >
      {children}
    </DashboardShell>
  )
}
