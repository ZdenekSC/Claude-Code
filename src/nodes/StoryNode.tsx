import { Handle, Position } from '@xyflow/react';
import type { StoryNodeData } from '../types';

interface StoryNodeProps {
  data: StoryNodeData;
  selected: boolean;
}

export function StoryNode({ data, selected }: StoryNodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg shadow-lg bg-white border-2 border-blue-300 min-w-[220px] max-w-[280px] ${
        selected ? 'ring-4 ring-blue-400' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="text-xl">📖</div>
        <div className="font-bold text-gray-800">{data.label}</div>
      </div>
      {data.content && (
        <div className="text-sm text-gray-600 line-clamp-3 mb-2">{data.content}</div>
      )}
      {data.inventoryActions && data.inventoryActions.length > 0 && (
        <div className="text-xs text-purple-600 font-semibold">
          {data.inventoryActions.length} inventory action(s)
        </div>
      )}
      {data.statModifications && data.statModifications.length > 0 && (
        <div className="text-xs text-orange-600 font-semibold">
          {data.statModifications.length} stat modification(s)
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}
