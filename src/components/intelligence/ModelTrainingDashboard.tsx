'use client';

/**
 * Model Training Dashboard Component
 *
 * Visualizes ML training pipeline for world model:
 * - Training progress and metrics
 * - Model version history
 * - Cross-validation results
 * - Hyperparameter tuning
 * - Prediction accuracy tracking
 * - Model comparison
 *
 * Part of Neural MPC Phase 2: Model Training Dashboard
 */

import { useState, useEffect } from 'react';
import {
  Brain,
  TrendingUp,
  Target,
  Zap,
  GitBranch,
  BarChart3,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Calendar,
  Clock,
  Award,
  Layers,
  Activity,
  Sliders,
} from 'lucide-react';

// Mock imports (would be real in production)
// import { trainModel, crossValidate, tuneHyperparameters, compareModels } from '@/lib/intelligence/model-training';
// import { getPredictorMetrics, getBestPredictor } from '@/lib/intelligence/advanced-prediction';

// ============================================================================
// TYPES
// ============================================================================

interface TrainingMetrics {
  accuracy: number;
  validationAccuracy: number;
  mse: number;
  mae: number;
  trainingTime: number;
  sampleCount: number;
  epochs: number;
}

interface ModelVersion {
  id: string;
  version: number;
  created: number;
  metrics: TrainingMetrics;
  active: boolean;
}

interface PredictorMetrics {
  method: string;
  accuracy: number;
  mse: number;
  avgConfidence: number;
  predictionCount: number;
}

