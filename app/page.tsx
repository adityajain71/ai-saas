export default function Home() {
  return (
    <div className="py-20">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Smart Task Evaluator
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Intelligent task evaluation and management platform to streamline your workflow and boost productivity.
        </p>
        <div className="flex justify-center space-x-4">
          <a
            href="/signup"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-lg"
          >
            Get Started
          </a>
          <a
            href="/login"
            className="border border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-3 rounded-lg font-medium text-lg"
          >
            Login
          </a>
        </div>
      </div>
    </div>
  )
}