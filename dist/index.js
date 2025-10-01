"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const uuid_1 = require("uuid");
const gameRoutes_1 = __importDefault(require("./routes/gameRoutes"));
const GameService_1 = require("./services/GameService");
const rateLimiter_1 = require("./middleware/rateLimiter");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "https://client-git-main-sagar285s-projects.vercel.app/",
        methods: ["GET", "POST"],
        credentials: true,
    },
    transports: ["websocket", "polling"],
});
const PORT = 8000;
const MONGODB_URI = "mongodb+srv://shivamdevg687_db_user:8yrvICqEdUalO2F5@cluster0.6lsukxf.mongodb.net/math-quiz?retryWrites=true&w=majority";
// Get GameService instance
const gameService = GameService_1.GameService.getInstance();
// Set up global GameService callbacks for real-time events
gameService.setQuestionChangeCallback((newQuestion, gameState) => {
    const { answer, ...questionWithoutAnswer } = newQuestion;
    io.emit("new-question", {
        question: questionWithoutAnswer,
        gameState: {
            isActive: gameState.isActive,
            participants: gameService.getConnectedUsersCount(),
            winner: gameState.winner,
        },
    });
});
gameService.setWinnerAnnouncementCallback((winner, correctAnswer) => {
    io.emit("winner-announced", {
        winner,
        correctAnswer,
    });
});
// Middleware configuration
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));
app.use((0, cors_1.default)({
    origin: "https://client-git-main-sagar285s-projects.vercel.app/",
    credentials: true,
}));
app.use((0, morgan_1.default)("combined"));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// Apply rate limiting to all API routes
app.use("/api", rateLimiter_1.apiLimiter);
// Routes
app.use("/api/game", gameRoutes_1.default);
// Health check endpoint
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// Socket.io connection handling
io.on("connection", (socket) => {
    let currentUser = null;
    // Handle user joining the game
    socket.on("join-game", (data) => {
        try {
            const { username, userId = (0, uuid_1.v4)() } = data;
            // Validate username
            if (!username || username.length < 2 || username.length > 20) {
                socket.emit("error", { message: "Invalid username" });
                return;
            }
            currentUser = { id: userId, username: username.trim() };
            gameService.addUser(socket.id, currentUser.id, currentUser.username);
            // Send current game state to the new user
            const question = gameService.getCurrentQuestion();
            const gameState = gameService.getGameState();
            if (question) {
                const { answer, ...questionWithoutAnswer } = question;
                socket.emit("new-question", {
                    question: questionWithoutAnswer,
                    gameState: {
                        isActive: gameState.isActive,
                        participants: gameService.getConnectedUsersCount(),
                        winner: gameState.winner,
                    },
                });
            }
            // Notify all users about the new participant
            socket.broadcast.emit("user-joined", {
                username: currentUser.username,
                participantCount: gameService.getConnectedUsersCount(),
            });
            // Confirm successful join
            socket.emit("joined-successfully", {
                userId: currentUser.id,
                username: currentUser.username,
                participantCount: gameService.getConnectedUsersCount(),
            });
        }
        catch (error) {
            socket.emit("error", { message: "Failed to join game" });
        }
    });
    // Handle answer submission via socket
    socket.on("submit-answer", async (data) => {
        try {
            if (!currentUser) {
                socket.emit("submission-result", {
                    error: "Not authenticated. Please join the game first.",
                });
                return;
            }
            const { answer } = data;
            if (typeof answer !== "number") {
                socket.emit("submission-result", { error: "Invalid answer format" });
                return;
            }
            const result = await gameService.submitAnswer(currentUser.id, currentUser.username, answer);
            // Send result to the submitting user
            socket.emit("submission-result", result);
        }
        catch (error) {
            socket.emit("submission-result", { error: "Failed to submit answer" });
        }
    });
    // Handle disconnection
    socket.on("disconnect", () => {
        if (currentUser) {
            gameService.removeUser(socket.id);
            // Notify other users
            socket.broadcast.emit("user-left", {
                username: currentUser.username,
                participantCount: gameService.getConnectedUsersCount(),
            });
        }
    });
    // Handle ping for connection testing
    socket.on("ping", (callback) => {
        if (callback && typeof callback === "function") {
            callback();
        }
    });
});
// Database connection with improved error handling
async function connectToDatabase() {
    try {
        await mongoose_1.default.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log("Connected to MongoDB");
    }
    catch (error) {
        console.error("MongoDB connection error:", error);
        console.log("Running without database connection...");
    }
}
// Graceful shutdown handling
process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down gracefully");
    server.close(() => {
        mongoose_1.default.connection.close().then(() => {
            process.exit(0);
        });
    });
});
process.on("SIGINT", async () => {
    console.log("SIGINT received, shutting down gracefully");
    server.close(() => {
        mongoose_1.default.connection.close().then(() => {
            process.exit(0);
        });
    });
});
// Start server
async function startServer() {
    await connectToDatabase();
    server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🎮 Game service initialized`);
        console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
}
startServer().catch(console.error);
