import mongoose, { Schema, Document } from "mongoose";

export interface IUser {
  username: string;
  email?: string;
  highScore: number;
  gamesWon: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDocument extends Omit<IUser, "id">, Document {
  id: string;
}

const userSchema = new Schema<UserDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 20,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
    },
    highScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    gamesWon: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        const transformed = ret as any;
        transformed.id = transformed._id.toString();
        delete transformed._id;
        delete transformed.__v;
        return transformed;
      },
    },
  }
);

// Index for leaderboard queries
userSchema.index({ highScore: -1, gamesWon: -1 });

export const UserModel = mongoose.model<UserDocument>("User", userSchema);
