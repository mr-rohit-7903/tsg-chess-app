import React from 'react';
import { cn } from '@/lib/utils';

export type Move = {
  number: number;
  white: string;
  black?: string;
};

interface MoveListProps {
  moves: Move[];
}

export const MoveList: React.FC<MoveListProps> = ({ moves = [] }) => {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 text-sm">
        {moves.map((move, index) => (
          <React.Fragment key={move.number}>
            <span className="text-muted-foreground pr-2">{move.number}.</span>
            <span className={cn(
              "px-2 py-1 rounded cursor-pointer transition-colors hover:bg-secondary",
              index === moves.length - 1 && !move.black && "bg-primary/20"
            )}>
              {move.white}
            </span>
            <span className={cn(
              "px-2 py-1 rounded cursor-pointer transition-colors hover:bg-secondary",
              index === moves.length - 1 && move.black && "bg-primary/20"
            )}>
              {move.black || ''}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default MoveList;
