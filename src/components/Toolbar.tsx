import { useGameStore } from '../store/useGameStore';
import { GameNodeType } from '../types';
import type {
  GameNode,
  StoryNodeData,
  ChoiceNodeData,
  ConditionNodeData,
  InventoryNodeData,
  BattleNodeData,
  EndNodeData,
} from '../types';
import { downloadHTML } from '../utils/exportToHTML';

export function Toolbar() {
  const { addNode, project, startPlayback, saveProject, newProject } = useGameStore();

  const createNode = (type: GameNodeType) => {
    const position = {
      x: Math.random() * 400 + 100,
      y: Math.random() * 400 + 100,
    };

    let data: any;

    switch (type) {
      case GameNodeType.STORY:
        data = {
          label: 'New Story',
          content: 'Enter your story text here...',
          inventoryActions: [],
          statModifications: [],
        } as StoryNodeData;
        break;

      case GameNodeType.CHOICE:
        data = {
          label: 'New Choice',
          choices: [
            { id: '1', text: 'Choice 1', conditions: [] },
            { id: '2', text: 'Choice 2', conditions: [] },
          ],
        } as ChoiceNodeData;
        break;

      case GameNodeType.CONDITION:
        data = {
          label: 'New Condition',
          conditions: [],
        } as ConditionNodeData;
        break;

      case GameNodeType.INVENTORY:
        data = {
          label: 'Inventory Action',
          actions: [],
        } as InventoryNodeData;
        break;

      case GameNodeType.BATTLE:
        data = {
          label: 'New Battle',
          battle: {
            enemyName: 'Enemy',
            enemyHealth: 50,
            enemyAttack: 10,
            playerAttack: 15,
          },
        } as BattleNodeData;
        break;

      case GameNodeType.END:
        data = {
          label: 'The End',
          endingType: 'neutral',
          message: 'Your journey has ended.',
        } as EndNodeData;
        break;

      default:
        return;
    }

    const newNode: GameNode = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data,
    };

    addNode(newNode);
  };

  const handleLoadProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        const loadedProject = JSON.parse(text);
        useGameStore.getState().loadProject(loadedProject);
      }
    };
    input.click();
  };

  return (
    <div className="bg-white border-b border-gray-300 px-4 py-2 flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2 border-r border-gray-300 pr-4">
        <button
          onClick={newProject}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
        >
          New
        </button>
        <button
          onClick={handleLoadProject}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
        >
          Load
        </button>
        <button
          onClick={saveProject}
          className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition"
        >
          Save
        </button>
        <button
          onClick={() => downloadHTML(project)}
          className="px-3 py-1 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded transition"
        >
          Export HTML
        </button>
      </div>

      <div className="flex items-center gap-2 border-r border-gray-300 pr-4">
        <span className="text-sm text-gray-600 font-semibold">Add Node:</span>
        <button
          onClick={() => createNode(GameNodeType.STORY)}
          className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 rounded transition"
        >
          📖 Story
        </button>
        <button
          onClick={() => createNode(GameNodeType.CHOICE)}
          className="px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 rounded transition"
        >
          🔀 Choice
        </button>
        <button
          onClick={() => createNode(GameNodeType.CONDITION)}
          className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 rounded transition"
        >
          ❓ Condition
        </button>
        <button
          onClick={() => createNode(GameNodeType.INVENTORY)}
          className="px-3 py-1 text-sm bg-orange-100 hover:bg-orange-200 rounded transition"
        >
          🎒 Inventory
        </button>
        <button
          onClick={() => createNode(GameNodeType.BATTLE)}
          className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 rounded transition"
        >
          ⚔️ Battle
        </button>
        <button
          onClick={() => createNode(GameNodeType.END)}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
        >
          🏁 End
        </button>
      </div>

      <button
        onClick={startPlayback}
        className="px-4 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded transition font-semibold"
      >
        ▶️ Play
      </button>

      <div className="ml-auto text-sm text-gray-600">
        {project.nodes.length} nodes | {project.edges.length} connections
      </div>
    </div>
  );
}
