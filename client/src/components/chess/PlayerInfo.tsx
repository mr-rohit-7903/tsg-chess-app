import React from 'react';
import { cn } from '@/lib/utils';

interface PlayerInfoProps {
  username: string;
  rating: number;
  avatarUrl?: string;
  isTop?: boolean;
  timeLeft?: string;
  isActive?: boolean;
  ratingType?: string;
}

export const PlayerInfo: React.FC<PlayerInfoProps> = ({
  username,
  rating,
  avatarUrl,
  isTop = false,
  timeLeft = "10:00",
  isActive = false,
  ratingType,
}) => {
  return (
    <div className={cn(
      "flex items-center justify-between py-2 px-3 rounded-lg transition-all duration-200",
      isActive && "bg-card"
    )}>
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg">👤</span>
            )}
          </div>
          {isActive && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border-2 border-background" />
          )}
        </div>

        {/* Name & Rating */}
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{username}</span>
          <span className="text-sm text-muted-foreground">
            {ratingType ? `${ratingType}: ` : ''}({rating})
          </span>
        </div>

        {/* Material indicator */}
        <div className="flex gap-0.5 text-xs text-muted-foreground">
          <span>♟♟</span>
        </div>
      </div>

      {/* Timer */}
      <div className={cn(
        "px-4 py-2 rounded-md font-mono text-lg font-semibold transition-colors",
        isActive ? "bg-secondary text-foreground" : "bg-muted/50 text-muted-foreground"
      )}>
        {timeLeft}
      </div>
    </div>
  );
};

export default PlayerInfo;
