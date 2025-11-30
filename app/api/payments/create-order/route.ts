import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Razorpay from 'razorpay'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const razorpayKeyId = process.env.RAZORPAY_KEY_ID!
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET!

// Create Supabase client with service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
})

const TASK_EVALUATION_AMOUNT = 19900 // ₹199 in paise

export async function POST(request: NextRequest) {
  try {
    console.log('💳 Create order API called')
    
    // Parse request body
    const body = await request.json()
    const { taskId } = body
    
    console.log('📦 Request data:', { taskId })

    if (!taskId) {
      console.log('❌ Task ID missing')
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    // Get the authorization header to extract the user's JWT token
    const authHeader = request.headers.get('authorization')
    console.log('🔑 Auth header present:', !!authHeader)
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('❌ Invalid auth header')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    console.log('🎫 Token extracted:', token.substring(0, 20) + '...')

    // Verify the JWT token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.log('❌ Auth error:', authError)
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }
    
    console.log('✅ User authenticated:', user.id)

    // Verify that the user owns the task
    console.log('🔍 Verifying task ownership...')
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, user_id, status')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single()

    if (taskError || !task) {
      console.log('❌ Task not found or access denied:', taskError)
      return NextResponse.json(
        { error: 'Task not found or access denied' },
        { status: 404 }
      )
    }
    
    console.log('✅ Task verified:', task.id)

    // Check if payment already exists for this task
    const { data: existingPayment, error: paymentCheckError } = await supabase
      .from('payments')
      .select('id, status')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .single()

    if (paymentCheckError && paymentCheckError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is expected if no payment exists
      return NextResponse.json(
        { error: 'Error checking payment status' },
        { status: 500 }
      )
    }

    if (existingPayment && existingPayment.status === 'completed') {
      return NextResponse.json(
        { error: 'Payment already completed for this task' },
        { status: 400 }
      )
    }

    // Create Razorpay order
    console.log('💰 Creating Razorpay order...')
    const orderOptions = {
      amount: TASK_EVALUATION_AMOUNT,
      currency: 'INR',
      receipt: `task_${Date.now().toString().slice(-8)}`, // Last 8 digits of timestamp
      notes: {
        task_id: taskId,
        user_id: user.id,
        service: 'task_evaluation'
      }
    }

    const razorpayOrder = await razorpay.orders.create(orderOptions)
    console.log('✅ Razorpay order created:', razorpayOrder.id)

    // Insert or update payment record in database
    const paymentData = {
      user_id: user.id,
      task_id: taskId,
      status: 'initiated',
      razorpay_order_id: razorpayOrder.id
    }

    let paymentResult
    if (existingPayment) {
      // Update existing payment
      const { data, error } = await supabase
        .from('payments')
        .update(paymentData)
        .eq('id', existingPayment.id)
        .select()
        .single()
      paymentResult = { data, error }
    } else {
      // Create new payment
      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single()
      paymentResult = { data, error }
    }

    if (paymentResult.error) {
      console.error('Payment record error:', paymentResult.error)
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      )
    }

    // Return order details to frontend
    return NextResponse.json({
      success: true,
      order: {
        id: razorpayOrder.id,
        amount: TASK_EVALUATION_AMOUNT,
        currency: 'INR',
        receipt: orderOptions.receipt
      },
      paymentId: paymentResult.data.id
    })

  } catch (error) {
    console.error('Payment creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}