import { initializeApp } from 'firebase/app';
import { getFirestore, addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { Rarity } from '../types';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export type Announcement = {
  id: string;
  createdAt: number;
  userLabel: string;
  blueprintId: string;
  blueprintName: string;
  rarity: Rarity;
};

function enabled(): boolean {
  return (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_ENABLE_GLOBAL_ANNOUNCEMENTS === 'true';
}

export async function publishAnnouncement(a: Omit<Announcement, 'id' | 'createdAt'>) {
  if (!enabled()) return;
  await addDoc(collection(db, 'announcements'), {
    ...a,
    createdAt: serverTimestamp(),
  });
}

export function subscribeAnnouncements(onItems: (items: Announcement[]) => void): () => void {
  if (!enabled()) return () => {};
  try {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(20));
    return onSnapshot(q, (snap) => {
      const list: Announcement[] = [];
      snap.forEach((d) => {
        const data = d.data() as {
          createdAt?: { toMillis?: () => number } | null;
          userLabel?: string;
          blueprintId?: string;
          blueprintName?: string;
          rarity?: Rarity;
        };
        list.push({
          id: d.id,
          createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
          userLabel: data.userLabel ?? '玩家',
          blueprintId: data.blueprintId ?? '',
          blueprintName: data.blueprintName ?? '',
          rarity: (data.rarity ?? 'green') as Rarity,
        });
      });
      onItems(list);
    });
  } catch {
    return () => {};
  }
}

