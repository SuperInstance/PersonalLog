'use client'

/**
 * Advanced Tab
 *
 * Advanced model settings and configuration.
 */

interface AdvancedTabProps {
  temperature: number
  onTemperatureChange: (t: number) => void
  maxTokens: number
  onMaxTokensChange: (t: number) => void
  responseStyle: 'brief' | 'balanced' | 'detailed'
  onResponseStyleChange: (s: 'brief' | 'balanced' | 'detailed') => void
  baseModel: any
  onHasChanges: () => void
}

export function AdvancedTab({
  temperature,
  onTemperatureChange,
  maxTokens,
  onMaxTokensChange,
  responseStyle,
  onResponseStyleChange,
  baseModel,
  onHasChanges,
}: AdvancedTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Model Settings
        </h3>
        <div className="space-y-4">
          {/* Response Style */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Response Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['brief', 'balanced', 'detailed'].map(style => (
                <button
                  key={style}
                  onClick={() => {
                    onResponseStyleChange(style as any)
                    onHasChanges()
                  }}
                  className={`px-4 py-2 rounded-lg border-2 transition-all capitalize ${
                    responseStyle === style
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Creativity (Temperature): {temperature.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => {
                onTemperatureChange(parseFloat(e.target.value))
                onHasChanges()
              }}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Max Response Length
            </label>
            <select
              value={maxTokens}
              onChange={(e) => {
                onMaxTokensChange(parseInt(e.target.value))
                onHasChanges()
              }}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
            >
              <option value={100}>Brief (~100 tokens)</option>
              <option value={300}>Medium (~300 tokens)</option>
              <option value={500}>Long (~500 tokens)</option>
              <option value={1000}>Detailed (~1000 tokens)</option>
              <option value={2000}>Extended (~2000 tokens)</option>
            </select>
          </div>
        </div>

        {/* Base Model Info */}
        {baseModel && (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mt-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Base model: <span className="font-medium text-slate-900 dark:text-slate-100">{baseModel.name}</span>
              <br />
              Provider: <span className="font-medium text-slate-900 dark:text-slate-100">{baseModel.provider}</span>
              {baseModel.capabilities && (
                <>
                  <br />
                  Max context: <span className="font-medium text-slate-900 dark:text-slate-100">{baseModel.capabilities.maxContext.toLocaleString()} tokens</span>
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
