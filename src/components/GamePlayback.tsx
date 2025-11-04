import { useEffect, useState } from 'react';
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
  Condition,
} from '../types';

export function GamePlayback() {
  const {
    project,
    gameState,
    stopPlayback,
    navigateToNode,
    updateGameState,
  } = useGameStore();

  const [battleState, setBattleState] = useState<{
    active: boolean;
    enemyHealth: number;
    playerHealth: number;
    log: string[];
  } | null>(null);

  const currentNode = gameState
    ? project.nodes.find((n) => n.id === gameState.currentNodeId)
    : null;

  useEffect(() => {
    if (!currentNode || !gameState) return;

    // Auto-process certain node types
    if (currentNode.type === GameNodeType.INVENTORY) {
      processInventoryNode();
    } else if (currentNode.type === GameNodeType.CONDITION) {
      processConditionNode();
    }
  }, [currentNode?.id]);

  const processInventoryNode = () => {
    if (!currentNode || !gameState) return;
    const data = currentNode.data as InventoryNodeData;

    let inventory = [...gameState.inventory];

    data.actions?.forEach((action) => {
      if (action.action === 'add' && !inventory.includes(action.itemId)) {
        inventory.push(action.itemId);
      } else if (action.action === 'remove') {
        inventory = inventory.filter((id) => id !== action.itemId);
      }
    });

    updateGameState({ inventory });

    // Auto-advance to next node
    setTimeout(() => {
      const nextNode = findNextNode(currentNode.id);
      if (nextNode) {
        navigateToNode(nextNode.id);
      }
    }, 500);
  };

  const processConditionNode = () => {
    if (!currentNode || !gameState) return;
    const data = currentNode.data as ConditionNodeData;

    const result = evaluateConditions(data.conditions || []);

    // Find the edge with the correct handle
    const edge = project.edges.find(
      (e) => e.source === currentNode.id && e.sourceHandle === (result ? 'true' : 'false')
    );

    if (edge) {
      setTimeout(() => {
        navigateToNode(edge.target);
      }, 500);
    }
  };

  const evaluateConditions = (conditions: Condition[]): boolean => {
    if (!gameState) return false;

    return conditions.every((condition) => {
      switch (condition.type) {
        case ConditionType.HAS_ITEM:
          return gameState.inventory.includes(condition.itemId || '');

        case ConditionType.LACKS_ITEM:
          return !gameState.inventory.includes(condition.itemId || '');

        case ConditionType.STAT_GREATER:
          const statGreater = (gameState.stats as any)[condition.statName || ''] || 0;
          return statGreater > (condition.value || 0);

        case ConditionType.STAT_LESS:
          const statLess = (gameState.stats as any)[condition.statName || ''] || 0;
          return statLess < (condition.value || 0);

        case ConditionType.STAT_EQUAL:
          const statEqual = (gameState.stats as any)[condition.statName || ''] || 0;
          return statEqual === (condition.value || 0);

        default:
          return false;
      }
    });
  };

  const findNextNode = (sourceId: string) => {
    const edge = project.edges.find((e) => e.source === sourceId);
    if (edge) {
      return project.nodes.find((n) => n.id === edge.target);
    }
    return null;
  };

  const handleStoryNext = () => {
    if (!currentNode || !gameState) return;
    const data = currentNode.data as StoryNodeData;

    // Apply inventory actions
    let inventory = [...gameState.inventory];
    data.inventoryActions?.forEach((action) => {
      if (action.action === 'add' && !inventory.includes(action.itemId)) {
        inventory.push(action.itemId);
      } else if (action.action === 'remove') {
        inventory = inventory.filter((id) => id !== action.itemId);
      }
    });

    // Apply stat modifications
    let stats = { ...gameState.stats };
    data.statModifications?.forEach((mod) => {
      const currentValue = (stats as any)[mod.statName] || 0;
      if (mod.operation === 'add') {
        (stats as any)[mod.statName] = currentValue + mod.value;
      } else if (mod.operation === 'subtract') {
        (stats as any)[mod.statName] = currentValue - mod.value;
      } else if (mod.operation === 'set') {
        (stats as any)[mod.statName] = mod.value;
      }

      // Special handling for health
      if (mod.statName === 'health') {
        stats.health = Math.max(0, Math.min(stats.health, stats.maxHealth));
      }
    });

    updateGameState({ inventory, stats });

    // Check if player is dead
    if (stats.health <= 0) {
      updateGameState({ gameOver: true });
      return;
    }

    // Navigate to next node
    const nextNode = findNextNode(currentNode.id);
    if (nextNode) {
      navigateToNode(nextNode.id);
    }
  };

  const handleChoice = (choiceId: string) => {
    if (!currentNode || !gameState) return;
    const data = currentNode.data as ChoiceNodeData;
    const choice = data.choices.find((c) => c.id === choiceId);

    if (!choice) return;

    // Check conditions
    if (choice.conditions && choice.conditions.length > 0) {
      const canChoose = evaluateConditions(choice.conditions);
      if (!canChoose) {
        alert('You cannot choose this option right now.');
        return;
      }
    }

    // Find edge connected to this choice
    const edge = project.edges.find((e) => e.source === currentNode.id);
    if (edge) {
      navigateToNode(edge.target);
    }
  };

  const startBattle = () => {
    if (!currentNode || !gameState) return;
    const data = currentNode.data as BattleNodeData;

    setBattleState({
      active: true,
      enemyHealth: data.battle.enemyHealth,
      playerHealth: gameState.stats.health,
      log: ['Battle begins!'],
    });
  };

  const handleAttack = () => {
    if (!battleState || !currentNode || !gameState) return;
    const data = currentNode.data as BattleNodeData;

    let newLog = [...battleState.log];
    let newEnemyHealth = battleState.enemyHealth - data.battle.playerAttack;
    let newPlayerHealth = battleState.playerHealth;

    newLog.push(`You deal ${data.battle.playerAttack} damage!`);

    if (newEnemyHealth <= 0) {
      newLog.push('Victory! Enemy defeated!');
      setBattleState(null);

      // Find victory edge
      const edge = project.edges.find(
        (e) => e.source === currentNode.id && e.sourceHandle === 'victory'
      );
      if (edge) {
        setTimeout(() => navigateToNode(edge.target), 1000);
      }
      return;
    }

    // Enemy attacks
    newPlayerHealth -= data.battle.enemyAttack;
    newLog.push(`Enemy deals ${data.battle.enemyAttack} damage!`);

    if (newPlayerHealth <= 0) {
      newLog.push('Defeat! You have been slain!');
      updateGameState({
        stats: { ...gameState.stats, health: 0 },
        gameOver: true,
      });
      setBattleState(null);

      // Find defeat edge
      const edge = project.edges.find(
        (e) => e.source === currentNode.id && e.sourceHandle === 'defeat'
      );
      if (edge) {
        setTimeout(() => navigateToNode(edge.target), 1000);
      }
      return;
    }

    setBattleState({
      ...battleState,
      enemyHealth: newEnemyHealth,
      playerHealth: newPlayerHealth,
      log: newLog,
    });

    // Update player health in game state
    updateGameState({
      stats: { ...gameState.stats, health: newPlayerHealth },
    });
  };

  const renderNode = () => {
    if (!currentNode || !gameState) return null;

    if (battleState && battleState.active) {
      const data = currentNode.data as BattleNodeData;
      return (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-red-600">⚔️ Battle!</h2>
          <div className="text-xl font-semibold">{data.battle.enemyName}</div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-100 rounded-lg">
              <div className="text-sm text-gray-600">You</div>
              <div className="text-xl font-bold">HP: {battleState.playerHealth}</div>
              <div className="text-sm">ATK: {data.battle.playerAttack}</div>
            </div>
            <div className="p-4 bg-red-100 rounded-lg">
              <div className="text-sm text-gray-600">{data.battle.enemyName}</div>
              <div className="text-xl font-bold">HP: {battleState.enemyHealth}</div>
              <div className="text-sm">ATK: {data.battle.enemyAttack}</div>
            </div>
          </div>

          <div className="p-4 bg-gray-100 rounded max-h-40 overflow-y-auto">
            {battleState.log.map((msg, i) => (
              <div key={i} className="text-sm">
                {msg}
              </div>
            ))}
          </div>

          <button
            onClick={handleAttack}
            className="px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 w-full"
          >
            Attack!
          </button>
        </div>
      );
    }

    switch (currentNode.type) {
      case GameNodeType.START:
        const startData = currentNode.data as StartNodeData;
        return (
          <div className="space-y-6">
            <h1 className="text-4xl font-bold">{startData.title}</h1>
            <button
              onClick={() => {
                const nextNode = findNextNode(currentNode.id);
                if (nextNode) navigateToNode(nextNode.id);
              }}
              className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600"
            >
              Start Adventure
            </button>
          </div>
        );

      case GameNodeType.STORY:
        const storyData = currentNode.data as StoryNodeData;
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">{storyData.label}</h2>
            <div className="text-lg whitespace-pre-wrap">{storyData.content}</div>
            <button
              onClick={handleStoryNext}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
            >
              Continue
            </button>
          </div>
        );

      case GameNodeType.CHOICE:
        const choiceData = currentNode.data as ChoiceNodeData;
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">{choiceData.label}</h2>
            {choiceData.description && (
              <div className="text-lg">{choiceData.description}</div>
            )}
            <div className="space-y-3">
              {choiceData.choices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => handleChoice(choice.id)}
                  className="w-full px-4 py-3 bg-yellow-100 hover:bg-yellow-200 border-2 border-yellow-400 rounded-lg text-left transition"
                >
                  {choice.text}
                </button>
              ))}
            </div>
          </div>
        );

      case GameNodeType.BATTLE:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">{currentNode.data.label}</h2>
            <button
              onClick={startBattle}
              className="px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600"
            >
              Engage in Battle
            </button>
          </div>
        );

      case GameNodeType.END:
        const endData = currentNode.data as EndNodeData;
        return (
          <div className="space-y-6 text-center">
            <h2 className="text-4xl font-bold">
              {endData.endingType === 'victory' && '🏆'}
              {endData.endingType === 'defeat' && '💀'}
              {endData.endingType === 'neutral' && '🏁'}
            </h2>
            <h2 className="text-2xl font-bold">{endData.label}</h2>
            <div className="text-lg whitespace-pre-wrap">{endData.message}</div>
            <button
              onClick={stopPlayback}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
            >
              Return to Editor
            </button>
          </div>
        );

      default:
        return (
          <div className="text-gray-500">
            Processing node...
            <button
              onClick={() => {
                const nextNode = findNextNode(currentNode.id);
                if (nextNode) navigateToNode(nextNode.id);
              }}
              className="ml-4 px-4 py-2 bg-blue-500 text-white rounded"
            >
              Continue
            </button>
          </div>
        );
    }
  };

  if (!gameState) return null;

  const getInventoryItems = () => {
    return gameState.inventory
      .map((itemId) => project.items.find((item) => item.id === itemId))
      .filter(Boolean);
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-blue-100 flex">
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
          {gameState.gameOver ? (
            <div className="text-center space-y-6">
              <h2 className="text-4xl font-bold text-red-600">Game Over</h2>
              <p className="text-lg">Your health has reached zero.</p>
              <button
                onClick={stopPlayback}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
              >
                Return to Editor
              </button>
            </div>
          ) : (
            renderNode()
          )}
        </div>
      </div>

      <div className="w-80 bg-white border-l border-gray-300 p-4 overflow-y-auto">
        <button
          onClick={stopPlayback}
          className="w-full mb-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Exit Playback
        </button>

        <div className="mb-6">
          <h3 className="font-bold text-lg mb-2">Stats</h3>
          <div className="space-y-2">
            <div className="flex justify-between p-2 bg-red-100 rounded">
              <span>Health:</span>
              <span className="font-bold">
                {gameState.stats.health}/{gameState.stats.maxHealth}
              </span>
            </div>
            <div className="flex justify-between p-2 bg-yellow-100 rounded">
              <span>Gold:</span>
              <span className="font-bold">{gameState.stats.gold}</span>
            </div>
            {Object.entries(gameState.stats.skills).map(([skill, value]) => (
              <div key={skill} className="flex justify-between p-2 bg-blue-100 rounded">
                <span className="capitalize">{skill}:</span>
                <span className="font-bold">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-2">Inventory</h3>
          <div className="space-y-2">
            {getInventoryItems().map((item) => (
              <div key={item!.id} className="p-2 bg-purple-100 rounded">
                <div className="font-semibold text-sm">{item!.name}</div>
                <div className="text-xs text-gray-600">{item!.description}</div>
              </div>
            ))}
            {gameState.inventory.length === 0 && (
              <div className="text-gray-500 text-sm text-center py-4">Empty</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
