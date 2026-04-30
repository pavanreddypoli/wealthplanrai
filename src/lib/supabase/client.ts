import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || supabaseUrl === 'undefined' || !supabaseUrl.includes('supabase.co')) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is missing or invalid:', supabaseUrl)
  }
  if (!supabaseKey || supabaseKey === 'undefined') {
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or invalid')
  }

  return createBrowserClient(supabaseUrl!, supabaseKey!)
}
