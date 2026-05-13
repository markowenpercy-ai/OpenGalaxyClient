import { useEffect, useRef, useState } from 'react';

export default function GameClient({ user, onLogout, onBack }) {
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFlashClient();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const loadFlashClient = () => {
    const container = document.getElementById('gameContainer');
    if (!container) {
      console.error('gameContainer not found');
      return;
    }

    const userId = window.USER_ID;
    const sessionKey = window.SESSION_KEY;
    const gameIp = window.GAME_IP || 'localhost';

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
      scale: 'noScale',
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

    if (typeof window.swfobject !== 'undefined') {
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
    } else {
      console.error('SWFObject not loaded');
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

  return (
    <div ref={containerRef} className="h-screen flex flex-col bg-gradient-to-b from-space-dark to-black">
      <div className="flex items-center justify-between px-6 py-3 bg-space-panel/90 backdrop-blur-sm border-b border-space-border shadow-lg">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-space-accent to-cyan-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{user?.username?.charAt(0).toUpperCase() || 'P'}</span>
            </div>
            <div>
              <h2 className="text-white font-semibold">{user?.username || 'Player'}</h2>
              <p className="text-xs text-gray-400">Level {user?.level || 1}</p>
            </div>
          </div>
          
          <div className="h-8 w-px bg-space-border" />
          
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-yellow-400 font-medium text-sm">{user?.resources?.gold?.toLocaleString() || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-gray-300 font-medium text-sm">{user?.resources?.metal?.toLocaleString() || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-cyan-400 font-medium text-sm">{user?.resources?.he3?.toLocaleString() || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="text-purple-400 font-medium text-sm">{user?.resources?.vouchers?.toLocaleString() || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-pink-400" />
              <span className="text-pink-400 font-medium text-sm">
                {user?.resources?.mallPoints?.toLocaleString() || user?.resources?.mall_points?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-space-dark border border-space-border rounded-lg
                       text-gray-300 hover:text-white hover:border-space-accent transition-all duration-200 text-sm font-medium"
          >
            Back to Menu
          </button>
          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 bg-space-dark border border-space-border rounded-lg
                       text-gray-300 hover:text-white hover:border-space-accent transition-all duration-200 text-sm font-medium"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-500/10 border border-red-500/50 rounded-lg
                       text-red-400 hover:bg-red-500/20 transition-all duration-200 text-sm font-medium"
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
