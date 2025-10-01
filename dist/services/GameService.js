"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameService = void 0;
const QuestionGenerator_1 = require("./QuestionGenerator");
const User_1 = require("../models/User");
class GameService {
    constructor() {
        this.submissionLock = false;
        this.currentDifficulty = "medium";
        this.questionChangeCallback = null;
        this.winnerAnnouncementCallback = null;
        this.gameState = {
            currentQuestion: null,
            isActive: false,
            startTime: null,
            winner: null,
            participants: new Set(),
        };
        this.connectedUsers = new Map();
        // Start first question immediately
        setTimeout(() => {
            this.startNewQuestion();
        }, 1000);
    }
    static getInstance() {
        if (!GameService.instance) {
            GameService.instance = new GameService();
        }
        return GameService.instance;
    }
    // Set callbacks for real-time updates
    setQuestionChangeCallback(callback) {
        this.questionChangeCallback = callback;
    }
    setWinnerAnnouncementCallback(callback) {
        this.winnerAnnouncementCallback = callback;
    }
    // Atomic operation to handle answer submissions with concurrency control
    async submitAnswer(userId, username, answer) {
        const submissionTime = new Date();
        console.log(`🎯 Processing answer from ${username}: ${answer}`);
        // Check if game is active and question exists
        if (!this.gameState.isActive ||
            !this.gameState.currentQuestion ||
            !this.gameState.startTime) {
            console.log(`❌ Game not active or no question. Active: ${this.gameState.isActive}, Question: ${!!this.gameState.currentQuestion}`);
            return {
                isCorrect: false,
                isWinner: false,
                submissionTime,
                timeTaken: 0,
            };
        }
        // Calculate time taken
        const timeTaken = submissionTime.getTime() - this.gameState.startTime.getTime();
        // Check if answer is correct (allow small floating point errors)
        const expectedAnswer = this.gameState.currentQuestion.answer;
        const isCorrect = Math.abs(answer - expectedAnswer) < 0.01;
        console.log(`🔍 Answer check: Expected ${expectedAnswer}, Got ${answer}, Correct: ${isCorrect}`);
        if (!isCorrect) {
            return {
                isCorrect: false,
                isWinner: false,
                submissionTime,
                timeTaken,
            };
        }
        // Critical section: Check for first correct answer with atomic lock
        if (this.submissionLock || this.gameState.winner) {
            console.log(`⏳ Submission rejected: Lock ${this.submissionLock}, Winner exists: ${!!this.gameState.winner}`);
            return {
                isCorrect: true,
                isWinner: false,
                submissionTime,
                timeTaken,
            };
        }
        // Acquire lock to prevent race conditions
        this.submissionLock = true;
        console.log(`🔒 Lock acquired by ${username}`);
        try {
            // Double-check winner hasn't been set (race condition prevention)
            if (this.gameState.winner !== null) {
                console.log(`⚠️ Winner already set during lock acquisition`);
                return {
                    isCorrect: true,
                    isWinner: false,
                    submissionTime,
                    timeTaken,
                };
            }
            // Set winner and mark game as inactive
            this.gameState.winner = {
                userId,
                username,
                submissionTime,
            };
            this.gameState.isActive = false;
            console.log(`🏆 Winner set: ${username} in ${timeTaken}ms`);
            // Update user score in database
            try {
                await this.updateUserScore(userId, username, timeTaken);
                console.log(`💾 Database updated for ${username}`);
            }
            catch (dbError) {
                console.error(`❌ Database update failed for ${username}:`, dbError);
            }
            // Announce winner immediately
            if (this.winnerAnnouncementCallback) {
                console.log(`📢 Calling winner announcement callback`);
                this.winnerAnnouncementCallback({ userId, username, timeTaken }, this.gameState.currentQuestion.answer);
            }
            else {
                console.error(`❌ Winner announcement callback is null!`);
            }
            // Schedule next question after a brief delay
            setTimeout(() => {
                console.log(`⏰ Starting new question after winner announcement`);
                this.startNewQuestion();
            }, 3000); // 3 second delay to show winner
            return {
                isCorrect: true,
                isWinner: true,
                submissionTime,
                timeTaken,
            };
        }
        finally {
            // Always release the lock
            this.submissionLock = false;
            console.log(`🔓 Lock released`);
        }
    }
    async updateUserScore(userId, username, timeTaken) {
        try {
            // Calculate score based on difficulty and time
            const baseScore = this.getBaseScore(this.currentDifficulty);
            const timeBonus = Math.max(0, 10000 - timeTaken); // Bonus for speed (max 10 seconds)
            const totalScore = Math.floor(baseScore + timeBonus / 1000);
            // Update or create user
            await User_1.UserModel.findOneAndUpdate({ username }, {
                $inc: {
                    highScore: totalScore,
                    gamesWon: 1,
                },
                $setOnInsert: { username },
            }, {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
            });
            console.log(`Updated score for ${username}: +${totalScore} points (${timeTaken}ms)`);
        }
        catch (error) {
            console.error("Error updating user score:", error);
        }
    }
    getBaseScore(difficulty) {
        switch (difficulty) {
            case "easy":
                return 100;
            case "medium":
                return 250;
            case "hard":
                return 500;
            default:
                return 250;
        }
    }
    startNewQuestion() {
        console.log("🎯 Generating new question...");
        // Adjust difficulty based on game activity
        this.adjustDifficulty();
        // Generate new unique question
        const question = QuestionGenerator_1.QuestionGenerator.generateQuestion(this.currentDifficulty);
        // Reset game state completely
        this.gameState = {
            currentQuestion: question,
            isActive: true,
            startTime: new Date(),
            winner: null,
            participants: new Set(Array.from(this.connectedUsers.keys())),
        };
        // Reset submission lock
        this.submissionLock = false;
        console.log(`📊 New ${this.currentDifficulty} question: ${question.problem} (Answer: ${question.answer})`);
        console.log(`👥 Broadcasting to ${this.connectedUsers.size} connected users`);
        // Notify all connected clients about the new question
        if (this.questionChangeCallback) {
            this.questionChangeCallback(question, {
                currentQuestion: question,
                isActive: this.gameState.isActive,
                startTime: this.gameState.startTime,
                participants: new Set(this.gameState.participants),
                winner: null,
            });
        }
    }
    adjustDifficulty() {
        const participantCount = this.connectedUsers.size;
        const previousDifficulty = this.currentDifficulty;
        if (participantCount <= 2) {
            this.currentDifficulty = "easy";
        }
        else if (participantCount <= 5) {
            this.currentDifficulty = "medium";
        }
        else {
            this.currentDifficulty = "hard";
        }
        if (previousDifficulty !== this.currentDifficulty) {
            console.log(`🎚️ Difficulty adjusted to ${this.currentDifficulty} (${participantCount} participants)`);
        }
    }
    addUser(socketId, userId, username) {
        console.log(`➕ User joined: ${username} (${socketId})`);
        this.connectedUsers.set(socketId, { id: userId, username, socketId });
        this.gameState.participants.add(userId);
        console.log(`👥 Total connected users: ${this.connectedUsers.size}`);
        // Always send current question to new user if one exists
        if (this.gameState.currentQuestion && this.questionChangeCallback) {
            console.log(`📤 Sending current question to new user: ${username}`);
            // This will be sent to the specific user via the socket handler
        }
        // If this is the first user OR no active question, start a new one
        if (this.connectedUsers.size === 1 || !this.gameState.currentQuestion) {
            console.log(`🚀 Starting new question for ${this.connectedUsers.size} users`);
            setTimeout(() => {
                this.startNewQuestion();
            }, 500);
        }
    }
    removeUser(socketId) {
        const user = this.connectedUsers.get(socketId);
        if (user) {
            console.log(`➖ User left: ${user.username} (${socketId})`);
            this.connectedUsers.delete(socketId);
            this.gameState.participants.delete(user.id);
        }
    }
    getCurrentQuestion() {
        return this.gameState.currentQuestion;
    }
    getGameState() {
        return {
            ...this.gameState,
            participants: new Set(this.gameState.participants), // Create new Set to avoid reference issues
        };
    }
    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }
    // Force new question (useful for testing)
    forceNewQuestion() {
        console.log("🔄 Forcing new question...");
        this.gameState.winner = null;
        this.gameState.isActive = false;
        this.submissionLock = false;
        this.startNewQuestion();
    }
    async getLeaderboard(limit = 10) {
        try {
            const leaderboard = await User_1.UserModel.find({})
                .sort({ highScore: -1, gamesWon: -1 })
                .limit(limit)
                .select("username highScore gamesWon")
                .lean();
            console.log(`📊 Leaderboard requested: ${leaderboard.length} entries`);
            return leaderboard;
        }
        catch (error) {
            console.error("Error fetching leaderboard:", error);
            return [];
        }
    }
    // Get game statistics
    getGameStatistics() {
        return {
            connectedUsers: this.connectedUsers.size,
            isGameActive: this.gameState.isActive,
            currentDifficulty: this.currentDifficulty,
            hasWinner: !!this.gameState.winner,
            questionId: this.gameState.currentQuestion?.id,
            gameStartTime: this.gameState.startTime,
            participants: Array.from(this.gameState.participants),
        };
    }
}
exports.GameService = GameService;
