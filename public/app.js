/* ============ Activity Hub フロントエンド ============ */
'use strict';

/* ---------- サービス定義(アイコンはインラインSVG / 外部依存なし) ---------- */
const ICONS = {
  github: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>',
  hn: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="4.5" fill="#ff6600"/><path d="M7.5 6.5 12 13.6l4.5-7.1M12 13.6v4.2" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  reddit: '<svg viewBox="0 0 24 24"><path d="M13.1 3.6 14.8 3l1.4 4.5A8.6 8.6 0 0 1 21 10.3c.7-.5 1-.9 1-1.6 0-1-.8-1.8-1.8-1.8-.7 0-1.3.4-1.6 1A10.6 10.6 0 0 0 12 6.4a10.6 10.6 0 0 0-6.6 1.5 1.8 1.8 0 0 0-1.6-1C2.8 6.9 2 7.7 2 8.7c0 .7.4 1.2 1 1.6a8.6 8.6 0 0 1 4.8-2.8Z" fill="#ff4500" opacity="0"/><circle cx="12" cy="13.8" r="8" fill="#ff4500"/><path d="M12 5.6 13.4 2.4" stroke="#ff4500" stroke-width="1.8" stroke-linecap="round"/><circle cx="13.9" cy="2.2" r="1.5" fill="#ff4500"/><circle cx="9.2" cy="12.8" r="1.25" fill="#fff"/><circle cx="14.8" cy="12.8" r="1.25" fill="#fff"/><path d="M8.6 16.4a4.6 4.6 0 0 0 6.8 0" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>',
  rss: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="4.5" fill="#f59e0b"/><circle cx="7.2" cy="16.8" r="1.7" fill="#fff"/><path d="M6 11.4a7 7 0 0 1 6.6 6.6M6 6.6A11.8 11.8 0 0 1 17.4 18" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  youtube: '<svg viewBox="0 0 24 24"><rect x="1.8" y="5" width="20.4" height="14" rx="4.2" fill="#ff0033"/><path d="M10.2 9.1v5.8l5.2-2.9z" fill="#fff"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M4.5 4.5 11 12.4l-6.2 7.1h2.4L12 14l4 5.5h3l-6.6-8 6-6.9h-2.4L12.3 10l-3.4-5.5z" fill="currentColor"/><path d="M4 4l16 16M20 4 4 20" stroke="currentColor" stroke-width="0" fill="none"/></svg>',
  gcal: '<svg viewBox="0 0 24 24" fill="none" stroke="#5ea1ff" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="8.5" cy="14.5" r="1" fill="#5ea1ff" stroke="none"/><circle cx="12" cy="14.5" r="1" fill="#5ea1ff" stroke="none"/><circle cx="15.5" cy="14.5" r="1" fill="#5ea1ff" stroke="none"/><circle cx="8.5" cy="17.8" r="1" fill="#5ea1ff" stroke="none"/><circle cx="12" cy="17.8" r="1" fill="#5ea1ff" stroke="none"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>',
};

const SERVICES = {
  github:  { name: 'GitHub',          color: 'var(--c-github)' },
  hn:      { name: 'Hacker News',     color: 'var(--c-hn)' },
  reddit:  { name: 'Reddit',          color: 'var(--c-reddit)' },
  rss:     { name: 'RSS',             color: 'var(--c-rss)' },
  youtube: { name: 'YouTube',         color: 'var(--c-youtube)' },
  x:       { name: 'X (Twitter)',     color: 'var(--c-x)' },
  gcal:    { name: 'Google カレンダー', color: 'var(--c-gcal)' },
};
const SERVICE_ORDER = ['github', 'hn', 'reddit', 'rss', 'youtube', 'x', 'gcal'];

/* ---------- 状態 ---------- */
const state = {
  config: null,
  env: {},
  keySource: {},
  results: [],
  fetchedAt: null,
  view: { mode: 'grid', service: null }, // mode: grid | timeline
  demo: false,
  loading: false,
};

const $ = (sel) => document.querySelector(sel);
const gridEl = $('#grid'), timelineEl = $('#timeline'), loadingEl = $('#loading'),
      chipsEl = $('#chips'), bannerEl = $('#banner'), lastUpdatedEl = $('#last-updated');

/* ---------- 小さなDOMヘルパー ---------- */
function el(tag, cls, txt) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined && txt !== null) n.textContent = txt;
  return n;
}
function svgEl(html, cls) {
  const s = document.createElement('span');
  if (cls) s.className = cls;
  s.innerHTML = html; // 静的な信頼できるSVGのみ
  return s;
}
function linkOrDiv(url, cls) {
  if (url && /^https?:\/\//i.test(url)) {
    const a = el('a', cls);
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    return a;
  }
  return el('div', cls);
}

