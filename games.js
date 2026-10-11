/* Charliejobs Arcade: four short games, no assets, no network.
   Each game runs on a fixed 480 x 760 canvas that is scaled to fit the screen. */
(function () {
  'use strict';

  var W = 480, H = 760;
  var FONT = 'ui-rounded, "SF Pro Rounded", -apple-system, "Helvetica Neue", sans-serif';
  var cfg = { getAudio: function () { return null; }, muted: function () { return false; }, unlock: function () {}, celebrate: function () {} };

  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var pick = function (arr) { return arr[(Math.random() * arr.length) | 0]; };

  function sfx(freq, dur, type, vol, slideTo) {
    if (cfg.muted()) return;
    var a = cfg.getAudio();
    if (!a) return;
    try {
      var o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol || 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(a.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* audio is a bonus, never fatal */ }
  }

  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function emoji(ctx, ch, x, y, size, rot) {
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.font = size + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  }

  function text(ctx, str, x, y, size, color, weight, align) {
    ctx.font = (weight || 800) + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color || '#fff';
    ctx.fillText(str, x, y);
  }

  function particles() {
    var arr = [];
    return {
      burst: function (x, y, color, n) {
        for (var i = 0; i < (n || 12); i++) {
          arr.push({ x: x, y: y, vx: rnd(-200, 200), vy: rnd(-280, 60), t: 0, life: rnd(0.4, 0.8), c: color, s: rnd(3, 7) });
        }
      },
      update: function (dt) {
        for (var i = arr.length - 1; i >= 0; i--) {
          var p = arr[i];
          p.t += dt; p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.t > p.life) arr.splice(i, 1);
        }
      },
      draw: function (ctx) {
        for (var i = 0; i < arr.length; i++) {
          var p = arr[i];
          ctx.globalAlpha = clamp(1 - p.t / p.life, 0, 1);
          ctx.fillStyle = p.c;
          ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
        }
        ctx.globalAlpha = 1;
      }
    };
  }

  /* =================================================================
     1. CASH GRAB: tap falling cash for 30 seconds, dodge the bombs
     ================================================================= */
  function cashGame(env) {
    var items = [], pops = [], fxp = particles();
    var time = 30, score = 0, combo = 0, spawnT = 0.3, elapsed = 0, shake = 0, over = false;
    var KINDS = [
      { e: '💵', v: 1, w: 45 }, { e: '🪙', v: 2, w: 17 }, { e: '💰', v: 3, w: 18 },
      { e: '💣', v: -5, w: 15, bomb: true }, { e: '📱', v: 10, w: 2.5, fast: true }
    ];
    var totalW = KINDS.reduce(function (n, k) { return n + k.w; }, 0);
    function pickKind() {
      var r = Math.random() * totalW;
      for (var i = 0; i < KINDS.length; i++) { r -= KINDS[i].w; if (r <= 0) return KINDS[i]; }
      return KINDS[0];
    }
    function spawn() {
      var k = pickKind();
      items.push({ k: k, x: rnd(40, W - 40), y: -40, vy: (130 + elapsed * 4 + rnd(0, 70)) * (k.fast ? 1.5 : 1), rot: rnd(-0.3, 0.3), vr: rnd(-1.5, 1.5) });
    }
    function pop(x, y, str, color) { pops.push({ x: x, y: y, s: str, c: color, t: 0 }); }
    function collect(it) {
      if (it.k.bomb) {
        combo = 0;
        score = Math.max(0, score + it.k.v);
        shake = 1;
        pop(it.x, it.y, String(it.k.v), '#ff453a');
        fxp.burst(it.x, it.y, '#ff453a', 18);
        env.sfx(140, 0.3, 'sawtooth', 0.14, 50);
      } else {
        combo++;
        var gain = it.k.v * (combo >= 10 ? 2 : 1);
        score += gain;
        pop(it.x, it.y, '+' + gain, combo >= 10 ? '#ffd60a' : '#30d158');
        fxp.burst(it.x, it.y, it.k.fast ? '#ffd60a' : '#30d158', it.k.fast ? 24 : 10);
        env.sfx(620 + Math.min(combo, 14) * 36, 0.09, 'triangle', 0.12);
        if (it.k.fast) env.sfx(1046, 0.25, 'sine', 0.12);
      }
      env.setScore(score);
    }
    return {
      debug: { items: items },
      update: function (dt) {
        if (over) return;
        elapsed += dt; time -= dt;
        env.setInfo(Math.max(0, Math.ceil(time)) + 's');
        spawnT -= dt;
        if (spawnT <= 0) { spawn(); spawnT = Math.max(0.26, 0.62 - elapsed * 0.012) * rnd(0.7, 1.2); }
        for (var i = items.length - 1; i >= 0; i--) {
          var it = items[i];
          it.y += it.vy * dt; it.rot += it.vr * dt;
          if (it.y > H + 60) items.splice(i, 1);
        }
        for (var j = pops.length - 1; j >= 0; j--) { pops[j].t += dt; pops[j].y -= 70 * dt; if (pops[j].t > 0.8) pops.splice(j, 1); }
        fxp.update(dt);
        shake = Math.max(0, shake - dt * 3);
        if (time <= 0) { over = true; env.end(); }
      },
      draw: function (ctx) {
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#1d2b64'); g.addColorStop(1, '#6a3093');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.save();
        if (shake > 0) ctx.translate(rnd(-1, 1) * shake * 8, rnd(-1, 1) * shake * 8);
        for (var i = 0; i < items.length; i++) emoji(ctx, items[i].k.e, items[i].x, items[i].y, 58, items[i].rot);
        fxp.draw(ctx);
        for (var j = 0; j < pops.length; j++) {
          ctx.globalAlpha = clamp(1 - pops[j].t / 0.8, 0, 1);
          text(ctx, pops[j].s, pops[j].x, pops[j].y, 34, pops[j].c, 900);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
        if (combo >= 3) text(ctx, combo >= 10 ? 'Combo ' + combo + '  x2 💥' : 'Combo ' + combo, W / 2, H - 40, 26, combo >= 10 ? '#ffd60a' : 'rgba(255,255,255,.85)');
      },
      pointerdown: function (x, y) {
        if (over) return;
        for (var i = items.length - 1; i >= 0; i--) {
          if (Math.hypot(x - items[i].x, y - items[i].y) < 46) { collect(items[i]); items.splice(i, 1); break; }
        }
      }
    };
  }

  /* =================================================================
     2. STACK TOWER: tap to drop the sliding block, line it up
     ================================================================= */
  function stackGame(env) {
    var BH = 38, BASE_Y = H - 120;
    var blocks = [{ x: (W - 210) / 2, w: 210 }];
    var cur = { x: 0, w: 210, dir: 1 };
    var falling = [], fxp = particles();
    var perfect = 0, cam = 0, over = false, msg = null, msgT = 0, endT = -1;
    var speed = 230;
    function yOf(i) { return BASE_Y - i * BH; }
    function hue(i) { return (200 + i * 14) % 360; }
    function setCur() {
      var top = blocks[blocks.length - 1], n = blocks.length;
      cur.w = top.w;
      cur.dir = n % 2 ? 1 : -1;
      cur.x = cur.dir === 1 ? 0 : W - cur.w;
      speed = Math.min(480, 230 + n * 9);
    }
    setCur();
    env.setScore(0);
    function flash(s) { msg = s; msgT = 0.9; }
    return {
      debug: { blocks: blocks, cur: cur },
      update: function (dt) {
        fxp.update(dt);
        for (var i = falling.length - 1; i >= 0; i--) {
          var f = falling[i];
          f.vy += 1800 * dt; f.y += f.vy * dt; f.t += dt;
          if (f.t > 1.4) falling.splice(i, 1);
        }
        if (msgT > 0) msgT -= dt;
        var target = Math.max(0, blocks.length * BH - 320);
        cam += (target - cam) * Math.min(1, dt * 6);
        if (over) { if (endT >= 0) { endT -= dt; if (endT < 0) env.end(); } return; }
        cur.x += cur.dir * speed * dt;
        if (cur.x <= 0) { cur.x = 0; cur.dir = 1; }
        if (cur.x + cur.w >= W) { cur.x = W - cur.w; cur.dir = -1; }
      },
      draw: function (ctx) {
        var lvl = blocks.length;
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'hsl(' + ((240 + lvl * 6) % 360) + ',60%,22%)');
        g.addColorStop(1, 'hsl(' + ((280 + lvl * 6) % 360) + ',70%,40%)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.translate(0, cam);
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.fillRect(0, BASE_Y + BH, W, 400);
        for (var i = 0; i < blocks.length; i++) {
          var b = blocks[i];
          ctx.fillStyle = 'hsl(' + hue(i) + ',85%,58%)';
          rrect(ctx, b.x, yOf(i), b.w, BH - 2, 8); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.28)';
          ctx.fillRect(b.x + 6, yOf(i) + 3, b.w - 12, 5);
        }
        if (!over) {
          ctx.fillStyle = 'hsl(' + hue(blocks.length) + ',90%,62%)';
          rrect(ctx, cur.x, yOf(blocks.length), cur.w, BH - 2, 8); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.3)';
          ctx.fillRect(cur.x + 6, yOf(blocks.length) + 3, cur.w - 12, 5);
        }
        for (var j = 0; j < falling.length; j++) {
          var f = falling[j];
          ctx.globalAlpha = clamp(1 - f.t / 1.4, 0, 1);
          ctx.fillStyle = 'hsl(' + f.h + ',85%,58%)';
          rrect(ctx, f.x, f.y, f.w, BH - 2, 8); ctx.fill();
        }
        ctx.globalAlpha = 1;
        fxp.draw(ctx);
        ctx.restore();
        if (msgT > 0) { ctx.globalAlpha = clamp(msgT / 0.5, 0, 1); text(ctx, msg, W / 2, 150, 44, '#ffd60a', 900); ctx.globalAlpha = 1; }
        if (blocks.length === 1) text(ctx, 'Tap to drop the block', W / 2, 110, 24, 'rgba(255,255,255,.85)', 700);
      },
      pointerdown: function () {
        if (over) return;
        var top = blocks[blocks.length - 1], n = blocks.length, y = yOf(n);
        var dx = cur.x - top.x;
        var nb;
        if (Math.abs(dx) <= 7) {
          perfect++;
          var grow = perfect >= 3 ? Math.min(10, 210 - top.w) : 0;
          nb = { x: top.x - grow / 2, w: top.w + grow };
          flash(perfect >= 3 ? 'Perfect x' + perfect + '!' : 'Perfect!');
          env.sfx(520 + Math.min(perfect, 8) * 70, 0.18, 'triangle', 0.14);
          fxp.burst(W / 2, y, '#ffd60a', 16);
        } else {
          perfect = 0;
          var l = Math.max(cur.x, top.x), r = Math.min(cur.x + cur.w, top.x + top.w), ow = r - l;
          if (ow <= 3) {
            falling.push({ x: cur.x, y: y, w: cur.w, vy: 0, t: 0, h: hue(n) });
            over = true; endT = 0.7;
            env.sfx(220, 0.4, 'sawtooth', 0.14, 70);
            return;
          }
          if (cur.x < top.x) falling.push({ x: cur.x, y: y, w: top.x - cur.x, vy: 0, t: 0, h: hue(n) });
          if (cur.x + cur.w > top.x + top.w) falling.push({ x: top.x + top.w, y: y, w: cur.x + cur.w - (top.x + top.w), vy: 0, t: 0, h: hue(n) });
          nb = { x: l, w: ow };
          env.sfx(330, 0.1, 'triangle', 0.12);
        }
        blocks.push(nb);
        env.setScore(blocks.length - 1);
        if (blocks.length - 1 >= 150) { over = true; endT = 0.3; return; }
        setCur();
      }
    };
  }

  /* =================================================================
     3. PATTERN PAL: watch the lights, then repeat the pattern
     ================================================================= */
  function patternGame(env) {
    var PADS = [
      { x: 30, y: 200, c: '#30d158', f: 262 }, { x: 250, y: 200, c: '#ff453a', f: 330 },
      { x: 30, y: 420, c: '#ffd60a', f: 392 }, { x: 250, y: 420, c: '#0a84ff', f: 523 }
    ];
    var SIZE = 200;
    var seq = [], phase = 'watch', idx = 0, t = 0.7, inputIdx = 0, round = 0, glow = [0, 0, 0, 0], endT = -1, over = false, label = 'Watch…';
    function addStep() { seq.push((Math.random() * 4) | 0); }
    function light(i) { glow[i] = 1; env.sfx(PADS[i].f, 0.3, 'sine', 0.16); }
    function interval() { return Math.max(0.32, 0.62 - round * 0.025); }
    addStep();
    env.setScore(0);
    env.setInfo('Watch…');
    return {
      debug: { seq: seq, getPhase: function () { return phase; } },
      update: function (dt) {
        for (var i = 0; i < 4; i++) glow[i] = Math.max(0, glow[i] - dt * 3.2);
        if (over) { if (endT >= 0) { endT -= dt; if (endT < 0) env.end(); } return; }
        t -= dt;
        if (phase === 'watch' && t <= 0) {
          if (idx < seq.length) { light(seq[idx++]); t = interval(); }
          else { phase = 'input'; inputIdx = 0; label = 'Your turn!'; env.setInfo('Your turn!'); }
        } else if (phase === 'between' && t <= 0) {
          addStep(); idx = 0; phase = 'watch'; t = 0.4; label = 'Watch…'; env.setInfo('Watch…');
        }
      },
      draw: function (ctx) {
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#0f1027'); g.addColorStop(1, '#262a5c');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        text(ctx, 'Round ' + (round + 1), W / 2, 90, 44, '#fff', 900);
        text(ctx, label, W / 2, 140, 26, 'rgba(255,255,255,.8)', 700);
        for (var i = 0; i < 4; i++) {
          var p = PADS[i], gl = glow[i];
          ctx.save();
          if (gl > 0.05) { ctx.shadowColor = p.c; ctx.shadowBlur = 40 * gl; }
          ctx.globalAlpha = 0.32 + 0.68 * gl;
          ctx.fillStyle = p.c;
          rrect(ctx, p.x, p.y, SIZE, SIZE, 36); ctx.fill();
          ctx.restore();
        }
        text(ctx, 'Remember the order: ' + seq.length + ' long', W / 2, 680, 22, 'rgba(255,255,255,.6)', 600);
      },
      pointerdown: function (x, y) {
        if (over || phase !== 'input') return;
        for (var i = 0; i < 4; i++) {
          var p = PADS[i];
          if (x >= p.x && x <= p.x + SIZE && y >= p.y && y <= p.y + SIZE) {
            light(i);
            if (i === seq[inputIdx]) {
              inputIdx++;
              if (inputIdx === seq.length) {
                round++;
                env.setScore(round);
                env.sfx(784, 0.25, 'triangle', 0.14);
                if (round >= 40) { over = true; endT = 0.4; return; }
                phase = 'between'; t = 0.9; label = 'Nice!'; env.setInfo('Nice!');
              }
            } else {
              over = true; endT = 0.8; label = 'Oops!';
              env.sfx(150, 0.45, 'sawtooth', 0.15, 60);
            }
            return;
          }
        }
      }
    };
  }

  /* =================================================================
     4. PHONE HOP: tap to flap the iPhone through the gaps
     ================================================================= */
  function hopGame(env) {
    var GROUND = 70, PW = 84, SPACING = 270;
    var bird = { x: 130, y: H / 2, vy: 0, r: 16 };
    var pipes = [], clouds = [], fxp = particles();
    var started = false, over = false, score = 0, t = 0, endT = -1, gx = 0;
    for (var c = 0; c < 5; c++) clouds.push({ x: rnd(0, W), y: rnd(40, 400), s: rnd(40, 80), v: rnd(10, 30) });
    function addPipe(x) {
      var gap = Math.max(168, 212 - score * 2.2);
      var cy = rnd(gap / 2 + 70, H - GROUND - gap / 2 - 60);
      pipes.push({ x: x, cy: cy, gap: gap, passed: false });
    }
    addPipe(W + 100);
    function crash() {
      if (over) return;
      over = true; endT = 0.55;
      env.sfx(200, 0.4, 'sawtooth', 0.14, 60);
      fxp.burst(bird.x, bird.y, '#ff9f0a', 22);
    }
    env.setScore(0);
    return {
      debug: { bird: bird, pipes: pipes, started: function () { return started; } },
      update: function (dt) {
        t += dt;
        fxp.update(dt);
        for (var c = 0; c < clouds.length; c++) { clouds[c].x -= clouds[c].v * dt; if (clouds[c].x < -100) { clouds[c].x = W + 80; clouds[c].y = rnd(40, 400); } }
        if (over) {
          if (bird.y + bird.r < H - GROUND) { bird.vy += 1500 * dt; bird.y += bird.vy * dt; }
          if (endT >= 0) { endT -= dt; if (endT < 0) env.end(); }
          return;
        }
        if (!started) { bird.y = H / 2 + Math.sin(t * 4) * 8; return; }
        var speed = 150 + Math.min(score, 40) * 2.2;
        gx = (gx + speed * dt) % 40;
        bird.vy = Math.min(720, bird.vy + 1500 * dt);
        bird.y += bird.vy * dt;
        if (bird.y - bird.r < 0) { bird.y = bird.r; bird.vy = 0; }
        for (var i = 0; i < pipes.length; i++) pipes[i].x -= speed * dt;
        if (pipes[pipes.length - 1].x < W - SPACING + 100) addPipe(pipes[pipes.length - 1].x + SPACING);
        while (pipes.length && pipes[0].x < -PW - 10) pipes.shift();
        if (bird.y + bird.r > H - GROUND) { bird.y = H - GROUND - bird.r; crash(); return; }
        var r = bird.r * 0.85;
        for (var j = 0; j < pipes.length; j++) {
          var p = pipes[j];
          if (bird.x + r > p.x && bird.x - r < p.x + PW) {
            if (bird.y - r < p.cy - p.gap / 2 || bird.y + r > p.cy + p.gap / 2) { crash(); return; }
          }
          if (!p.passed && p.x + PW < bird.x - r) {
            p.passed = true; score++;
            env.setScore(score);
            env.sfx(880, 0.1, 'triangle', 0.12);
            if (score >= 100) { over = true; endT = 0.3; }
          }
        }
      },
      draw: function (ctx) {
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#4facfe'); g.addColorStop(1, '#c2e9fb');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 0.75;
        for (var c = 0; c < clouds.length; c++) emoji(ctx, '☁️', clouds[c].x, clouds[c].y, clouds[c].s, 0);
        ctx.globalAlpha = 1;
        for (var i = 0; i < pipes.length; i++) {
          var p = pipes[i], top = p.cy - p.gap / 2, bot = p.cy + p.gap / 2;
          var pg = ctx.createLinearGradient(p.x, 0, p.x + PW, 0);
          pg.addColorStop(0, '#2fb344'); pg.addColorStop(0.5, '#6be585'); pg.addColorStop(1, '#2fb344');
          ctx.fillStyle = pg;
          ctx.fillRect(p.x + 6, 0, PW - 12, top - 24);
          rrect(ctx, p.x, top - 34, PW, 34, 10); ctx.fill();
          ctx.fillRect(p.x + 6, bot + 24, PW - 12, H - bot);
          rrect(ctx, p.x, bot, PW, 34, 10); ctx.fill();
        }
        ctx.fillStyle = '#d9a441'; ctx.fillRect(0, H - GROUND, W, GROUND);
        ctx.fillStyle = '#7ed957'; ctx.fillRect(0, H - GROUND, W, 14);
        ctx.fillStyle = 'rgba(0,0,0,.08)';
        for (var s = -40; s < W + 40; s += 40) ctx.fillRect(s - gx, H - GROUND + 14, 20, GROUND - 14);
        emoji(ctx, '📱', bird.x, bird.y, 44, clamp(bird.vy / 700, -0.5, 1.1));
        fxp.draw(ctx);
        if (!started) { text(ctx, 'Tap to hop!', W / 2, 250, 44, '#fff', 900); }
      },
      pointerdown: function () {
        if (over) return;
        started = true;
        bird.vy = -470;
        env.sfx(540, 0.08, 'square', 0.06, 760);
      }
    };
  }

  var DEFS = [
    { id: 'cash', name: 'Cash Grab', icon: '💰', tagline: 'Tap the cash, dodge the bombs', how: 'Tap falling cash to grab it. Don’t tap the 💣! Chain 10 in a row for double points. 30 seconds.', medals: [40, 80, 130], create: cashGame },
    { id: 'stack', name: 'Stack Tower', icon: '🧱', tagline: 'Build it as high as you can', how: 'Tap to drop the sliding block. Line it up perfectly or the overhang gets chopped off.', medals: [10, 20, 35], create: stackGame },
    { id: 'pattern', name: 'Pattern Pal', icon: '🧠', tagline: 'Watch, remember, repeat', how: 'Watch the lights, then tap the same order. It gets one step longer each round.', medals: [5, 8, 12], create: patternGame },
    { id: 'hop', name: 'Phone Hop', icon: '📱', tagline: 'Fly the iPhone through the gaps', how: 'Tap to hop. Keep your phone in the gaps and away from the pipes and the ground.', medals: [5, 12, 20], create: hopGame }
  ];
  var MEDAL_ICON = ['', '🥉', '🥈', '🥇'];
  var MEDAL_NAME = ['', 'Bronze', 'Silver', 'Gold'];
  function byId(id) { for (var i = 0; i < DEFS.length; i++) if (DEFS[i].id === id) return DEFS[i]; return null; }
  function medalFor(id, score) {
    var d = byId(id), m = 0;
    if (!d) return 0;
    for (var i = 0; i < d.medals.length; i++) if (score >= d.medals[i]) m = i + 1;
    return m;
  }

  /* ------------------------------------------------------------------
     Runner: overlay, HUD, intro / results panels
     ------------------------------------------------------------------ */
  var styleDone = false;
  function injectStyle() {
    if (styleDone) return;
    styleDone = true;
    var st = document.createElement('style');
    st.textContent = [
      '.arc{position:fixed;inset:0;z-index:55;display:flex;flex-direction:column;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif;',
      'background:radial-gradient(120% 90% at 50% 0%,#2b2f77 0%,#0b0d1a 70%);animation:arcIn .25s ease;touch-action:none;-webkit-user-select:none;user-select:none}',
      '@keyframes arcIn{from{opacity:0;transform:scale(1.03)}}',
      '.arc-top{display:flex;align-items:center;gap:12px;padding:calc(12px + env(safe-area-inset-top)) 18px 8px}',
      '.arc-x{border:0;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.16);color:#fff;font-size:20px;font-weight:700;cursor:pointer;flex:none}',
      '.arc-title{font:800 22px ' + FONT + ';flex:1;letter-spacing:-.3px}',
      '.arc-info{font:700 18px ' + FONT + ';color:rgba(255,255,255,.75);min-width:70px;text-align:right}',
      '.arc-score{font:900 26px ' + FONT + ';background:rgba(255,255,255,.16);padding:6px 18px;border-radius:999px;min-width:70px;text-align:center;font-variant-numeric:tabular-nums}',
      '.arc-stage{flex:1;min-height:0;position:relative;display:grid;place-items:center;padding:0 12px calc(14px + env(safe-area-inset-bottom))}',
      '.arc-stage canvas{touch-action:none;border-radius:30px;box-shadow:0 20px 60px rgba(0,0,0,.5);display:block}',
      '.arc-panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(88%,380px);text-align:center;padding:26px 24px;border-radius:32px;',
      'background:rgba(24,26,52,.86);-webkit-backdrop-filter:blur(22px);backdrop-filter:blur(22px);box-shadow:0 20px 60px rgba(0,0,0,.45);animation:arcPop .35s cubic-bezier(.2,1.2,.4,1)}',
      '@keyframes arcPop{from{opacity:0;transform:translate(-50%,-46%) scale(.92)}}',
      '.arc-panel .big{font-size:64px;line-height:1;margin-bottom:6px}',
      '.arc-panel h3{margin:0 0 6px;font:900 30px/1.1 ' + FONT + ';letter-spacing:-.4px}',
      '.arc-panel p{margin:0 0 16px;color:rgba(255,255,255,.78);font-size:17px;line-height:1.35}',
      '.arc-panel .meds{display:flex;justify-content:center;gap:14px;font:700 15px ' + FONT + ';margin:0 0 18px;color:rgba(255,255,255,.85)}',
      '.arc-panel .row{display:grid;gap:10px}',
      '.arc-btn{border:0;border-radius:999px;padding:15px 22px;font:800 19px ' + FONT + ';cursor:pointer;color:#fff;background:#0a84ff}',
      '.arc-btn.go{background:#30d158}',
      '.arc-btn.alt{background:rgba(255,255,255,.16)}',
      '.arc-btn:active{transform:scale(.96)}',
      '.arc-btn:disabled{opacity:.55}',
      '.arc-panel .score{font:900 72px/1 ' + FONT + ';margin:2px 0 4px;font-variant-numeric:tabular-nums}',
      '.arc-panel .new{display:inline-block;margin:0 0 12px;padding:6px 16px;border-radius:999px;font:800 17px ' + FONT + ';background:linear-gradient(135deg,#ffd60a,#ff9f0a);color:#3a2600}',
      '.arc-panel .small{font-size:15px;color:rgba(255,255,255,.65);margin:0 0 14px}'
    ].join('');
    document.head.appendChild(st);
  }

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  /**
   * hooks: { best, tokens, submit(score) -> Promise<{best,isBest,tokens}>, onClose() }
   */
  function launch(id, hooks) {
    var def = byId(id);
    if (!def) return;
    injectStyle();
    hooks = hooks || {};

    var ov = el('div', 'arc');
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', def.name);
    var top = el('div', 'arc-top');
    var close = el('button', 'arc-x', '✕');
    close.setAttribute('aria-label', 'Close game');
    var title = el('div', 'arc-title', def.icon + ' ' + def.name);
    var info = el('div', 'arc-info', '');
    var scoreEl = el('div', 'arc-score', '0');
    top.append(close, title, info, scoreEl);
    var stage = el('div', 'arc-stage');
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    ov.append(top, stage);
    document.body.appendChild(ov);

    var ctx = canvas.getContext('2d');
    var alive = true, running = false, game = null, raf = 0, last = 0, panel = null, score = 0, best = hooks.best || 0, tokens = hooks.tokens || 0, ended = false;
    var dpr = 1, cssW = W, cssH = H;

    function fit() {
      var r = stage.getBoundingClientRect();
      var availW = Math.max(100, r.width - 24), availH = Math.max(100, r.height);
      var s = Math.min(availW / W, availH / H);
      cssW = W * s; cssH = H * s;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
      canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    }

    var env = {
      sfx: sfx,
      setScore: function (n) { score = n; scoreEl.textContent = String(n); },
      setInfo: function (s) { info.textContent = s; },
      end: function () { if (!ended) { ended = true; running = false; finish(); } }
    };

    function frame(now) {
      if (!alive) return;
      var dt = Math.min(0.033, Math.max(0, (now - last) / 1000));
      last = now;
      if (game && running) game.update(dt);
      else if (game && ended) game.update(dt); // let particles and falling pieces settle
      ctx.setTransform((canvas.width / W), 0, 0, (canvas.height / H), 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (game) game.draw(ctx);
      else { ctx.fillStyle = '#0b0d1a'; ctx.fillRect(0, 0, W, H); }
      raf = requestAnimationFrame(frame);
    }

    function clearPanel() { if (panel) { panel.remove(); panel = null; } }
    function showPanel(p) { clearPanel(); panel = p; stage.appendChild(p); }

    function medalLine() {
      var row = el('div', 'meds');
      def.medals.forEach(function (m, i) { row.appendChild(el('span', '', MEDAL_ICON[i + 1] + ' ' + m)); });
      return row;
    }

    function showIntro() {
      var p = el('div', 'arc-panel');
      p.append(el('div', 'big', def.icon), el('h3', '', def.name), el('p', '', def.how), medalLine());
      if (best > 0) p.append(el('div', 'small', 'Your best: ' + best + ' ' + MEDAL_ICON[medalFor(id, best)]));
      var row = el('div', 'row');
      var go = el('button', 'arc-btn go', 'Start!');
      go.addEventListener('click', start);
      row.appendChild(go);
      p.appendChild(row);
      showPanel(p);
    }

    function start() {
      cfg.unlock();
      clearPanel();
      ended = false; score = 0;
      env.setScore(0); env.setInfo('');
      game = def.create(env);
      running = true;
    }

    function finish() {
      var final = score;
      setTimeout(function () { if (alive) save(final); }, 350);
    }

    function save(final) {
      var p = el('div', 'arc-panel');
      p.append(el('div', 'big', '⏳'), el('h3', '', 'Saving your score…'));
      showPanel(p);
      var done = hooks.submit ? hooks.submit(final) : Promise.resolve({ best: Math.max(best, final), isBest: final > best, tokens: Math.max(0, tokens - 1) });
      done.then(function (res) {
        if (!alive) return;
        best = res.best; tokens = res.tokens;
        results(final, res);
      }).catch(function (e) {
        if (!alive) return;
        var q = el('div', 'arc-panel');
        var msg = (hooks.errText && hooks.errText(e)) || 'Couldn’t save your score.';
        q.append(el('div', 'big', '📡'), el('h3', '', 'Not saved yet'), el('p', '', msg));
        var row = el('div', 'row');
        var retry = el('button', 'arc-btn go', 'Try again');
        retry.addEventListener('click', function () { save(final); });
        var quit = el('button', 'arc-btn alt', 'Close');
        quit.addEventListener('click', closeAll);
        row.append(retry, quit);
        q.appendChild(row);
        showPanel(q);
      });
    }

    function results(final, res) {
      var m = medalFor(id, final);
      var p = el('div', 'arc-panel');
      p.append(el('div', 'big', m ? MEDAL_ICON[m] : '🎮'), el('h3', '', m ? MEDAL_NAME[m] + ' medal!' : 'Nice try!'), el('div', 'score', String(final)));
      if (res.isBest && final > 0) p.append(el('div', 'new', '🏆 New high score!'));
      else p.append(el('p', '', 'Your best: ' + res.best + ' ' + MEDAL_ICON[medalFor(id, res.best)]));
      var nextMedal = m < 3 ? def.medals[m] : 0;
      if (nextMedal) p.append(el('div', 'small', MEDAL_ICON[m + 1] + ' ' + MEDAL_NAME[m + 1] + ' at ' + nextMedal));
      var row = el('div', 'row');
      if (res.tokens > 0) {
        var again = el('button', 'arc-btn go', 'Play again · ' + res.tokens + ' 🎟️ left');
        again.addEventListener('click', start);
        row.appendChild(again);
      } else {
        p.append(el('div', 'small', 'Out of tokens. Finish a job to earn another 🎟️'));
      }
      var done = el('button', 'arc-btn ' + (res.tokens > 0 ? 'alt' : ''), 'Done');
      done.addEventListener('click', closeAll);
      row.appendChild(done);
      p.appendChild(row);
      showPanel(p);
      if (res.isBest && final > 0) {
        sfx(784, 0.15, 'triangle', 0.14); setTimeout(function () { sfx(1046, 0.15, 'triangle', 0.14); }, 140); setTimeout(function () { sfx(1318, 0.3, 'triangle', 0.14); }, 280);
        var r = canvas.getBoundingClientRect();
        cfg.celebrate(r.left + r.width / 2, r.top + r.height * 0.6, m === 3);
      }
    }

    function closeAll() {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', fit);
      ov.remove();
      if (hooks.onClose) hooks.onClose();
    }
    function onKey(e) { if (e.key === 'Escape') closeAll(); }

    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (!game || !running) return;
      var r = canvas.getBoundingClientRect();
      game.pointerdown((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H);
    });
    close.addEventListener('click', closeAll);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', fit);

    fit();
    showIntro();
    last = performance.now();
    raf = requestAnimationFrame(frame);
    return { close: closeAll };
  }

  window.Arcade = {
    DEFS: DEFS,
    MEDAL_ICON: MEDAL_ICON,
    medalFor: medalFor,
    configure: function (o) { for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) cfg[k] = o[k]; },
    launch: launch
  };
})();
