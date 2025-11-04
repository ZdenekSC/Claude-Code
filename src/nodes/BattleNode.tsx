import { Handle, Position } from '@xyflow/react';
import type { BattleNodeData } from '../types';

interface BattleNodeProps {
  data: BattleNodeData;
  selected: boolean;
}

export function BattleNode({ data, selected }: BattleNodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg shadow-lg bg-gradient-to-br from-red-100 to-red-200 border-2 border-red-400 min-w-[220px] ${
        selected ? 'ring-4 ring-blue-400' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="text-xl">⚔️</div>
        <div className="font-bold text-gray-800">{data.label}</div>
      </div>
      {data.description && (
        <div className="text-sm text-gray-600 mb-2">{data.description}</div>
      )}
      {data.battle && (
        <div className="text-xs text-gray-700">
          <div className="font-semibold">Enemy: {data.battle.enemyName}</div>
          <div>HP: {data.battle.enemyHealth} | ATK: {data.battle.enemyAttack}</div>
        </div>
      )}
      <div className="flex gap-4 mt-2">
        <Handle
          type="source"
          position={Position.Bottom}
          id="victory"
          className="w-3 h-3 bg-green-500"
          style={{ left: '30%' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="defeat"
          className="w-3 h-3 bg-red-500"
          style={{ left: '70%' }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1 text-gray-600">
        <span>Victory</span>
        <span>Defeat</span>
      </div>
    </div>
  );
}
