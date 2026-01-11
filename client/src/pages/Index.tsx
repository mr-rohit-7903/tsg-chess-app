import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { PlayerInfo } from "@/components/chess/PlayerInfo";
import { GamePanel } from "@/components/chess/GamePanel";
import type { Move } from "@/components/chess/MoveList";

const boardColorMap = {
  "blue-marble.jpg": { light: "210 80% 86%", dark: "210 85% 40%", highlight: "50 100% 60%" },
  "blue.png":      { light: "210 80% 85%", dark: "215 85% 38%", highlight: "50 100% 60%" },
  "wood3.jpg":     { light: "38 42% 85%", dark: "32 56% 47%", highlight: "50 100% 60%" },
  "canvas2.jpg":   { light: "51 24% 85%", dark: "53 46% 38%", highlight: "50 100% 60%" },
  // Add more presets as desired matching your image names...
  "default":       { light: "210 30% 85%", dark: "210 70% 50%", highlight: "50 100% 60%" },
};

const Index = () => {
  const [theme, setTheme] = useState("cardinal");
  const [moves, setMoves] = useState<Move[]>([]);

  const boards = [
    "blue-marble.jpg",
    "blue.png",
    "blue2.jpg",
    "blue3.jpg",
    "brown.png",
    "canvas2.jpg",
    "green-plastic.png",
    "green.png",
    "grey.jpg",
    "horsey.jpg",
    "ic.png",
    "leather.jpg",
    "maple.jpg",
    "maple2.jpg",
    "marble.jpg",
    "metal.jpg",
    "ncf-board.png",
    "olive.jpg",
    "pink-pyramid.png",
    "purple-diag.png",
    "purple.png",
    "wood.jpg",
    "wood2.jpg",
    "wood3.jpg",
    "wood4.jpg",
  ];

  const [board, setBoard] = useState(boards[0]);

  // Set the board colors according to preset
  useEffect(() => {
    const colors = boardColorMap[board] || boardColorMap["default"];
    const root = document.documentElement;
    root.style.setProperty('--chess-light', colors.light);
    root.style.setProperty('--chess-dark', colors.dark);
    root.style.setProperty('--chess-highlight', colors.highlight);
  }, [board]);

  const themes = [
    "alpha",
    "anarcandy",
    "caliente",
    "california",
    "cardinal",
    "cburnett",
    "celtic",
    "chess7",
    "chessnut",
    "companion",
    "cooke",
    "disguised",
    "dubrovny",
    "fantasy",
    "firi",
    "fresca",
    "gioco",
    "governor",
    "horsey",
    "icpieces",
    "kiwen-suwi",
    "kosal",
    "leipzig",
    "letter",
    "maestro",
    "merida",
    "monarchy",
    "mono",
    "mpchess",
    "pirouetti",
    "pixel",
    "reillycraig",
    "rhosgfx",
    "riohacha",
    "shapes",
    "spatial",
    "staunty",
    "tatiana",
    "xkcd",
  ];

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row min-h-screen">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-auto">
          <div className="w-full max-w-[90vw] sm:max-w-[600px] flex flex-col gap-2">

            <div className="flex">
              {/* Theme Selector Temp*/}
              <div className="flex justify-center">
                <select
                  className="border p-2 rounded bg-background text-foreground w-full md:w-auto"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                >
                  {themes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Board Selector (dropdown) Temp*/}
              <div className="flex justify-center">
                <select
                  className="border p-2 rounded bg-background text-foreground mt-2 w-full md:w-auto"
                  value={board}
                  onChange={(e) => setBoard(e.target.value)}
                >
                  {boards.map((b) => (
                    <option key={b} value={b}>{b.replace(/\.(jpg|png|webp)$/i, "")}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Demo PlayerInfo (Top) */}
            <PlayerInfo username="The duke (Demo)" rating={420} isTop timeLeft="10:00" isActive={false} />

            <ChessBoard
              theme={theme}
              boardImage={board}
              onMove={({ san, color }) => {
                setMoves((prev) => {
                  if (color === "w") {
                    const moveNumber = Math.floor(prev.length / 2) + 1;
                    return [...prev, { number: moveNumber, white: san }];
                  }
                  // black move updates last ply
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && !last.black) {
                    updated[updated.length - 1] = { ...last, black: san };
                  } else {
                    // If black moves first or there's no previous white move,
                    // create a new entry for black's move.
                    const moveNumber = Math.floor(prev.length / 2) + 1;
                    updated.push({ number: moveNumber, black: san });
                  }
                  return updated;
                });
              }}
            />

            {/* Demo PlayerInfo (Bottom) */}
            <PlayerInfo username="Noobmaster69 (Demo)" rating={679} isTop={false} timeLeft="10:00" isActive />
          </div>
        </div>

        <div className="w-full md:w-80 md:border-l border-t md:border-t-0 p-4">
          <GamePanel className="h-full" moves={moves} />
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
