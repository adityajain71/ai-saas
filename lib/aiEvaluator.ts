// Mock AI Task Evaluator (for testing without API keys)
// Replace this with real AI integration when you have API credits

export interface EvaluationResult {
  score: number // 0-100
  strengths: string[]
  improvements: string[]
  overallFeedback: string
}

export async function evaluateTaskWithAI(taskText: string): Promise<EvaluationResult> {
  if (!taskText || taskText.trim().length === 0) {
    throw new Error('Task text cannot be empty')
  }

  console.log('Evaluating task with Mock AI:', taskText.substring(0, 100) + '...')

  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Generate a semi-realistic evaluation based on code length and structure
  const codeLength = taskText.length
  const hasComments = taskText.includes('//') || taskText.includes('/*')
  const hasErrorHandling = taskText.includes('try') || taskText.includes('catch') || taskText.includes('if')
  const hasFunctions = taskText.includes('function') || taskText.includes('=>')
  
  let score = 60 // Base score
  if (hasComments) score += 10
  if (hasErrorHandling) score += 10
  if (hasFunctions) score += 10
  if (codeLength > 200) score += 10
  
  score = Math.min(score, 95) // Cap at 95

  const evaluation: EvaluationResult = {
    score,
    strengths: [
      'Code demonstrates understanding of basic programming concepts',
      'Implementation follows a logical structure',
      hasComments ? 'Includes helpful comments for code documentation' : 'Clean and concise code style',
      hasFunctions ? 'Proper use of functions for code organization' : 'Direct and straightforward approach'
    ],
    improvements: [
      'Consider adding more comprehensive error handling',
      'Could benefit from additional input validation',
      'Edge cases should be explicitly tested',
      !hasComments ? 'Adding comments would improve code maintainability' : 'Variable naming could be more descriptive'
    ],
    overallFeedback: `This solution demonstrates a solid understanding of the problem requirements. The code is ${codeLength > 200 ? 'well-structured and detailed' : 'concise and direct'}, showing good programming fundamentals. ${hasErrorHandling ? 'The inclusion of conditional logic shows attention to different scenarios.' : 'Adding more error handling would make this code more robust.'} Overall, this is a competent implementation that could be enhanced with additional edge case handling and more comprehensive testing. The approach taken is practical and shows promise for further development.`
  }

  console.log('Mock AI evaluation completed with score:', evaluation.score)
  return evaluation
}