import { track } from './analytics';

type LifecycleState = {
  firstSeenDay: string;
  lastSeenDay: string;
  fired?: Record<string, true>;
};

const KEY = 'whatsdot_lifecycle';

function dayStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseDay(s: string) {
  const [y, m, dd] = s.split('-').map((v) => Number(v));
  return new Date(y, (m ?? 1) - 1, dd ?? 1);
}

function daysBetween(a: string, b: string) {
  const da = parseDay(a);
  const db = parseDay(b);
  const ms = db.getTime() - da.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export function initLifecycleTracking({
  uid,
  variant,
}: {
  uid: string;
  variant: 'control' | 'variant';
}) {
  const today = dayStr(new Date());
  try {
    const raw = localStorage.getItem(KEY);
    const prev = raw ? (JSON.parse(raw) as LifecycleState) : null;

    const base: LifecycleState = prev ?? { firstSeenDay: today, lastSeenDay: today, fired: {} };
    const fired = base.fired ?? {};

    if (!fired[`session_${today}`]) {
      fired[`session_${today}`] = true;
      track('session_start', { uid: uid.slice(0, 8), variant });
    }

    const d = daysBetween(base.firstSeenDay, today);
    if (d >= 1 && !fired[`retention_visit_${d}`]) {
      fired[`retention_visit_${d}`] = true;
      track('retention_visit', { uid: uid.slice(0, 8), variant, d });
    }
    if (d === 1 && !fired['retention_d1']) {
      fired['retention_d1'] = true;
      track('retention_d1', { uid: uid.slice(0, 8), variant });
    }
    if (d === 7 && !fired['retention_d7']) {
      fired['retention_d7'] = true;
      track('retention_d7', { uid: uid.slice(0, 8), variant });
    }

    const next: LifecycleState = { ...base, lastSeenDay: today, fired };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return;
  }
}

