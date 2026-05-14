import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { playUser, getStatus } from '../services/api';

export default function GameClient({ onLogout }) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gameInfo, setGameInfo] = useState(null);

  useEffect(() => {
    if (userId) {
      initializeGame();
    }
  }, [userId]);

  const initializeGame = async () => {
    try {
      const [playResult, statusResult] = await Promise.all([
        playUser(parseInt(userId)),
        getStatus()
      ]);
      
      if (playResult.success) {
        const gameIp = statusResult.gameIp || 'localhost';
        setGameInfo({
          userId: playResult.userId,
          sessionKey: playResult.sessionKey,
          gameIp: gameIp
        });
        window.USER_ID = playResult.userId;
        window.SESSION_KEY = playResult.sessionKey;
        window.GAME_IP = gameIp;
        window.CDN_BASE_URL = statusResult.cdnUrl || '';
        
        setTimeout(() => loadFlashClient(), 100);
      }
    } catch (err) {
      console.error('Failed to play:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFlashClient = () => {
    const container = document.getElementById('gameContainer');
    if (!container) {
      console.error('gameContainer not found');
      return;
    }

    const sessionKey = window.SESSION_KEY;
    const gameIp = window.GAME_IP || 'localhost';
    const userId = window.USER_ID;

    if (!sessionKey || !userId) {
      console.error('Missing sessionKey or userId');
      return;
    }

    const apiKey = '410602368996176';

    const flashvars = {
      ApiKey: apiKey,
      SessionIP: gameIp,
      UserId: userId,
      GiftId: '',
      SessionKey: sessionKey,
      SessionSecret: sessionKey,
      Language: '1',
      IsFan: '',
      ServerPort: 5050,
      GameUrl: 'http://go2.igg.com',
      ForJS: '1',
      platform: '1',
      MvpUrl: 'http://go2.igg.com/paybyvip/?fb_sig_user=' + userId,
      CdnBase: window.CDN_BASE_URL || '',
    };

    const params = {
      menu: 'false',
      scale: 'showAll',
      wmode: 'window',
      allowScriptAccess: 'always',
      allowFullScreen: 'true',
    };

    const attributes = {
      id: 'SnsScSWF',
      name: 'SnsScSWF',
      wmode: 'window',
      allowScriptAccess: 'always',
      allowFullScreen: 'true',
    };

    const tryEmbed = () => {
      if (typeof window.swfobject !== 'undefined') {
        console.log('Embedding SWF...');
        window.swfobject.embedSWF(
          '/PreLoader.swf',
          'gameContainer',
          '100%',
          '100%',
          '9.0.0',
          'expressInstall.swf',
          flashvars,
          params,
          attributes
        );
        return true;
      }
      return false;
    };

    if (!tryEmbed()) {
      console.log('swfobject not ready, retrying...');
      let retries = 0;
      const interval = setInterval(() => {
        retries++;
        if (tryEmbed() || retries > 10) {
          clearInterval(interval);
        }
      }, 200);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleBack = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-b from-space-dark to-black">
        <div className="text-space-accent text-xl animate-pulse">Loading game...</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-space-dark to-black">
      <div className="flex items-center justify-between px-6 py-3 bg-space-panel/90 backdrop-blur-sm border-b border-space-border shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-space-dark border border-space-border rounded-lg text-gray-300 hover:text-white hover:border-space-accent transition-all text-sm font-medium"
          >
            Back to Dashboard
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 bg-space-dark border border-space-border rounded-lg text-gray-300 hover:text-white hover:border-space-accent transition-all text-sm font-medium"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>
      
      <div className="flex-1 bg-black">
        <div id="gameContainer" className="w-full h-full"></div>
      </div>
    </div>
  );
}
