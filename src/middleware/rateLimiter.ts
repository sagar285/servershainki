import rateLimit from "express-rate-limit";

// Rate limiter for answer submissions - prevents spam
export const answerSubmissionLimiter = rateLimit({
  windowMs: 1000, // 1 second window
  max: 5, // Maximum 5 submissions per second per IP
  message: {
    error: "Too many submission attempts. Please wait before trying again.",
    retryAfter: 1000,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost during development
    return process.env["NODE_ENV"] === "development" && req.ip === "127.0.0.1";
  },
});

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Maximum 100 requests per 15 minutes per IP
  message: {
    error: "Too many requests from this IP. Please try again later.",
    retryAfter: 15 * 60 * 1000,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for user registration/creation
export const userCreationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // Maximum 3 user creations per minute per IP
  message: {
    error: "Too many user creation attempts. Please wait before trying again.",
    retryAfter: 60 * 1000,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
