"use strict";
// localStorage（使えない環境でも止まらない）

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const BEST_KEY = "hanabi-best", CHAIN_KEY = "hanabi-best-chain";
