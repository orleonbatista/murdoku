import { Difficulty, Puzzle } from "../engine";

type StoredProgress = {
  seed: string;
  difficulty: Difficulty;
  placements: Record<string, { x: number; y: number }>;
};

const STORAGE_KEY = "murdoku-progress";

export const loadProgress = (): StoredProgress | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredProgress;
  } catch {
    return null;
  }
};

export const saveProgress = (progress: StoredProgress) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
};

export const clearProgress = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const loadPuzzleSeed = () => {
  return localStorage.getItem("murdoku-seed") ?? "";
};

export const savePuzzleSeed = (seed: string, difficulty: Difficulty) => {
  localStorage.setItem("murdoku-seed", seed);
  localStorage.setItem("murdoku-difficulty", difficulty);
};

export const loadDifficulty = (): Difficulty => {
  const stored = localStorage.getItem("murdoku-difficulty") as Difficulty | null;
  return stored ?? "easy";
};

export const storePuzzleSnapshot = (puzzle: Puzzle) => {
  localStorage.setItem("murdoku-puzzle", JSON.stringify(puzzle));
};

export const loadPuzzleSnapshot = (): Puzzle | null => {
  const raw = localStorage.getItem("murdoku-puzzle");
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as Puzzle;
  } catch {
    return null;
  }
};
