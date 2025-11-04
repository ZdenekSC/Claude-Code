import { Handle, Position } from '@xyflow/react';
import type { InventoryNodeData } from '../types';

interface InventoryNodeProps {
  data: InventoryNodeData;
  selected: boolean;
}

export function InventoryNode({ data, selected }: InventoryNodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg shadow-lg bg-gradient-to-br from-orange-100 to-orange-200 border-2 border-orange-400 min-w-[200px] ${
        selected ? 'ring-4 ring-blue-400' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="text-xl">🎒</div>
        <div className="font-bold text-gray-800">{data.label}</div>
      </div>
      {data.description && (
        <div className="text-sm text-gray-600 mb-2">{data.description}</div>
      )}
      <div className="text-xs text-gray-700 font-semibold">
        {data.actions?.length || 0} action(s)
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}
