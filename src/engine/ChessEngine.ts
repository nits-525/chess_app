import { Chess, Square, Move } from 'chess.js';

export type GameStatus = 'active' | 'checkmate' | 'stalemate' | 'draw';
export type PieceColor = 'w' | 'b';

export interface MoveResult {
  success: boolean;
  fen: string;
  move: Move | null;
  status: GameStatus;
}

export interface SquareInfo {
  type: string;
  color: PieceColor;
}

export class ChessEngine {
  private chess: Chess;

  constructor(fen?: string) {
    this.chess = fen ? new Chess(fen) : new Chess();
  }

  loadFEN(fen: string): void {
    this.chess.load(fen);
  }

  getFEN(): string {
    return this.chess.fen();
  }

  getTurn(): PieceColor {
    return this.chess.turn() as PieceColor;
  }

  makeMove(move: { from: string; to: string; promotion?: string }): MoveResult {
    try {
      const result = this.chess.move(move);
      return {
        success: true,
        fen: this.chess.fen(),
        move: result,
        status: this.getGameStatus(),
      };
    } catch {
      return {
        success: false,
        fen: this.chess.fen(),
        move: null,
        status: this.getGameStatus(),
      };
    }
  }

  getGameStatus(): GameStatus {
    if (this.chess.isCheckmate()) return 'checkmate';
    if (this.chess.isStalemate()) return 'stalemate';
    if (this.chess.isDraw()) return 'draw';
    return 'active';
  }

  isInCheck(): boolean {
    return this.chess.inCheck();
  }

  getLegalMoves(square?: string): Move[] {
    return square
      ? this.chess.moves({ square: square as Square, verbose: true })
      : this.chess.moves({ verbose: true });
  }

  getBoard(): (SquareInfo | null)[][] {
    return this.chess.board();
  }

  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  getLastMove(): Move | null {
    const history = this.chess.history({ verbose: true });
    return history.length > 0 ? history[history.length - 1] : null;
  }

  reset(): void {
    this.chess.reset();
  }
}
