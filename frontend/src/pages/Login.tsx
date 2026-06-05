import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Mock simulation
    setTimeout(() => {
      setLoading(false);
      navigate('/dashboard');
    }, 1000);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-aura-bg overflow-hidden p-4">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-aura-mint/10 blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-aura-lavender/10 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-sm glass-card p-8 z-10 relative">
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="w-14 h-14 bg-gradient-to-tr from-aura-lavender to-aura-mint rounded-2xl flex items-center justify-center mb-6 aura-glow-mint">
            <Sparkles className="w-7 h-7 text-aura-bg" />
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2 font-poppins">
            Aura
          </h1>
          <p className="text-gray-400 font-medium text-sm">Tu Zen Financiero</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1" htmlFor="username">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl bg-aura-surface/50 border border-aura-border text-white focus:ring-2 focus:ring-aura-mint/50 focus:border-aura-mint outline-none transition-all placeholder:text-gray-600"
              placeholder="basu / juli"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl bg-aura-surface/50 border border-aura-border text-white focus:ring-2 focus:ring-aura-mint/50 focus:border-aura-mint outline-none transition-all placeholder:text-gray-600"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full aura-btn-primary flex justify-center items-center h-14 mt-8 group"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-aura-bg/30 border-t-aura-bg rounded-full animate-spin" />
            ) : (
              <div className="flex items-center gap-2">
                <span>Acceder</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
