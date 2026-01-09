import { useEffect, useRef } from "react";
import {
  Board,
  PlacementMap,
  WindowSegment,
  coordKey,
  getRoomId
} from "../engine";

const objectIcons: Record<string, string> = {
  Poltrona: "🪑",
  Tapete: "🧶",
  Cama: "🛏️",
  Mesa: "🛋️",
  TV: "📺",
  Planta: "🪴",
  Estante: "📚",
  Caixa: "📦"
};

const suspectColors = ["#f97316", "#6366f1", "#14b8a6", "#f43f5e", "#84cc16", "#06b6d4"];

const drawWindows = (
  ctx: CanvasRenderingContext2D,
  board: Board,
  size: number,
  padding: number
) => {
  ctx.strokeStyle = "#0ea5e9";
  ctx.lineWidth = 4;
  board.windows.forEach((window) => {
    const { a, b, dir } = window;
    if (b) {
      const midX = (a.x + b.x + 1) / 2;
      const midY = (a.y + b.y + 1) / 2;
      if (a.x !== b.x) {
        const x = padding + midX * size;
        const y1 = padding + a.y * size + size * 0.25;
        const y2 = padding + a.y * size + size * 0.75;
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.stroke();
      } else if (a.y !== b.y) {
        const y = padding + midY * size;
        const x1 = padding + a.x * size + size * 0.25;
        const x2 = padding + a.x * size + size * 0.75;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
      }
      return;
    }
    if (!dir) {
      return;
    }
    const x = padding + a.x * size;
    const y = padding + a.y * size;
    ctx.beginPath();
    if (dir === "N") {
      ctx.moveTo(x + size * 0.2, y);
      ctx.lineTo(x + size * 0.8, y);
    } else if (dir === "S") {
      ctx.moveTo(x + size * 0.2, y + size);
      ctx.lineTo(x + size * 0.8, y + size);
    } else if (dir === "W") {
      ctx.moveTo(x, y + size * 0.2);
      ctx.lineTo(x, y + size * 0.8);
    } else if (dir === "E") {
      ctx.moveTo(x + size, y + size * 0.2);
      ctx.lineTo(x + size, y + size * 0.8);
    }
    ctx.stroke();
  });
};

const drawWalls = (
  ctx: CanvasRenderingContext2D,
  board: Board,
  size: number,
  padding: number
) => {
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 5;

  const w = board.width;
  const h = board.height;

  ctx.strokeRect(padding, padding, w * size, h * size);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const current = getRoomId(board, { x, y });
      if (x < w - 1) {
        const right = getRoomId(board, { x: x + 1, y });
        if (current !== right) {
          const xPos = padding + (x + 1) * size;
          const yStart = padding + y * size;
          ctx.beginPath();
          ctx.moveTo(xPos, yStart);
          ctx.lineTo(xPos, yStart + size);
          ctx.stroke();
        }
      }
      if (y < h - 1) {
        const down = getRoomId(board, { x, y: y + 1 });
        if (current !== down) {
          const yPos = padding + (y + 1) * size;
          const xStart = padding + x * size;
          ctx.beginPath();
          ctx.moveTo(xStart, yPos);
          ctx.lineTo(xStart + size, yPos);
          ctx.stroke();
        }
      }
    }
  }
};

const drawGrid = (
  ctx: CanvasRenderingContext2D,
  board: Board,
  size: number,
  padding: number
) => {
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  for (let x = 0; x <= board.width; x += 1) {
    ctx.beginPath();
    ctx.moveTo(padding + x * size, padding);
    ctx.lineTo(padding + x * size, padding + board.height * size);
    ctx.stroke();
  }
  for (let y = 0; y <= board.height; y += 1) {
    ctx.beginPath();
    ctx.moveTo(padding, padding + y * size);
    ctx.lineTo(padding + board.width * size, padding + y * size);
    ctx.stroke();
  }
};

export type CanvasBoardProps = {
  board: Board;
  placements: PlacementMap;
  onCellClick?: (x: number, y: number) => void;
  highlight?: string | null;
};

export const CanvasBoard = ({
  board,
  placements,
  onCellClick,
  highlight
}: CanvasBoardProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const size = 70;
  const padding = 20;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.width = board.width * size + padding * 2;
    canvas.height = board.height * size + padding * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid(ctx, board, size, padding);
    drawWalls(ctx, board, size, padding);
    drawWindows(ctx, board, size, padding);

    for (let y = 0; y < board.height; y += 1) {
      for (let x = 0; x < board.width; x += 1) {
        const objectType = board.objects[coordKey({ x, y })];
        if (objectType) {
          ctx.font = "24px serif";
          ctx.fillStyle = "#0f172a";
          ctx.fillText(
            objectIcons[objectType] ?? "?",
            padding + x * size + size * 0.3,
            padding + y * size + size * 0.65
          );
        }
      }
    }

    Object.entries(placements).forEach(([id, coord], index) => {
      const color = suspectColors[index % suspectColors.length];
      const x = padding + coord.x * size + size / 2;
      const y = padding + coord.y * size + size / 2;
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(id.replace("S", ""), x, y);
    });

    if (highlight) {
      const [hx, hy] = highlight.split(",").map(Number);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 3;
      ctx.strokeRect(
        padding + hx * size + 4,
        padding + hy * size + 4,
        size - 8,
        size - 8
      );
    }
  }, [board, placements, highlight]);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onCellClick) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - padding;
    const y = event.clientY - rect.top - padding;
    const cellX = Math.floor(x / size);
    const cellY = Math.floor(y / size);
    if (
      cellX >= 0 &&
      cellY >= 0 &&
      cellX < board.width &&
      cellY < board.height
    ) {
      onCellClick(cellX, cellY);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="board"
    />
  );
};
