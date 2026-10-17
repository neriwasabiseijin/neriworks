"use strict";
// 保存：ベストスコア（通算）、マイランキング（よかったプレイ5件）、チュートリアルを見たかどうか

const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v === null ? def : v; } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const BEST_KEY = "hoshitsubu-best", TUT_KEY = "hoshitsubu-tutorial-seen", RANK_KEY = "hoshitsubu-rank";
const RANK_N = 5;
function loadRank() { try { const a = JSON.parse(store.get(RANK_KEY, "[]")); return Array.isArray(a) ? a.filter(r => r && r.score > 0 && r.picks) : []; } catch { return []; } }
function saveRank(a) { store.set(RANK_KEY, JSON.stringify(a)); }
