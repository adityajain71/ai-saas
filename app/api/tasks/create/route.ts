import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  console.log('🔔 Task creation API called')
  
  try {
    const { task_text, user_id } = await req.json()
    
    console.log('📝 Creating task:', { task_text: task_text?.length, user_id })

    if (!task_text || !user_id) {
      return NextResponse.json(
        { error: 'Missing task_text or user_id' },
        { status: 400 }
      )
    }

    // Insert task using service role (bypasses RLS)
    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        task_text: task_text.trim(),
        status: 'created',
        user_id: user_id
      }])
      .select()
      .single()

    if (error) {
      console.log('❌ Task creation failed:', error)
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      )
    }

    console.log('✅ Task created successfully:', data.id)
    
    return NextResponse.json({
      success: true,
      task: data
    })

  } catch (error) {
    console.log('💥 API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}