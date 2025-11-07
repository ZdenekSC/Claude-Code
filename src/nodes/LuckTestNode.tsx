import { Handle, Position } from '@xyflow/react';
import type { LuckTestNodeData } from '../types';

interface LuckTestNodeProps {
  data: LuckTestNodeData;
  selected: boolean;
}

export function LuckTestNode({ data, selected }: LuckTestNodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg shadow-lg bg-gradient-to-br from-green-100 to-emerald-200 border-2 border-green-400 min-w-[220px] max-w-[280px] ${
        selected ? 'ring-4 ring-blue-400' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="text-xl">🍀</div>
        <div className="font-bold text-gray-800">{data.label}</div>
      </div>
      {data.description && (
        <div className="text-sm text-gray-600 mb-2 line-clamp-2">{data.description}</div>
      )}
      <div className="text-xs text-gray-700 font-semibold">Test Your Luck!</div>
      <div className="flex gap-4 mt-2">
        <Handle
          type="source"
          position={Position.Bottom}
          id="lucky"
          className="w-3 h-3 bg-green-500"
          style={{ left: '30%' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="unlucky"
          className="w-3 h-3 bg-orange-500"
          style={{ left: '70%' }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1 text-gray-600">
        <span>Lucky</span>
        <span>Unlucky</span>
      </div>
    </div>
  );
}
