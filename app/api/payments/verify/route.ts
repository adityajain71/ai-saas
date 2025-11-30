import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Razorpay from 'razorpay'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, taskId } = body

    console.log('🔐 Verifying payment:', { razorpay_order_id, razorpay_payment_id })

    // Verify signature
    const text = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      console.error('❌ Invalid signature')
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      )
    }

    console.log('✅ Signature verified')

    // Update payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'success',
        provider_payment_id: razorpay_payment_id
      })
      .eq('razorpay_order_id', razorpay_order_id)
      .select()
      .single()

    if (paymentError) {
      console.error('❌ Failed to update payment:', paymentError)
      return NextResponse.json(
        { error: 'Failed to update payment' },
        { status: 500 }
      )
    }

    console.log('✅ Payment updated:', payment)

    // Update task status to paid
    const { data: updatedTask, error: taskError } = await supabase
      .from('tasks')
      .update({
        status: 'paid'
      })
      .eq('id', taskId)
      .select()
      .single()

    if (taskError) {
      console.error('❌ Failed to update task:', taskError)
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 }
      )
    }

    console.log('✅ Task updated to paid status:', updatedTask)

    // Trigger AI evaluation asynchronously
    // Always use localhost for internal server-to-server calls
    const baseUrl = 'http://localhost:3000'

    fetch(`${baseUrl}/api/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId })
    }).catch(err => console.error('Failed to trigger evaluation:', err))

    return NextResponse.json({
      success: true,
      message: 'Payment verified and task updated'
    })

  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