interface CrossValidationResult {
  folds: TrainingMetrics[];
  averageMetrics: TrainingMetrics;
  stdDev: {
    accuracy: number;
    mse: number;
    mae: number;
  };
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export function ModelTrainingDashboard() {
  // State
  const [isTraining, setIsTraining] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'versions' | 'validation' | 'tuning'>('overview');
  const [models, setModels] = useState<ModelVersion[]>([
    {
      id: 'model-1',
      version: 1,
      created: Date.now() - 86400000,
      metrics: {
        accuracy: 0.82,
        validationAccuracy: 0.79,
        mse: 0.18,
        mae: 0.12,
        trainingTime: 5200,
        sampleCount: 450,
        epochs: 10,
      },
      active: true,
    },
    {
      id: 'model-2',
      version: 2,
      created: Date.now() - 43200000,
      metrics: {
        accuracy: 0.85,
        validationAccuracy: 0.83,
        mse: 0.15,
        mae: 0.10,
        trainingTime: 6100,
        sampleCount: 520,
        epochs: 12,
      },
      active: false,
    },
    {
      id: 'model-3',
      version: 3,
      created: Date.now() - 3600000,
      metrics: {
        accuracy: 0.88,
        validationAccuracy: 0.86,
        mse: 0.12,
        mae: 0.08,
        trainingTime: 5800,
        sampleCount: 480,
        epochs: 11,
      },
      active: false,
    },
  ]);

  const [predictorMetrics, setPredictorMetrics] = useState<PredictorMetrics[]>([
    { method: 'Transition', accuracy: 0.78, mse: 0.22, avgConfidence: 0.72, predictionCount: 1240 },
    { method: 'Similarity', accuracy: 0.82, mse: 0.18, avgConfidence: 0.68, predictionCount: 1150 },
    { method: 'Pattern', accuracy: 0.75, mse: 0.25, avgConfidence: 0.65, predictionCount: 980 },
    { method: 'Trend', accuracy: 0.71, mse: 0.29, avgConfidence: 0.62, predictionCount: 890 },
  ]);

  const [cvResult, setCvResult] = useState<CrossValidationResult | null>({
    folds: [
      { accuracy: 0.81, validationAccuracy: 0.79, mse: 0.19, mae: 0.13, trainingTime: 1200, sampleCount: 90, epochs: 1 },
      { accuracy: 0.83, validationAccuracy: 0.81, mse: 0.17, mae: 0.11, trainingTime: 1150, sampleCount: 92, epochs: 1 },
      { accuracy: 0.80, validationAccuracy: 0.78, mse: 0.20, mae: 0.14, trainingTime: 1300, sampleCount: 88, epochs: 1 },
      { accuracy: 0.84, validationAccuracy: 0.82, mse: 0.16, mae: 0.10, trainingTime: 1180, sampleCount: 91, epochs: 1 },
      { accuracy: 0.82, validationAccuracy: 0.80, mse: 0.18, mae: 0.12, trainingTime: 1250, sampleCount: 89, epochs: 1 },
    ],
    averageMetrics: {
      accuracy: 0.82,
      validationAccuracy: 0.80,
      mse: 0.18,
      mae: 0.12,
      trainingTime: 1216,
      sampleCount: 90,
      epochs: 1,
    },
    stdDev: {
      accuracy: 0.015,
      mse: 0.016,
      mae: 0.015,
    },
  });

  // Handlers
  const handleTrainModel = async () => {
    setIsTraining(true);
    // Simulate training
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setIsTraining(false);
  };

  const handleActivateModel = (modelId: string) => {
    setModels(models.map((m) => ({ ...m, active: m.id === modelId })));
  };

  const handleDeleteModel = (modelId: string) => {
    setModels(models.filter((m) => m.id !== modelId));
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Model Training
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Train and evaluate world model prediction accuracy
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTrainModel}
            disabled={isTraining}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            {isTraining ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Training...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Train Model
              </>
            )}
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Target className="w-5 h-5 text-green-600 dark:text-green-400" />}
          label="Best Accuracy"
          value={`${(Math.max(...models.map((m) => m.metrics.accuracy)) * 100).toFixed(1)}%`}
          change="+2.3%"
          positive
        />
        <MetricCard
          icon={<Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          label="Validation Score"
          value={`${(Math.max(...models.map((m) => m.metrics.validationAccuracy)) * 100).toFixed(1)}%`}
          change="+1.8%"
          positive
        />
        <MetricCard
          icon={<Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
          label="Total Samples"
          value={models.reduce((sum, m) => sum + m.metrics.sampleCount, 0).toString()}
          change="+120"
          positive
        />
        <MetricCard
          icon={<GitBranch className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
          label="Model Versions"
          value={models.length.toString()}
          change="Latest"
          neutral
        />
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="border-b-2 border-slate-200 dark:border-slate-800">
          <nav className="flex">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'versions', label: 'Model Versions', icon: GitBranch },
              { key: 'validation', label: 'Cross-Validation', icon: Activity },
              { key: 'tuning', label: 'Hyperparameters', icon: Sliders },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key as any)}
                className={`px-4 py-3 flex items-center gap-2 text-sm font-medium transition-colors ${
                  selectedTab === tab.key
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {selectedTab === 'overview' && <OverviewTab models={models} predictorMetrics={predictorMetrics} />}
          {selectedTab === 'versions' && (
            <VersionsTab models={models} onActivate={handleActivateModel} onDelete={handleDeleteModel} />
          )}
          {selectedTab === 'validation' && <ValidationTab cvResult={cvResult} />}
          {selectedTab === 'tuning' && <TuningTab />}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function MetricCard({
  icon,
  label,
  value,
  change,
  positive,
  neutral,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
  positive?: boolean;
  neutral?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-slate-600 dark:text-slate-400 text-sm font-medium">{label}</div>
        {icon}
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
      <div
        className={`text-xs mt-1 ${
          positive ? 'text-green-600 dark:text-green-400' : neutral ? 'text-slate-500' : 'text-red-600 dark:text-red-400'
        }`}
      >
        {change}
      </div>
    </div>
  );
}

function OverviewTab({ models, predictorMetrics }: { models: ModelVersion[]; predictorMetrics: PredictorMetrics[] }) {
  const bestModel = models.reduce((best, current) => (current.metrics.accuracy > best.metrics.accuracy ? current : best));

  return (
    <div className="space-y-6">
      {/* Best Model Highlight */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5" />
              <h3 className="font-semibold">Best Performing Model</h3>
            </div>
            <p className="text-sm opacity-90">Version {bestModel.version} - {new Date(bestModel.created).toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{(bestModel.metrics.accuracy * 100).toFixed(1)}%</div>
            <div className="text-sm opacity-90">Accuracy</div>
          </div>
        </div>
      </div>

      {/* Predictor Performance */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Predictor Performance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {predictorMetrics.map((predictor) => (
            <div
              key={predictor.method}
              className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border-2 border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-slate-900 dark:text-slate-100">{predictor.method}</h4>
                <span
                  className={`text-xs font-semibold ${
                    predictor.accuracy >= 0.8
                      ? 'text-green-600 dark:text-green-400'
                      : predictor.accuracy >= 0.7
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {(predictor.accuracy * 100).toFixed(1)}%
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Predictions</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{predictor.predictionCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">MSE</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{predictor.mse.toFixed(3)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Confidence</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {(predictor.avgConfidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      predictor.accuracy >= 0.8 ? 'bg-green-500' : predictor.accuracy >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${predictor.accuracy * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VersionsTab({
  models,
  onActivate,
  onDelete,
}: {
  models: ModelVersion[];
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {models.map((model) => (
        <div
          key={model.id}
          className={`bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border-2 ${
            model.active ? 'border-blue-500' : 'border-slate-200 dark:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Version {model.version}</h4>
                {model.active && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-slate-600 dark:text-slate-400 text-xs">Accuracy</div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {(model.metrics.accuracy * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-600 dark:text-slate-400 text-xs">Validation</div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {(model.metrics.validationAccuracy * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-600 dark:text-slate-400 text-xs">Training Time</div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {(model.metrics.trainingTime / 1000).toFixed(1)}s
                  </div>
                </div>
                <div>
                  <div className="text-slate-600 dark:text-slate-400 text-xs">Samples</div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{model.metrics.sampleCount}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(model.created).toLocaleString()}
              </div>
            </div>
            <div className="flex gap-2">
              {!model.active && (
                <button
                  onClick={() => onActivate(model.id)}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Activate
                </button>
              )}
              <button
                onClick={() => onDelete(model.id)}
                className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ValidationTab({ cvResult }: { cvResult: CrossValidationResult | null }) {
  if (!cvResult) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        <AlertCircle className="w-12 h-12 mx-auto mb-2" />
        No cross-validation results available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Average Metrics */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Average Metrics Across Folds</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Accuracy</div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {(cvResult.averageMetrics.accuracy * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500">±{(cvResult.stdDev.accuracy * 100).toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">MSE</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {cvResult.averageMetrics.mse.toFixed(3)}
            </div>
            <div className="text-xs text-slate-500">±{cvResult.stdDev.mse.toFixed(3)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">MAE</div>
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {cvResult.averageMetrics.mae.toFixed(3)}
            </div>
            <div className="text-xs text-slate-500">±{cvResult.stdDev.mae.toFixed(3)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Avg Time</div>
            <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {(cvResult.averageMetrics.trainingTime / 1000).toFixed(1)}s
            </div>
          </div>
        </div>
      </div>

      {/* Fold Results */}
      <div>
        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Individual Fold Results</h4>
        <div className="space-y-2">
          {cvResult.folds.map((fold, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 rounded-lg p-3 border-2 border-slate-200 dark:border-slate-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{idx + 1}</span>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Fold {idx + 1}</div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-slate-900 dark:text-slate-100">
                  <span className="text-slate-500">Acc:</span> {(fold.accuracy * 100).toFixed(1)}%
                </div>
                <div className="text-slate-900 dark:text-slate-100">
                  <span className="text-slate-500">MSE:</span> {fold.mse.toFixed(3)}
                </div>
                <div className="text-slate-900 dark:text-slate-100">
                  <span className="text-slate-500">Time:</span> {(fold.trainingTime / 1000).toFixed(1)}s
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TuningTab() {
  const [isTuning, setIsTuning] = useState(false);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Hyperparameter Search</h4>
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
          Automatically find the best model configuration through grid search with cross-validation
        </p>
        <button
          onClick={() => {
            setIsTuning(true);
            setTimeout(() => setIsTuning(false), 5000);
          }}
          disabled={isTuning}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          {isTuning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Sliders className="w-4 h-4" />
              Start Tuning
            </>
          )}
        </button>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100">Hyperparameter Ranges</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Encoding Dimensions
            </label>
            <select className="w-full px-3 py-2 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-lg">
              <option>16</option>
              <option selected>32</option>
              <option>64</option>
            </select>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Horizon Steps
            </label>
            <select className="w-full px-3 py-2 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-lg">
              <option>3</option>
              <option selected>6</option>
              <option>12</option>
            </select>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Min Occurrences
            </label>
            <select className="w-full px-3 py-2 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-lg">
              <option>1</option>
              <option selected>3</option>
              <option>5</option>
            </select>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Confidence Decay
            </label>
            <select className="w-full px-3 py-2 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-lg">
              <option>0.10</option>
              <option selected>0.15</option>
              <option>0.20</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
