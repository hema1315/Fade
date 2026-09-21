import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://aufsltycsuapdpzadctp.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZnNsdHljc3VhcGRwemFkY3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MTA1MDksImV4cCI6MjEwNTQ4NjUwOX0.DqXCTQ3vpNLbcUboPefDqBoijhDETi3LLGb3PB0PRm4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export function phoneToEmail(phone) {
  return `${phone.replace(/\D/g, '')}@barber.local`
}

