import React, { useMemo, useState, useEffect } from "react";
import { Chess, Piece } from "chess.js";
import { ChessPiece, PieceType as PieceSymbolType } from "./ChessPiece";
import { cn } from "@/lib/utils";

type PieceType = PieceSymbolType | null;

interface ChessBoardProps {
  flipped?: boolean;
  theme?: string;
  boardImage?: string;
  fen?: string; // External FEN to control the board position
  onMove?: (move: { san: string; color: "w" | "b" }) => void; // For backward compatibility
  onMoveAttempt?: (move: { from: string; to: string; promotion?: string }) => void; // Callback when user attempts a move
  disabled?: boolean; // Disable move input
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

export const ChessBoard: React.FC<ChessBoardProps> = ({
  flipped = false,
  theme = "california",
  boardImage = "/board/wood.jpg", //default board image
  fen: externalFen,
  onMove,
  onMoveAttempt,
  disabled = false,
}) => {
  const chess = useMemo(() => new Chess(), []);

  // Use external FEN if provided, otherwise use internal state
  const [internalFen, setInternalFen] = useState<string>(chess.fen());
  const currentFen = externalFen ?? internalFen;
  
  // Sync chess instance with current FEN
  useEffect(() => {
    if (!currentFen) return;
    try {
      chess.load(currentFen);
    } catch (e) {
      console.error("Failed to load FEN:", currentFen, e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFen]);

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);

  const getBoardFromChess = (): PieceType[][] => {
    const raw: (Piece | null)[][] = chess.board();
    return raw.map((row) =>
      row.map((cell) => {
        if (!cell) return null;
        const letter = cell.type;
        return cell.color === "w"
          ? (letter.toUpperCase() as PieceSymbolType)
          : (letter.toLowerCase() as PieceSymbolType);
      })
    );
  };

  const board = getBoardFromChess();

  const displayBoard = flipped
    ? [...board].reverse().map((r) => [...r].reverse())
    : board;
  const displayFiles = flipped ? [...FILES].reverse() : FILES;
  const displayRanks = flipped ? [...RANKS].reverse() : RANKS;

  const squareIdForDisplay = (row: number, col: number) =>
    `${displayFiles[col]}${displayRanks[row]}`;

  const selectSquare = (squareId: string) => {
    if (!chess) return;
    const moves = (chess.moves({ square: squareId as import("chess.js").Square, verbose: true }) || []) as import("chess.js").Move[];
    if (moves && moves.length > 0) {
      setSelectedSquare(squareId);
      setLegalMoves(moves.map((m) => m.to));
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  const tryMoveTo = (targetSquare: string) => {
    if (!chess || !selectedSquare || disabled) return;
    if (!legalMoves.includes(targetSquare)) return;

    type ChessMoveInput = { from: string; to: string; promotion?: string };
    const moveObj: ChessMoveInput = { from: selectedSquare, to: targetSquare };
    
    // If onMoveAttempt is provided, use it (controlled mode)
    if (onMoveAttempt) {
      onMoveAttempt(moveObj);
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }
    
    // Otherwise, make move locally (uncontrolled mode for backward compatibility)
    const result = chess.move(moveObj);
    if (result) {
      setInternalFen(chess.fen());
      onMove?.({ san: result.san, color: result.color });
    }
    setSelectedSquare(null);
    setLegalMoves([]);
  };

  const handleSquareClick = (row: number, col: number) => {
    if (disabled) return;
    
    const squareId = squareIdForDisplay(row, col);
    const squarePiece = displayBoard[row][col];

    if (!chess) return;

    // Only allow selecting/moving pieces for the side whose turn it is
    if (!selectedSquare && squarePiece) {
      const color = squarePiece === squarePiece.toUpperCase() ? "w" : "b";
      if (color !== chess.turn()) return;
    }

    if (selectedSquare && legalMoves.includes(squareId)) {
      tryMoveTo(squareId);
      return;
    }

    if (selectedSquare === squareId) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    selectSquare(squareId);
  };

  const handleDragStart = (squareId: string, e: React.DragEvent) => {
    if (!chess) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", squareId);
    selectSquare(squareId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    // allow drop
    e.preventDefault();
  };

  const handleDrop = (squareId: string, e: React.DragEvent) => {
    e.preventDefault();
    const from = e.dataTransfer.getData("text/plain") || selectedSquare;
    if (!from) return;
    if (from !== selectedSquare) {
      // ensure legal moves for dragged piece
      selectSquare(from);
    }
    tryMoveTo(squareId);
  };

  const isLightSquare = (row: number, col: number) => (row + col) % 2 === 0;

  // normalize boardImage -> /board/<file> (files live in public/board)
  const normalized = boardImage.replace(/^\/+/, ""); // remove leading slashes
  const boardSrc = normalized.includes("board/") ? `/${normalized}` : `/board/${normalized}`;

  return (
    <div className="relative w-full max-w-[90vw] sm:max-w-[600px] mx-auto aspect-square">
      {/* Board image (z-0) */}
      <img
        src={boardSrc}
        alt="board"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
        draggable={false}
        onError={(e) => {
          // small debug aid if the image fails to load

          console.warn("Board image failed to load:", boardSrc);
        }}
      />

      {/* optional tint overlay (transparent) */}
      <div className="absolute inset-0 z-10 pointer-events-none" />

      {/* interactive grid & pieces (z-20) */}
      <div className="absolute inset-0 z-20 rounded-lg overflow-hidden" style={{ boxShadow: "var(--shadow-lg)" }}>
        <div className="grid grid-cols-8 h-full w-full" style={{ gridTemplateRows: "repeat(8, 1fr)" }}>
          {displayBoard.map((row, rowIndex) =>
            row.map((piece, colIndex) => {
              const squareId = squareIdForDisplay(rowIndex, colIndex);
              const isSelected = selectedSquare === squareId;
              const isLight = isLightSquare(rowIndex, colIndex);
              const isLegal = legalMoves.includes(squareId);

              const squareClass = cn(
                "relative flex items-center justify-center cursor-pointer transition-all duration-150 select-none",
                isSelected && "ring-2 ring-inset ring-chess-highlight"
              );

              return (
                <div
                  key={squareId}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSquareClick(rowIndex, colIndex);
                  }}
                  onClick={() => handleSquareClick(rowIndex, colIndex)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(squareId, e)}
                  className={squareClass}
                >
                  {rowIndex === 7 && (
                    <span
                      className={cn(
                        "absolute bottom-0.5 right-1 text-xs font-medium select-none",
                        isLight ? "text-chess-dark" : "text-chess-light"
                      )}
                    >
                      {displayFiles[colIndex]}
                    </span>
                  )}

                  {colIndex === 0 && (
                    <span
                      className={cn(
                        "absolute top-0.5 left-1 text-xs font-medium select-none",
                        isLight ? "text-chess-dark" : "text-chess-light"
                      )}
                    >
                      {displayRanks[rowIndex]}
                    </span>
                  )}

                  {isLegal && (
                    <span className="absolute w-3 h-3 rounded-full bg-chess-highlight/90 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30" />
                  )}

                  {piece && (
                    <div
                      className="z-40"
                      draggable={!disabled && (() => {
                        if (!piece) return false;
                        const color = piece === piece.toUpperCase() ? "w" : "b";
                        return chess.turn() === color;
                      })()}
                      onDragStart={(e) => {
                        const color = piece === piece.toUpperCase() ? "w" : "b";
                        if (chess.turn() !== color) {
                          e.preventDefault();
                          return;
                        }
                        handleDragStart(squareId, e);
                      }}
                    >
                      <ChessPiece piece={piece} size={56} theme={theme} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* debug border (shows container even if image 404) */}
      <div className="pointer-events-none absolute inset-0 border border-transparent" />
    </div>
  );
};

export default ChessBoard;
