import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestion {
  text: string;
  options: string[];
  correctIndex: number;
}

export interface IPlayer {
  nickname: string;
  socketId: string | null; // Nullable for disconnected players
  score: number;
  hasAnsweredCurrent: boolean;
}

export interface IRoom extends Document {
  roomCode: string;
  hostToken: string;
  hostSocketId?: string;
  status: 'lobby' | 'playing' | 'finished';
  currentQuestionIndex: number;
  timerDuration: number;
  questions: IQuestion[];
  players: IPlayer[];
  createdAt: Date;
}

const PlayerSchema = new Schema<IPlayer>({
  nickname: { type: String, required: true, maxlength: 30 },
  socketId: { type: String, default: null }, // Null means disconnected
  score: { type: Number, default: 0 },
  hasAnsweredCurrent: { type: Boolean, default: false }
}, { _id: false });

const QuestionSchema = new Schema<IQuestion>({
  text: { type: String, required: true },
  options: { 
    type: [String], 
    validate: [
      (val: string[]) => val.length === 4, 
      '{PATH} must have exactly 4 options'
    ] 
  },
  correctIndex: { type: Number, required: true, min: 0, max: 3 }
}, { _id: false });

const RoomSchema = new Schema<IRoom>({
  roomCode: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    length: 4 
  },
  hostToken: { type: String, required: true },
  hostSocketId: { type: String },
  status: { 
    type: String, 
    enum: ['lobby', 'playing', 'finished'], 
    default: 'lobby' 
  },
  currentQuestionIndex: { type: Number, default: -1 },
  timerDuration: { type: Number, default: 30 },
  questions: {
    type: [QuestionSchema],
    validate: [
      (val: IQuestion[]) => val.length === 5, 
      '{PATH} must contain exactly 5 questions'
    ]
  },
  players: {
    type: [PlayerSchema],
    default: []
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    expires: 86400 // 24-hour TTL. Mongo automatically deletes documents where createdAt is older than 86400s
  }
});

export const RoomModel = mongoose.model<IRoom>('Room', RoomSchema);
