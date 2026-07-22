import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server misconfiguration')
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

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
    if (!role || !role.includes('admin')) {
      throw new Error('Forbidden: only admins can create users this way')
    }

    // 1. We now extract firstName and lastName from your frontend payload
    const { email, password, firstName, lastName } = await req.json()
    if (!email) throw new Error('email is required')
    if (!password) throw new Error('password is required')

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError) throw authError

    const generatedUserId = authData.user.id

    // 2. We pass the names into the database insert method
    // Note: Make sure 'first_name' and 'last_name' match your exact column names in Supabase
    const { error: dbError } = await adminClient
      .from('users')
      .insert({
        uid: generatedUserId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (dbError) throw dbError

    return new Response(
      JSON.stringify({ success: true, userId: generatedUserId }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (err) {
    console.error('Edge function error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})