import { Handle, Position } from '@xyflow/react';
import type { EndNodeData } from '../types';

interface EndNodeProps {
  data: EndNodeData;
  selected: boolean;
}

export function EndNode({ data, selected }: EndNodeProps) {
  const getColor = () => {
    switch (data.endingType) {
      case 'victory':
        return 'from-green-500 to-green-600';
      case 'defeat':
        return 'from-red-500 to-red-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getEmoji = () => {
    switch (data.endingType) {
      case 'victory':
        return '🏆';
      case 'defeat':
        return '💀';
      default:
        return '🏁';
    }
  };

  return (
    <div
      className={`px-6 py-4 rounded-lg shadow-lg bg-gradient-to-br ${getColor()} text-white min-w-[200px] ${
        selected ? 'ring-4 ring-blue-400' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="text-2xl">{getEmoji()}</div>
        <div className="font-bold text-lg">{data.label}</div>
      </div>
      <div className="text-sm opacity-90 capitalize">{data.endingType}</div>
      {data.message && (
        <div className="text-xs opacity-75 mt-2 line-clamp-2">{data.message}</div>
      )}
    </div>
  );
}
