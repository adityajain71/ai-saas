import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { evaluateTaskWithAI } from '@/lib/aiEvaluator'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!

// Create Supabase client with service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Verify Razorpay webhook signature
function verifySignature(body: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    )
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  console.log('🔔 Webhook received at:', new Date().toISOString())
  
  try {
    // Get raw body and signature
    const body = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    console.log('📝 Webhook signature present:', !!signature)
    console.log('📦 Webhook body length:', body.length)

    if (!signature) {
      console.log('❌ Missing x-razorpay-signature header')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    if (!verifySignature(body, signature, webhookSecret)) {
      console.log('❌ Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    console.log('✅ Signature verified')

    // Parse the webhook payload
    let webhookData
    try {
      webhookData = JSON.parse(body)
    } catch (parseError) {
      console.error('Failed to parse webhook body:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    console.log('📋 Webhook event type:', webhookData.event)

    // Handle payment captured or order paid events
    if (webhookData.event !== 'payment.captured' && webhookData.event !== 'order.paid') {
      console.log('ℹ️ Event type not handled:', webhookData.event)
      return NextResponse.json({ message: 'Event ignored' }, { status: 200 })
    }

    const paymentData = webhookData.payload.payment?.entity || webhookData.payload.order?.entity
    const orderId = paymentData.order_id
    const paymentId = paymentData.id

    console.log('🔍 Processing order:', orderId)
    console.log('🔍 Processing payment:', paymentId)

    console.log('💾 Processing database operations...')
    
    // Find the payment record using the order ID
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('razorpay_order_id', orderId)
      .single()

    if (paymentError || !payment) {
      console.error('❌ Payment not found:', paymentError)
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      )
    }

    // Update payment status to success
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        status: 'success',
        provider_payment_id: paymentId, // Store the actual payment ID
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id)

    if (updatePaymentError) {
      console.error('Failed to update payment:', updatePaymentError)
      return NextResponse.json(
        { error: 'Failed to update payment' },
        { status: 500 }
      )
    }

    // Find and update the related task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', payment.task_id)
      .single()

    if (taskError || !task) {
      console.error('Task not found:', taskError)
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Update task status to 'paid'
    const { error: updateTaskError } = await supabase
      .from('tasks')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', task.id)

    if (updateTaskError) {
      console.error('Failed to update task to paid:', updateTaskError)
      return NextResponse.json(
        { error: 'Failed to update task status' },
        { status: 500 }
      )
    }

    console.log('Starting AI evaluation for task:', task.id)

    try {
      // Evaluate the task using AI
      const evaluation = await evaluateTaskWithAI(task.task_text)

      // Insert evaluation result
      const { data: evaluationData, error: evaluationError } = await supabase
        .from('evaluations')
        .insert([
          {
            task_id: task.id,
            score: evaluation.score,
            strengths: evaluation.strengths.join(', '), // Join array into string
            improvements: evaluation.improvements.join(', '), // Join array into string
            full_report: {
              overallFeedback: evaluation.overallFeedback,
              strengths: evaluation.strengths,
              improvements: evaluation.improvements,
              score: evaluation.score
            }
          }
        ])
        .select()
        .single()

      if (evaluationError) {
        console.error('Failed to insert evaluation:', evaluationError)
        // Don't return error here, just log it and continue
      } else {
        console.log('Evaluation inserted:', evaluationData.id)
      }

      // Update task status to 'evaluated'
      const { error: finalUpdateError } = await supabase
        .from('tasks')
        .update({
          status: 'evaluated',
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id)

      if (finalUpdateError) {
        console.error('Failed to update task to evaluated:', finalUpdateError)
        // Don't return error here, the payment was successful
      }

      console.log('Task evaluation completed successfully:', task.id)

    } catch (aiError) {
      console.error('AI evaluation failed:', aiError)
      
      // Update task status to 'evaluation_failed' instead of leaving it as 'paid'
      await supabase
        .from('tasks')
        .update({
          status: 'evaluation_failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id)

      // Still return success since the payment was processed
      console.log('Payment successful, but AI evaluation failed for task:', task.id)
    }

    return NextResponse.json({
      message: 'Webhook processed successfully',
      orderId,
      paymentId,
      taskId: task.id
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
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

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}