import React from 'react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { motion } from 'motion/react';
import { Box, LogIn } from 'lucide-react';

export default function Login() {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed', error);
      alert('登录失败，请检查网络后再试。');
    }
  };

  return (
    <div className="h-screen w-screen bg-yellow-50 flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-48 h-48 icon-box-primary mb-8"
      >
        <Box size={100} className="text-white drop-shadow-2xl z-10" />
      </motion.div>

      <h1 className="text-4xl font-black text-yellow-900 mb-2 tracking-tighter">我勒个豆</h1>
      <p className="text-yellow-700 font-medium mb-12">像素风盲盒拼豆小游戏</p>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleLogin}
        className="flex items-center gap-3 px-8 py-4 bg-white text-yellow-900 font-black rounded-2xl shadow-xl border-b-8 border-gray-200 active:border-b-0 transition-all"
      >
        <LogIn size={24} />
        使用 Google 账号登录
      </motion.button>
      
      <p className="mt-8 text-xs text-yellow-600/60 max-w-xs">
        点击登录即表示您同意我们的服务条款和隐私政策。
      </p>
    </div>
  );
}
