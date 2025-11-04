import { useGameStore } from '../store/useGameStore';
import { GameNodeType, ConditionType } from '../types';
import type {
  StoryNodeData,
  ChoiceNodeData,
  ConditionNodeData,
  InventoryNodeData,
  BattleNodeData,
  EndNodeData,
  StartNodeData,
  InventoryAction,
  StatModification,
  Condition,
} from '../types';

export function PropertiesPanel() {
  const { selectedNode, deleteNode } = useGameStore();

  if (!selectedNode) {
    return (
      <div className="w-80 bg-white border-l border-gray-300 p-4">
        <div className="text-gray-500 text-center mt-8">
          Select a node to edit its properties
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm('Delete this node?')) {
      deleteNode(selectedNode.id);
    }
  };

  const renderEditor = () => {
    switch (selectedNode.type) {
      case GameNodeType.START:
        return <StartNodeEditor node={selectedNode} />;
      case GameNodeType.STORY:
        return <StoryNodeEditor node={selectedNode} />;
      case GameNodeType.CHOICE:
        return <ChoiceNodeEditor node={selectedNode} />;
      case GameNodeType.CONDITION:
        return <ConditionNodeEditor node={selectedNode} />;
      case GameNodeType.INVENTORY:
        return <InventoryNodeEditor node={selectedNode} />;
      case GameNodeType.BATTLE:
        return <BattleNodeEditor node={selectedNode} />;
      case GameNodeType.END:
        return <EndNodeEditor node={selectedNode} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-300 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Properties</h3>
        <button
          onClick={handleDelete}
          className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded"
        >
          Delete
        </button>
      </div>
      {renderEditor()}
    </div>
  );
}

function StartNodeEditor({ node }: { node: any }) {
  const { updateNode } = useGameStore();
  const data = node.data as StartNodeData;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-1">Label</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => updateNode(node.id, { label: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Game Title</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => updateNode(node.id, { title: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Initial Stats</label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="number"
              value={data.initialStats.health}
              onChange={(e) =>
                updateNode(node.id, {
                  initialStats: {
                    ...data.initialStats,
                    health: parseInt(e.target.value),
                    maxHealth: parseInt(e.target.value),
                  },
                })
              }
              className="w-full px-2 py-1 border border-gray-300 rounded"
              placeholder="Health"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={data.initialStats.gold}
              onChange={(e) =>
                updateNode(node.id, {
                  initialStats: {
                    ...data.initialStats,
                    gold: parseInt(e.target.value),
                  },
                })
              }
              className="w-full px-2 py-1 border border-gray-300 rounded"
              placeholder="Gold"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StoryNodeEditor({ node }: { node: any }) {
  const { updateNode, project } = useGameStore();
  const data = node.data as StoryNodeData;

  const addInventoryAction = () => {
    const actions = data.inventoryActions || [];
    updateNode(node.id, {
      inventoryActions: [
        ...actions,
        { id: Date.now().toString(), action: 'add', itemId: '' },
      ],
    });
  };

  const updateInventoryAction = (index: number, updates: Partial<InventoryAction>) => {
    const actions = [...(data.inventoryActions || [])];
    actions[index] = { ...actions[index], ...updates };
    updateNode(node.id, { inventoryActions: actions });
  };

  const removeInventoryAction = (index: number) => {
    const actions = data.inventoryActions?.filter((_, i) => i !== index) || [];
    updateNode(node.id, { inventoryActions: actions });
  };

  const addStatModification = () => {
    const mods = data.statModifications || [];
    updateNode(node.id, {
      statModifications: [
        ...mods,
        { id: Date.now().toString(), statName: 'health', operation: 'add', value: 0 },
      ],
    });
  };

  const updateStatModification = (index: number, updates: Partial<StatModification>) => {
    const mods = [...(data.statModifications || [])];
    mods[index] = { ...mods[index], ...updates };
    updateNode(node.id, { statModifications: mods });
  };

  const removeStatModification = (index: number) => {
    const mods = data.statModifications?.filter((_, i) => i !== index) || [];
    updateNode(node.id, { statModifications: mods });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-1">Label</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => updateNode(node.id, { label: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Story Content</label>
        <textarea
          value={data.content}
          onChange={(e) => updateNode(node.id, { content: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded h-32"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Inventory Actions</label>
        {data.inventoryActions?.map((action, index) => (
          <div key={action.id} className="flex gap-2 mb-2">
            <select
              value={action.action}
              onChange={(e) =>
                updateInventoryAction(index, { action: e.target.value as 'add' | 'remove' })
              }
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="add">Add</option>
              <option value="remove">Remove</option>
            </select>
            <select
              value={action.itemId}
              onChange={(e) => updateInventoryAction(index, { itemId: e.target.value })}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="">Select item...</option>
              {project.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => removeInventoryAction(index)}
              className="px-2 py-1 bg-red-500 text-white rounded text-xs"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addInventoryAction}
          className="px-2 py-1 bg-blue-500 text-white rounded text-xs w-full"
        >
          + Add Action
        </button>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Stat Modifications</label>
        {data.statModifications?.map((mod, index) => (
          <div key={mod.id} className="space-y-1 mb-2 p-2 bg-gray-50 rounded">
            <input
              type="text"
              value={mod.statName}
              onChange={(e) => updateStatModification(index, { statName: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Stat name (e.g., health, gold)"
            />
            <div className="flex gap-2">
              <select
                value={mod.operation}
                onChange={(e) =>
                  updateStatModification(index, {
                    operation: e.target.value as 'add' | 'subtract' | 'set',
                  })
                }
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="add">Add</option>
                <option value="subtract">Subtract</option>
                <option value="set">Set</option>
              </select>
              <input
                type="number"
                value={mod.value}
                onChange={(e) =>
                  updateStatModification(index, { value: parseInt(e.target.value) })
                }
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <button
                onClick={() => removeStatModification(index)}
                className="px-2 py-1 bg-red-500 text-white rounded text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={addStatModification}
          className="px-2 py-1 bg-blue-500 text-white rounded text-xs w-full"
        >
          + Add Modification
        </button>
      </div>
    </div>
  );
}

function ChoiceNodeEditor({ node }: { node: any }) {
  const { updateNode } = useGameStore();
  const data = node.data as ChoiceNodeData;

  const updateChoice = (index: number, updates: any) => {
    const choices = [...data.choices];
    choices[index] = { ...choices[index], ...updates };
    updateNode(node.id, { choices });
  };

  const addChoice = () => {
    const choices = [...data.choices];
    choices.push({ id: Date.now().toString(), text: 'New choice', conditions: [] });
    updateNode(node.id, { choices });
  };

  const removeChoice = (index: number) => {
    const choices = data.choices.filter((_, i) => i !== index);
    updateNode(node.id, { choices });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-1">Label</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => updateNode(node.id, { label: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Description</label>
        <textarea
          value={data.description || ''}
          onChange={(e) => updateNode(node.id, { description: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded h-20"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-2">Choices</label>
        {data.choices.map((choice, index) => (
          <div key={choice.id} className="mb-3 p-2 bg-gray-50 rounded">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-gray-600">Choice {index + 1}</span>
              <button
                onClick={() => removeChoice(index)}
                className="px-2 py-1 bg-red-500 text-white rounded text-xs"
              >
                ✕
              </button>
            </div>
            <textarea
              value={choice.text}
              onChange={(e) => updateChoice(index, { text: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              rows={2}
            />
          </div>
        ))}
        <button
          onClick={addChoice}
          className="px-2 py-1 bg-blue-500 text-white rounded text-xs w-full"
        >
          + Add Choice
        </button>
      </div>
    </div>
  );
}

function ConditionNodeEditor({ node }: { node: any }) {
  const { updateNode, project } = useGameStore();
  const data = node.data as ConditionNodeData;

  const addCondition = () => {
    const conditions = data.conditions || [];
    updateNode(node.id, {
      conditions: [
        ...conditions,
        { id: Date.now().toString(), type: ConditionType.HAS_ITEM },
      ],
    });
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    const conditions = [...(data.conditions || [])];
    conditions[index] = { ...conditions[index], ...updates };
    updateNode(node.id, { conditions });
  };

  const removeCondition = (index: number) => {
    const conditions = data.conditions?.filter((_, i) => i !== index) || [];
    updateNode(node.id, { conditions });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-1">Label</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => updateNode(node.id, { label: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Conditions (ALL must be true)</label>
        {data.conditions?.map((condition, index) => (
          <div key={condition.id} className="mb-2 p-2 bg-gray-50 rounded">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-gray-600">Condition {index + 1}</span>
              <button
                onClick={() => removeCondition(index)}
                className="px-2 py-1 bg-red-500 text-white rounded text-xs"
              >
                ✕
              </button>
            </div>
            <select
              value={condition.type}
              onChange={(e) => updateCondition(index, { type: e.target.value as ConditionType })}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-1"
            >
              <option value={ConditionType.HAS_ITEM}>Has Item</option>
              <option value={ConditionType.LACKS_ITEM}>Lacks Item</option>
              <option value={ConditionType.STAT_GREATER}>Stat Greater Than</option>
              <option value={ConditionType.STAT_LESS}>Stat Less Than</option>
              <option value={ConditionType.STAT_EQUAL}>Stat Equal To</option>
            </select>

            {(condition.type === ConditionType.HAS_ITEM ||
              condition.type === ConditionType.LACKS_ITEM) && (
              <select
                value={condition.itemId || ''}
                onChange={(e) => updateCondition(index, { itemId: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">Select item...</option>
                {project.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}

            {(condition.type === ConditionType.STAT_GREATER ||
              condition.type === ConditionType.STAT_LESS ||
              condition.type === ConditionType.STAT_EQUAL) && (
              <div className="space-y-1">
                <input
                  type="text"
                  value={condition.statName || ''}
                  onChange={(e) => updateCondition(index, { statName: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Stat name (e.g., health, gold)"
                />
                <input
                  type="number"
                  value={condition.value || 0}
                  onChange={(e) => updateCondition(index, { value: parseInt(e.target.value) })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Value"
                />
              </div>
            )}
          </div>
        ))}
        <button
          onClick={addCondition}
          className="px-2 py-1 bg-blue-500 text-white rounded text-xs w-full"
        >
          + Add Condition
        </button>
      </div>
    </div>
  );
}

function InventoryNodeEditor({ node }: { node: any }) {
  const { updateNode, project } = useGameStore();
  const data = node.data as InventoryNodeData;

  const addAction = () => {
    const actions = data.actions || [];
    updateNode(node.id, {
      actions: [...actions, { id: Date.now().toString(), action: 'add', itemId: '' }],
    });
  };

  const updateAction = (index: number, updates: Partial<InventoryAction>) => {
    const actions = [...(data.actions || [])];
    actions[index] = { ...actions[index], ...updates };
    updateNode(node.id, { actions });
  };

  const removeAction = (index: number) => {
    const actions = data.actions?.filter((_, i) => i !== index) || [];
    updateNode(node.id, { actions });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-1">Label</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => updateNode(node.id, { label: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Actions</label>
        {data.actions?.map((action, index) => (
          <div key={action.id} className="flex gap-2 mb-2">
            <select
              value={action.action}
              onChange={(e) => updateAction(index, { action: e.target.value as 'add' | 'remove' })}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="add">Add</option>
              <option value="remove">Remove</option>
            </select>
            <select
              value={action.itemId}
              onChange={(e) => updateAction(index, { itemId: e.target.value })}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="">Select item...</option>
              {project.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => removeAction(index)}
              className="px-2 py-1 bg-red-500 text-white rounded text-xs"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addAction}
          className="px-2 py-1 bg-blue-500 text-white rounded text-xs w-full"
        >
          + Add Action
        </button>
      </div>
    </div>
  );
}

function BattleNodeEditor({ node }: { node: any }) {
  const { updateNode } = useGameStore();
  const data = node.data as BattleNodeData;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-1">Label</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => updateNode(node.id, { label: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Enemy Name</label>
        <input
          type="text"
          value={data.battle.enemyName}
          onChange={(e) =>
            updateNode(node.id, { battle: { ...data.battle, enemyName: e.target.value } })
          }
          className="w-full px-2 py-1 border border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Enemy Health</label>
        <input
          type="number"
          value={data.battle.enemyHealth}
          onChange={(e) =>
            updateNode(node.id, {
              battle: { ...data.battle, enemyHealth: parseInt(e.target.value) },
            })
          }
          className="w-full px-2 py-1 border border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Enemy Attack</label>
        <input
          type="number"
          value={data.battle.enemyAttack}
          onChange={(e) =>
            updateNode(node.id, {
              battle: { ...data.battle, enemyAttack: parseInt(e.target.value) },
            })
          }
          className="w-full px-2 py-1 border border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Player Attack</label>
        <input
          type="number"
          value={data.battle.playerAttack}
          onChange={(e) =>
            updateNode(node.id, {
              battle: { ...data.battle, playerAttack: parseInt(e.target.value) },
            })
          }
          className="w-full px-2 py-1 border border-gray-300 rounded"
        />
      </div>
    </div>
  );
}

function EndNodeEditor({ node }: { node: any }) {
  const { updateNode } = useGameStore();
  const data = node.data as EndNodeData;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-1">Label</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => updateNode(node.id, { label: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Ending Type</label>
        <select
          value={data.endingType}
          onChange={(e) =>
            updateNode(node.id, { endingType: e.target.value as 'victory' | 'defeat' | 'neutral' })
          }
          className="w-full px-2 py-1 border border-gray-300 rounded"
        >
          <option value="victory">Victory</option>
          <option value="defeat">Defeat</option>
          <option value="neutral">Neutral</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Message</label>
        <textarea
          value={data.message}
          onChange={(e) => updateNode(node.id, { message: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded h-32"
        />
      </div>
    </div>
  );
}
