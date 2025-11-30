import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('Testing Supabase connection...')
    console.log('URL:', supabaseUrl)
    console.log('Service Key present:', !!supabaseServiceKey)

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Missing Supabase config',
        url: !!supabaseUrl,
        key: !!supabaseServiceKey
      })
    }

    // Test with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Try a simple query with a timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('count')
        .abortSignal(controller.signal)

      clearTimeout(timeoutId)

      if (error) {
        console.log('Query error:', error)
        return NextResponse.json({ 
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Database connection working!',
        timestamp: new Date().toISOString()
      })

    } catch (queryError) {
      clearTimeout(timeoutId)
      throw queryError
    }

  } catch (err) {
    console.log('Connection error:', err)
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Unknown error',
      name: err instanceof Error ? err.name : 'Unknown'
    })
  }
}