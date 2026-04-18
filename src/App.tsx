import React, { useState, useEffect, useMemo } from 'react';
import { getGuestId, loadProfile, saveProfile, loadWorks, saveWorks } from './lib/localGuest';
import { GameView, UserProfile, Blueprint, CompletedWork, LuckyCritReward, Rarity } from './types';
import { DouyinService } from './services/douyin';
import { BLUEPRINTS, getRandomRarity } from './constants/blueprints';
import Home from './components/Home';
import Editor from './components/Editor';
import Ironing from './components/Ironing';
import Preview from './components/Preview';
import Vault from './components/Vault';
import CollectionRoom from './components/CollectionRoom';
import { Header } from './components/Header';
import { DrawModal } from './components/DrawModal';
import { getVariant } from './lib/ab';
import { track } from './lib/analytics';
import { initLifecycleTracking } from './lib/lifecycle';
import { PERF_TIER } from './lib/perf';

import { AnnouncementTicker } from './components/AnnouncementTicker';
import { publishAnnouncement, subscribeAnnouncements } from './services/announcements';

const h5ShellClass =
  'box-border min-h-[100dvh] h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-yellow-50 flex flex-col font-sans overflow-hidden ' +
  'pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]';

export default function App() {
  const guestId = useMemo(() => getGuestId(), []);
  const variant = useMemo(() => getVariant('loot_vfx_v1', guestId), [guestId]);
  const enableEnhanced = variant === 'variant';
  const initialProfile = useMemo(() => loadProfile(), []);
  const [view, setView] = useState<GameView>('home');
  const [user, setUser] = useState<UserProfile>(() => initialProfile);
  const [works, setWorks] = useState<CompletedWork[]>(() => loadWorks());
  const [loading, setLoading] = useState(false);
  const [currentBlueprint, setCurrentBlueprint] = useState<{ blueprint: Blueprint; rarity: Rarity } | null>(null);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [activeWork, setActiveWork] = useState<CompletedWork | null>(null);
  const [drawPityHit, setDrawPityHit] = useState(false);
  const [drawPityDisplay, setDrawPityDisplay] = useState(0);
  const [drawCritRewards, setDrawCritRewards] = useState<LuckyCritReward[]>([]);
  const [announcements, setAnnouncements] = useState<{ id: string; createdAt: number; userLabel: string; blueprintId: string; blueprintName: string; rarity: Rarity }[]>([]);

  useEffect(() => {
    initLifecycleTracking({ uid: guestId, variant });
  }, [guestId, variant]);

  useEffect(() => {
    setUser((prev) => {
      const today = new Date().toISOString().split('T')[0];
      const last = prev.lastCheckIn.split('T')[0];
      if (today === last) return prev;
      const next = {
        ...prev,
        tokens: prev.tokens + 1,
        lastCheckIn: new Date().toISOString(),
      };
      saveProfile(next);
      DouyinService.showToast('每日奖励：开豆券+1！');
      return next;
    });
  }, []);

  useEffect(() => {
    if (!enableEnhanced) return;
    const unsub = subscribeAnnouncements((items) => {
      setAnnouncements((prev) => {
        const merged = [...items, ...prev];
        const seen = new Set<string>();
        const uniq = merged.filter((a) => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        });
        return uniq.slice(0, 20);
      });
    });
    return () => unsub();
  }, [enableEnhanced]);

  const handleDraw = async () => {
    setLoading(true);

    try {
      track('draw_click', { variant });
      if (user.tokens <= 0) {
        setLoading(false);
        track('ad_watch_start', { variant, reason: 'no_tokens' });
        const success = await DouyinService.watchAd();
        track(success ? 'ad_watch_success' : 'ad_watch_fail', { variant, reason: 'no_tokens' });
        if (success) {
          const next = { ...user, tokens: user.tokens + 1 };
          setUser(next);
          saveProfile(next);
          performDraw(next);
        }
        return;
      }

      const next = { ...user, tokens: user.tokens - 1 };
      setUser(next);
      saveProfile(next);
      performDraw(next);
    } catch (error) {
      console.error('Draw failed', error);
      DouyinService.showToast('抽奖失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const addTokens = (amount: number) => {
    setUser((prev) => {
      const next = { ...prev, tokens: prev.tokens + amount };
      saveProfile(next);
      return next;
    });
  };

  const performDraw = (baseUser: UserProfile) => {
    const keys = Object.keys(BLUEPRINTS);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const pityProgress = baseUser.pityProgress ?? 0;
    const pityHit = enableEnhanced && pityProgress >= 98;
    const rolled = pityHit ? rollHighRarity() : getRandomRarity();
    const bp = BLUEPRINTS[randomKey][rolled];

    const { nextProfile, critRewards } = enableEnhanced ? rollLuckyCrit(baseUser) : { nextProfile: baseUser, critRewards: [] as LuckyCritReward[] };
    const nextPityProgress = enableEnhanced ? (pityHit ? 0 : Math.min(98, pityProgress + 1)) : pityProgress;
    const displayPity = enableEnhanced ? (pityHit ? 99 : Math.min(99, pityProgress + 1)) : pityProgress;
    const nextBoxes = (nextProfile.boxesOpened ?? 0) + 1;

    const updated: UserProfile = { ...nextProfile, pityProgress: nextPityProgress, boxesOpened: nextBoxes, perfTier: PERF_TIER };
    setUser(updated);
    saveProfile(updated);

    setDrawPityHit(pityHit);
    setDrawPityDisplay(displayPity);
    setDrawCritRewards(critRewards);
    track('draw_result', { variant, rarity: rolled, pityHit, crit: critRewards.length > 0 });
    if (pityHit) track('pity_hit', { variant });
    if (critRewards.length > 0) track('lucky_crit', { variant, rewards: critRewards.map((r) => r.kind) });

    if (enableEnhanced && (rolled === 'gold' || rolled === 'red')) {
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const userLabel = `玩家${guestId.slice(0, 4)}`;
      const item = { id, createdAt: Date.now(), userLabel, blueprintId: bp.id, blueprintName: bp.name, rarity: rolled };
      setAnnouncements((prev) => [item, ...prev].slice(0, 20));
      publishAnnouncement({ userLabel, blueprintId: bp.id, blueprintName: bp.name, rarity: rolled }).then(() => {
        track('announcement_publish', { variant, rarity: rolled });
      }).catch(() => {
        return;
      });
    }

    setCurrentBlueprint({ blueprint: bp, rarity: rolled });
    setShowDrawModal(true);
  };

  const startEditor = (bp: Blueprint, rarity: Rarity) => {
    setCurrentBlueprint({ blueprint: bp, rarity });
    setView('editor');
    setShowDrawModal(false);
  };

  const handleWorkComplete = (work: CompletedWork) => {
    setWorks((prev) => {
      const next = [work, ...prev];
      saveWorks(next);
      return next;
    });
    setActiveWork(work);
    setView('ironing');
  };

  const handleIroningFinish = (work: CompletedWork) => {
    setActiveWork(work);
    setWorks((prev) => {
      const next = prev.map((w) => (w.id === work.id ? { ...w, ...work } : w));
      saveWorks(next);
      return next;
    });
    setView('preview');
  };

  const handleIroningFail = () => {
    if (!activeWork) return;
    const id = activeWork.id;
    setWorks((prev) => {
      const next = prev.filter((w) => w.id !== id);
      saveWorks(next);
      return next;
    });
    setActiveWork(null);
    setView('home');
  };

  const handleDeleteWork = (workId: string) => {
    setWorks((prev) => {
      const next = prev.filter((w) => w.id !== workId);
      saveWorks(next);
      return next;
    });
    track('vault_delete_work', { variant });
  };

  if (loading) {
    return (
      <div className={`${h5ShellClass} items-center justify-center`}>
        <div className="text-2xl font-bold animate-bounce text-yellow-600">我勒个豆...</div>
      </div>
    );
  }

  return (
    <div className={h5ShellClass}>
      {enableEnhanced && <AnnouncementTicker items={announcements} />}
      <Header
        tokens={user.tokens}
        view={view}
        onBack={() => setView('home')}
        onVault={() => setView('vault')}
        onCollection={() => setView('collection')}
        activeTitle={user.activeTitle || ''}
      />

      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-12">
        {view === 'home' && (
          <Home
            onDraw={handleDraw}
            pityProgress={user.pityProgress ?? 0}
            enableEnhanced={enableEnhanced}
          />
        )}

        {view === 'editor' && currentBlueprint && (
          <Editor
            guestUid={guestId}
            blueprint={currentBlueprint.blueprint}
            rarity={currentBlueprint.rarity}
            onComplete={handleWorkComplete}
          />
        )}

        {view === 'ironing' && activeWork && (
          <Ironing work={activeWork} onFinish={handleIroningFinish} onFail={handleIroningFail} />
        )}

        {view === 'preview' && activeWork && (
          <Preview
            work={activeWork}
            onReward={() => addTokens(1)}
            onDone={() => setView('vault')}
          />
        )}

        {view === 'vault' && (
          <Vault works={works} onDraw={() => setView('home')} onDeleteWork={handleDeleteWork} />
        )}

        {view === 'collection' && <CollectionRoom works={works} onBack={() => setView('home')} />}
      </main>

      {showDrawModal && currentBlueprint && (
        <DrawModal
          blueprint={currentBlueprint.blueprint}
          rarity={currentBlueprint.rarity}
          pityProgress={drawPityDisplay}
          pityHit={drawPityHit}
          perfTier={PERF_TIER}
          enableEnhanced={enableEnhanced}
          luckyCritRewards={drawCritRewards}
          onStart={(bp, rarity) => startEditor(bp, rarity)}
          onClose={() => setShowDrawModal(false)}
        />
      )}

    </div>
  );
}

function rollHighRarity(): Rarity {
  return Math.random() < 0.18 ? 'red' : 'gold';
}

function rollLuckyCrit(user: UserProfile): { nextProfile: UserProfile; critRewards: LuckyCritReward[] } {
  const chance = 0.12;
  if (Math.random() >= chance) return { nextProfile: user, critRewards: [] };

  const rewards: LuckyCritReward[] = [];
  const r = Math.random();
  if (r < 0.6) {
    const amount = Math.random() < 0.5 ? 1 : 2;
    rewards.push({ kind: 'tokens', amount });
    const next = { ...user, tokens: user.tokens + amount };
    return { nextProfile: next, critRewards: rewards };
  }

  const hours = 6;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  rewards.push({ kind: 'title', title: '欧皇降临', expiresAt });
  const next = { ...user, activeTitle: '欧皇降临', activeTitleExpiresAt: expiresAt };
  return { nextProfile: next, critRewards: rewards };
}
