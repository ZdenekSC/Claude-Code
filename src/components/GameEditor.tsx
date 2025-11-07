import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  SelectionMode,
  Panel,
  type NodeTypes,
} from '@xyflow/react';
import { useGameStore } from '../store/useGameStore';
import { GameNodeType } from '../types';
import {
  StartNode,
  StoryNode,
  ChoiceNode,
  ConditionNode,
  InventoryNode,
  BattleNode,
  LuckTestNode,
  EndNode,
} from '../nodes';

export function GameEditor() {
  const {
    project,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
  } = useGameStore();

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      [GameNodeType.START]: StartNode,
      [GameNodeType.STORY]: StoryNode,
      [GameNodeType.CHOICE]: ChoiceNode,
      [GameNodeType.CONDITION]: ConditionNode,
      [GameNodeType.INVENTORY]: InventoryNode,
      [GameNodeType.BATTLE]: BattleNode,
      [GameNodeType.LUCK_TEST]: LuckTestNode,
      [GameNodeType.END]: EndNode,
    }),
    []
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      selectNode(node);
    },
    [selectNode]
  );

  return (
    <div className="w-full h-full bg-gray-50">
      <ReactFlow
        nodes={project.nodes}
        edges={project.edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        selectionMode={SelectionMode.Partial}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-white border-2 border-gray-300 rounded-lg"
        />
        <Panel position="top-left" className="bg-white p-2 rounded-lg shadow-lg">
          <div className="text-sm font-semibold text-gray-700">
            {project.name}
          </div>
          <div className="text-xs text-gray-500">
            {project.nodes.length} nodes, {project.edges.length} edges
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
