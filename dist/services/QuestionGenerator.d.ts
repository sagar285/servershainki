import { Question } from "../types";
export declare class QuestionGenerator {
    private static readonly QUESTION_TYPES;
    private static readonly DIFFICULTY_CONFIG;
    private static generatedQuestions;
    private static questionCounter;
    static generateQuestion(difficulty?: "easy" | "medium" | "hard"): Question;
    private static getRandomQuestionType;
    private static generateQuestionByType;
    private static generateArithmetic;
    private static generateAlgebra;
    private static generateFractions;
    private static generatePercentages;
    private static generatePowers;
    private static generateMixed;
    private static generateArithmeticExpression;
    private static generateSimpleArithmetic;
    private static randomNumber;
    private static findDivisor;
    private static isValidAnswer;
    static generateQuestionSet(count: number, difficulty?: "easy" | "medium" | "hard"): Question[];
    static resetQuestionHistory(): void;
}
//# sourceMappingURL=QuestionGenerator.d.ts.map