import { Handle, Position } from '@xyflow/react';
import type { ConditionNodeData } from '../types';

interface ConditionNodeProps {
  data: ConditionNodeData;
  selected: boolean;
}

export function ConditionNode({ data, selected }: ConditionNodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg shadow-lg bg-gradient-to-br from-purple-100 to-purple-200 border-2 border-purple-400 min-w-[200px] ${
        selected ? 'ring-4 ring-blue-400' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="text-xl">❓</div>
        <div className="font-bold text-gray-800">{data.label}</div>
      </div>
      {data.description && (
        <div className="text-sm text-gray-600 mb-2">{data.description}</div>
      )}
      <div className="text-xs text-gray-700 font-semibold">
        {data.conditions?.length || 0} condition(s)
      </div>
      <div className="flex gap-4 mt-2">
        <Handle
          type="source"
          position={Position.Bottom}
          id="true"
          className="w-3 h-3 bg-green-500"
          style={{ left: '30%' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="false"
          className="w-3 h-3 bg-red-500"
          style={{ left: '70%' }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1 text-gray-600">
        <span>True</span>
        <span>False</span>
      </div>
    </div>
  );
}
