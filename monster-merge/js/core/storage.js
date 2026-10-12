"use strict";
// localStorage wrapper that never throws (private mode, blocked storage).

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const bestKey = "marumon-best";
