import React, { useState } from 'react';
import { auth } from '../utils/storage';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { Disc, ArrowRight } from 'lucide-react';

interface LoginProps {
  setUser: (user: UserProfile) => void;
}

export const Login: React.FC<LoginProps> = ({ setUser }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
        setError('请输入用户名和密码');
        return;
    }

    let user: UserProfile | null = null;

    if (isRegister) {
        user = auth.register(username, password);
        if (!user) setError('用户名已存在');
    } else {
        user = auth.login(username, password);
        if (!user) setError('用户名或密码错误');
    }

    if (user) {
        setUser(user);
        navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-purple-900/10 pointer-events-none" />
        
        <div className="z-10 w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl animate-fade-in">
            <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                    <Disc size={32} className="text-white animate-spin-slow" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Music Bar OS</h1>
                <p className="text-zinc-500 text-sm mt-1">智能音乐中控系统</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wider ml-1 mb-1 block">账号</label>
                    <input 
                        type="text" 
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition-all"
                        placeholder="Username"
                    />
                </div>
                <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wider ml-1 mb-1 block">密码</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition-all"
                        placeholder="Password"
                    />
                </div>

                {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                <button 
                    type="submit" 
                    className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center space-x-2 mt-2"
                >
                    <span>{isRegister ? '注册并登录' : '登 录'}</span>
                    <ArrowRight size={16} />
                </button>
            </form>

            <div className="mt-6 text-center">
                <button 
                    onClick={() => { setIsRegister(!isRegister); setError(''); }}
                    className="text-zinc-500 text-xs hover:text-white transition-colors border-b border-transparent hover:border-zinc-500 pb-0.5"
                >
                    {isRegister ? '已有账号？点此登录' : '创建新账号'}
                </button>
            </div>
        </div>
    </div>
  );
};