type EventName =
  | 'session_start'
  | 'retention_visit'
  | 'retention_d1'
  | 'retention_d7'
  | 'draw_click'
  | 'draw_result'
  | 'draw_upgrade_ad'
  | 'ad_watch_start'
  | 'ad_watch_success'
  | 'ad_watch_fail'
  | 'loot_opening_shown'
  | 'rare_opening_shown'
  | 'legendary_opening_shown'
  | 'pity_card_shown'
  | 'crit_shown'
  | 'world_channel_open'
  | 'world_channel_close'
  | 'lucky_crit'
  | 'pity_hit'
  | 'announcement_publish';

type EventRecord = {
  name: EventName;
  ts: number;
  props?: Record<string, unknown>;
};

const KEY = 'whatsdot_events';

export function track(name: EventName, props?: Record<string, unknown>) {
  const rec: EventRecord = { name, ts: Date.now(), props };
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as EventRecord[]) : [];
    arr.push(rec);
    const trimmed = arr.length > 2000 ? arr.slice(arr.length - 2000) : arr;
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    return;
  }
}
