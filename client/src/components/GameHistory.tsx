import React, { useState, useCallback } from "react";
import { Clock, Zap, Bot, Trophy, ChevronLeft, ChevronRight, Download } from "lucide-react";

import * as api from '@/lib/api';

type Mode = "bullet" | "blitz" | "rapid" | "bot";

const GAMES_PER_PAGE = 10;

const iconForMode = (timeControl: string) => {
  if (timeControl.includes("bullet")) return <Zap size={18} />;
  if (timeControl.includes("blitz")) return <Clock size={18} />;
  if (timeControl.includes("rapid")) return <Clock size={18} />;
  // Assuming "bot" might be part of the timeControl string or a specific timeControl value
  if (timeControl.includes("bot")) return <Bot size={18} />;
  return <Clock size={18} />; // Default icon
};

const formatRatingChange = (change: number) => {
  if (change > 0) return `+${change}`;
  if (change < 0) return `${change}`;
  return "0";
};

export const GameHistory: React.FC<{ games: api.GameHistoryEntry[] }> = ({ games }) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(games.length / GAMES_PER_PAGE);
  const startIndex = (currentPage - 1) * GAMES_PER_PAGE;
  const endIndex = startIndex + GAMES_PER_PAGE;
  const currentGames = games.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Download PGN file for a game
  const handleDownloadPGN = useCallback((game: api.GameHistoryEntry) => {
    if (!game.pgn) {
      alert('PGN not available for this game');
      return;
    }

    const blob = new Blob([game.pgn], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `game-${game.gameId}-${new Date(game.playedAt).toISOString().split('T')[0]}.pgn`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="relative rounded-2xl p-6 mb-6 overflow-hidden bg-gradient-to-br from-primary/6 via-primary/3 to-background border border-border shadow-xl">

      {/* subtle glow */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_60%)]"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-foreground">
            Game History <span className="text-muted-foreground text-sm">({games.length} games)</span>
          </h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Trophy size={18} />
            <span>Recent</span>
          </div>
        </div>

        {games.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No games played yet. Start playing to see your history!
          </div>
        ) : (
          <>
            <div className="divide-y divide-border rounded-lg overflow-hidden">
              {currentGames.map((g, idx) => {
                const isWon = g.result === "won";
                const isLost = g.result === "lost";
                const isDraw = g.result === "draw";
                const ratingChange = g.ratingChange ?? 0;

                return (
                  <div
                    key={g.gameId || idx}
                    className="grid grid-cols-6 items-center gap-4 p-4 bg-card hover:bg-secondary/50 transition-colors"
                  >
                    {/* Time Control */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-secondary/50">
                        {iconForMode(g.timeControl)}
                      </span>
                      <span className="capitalize">{g.timeControl}</span>
                    </div>

                    {/* Opponent */}
                    <div className="col-span-2">
                      <div className="flex flex-col text-center">
                        <span className="text-sm text-muted-foreground">vs</span>
                        <span className="font-medium text-foreground">{g.opponentUsername || "Unknown"}</span>
                      </div>
                    </div>

                    {/* Rating Change */}
                    <div className="flex flex-col items-center">
                      <span
                        className={`text-lg font-bold ${ratingChange > 0 ? "text-green-500" : ratingChange < 0 ? "text-red-500" : "text-muted-foreground"
                          }`}
                      >
                        {formatRatingChange(ratingChange)}
                      </span>
                      <span className="text-xs text-muted-foreground">Rating</span>
                    </div>

                    {/* Result */}
                    <div className="flex flex-col items-center">
                      <span
                        className={`text-sm font-semibold px-2 py-1 rounded ${isWon ? "text-green-400 bg-green-400/10" : isDraw ? "text-yellow-400 bg-yellow-400/10" : "text-red-400 bg-red-400/10"
                          }`}
                      >
                        {g.result.charAt(0).toUpperCase() + g.result.slice(1)}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">{new Date(g.playedAt).toLocaleDateString()}</span>
                    </div>

                    {/* Download Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleDownloadPGN(g)}
                        disabled={!g.pgn}
                        className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={g.pgn ? "Download PGN" : "PGN not available"}
                      >
                        <Download size={16} />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === currentPage
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary text-muted-foreground"
                        }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}

            <div className="text-center text-sm text-muted-foreground mt-2">
              Showing {startIndex + 1}-{Math.min(endIndex, games.length)} of {games.length} games
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GameHistory;
