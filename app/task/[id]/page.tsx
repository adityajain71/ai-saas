'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { AuthGuard } from '../../../components/AuthGuard'

interface Task {
  id: string
  task_text: string
  status: 'created' | 'paid' | 'evaluated' | 'evaluation_failed'
  created_at: string
  updated_at: string
  user_id: string
}

interface Evaluation {
  id: string
  score: number
  strengths: string
  improvements: string
  full_report: {
    overallFeedback?: string
    strengths?: string[]
    improvements?: string[]
    score?: number
  } | null
  feedback?: string
  suggestions?: string[]
  created_at: string
}

function TaskDetailContent({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const [task, setTask] = useState<Task | null>(null)
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const taskId = params.id

  useEffect(() => {
    if (!user || !taskId) return

    const fetchTaskAndEvaluation = async () => {
      try {
        setLoading(true)
        
        // Fetch task details
        const taskResponse = await fetch(`/api/tasks/${taskId}`, { cache: 'no-store' })
        const taskResult = await taskResponse.json()

        if (!taskResponse.ok) {
          if (taskResponse.status === 404) {
            setError('Task not found')
          } else {
            setError(taskResult.error || 'Failed to fetch task')
          }
          setLoading(false)
          return
        }

        if (taskResult.task.user_id !== user.id) {
          setError('Access denied')
          setLoading(false)
          return
        }

        setTask(taskResult.task)

        // If task is evaluated, fetch evaluation
        if (taskResult.task.status === 'evaluated') {
          const evalResponse = await fetch(`/api/evaluations/${taskId}`, { cache: 'no-store' })
          if (evalResponse.ok) {
            const evalResult = await evalResponse.json()
            setEvaluation(evalResult.evaluation)
          }
        }

      } catch (err) {
        console.error('Error fetching task:', err)
        setError('Failed to load task details')
      } finally {
        setLoading(false)
      }
    }

    if (user && taskId) {
      fetchTaskAndEvaluation()
    }
  }, [user?.id, taskId])

  // Auto-refresh when evaluation is in progress
  useEffect(() => {
    if (task?.status === 'paid') {
      const interval = setInterval(() => {
        fetch(`/api/tasks/${taskId}`, { cache: 'no-store' })
          .then(res => res.json())
          .then(data => {
            if (data.success && data.task.status !== 'paid') {
              window.location.reload()
            }
          })
          .catch(err => console.error('Error polling task:', err))
      }, 5000) // Check every 5 seconds

      return () => clearInterval(interval)
    }
  }, [task?.status, taskId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading task details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {error === 'Task not found' ? 'Task Not Found' : 'Access Denied'}
            </h1>
            <p className="text-gray-600 mb-6">
              {error === 'Task not found' 
                ? 'The task you\'re looking for doesn\'t exist or has been removed.'
                : error
              }
            </p>
            <Link 
              href="/dashboard"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!task) return null

  const renderTaskStatus = () => {
    switch (task.status) {
      case 'created':
        return (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
            <div className="text-orange-500 text-4xl mb-4">💳</div>
            <h2 className="text-xl font-semibold text-orange-900 mb-3">
              Payment Required
            </h2>
            <p className="text-orange-700 mb-6">
              You have not paid for evaluation yet. Complete your payment to get AI-powered feedback on your code.
            </p>
            <Link
              href={`/task/${task.id}/pay`}
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-lg font-medium inline-flex items-center"
            >
              Complete Payment →
            </Link>
          </div>
        )

      case 'paid':
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div className="text-blue-500 text-4xl mb-4">⏳</div>
            <h2 className="text-xl font-semibold text-blue-900 mb-3">
              Evaluation in Progress
            </h2>
            <p className="text-blue-700 mb-4">
              Payment confirmed! Your AI evaluation is being processed.
            </p>
            <p className="text-sm text-blue-600">
              Check back in a minute. This page will update automatically.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Refresh Page
            </button>
          </div>
        )

      case 'evaluation_failed':
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-900 mb-3">
              Evaluation Failed
            </h2>
            <p className="text-red-700 mb-4">
              Unfortunately, the AI evaluation could not be completed. This might be due to API credits or service availability.
            </p>
            <p className="text-sm text-red-600 mb-4">
              Your payment was successful. Please contact support for assistance.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Try Again
            </button>
          </div>
        )

      case 'evaluated':
        if (!evaluation) {
          return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="text-red-500 text-4xl mb-4">❌</div>
              <h2 className="text-xl font-semibold text-red-900 mb-3">
                Evaluation Data Missing
              </h2>
              <p className="text-red-700">
                Task is marked as evaluated but evaluation data is not available.
              </p>
            </div>
          )
        }

        return (
          <div className="space-y-6">
            {/* Score Section */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Evaluation Complete
              </h2>
              <div className="text-5xl font-bold text-green-600 mb-2">
                {evaluation.score}/100
              </div>
              <p className="text-gray-600">Your Code Quality Score</p>
            </div>

            {/* Strengths Section */}
            {(evaluation.strengths || evaluation.full_report?.strengths) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Strengths
                </h3>
                {evaluation.full_report?.strengths ? (
                  <ul className="space-y-2">
                    {evaluation.full_report.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-500 mr-2 mt-1">•</span>
                        <span className="text-gray-700">{strength}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-700">{evaluation.strengths}</p>
                )}
              </div>
            )}

            {/* Improvements Section */}
            {(evaluation.improvements || evaluation.full_report?.improvements) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-orange-700 mb-4 flex items-center">
                  <span className="text-orange-500 mr-2">🔧</span>
                  Areas for Improvement
                </h3>
                {evaluation.full_report?.improvements ? (
                  <ul className="space-y-2">
                    {evaluation.full_report.improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-orange-500 mr-2 mt-1">•</span>
                        <span className="text-gray-700">{improvement}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-700">{evaluation.improvements}</p>
                )}
              </div>
            )}

            {/* Overall Feedback */}
            {(evaluation.feedback || evaluation.full_report?.overallFeedback) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-blue-700 mb-4 flex items-center">
                  <span className="text-blue-500 mr-2">💭</span>
                  Overall Feedback
                </h3>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed">
                    {evaluation.feedback || evaluation.full_report?.overallFeedback}
                  </p>
                </div>
              </div>
            )}

            {/* Suggestions */}
            {evaluation.suggestions && evaluation.suggestions.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-purple-700 mb-4 flex items-center">
                  <span className="text-purple-500 mr-2">💡</span>
                  Suggestions
                </h3>
                <ul className="space-y-2">
                  {evaluation.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-purple-500 mr-2 mt-1">•</span>
                      <span className="text-gray-700">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )

      case 'evaluation_failed':
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-900 mb-3">
              Evaluation Failed
            </h2>
            <p className="text-red-700 mb-4">
              There was an issue processing your evaluation. Please contact support.
            </p>
            <Link
              href="/contact"
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center"
            >
              Contact Support
            </Link>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link 
              href="/dashboard"
              className="text-gray-600 hover:text-gray-800 flex items-center text-sm font-medium"
            >
              ← Back to Dashboard
            </Link>
            <div className="text-sm text-gray-500">
              Created {new Date(task.created_at).toLocaleDateString()}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Task Evaluation</h1>
          <p className="text-gray-600">Track your code evaluation progress and results</p>
        </div>

        {/* Task Code Preview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Your Code</h3>
          </div>
          <div className="p-6">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{task.task_text}</code>
            </pre>
          </div>
        </div>

        {/* Status-based Content */}
        {renderTaskStatus()}

        {/* Footer Actions */}
        <div className="mt-8 text-center">
          <Link
            href="/task/new"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Submit Another Task →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function TaskDetail({ params }: { params: { id: string } }) {
  return (
    <AuthGuard>
      <TaskDetailContent params={params} />
    </AuthGuard>
  )
}