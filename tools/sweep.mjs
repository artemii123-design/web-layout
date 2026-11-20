// Обмер всех шаблонов Readymag через CDP. Node 22+, системный Chrome.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.PORT || 9333);
const OUT = process.argv[2];
const IDS_FILE = process.argv[3];
const W = Number(process.argv[4] || 1024);
const H = Number(process.argv[5] || 900);
const MOBILE = W < 600;
const WAIT = Number(process.argv[6] || 5000);
const PROFILE = process.env.PROFILE || '/tmp/rm-sweep-profile-' + W;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function http(p) {
  const r = await fetch(`http://127.0.0.1:${PORT}${p}`);
  return r.json();
}

class CDP {
  constructor(url) { this.url = url; this.id = 0; this.waiting = new Map(); }
  connect() {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => res();
      this.ws.onerror = e => rej(new Error('ws error'));
      this.ws.onmessage = ev => {
        const m = JSON.parse(ev.data);
        if (m.id && this.waiting.has(m.id)) {
          const { res, rej } = this.waiting.get(m.id);
          this.waiting.delete(m.id);
          m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
        }
      };
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.waiting.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.waiting.has(id)) { this.waiting.delete(id); rej(new Error('timeout ' + method)); }
      }, 60000);
    });
  }
  close() { try { this.ws.close(); } catch {} }
}

const MEASURE = `(() => {
  const vw = innerWidth, out = { vw };
  try {
    const cc = document.querySelector('.page-content-container');
    const z = cc ? (parseFloat(getComputedStyle(cc).zoom) || 1) : 1;
    out.zoom = +z.toFixed(4);
    out.canvas = Math.round(vw / z);
    out.url = location.pathname;
    const sw = document.querySelector('.content-scroll-wrapper');
    out.pageH = sw ? Math.round(sw.scrollHeight / z) : null;
    out.screens = sw ? +(sw.scrollHeight / innerHeight).toFixed(2) : null;
    const cb = document.querySelector('.content-bounds');
    out.hscroll = cb && cb.scrollWidth > cb.clientWidth + 20 ? Math.round(cb.scrollWidth / z) : 0;
    const cur = document.querySelector('article.page.center-page') || document.querySelector('article.page');
    if (!cur) { out.err = 'no page'; return JSON.stringify(out); }
    const all = [...cur.querySelectorAll('.rmwidget')];
    const ws = all.map(e => ({ e, b: e.getBoundingClientRect() })).filter(o => o.b.width > 0 && o.b.height > 0);
    out.widgets = all.length; out.visible = ws.length;
    const kinds = {}; all.forEach(o => { const m = (o.className.match(/widget-([a-z0-9-]+)/) || [])[1] || '?'; kinds[m] = (kinds[m] || 0) + 1; });
    out.kinds = kinds;
    const body = ws.filter(o => o.b.width < out.canvas * 0.995);
    if (body.length) {
      out.marginL = Math.round(Math.min(...body.map(o => o.b.left)));
      out.marginR = Math.round(out.canvas - Math.max(...body.map(o => o.b.right)));
      out.contentW = out.canvas - out.marginL - out.marginR;
    }
    // колонки: кластеры левых краёв у заметных блоков
    const lefts = body.filter(o => o.b.width > out.canvas * 0.08).map(o => Math.round(o.b.left)).sort((a, b) => a - b);
    const cols = []; lefts.forEach(x => { if (!cols.length || x - cols[cols.length - 1] > 8) cols.push(x); });
    out.colEdges = cols.slice(0, 12);
    // типографика
    const t = {};
    cur.querySelectorAll('span,p').forEach(e => {
      if (e.children.length) return;
      const tx = (e.innerText || '').trim(); if (tx.length < 2) return;
      const s = getComputedStyle(e);
      const fs = Math.round(parseFloat(s.fontSize) * 10) / 10;
      const lh = Math.round(parseFloat(s.lineHeight) * 10) / 10 || 0;
      const k = s.fontFamily.split(',')[0].replace(/["']/g, '') + '|' + fs + '|' + lh + '|' + s.fontWeight;
      if (!t[k]) t[k] = { n: 0, w: 0 };
      t[k].n++;
      const bw = e.getBoundingClientRect().width; if (bw > t[k].w) t[k].w = Math.round(bw);
    });
    out.type = Object.entries(t)
      .sort((a, b) => parseFloat(b[0].split('|')[1]) - parseFloat(a[0].split('|')[1]))
      .slice(0, 8).map(([k, v]) => ({ spec: k, n: v.n, boxW: v.w }));
    out.typeCount = Object.keys(t).length;
    out.fonts = [...new Set(Object.keys(t).map(k => k.split('|')[0]))].slice(0, 6);
    // скругления
    const rad = {}; ws.forEach(o => { const r = getComputedStyle(o.e).borderRadius; if (r && r !== '0px') rad[r] = (rad[r] || 0) + 1; });
    out.radii = rad;
    // кадрирование
    const pics = ws.filter(o => o.e.className.includes('picture'));
    out.pics = pics.length;
    const ar = {}; pics.forEach(o => { const a = (o.b.width / o.b.height).toFixed(2); ar[a] = (ar[a] || 0) + 1; });
    out.aspect = ar;
    out.crop = pics.filter(o => { const i = o.e.querySelector('img'); return i && getComputedStyle(i).objectFit === 'cover'; }).length;
    // повороты
    out.rotated = ws.filter(o => { const tr = getComputedStyle(o.e).transform; return tr && tr !== 'none' && !tr.startsWith('matrix(1, 0, 0, 1'); }).length;
    // закреплённые элементы
    out.fixed = document.querySelectorAll('.fixed-position-container .rmwidget').length;
    out.pageClass = (cur.className.match(/page-with-fixeds-[a-z]+/) || [''])[0];
    // состояния ссылок
    const rules = [];
    for (const ss of document.styleSheets) { let rs; try { rs = ss.cssRules; } catch { continue; }
      for (const r of rs || []) { const tx = r.cssText || ''; if (/link-style-[0-9a-f-]+/.test(tx) && tx.length < 400) rules.push(tx); } }
    const col = tx => (tx.match(/color:\\s*([^;!}]+)/) || [])[1];
    out.linkStates = {
      base: [...new Set(rules.filter(r => !/:hover|\\.hover|\\.current/.test(r)).map(col).filter(Boolean))].slice(0, 3),
      hover: [...new Set(rules.filter(r => /:hover|\\.hover/.test(r)).map(col).filter(Boolean))].slice(0, 3),
      current: [...new Set(rules.filter(r => /\\.current/.test(r)).map(col).filter(Boolean))].slice(0, 3)
    };
    out.underline = rules.some(r => r.includes('repeat-x'));
    // переходы
    const trs = {}; ws.slice(0, 60).forEach(o => { const d = getComputedStyle(o.e).transitionDuration; if (d && d !== '0s') trs[d] = (trs[d] || 0) + 1; });
    out.transitions = trs;
    const bg = document.querySelector('.widget-background');
    out.bg = bg ? getComputedStyle(bg).backgroundColor : null;
  } catch (e) { out.err = String(e); }
  return JSON.stringify(out);
})()`;

