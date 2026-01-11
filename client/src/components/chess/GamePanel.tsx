import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { MoveList } from './MoveList';
import { Flag, RotateCcw, MessageSquare, Share2, Download } from 'lucide-react';

interface Move {
  number: number;
  white: string;
  black?: string;
}

interface GamePanelProps {
  className?: string;
  moves?: Move[];
  whitePlayerInfo?: PlayerInfo;
  blackPlayerInfo?: PlayerInfo;
}

interface PlayerInfo {
  userId: string;
  username: string;
  ratingBefore: number;
  ratingAfter: number;
  isCurrentUser: boolean;
}

export const GamePanel: React.FC<GamePanelProps> = ({ className, moves = [], whitePlayerInfo, blackPlayerInfo }) => {
  const [activeTab, setActiveTab] = useState<'play' | 'chat'>('play');

  return (
    <div className={cn("flex flex-col h-full bg-card rounded-lg overflow-hidden", className)}>
      {/* Header Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('play')}
          className={cn(
            "flex-1 py-3 px-4 text-sm font-medium transition-colors",
            activeTab === 'play' 
              ? "text-foreground border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Play
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={cn(
            "flex-1 py-3 px-4 text-sm font-medium transition-colors",
            activeTab === 'chat' 
              ? "text-foreground border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Chat Box
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {activeTab === 'play' ? (
          <>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Moves</h3>
            <MoveList moves={moves} />
          </>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto text-sm text-muted-foreground">
              <p className="text-center py-8">No messages yet. Say hi! 👋</p>
            </div>
            <input
              type="text"
              placeholder="Type a message..."
              className="mt-auto px-3 py-2 bg-secondary rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <Share2 size={18} />
            </button>
            <button className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <Download size={18} />
            </button>
          </div>
          <div className="flex gap-2">
            <button className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <Flag size={18} />
            </button>
            <button className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
        <button className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-destructive transition-colors">
          Resign
        </button>
      </div>
    </div>
  );
};

export default GamePanel;
