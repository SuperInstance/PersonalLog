/**
 * Example 2: Advanced Pattern Detection and ML
 *
 * This example demonstrates advanced features including pattern detection,
 * machine learning predictions, and accuracy tracking.
 */

import {
  PatternAnalyzer,
  NaiveBayesClassifier,
  KNearestNeighbors,
  PredictiveEngine,
  AccuracyTracker,
  ABTestFramework,
  RuleBasedModel
} from '@superinstance/private-ml-personalization'

// Example 1: Time Pattern Analysis
console.log('=== Example 1: Time Pattern Analysis ===')

const analyzer = new PatternAnalyzer()
const timeAnalyzer = analyzer.getTimeAnalyzer()

// Record user activity over time
const activities = [
  { hour: 9, day: 1, feature: 'search' },
  { hour: 10, day: 1, feature: 'search' },
  { hour: 14, day: 1, feature: 'edit' },
  { hour: 9, day: 2, feature: 'search' },
  { hour: 15, day: 2, feature: 'export' },
  { hour: 10, day: 3, feature: 'search' },
]

activities.forEach(({ hour, day, feature }) => {
  timeAnalyzer.recordActivity({
    type: 'feature-used',
    timestamp: new Date(2026, 0, day, hour).toISOString(),
    context: { feature }
  })
})

// Detect time patterns
const timePatterns = timeAnalyzer.detectPatterns()
console.log('Peak Hours by Day:', timePatterns.peakHoursByDay)
console.log('Most Active Days:', timePatterns.mostActiveDays)
console.log('Session Duration Patterns:', timePatterns.sessionDurationPattern)

// Example 2: Task Pattern Analysis
console.log('\n=== Example 2: Task Pattern Analysis ===')

const taskAnalyzer = analyzer.getTaskAnalyzer()

// Record task executions
taskAnalyzer.recordTask('code-generation', 'openai', ['prompt', 'settings'], true)
taskAnalyzer.recordTask('code-generation', 'openai', ['prompt', 'settings'], true)
taskAnalyzer.recordTask('code-generation', 'anthropic', ['prompt'], false)
taskAnalyzer.recordTask('data-analysis', 'openai', ['data', 'chart'], true)

// Detect task patterns
const taskPatterns = taskAnalyzer.detectPatterns()
console.log('Task Types:', taskPatterns.taskTypes)
console.log('Task Provider Mapping:', taskPatterns.taskProviderMapping)
console.log('Task Success Rates:', taskPatterns.taskSuccessRate)

// Predict best provider for task
const predictedProvider = taskAnalyzer.predictProvider('code-generation')
console.log('Predicted Provider for code-generation:', predictedProvider)

// Example 3: Workflow Analysis
console.log('\n=== Example 3: Workflow Analysis ===')

const workflowAnalyzer = analyzer.getWorkflowAnalyzer()

// Record workflows
workflowAnalyzer.startWorkflow()
workflowAnalyzer.recordAction('search')
workflowAnalyzer.recordAction('open-result')
workflowAnalyzer.recordAction('edit')
workflowAnalyzer.endWorkflow(true)

workflowAnalyzer.startWorkflow()
workflowAnalyzer.recordAction('search')
workflowAnalyzer.recordAction('open-result')
workflowAnalyzer.recordAction('edit')
workflowAnalyzer.endWorkflow(true)

workflowAnalyzer.startWorkflow()
workflowAnalyzer.recordAction('create')
workflowAnalyzer.recordAction('edit')
workflowAnalyzer.recordAction('share')
workflowAnalyzer.endWorkflow(true)

// Detect common workflows
const workflows = workflowAnalyzer.detectWorkflows(2)
console.log('Detected Workflows:')
workflows.forEach(wf => {
  console.log(`  - ${wf.name}: ${wf.frequency}x, ${wf.successRate.toFixed(0)}% success`)
})

// Predict next action
const nextAction = workflowAnalyzer.predictNextAction(['search', 'open-result'])
console.log('Predicted next action after [search, open-result]:', nextAction)

// Example 4: Machine Learning - Naive Bayes
console.log('\n=== Example 4: Naive Bayes Classification ===')

const nb = new NaiveBayesClassifier()

// Training data
const trainingData = [
  { features: { timeOfDay: 'morning', taskType: 'code' }, label: 'openai' },
  { features: { timeOfDay: 'morning', taskType: 'code' }, label: 'openai' },
  { features: { timeOfDay: 'evening', taskType: 'writing' }, label: 'anthropic' },
  { features: { timeOfDay: 'evening', taskType: 'writing' }, label: 'anthropic' },
  { features: { timeOfDay: 'afternoon', taskType: 'analysis' }, label: 'openai' },
]

trainingData.forEach(({ features, label }) => {
  nb.train(features, label)
})

// Make predictions
const prediction1 = nb.predict({ timeOfDay: 'morning', taskType: 'code' })
console.log('Prediction for morning code:', prediction1)

