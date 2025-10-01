export interface User {
  id: string;
  username: string;
  email?: string;
  highScore: number;
  gamesWon: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: string;
  problem: string;
  answer: number;
  difficulty: "easy" | "medium" | "hard";
  createdAt: Date;
}

export interface GameState {
  currentQuestion: Question | null;
  isActive: boolean;
  startTime: Date | null;
  winner: {
    userId: string;
    username: string;
    submissionTime: Date;
  } | null;
  participants: Set<string>;
}

export interface SubmissionResult {
  isCorrect: boolean;
  isWinner: boolean;
  submissionTime: Date;
  timeTaken: number;
}

export interface LeaderboardEntry {
  username: string;
  highScore: number;
  gamesWon: number;
}

export interface SocketUser {
  id: string;
  username: string;
  socketId: string;
}
