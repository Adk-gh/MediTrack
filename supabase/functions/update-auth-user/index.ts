import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: jwtError } = await adminClient.auth.getUser(token)
    if (jwtError || !caller) throw new Error('Unauthorized')

    const { data: callerProfile, error: profileError } = await adminClient
      .from('users')
      .select('role')
      .eq('uid', caller.id)
      .single()

    if (profileError || !callerProfile) throw new Error('Could not fetch caller profile')

    const role = callerProfile.role?.toLowerCase()
    if (!role || !role.includes('admin')) throw new Error('Forbidden: only admins can update auth users')

    const { userId, email } = await req.json()
    if (!userId) throw new Error('userId is required')
    if (!email) throw new Error('email is required')

    // 1. Update Supabase Auth email
    const { error: authError } = await adminClient.auth.admin.updateUserById(
      userId,
      { email }
    )
    if (authError) throw authError

    // 2. Also update the users table email to keep them in sync
    const { error: dbError } = await adminClient
      .from('users')
      .update({ email, updated_at: new Date().toISOString() })
      .eq('uid', userId)
    if (dbError) throw dbError

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Edge function error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})