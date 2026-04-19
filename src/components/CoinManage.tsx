import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Calendar, Coins, Share2, Video, Wrench } from 'lucide-react';
import { cn } from '../lib/utils';
import type { UserProfile } from '../types';

interface CoinManageProps {
  user: UserProfile;
  onDevGrant: (amount: number) => void;
  onWatchAd: () => void;
  onBack: () => void;
}

export default function CoinManage({ user, onDevGrant, onWatchAd, onBack }: CoinManageProps) {
  const today = new Date().toISOString().split('T')[0];
  const last = user.lastCheckIn.split('T')[0];
  const checkedInToday = today === last;

  return (
    <div className="flex flex-col gap-5 max-w-md mx-auto w-full">
      <div>
        <h2 className="text-2xl font-black text-yellow-900 flex items-center gap-2">
          <Coins size={24} className="text-yellow-600" aria-hidden />
          豆币管理
        </h2>
      </div>

      {/* 余额大卡 */}
      <div className="rounded-[2rem] bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-400 p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-4 -top-4 text-white/10">
          <Coins size={128} strokeWidth={1.6} />
        </div>
        <div className="relative z-10">
          <div className="text-xs font-bold tracking-widest opacity-90">当前余额</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-5xl font-black tabular-nums drop-shadow-sm">{user.coins}</span>
            <span className="text-sm font-black opacity-90">豆币</span>
          </div>
        </div>
      </div>

      {/* 获得方式 */}
      <section className="bg-white rounded-[2rem] p-4 shadow-sm border-2 border-amber-100 space-y-3">
        <h3 className="text-sm font-black text-amber-800 px-1">获得豆币</h3>

        <EarnRow
          icon={<Calendar size={20} />}
          title="每日签到"
          status={checkedInToday ? 'done' : 'pending'}
        />

        <EarnRow
          icon={<Video size={20} />}
          title="看广告获得"
          actionLabel="去看广告"
          onAction={onWatchAd}
        />

        <EarnRow
          icon={<Share2 size={20} />}
          title="分享作品"
          status="pending"
        />

        <EarnRow
          icon={<Wrench size={20} />}
          title="调试 · 手动 +10"
          actionLabel="+10"
          onAction={() => onDevGrant(10)}
          highlight
        />
      </section>

      <button
        type="button"
        onClick={onBack}
        className="mx-auto mt-2 px-6 py-2 text-sm font-bold text-yellow-800 bg-white rounded-full border-2 border-yellow-200 shadow-sm active:scale-95"
      >
        返回首页
      </button>
    </div>
  );
}

function EarnRow({
  icon,
  title,
  actionLabel,
  onAction,
  status,
  highlight,
}: {
  icon: ReactNode;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  status?: 'done' | 'pending';
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl p-3 border',
        highlight ? 'bg-amber-50 border-amber-200' : 'bg-gray-50/60 border-gray-100',
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          highlight ? 'bg-amber-100 text-amber-700' : 'bg-white text-gray-500 border border-gray-100',
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-gray-900">{title}</div>
      </div>
      {onAction ? (
        <motion.button
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={onAction}
          className={cn(
            'shrink-0 px-3 h-8 rounded-full text-xs font-black border-2 shadow-sm',
            highlight
              ? 'bg-amber-500 text-white border-amber-600'
              : 'bg-white text-amber-700 border-amber-300 hover:border-amber-500',
          )}
        >
          {actionLabel}
        </motion.button>
      ) : status === 'done' ? (
        <span className="shrink-0 text-[11px] font-black text-emerald-600">已完成</span>
      ) : (
        <span className="shrink-0 text-[11px] font-bold text-gray-400">待触发</span>
      )}
    </div>
  );
}
