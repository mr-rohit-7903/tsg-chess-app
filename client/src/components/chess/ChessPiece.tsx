import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type PieceType =
  | "K" | "Q" | "R" | "B" | "N" | "P"
  | "k" | "q" | "r" | "b" | "n" | "p";

interface ChessPieceProps {
  piece: PieceType;
  // maximum pixel size for the piece; the piece will scale responsively up to this
  size?: number;
  className?: string;
  theme?: string;
}

// fallback unicode glyphs (used only if all images fail)
const pieceGlyphs: Record<PieceType, string> = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};

const defaultTheme = "california";

export const ChessPiece: React.FC<ChessPieceProps> = ({
  piece,
  size = 56,
  className,
  theme = defaultTheme,
}) => {
  // build the filename e.g. "wK.svg" or "bP.svg"
  const colorPrefix = piece === piece.toUpperCase() ? "w" : "b";
  const filename = `${colorPrefix}${piece.toUpperCase()}.svg`;

  // candidate source order - tries common variants
  const candidates = useMemo(() => [
    `/piece/${theme}/${filename}`,   // public/piece/<theme>/...
    `/pieces/${theme}/${filename}`,  // alternative folder name
    `/piece/${filename}`,            // public/piece/<file>
    `/pieces/${filename}`,           // public/pieces/<file>
    `/piece/${theme.toLowerCase()}/${filename}`, // lowercased theme (some folders)
    `/pieces/${theme.toLowerCase()}/${filename}`,
  ], [filename, theme]);

  // current src index (advance on error)
  const [srcIndex, setSrcIndex] = useState<number>(0);
  const currentSrc = candidates[srcIndex];

  // whether image failed completely
  const [failedAll, setFailedAll] = useState(false);

  // advance to next candidate on image error
  const handleImgError = () => {
    // try next candidate
    if (srcIndex < candidates.length - 1) {
      setSrcIndex(srcIndex + 1);
      return;
    }
    // all candidates tried -> fallback to glyph
    setFailedAll(true);
    // log helpful message

    console.warn("ChessPiece: all image candidates failed for", filename, candidates);
  };

  // success handler (optional logging)
  const handleImgLoad = () => {
    // no-op, but could be used for analytics/debug
  };

  // determine piece color for glyph styling
  const isWhite = piece === piece.toUpperCase();

  return (
    <span
      className={cn("flex items-center justify-center w-full h-full", className)}
      style={{ lineHeight: 1 }}
    >
      {failedAll ? (
        // fallback: a centered glyph (guaranteed visible)
        <span
          style={{
            fontSize: `${Math.round(Math.min(size, 0.72 *  (size || 56)))}px`,
            display: "block",
            color: isWhite ? "#FFFFFF" : "#1a1a2e",
            textShadow: "0 1px 1px rgba(0,0,0,0.25)",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {pieceGlyphs[piece]}
        </span>
      ) : (
        <img
          src={currentSrc}
          alt={piece}
          draggable={false}
          onError={handleImgError}
          onLoad={handleImgLoad}
          style={{
            // responsive sizing:
            width: "80%",        // uses a percentage of the square for responsiveness
            maxWidth: `${size}px`, // but never exceed `size` px
            height: "auto",
            display: "block",
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
      )}
    </span>
  );
};

export default ChessPiece;
