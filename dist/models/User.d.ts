import mongoose, { Document } from "mongoose";
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
export declare const UserModel: mongoose.Model<UserDocument, {}, {}, {}, mongoose.Document<unknown, {}, UserDocument, {}, {}> & UserDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=User.d.ts.map