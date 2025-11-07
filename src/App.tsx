import { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useGameStore } from './store/useGameStore';
import { Toolbar } from './components/Toolbar';
import { GameEditor } from './components/GameEditor';
import { PropertiesPanel } from './components/PropertiesPanel';
import { ItemManager } from './components/ItemManager';
import { BookPlayback } from './components/BookPlayback';

function App() {
  const { mode } = useGameStore();
  const [showItemManager, setShowItemManager] = useState(false);

  if (mode === 'playback') {
    return <BookPlayback />;
  }

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gamebook Creator</h1>
          <p className="text-sm opacity-90">Create interactive stories with React Flow</p>
        </div>
        <button
          onClick={() => setShowItemManager(!showItemManager)}
          className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition font-semibold"
        >
          {showItemManager ? 'Hide' : 'Show'} Item Library
        </button>
      </div>

      <Toolbar />

      <div className="flex-1 flex overflow-hidden">
        {showItemManager && (
          <div className="w-80 bg-white border-r border-gray-300 overflow-y-auto">
            <ItemManager />
          </div>
        )}

        <div className="flex-1">
          <ReactFlowProvider>
            <GameEditor />
          </ReactFlowProvider>
        </div>

        <PropertiesPanel />
      </div>
    </div>
  );
}

export default App;
