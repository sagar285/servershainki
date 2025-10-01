import { Router, Request, Response } from "express";
import { GameService } from "../services/GameService";
import {
  answerSubmissionLimiter,
  userCreationLimiter,
} from "../middleware/rateLimiter";
import { v4 as uuidv4 } from "uuid";

const router = Router();
const gameService = GameService.getInstance();

// Get current question
router.get("/question", async (req: Request, res: Response): Promise<void> => {
  try {
    const question = gameService.getCurrentQuestion();
    const gameState = gameService.getGameState();

    if (!question) {
      res.status(404).json({ error: "No active question available" });
      return;
    }

    // Don't send the answer to the client
    const { answer, ...questionWithoutAnswer } = question;

    res.json({
      question: questionWithoutAnswer,
      isActive: gameState.isActive,
      participants: gameState.participants.size,
      winner: gameState.winner,
    });
  } catch (error) {
    console.error("Error fetching question:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit answer
router.post(
  "/submit",
  answerSubmissionLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { answer, username } = req.body;

      if (
        typeof answer !== "number" ||
        !username ||
        typeof username !== "string"
      ) {
        res.status(400).json({
          error:
            "Invalid submission. Answer must be a number and username is required.",
        });
        return;
      }

      if (username.length < 2 || username.length > 20) {
        res.status(400).json({
          error: "Username must be between 2 and 20 characters.",
        });
        return;
      }

      // Generate user ID if not provided (for anonymous users)
      const userId = req.body.userId || uuidv4();

      const result = await gameService.submitAnswer(
        userId,
        username.trim(),
        answer
      );

      res.json({
        ...result,
        userId, // Return userId for client to store
      });
    } catch (error) {
      console.error("Error submitting answer:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get leaderboard
router.get(
  "/leaderboard",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = Math.min(parseInt(req.query["limit"] as string) || 10, 50); // Max 50 entries
      const leaderboard = await gameService.getLeaderboard(limit);

      res.json({
        leaderboard,
        total: leaderboard.length,
      });
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Create/update user (for persistent identity)
router.post(
  "/user",
  userCreationLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, email } = req.body;

      if (!username || typeof username !== "string") {
        res.status(400).json({ error: "Username is required" });
        return;
      }

      if (username.length < 2 || username.length > 20) {
        res.status(400).json({
          error: "Username must be between 2 and 20 characters",
        });
        return;
      }

      // Basic email validation if provided
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: "Invalid email format" });
        return;
      }

      const userId = uuidv4();

      res.json({
        userId,
        username: username.trim(),
        email: email?.trim(),
        message: "User session created successfully",
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get game statistics
router.get("/stats", async (req: Request, res: Response): Promise<void> => {
  try {
    const gameState = gameService.getGameState();
    const connectedUsers = gameService.getConnectedUsersCount();

    res.json({
      connectedUsers,
      isGameActive: gameState.isActive,
      hasActiveQuestion: !!gameState.currentQuestion,
      currentWinner: gameState.winner?.username || null,
      participants: gameState.participants.size,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
