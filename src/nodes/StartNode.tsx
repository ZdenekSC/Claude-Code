import { Handle, Position } from '@xyflow/react';
import type { StartNodeData } from '../types';

interface StartNodeProps {
  data: StartNodeData;
  selected: boolean;
}

export function StartNode({ data, selected }: StartNodeProps) {
  return (
    <div
      className={`px-6 py-4 rounded-lg shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white min-w-[200px] ${
        selected ? 'ring-4 ring-blue-400' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="text-2xl">🚀</div>
        <div className="font-bold text-lg">{data.label}</div>
      </div>
      <div className="text-sm opacity-90">{data.title}</div>
      <div className="text-xs opacity-75 mt-2">
        HP: {data.initialStats.health}/{data.initialStats.maxHealth} | Gold:{' '}
        {data.initialStats.gold}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}
