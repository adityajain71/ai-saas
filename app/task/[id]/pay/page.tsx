'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { AuthGuard } from '../../../../components/AuthGuard'

declare global {
  interface Window {
    Razorpay: any;
  }
}

function TaskPaymentContent({ params }: { params: { id: string } }) {
  const { user, session, supabaseClient } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [task, setTask] = useState<any>(null)

  const taskId = params.id

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)

    // Fetch task details (can fetch without user authentication now)
    if (taskId) {
      fetchTask()
    }

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [taskId])

  const fetchTask = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { cache: 'no-store' })
      const result = await response.json()
      
      if (result.success) {
        // Validate user owns this task on frontend
        if (user && result.task.user_id !== user.id) {
          setError('Access denied')
          return
        }
        setTask(result.task)
      } else {
        setError(result.error || 'Failed to fetch task')
      }
    } catch (err) {
      console.error('Task fetch error:', err)
      setError('Failed to load task details')
    }
  }

  const handlePayment = async () => {
    console.log('🚀 Payment button clicked')
    console.log('User:', user)
    console.log('Task:', task)
    console.log('Session:', session)
    
    if (!user || !task) {
      console.log('❌ Missing user or task')
      setError('User or task not found')
      return
    }
    
    if (!session?.access_token) {
      console.log('❌ No access token')
      setError('Authentication required. Please log in again.')
      router.push('/login')
      return
    }
    
    setLoading(true)
    setError('')

    try {
      console.log('✅ Creating Razorpay order...')

      // Create Razorpay order
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          taskId: task.id
        })
      })

      const result = await response.json()
      console.log('Order creation result:', result)

      if (!response.ok || !result.success) {
        setError(result.error || 'Failed to create payment order')
        setLoading(false)
        return
      }

      // Check if Razorpay script is loaded
      if (typeof window.Razorpay === 'undefined') {
        setError('Payment system is loading. Please try again in a few seconds.')
        setLoading(false)
        return
      }

      // Initialize Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: result.order.amount,
        currency: result.order.currency,
        name: 'Smart Task Evaluator',
        description: `AI Evaluation for Task ${task.id.slice(0, 8)}`,
        order_id: result.order.id,
        handler: async function (response: any) {
          console.log('✅ Payment successful:', response)
          setLoading(true)
          setError('')
          
          try {
            // Verify payment on server and update task status
            console.log('🔐 Verifying payment...')
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                taskId: task.id
              })
            })

            const verifyResult = await verifyResponse.json()

            if (!verifyResponse.ok) {
              throw new Error(verifyResult.error || 'Payment verification failed')
            }

            console.log('✅ Payment verified, redirecting...')
            
            // Force a full page reload to ensure fresh data
            window.location.href = `/task/${task.id}`
          } catch (error) {
            console.error('Error verifying payment:', error)
            setError('Payment verification failed. Please contact support.')
            setLoading(false)
          }
        },
        prefill: {
          name: user.user_metadata?.full_name || user.email,
          email: user.email,
        },
        theme: {
          color: '#2563eb'
        },
        modal: {
          ondismiss: function() {
            setLoading(false)
            console.log('Payment cancelled')
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()

    } catch (err) {
      console.error('Payment error:', err)
      setError(err instanceof Error ? err.message : 'Payment failed')
      setLoading(false)
    }
  }

  if (!task && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-red-500 text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link 
            href={`/task/${task.id}`}
            className="text-gray-600 hover:text-gray-800 flex items-center text-sm font-medium mb-4"
          >
            ← Back to Task
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Complete Payment</h1>
          <p className="text-gray-600 mt-2">Secure payment for your task evaluation</p>
        </div>
        
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">AI Code Evaluation</span>
                <span className="font-medium">₹199.00</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Task ID: {task.id.slice(0, 8)}...</span>
                <span>Instant delivery</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-lg font-semibold text-gray-900">₹199.00</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 mb-2">What you'll get:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Comprehensive AI-powered code analysis</li>
                <li>• Detailed feedback and suggestions</li>
                <li>• Performance and quality score</li>
                <li>• Best practices recommendations</li>
                <li>• Instant results after payment</li>
              </ul>
            </div>
          </div>
          
          {/* Payment Section */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Method</h2>
            
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-6 bg-blue-600 rounded text-white text-xs font-bold flex items-center justify-center">
                  R
                </div>
                <span className="font-medium text-gray-900">Razorpay Secure Payment</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Pay securely with credit card, debit card, UPI, or net banking. 
                Your payment is protected by bank-level security.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <button 
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </span>
                ) : (
                  'Pay ₹199 - Start Evaluation'
                )}
              </button>
              
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  Secure payment powered by Razorpay
                </p>
              </div>
            </div>
          </div>

          {/* Code Preview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Your Code to be Evaluated</h3>
            </div>
            <div className="p-6">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{task.task_text}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TaskPayment({ params }: { params: { id: string } }) {
  return (
    <AuthGuard>
      <TaskPaymentContent params={params} />
    </AuthGuard>
  )
}