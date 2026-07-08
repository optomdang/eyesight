/**
 * 2048 Exercise Hook
 * Manages 2048 game state for vision exercises
 *
 * This hook provides the core game logic for the 2048 exercise.
 * It is used by Game2048Board for game state management.
 */

import { useState, useCallback } from 'react';
import type { Game2048State, Game2048Options, Game2048Result } from 'src/types/core';

export const use2048Exercise = (options: Game2048Options = {}) => {
  const { visualSettings, targetTile = 2048, boardSize = 4 } = options;

  const [gameState, setGameState] = useState<Game2048State>({
    board: Array(boardSize)
      .fill(null)
      .map(() => Array(boardSize).fill(0)),
    score: 0,
    gameOver: false,
    gameWon: false,
    moves: 0,
  });

  const [isLoading, setIsLoading] = useState(false);

  const addRandomTile = useCallback(
    (board: number[][]) => {
      const emptyCells: [number, number][] = [];

      for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
          if (board[i][j] === 0) {
            emptyCells.push([i, j]);
          }
        }
      }

      if (emptyCells.length > 0) {
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        board[randomCell[0]][randomCell[1]] = Math.random() < 0.9 ? 2 : 4;
      }
    },
    [boardSize]
  );

  const canMove = useCallback(
    (board: number[][]) => {
      // Check if any moves are possible
      for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
          if (board[i][j] === 0) return true;
          if (j < boardSize - 1 && board[i][j] === board[i][j + 1]) return true;
          if (i < boardSize - 1 && board[i][j] === board[i + 1][j]) return true;
        }
      }
      return false;
    },
    [boardSize]
  );

  const initializeBoard = useCallback(() => {
    const newBoard = Array(boardSize)
      .fill(null)
      .map(() => Array(boardSize).fill(0));

    // Add two random tiles
    addRandomTile(newBoard);
    addRandomTile(newBoard);

    setGameState({
      board: newBoard,
      score: 0,
      gameOver: false,
      gameWon: false,
      moves: 0,
    });
  }, [boardSize, addRandomTile]);

  const move = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (gameState.gameOver || gameState.gameWon) return;

      setIsLoading(true);

      const newBoard = gameState.board.map((row) => [...row]);
      let scoreIncrease = 0;
      let moved = false;

      // Helper function to slide and merge a row to the left
      const slideAndMerge = (
        row: number[]
      ): { newRow: number[]; score: number; moved: boolean } => {
        const filtered = row.filter((val) => val !== 0);
        let score = 0;
        let rowMoved = false;

        // Merge adjacent equal tiles
        for (let j = 0; j < filtered.length - 1; j++) {
          if (filtered[j] === filtered[j + 1]) {
            filtered[j] *= 2;
            score += filtered[j];
            filtered.splice(j + 1, 1);
          }
        }

        // Pad with zeros
        while (filtered.length < boardSize) {
          filtered.push(0);
        }

        // Check if row changed
        if (JSON.stringify(row) !== JSON.stringify(filtered)) {
          rowMoved = true;
        }

        return { newRow: filtered, score, moved: rowMoved };
      };

      // Transpose helper
      const transpose = (matrix: number[][]): number[][] => {
        return matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));
      };

      if (direction === 'left') {
        for (let i = 0; i < boardSize; i++) {
          const result = slideAndMerge(newBoard[i]);
          newBoard[i] = result.newRow;
          scoreIncrease += result.score;
          if (result.moved) moved = true;
        }
      } else if (direction === 'right') {
        for (let i = 0; i < boardSize; i++) {
          const reversed = [...newBoard[i]].reverse();
          const result = slideAndMerge(reversed);
          newBoard[i] = result.newRow.reverse();
          scoreIncrease += result.score;
          if (result.moved) moved = true;
        }
      } else if (direction === 'up') {
        const transposed = transpose(newBoard);
        for (let i = 0; i < boardSize; i++) {
          const result = slideAndMerge(transposed[i]);
          transposed[i] = result.newRow;
          scoreIncrease += result.score;
          if (result.moved) moved = true;
        }
        const backTransposed = transpose(transposed);
        for (let i = 0; i < boardSize; i++) {
          newBoard[i] = backTransposed[i];
        }
      } else if (direction === 'down') {
        const transposed = transpose(newBoard);
        for (let i = 0; i < boardSize; i++) {
          const reversed = [...transposed[i]].reverse();
          const result = slideAndMerge(reversed);
          transposed[i] = result.newRow.reverse();
          scoreIncrease += result.score;
          if (result.moved) moved = true;
        }
        const backTransposed = transpose(transposed);
        for (let i = 0; i < boardSize; i++) {
          newBoard[i] = backTransposed[i];
        }
      }

      if (moved) {
        addRandomTile(newBoard);

        const gameWon = newBoard.some((row) => row.some((cell) => cell >= targetTile));
        const gameOver = !canMove(newBoard);

        setGameState((prev) => ({
          board: newBoard,
          score: prev.score + scoreIncrease,
          gameOver,
          gameWon,
          moves: prev.moves + 1,
        }));
      }

      setTimeout(() => setIsLoading(false), 150);
    },
    [gameState, boardSize, targetTile, addRandomTile, canMove]
  );

  const restart = useCallback(() => {
    initializeBoard();
  }, [initializeBoard]);

  const getExerciseResult = useCallback((): Game2048Result => {
    return {
      score: gameState.score,
      moves: gameState.moves,
      highestTile: Math.max(...gameState.board.flat()),
      efficiency: gameState.moves > 0 ? gameState.score / gameState.moves : 0,
      visualSettings,
    };
  }, [gameState, visualSettings]);

  // Add restoreGameState for pause/resume functionality
  const restoreGameState = useCallback(
    (savedState: Partial<Game2048State>) => {
      if (!savedState || typeof savedState !== 'object') {
        console.warn('Invalid game state provided for restoration, starting fresh');
        initializeBoard();
        return;
      }

      // Helper function to validate board structure (defined inline for proper scope)
      const isValidBoard = (board: any): board is number[][] => {
        if (!Array.isArray(board) || board.length !== boardSize) return false;

        return board.every((row) => {
          if (!Array.isArray(row) || row.length !== boardSize) return false;

          return row.every((cell) => {
            if (typeof cell !== 'number' || cell < 0) return false;
            // Check if it's a power of 2 or zero
            return cell === 0 || Math.log2(cell) % 1 === 0;
          });
        });
      };

      // If board is invalid, completely reset the game
      if (!isValidBoard(savedState.board)) {
        console.warn('Invalid board structure in saved state, starting fresh');
        initializeBoard();
        return;
      }

      // Validate and sanitize saved state (board is already validated)
      const validatedState: Game2048State = {
        board: savedState.board!,
        score: typeof savedState.score === 'number' && savedState.score >= 0 ? savedState.score : 0,
        moves: typeof savedState.moves === 'number' && savedState.moves >= 0 ? savedState.moves : 0,
        gameOver: typeof savedState.gameOver === 'boolean' ? savedState.gameOver : false,
        gameWon: typeof savedState.gameWon === 'boolean' ? savedState.gameWon : false,
      };

      // Check for win condition in restored state
      if (!validatedState.gameWon && validatedState.board.some((row) => row.includes(targetTile))) {
        validatedState.gameWon = true;
      }

      // Check for game over condition in restored state
      if (!validatedState.gameOver && !canMove(validatedState.board)) {
        validatedState.gameOver = true;
      }

      setGameState(validatedState);
    },
    [boardSize, targetTile, initializeBoard, canMove]
  );

  // Helper function to validate board structure
  const validateBoard = (board: any): board is number[][] => {
    if (!Array.isArray(board) || board.length !== boardSize) return false;

    return board.every((row) => {
      if (!Array.isArray(row) || row.length !== boardSize) return false;

      return row.every((cell) => {
        if (typeof cell !== 'number' || cell < 0) return false;
        // Check if it's a power of 2 or zero
        return cell === 0 || Math.log2(cell) % 1 === 0;
      });
    });
  };

  // Add makeMove alias for backward compatibility with tests
  const makeMove = move;

  return {
    gameState,
    isLoading,
    move,
    makeMove, // Alias for tests
    restart,
    initializeBoard,
    restoreGameState,
    getExerciseResult,
    visualSettings,
  };
};

export default use2048Exercise;
