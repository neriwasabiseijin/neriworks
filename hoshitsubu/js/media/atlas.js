"use strict";
// キャラのアトラス（assets/chars.webp ＋ chars.json）。形式は _work/atlas-format.md。
// 胴体はその場で描き（回さない）、尾は進行方向へ回して胴体の下に描く。コマは12fps、位置は毎フレーム。

const atlas = {
  img: null, def: null,
  async load(onRetry) {
    const pre = window.HOSHI_ASSETS; // プレビュー用の1ファイル版は中身を埋め込んである
    const def = pre ? pre.json : await loadJSONRetry("assets/chars.json", onRetry);
    if (!def) return false;
    const img = await loadImageRetry(pre ? pre.image : "assets/" + def.image, onRetry);
    if (!img) return false;
    this.def = def; this.img = img;
    return true;
  },
  char(k) { return this.def.chars[k]; },
  // 動きがなければ、敵は fly、主人公は idle で代わりに描く
  anim(k, a) { const c = this.char(k); return c && (c.anims[a] || c.anims.fly || c.anims.idle); },
  // 動き a を t 秒再生したときのコマ番号
  frameAt(an, t, fps) {
    const n = an.frames.length, f = Math.floor(t * (an.fps || fps || this.def.fps));
    if (an.loop) return f % n;
    if (an.loopFrom != null && f >= n) return an.loopFrom + (f - an.loopFrom) % (n - an.loopFrom);
    return Math.min(f, n - 1);
  },
  // 1回流す長さ（秒）
  duration(k, a) { const an = this.anim(k, a); return an.frames.length / (an.fps || this.def.fps); },
  // 再生しきったか（loop でない動き）
  ended(k, a, t) { const an = this.anim(k, a); return !an.loop && an.loopFrom == null && t * (an.fps || this.def.fps) >= an.frames.length; },
  // 胴体の半径が radius になるように、(x, y) を中心に描く。
  // o.heading：進む向き（尾を回す角度）。o.flip：左右反転（描いた向きと逆へ進むとき。facing を参照）
  // キャラに heading（描いたポーズが進む向き、度）があれば、尾の角度は heading±tailArc に収める
  draw(g, k, a, t, x, y, radius, o = {}) {
    const c = this.char(k); if (!c) return;
    const im = this.img;
    const s = radius / c.r;
    g.save(); g.translate(x, y);
    if (c.under && o.under !== false) { // 胴体と尾より下の層（星くいの渦など）：反転せず、胴体の中心のまわりを回し続ける
      const now = performance.now() / 1000;
      this.blit(g, c.under, c.under.frames[this.frameAt(c.under, now)], 0, 0, s, (c.under.spin || 0) * Math.PI / 180 * now, o.alpha, im);
    }
    if (o.flip) g.scale(-1, 1);
    if (c.tail && o.heading != null && o.tail !== false) {
      let h = o.heading;
      if (c.heading != null) {
        if (o.flip) h = Math.PI - h;
        const h0 = c.heading * Math.PI / 180, arc = (c.tailArc ?? 180) * Math.PI / 180;
        h = h0 + clamp(angDiff(h, h0), -arc, arc);
      }
      this.blit(g, c.tail, c.tail.frames[this.frameAt(c.tail, t)], 0, 0, s, h, o.tailAlpha, im);
    }
    const an = c.anims[a] || c.anims.fly || c.anims.idle;
    this.blit(g, an, an.frames[this.frameAt(an, t)], 0, 0, s * (o.scale || 1), o.rot || 0, o.alpha, im);
    g.restore();
  },
  // コマの中で胴体がどこにあるか（跳ねる・つぶれる動き）。基準点からの胴体の中心のずれ（半径を1）と、idle の1コマ目に対する幅・高さの比。
  // 帽子を胴体に合わせて動かすのに使う。絵の不透明な所の外枠から求めて、コマごとに覚えておく
  pose(k, a, t) {
    const c = this.char(k), an = c && (c.anims[a] || c.anims.idle); if (!an) return { y: 0, sx: 1, sy: 1 };
    const bb = f => {
      if (f.bb) return f.bb;
      try {
        const [fx, fy, fw, fh, ax, ay] = f, cv = document.createElement("canvas"); cv.width = fw; cv.height = fh;
        const x = cv.getContext("2d", { willReadFrequently: true }); x.drawImage(this.img, fx, fy, fw, fh, 0, 0, fw, fh);
        const d = x.getImageData(0, 0, fw, fh).data; let l = fw, r = 0, tp = fh, b = 0;
        for (let yy = 0; yy < fh; yy++) for (let xx = 0; xx < fw; xx++) if (d[(yy * fw + xx) * 4 + 3] > 128) { if (xx < l) l = xx; if (xx > r) r = xx; if (yy < tp) tp = yy; if (yy > b) b = yy; }
        f.bb = { cy: (tp + b + 1) / 2 - ay, w: r - l + 1, h: b - tp + 1 };
      } catch (e) { f.bb = { cy: 0, w: 1, h: 1, none: true }; }
      return f.bb;
    };
    const p = bb(an.frames[this.frameAt(an, t)]), q = bb(c.anims.idle.frames[0]);
    if (p.none || q.none) return { y: 0, sx: 1, sy: 1 };
    return { y: (p.cy - q.cy) / c.r, sx: p.w / q.w, sy: p.h / q.h };
  },
  // 描いた向き（facing）と逆へ進んでいたら反転する。しきい値に幅を持たせ、揺れでパタパタ変わらないようにする
  facing(e) {
    const c = this.char(e.type), f = c && c.facing; if (!f) return;
    if (e.vx > 12) e.flip = f === "left"; else if (e.vx < -12) e.flip = f === "right";
  },
  blit(g, an, f, x, y, s, rot, alpha, im = this.img) {
    const [fx, fy, fw, fh, ax, ay] = f;
    if (!rot && alpha == null) { g.drawImage(im, fx, fy, fw, fh, x - ax * s, y - ay * s, fw * s, fh * s); return; }
    g.save(); g.translate(x, y); if (rot) g.rotate(rot); if (alpha != null) g.globalAlpha *= alpha;
    g.drawImage(im, fx, fy, fw, fh, -ax * s, -ay * s, fw * s, fh * s);
    g.restore();
  },
};

// 帽子（assets/hats.webp ＋ hats.json）。カードごとに1つ。w は主人公の直径に対する幅、y は帽子の下端の位置（半径を1、マイナスが上）。x は横のずれ、back はつばの広い帽子で星の後ろに描く「奥のつば」の形（looks.js の hatLayers）
const hatAtlas = {
  img: null, def: null,
  async load(onRetry) {
    const pre = window.HOSHI_HATS;
    const def = pre ? pre.json : await loadJSONRetry("assets/hats.json", onRetry);
    if (!def) return false;
    const img = await loadImageRetry(pre ? pre.image : "assets/" + def.image, onRetry);
    if (!img) return false;
    this.def = def; this.img = img;
    return true;
  },
};
