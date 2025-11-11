import { InputGroup } from './components/input-group'
import { useInputStore } from './stores/inputStore'
import './App.css'

function App() {
  const { monsterAC, partyLevel, baseDamage, setValues } = useInputStore()
  
  const inputValues = { monsterAC, partyLevel, baseDamage }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">D&D Homebrew Mechanic Analyzer</h1>
        <p className="text-slate-300 mb-8">
          Analyze expected damage output for the attack penalty/damage bonus mechanic
        </p>
        
        <div className="bg-slate-700 rounded-lg shadow-xl p-8 border border-slate-600">
          <InputGroup values={inputValues} onChange={setValues} />
        </div>

        {/* Debug info - can be removed later */}
        <div className="mt-8 bg-slate-700 rounded-lg p-6 border border-slate-600">
          <h2 className="text-lg font-semibold text-white mb-4">Current Values</h2>
          <pre className="text-slate-300 text-sm bg-slate-800 p-4 rounded border border-slate-600 overflow-auto">
            {JSON.stringify(inputValues, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default App
