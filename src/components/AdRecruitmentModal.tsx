import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Megaphone } from 'lucide-react';

interface AdRecruitmentModalProps {
  open: boolean;
  onClose: () => void;
  /** 点「继续开豆」：因无广告商，跳过广告直接免费开一次豆 */
  onContinue: () => void;
}

/** 广告位占位弹窗：真实广告商未入驻前，点「看广告开豆」展示这个。 */
export default function AdRecruitmentModal({ open, onClose, onContinue }: AdRecruitmentModalProps) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ad-recruitment-title"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 20, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border-4 border-amber-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Megaphone size={28} strokeWidth={2.2} />
            </div>
            <h2
              id="ad-recruitment-title"
              className="text-center text-lg font-black text-amber-900"
            >
              广告位招募中
            </h2>
            <p className="mt-3 text-center text-sm text-gray-700 leading-relaxed">
              本游戏暂无广告商入驻，看广告开豆功能还没上线。
            </p>
            <p className="mt-2 text-center text-xs text-gray-500 leading-relaxed">
              想合作投放 / 品牌联名？欢迎联系运营同学 ✨
            </p>
            <p className="mt-3 text-center text-[11px] font-bold text-amber-600">
              既然没广告，那就直接送一次免费开豆吧！
            </p>

            <button
              type="button"
              onClick={onContinue}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 min-h-[44px] rounded-2xl bg-amber-500 py-3 text-base font-black text-white shadow-md border-b-4 border-amber-700 active:scale-[0.98]"
            >
              继续开豆
              <ArrowRight size={18} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 inline-flex w-full items-center justify-center min-h-[40px] rounded-2xl bg-transparent py-2 text-xs font-bold text-gray-500 active:scale-[0.98]"
            >
              下次再说
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
