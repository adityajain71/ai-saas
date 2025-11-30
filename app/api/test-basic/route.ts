import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    console.log('Testing basic fetch to Supabase...')
    
    // Test basic HTTP connection to Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`
      }
    })

    if (!response.ok) {
      return NextResponse.json({
        error: `HTTP ${response.status}: ${response.statusText}`,
        url: supabaseUrl
      })
    }

    return NextResponse.json({
      success: true,
      status: response.status,
      message: 'Basic HTTP connection to Supabase works!',
      url: supabaseUrl
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}