/* ---------- トースト通知(alert の代わり。サンドボックス環境でも確実に見える) ---------- */
function toast(msg, kind = 'info') {
  let box = document.getElementById('toasts');
  if (!box) { box = el('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const t = el('div', `toast toast-${kind}`, msg);
  box.appendChild(t);
  setTimeout(() => { t.classList.add('hide'); setTimeout(() => t.remove(), 350); }, 5500);
}

/* ---------- 時間表示 ---------- */
const WD = ['日', '月', '火', '水', '木', '金', '土'];
function relTime(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const d = Date.now() - t;
  const abs = Math.abs(d);
  const future = d < 0;
  const fmt = (v, unit) => (future ? `${v}${unit}後` : `${v}${unit}前`);
  if (abs < 60e3) return 'たった今';
  if (abs < 3600e3) return fmt(Math.floor(abs / 60e3), '分');
  if (abs < 864e5) return fmt(Math.floor(abs / 3600e3), '時間');
  if (abs < 7 * 864e5) return fmt(Math.floor(abs / 864e5), '日');
  const dt = new Date(t);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}
function dayLabel(iso) {
  const t = new Date(iso);
  if (isNaN(t.getTime())) return '日付不明';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const that = new Date(t); that.setHours(0, 0, 0, 0);
  const diff = Math.round((that - today) / 864e5);
  const s = `${t.getMonth() + 1}/${t.getDate()} (${WD[t.getDay()]})`;
  if (diff === 0) return `今日 · ${s}`;
  if (diff === -1) return `昨日 · ${s}`;
  if (diff === 1) return `明日 · ${s}`;
  if (diff > 1) return `${s} · ${diff}日後`;
  return s;
}
function eventTimeLabel(item) {
  const s = new Date(item.time), e = item.endTime ? new Date(item.endTime) : null;
  const hm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const day = `${s.getMonth() + 1}/${s.getDate()}(${WD[s.getDay()]})`;
  if (item.allDay) return `${day} 終日`;
  if (e && e.getTime() - s.getTime() > 60e3) return `${day} ${hm(s)} – ${hm(e)}`;
  return `${day} ${hm(s)}`;
}

/* ---------- アイテム描画(カード内リスト) ---------- */
function buildItemEl(item, service) {
  const row = linkOrDiv(item.url, 'item');
  const main = el('div', 'item-main');
  main.appendChild(el('div', 'item-title', item.title));
  if (item.text) main.appendChild(el('div', 'item-text', item.text));

  const meta = el('div', 'item-meta');
  if (service === 'gcal' && item.state) {
    const label = item.state === 'upcoming' ? '予定' : item.state === 'ongoing' ? '進行中' : '終了';
    meta.appendChild(el('span', `state-badge state-${item.state}`, label));
    meta.appendChild(el('span', '', eventTimeLabel(item)));
  } else {
    const parts = [];
    if (item.author) parts.push(item.author);
    if (item.meta) parts.push(item.meta);
    meta.appendChild(el('span', '', parts.join(' · ')));
  }
  if (parts_len(meta)) main.appendChild(meta);
  row.appendChild(main);

  if (item.thumb) {
    const img = el('img', 'item-thumb');
    img.src = item.thumb; img.alt = ''; img.loading = 'lazy';
    img.onerror = () => img.remove();
    row.appendChild(img);
  }
  const t = relTime(item.time);
  if (t) row.appendChild(el('div', 'item-time', service === 'gcal' && item.state === 'upcoming' ? t : t));
  return row;
}
function parts_len(node) { return node.textContent.trim().length > 0 || node.children.length > 0; }

/* ---------- カード描画 ---------- */
function buildCard(result) {
  const svc = SERVICES[result.service] || { name: result.service, color: 'var(--muted)' };
  const card = el('div', 'card');
  const head = el('div', 'card-head');
  const ico = svgEl(ICONS[result.service] || ICONS.clock, 'svc-ico');
  ico.style.color = svc.color;
  head.appendChild(ico);
  const info = el('div', 'card-head-info');
  info.appendChild(el('div', 'card-title', svc.name));
  info.appendChild(el('div', 'card-source', result.source || ''));
  head.appendChild(info);

  const refresh = el('button', 'card-refresh');
  refresh.title = 'このソースだけ再読み込み';
  refresh.innerHTML = '<svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4"/></svg>';
  refresh.addEventListener('click', () => refreshOne(result, refresh));
  head.appendChild(refresh);
  card.appendChild(head);

  const body = el('div', 'card-body');
  if (result.ok) {
    const items = result.items || [];
    if (!items.length) {
      body.appendChild(el('div', 'card-empty', '最近のアクティビティはありません'));
    } else {
      for (const it of items) body.appendChild(buildItemEl(it, result.service));
    }
  } else {
    const errBox = el('div', 'card-error');
    errBox.appendChild(el('span', 'err-icon', result.code === 'credentials_required' ? '🔑' : '⚠️'));
    errBox.appendChild(el('div', 'err-msg', result.message || '取得に失敗しました'));
    if (result.code === 'credentials_required') {
      errBox.appendChild(el('div', 'err-hint', 'サーバーの .env に資格情報を設定すると有効になります(README.md 参照)'));
      const b = el('button', 'btn', '設定を開く');
      b.addEventListener('click', openSettings);
      errBox.appendChild(b);
    } else {
      const b = el('button', 'btn', '再試行');
      b.addEventListener('click', () => refreshOne(result, refresh));
      errBox.appendChild(b);
    }
    body.appendChild(errBox);
  }
  card.appendChild(body);
  card.dataset.service = result.service;
  card.dataset.source = result.source || '';
  return card;
}

/* ---------- タイムライン描画(すべて表示) ---------- */
function buildTimeline(results) {
  timelineEl.textContent = '';
  const all = [];
  for (const r of results) {
    if (!r.ok) continue;
    for (const it of r.items || []) all.push({ ...it, service: r.service, source: r.source });
  }
  all.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
  if (!all.length) {
    timelineEl.appendChild(el('div', 'card-empty', '表示できるアクティビティがありません'));
    return;
  }
  let currentDay = null;
  for (const it of all) {
    const day = it.time ? dayLabel(it.time) : '日付不明';
    if (day !== currentDay) {
      currentDay = day;
      timelineEl.appendChild(el('div', 'tl-day', day));
    }
    const svc = SERVICES[it.service] || { name: it.service, color: 'var(--muted)' };
    const row = linkOrDiv(it.url, 'tl-item');
    const ico = svgEl(ICONS[it.service] || ICONS.clock, 'tl-ico');
    ico.style.color = svc.color;
    row.appendChild(ico);
    const main = el('div', 'tl-main');
    main.appendChild(el('div', 'tl-title', it.title));
    const meta = el('div', 'tl-meta');
    meta.appendChild(el('span', 'mini-badge', `${svc.name}${it.source ? ' · ' + it.source : ''}`));
    if (it.service === 'gcal' && it.state) {
      const label = it.state === 'upcoming' ? '予定' : it.state === 'ongoing' ? '進行中' : '終了';
      meta.appendChild(el('span', `state-badge state-${it.state}`, label));
      meta.appendChild(el('span', '', eventTimeLabel(it)));
    } else {
      const parts = [it.author, it.meta].filter(Boolean).join(' · ');
      if (parts) meta.appendChild(el('span', '', parts));
    }
    main.appendChild(meta);
    row.appendChild(main);
    const t = relTime(it.time);
    if (t) row.appendChild(el('div', 'tl-time', t));
    timelineEl.appendChild(row);
  }
}

/* ---------- チップ ---------- */
function renderChips() {
  chipsEl.textContent = '';
  const counts = {};
  let total = 0;
  for (const r of state.results) {
    if (!r.ok) continue;
    counts[r.service] = (counts[r.service] || 0) + (r.items || []).length;
    total += (r.items || []).length;
  }
  const mkChip = (label, iconHtml, color, count, active, onClick) => {
    const c = el('button', 'chip' + (active ? ' active' : ''));
    const ico = svgEl(iconHtml, 'chip-ico');
    if (color) ico.style.color = color;
    c.appendChild(ico);
    c.appendChild(el('span', '', label));
    if (count !== null && count !== undefined) c.appendChild(el('span', 'count', String(count)));
    c.addEventListener('click', onClick);
    chipsEl.appendChild(c);
  };
  const v = state.view;
  mkChip('すべて', ICONS.grid, null, total, v.mode === 'grid' && !v.service, () => { state.view = { mode: 'grid', service: null }; render(); });
  mkChip('タイムライン', ICONS.clock, null, total, v.mode === 'timeline', () => { state.view = { mode: 'timeline' }; render(); });
  for (const sid of SERVICE_ORDER) {
    if (!(sid in counts) && !hasSourceInConfig(sid)) continue;
    mkChip(SERVICES[sid].name, ICONS[sid], SERVICES[sid].color, counts[sid] || 0,
      v.mode === 'grid' && v.service === sid,
      () => { state.view = { mode: 'grid', service: sid }; render(); });
  }
}
function hasSourceInConfig(sid) {
  const c = state.config; if (!c) return false;
  switch (sid) {
    case 'github': return c.github.enabled && (c.github.users || []).length > 0;
    case 'hn': return c.hn.enabled;
    case 'reddit': return c.reddit.enabled && (c.reddit.subreddits || []).length > 0;
    case 'rss': return c.rss.enabled && (c.rss.feeds || []).length > 0;
    case 'youtube': return c.youtube.enabled && (c.youtube.channels || []).length > 0;
    case 'x': return c.x.enabled && (c.x.accounts || []).length > 0;
    case 'gcal': return c.gcal.enabled && (c.gcal.calendarIds || []).length > 0;
  }
  return false;
}

/* ---------- メイン描画 ---------- */
function render() {
  renderChips();
  const v = state.view;
  if (v.mode === 'timeline') {
    gridEl.hidden = true; timelineEl.hidden = false;
    buildTimeline(state.results);
  } else {
    timelineEl.hidden = true; gridEl.hidden = false;
    gridEl.textContent = '';
    const results = [...state.results].sort((a, b) =>
      SERVICE_ORDER.indexOf(a.service) - SERVICE_ORDER.indexOf(b.service));
    const filtered = v.service ? results.filter((r) => r.service === v.service) : results;
    if (!filtered.length && !state.loading) {
      gridEl.appendChild(el('div', 'card-empty', '表示するソースがありません。「設定」から追加してください。'));
    }
    for (const r of filtered) gridEl.appendChild(buildCard(r));
  }
  loadingEl.hidden = !(state.loading && !state.results.length);
  if (state.fetchedAt) {
    const d = new Date(state.fetchedAt);
    lastUpdatedEl.textContent = `更新 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  }
}

/* ---------- データ取得 ---------- */
async function fetchAll(force = false, silent = false) {
  if (state.demo) return;
  if (!silent) { state.loading = true; render(); }
  $('#btn-refresh').querySelector('.ico-refresh').classList.add('spin');
  try {
    const res = await fetch('/api/feed/all' + (force ? '?force=1' : ''));
    const data = await res.json();
    if (!data.ok) throw new Error(data.message || 'サーバーエラー');
    state.results = data.results || [];
    state.env = data.env || {};
    state.fetchedAt = data.fetchedAt;
  } catch (e) {
    console.error(e);
    enterDemoMode();
    return;
  } finally {
    $('#btn-refresh').querySelector('.ico-refresh').classList.remove('spin');
    state.loading = false;
  }
  render();
}

async function refreshOne(result, btn) {
  const p = new URLSearchParams({ force: '1' });
  switch (result.service) {
    case 'github': p.set('user', result.source); break;
    case 'hn': p.set('mode', state.config.hn.mode); p.set('limit', state.config.hn.limit); break;
    case 'reddit': p.set('sub', result.source); break;
    case 'youtube': p.set('channel', result.source); break;
    case 'x': p.set('user', String(result.source).replace(/^@/, '')); break;
    case 'gcal': p.set('calendarId', result.source); break;
    case 'rss': {
      const feed = (state.config.rss.feeds || []).find((f) => (f.name || new URL(f.url).hostname) === result.source || f.url === result.source);
      if (feed) p.set('url', feed.url);
      break;
    }
  }
  if (btn) btn.querySelector('svg').classList.add('spin');
  try {
    const res = await fetch(`/api/feed/${result.service}?${p}`);
    const data = await res.json();
    const idx = state.results.findIndex((r) => r.service === result.service && r.source === result.source);
    if (idx >= 0) state.results[idx] = data; else state.results.push(data);
    render();
  } catch (e) {
    toast('再読み込みに失敗しました: ' + e.message, 'err');
  } finally {
    if (btn) btn.querySelector('svg').classList.remove('spin');
  }
}

/* ---------- デモモード(サーバー未起動 / file:// で開いた時) ---------- */
function enterDemoMode() {
  state.demo = true;
  state.loading = false;
  state.results = demoResults();
  state.fetchedAt = new Date().toISOString();
  bannerEl.hidden = false;
  bannerEl.textContent = '';
  bannerEl.appendChild(el('span', '', '⚠️'));
  const div = el('div');
  div.appendChild(el('span', '', 'サーバーに接続できないため、サンプルデータを表示しています(デモモード)。実際のデータを見るには '));
  const code = el('code', '', 'activity-hub フォルダで node server.js を実行');
  div.appendChild(code);
  div.appendChild(el('span', '', ' して http://localhost:3000 を開いてください。'));
  bannerEl.appendChild(div);
  render();
}
function demoResults() {
  const now = Date.now();
  const ago = (h) => new Date(now - h * 3600e3).toISOString();
  const later = (h) => new Date(now + h * 3600e3).toISOString();
  return [
    { ok: true, service: 'github', source: 'torvalds', items: [
      { id: 'd1', title: 'torvalds/linux にプッシュ', url: 'https://github.com/torvalds/linux', author: 'torvalds', time: ago(2), meta: 'master · 12 コミット', text: 'Merge tag \'drm-fixes-6.9\' of git://anongit.freedesktop.org/drm/drm' },
      { id: 'd2', title: 'linux をスター', url: 'https://github.com/torvalds/linux', author: 'torvalds', time: ago(9), meta: 'star', text: '' },
      { id: 'd3', title: 'test-project に Issue「Build fails on macOS」を立てた', url: 'https://github.com/torvalds/linux', author: 'torvalds', time: ago(26), meta: 'Issue opened · #1234', text: 'After upgrading to Xcode 16, the build fails with…' },
    ]},
    { ok: true, service: 'hn', source: 'top', items: [
      { id: 'd4', title: 'Show HN: I built a zero-dependency dashboard for all my feeds', url: 'https://news.ycombinator.com/', author: 'qwen', time: ago(1.5), meta: '312 points · 87 コメント', text: '' },
      { id: 'd5', title: 'The hidden costs of microservices', url: 'https://news.ycombinator.com/', author: 'alice', time: ago(4), meta: '198 points · 143 コメント', text: '' },
      { id: 'd6', title: 'Node.js 25 released with built-in TypeScript stripping', url: 'https://news.ycombinator.com/', author: 'bob', time: ago(7), meta: '156 points · 92 コメント', text: '' },
    ]},
    { ok: true, service: 'reddit', source: 'japan', items: [
      { id: 'd7', title: 'Autumn leaves season has started in Nikko [Photo]', url: 'https://www.reddit.com/r/japan/', author: 'traveler42', time: ago(3), meta: 'r/japan · 254 points · 38 コメント', text: '' },
      { id: 'd8', title: 'What is the etiquette for onsen with tattoos?', url: 'https://www.reddit.com/r/japan/', author: 'onsenfan', time: ago(8), meta: 'r/japan · 96 points · 71 コメント', text: 'Planning a trip to Hakone next month…' },
    ]},
    { ok: true, service: 'rss', source: 'NHK NEWS', items: [
      { id: 'd9', title: '【サンプル】気象庁 線状降水帯の予測精度向上へ新システム', url: 'https://www3.nhk.or.jp/news/', author: 'NHK', time: ago(1), meta: 'NHK', text: '気象庁は、豪雨の原因となる線状降水帯の予測精度を高めるため…' },
      { id: 'd10', title: '【サンプル】円相場 一時150円台前半まで値下がり', url: 'https://www3.nhk.or.jp/news/', author: 'NHK', time: ago(5), meta: 'NHK', text: '週明けの東京外国為替市場は…' },
    ]},
    { ok: true, service: 'youtube', source: '@NHK', items: [
      { id: 'd11', title: '【サンプル】明日の天気 全国の予報', url: 'https://www.youtube.com/', author: 'NHK', time: ago(6), meta: '12,345 回視聴', text: '' },
      { id: 'd12', title: '【サンプル】ニュース解説 経済の動き', url: 'https://www.youtube.com/', author: 'NHK', time: ago(30), meta: '8,901 回視聴', text: '' },
    ]},
    { ok: true, service: 'gcal', source: 'primary', items: [
      { id: 'd13', title: '【サンプル】チーム定例ミーティング', url: '', author: 'work@example.com', time: later(3), endTime: later(4), allDay: false, state: 'upcoming', meta: '', text: '📍 オンライン' },
      { id: 'd14', title: '【サンプル】歯医者', url: '', author: 'personal', time: later(28), endTime: later(29), allDay: false, state: 'upcoming', meta: '', text: '' },
    ]},
    { ok: false, service: 'x', source: '@NASA', code: 'credentials_required', message: 'デモモード: .env に X_BEARER_TOKEN を設定すると表示されます' },
  ];
}

/* ---------- テーマ ---------- */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  const ico = $('#ico-theme');
  ico.innerHTML = t === 'dark'
    ? '<circle cx="12" cy="12" r="4.5" fill="currentColor"/><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" fill="none"/>'
    : '<path fill="currentColor" d="M20.5 14.8A8.6 8.6 0 0 1 9.2 3.5a8.6 8.6 0 1 0 11.3 11.3z"/>';
  try { localStorage.setItem('ah-theme', t); } catch {}
}
function initTheme() {
  let t = 'dark';
  try {
    t = localStorage.getItem('ah-theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  } catch {}
  applyTheme(t);
}

/* ---------- 設定モーダル ---------- */
let draft = null;
let secretDraft = {}; // { ENV_KEY: '値' | null(削除) } — 触った項目だけ送信
const SETTINGS_SCHEMA = [
  { id: 'github', name: 'GitHub', desc: 'ユーザーの公開アクティビティ(プッシュ・スター・Issue など)', envKey: 'github', envOptional: true, listKey: 'users', placeholder: 'ユーザー名(例: torvalds)', addLabel: '+ ユーザーを追加',
    keys: [{ k: 'GITHUB_TOKEN', label: 'Personal Access Token', ph: 'ghp_… または github_pat_…(権限スコープ不要)', optional: true, hint: '任意。未設定でも動作しますが 60回/時の制限あり → 設定で 5,000回/時' }] },
  { id: 'hn', name: 'Hacker News', desc: 'トップ記事(キー不要)', envKey: null, hn: true },
  { id: 'reddit', name: 'Reddit', desc: 'サブreddit の新着投稿', envKey: 'reddit', envRequired: true, listKey: 'subreddits', placeholder: 'サブreddit名(例: japan)', addLabel: '+ サブレディットを追加',
    keys: [
      { k: 'REDDIT_CLIENT_ID', label: 'Client ID', ph: 'アプリ名の下にある14文字程度のID', required: true },
      { k: 'REDDIT_CLIENT_SECRET', label: 'Client Secret', ph: 'secret の値', required: true },
    ], keyNote: '取得: reddit.com/prefs/apps →「create an app」→ 種類 script(無料)' },
  { id: 'rss', name: 'RSS フィード', desc: 'お好きなブログ・ニュースサイト(キー不要)', envKey: null, feeds: true },
  { id: 'youtube', name: 'YouTube', desc: 'チャンネルの最近の動画', envKey: 'youtube', envOptional: true, optionalNote: 'キーなしでも RSS 経由で動作(取得できない場合はキー推奨)', listKey: 'channels', placeholder: '@ハンドル / チャンネルID(UC…) / URL', addLabel: '+ チャンネルを追加',
    keys: [{ k: 'YOUTUBE_API_KEY', label: 'API キー', ph: 'AIza…(YouTube Data API v3)', optional: true, hint: '任意。RSS で取得できない環境では設定を推奨' }] },
  { id: 'x', name: 'X (Twitter)', desc: 'アカウントの最近の投稿', envKey: 'x', envRequired: true, listKey: 'accounts', placeholder: 'アカウント名 @なし(例: NASA)', addLabel: '+ アカウントを追加',
    keys: [{ k: 'X_BEARER_TOKEN', label: 'Bearer Token', ph: 'AAAA…(API v2 Bearer Token)', required: true }],
    keyNote: '取得: developer.x.com → Projects & Apps → 該当App → Keys and tokens → Bearer Token' },
  { id: 'gcal', name: 'Google カレンダー', desc: '過去7日〜未来21日の予定', envKey: 'gcal', envRequired: true, listKey: 'calendarIds', placeholder: 'カレンダーID(自分の既定は primary)', addLabel: '+ カレンダーを追加',
    keys: [
      { k: 'GOOGLE_CLIENT_ID', label: 'OAuth Client ID', ph: 'xxxx.apps.googleusercontent.com' },
      { k: 'GOOGLE_CLIENT_SECRET', label: 'Client Secret', ph: 'GOCSPX-…' },
      { k: 'GOOGLE_REFRESH_TOKEN', label: 'Refresh Token', ph: '1//0…(calendar.readonly スコープ)' },
    ], keyNote: 'サービスアカウント方式を使う場合は .env の GOOGLE_APPLICATION_CREDENTIALS で JSON パスを指定してください' },
];

function openSettings() {
  if (state.demo) {
    toast('デモモード: サーバーに接続されていないため設定は変更できません。activity-hub フォルダで「node server.js」を実行し、http://localhost:3000 を開いてください。', 'warn');
    return;
  }
  if (!state.config) return;
  draft = JSON.parse(JSON.stringify(state.config));
  secretDraft = {};
  renderSettings();
  $('#modal-overlay').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeSettings() {
  $('#modal-overlay').hidden = true;
  document.body.style.overflow = '';
}

function renderSettings() {
  const body = $('#modal-body');
  body.textContent = '';
  for (const s of SETTINGS_SCHEMA) {
    const section = el('div', 'setting-section');
    const head = el('div', 'setting-head');
    const ico = svgEl(ICONS[s.id], 'svc-ico');
    ico.style.color = (SERVICES[s.id] || {}).color;
    head.appendChild(ico);
    const info = el('div', 'setting-head-info');
    info.appendChild(el('div', 'setting-name', s.name));
    info.appendChild(el('div', 'setting-desc', s.desc));
    head.appendChild(info);

    // 資格情報の状態ピル
    if (s.envKey) {
      const on = !!state.env[s.envKey];
      const srcs = (s.keys || []).map((k) => state.keySource[k.k]).filter(Boolean);
      const srcLabel = srcs.includes('runtime') ? '設定画面で保存済み' : srcs.includes('env') ? '.env/環境変数で設定済み' : '';
      const pill = el('span', 'status-pill ' + (on ? 'status-on' : s.envRequired ? 'status-warn' : 'status-off'),
        on ? '🔑 設定済み' : s.envRequired ? '🔑 要設定' : 'キーなしで動作');
      pill.title = srcLabel || (s.optionalNote || '下の入力欄から設定できます(保存後すぐ反映)');
      head.appendChild(pill);
    } else {
      head.appendChild(el('span', 'status-pill status-on', 'キー不要'));
    }
    // 有効スイッチ
    const sw = el('label', 'switch');
    const cb = el('input'); cb.type = 'checkbox'; cb.checked = !!draft[s.id].enabled;
    cb.addEventListener('change', () => { draft[s.id].enabled = cb.checked; });
    sw.appendChild(cb); sw.appendChild(el('span', 'slider'));
    head.appendChild(sw);
    section.appendChild(head);

    const sbody = el('div', 'setting-body');
    if (s.hn) {
      const row = el('div', 'setting-row');
      const sel = el('select');
      for (const [v, label] of [['top', 'トップ記事'], ['best', 'ベスト記事'], ['new', '新着記事']]) {
        const o = el('option', '', label); o.value = v;
        if (draft.hn.mode === v) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener('change', () => { draft.hn.mode = sel.value; });
      row.appendChild(sel);
      const num = el('input'); num.type = 'number'; num.min = '5'; num.max = '30'; num.value = draft.hn.limit;
      num.addEventListener('change', () => { draft.hn.limit = Number(num.value) || 15; });
      row.appendChild(num);
      row.appendChild(el('span', 'setting-desc', '件'));
      sbody.appendChild(row);
    } else if (s.feeds) {
      renderFeedRows(sbody);
    } else if (s.listKey) {
      renderListRows(sbody, s);
    }
    // APIキー入力欄
    if (s.keys) {
      const kb = el('div', 'keys-block');
      kb.appendChild(el('div', 'keys-title', s.envRequired ? '🔑 APIキー(このサービスに必要)' : '🔑 APIキー(任意)'));
      if (s.keyNote) kb.appendChild(el('div', 'setting-note', s.keyNote));
      for (const keyDef of s.keys) kb.appendChild(buildKeyRow(keyDef));
      sbody.appendChild(kb);
    }
    section.appendChild(sbody);
    body.appendChild(section);
  }
}

/* APIキー1行: ラベル+状態 + パスワード入力 + 削除ボタン */
function buildKeyRow(keyDef) {
  const row = el('div', 'key-row');
  let src = state.keySource[keyDef.k];
  if (!src && keyDef.k === 'X_BEARER_TOKEN') src = state.keySource['TWITTER_BEARER_TOKEN'];

  const label = el('div', 'key-label');
  label.appendChild(el('code', '', keyDef.k));
  const st = el('span', 'key-status ' + (src === 'runtime' ? 'set-runtime' : src === 'env' ? 'set-env' : 'unset'),
    src === 'runtime' ? '設定済み(設定画面で保存)' : src === 'env' ? '設定済み(.env/環境変数)' : '未設定');
  label.appendChild(st);
  row.appendChild(label);
  if (keyDef.hint) row.appendChild(el('div', 'setting-note', keyDef.hint));

  const line = el('div', 'key-input-line');
  const inp = el('input');
  inp.type = 'password'; inp.placeholder = src ? '変更する場合のみ入力(空欄なら維持)' : (keyDef.ph || '');
  inp.autocomplete = 'off'; inp.spellcheck = false;
  inp.addEventListener('input', () => {
    if (secretDraft[keyDef.k] === null) return; // 削除予約中は無視
    const v = inp.value.trim();
    if (v) secretDraft[keyDef.k] = v; else delete secretDraft[keyDef.k];
  });
  line.appendChild(inp);

  if (src) {
    const del = el('button', 'btn-key-del', '保存済みキーを削除');
    del.addEventListener('click', () => {
      if (secretDraft[keyDef.k] === null) {
        // 取り消し
        delete secretDraft[keyDef.k];
        st.className = 'key-status ' + (src === 'runtime' ? 'set-runtime' : 'set-env');
        st.textContent = src === 'runtime' ? '設定済み(設定画面で保存)' : '設定済み(.env/環境変数)';
        del.textContent = '保存済みキーを削除';
        inp.disabled = false;
      } else {
        secretDraft[keyDef.k] = null; // null = 削除要求
        st.className = 'key-status unset';
        st.textContent = '削除予定(保存ボタンで反映)';
        del.textContent = '削除を取り消し';
        inp.value = ''; inp.disabled = true;
      }
    });
    line.appendChild(del);
  }
  row.appendChild(line);
  return row;
}

function renderListRows(container, s) {
  const list = draft[s.id][s.listKey];
  const rebuild = () => { container.textContent = ''; renderListRows(container, s); };
  for (let i = 0; i < list.length; i++) {
    const row = el('div', 'setting-row');
    const inp = el('input'); inp.type = 'text'; inp.value = list[i]; inp.placeholder = s.placeholder;
    inp.addEventListener('input', () => { list[i] = inp.value; });
    row.appendChild(inp);
    const del = el('button', 'row-del');
    del.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>';
    del.title = '削除';
    del.addEventListener('click', () => { list.splice(i, 1); rebuild(); });
    row.appendChild(del);
    container.appendChild(row);
  }
  const add = el('button', 'btn btn-add', s.addLabel);
  add.addEventListener('click', () => { list.push(''); rebuild(); const inputs = container.querySelectorAll('input[type=text]'); if (inputs.length) inputs[inputs.length - 1].focus(); });
  container.appendChild(add);
}

function renderFeedRows(container) {
  const list = draft.rss.feeds;
  const rebuild = () => { container.textContent = ''; renderFeedRows(container); };
  for (let i = 0; i < list.length; i++) {
    const row = el('div', 'setting-row');
    const name = el('input'); name.type = 'text'; name.value = list[i].name || ''; name.placeholder = '名前(例: NHK NEWS)';
    name.style.flex = '0 0 150px';
    name.addEventListener('input', () => { list[i].name = name.value; });
    const url = el('input'); url.type = 'text'; url.value = list[i].url || ''; url.placeholder = 'フィードURL(https://…)';
    url.addEventListener('input', () => { list[i].url = url.value; });
    row.appendChild(name); row.appendChild(url);
    const del = el('button', 'row-del');
    del.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>';
    del.title = '削除';
    del.addEventListener('click', () => { list.splice(i, 1); rebuild(); });
    row.appendChild(del);
    container.appendChild(row);
  }
  const add = el('button', 'btn btn-add', '+ フィードを追加');
  add.addEventListener('click', () => { list.push({ name: '', url: '' }); rebuild(); });
  container.appendChild(add);
}

async function saveSettings() {
  // 空エントリの除去
  for (const s of SETTINGS_SCHEMA) {
    if (s.listKey) draft[s.id][s.listKey] = (draft[s.id][s.listKey] || []).map((v) => String(v).trim()).filter(Boolean);
  }
  draft.rss.feeds = (draft.rss.feeds || []).map((f) => ({ name: String(f.name || '').trim(), url: String(f.url || '').trim() }))
    .filter((f) => /^https?:\/\//i.test(f.url));
  const btn = $('#btn-config-save');
  btn.disabled = true; btn.textContent = '保存中…';
  let savedKeys = 0;
  try {
    // 1) APIキー(触った項目だけ送信: 文字列=保存 / null=削除)
    const touched = {};
    for (const [k, v] of Object.entries(secretDraft)) {
      if (v === null) touched[k] = null;
      else if (String(v).trim()) touched[k] = String(v).trim();
    }
    if (Object.keys(touched).length) {
      const r = await fetch('/api/secrets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(touched),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.message || 'APIキーの保存に失敗しました');
      state.env = d.env || state.env;
      state.keySource = d.keySource || {};
      savedKeys = Object.keys(touched).length;
    }
    // 2) ソース設定
    const res = await fetch('/api/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.message || '設定の保存に失敗しました');
    state.config = data.config;
    draft = null; secretDraft = {};
    closeSettings();
    toast(savedKeys ? `設定とAPIキー(${savedKeys}件)を保存しました。最新データを取得中…` : '設定を保存しました。最新データを取得中…', 'ok');
    await fetchAll(true);
  } catch (e) {
    toast('保存に失敗しました: ' + e.message, 'err');
  } finally {
    btn.disabled = false; btn.textContent = '保存して再読み込み';
  }
}

/* ---------- 初期化 ---------- */
async function init() {
  initTheme();
  $('#btn-theme').addEventListener('click', () =>
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  $('#btn-refresh').addEventListener('click', () => fetchAll(true));
  $('#btn-settings').addEventListener('click', openSettings);
  $('#btn-modal-close').addEventListener('click', closeSettings);
  $('#btn-config-cancel').addEventListener('click', closeSettings);
  $('#btn-config-save').addEventListener('click', saveSettings);
  $('#modal-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeSettings(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal-overlay').hidden) closeSettings(); });

  if (location.protocol === 'file:') { enterDemoMode(); return; }
  try {
    const res = await fetch('/api/state');
    const data = await res.json();
    if (!data.ok) throw new Error(data.message);
    state.config = data.config;
    state.env = data.env || {};
    state.keySource = data.keySource || {};
  } catch {
    enterDemoMode();
    return;
  }
  await fetchAll(false);
  setInterval(() => fetchAll(false, true), 5 * 60 * 1000); // 5分ごとに自動更新
}

init();