const prediction2 = nb.predict({ timeOfDay: 'evening', taskType: 'writing' })
console.log('Prediction for evening writing:', prediction2)

// Example 5: K-Nearest Neighbors
console.log('\n=== Example 5: K-Nearest Neighbors ===')

const knn = new KNearestNeighbors(3)

// Training data (feature vectors)
knn.train([1, 0, 1], 'type-a')
knn.train([1, 1, 0], 'type-b')
knn.train([0, 1, 1], 'type-a')
knn.train([1, 0, 0], 'type-c')
knn.train([0, 0, 1], 'type-a')

// Predict
const knnPrediction = knn.predict([1, 0, 1])
console.log('KNN Prediction:', knnPrediction)

// Example 6: Rule-Based Model
console.log('\n=== Example 6: Rule-Based Model ===')

const ruleModel = new RuleBasedModel()

// Add custom rule
ruleModel.addRule(
  'ui.density',
  (context) => context.dayOfWeek >= 5, // Weekend
  'spacious',
  0.6
)

// Predict using rules
const rulePrediction = ruleModel.predict('ui.density', {
  timeOfDay: 'morning',
  dayOfWeek: 6,
  recentActions: []
})

console.log('Rule-based prediction:', rulePrediction)

// Example 7: Accuracy Tracking
console.log('\n=== Example 7: Accuracy Tracking ===')

const tracker = new AccuracyTracker()

// Record predictions
const predIds = [
  tracker.recordPrediction('ui.theme', 'dark', 0.85, 'naive-bayes'),
  tracker.recordPrediction('ui.theme', 'light', 0.72, 'naive-bayes'),
  tracker.recordPrediction('ui.theme', 'dark', 0.91, 'knn'),
  tracker.recordPrediction('ui.theme', 'dark', 0.68, 'naive-bayes'),
  tracker.recordPrediction('ui.theme', 'light', 0.83, 'knn'),
]

// Record feedback
tracker.recordFeedback(predIds[0], 'dark') // Correct
tracker.recordFeedback(predIds[1], 'dark') // Incorrect
tracker.recordFeedback(predIds[2], 'dark') // Correct
tracker.recordFeedback(predIds[3], 'light') // Incorrect
tracker.recordFeedback(predIds[4], 'dark') // Incorrect

// Calculate metrics
const metrics = tracker.calculateMetrics()
console.log('Total Predictions:', metrics.totalPredictions)
console.log('Top-1 Accuracy:', (metrics.top1Accuracy * 100).toFixed(1) + '%')
console.log('Average Confidence:', (metrics.avgConfidence * 100).toFixed(1) + '%')
console.log('Calibration Score:', (metrics.calibrationScore * 100).toFixed(1) + '%')

// Accuracy trend
const trend = tracker.getAccuracyTrend(10)
console.log('Accuracy Trend:', trend)

// Example 8: A/B Testing
console.log('\n=== Example 8: A/B Testing ===')

const abTest = new ABTestFramework()

// Start test
abTest.startTest('prediction-model-comparison')

// Record control group (old model)
abTest.recordControl('prediction-model-comparison', true, 0.75)
abTest.recordControl('prediction-model-comparison', true, 0.82)
abTest.recordControl('prediction-model-comparison', false, 0.68)
abTest.recordControl('prediction-model-comparison', true, 0.79)

// Record treatment group (new model)
abTest.recordTreatment('prediction-model-comparison', true, 0.88)
abTest.recordTreatment('prediction-model-comparison', true, 0.91)
abTest.recordTreatment('prediction-model-comparison', true, 0.85)
abTest.recordTreatment('prediction-model-comparison', true, 0.87)

// Calculate results
const abResults = abTest.calculateResults('prediction-model-comparison')
console.log('A/B Test Results:')
console.log('  Control Accuracy:', (abResults!.controlAccuracy * 100).toFixed(1) + '%')
console.log('  Treatment Accuracy:', (abResults!.treatmentAccuracy * 100).toFixed(1) + '%')
console.log('  Lift:', abResults!.lift.toFixed(1) + '%')
console.log('  Significant:', abResults!.isSignificant)
console.log('  P-Value:', abResults!.pValue.toFixed(4))

// Example 9: Predictive Engine
console.log('\n=== Example 9: Predictive Engine ===')

const engine = new PredictiveEngine(analyzer)

// Get contextual recommendations
const context = {
  timeOfDay: 'morning' as const,
  dayOfWeek: 1,
  recentActions: [],
  sessionDuration: 300000
}

const recommendations = engine.getRecommendations(context)
console.log('Recommendations:')
recommendations.forEach(rec => {
  console.log(`  - ${rec.type}: ${rec.recommendation} (${(rec.confidence * 100).toFixed(0)}% confidence)`)
  console.log(`    ${rec.explanation}`)
})

console.log('\n=== Advanced Patterns Complete ===')
