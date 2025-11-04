import { create } from 'zustand';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type Edge,
} from '@xyflow/react';
import type {
  GameProject,
  GameNode,
  Item,
  StartNodeData,
  PlayerStats,
  GameState,
} from '../types';
import { GameNodeType } from '../types';

interface GameStore {
  // Project data
  project: GameProject;
  selectedNode: GameNode | null;

  // Editor mode vs playback mode
  mode: 'editor' | 'playback';

  // Playback state
  gameState: GameState | null;

  // Actions
  setNodes: (nodes: GameNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (node: GameNode) => void;
  updateNode: (nodeId: string, data: Partial<GameNode['data']>) => void;
  deleteNode: (nodeId: string) => void;
  selectNode: (node: GameNode | null) => void;

  addItem: (item: Item) => void;
  updateItem: (itemId: string, item: Partial<Item>) => void;
  deleteItem: (itemId: string) => void;

  setProjectName: (name: string) => void;
  setProjectDescription: (description: string) => void;

  // Playback actions
  startPlayback: () => void;
  stopPlayback: () => void;
  navigateToNode: (nodeId: string) => void;
  updateGameState: (updates: Partial<GameState>) => void;

  // Save/Load
  saveProject: () => void;
  loadProject: (project: GameProject) => void;
  newProject: () => void;
}

const defaultStats: PlayerStats = {
  health: 100,
  maxHealth: 100,
  gold: 0,
  skills: {},
  customAttributes: {},
};

const createDefaultProject = (): GameProject => {
  const startNode: GameNode = {
    id: 'start-1',
    type: GameNodeType.START,
    position: { x: 250, y: 50 },
    data: {
      label: 'Start',
      title: 'My Gamebook',
      initialStats: defaultStats,
    } as StartNodeData,
  };

  return {
    id: `project-${Date.now()}`,
    name: 'New Gamebook',
    description: '',
    nodes: [startNode],
    edges: [],
    items: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const useGameStore = create<GameStore>((set, get) => ({
  project: createDefaultProject(),
  selectedNode: null,
  mode: 'editor',
  gameState: null,

  setNodes: (nodes) =>
    set((state) => ({
      project: { ...state.project, nodes, updatedAt: new Date().toISOString() },
    })),

  setEdges: (edges) =>
    set((state) => ({
      project: { ...state.project, edges, updatedAt: new Date().toISOString() },
    })),

  onNodesChange: (changes) =>
    set((state) => ({
      project: {
        ...state.project,
        nodes: applyNodeChanges(changes, state.project.nodes) as GameNode[],
        updatedAt: new Date().toISOString(),
      },
    })),

  onEdgesChange: (changes) =>
    set((state) => ({
      project: {
        ...state.project,
        edges: applyEdgeChanges(changes, state.project.edges),
        updatedAt: new Date().toISOString(),
      },
    })),

  onConnect: (connection) =>
    set((state) => ({
      project: {
        ...state.project,
        edges: addEdge(connection, state.project.edges),
        updatedAt: new Date().toISOString(),
      },
    })),

  addNode: (node) =>
    set((state) => ({
      project: {
        ...state.project,
        nodes: [...state.project.nodes, node],
        updatedAt: new Date().toISOString(),
      },
    })),

  updateNode: (nodeId, data) =>
    set((state) => ({
      project: {
        ...state.project,
        nodes: state.project.nodes.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
        ),
        updatedAt: new Date().toISOString(),
      },
    })),

  deleteNode: (nodeId) =>
    set((state) => ({
      project: {
        ...state.project,
        nodes: state.project.nodes.filter((node) => node.id !== nodeId),
        edges: state.project.edges.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId
        ),
        updatedAt: new Date().toISOString(),
      },
      selectedNode: state.selectedNode?.id === nodeId ? null : state.selectedNode,
    })),

  selectNode: (node) => set({ selectedNode: node }),

  addItem: (item) =>
    set((state) => ({
      project: {
        ...state.project,
        items: [...state.project.items, item],
        updatedAt: new Date().toISOString(),
      },
    })),

  updateItem: (itemId, updates) =>
    set((state) => ({
      project: {
        ...state.project,
        items: state.project.items.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        ),
        updatedAt: new Date().toISOString(),
      },
    })),

  deleteItem: (itemId) =>
    set((state) => ({
      project: {
        ...state.project,
        items: state.project.items.filter((item) => item.id !== itemId),
        updatedAt: new Date().toISOString(),
      },
    })),

  setProjectName: (name) =>
    set((state) => ({
      project: { ...state.project, name, updatedAt: new Date().toISOString() },
    })),

  setProjectDescription: (description) =>
    set((state) => ({
      project: { ...state.project, description, updatedAt: new Date().toISOString() },
    })),

  startPlayback: () => {
    const state = get();
    const startNode = state.project.nodes.find((n) => n.type === GameNodeType.START);

    if (!startNode) {
      alert('No start node found! Add a start node to begin playback.');
      return;
    }

    const startData = startNode.data as StartNodeData;

    set({
      mode: 'playback',
      gameState: {
        currentNodeId: startNode.id,
        inventory: [],
        stats: { ...startData.initialStats },
        visitedNodes: [startNode.id],
        gameOver: false,
      },
    });
  },

  stopPlayback: () =>
    set({
      mode: 'editor',
      gameState: null,
    }),

  navigateToNode: (nodeId) =>
    set((state) => {
      if (!state.gameState) return state;

      return {
        gameState: {
          ...state.gameState,
          currentNodeId: nodeId,
          visitedNodes: [...state.gameState.visitedNodes, nodeId],
        },
      };
    }),

  updateGameState: (updates) =>
    set((state) => {
      if (!state.gameState) return state;

      return {
        gameState: {
          ...state.gameState,
          ...updates,
        },
      };
    }),

  saveProject: () => {
    const state = get();
    const json = JSON.stringify(state.project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.project.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  loadProject: (project) =>
    set({
      project: { ...project, updatedAt: new Date().toISOString() },
      selectedNode: null,
      mode: 'editor',
      gameState: null,
    }),

  newProject: () =>
    set({
      project: createDefaultProject(),
      selectedNode: null,
      mode: 'editor',
      gameState: null,
    }),
}));
