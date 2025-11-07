interface DiceDisplayProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DiceDisplay({ value, size = 'md', className = '' }: DiceDisplayProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-xl',
  };

  // Dice dot patterns
  const renderDots = () => {
    const dotClass = size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-2.5 h-2.5';

    switch (value) {
      case 1:
        return (
          <div className="flex items-center justify-center h-full">
            <div className={`${dotClass} bg-white rounded-full`} />
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col justify-between h-full p-1">
            <div className="flex justify-end">
              <div className={`${dotClass} bg-white rounded-full`} />
            </div>
            <div className="flex justify-start">
              <div className={`${dotClass} bg-white rounded-full`} />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col justify-between h-full p-1">
            <div className="flex justify-end">
              <div className={`${dotClass} bg-white rounded-full`} />
            </div>
            <div className="flex justify-center">
              <div className={`${dotClass} bg-white rounded-full`} />
            </div>
            <div className="flex justify-start">
              <div className={`${dotClass} bg-white rounded-full`} />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="flex flex-col justify-between h-full p-1">
            <div className="flex justify-between">
              <div className={`${dotClass} bg-white rounded-full`} />
              <div className={`${dotClass} bg-white rounded-full`} />
            </div>
            <div className="flex justify-between">
              <div className={`${dotClass} bg-white rounded-full`} />
              <div className={`${dotClass} bg-white rounded-full`} />
            </div>
          </div>
        );
      case 5:
        return (
          <div className="flex flex-col justify-between h-full p-1">
            <div className="flex justify-between">
              <div className={`${dotClass} bg-white rounded-full`} />
              <div className={`${dotClass} bg-white rounded-full`} />
            </div>
            <div className="flex justify-center">
              <div className={`${dotClass} bg-white rounded-full`} />
            </div>
            <div className="flex justify-between">
              <div className={`${dotClass} bg-white rounded-full`} />
              <div className={`${dotClass} bg-white rounded-full`} />
            </div>
          </div>
        );
      case 6:
        return (
          <div className="flex flex-col justify-between h-full p-1">
            <div className="flex justify-between">
              <div className={`${dotClass} bg-white rounded-full`} />
              <div className={`${dotClass} bg-white rounded-full`} />
            </div>
            <div className="flex justify-between">
              <div className={`${dotClass} bg-white rounded-full`} />
              <div className={`${dotClass} bg-white rounded-full`} />
            </div>
            <div className="flex justify-between">
              <div className={`${dotClass} bg-white rounded-full`} />
              <div className={`${dotClass} bg-white rounded-full`} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`${sizeClasses[size]} bg-gradient-to-br from-red-600 to-red-700 rounded-lg shadow-lg border-2 border-red-800 ${className}`}
    >
      {renderDots()}
    </div>
  );
}

interface DicePairDisplayProps {
  dice: [number, number];
  size?: 'sm' | 'md' | 'lg';
  showSum?: boolean;
}

export function DicePairDisplay({ dice, size = 'md', showSum = false }: DicePairDisplayProps) {
  return (
    <div className="flex items-center gap-2">
      <DiceDisplay value={dice[0]} size={size} />
      <DiceDisplay value={dice[1]} size={size} />
      {showSum && (
        <div className={`font-bold ${size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-xl' : 'text-base'}`}>
          = {dice[0] + dice[1]}
        </div>
      )}
    </div>
  );
}
