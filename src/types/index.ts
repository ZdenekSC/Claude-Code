import type { Node, Edge } from '@xyflow/react';

// Core game book node types
export enum GameNodeType {
  START = 'startNode',
  STORY = 'storyNode',
  CHOICE = 'choiceNode',
  INVENTORY = 'inventoryNode',
  CONDITION = 'conditionNode',
  BATTLE = 'battleNode',
  LUCK_TEST = 'luckTestNode',
  END = 'endNode',
}

// Item in the game inventory
export interface Item {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
}

// Player stats/attributes
export interface PlayerStats {
  health: number;
  maxHealth: number;
  gold: number;

  // Fighting Fantasy attributes
  skill: number;          // SKILL (1D6+6)
  stamina: number;        // STAMINA (2D6+12) - current
  maxStamina: number;     // Maximum STAMINA
  luck: number;           // LUCK (1D6+6) - current
  initialLuck: number;    // Initial LUCK for reference
  provisions: number;     // Food for healing (restores 4 STAMINA)

  // Legacy/custom attributes
  skills: { [key: string]: number };
  customAttributes: { [key: string]: number };
}

// Condition types for checking game state
export enum ConditionType {
  HAS_ITEM = 'hasItem',
  LACKS_ITEM = 'lacksItem',
  STAT_GREATER = 'statGreater',
  STAT_LESS = 'statLess',
  STAT_EQUAL = 'statEqual',
}

// A single condition to evaluate
export interface Condition {
  id: string;
  type: ConditionType;
  itemId?: string; // For item checks
  statName?: string; // For stat checks
  value?: number; // For stat comparisons
}

// Inventory action (add or remove item)
export interface InventoryAction {
  id: string;
  action: 'add' | 'remove';
  itemId: string;
}

// Stat modification action
export interface StatModification {
  id: string;
  statName: string;
  operation: 'add' | 'subtract' | 'set';
  value: number;
}

// Battle configuration
export interface BattleConfig {
  enemyName: string;
  enemyHealth: number;
  enemyAttack: number;
  playerAttack: number;
  victoryNodeId?: string;
  defeatNodeId?: string;

  // Fighting Fantasy combat
  useFightingFantasyRules?: boolean; // If true, use FF combat system
  enemySkill?: number; // Enemy SKILL for FF combat
  enemyStamina?: number; // Enemy STAMINA for FF combat
}

// Base node data that all nodes share
export interface BaseNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
}

// Story node data
export interface StoryNodeData extends BaseNodeData {
  content: string;
  imageUrl?: string;
  inventoryActions?: InventoryAction[];
  statModifications?: StatModification[];
}

// Choice node data (branching point)
export interface ChoiceNodeData extends BaseNodeData {
  choices: {
    id: string;
    text: string;
    targetNodeId?: string;
    conditions?: Condition[];
  }[];
}

// Inventory node data
export interface InventoryNodeData extends BaseNodeData {
  actions: InventoryAction[];
}

// Condition node data
export interface ConditionNodeData extends BaseNodeData {
  conditions: Condition[];
  trueNodeId?: string;
  falseNodeId?: string;
}

// Battle node data
export interface BattleNodeData extends BaseNodeData {
  battle: BattleConfig;
}

// Start node data
export interface StartNodeData extends BaseNodeData {
  title: string;
  initialStats: PlayerStats;
}

// End node data
export interface EndNodeData extends BaseNodeData {
  endingType: 'victory' | 'defeat' | 'neutral';
  message: string;
}

// Luck Test node data (Fighting Fantasy mechanic)
export interface LuckTestNodeData extends BaseNodeData {
  description: string; // What you're testing luck for
  luckyOutcome: string; // What happens if lucky
  unluckyOutcome: string; // What happens if unlucky
  luckyStatMods?: StatModification[]; // Stat changes if lucky
  unluckyStatMods?: StatModification[]; // Stat changes if unlucky
}

// Union type for all node data types
export type GameNodeData =
  | StoryNodeData
  | ChoiceNodeData
  | InventoryNodeData
  | ConditionNodeData
  | BattleNodeData
  | LuckTestNodeData
  | StartNodeData
  | EndNodeData;

// React Flow node with our game node data
export type GameNode = Node<GameNodeData, GameNodeType>;

// Complete game project
export interface GameProject {
  id: string;
  name: string;
  description: string;
  nodes: GameNode[];
  edges: Edge[];
  items: Item[];
  createdAt: string;
  updatedAt: string;
}

// Game state during playback
export interface GameState {
  currentNodeId: string;
  inventory: string[]; // Array of item IDs
  stats: PlayerStats;
  visitedNodes: string[];
  gameOver: boolean;
}
