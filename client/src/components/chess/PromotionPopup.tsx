import React from "react";
import { ChessPiece, PieceType } from "./ChessPiece";
import { cn } from "@/lib/utils";

/**
 * Promotion piece options - the lowercase letter codes used by chess.js
 */
export type PromotionPiece = "q" | "r" | "b" | "n";

interface PromotionPopupProps {
  /** The color of the promoting player: 'w' for white, 'b' for black */
  color: "w" | "b";
  /** Current piece theme (e.g., "california", "cardinal") */
  theme?: string;
  /** Callback when user selects a piece */
  onSelect: (piece: PromotionPiece) => void;
  /** Callback when user cancels (clicks outside or presses Escape) */
  onCancel?: () => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * PromotionPopup - A modal/popup for selecting the promotion piece
 * 
 * Displays four piece options (Queen, Rook, Bishop, Knight) in the
 * appropriate color. Uses the existing ChessPiece component to ensure
 * consistent piece rendering with the current theme.
 * 
 * Architecture notes:
 * - This component is presentation-only; it doesn't mutate game state
 * - Parent component (ChessBoard) handles the state management
 * - Selection is communicated via the onSelect callback
 */
export const PromotionPopup: React.FC<PromotionPopupProps> = ({
  color,
  theme = "california",
  onSelect,
  onCancel,
  className,
}) => {
  // Define the promotion options with their display order
  const promotionOptions: { piece: PromotionPiece; label: string }[] = [
    { piece: "q", label: "Queen" },
    { piece: "r", label: "Rook" },
    { piece: "b", label: "Bishop" },
    { piece: "n", label: "Knight" },
  ];

  // Convert promotion piece code to PieceType for ChessPiece component
  // White pieces are uppercase, black pieces are lowercase
  const getPieceType = (piece: PromotionPiece): PieceType => {
    return (color === "w" ? piece.toUpperCase() : piece.toLowerCase()) as PieceType;
  };

  // Handle keyboard events for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && onCancel) {
      onCancel();
    }
  };

  // Handle backdrop click to cancel
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onCancel) {
      onCancel();
    }
  };

  return (
    // Backdrop overlay
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-black/60 backdrop-blur-sm",
        className
      )}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Select promotion piece"
    >
      {/* Popup container */}
      <div
        className={cn(
          "bg-card border-2 border-border rounded-xl shadow-2xl",
          "p-4 animate-in fade-in zoom-in-95 duration-200"
        )}
      >
        {/* Header */}
        <h3 className="text-lg font-semibold text-center mb-4 text-foreground">
          Choose Promotion Piece
        </h3>

        {/* Piece selection grid */}
        <div className="flex gap-2">
          {promotionOptions.map(({ piece, label }) => (
            <button
              key={piece}
              onClick={() => onSelect(piece)}
              className={cn(
                "w-16 h-16 sm:w-20 sm:h-20 rounded-lg",
                "bg-secondary/50 hover:bg-primary/20",
                "border-2 border-transparent hover:border-primary",
                "transition-all duration-150",
                "flex items-center justify-center",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              )}
              aria-label={`Promote to ${label}`}
              title={label}
            >
              <ChessPiece
                piece={getPieceType(piece)}
                size={48}
                theme={theme}
              />
            </button>
          ))}
        </div>

        {/* Cancel hint */}
        {onCancel && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Press <kbd className="px-1 py-0.5 bg-secondary rounded text-xs">Esc</kbd> or click outside to cancel
          </p>
        )}
      </div>
    </div>
  );
};

export default PromotionPopup;
