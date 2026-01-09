import { useEffect, useMemo, useState } from "react";
import {
  Puzzle,
  Difficulty,
  generatePuzzle,
  coordKey,
  candidateCellsForClue,
  computeAssassinId,
  computeVictimCell,
  isCellBlocked,
  solvePuzzle
} from "./engine";
import { CanvasBoard } from "./ui/CanvasBoard";
import {
  clearProgress,
  loadDifficulty,
  loadProgress,
  loadPuzzleSeed,
  loadPuzzleSnapshot,
  saveProgress,
  savePuzzleSeed,
  storePuzzleSnapshot
} from "./ui/storage";

const difficultyLabel: Record<Difficulty, string> = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil"
};

const emptyPlacements: Record<string, { x: number; y: number }> = {};

const App = () => {
  const [seed, setSeed] = useState(loadPuzzleSeed() || "fase-1");
  const [difficulty, setDifficulty] = useState<Difficulty>(loadDifficulty());
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [placements, setPlacements] = useState(emptyPlacements);
  const [selectedSuspect, setSelectedSuspect] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [hint, setHint] = useState<string>("");
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    const snapshot = loadPuzzleSnapshot();
    const progress = loadProgress();
    if (snapshot) {
      setPuzzle(snapshot);
    }
    if (progress) {
      setSeed(progress.seed);
      setDifficulty(progress.difficulty);
      setPlacements(progress.placements);
    }
  }, []);

  useEffect(() => {
    if (!puzzle) {
      return;
    }
    saveProgress({ seed, difficulty, placements });
  }, [puzzle, seed, difficulty, placements]);

  const generate = () => {
    const newPuzzle = generatePuzzle(seed, difficulty);
    setPuzzle(newPuzzle);
    setPlacements({});
    setSelectedSuspect(null);
    setMessage("");
    setHint("");
    setShowSolution(false);
    storePuzzleSnapshot(newPuzzle);
    savePuzzleSeed(seed, difficulty);
  };

  const handleCellClick = (x: number, y: number) => {
    if (!selectedSuspect) {
      setMessage("Selecione um suspeito antes de clicar.");
      return;
    }
    setMessage("");
    setPlacements((prev) => {
      const current = prev[selectedSuspect];
      if (current && current.x === x && current.y === y) {
        const { [selectedSuspect]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [selectedSuspect]: { x, y } };
    });
  };

  const checkContradiction = () => {
    if (!puzzle) {
      return;
    }
    const rows = new Set<number>();
    const cols = new Set<number>();
    for (const [id, coord] of Object.entries(placements)) {
      if (isCellBlocked(puzzle.board, coord)) {
        setMessage(`${id} está em uma célula bloqueada.`);
        return;
      }
      if (rows.has(coord.y) || cols.has(coord.x)) {
        setMessage("Há suspeitos na mesma linha/coluna.");
        return;
      }
      rows.add(coord.y);
      cols.add(coord.x);

      const suspect = puzzle.suspects.find((item) => item.id === id);
      if (suspect) {
        const matchesAll = suspect.clues.every((clue) => {
          const candidates = candidateCellsForClue(puzzle.board, clue);
          return candidates.some(
            (candidate) => candidate.x === coord.x && candidate.y === coord.y
          );
        });
        if (!matchesAll) {
          setMessage(`As pistas de ${suspect.name} não batem com a posição.`);
          return;
        }
      }
    }
    setMessage("Nenhuma contradição encontrada.");
  };

  const handleHint = () => {
    if (!puzzle) {
      return;
    }
    const result = solvePuzzle(puzzle, 2);
    if (result.solutions.length === 0) {
      setHint("As pistas atuais não permitem solução.");
      return;
    }
    setHint(result.explanation ?? "Nenhuma dica disponível.");
  };

  const revealSolution = () => {
    if (!puzzle) {
      return;
    }
    const result = solvePuzzle(puzzle, 1);
    if (result.solutions.length === 1) {
      setPlacements(result.solutions[0].placements);
      setShowSolution(true);
      setMessage("Solução revelada.");
    }
  };

  const solvedInfo = useMemo(() => {
    if (!puzzle) {
      return null;
    }
    if (puzzle.suspects.length !== Object.keys(placements).length) {
      return null;
    }
    const victim = computeVictimCell(puzzle.board, placements);
    if (!victim) {
      return null;
    }
    const assassinId = computeAssassinId(puzzle.board, placements, victim);
    const assassin = puzzle.suspects.find((suspect) => suspect.id === assassinId);
    return { victim, assassin };
  }, [puzzle, placements]);

  const highlight = selectedSuspect
    ? placements[selectedSuspect]
      ? coordKey(placements[selectedSuspect])
      : null
    : null;

  return (
    <div className="app">
      <header>
        <div>
          <h1>Murdoku</h1>
          <p>
            Posicione os suspeitos na planta, descubra a vítima e identifique o
            assassino.
          </p>
        </div>
        <div className="controls">
          <label>
            Seed
            <input
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
            />
          </label>
          <label>
            Dificuldade
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as Difficulty)}
            >
              {Object.entries(difficultyLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button onClick={generate}>Gerar fase</button>
          <button
            onClick={() => {
              clearProgress();
              setPlacements({});
              setMessage("Progresso apagado.");
            }}
          >
            Limpar progresso
          </button>
        </div>
      </header>

      {puzzle ? (
        <main>
          <section className="board-panel">
            <CanvasBoard
              board={puzzle.board}
              placements={placements}
              onCellClick={handleCellClick}
              highlight={highlight}
            />
            <div className="board-actions">
              <button onClick={checkContradiction}>Checar contradição</button>
              <button onClick={handleHint}>Dica</button>
              <button onClick={revealSolution}>Revelar solução</button>
            </div>
            {message && <p className="message">{message}</p>}
            {hint && <p className="hint">Dica: {hint}</p>}
            {showSolution && solvedInfo && solvedInfo.assassin && (
              <div className="solution">
                <h2>Quem é o assassino?</h2>
                <p>
                  A vítima ficou em ({solvedInfo.victim.x + 1},
                  {solvedInfo.victim.y + 1}). O assassino é{" "}
                  <strong>{solvedInfo.assassin.name}</strong>.
                </p>
              </div>
            )}
          </section>

          <section className="suspects">
            <h2>Suspeitos</h2>
            <ul>
              {puzzle.suspects.map((suspect) => (
                <li key={suspect.id}>
                  <button
                    className={
                      selectedSuspect === suspect.id ? "selected" : ""
                    }
                    onClick={() => setSelectedSuspect(suspect.id)}
                  >
                    {suspect.name} {placements[suspect.id] && "✔"}
                  </button>
                  <ul>
                    {suspect.clues.map((clue) => (
                      <li key={clue.text}>{clue.text}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        </main>
      ) : (
        <div className="empty">
          <p>Clique em "Gerar fase" para iniciar.</p>
        </div>
      )}

      {puzzle && solvedInfo && !showSolution && (
        <footer>
          <h2>Quem é o assassino?</h2>
          <p>
            A vítima está no último quadrado disponível. Agora descubra quem
            divide o ambiente com ela.
          </p>
        </footer>
      )}
    </div>
  );
};

export default App;
