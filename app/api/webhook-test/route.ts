import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  console.log('🔔 Test webhook received at:', new Date().toISOString())
  
  try {
    const body = await req.text()
    const signature = req.headers.get('x-razorpay-signature')
    
    console.log('📝 Body:', body)
    console.log('📝 Signature:', signature)

    // For testing, let's skip signature validation
    const event = JSON.parse(body)
    console.log('📋 Event:', event)

    return NextResponse.json({ 
      success: true,
      received_event: event.event,
      timestamp: new Date().toISOString(),
      message: 'Webhook test successful - no database operations performed'
    })

  } catch (error) {
    console.log('💥 Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}