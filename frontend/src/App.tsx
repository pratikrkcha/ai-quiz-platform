import { useEffect } from 'react';
import { Route, Switch } from 'wouter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useSocket } from './hooks/useSocket';
import { useGameStore } from './store/useGameStore';

// Import actual components
import { LandingPage } from './pages/LandingPage';
import { JoinPage } from './pages/JoinPage';
import { HostView } from './pages/HostView';
import { PlayerView } from './pages/PlayerView';
import { Footer } from './components/Footer';

const NotFound = () => (
  <div className="flex-1 flex items-center justify-center p-6 font-patrick text-ink">
    <div className="max-w-md w-full bg-white border-[3px] border-ink p-8 rounded-wobbly shadow-[8px_8px_0px_0px_#2d2d2d] text-center">
      <h1 className="font-kalam text-5xl text-accent mb-4 -rotate-2">404</h1>
      <p className="text-2xl font-bold mb-6">Page Not Found</p>
      <a href="/" className="inline-block bg-[#fff9c4] border-[3px] border-ink py-3 px-6 text-2xl font-bold rounded-wobbly shadow-[4px_4px_0px_0px_#2d2d2d] hover:bg-bluepen hover:text-white transition-colors">
        Go Home
      </a>
    </div>
  </div>
);

// Global Socket Listener Component
const GlobalSocketListener = () => {
  const { subscribe } = useSocket();
  const { 
    updateLeaderboard, startQuestion, closeQuestion, endGame, 
    socketConnected, roomCode 
  } = useGameStore();

  useEffect(() => {
    const unsubJoined = subscribe('player_joined', (data) => updateLeaderboard(data.players));
    const unsubQStart = subscribe('question_started', (data) => startQuestion(data));
    const unsubQClosed = subscribe('question_closed', (data) => closeQuestion(data.correctIndex, data.leaderboard));
    const unsubOver = subscribe('game_over', (data) => endGame(data.finalLeaderboard));
    const unsubUpdate = subscribe('leaderboard_update', (data) => updateLeaderboard(data.leaderboard));
    
    return () => {
      unsubJoined(); unsubQStart(); unsubQClosed(); unsubOver(); unsubUpdate();
    };
  }, [subscribe, updateLeaderboard, startQuestion, closeQuestion, endGame]);

  // If we've started playing but the socket drops, show an indicator
  if (!socketConnected && roomCode) {
    return (
      <div className="fixed bottom-4 right-4 bg-accent text-white px-4 py-2 font-patrick font-bold border-2 border-ink shadow-[4px_4px_0px_0px_#2d2d2d] z-50 rounded-wobbly animate-pulse">
        Reconnecting to game server...
      </div>
    );
  }

  return null;
};


const App = () => {
  return (
    <ErrorBoundary>
      <div className="flex flex-col min-h-screen">
        <GlobalSocketListener />
        <main className="flex-1 flex flex-col">
          <Switch>
            <Route path="/" component={LandingPage} />
            <Route path="/host/:roomCode" component={HostView} />
            <Route path="/join" component={JoinPage} />
            <Route path="/play/:roomCode" component={PlayerView} />
            <Route component={NotFound} />
          </Switch>
        </main>
        <Footer />
      </div>
    </ErrorBoundary>
  );
};

export default App;
