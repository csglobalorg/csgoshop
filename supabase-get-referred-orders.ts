import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the request body
    const { phone } = await req.json()

    if (!phone) {
      return new Response(JSON.stringify({ error: 'Phone number is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Fetch orders where referred_by matches the phone number
    const { data: ordersData, error: ordersError } = await supabaseClient
      .from('orders')
      .select('id, created_at, total_amount, status')
      .eq('referred_by', phone)
      .order('created_at', { ascending: false })

    if (ordersError) throw ordersError

    // Fetch payout requests to calculate total deducted amount
    const { data: payoutsData, error: payoutsError } = await supabaseClient
      .from('payout_requests')
      .select('amount')
      .eq('user_phone', phone)
      .in('status', ['pending', 'paid'])

    if (payoutsError) throw payoutsError

    const totalPayouts = payoutsData ? payoutsData.reduce((sum, p) => sum + Number(p.amount), 0) : 0

    // Fetch user commission rate
    const { data: userData } = await supabaseClient
      .from('users')
      .select('commission_rate')
      .eq('phone', phone)
      .limit(1)
      .single()

    const commissionRateStr = Deno.env.get('COMMISSION_RATE')
    const defaultRate = commissionRateStr ? parseFloat(commissionRateStr) : 0.10
    
    // Convert percentage from DB (e.g., 5.0) to decimal (0.05)
    const commissionRate = userData && userData.commission_rate !== null 
      ? parseFloat(userData.commission_rate) / 100 
      : defaultRate;

    return new Response(JSON.stringify({ 
      orders: ordersData, 
      commissionRate: commissionRate,
      totalPayouts: totalPayouts
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
