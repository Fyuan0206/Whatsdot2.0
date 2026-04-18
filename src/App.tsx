import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { GameView, UserProfile, Blueprint, CompletedWork } from './types';
import { DouyinService } from './services/douyin';
import { BLUEPRINTS } from './constants/blueprints';
import Home from './components/Home';
import Editor from './components/Editor';
import Ironing from './components/Ironing';
import Preview from './components/Preview';
import Vault from './components/Vault';
import Login from './components/Login';
import { Header } from './components/Header';
import { DrawModal } from './components/DrawModal';

export default function App() {
  const [view, setView] = useState<GameView>('home');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentBlueprint, setCurrentBlueprint] = useState<{ blueprint: Blueprint; isRare: boolean } | null>(null);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [activeWork, setActiveWork] = useState<CompletedWork | null>(null);

  // Auth & Profile Logic
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setIsAuthReady(true);
        // Sync user profile
        const userRef = doc(db, 'users', firebaseUser.uid);
        onSnapshot(userRef, async (snap) => {
          if (snap.exists()) {
            setUser(snap.data() as UserProfile);
          } else {
            // New User Initialization
            const newUser: UserProfile = {
              tokens: 1, // First time gift
              lastCheckIn: new Date().toISOString(),
              referralCount: 0
            };
            await setDoc(userRef, newUser);

            // HANDLE REFERRAL
            const params = new URLSearchParams(window.location.search);
            const inviterId = params.get('inviter');
            if (inviterId && inviterId !== firebaseUser.uid) {
              const inviterRef = doc(db, 'users', inviterId);
              const inviterSnap = await getDoc(inviterRef);
              if (inviterSnap.exists()) {
                const inviterData = inviterSnap.data();
                await setDoc(inviterRef, {
                  ...inviterData,
                  tokens: inviterData.tokens + 1,
                  referralCount: (inviterData.referralCount || 0) + 1
                }, { merge: true });
                console.log('Referral rewarded to:', inviterId);
              }
            }
          }
        });
      } else {
        setIsAuthReady(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Daily Check-in Logic
  useEffect(() => {
    if (user && isAuthReady) {
      const today = new Date().toISOString().split('T')[0];
      const last = user.lastCheckIn.split('T')[0];
      if (today !== last) {
        // Daily reward
        const userRef = doc(db, 'users', auth.currentUser!.uid);
        setDoc(userRef, {
          ...user,
          tokens: user.tokens + 1,
          lastCheckIn: new Date().toISOString()
        }, { merge: true });
        DouyinService.showToast('每日奖励：开豆券+1！');
      }
    }
  }, [user, isAuthReady]);

  const handleDraw = async () => {
    // Check for auth first
    if (!auth.currentUser) {
      setIsAuthReady(false);
      return;
    }

    setLoading(true); // Short loading feedback
    
    try {
      if (!user || user.tokens <= 0) {
        setLoading(false);
        const success = await DouyinService.watchAd();
        if (success) {
          // Reward token and auto draw
          await addTokens(1);
          performDraw();
        }
        return;
      }

      await addTokens(-1);
      performDraw();
    } catch (error) {
      console.error('Draw failed', error);
      DouyinService.showToast('抽奖失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const addTokens = async (amount: number) => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(userRef, {
      ...user,
      tokens: (user?.tokens || 0) + amount
    }, { merge: true });
  };

  const performDraw = () => {
    const keys = Object.keys(BLUEPRINTS);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const isRare = Math.random() < 0.2; // 20% rare
    const bp = isRare ? BLUEPRINTS[randomKey].rare : BLUEPRINTS[randomKey].basic;
    
    setCurrentBlueprint({ blueprint: bp, isRare });
    setShowDrawModal(true);
  };

  const startEditor = (bp: Blueprint, isRare: boolean) => {
    setCurrentBlueprint({ blueprint: bp, isRare });
    setView('editor');
    setShowDrawModal(false);
  };

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-yellow-50 font-sans">
      <div className="text-2xl font-bold animate-bounce text-yellow-600">我勒个豆...</div>
    </div>
  );

  if (!isAuthReady) {
    return <Login />;
  }

  return (
    <div className="h-screen w-screen bg-yellow-50 flex flex-col font-sans overflow-hidden">
      <Header 
        tokens={user?.tokens || 0} 
        view={view} 
        onBack={() => setView('home')} 
      />

      <main className="flex-1 overflow-y-auto px-4 pb-12">
        {view === 'home' && (
          <Home onDraw={handleDraw} />
        )}
        
        {view === 'editor' && currentBlueprint && (
          <Editor 
            blueprint={currentBlueprint.blueprint} 
            isRare={currentBlueprint.isRare}
            onComplete={(work) => {
              setActiveWork(work);
              setView('ironing');
            }}
          />
        )}

        {view === 'ironing' && activeWork && (
          <Ironing 
            work={activeWork} 
            onFinish={() => setView('preview')} 
          />
        )}

        {view === 'preview' && activeWork && (
          <Preview 
            work={activeWork} 
            onReward={() => addTokens(1)}
            onDone={() => setView('vault')}
          />
        )}

        {view === 'vault' && (
          <Vault onDraw={() => setView('home')} />
        )}
      </main>

      {showDrawModal && currentBlueprint && (
        <DrawModal 
          blueprint={currentBlueprint.blueprint}
          isRare={currentBlueprint.isRare}
          onStart={(bp, rare) => startEditor(bp, rare)}
          onClose={() => setShowDrawModal(false)}
        />
      )}
    </div>
  );
}
