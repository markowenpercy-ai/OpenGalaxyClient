import { useState } from 'react';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import { useRandomBackground } from '../hooks/useRandomBackground';

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const background = useRandomBackground();

  const handleSuccess = () => {
    if (mode === 'login') {
      onLogin();
    } else {
      setMode('login');
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ 
        backgroundImage: `url(${background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-space-dark/90 via-space-dark/70 to-space-dark/90" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-space-accent/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>
      
      <div className="relative w-full max-w-lg z-10">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold glow-text text-space-accent mb-2">
            OpenGalaxy
          </h1>
          <p className="text-gray-400">Command the Stars</p>
        </div>

        <div className="bg-space-panel/90 backdrop-blur-md border border-space-border rounded-2xl p-8 glow-box shadow-2xl">
          {mode === 'login' ? (
            <LoginForm 
              onSwitch={() => setMode('register')} 
              onSuccess={handleSuccess}
            />
          ) : (
            <RegisterForm 
              onSwitch={() => setMode('login')} 
              onSuccess={handleSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}
