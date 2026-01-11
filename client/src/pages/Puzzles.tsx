import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { Target, Zap, Trophy, TrendingUp } from 'lucide-react';

const puzzleStats = [
  { icon: Target, label: 'Rating', value: '1523' },
  { icon: Zap, label: 'Streak', value: '5' },
  { icon: Trophy, label: 'Solved', value: '142' },
  { icon: TrendingUp, label: 'Best', value: '1689' },
];

const Puzzles = () => {
  return (
    <MainLayout>
      <div className="flex h-screen">
        {/* Puzzle Area */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-[600px] flex flex-col gap-4">
            {/* Puzzle Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Daily Puzzle</h1>
                <p className="text-muted-foreground">White to move and win</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-outline">Hint</button>
                <button className="btn-primary">Next</button>
              </div>
            </div>

            {/* Chess Board */}
            <ChessBoard />
          </div>
        </div>

        {/* Stats Panel */}
        <div className="w-80 border-l border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Puzzle Stats</h2>
          
          <div className="grid grid-cols-2 gap-4">
            {puzzleStats.map((stat) => (
              <div key={stat.label} className="bg-card rounded-lg p-4 flex flex-col items-center">
                <stat.icon className="w-6 h-6 text-primary mb-2" />
                <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="font-medium mb-3">Puzzle Categories</h3>
            <div className="space-y-2">
              {['Checkmate Patterns', 'Tactics', 'Endgames', 'Opening Traps'].map((cat) => (
                <button 
                  key={cat}
                  className="w-full text-left px-4 py-3 rounded-lg bg-secondary hover:bg-muted transition-colors text-sm"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Puzzles;
