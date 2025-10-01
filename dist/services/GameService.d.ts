import { GameState, Question, SubmissionResult } from "../types";
export declare class GameService {
    private static instance;
    private gameState;
    private connectedUsers;
    private submissionLock;
    private currentDifficulty;
    private questionChangeCallback;
    private winnerAnnouncementCallback;
    private constructor();
    static getInstance(): GameService;
    setQuestionChangeCallback(callback: (newQuestion: Question, gameState: GameState) => void): void;
    setWinnerAnnouncementCallback(callback: (winner: any, correctAnswer: number) => void): void;
    submitAnswer(userId: string, username: string, answer: number): Promise<SubmissionResult>;
    private updateUserScore;
    private getBaseScore;
    startNewQuestion(): void;
    private adjustDifficulty;
    addUser(socketId: string, userId: string, username: string): void;
    removeUser(socketId: string): void;
    getCurrentQuestion(): Question | null;
    getGameState(): GameState;
    getConnectedUsersCount(): number;
    forceNewQuestion(): void;
    getLeaderboard(limit?: number): Promise<(import("mongoose").FlattenMaps<import("../models/User").UserDocument> & Required<{
        _id: import("mongoose").FlattenMaps<unknown>;
    }> & {
        __v: number;
    })[]>;
    getGameStatistics(): {
        connectedUsers: number;
        isGameActive: boolean;
        currentDifficulty: "easy" | "medium" | "hard";
        hasWinner: boolean;
        questionId: string | undefined;
        gameStartTime: Date | null;
        participants: string[];
    };
}
//# sourceMappingURL=GameService.d.ts.map