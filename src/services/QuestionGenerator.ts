import { evaluate } from "mathjs";
import { v4 as uuidv4 } from "uuid";
import { Question } from "../types";

export class QuestionGenerator {
  private static readonly QUESTION_TYPES = [
    "arithmetic",
    "algebra",
    "fractions",
    "percentages",
    "powers",
    "mixed",
  ];

  private static readonly DIFFICULTY_CONFIG = {
    easy: {
      min: 1,
      max: 50,
      operators: ["+", "-"],
      maxTerms: 2,
      allowDecimals: false,
      allowNegatives: false,
    },
    medium: {
      min: 1,
      max: 200,
      operators: ["+", "-", "*"],
      maxTerms: 3,
      allowDecimals: true,
      allowNegatives: true,
    },
    hard: {
      min: 1,
      max: 1000,
      operators: ["+", "-", "*", "/"],
      maxTerms: 4,
      allowDecimals: true,
      allowNegatives: true,
    },
  };

  private static generatedQuestions: Set<string> = new Set();
  private static questionCounter = 0;

  static generateQuestion(
    difficulty: "easy" | "medium" | "hard" = "medium"
  ): Question {
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      try {
        const questionType = this.getRandomQuestionType(difficulty);
        const question = this.generateQuestionByType(questionType, difficulty);

        // Ensure we don't repeat questions too soon
        const questionKey = `${question.problem}-${question.answer}`;
        if (
          !this.generatedQuestions.has(questionKey) ||
          this.generatedQuestions.size > 100
        ) {
          this.generatedQuestions.add(questionKey);

          // Clear old questions if we have too many
          if (this.generatedQuestions.size > 150) {
            const questionsArray = Array.from(this.generatedQuestions);
            this.generatedQuestions = new Set(questionsArray.slice(-100));
          }

          this.questionCounter++;
          return {
            ...question,
            id: `${uuidv4()}-${this.questionCounter}`,
            createdAt: new Date(),
          };
        }
      } catch (error) {
        console.warn("Question generation attempt failed:", error);
      }
      attempts++;
    }

