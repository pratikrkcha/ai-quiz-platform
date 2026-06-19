import { create } from 'zustand';

type RoomStatus = 'idle' | 'lobby' | 'playing' | 'finished';

interface GameState {
  // Connection state
  socketConnected: boolean;
  socketError: string | null;
  
  // Game identity
  isHost: boolean;
  roomCode: string | null;
  hostToken: string | null;
  nickname: string | null;
  
  // Game state
  status: RoomStatus;
  questionCount: number;
  leaderboard: { nickname: string; score: number }[];
  currentQuestion: { index: number; text: string; options: string[]; timeLimitMs: number } | null;
  
  // Player specific state
  score: number;
  hasAnsweredCurrent: boolean;
  answerResult: { correct: boolean; points: number; correctIndex?: number } | null;
  correctAnswerIndex: number | null; // Global reveal when question closes
  
  // Actions
  setConnectionStatus: (connected: boolean, error: string | null) => void;
  setHostRole: (roomCode: string, hostToken: string, questionCount: number) => void;
  setPlayerRole: (roomCode: string, nickname: string, initialScore: number, questionCount: number) => void;
  setRoomStatus: (status: RoomStatus) => void;
  updateLeaderboard: (leaderboard: { nickname: string; score: number }[]) => void;
  startQuestion: (q: { questionIndex: number; text: string; options: string[]; timeLimitMs: number }) => void;
  submitAnswerSuccess: (result: { correct: boolean; points: number; correctIndex?: number }) => void;
  closeQuestion: (correctIndex: number, leaderboard: { nickname: string; score: number }[]) => void;
  endGame: (finalLeaderboard: { nickname: string; score: number }[]) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  socketConnected: false,
  socketError: null,
  
  isHost: false,
  roomCode: null,
  hostToken: null,
  nickname: null,
  
  status: 'idle',
  questionCount: 0,
  leaderboard: [],
  currentQuestion: null,
  
  score: 0,
  hasAnsweredCurrent: false,
  answerResult: null,
  correctAnswerIndex: null,
  
  setConnectionStatus: (connected, error) => set({ socketConnected: connected, socketError: error }),
  
  setHostRole: (roomCode, hostToken, questionCount) => set({ 
    isHost: true, roomCode, hostToken, questionCount, status: 'lobby' 
  }),
  
  setPlayerRole: (roomCode, nickname, initialScore, questionCount) => set({ 
    isHost: false, roomCode, nickname, score: initialScore, status: 'lobby', questionCount 
  }),
  
  setRoomStatus: (status) => set({ status }),
  
  updateLeaderboard: (leaderboard) => set({ leaderboard }),
  
  startQuestion: (q) => set({ 
    status: 'playing', 
    currentQuestion: { index: q.questionIndex, text: q.text, options: q.options, timeLimitMs: q.timeLimitMs },
    hasAnsweredCurrent: false,
    answerResult: null,
    correctAnswerIndex: null
  }),
  
  submitAnswerSuccess: (result) => set((state) => ({ 
    hasAnsweredCurrent: true, 
    answerResult: result,
    score: state.score + result.points
  })),
  
  closeQuestion: (correctIndex, leaderboard) => set({ 
    correctAnswerIndex: correctIndex, 
    leaderboard 
  }),
  
  endGame: (finalLeaderboard) => set({ 
    status: 'finished', 
    leaderboard: finalLeaderboard,
    currentQuestion: null 
  }),
  
  resetGame: () => set({
    isHost: false, roomCode: null, hostToken: null, nickname: null, status: 'idle',
    questionCount: 0, leaderboard: [], currentQuestion: null, score: 0,
    hasAnsweredCurrent: false, answerResult: null, correctAnswerIndex: null
  })
}));
