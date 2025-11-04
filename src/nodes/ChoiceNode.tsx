import { Handle, Position } from '@xyflow/react';
import type { ChoiceNodeData } from '../types';

interface ChoiceNodeProps {
  data: ChoiceNodeData;
  selected: boolean;
}

export function ChoiceNode({ data, selected }: ChoiceNodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg shadow-lg bg-gradient-to-br from-yellow-100 to-yellow-200 border-2 border-yellow-400 min-w-[220px] max-w-[280px] ${
        selected ? 'ring-4 ring-blue-400' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="text-xl">🔀</div>
        <div className="font-bold text-gray-800">{data.label}</div>
      </div>
      {data.description && (
        <div className="text-sm text-gray-600 mb-2">{data.description}</div>
      )}
      <div className="text-xs text-gray-700 font-semibold">
        {data.choices?.length || 0} choice(s)
      </div>
      {data.choices?.map((choice, index) => (
        <div key={choice.id} className="text-xs text-gray-600 mt-1">
          {index + 1}. {choice.text.substring(0, 30)}
          {choice.text.length > 30 ? '...' : ''}
        </div>
      ))}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}