    // Fallback to simple arithmetic if all attempts fail
    return this.generateSimpleArithmetic(difficulty);
  }

  private static getRandomQuestionType(
    difficulty: "easy" | "medium" | "hard"
  ): string {
    switch (difficulty) {
      case "easy":
        return (
          this.QUESTION_TYPES[Math.floor(Math.random() * 2)] ?? "arithmetic"
        ); // arithmetic or algebra
      case "medium":
        return (
          this.QUESTION_TYPES[Math.floor(Math.random() * 4)] ?? "arithmetic"
        ); // first 4 types
      case "hard":
        return (
          this.QUESTION_TYPES[
            Math.floor(Math.random() * this.QUESTION_TYPES.length)
          ] ?? "arithmetic"
        );
      default:
        return "arithmetic";
    }
  }

  private static generateQuestionByType(
    type: string,
    difficulty: "easy" | "medium" | "hard"
  ): Omit<Question, "id" | "createdAt"> {
    switch (type) {
      case "arithmetic":
        return this.generateArithmetic(difficulty);
      case "algebra":
        return this.generateAlgebra(difficulty);
      case "fractions":
        return this.generateFractions(difficulty);
      case "percentages":
        return this.generatePercentages(difficulty);
      case "powers":
        return this.generatePowers(difficulty);
      case "mixed":
        return this.generateMixed(difficulty);
      default:
        return this.generateArithmetic(difficulty);
    }
  }

  private static generateArithmetic(
    difficulty: "easy" | "medium" | "hard"
  ): Omit<Question, "id" | "createdAt"> {
    const config = this.DIFFICULTY_CONFIG[difficulty];
    const numTerms = Math.floor(Math.random() * (config.maxTerms - 1)) + 2;

    let expression = "";
    let hasValidAnswer = false;
    let answer = 0;
    let attempts = 0;

    while (!hasValidAnswer && attempts < 20) {
      expression = this.generateArithmeticExpression(config, numTerms);
      try {
        const result = evaluate(expression);
        if (this.isValidAnswer(result)) {
          answer = Math.round(result * 100) / 100;
          hasValidAnswer = true;
        }
      } catch (error) {
        attempts++;
        continue;
      }
      attempts++;
    }

    return {
      problem: `Calculate: ${expression}`,
      answer,
      difficulty,
    };
  }

  private static generateAlgebra(
    difficulty: "easy" | "medium" | "hard"
  ): Omit<Question, "id" | "createdAt"> {
    const configs = {
      easy: { min: 1, max: 20 },
      medium: { min: 1, max: 50 },
      hard: { min: 1, max: 100 },
    };

    const config = configs[difficulty];
    const a = this.randomNumber(config.min, config.max);
    const b = this.randomNumber(config.min, config.max);
    const x = this.randomNumber(config.min, config.max);

    const expressions = [
      { problem: `If ${a}x + ${b} = ${a * x + b}, find x`, answer: x },
      { problem: `Solve for x: ${a}x - ${b} = ${a * x - b}`, answer: x },
      { problem: `What is x when ${a}(x + ${b}) = ${a * (x + b)}?`, answer: x },
      { problem: `Find x: ${a}x = ${a * x}`, answer: x },
    ];

    const selected =
      expressions[Math.floor(Math.random() * expressions.length)];

    // Type guard to ensure selected is defined
    if (!selected) {
      return {
        problem: `Calculate: ${a} + ${b}`,
        answer: a + b,
        difficulty,
      };
    }

    return {
      problem: selected.problem,
      answer: selected.answer,
      difficulty,
    };
  }

  private static generateFractions(
    difficulty: "easy" | "medium" | "hard"
  ): Omit<Question, "id" | "createdAt"> {
    const maxDenom =
      difficulty === "easy" ? 10 : difficulty === "medium" ? 20 : 50;

    const num1 = this.randomNumber(1, maxDenom - 1);
    const den1 = this.randomNumber(num1 + 1, maxDenom);
    const num2 = this.randomNumber(1, maxDenom - 1);
    const den2 = this.randomNumber(num2 + 1, maxDenom);

    const operations = ["+", "-"];
    const op = operations[Math.floor(Math.random() * operations.length)];

    let result: number;
    if (op === "+") {
      result = (num1 * den2 + num2 * den1) / (den1 * den2);
    } else {
      result = (num1 * den2 - num2 * den1) / (den1 * den2);
    }

    result = Math.round(result * 1000) / 1000; // Round to 3 decimal places

    return {
      problem: `Calculate: ${num1}/${den1} ${op} ${num2}/${den2} (as decimal)`,
      answer: result,
      difficulty,
    };
  }

  private static generatePercentages(
    difficulty: "easy" | "medium" | "hard"
  ): Omit<Question, "id" | "createdAt"> {
    const base = this.randomNumber(50, 1000);
    const percentage = this.randomNumber(5, 95);

    const types = [
      {
        problem: `What is ${percentage}% of ${base}?`,
        answer: Math.round(((base * percentage) / 100) * 100) / 100,
      },
      {
        problem: `${base} is what percent of ${Math.round(
          (base * 100) / percentage
        )}?`,
        answer: percentage,
      },
    ];

    const selected = types[Math.floor(Math.random() * types.length)];

    // Type guard to ensure selected is defined
    if (!selected) {
      return {
        problem: `What is ${percentage}% of ${base}?`,
        answer: Math.round(((base * percentage) / 100) * 100) / 100,
        difficulty,
      };
    }

    return {
      problem: selected.problem,
      answer: selected.answer,
      difficulty,
    };
  }

  private static generatePowers(
    difficulty: "easy" | "medium" | "hard"
  ): Omit<Question, "id" | "createdAt"> {
    const maxBase =
      difficulty === "easy" ? 10 : difficulty === "medium" ? 15 : 20;
    const maxPower =
      difficulty === "easy" ? 3 : difficulty === "medium" ? 4 : 5;

    const base = this.randomNumber(2, maxBase);
    const power = this.randomNumber(2, maxPower);
    const result = Math.pow(base, power);

    if (result > 10000) {
      // Use square root instead for large numbers
      const num = this.randomNumber(4, 100);
      const sqrt = Math.sqrt(num);
      if (Number.isInteger(sqrt)) {
        return {
          problem: `What is √${num}?`,
          answer: sqrt,
          difficulty,
        };
      }
    }

    return {
      problem: `Calculate: ${base}^${power}`,
      answer: result,
      difficulty,
    };
  }

  private static generateMixed(
    difficulty: "easy" | "medium" | "hard"
  ): Omit<Question, "id" | "createdAt"> {
    const config = this.DIFFICULTY_CONFIG[difficulty];

    // Complex expressions with parentheses
    const a = this.randomNumber(config.min, Math.min(config.max, 50));
    const b = this.randomNumber(config.min, Math.min(config.max, 50));
    const c = this.randomNumber(config.min, Math.min(config.max, 50));

    const expressions = [
      `(${a} + ${b}) * ${c}`,
      `${a} * (${b} + ${c})`,
      `(${a} + ${b}) / ${c}`,
      `${a} + ${b} * ${c}`,
      `${a} * ${b} - ${c}`,
      `(${a} - ${b}) + ${c} * 2`,
    ];

    const expression =
      expressions[Math.floor(Math.random() * expressions.length)];

    // Type guard to ensure expression is defined
    if (!expression) {
      return {
        problem: `Calculate: ${a} + ${b}`,
        answer: a + b,
        difficulty,
      };
    }

    try {
      const result = evaluate(expression);
      return {
        problem: `Calculate: ${expression}`,
        answer: Math.round(result * 100) / 100,
        difficulty,
      };
    } catch (error) {
      // Fallback to simple arithmetic if evaluation fails
      return {
        problem: `Calculate: ${a} + ${b}`,
        answer: a + b,
        difficulty,
      };
    }
  }

  private static generateArithmeticExpression(
    config: { min: number; max: number; operators: string[] },
    numTerms: number
  ): string {
    let expression = this.randomNumber(config.min, config.max).toString();

    for (let i = 1; i < numTerms; i++) {
      const operator =
        config.operators[Math.floor(Math.random() * config.operators.length)];
      let nextNumber = this.randomNumber(config.min, config.max);

      if (operator === "/") {
        nextNumber = Math.max(1, nextNumber);
        // Ensure clean division for easier problems
        const currentResult = evaluate(expression);
        if (currentResult % nextNumber !== 0 && Math.random() > 0.3) {
          nextNumber =
            this.findDivisor(Math.abs(Math.floor(currentResult))) || nextNumber;
        }
      }

      expression += ` ${operator} ${nextNumber}`;
    }

    return expression;
  }

  private static generateSimpleArithmetic(
    difficulty: "easy" | "medium" | "hard"
  ): Question {
    const config = this.DIFFICULTY_CONFIG[difficulty];
    const a = this.randomNumber(config.min, config.max);
    const b = this.randomNumber(config.min, config.max);
    const operators = ["+", "-", "*"];
    const op = operators[Math.floor(Math.random() * operators.length)];

    let result: number;
    switch (op) {
      case "+":
        result = a + b;
        break;
      case "-":
        result = a - b;
        break;
      case "*":
        result = a * b;
        break;
      default:
        result = a + b;
    }

    this.questionCounter++;
    return {
      id: `${uuidv4()}-${this.questionCounter}`,
      problem: `Calculate: ${a} ${op} ${b}`,
      answer: result,
      difficulty,
      createdAt: new Date(),
    };
  }

  private static randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private static findDivisor(num: number): number {
    if (num <= 1) return 1;
    const divisors = [];
    for (let i = 1; i <= Math.sqrt(num); i++) {
      if (num % i === 0) {
        divisors.push(i);
        if (i !== num / i) {
          divisors.push(num / i);
        }
      }
    }
    return divisors[Math.floor(Math.random() * divisors.length)] || 1;
  }

  private static isValidAnswer(result: number): boolean {
    return (
      typeof result === "number" &&
      !isNaN(result) &&
      isFinite(result) &&
      Math.abs(result) < 1000000
    );
  }

  // Generate multiple unique questions
  static generateQuestionSet(
    count: number,
    difficulty: "easy" | "medium" | "hard" = "medium"
  ): Question[] {
    const questions: Question[] = [];
    for (let i = 0; i < count; i++) {
      questions.push(this.generateQuestion(difficulty));
    }
    return questions;
  }

  // Reset question history (useful for testing)
  static resetQuestionHistory(): void {
    this.generatedQuestions.clear();
    this.questionCounter = 0;
  }
}
