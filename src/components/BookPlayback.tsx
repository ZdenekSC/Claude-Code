import { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { GameNodeType, ConditionType } from '../types';
import type {
  StoryNodeData,
  ChoiceNodeData,
  ConditionNodeData,
  BattleNodeData,
  EndNodeData,
  StartNodeData,
  Condition,
} from '../types';
import { DicePairDisplay } from './DiceDisplay';
import { testLuck, calculateAttackStrength } from '../utils/dice';

export function BookPlayback() {
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
    lastPlayerDice?: [number, number];
    lastEnemyDice?: [number, number];
  } | null>(null);

  const [luckTestResult, setLuckTestResult] = useState<{
    lucky: boolean;
    dice: [number, number];
  } | null>(null);

  const [sectionNumber, setSectionNumber] = useState(1);

  const currentNode = gameState
    ? project.nodes.find((n) => n.id === gameState.currentNodeId)
    : null;

  useEffect(() => {
    if (!currentNode || !gameState) return;

    // Auto-process certain node types
    if (currentNode.type === GameNodeType.CONDITION) {
      processConditionNode();
    }
  }, [currentNode?.id]);

  const processConditionNode = () => {
    if (!currentNode || !gameState) return;
    const data = currentNode.data as ConditionNodeData;

    const result = evaluateConditions(data.conditions || []);

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

  const findNextNode = (sourceId: string, handleId?: string) => {
    const edge = project.edges.find((e) => e.source === sourceId && (!handleId || e.sourceHandle === handleId));
    if (edge) {
      return project.nodes.find((n) => n.id === edge.target);
    }
    return null;
  };

  const handleContinue = () => {
    setSectionNumber(sectionNumber + 1);
    const nextNode = findNextNode(currentNode!.id);
    if (nextNode) {
      navigateToNode(nextNode.id);
    }
  };

  const handleChoice = (choiceIndex: number) => {
    setSectionNumber(sectionNumber + 1);
    const edges = project.edges.filter((e) => e.source === currentNode!.id);
    if (edges[choiceIndex]) {
      navigateToNode(edges[choiceIndex].target);
    }
  };

  const handleLuckTest = () => {
    if (!gameState) return;

    const result = testLuck(gameState.stats.luck);
    setLuckTestResult(result);

    // Reduce LUCK by 1
    updateGameState({
      stats: {
        ...gameState.stats,
        luck: Math.max(0, gameState.stats.luck - 1),
      },
    });

    // Navigate after showing result
    setTimeout(() => {
      const handleId = result.lucky ? 'lucky' : 'unlucky';
      const nextNode = findNextNode(currentNode!.id, handleId);
      if (nextNode) {
        setSectionNumber(sectionNumber + 1);
        navigateToNode(nextNode.id);
      }
      setLuckTestResult(null);
    }, 3000);
  };

  const startBattle = () => {
    if (!currentNode || !gameState) return;
    const data = currentNode.data as BattleNodeData;

    setBattleState({
      active: true,
      enemyHealth: data.battle.enemyStamina || data.battle.enemyHealth,
      playerHealth: gameState.stats.stamina,
      log: [`You encounter ${data.battle.enemyName}!`, 'The battle begins!'],
    });
  };

  const handleAttack = () => {
    if (!battleState || !currentNode || !gameState) return;
    const data = currentNode.data as BattleNodeData;

    const playerAttack = calculateAttackStrength(gameState.stats.skill);
    const enemyAttack = calculateAttackStrength(data.battle.enemySkill || 7);

    let newLog = [...battleState.log];
    let newEnemyHealth = battleState.enemyHealth;
    let newPlayerHealth = battleState.playerHealth;

    newLog.push(`You rolled ${playerAttack.dice[0]} + ${playerAttack.dice[1]} + ${gameState.stats.skill} = ${playerAttack.total}`);
    newLog.push(`${data.battle.enemyName} rolled ${enemyAttack.dice[0]} + ${enemyAttack.dice[1]} + ${data.battle.enemySkill || 7} = ${enemyAttack.total}`);

    if (playerAttack.total > enemyAttack.total) {
      newEnemyHealth -= 2;
      newLog.push(`You wound ${data.battle.enemyName} for 2 STAMINA!`);
    } else if (enemyAttack.total > playerAttack.total) {
      newPlayerHealth -= 2;
      newLog.push(`${data.battle.enemyName} wounds you for 2 STAMINA!`);
    } else {
      newLog.push('The blows are parried! No damage.');
    }

    if (newEnemyHealth <= 0) {
      newLog.push(`Victory! ${data.battle.enemyName} is defeated!`);
      setBattleState(null);

      const edge = project.edges.find(
        (e) => e.source === currentNode.id && e.sourceHandle === 'victory'
      );
      if (edge) {
        setTimeout(() => {
          setSectionNumber(sectionNumber + 1);
          navigateToNode(edge.target);
        }, 2000);
      }
      return;
    }

    if (newPlayerHealth <= 0) {
      newLog.push('You have been slain!');
      updateGameState({
        stats: { ...gameState.stats, stamina: 0 },
        gameOver: true,
      });
      setBattleState(null);

      const edge = project.edges.find(
        (e) => e.source === currentNode.id && e.sourceHandle === 'defeat'
      );
      if (edge) {
        setTimeout(() => {
          setSectionNumber(sectionNumber + 1);
          navigateToNode(edge.target);
        }, 2000);
      }
      return;
    }

    setBattleState({
      ...battleState,
      enemyHealth: newEnemyHealth,
      playerHealth: newPlayerHealth,
      log: newLog,
      lastPlayerDice: playerAttack.dice,
      lastEnemyDice: enemyAttack.dice,
    });

    updateGameState({
      stats: { ...gameState.stats, stamina: newPlayerHealth },
    });
  };

  const renderNode = () => {
    if (!currentNode || !gameState) return null;

    if (luckTestResult) {
      return (
        <div className="book-page aged-paper ornate-border">
          <div className="corner-decoration top-left" />
          <div className="corner-decoration top-right" />
          <div className="corner-decoration bottom-left" />
          <div className="corner-decoration bottom-right" />

          <div className="section-number">{sectionNumber}</div>

          <h2 className="book-title text-2xl mb-6">Test Your Luck!</h2>

          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <DicePairDisplay dice={luckTestResult.dice} size="lg" showSum />
            </div>

            <div className="text-xl font-bold medieval-text">
              You rolled: {luckTestResult.dice[0] + luckTestResult.dice[1]}
            </div>

            <div className="text-lg medieval-text">
              Your LUCK was: {gameState.stats.luck + 1}
            </div>

            <div className={`text-2xl font-bold ${luckTestResult.lucky ? 'text-green-700' : 'text-orange-700'}`}>
              {luckTestResult.lucky ? '🍀 LUCKY!' : '😞 UNLUCKY!'}
            </div>

            <div className="text-sm italic text-gray-600">
              Your LUCK is now {gameState.stats.luck}
            </div>
          </div>
        </div>
      );
    }

    if (battleState && battleState.active) {
      const data = currentNode.data as BattleNodeData;
      return (
        <div className="book-page aged-paper ornate-border">
          <div className="corner-decoration top-left" />
          <div className="corner-decoration top-right" />
          <div className="corner-decoration bottom-left" />
          <div className="corner-decoration bottom-right" />

          <div className="section-number">{sectionNumber}</div>

          <h2 className="book-title text-3xl mb-6">⚔️ {data.battle.enemyName}</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="stats-box">
              <div className="stat-label">You</div>
              <div className="stat-value">STAMINA: {battleState.playerHealth}</div>
              <div className="text-sm">SKILL: {gameState.stats.skill}</div>
            </div>
            <div className="stats-box">
              <div className="stat-label">{data.battle.enemyName}</div>
              <div className="stat-value">STAMINA: {battleState.enemyHealth}</div>
              <div className="text-sm">SKILL: {data.battle.enemySkill || 7}</div>
            </div>
          </div>

          {battleState.lastPlayerDice && battleState.lastEnemyDice && (
            <div className="flex justify-around items-center mb-4">
              <div className="text-center">
                <div className="text-sm font-semibold mb-2">Your Roll</div>
                <DicePairDisplay dice={battleState.lastPlayerDice} size="md" />
              </div>
              <div className="text-2xl font-bold">VS</div>
              <div className="text-center">
                <div className="text-sm font-semibold mb-2">Enemy Roll</div>
                <DicePairDisplay dice={battleState.lastEnemyDice} size="md" />
              </div>
            </div>
          )}

          <div className="scroll-paper max-h-48 overflow-y-auto mb-6">
            {battleState.log.map((msg, i) => (
              <div key={i} className="text-sm medieval-text mb-1">
                {msg}
              </div>
            ))}
          </div>

          <button
            onClick={handleAttack}
            className="btn-medieval w-full"
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
          <div className="book-page aged-paper">
            <h1 className="book-title text-5xl mb-8">{startData.title}</h1>

            <div className="medieval-text text-lg mb-8 text-center">
              <p className="drop-cap mb-4">
                You are about to embark upon a perilous adventure. Before you begin, you must determine your own strengths and weaknesses.
              </p>
            </div>

            <div className="stats-box mb-8">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="stat-label">SKILL</div>
                  <div className="stat-value">{startData.initialStats.skill}</div>
                </div>
                <div className="text-center">
                  <div className="stat-label">STAMINA</div>
                  <div className="stat-value">{startData.initialStats.stamina}</div>
                </div>
                <div className="text-center">
                  <div className="stat-label">LUCK</div>
                  <div className="stat-value">{startData.initialStats.luck}</div>
                </div>
              </div>
            </div>

            <button
              onClick={handleContinue}
              className="btn-medieval w-full"
            >
              Begin Your Adventure
            </button>
          </div>
        );

      case GameNodeType.STORY:
        const storyData = currentNode.data as StoryNodeData;
        return (
          <div className="book-page aged-paper ornate-border">
            <div className="corner-decoration top-left" />
            <div className="corner-decoration top-right" />
            <div className="corner-decoration bottom-left" />
            <div className="corner-decoration bottom-right" />

            <div className="section-number">{sectionNumber}</div>

            <h2 className="text-2xl font-bold medieval-text mb-4">{storyData.label}</h2>

            <div className="medieval-text text-lg leading-relaxed mb-6 whitespace-pre-wrap">
              <p className="drop-cap">{storyData.content}</p>
            </div>

            <button
              onClick={handleContinue}
              className="btn-medieval"
            >
              Continue →
            </button>
          </div>
        );

      case GameNodeType.CHOICE:
        const choiceData = currentNode.data as ChoiceNodeData;
        return (
          <div className="book-page aged-paper ornate-border">
            <div className="corner-decoration top-left" />
            <div className="corner-decoration top-right" />
            <div className="corner-decoration bottom-left" />
            <div className="corner-decoration bottom-right" />

            <div className="section-number">{sectionNumber}</div>

            <h2 className="text-2xl font-bold medieval-text mb-4">{choiceData.label}</h2>

            {choiceData.description && (
              <div className="medieval-text text-lg mb-6">{choiceData.description}</div>
            )}

            <div className="space-y-4">
              {choiceData.choices.map((choice, index) => (
                <button
                  key={choice.id}
                  onClick={() => handleChoice(index)}
                  className="btn-medieval w-full text-left"
                >
                  {choice.text}
                </button>
              ))}
            </div>
          </div>
        );

      case GameNodeType.LUCK_TEST:
        const luckData = currentNode.data as any;
        return (
          <div className="book-page aged-paper ornate-border">
            <div className="corner-decoration top-left" />
            <div className="corner-decoration top-right" />
            <div className="corner-decoration bottom-left" />
            <div className="corner-decoration bottom-right" />

            <div className="section-number">{sectionNumber}</div>

            <h2 className="text-2xl font-bold medieval-text mb-4 text-center">🍀 Test Your Luck!</h2>

            <div className="medieval-text text-lg mb-6 text-center">
              {luckData.description}
            </div>

            <div className="stats-box mb-6">
              <div className="text-center">
                <div className="stat-label">Current LUCK</div>
                <div className="stat-value">{gameState.stats.luck}</div>
              </div>
            </div>

            <button
              onClick={handleLuckTest}
              className="btn-medieval w-full"
            >
              Roll the Dice
            </button>
          </div>
        );

      case GameNodeType.BATTLE:
        return (
          <div className="book-page aged-paper ornate-border">
            <div className="corner-decoration top-left" />
            <div className="corner-decoration top-right" />
            <div className="corner-decoration bottom-left" />
            <div className="corner-decoration bottom-right" />

            <div className="section-number">{sectionNumber}</div>

            <h2 className="text-2xl font-bold medieval-text mb-4">{currentNode.data.label}</h2>

            <button
              onClick={startBattle}
              className="btn-medieval w-full"
            >
              Engage in Combat!
            </button>
          </div>
        );

      case GameNodeType.END:
        const endData = currentNode.data as EndNodeData;
        const endingIcon = endData.endingType === 'victory' ? '🏆' : endData.endingType === 'defeat' ? '💀' : '🏁';
        return (
          <div className="book-page aged-paper ornate-border text-center">
            <div className="corner-decoration top-left" />
            <div className="corner-decoration top-right" />
            <div className="corner-decoration bottom-left" />
            <div className="corner-decoration bottom-right" />

            <div className="wax-seal mx-auto mb-6">{endingIcon}</div>

            <h2 className="book-title text-4xl mb-6">{endData.label}</h2>

            <div className="medieval-text text-xl mb-8 leading-relaxed whitespace-pre-wrap">
              {endData.message}
            </div>

            <button
              onClick={stopPlayback}
              className="btn-medieval"
            >
              Return to Editor
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (!gameState) return null;

  const getInventoryItems = () => {
    return gameState.inventory
      .map((itemId) => project.items.find((item) => item.id === itemId))
      .filter(Boolean);
  };

  return (
    <div className="w-full h-full parchment-bg flex">
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {gameState.gameOver ? (
            <div className="book-page aged-paper ornate-border text-center">
              <div className="wax-seal mx-auto mb-6">💀</div>
              <h2 className="book-title text-4xl mb-6">Your Adventure Ends</h2>
              <p className="medieval-text text-xl mb-8">
                Your STAMINA has reached zero. Your adventure ends here.
              </p>
              <button
                onClick={stopPlayback}
                className="btn-medieval"
              >
                Return to Editor
              </button>
            </div>
          ) : (
            renderNode()
          )}
        </div>
      </div>

      <div className="w-80 aged-paper border-l-4 border-double border-amber-900 p-4 overflow-y-auto">
        <button
          onClick={stopPlayback}
          className="w-full mb-4 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 medieval-text"
        >
          Exit Book
        </button>

        <div className="stats-box mb-6">
          <h3 className="stat-label text-lg mb-3 text-center border-b-2 border-amber-800 pb-2">Adventure Sheet</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="stat-label text-sm">SKILL:</span>
              <span className="stat-value text-xl">{gameState.stats.skill}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="stat-label text-sm">STAMINA:</span>
              <span className="stat-value text-xl">{gameState.stats.stamina}/{gameState.stats.maxStamina}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="stat-label text-sm">LUCK:</span>
              <span className="stat-value text-xl">{gameState.stats.luck}</span>
            </div>
            <div className="flex justify-between items-center border-t border-amber-700 pt-2">
              <span className="stat-label text-sm">PROVISIONS:</span>
              <span className="stat-value text-xl">{gameState.stats.provisions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="stat-label text-sm">GOLD:</span>
              <span className="stat-value text-xl">{gameState.stats.gold}</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="stat-label text-lg mb-3 text-center border-b-2 border-amber-800 pb-2">Equipment</h3>
          <div className="space-y-2">
            {getInventoryItems().map((item) => (
              <div key={item!.id} className="item-scroll">
                <div className="font-semibold text-sm medieval-text">{item!.name}</div>
                <div className="text-xs text-gray-600">{item!.description}</div>
              </div>
            ))}
            {gameState.inventory.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-4 italic">No equipment</div>
            )}
          </div>
        </div>

        <div className="text-center text-xs text-gray-600 italic medieval-text border-t border-amber-700 pt-4">
          Section {sectionNumber}
        </div>
      </div>
    </div>
  );
}