(async () => {
  const ids = JSON.parse(fs.readFileSync(IDS_FILE, 'utf8'));
  const args = [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
    '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE,
    `--window-size=${W},${H}`, 'about:blank'
  ];
  if (MOBILE) args.splice(2, 0, '--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
  const chrome = spawn(CHROME, args, { stdio: 'ignore' });

  let ver = null;
  for (let i = 0; i < 40 && !ver; i++) { await sleep(500); try { ver = await http('/json/version'); } catch {} }
  if (!ver) { console.error('chrome not up'); process.exit(1); }

  const list = await http('/json/list');
  const page = list.find(t => t.type === 'page');
  const cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: W, height: H, deviceScaleFactor: 1, mobile: MOBILE
  });

  const results = [];
  const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : [];
  const haveIds = new Set(done.map(d => d.id));
  results.push(...done);

  for (const item of ids) {
    const id = item.id || item;
    if (haveIds.has(id)) continue;
    let rec = { id, title: item.title, cats: item.cats, by: item.by, price: item.price };
    try {
      await cdp.send('Page.navigate', { url: 'https://readymag.com/' + id });
      await sleep(WAIT);
      const r = await cdp.send('Runtime.evaluate', { expression: MEASURE, returnByValue: true, timeout: 20000 });
      Object.assign(rec, JSON.parse(r.result.value));
    } catch (e) {
      rec.err = String(e).slice(0, 120);
    }
    results.push(rec);
    fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
    console.log(`${results.length}/${ids.length}  ${id}  ${rec.title || ''}  canvas=${rec.canvas || '?'} zoom=${rec.zoom || '?'} h=${rec.pageH || '?'} ${rec.err ? 'ERR ' + rec.err : ''}`);
  }

  cdp.close();
  chrome.kill();
  console.log('done ->', OUT);
  process.exit(0);
})();
