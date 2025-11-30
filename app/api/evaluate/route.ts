import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { evaluateTaskWithAI } from '@/lib/aiEvaluator'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  let taskId: string | undefined
  
  try {
    const body = await request.json()
    taskId = body.taskId

    console.log('🤖 Starting AI evaluation for task:', taskId)

    // Get task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      console.error('❌ Task not found:', taskError)
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Evaluate the task
    const evaluation = await evaluateTaskWithAI(task.task_text)

    // Insert evaluation result
    const { error: evaluationError } = await supabase
      .from('evaluations')
      .insert([
        {
          task_id: task.id,
          score: evaluation.score,
          strengths: evaluation.strengths.join(', '),
          improvements: evaluation.improvements.join(', '),
          full_report: {
            overallFeedback: evaluation.overallFeedback,
            strengths: evaluation.strengths,
            improvements: evaluation.improvements,
            score: evaluation.score
          }
        }
      ])

    if (evaluationError) {
      console.error('❌ Failed to save evaluation:', evaluationError)
      
      // Update task to evaluation_failed
      await supabase
        .from('tasks')
        .update({
          status: 'evaluation_failed'
        })
        .eq('id', task.id)

      return NextResponse.json(
        { error: 'Failed to save evaluation' },
        { status: 500 }
      )
    }

    // Update task to evaluated
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: 'evaluated'
      })
      .eq('id', task.id)

    if (updateError) {
      console.error('❌ Failed to update task status:', updateError)
    }

    console.log('✅ Evaluation completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Evaluation completed'
    })

  } catch (error) {
    console.error('❌ Error during evaluation:', error)
    
    // Update task status to evaluation_failed if we have taskId
    if (taskId) {
      await supabase
        .from('tasks')
        .update({ status: 'evaluation_failed' })
        .eq('id', taskId)
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
