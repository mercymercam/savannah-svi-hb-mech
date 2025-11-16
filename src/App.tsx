import { useMemo } from 'react'
import { InputGroup } from './components/input-group'
import { Chart } from './components/chart'
import { DamageTable } from './components/table'
import { useInputStore } from './stores/inputStore'
import { useDamageData } from './hooks/useDamageData'
import './App.css'

function App() {
  const { monsterAC, partyLevel, baseDamage, toHitBonus, hasAdvantage, viewMode, setValues } = useInputStore()
  
  const inputValues = useMemo(
    () => ({ monsterAC, partyLevel, baseDamage, toHitBonus, hasAdvantage, viewMode }),
    [monsterAC, partyLevel, baseDamage, toHitBonus, hasAdvantage, viewMode]
  )

  // Calculate damage data once and pass to both Chart and Table
  const damageData = useDamageData(inputValues)

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
      {/* Top Bar - Input Section */}
      <div className="w-full bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">D&D Homebrew Mechanic Analyzer</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Analyze expected damage output for the attack penalty/damage bonus mechanic
            </p>
          </div>
          <InputGroup values={inputValues} onChange={setValues} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Chart Section */}
        <div className="mb-12">
          <Chart damageData={damageData} />
        </div>

        {/* Table Section */}
        <div className="mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Damage Analysis Table
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Detailed breakdown of expected damage distribution for each d4 penalty option
            </p>
            <DamageTable damageData={damageData} />
          </div>
        </div>

        {/* Debug info - can be removed later */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Values</h2>
          <pre className="text-gray-700 dark:text-gray-300 text-sm bg-gray-100 dark:bg-gray-900 p-4 rounded border border-gray-300 dark:border-gray-700 overflow-auto">
            {JSON.stringify(inputValues, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default App
