'use client'

import { AuthGuard } from '../../../components/AuthGuard'
import { useAuth } from '../../../components/AuthProvider'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function NewTaskContent() {
  const { user, supabaseClient } = useAuth()
  const [taskText, setTaskText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!taskText.trim()) {
      setError('Please enter your task content')
      setLoading(false)
      return
    }

    if (!user) {
      setError('You must be logged in to create a task')
      setLoading(false)
      return
    }

    try {
      console.log('Creating task via API...')
      console.log('User ID:', user?.id)
      console.log('Task text length:', taskText.trim().length)

      // Use API route instead of direct Supabase client
      const response = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_text: taskText.trim(),
          user_id: user.id
        })
      })

      const result = await response.json()
      console.log('API result:', result)

      if (!response.ok || !result.success) {
        console.error('Task creation failed:', result)
        setError(`Failed to create task: ${result.error}`)
        setLoading(false)
        return
      }

      const data = result.task 
      
      if (data && data.id) {
        console.log('Task created successfully:', data)
        console.log('Redirecting to:', `/task/${data.id}/pay`)
        
        // Use window.location for a hard redirect as fallback
        try {
          router.push(`/task/${data.id}/pay`)
          // Fallback redirect after a short delay
          setTimeout(() => {
            if (window.location.pathname.includes('/task/new')) {
              window.location.href = `/task/${data.id}/pay`
            }
          }, 1000)
        } catch (routerError) {
          console.error('Router error:', routerError)
          window.location.href = `/task/${data.id}/pay`
        }
      } else {
        setError('Task was created but no ID was returned')
        setLoading(false)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setLoading(false)
    }
  }

  return (
    <div className="py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Task</h1>
        <p className="text-gray-600 mt-2">Paste your code or solution below for evaluation</p>
      </div>
      
      <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="taskText" className="block text-sm font-medium text-gray-700 mb-2">
              Task Content
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Paste your code, solution, or content that you want evaluated here.
            </p>
            <textarea
              id="taskText"
              rows={20}
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Paste your code or content here...

Example:
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Test the function
console.log(fibonacci(10));"
              required
            />
            <p className="text-sm text-gray-500 mt-2">
              {taskText.length} characters
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">What happens next?</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Your task will be saved with status &quot;created&quot;</li>
              <li>• You&apos;ll be redirected to the payment page</li>
              <li>• After payment, our AI will evaluate your submission</li>
              <li>• You&apos;ll receive detailed feedback and suggestions</li>
            </ul>
          </div>
          
          <div className="flex justify-end space-x-4">
            <Link
              href="/dashboard"
              className="border border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-2 rounded-lg font-medium"
            >
              Cancel
            </Link>
            <button 
              type="submit"
              disabled={loading || !taskText.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save & Proceed to Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NewTask() {
  return (
    <AuthGuard>
      <NewTaskContent />
    </AuthGuard>
  )
}