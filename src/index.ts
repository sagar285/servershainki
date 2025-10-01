import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

import gameRoutes from "./routes/gameRoutes";
import { GameService } from "./services/GameService";
import { apiLimiter } from "./middleware/rateLimiter";
import { Question, GameState } from "./types";

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env["CLIENT_URL"] || "https://client-git-main-sagar285s-projects.vercel.app/",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

const PORT = process.env["PORT"] || 8000;
const MONGODB_URI =
  process.env["MONGODB_URI"] || "mongodb+srv://shivamdevg687_db_user:8yrvICqEdUalO2F5@cluster0.6lsukxf.mongodb.net/math-quiz?retryWrites=true&w=majority";

// Get GameService instance
const gameService = GameService.getInstance();

// Set up global GameService callbacks for real-time events
gameService.setQuestionChangeCallback(
  (newQuestion: Question, gameState: GameState) => {
    const { answer, ...questionWithoutAnswer } = newQuestion;

    io.emit("new-question", {
      question: questionWithoutAnswer,
      gameState: {
        isActive: gameState.isActive,
        participants: gameService.getConnectedUsersCount(),
        winner: gameState.winner,
      },
    });
  }
);

gameService.setWinnerAnnouncementCallback(
  (winner: any, correctAnswer: number) => {
    io.emit("winner-announced", {
      winner,
      correctAnswer,
    });
  }
);

// Middleware configuration
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env["CLIENT_URL"] || "https://client-git-main-sagar285s-projects.vercel.app/",
    credentials: true,
  })
);

app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all API routes
app.use("/api", apiLimiter);

// Routes
app.use("/api/game", gameRoutes);

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
  let currentUser: { id: string; username: string } | null = null;

  // Handle user joining the game
  socket.on("join-game", (data: { username: string; userId?: string }) => {
    try {
      const { username, userId = uuidv4() } = data;

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
    } catch (error) {
      socket.emit("error", { message: "Failed to join game" });
    }
  });

  // Handle answer submission via socket
  socket.on(
    "submit-answer",
    async (data: { answer: number; timestamp: number }) => {
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

        const result = await gameService.submitAnswer(
          currentUser.id,
          currentUser.username,
          answer
        );

        // Send result to the submitting user
        socket.emit("submission-result", result);
      } catch (error) {
        socket.emit("submission-result", { error: "Failed to submit answer" });
      }
    }
  );

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
async function connectToDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    console.log("Running without database connection...");
  }
}

// Graceful shutdown handling
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    mongoose.connection.close().then(() => {
      process.exit(0);
    });
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    mongoose.connection.close().then(() => {
      process.exit(0);
    });
  });
});

// Start server
async function startServer(): Promise<void> {
  await connectToDatabase();

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🎮 Game service initialized`);
    console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
}

startServer().catch(console.error);
