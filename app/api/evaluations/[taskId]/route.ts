import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const taskId = params.taskId

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Fetching evaluation for task:', taskId)

    const { data: evaluation, error } = await supabase
      .from('evaluations')
      .select('*')
      .eq('task_id', taskId)
      .single()

    if (error) {
      console.log('❌ Evaluation fetch error:', error)
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Evaluation not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!evaluation) {
      return NextResponse.json(
        { error: 'Evaluation not found' },
        { status: 404 }
      )
    }

    console.log('✅ Evaluation found:', evaluation.id)

    return NextResponse.json({
      success: true,
      evaluation
    })

  } catch (error) {
    console.log('💥 API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}