#!/usr/bin/env node
/**
 * Activity Hub — ゼロ依存 Node.js サーバー
 * いろいろなサイトの最近のアクティビティを集約するダッシュボード。
 *
 * 起動:  node server.js   →  http://localhost:3000
 * 要件:  Node.js 18 以上 (組み込み fetch を使用) / npm install 不要
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 3000);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 ActivityHub/1.0';
const CACHE_TTL = 5 * 60 * 1000; // 5分間サーバー側キャッシュ(レート制限対策)

/* ================= .env ローダー (dotenv 代わり) ================= */
(function loadDotenv() {
  try {
    const txt = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      if (line.trim().startsWith('#')) continue;
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!v) continue; // 空値は「未設定」扱い
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  } catch { /* .env なしでもOK */ }
})();
const ENV = (k) => (process.env[k] || '').trim();

/* ---- ランタイム シークレット ----
 * 設定画面(UI)から保存された API キーを secrets.json に保持し、再起動なしで即反映する。
 * 優先順位: secrets.json(UI保存) > 環境変数 / .env
 * ファイルは 0600 で保存し、API から値を返すことはない(設定済みフラグのみ)。 */
const SECRET_KEYS = [
  'GITHUB_TOKEN',
  'REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET',
  'YOUTUBE_API_KEY',
  'X_BEARER_TOKEN', 'TWITTER_BEARER_TOKEN',
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN',
  'HOYOLAB_COOKIE',
];
let runtimeSecrets = {};
const SECRETS_PATH = ENV('DATA_DIR') ? path.join(ENV('DATA_DIR'), 'secrets.json') : path.join(ROOT, 'secrets.json');
try {
  const loaded = JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf8'));
  for (const k of SECRET_KEYS) if (typeof loaded[k] === 'string' && loaded[k].trim()) runtimeSecrets[k] = loaded[k].trim();
} catch { /* 未作成なら空 */ }

function SECRET(k) {
  const v = (runtimeSecrets[k] || '').trim();
  return v || ENV(k);
}
function persistSecrets() {
  fs.mkdirSync(path.dirname(SECRETS_PATH), { recursive: true });
  fs.writeFileSync(SECRETS_PATH, JSON.stringify(runtimeSecrets, null, 2) + '\n', { mode: 0o600 });
}
function keySourceMap() {
  const m = {};
  for (const k of SECRET_KEYS) {
    if ((runtimeSecrets[k] || '').trim()) m[k] = 'runtime';
    else if (ENV(k)) m[k] = 'env';
  }
  return m;
}

/* ---- 設定ファイルの保存先 ----
 * 既定: アプリと同じフォルダの config.json
 * Railway 等のコンテナ環境では Volume を /data にマウントし DATA_DIR=/data を設定すると
 * 再デプロイ後も設定(UIからの変更)が維持されます。 */
const REPO_CONFIG_PATH = path.join(ROOT, 'config.json');
const CONFIG_PATH = (() => {
  if (ENV('CONFIG_PATH')) return path.resolve(ROOT, ENV('CONFIG_PATH'));
  if (ENV('DATA_DIR')) return path.join(ENV('DATA_DIR'), 'config.json');
  return REPO_CONFIG_PATH;
})();
// 初回起動時: リポジトリ同梱の config.json を保存先にシードする
(function seedConfig() {
  try {
    if (CONFIG_PATH !== REPO_CONFIG_PATH && !fs.existsSync(CONFIG_PATH) && fs.existsSync(REPO_CONFIG_PATH)) {
      fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
      fs.copyFileSync(REPO_CONFIG_PATH, CONFIG_PATH);
      console.log(`[config] ${REPO_CONFIG_PATH} → ${CONFIG_PATH} に初期設定をコピーしました`);
    }
  } catch (e) { console.error('[config] シード失敗:', e.message); }
})();

function envStatus() {
  return {
    github: !!SECRET('GITHUB_TOKEN'),
    reddit: !!(SECRET('REDDIT_CLIENT_ID') && SECRET('REDDIT_CLIENT_SECRET')),
    youtube: !!SECRET('YOUTUBE_API_KEY'),
    x: !!(SECRET('X_BEARER_TOKEN') || SECRET('TWITTER_BEARER_TOKEN')),
    gcal: !!(ENV('GOOGLE_APPLICATION_CREDENTIALS') ||
      (SECRET('GOOGLE_CLIENT_ID') && SECRET('GOOGLE_CLIENT_SECRET') && SECRET('GOOGLE_REFRESH_TOKEN'))),
    hkrpg: !!SECRET('HOYOLAB_COOKIE'),
  };
}

/* ================= 設定 (config.json) ================= */
/* 初回は空 = サイトを開いてから設定画面で追加する(プリセットは表示しない) */
const DEFAULT_CONFIG = {
  github:  { enabled: true, users: [] },
  hn:      { enabled: false, mode: 'top', limit: 15 },
  reddit:  { enabled: true, subreddits: [] },
  rss:     { enabled: true, feeds: [] },
  youtube: { enabled: true, channels: [] },
  x:       { enabled: true, accounts: [] },
  gcal:    { enabled: true, calendarIds: [] },
  hkrpg:   { enabled: false, region: 'os_asia', uid: '', checkin: false, news: true },
};

/* 「サンプルで試す」用のスターター設定(キー不要なソースのみ) */
const STARTER_CONFIG = {
  github:  { enabled: true, users: ['torvalds'] },
  hn:      { enabled: true, mode: 'top', limit: 15 },
  reddit:  { enabled: true, subreddits: [] },
  rss:     { enabled: true, feeds: [{ name: 'NHK NEWS', url: 'https://www3.nhk.or.jp/rss/news/cat0.xml' }] },
  youtube: { enabled: true, channels: ['@NHK'] },
  x:       { enabled: true, accounts: [] },
  gcal:    { enabled: true, calendarIds: [] },
  hkrpg:   { enabled: false, region: 'os_asia', uid: '', checkin: false, news: true },
};

function loadConfig() {
  try {
    const c = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return { ...structuredClone(DEFAULT_CONFIG), ...c };
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}
function saveConfig(c) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(c, null, 2) + '\n');
}

// 保存時のサニタイズ(許可されたキー・型だけ受け取る)
function sanitizeConfig(input) {
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const strList = (v, max = 50) => (Array.isArray(v) ? v.map(str).filter(Boolean).slice(0, max) : []);
  const out = structuredClone(DEFAULT_CONFIG);
  const g = input || {};
  if (g.github) { out.github = { enabled: !!g.github.enabled, users: strList(g.github.users) }; }
  if (g.hn) {
    out.hn = {
      enabled: !!g.hn.enabled,
      mode: ['top', 'best', 'new'].includes(g.hn.mode) ? g.hn.mode : 'top',
      limit: Math.max(5, Math.min(30, Number(g.hn.limit) || 15)),
    };
  }
  if (g.reddit) { out.reddit = { enabled: !!g.reddit.enabled, subreddits: strList(g.reddit.subreddits).map((s) => s.replace(/^\/?r\//, '')) }; }
  if (g.rss) {
    out.rss = {
      enabled: !!g.rss.enabled,
      feeds: (Array.isArray(g.rss.feeds) ? g.rss.feeds : [])
        .map((f) => ({ name: str(f && f.name), url: str(f && f.url) }))
        .filter((f) => /^https?:\/\//i.test(f.url))
        .slice(0, 30),
    };
  }
  if (g.youtube) { out.youtube = { enabled: !!g.youtube.enabled, channels: strList(g.youtube.channels) }; }
  if (g.x) { out.x = { enabled: !!g.x.enabled, accounts: strList(g.x.accounts).map((s) => s.replace(/^@/, '')) }; }
  if (g.gcal) { out.gcal = { enabled: !!g.gcal.enabled, calendarIds: strList(g.gcal.calendarIds) }; }
  if (g.hkrpg) {
    out.hkrpg = {
      enabled: !!g.hkrpg.enabled,
      region: ['os_asia', 'os_usa', 'os_eur', 'os_cht'].includes(g.hkrpg.region) ? g.hkrpg.region : 'os_asia',
      uid: str(g.hkrpg.uid).replace(/\D/g, '').slice(0, 12),
      checkin: !!g.hkrpg.checkin,
      news: g.hkrpg.news !== false,
    };
  }
  return out;
}

/* ================= 共通ヘルパー ================= */
const cache = new Map();
function cacheGet(key, force) {
  if (force) return null;
  const e = cache.get(key);
  if (e && Date.now() - e.ts < CACHE_TTL) return e.data;
  return null;
}
function cacheSet(key, data) { cache.set(key, { ts: Date.now(), data }); return data; }

async function fetchRaw(url, opts = {}) {
  return fetch(url, {
    redirect: 'follow',
    method: opts.method || 'GET',
    headers: { 'User-Agent': UA, Accept: opts.accept || '*/*', ...(opts.headers || {}) },
    body: opts.body,
    signal: AbortSignal.timeout(opts.timeout || 15000),
  });
}
async function fetchJSON(url, opts = {}) {
  const res = await fetchRaw(url, { ...opts, accept: 'application/json', headers: { ...(opts.headers || {}) } });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} (${new URL(url).host})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}
function errResult(service, source, e, extra = {}) {
  return { ok: false, service, source, code: e.code || 'fetch_error', message: e.message || String(e), ...extra };
}

/* ---- 最小限の XML/フィードパーサー(依存ライブラリなし) ---- */
function decodeXml(s) {
  return String(s || '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');
}
function tagContent(block, tag) {
  const t = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = block.match(new RegExp('<' + t + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + t + '\\s*>', 'i'));
  if (!m) return '';
  let v = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  return decodeXml(v).trim();
}
function tagAttr(block, tag, name) {
  const t = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = block.match(new RegExp('<' + t + '(?:\\s[^>]*)?\\s' + name + '\\s*=\\s*"([^"]*)"', 'i')) ||
            block.match(new RegExp('<' + t + "(?:\\s[^>]*)?\\s" + name + "\\s*=\\s*'([^']*)'", 'i'));
  return m ? decodeXml(m[1]) : '';
}
function stripHtml(s) {
  return decodeXml(String(s || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/* ================= GitHub ================= */
function ghEventToItem(ev, fallbackUser) {
  const repo = ev.repo ? ev.repo.name : '';
  const p = ev.payload || {};
  const time = ev.created_at;
  const actor = (ev.actor && ev.actor.login) || fallbackUser;
  let title = ev.type, url = repo ? `https://github.com/${repo}` : `https://github.com/${actor}`, text = '', meta = repo;
  switch (ev.type) {
    case 'PushEvent': {
      const n = p.size || (p.commits || []).length || 0;
      const branch = String(p.ref || '').replace('refs/heads/', '');
      title = `${repo} にプッシュ`;
      meta = n > 0 ? `${branch} · ${n} コミット` : branch;
      const c = (p.commits || [])[0];
      if (c) text = String(c.message || '').split('\n')[0].slice(0, 160);
      break;
    }
    case 'WatchEvent': title = `${repo} をスター`; meta = 'star'; break;
    case 'CreateEvent':
      if (!p.ref || p.ref_type === 'repository') { title = `リポジトリ ${repo} を作成`; }
      else { title = `${repo} に ${p.ref_type}「${p.ref}」を作成`; }
      break;
    case 'DeleteEvent': title = `${repo} の ${p.ref_type}「${p.ref}」を削除`; break;
    case 'ForkEvent':
      title = `${repo} をフォーク`;
      if (p.forkee) { url = p.forkee.html_url || url; meta = `→ ${p.forkee.full_name}`; }
      break;
    case 'IssuesEvent':
      title = p.issue.title; url = p.issue.html_url;
      meta = `Issue ${p.action} · ${repo}#${p.issue.number}`;
      text = String(p.issue.body || '').slice(0, 160);
      break;
    case 'IssueCommentEvent':
      title = `${repo}#${p.issue.number} にコメント`;
      url = (p.comment && p.comment.html_url) || url;
      meta = `Issue コメント · ${p.issue.title}`;
      text = String((p.comment && p.comment.body) || '').slice(0, 160);
      break;
    case 'PullRequestEvent':
      title = p.pull_request.title; url = p.pull_request.html_url;
      meta = `PR ${p.action} · ${repo}#${p.number}`;
      break;
    case 'PullRequestReviewEvent':
      title = `${repo} の PR をレビュー`; url = (p.review && p.review.html_url) || url;
      meta = `レビュー(${(p.review && p.review.state) || ''})`;
      text = String((p.review && p.review.body) || '').slice(0, 160);
      break;
    case 'PullRequestReviewCommentEvent':
      title = `${repo} の PR にコメント`; url = (p.comment && p.comment.html_url) || url;
      meta = 'PR レビューコメント';
      text = String((p.comment && p.comment.body) || '').slice(0, 160);
      break;
    case 'CommitCommentEvent':
      title = `${repo} のコミットにコメント`; url = (p.comment && p.comment.html_url) || url;
      text = String((p.comment && p.comment.body) || '').slice(0, 160);
      break;
    case 'ReleaseEvent':
      title = `${repo} でリリース ${p.release.tag_name}`; url = p.release.html_url || url;
      text = p.release.name || '';
      break;
    case 'PublicEvent': title = `${repo} を公開に変更`; break;
    case 'MemberEvent': title = `${repo} にメンバーを${p.action === 'added' ? '追加' : p.action}`; meta = (p.member && p.member.login) || repo; break;
    case 'GollumEvent': title = `${repo} の Wiki を更新`; break;
    default: title = `${ev.type.replace(/Event$/, '')} → ${repo}`;
  }
  return { id: String(ev.id), title, url, author: actor, time, text, meta };
}

async function feedGithub(user, force = false) {
  const key = `github:${user}`;
  const cached = cacheGet(key, force); if (cached) return cached;
  try {
    const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (SECRET('GITHUB_TOKEN')) headers.Authorization = `Bearer ${SECRET('GITHUB_TOKEN')}`;
    const res = await fetchRaw(`https://api.github.com/users/${encodeURIComponent(user)}/events/public?per_page=30`, { headers });
    if ((res.status === 403 || res.status === 429) && res.headers.get('x-ratelimit-remaining') === '0') {
      throw new Error('GitHub API のレート制限に達しました。.env または設定画面で GITHUB_TOKEN を設定すると緩和されます(未認証は 60回/時)。');
    }
    if (res.status === 404) throw new Error(`ユーザー「${user}」が見つかりません(404)`);
    if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
    const events = await res.json();
    const items = events.map((ev) => ghEventToItem(ev, user)).filter(Boolean);
    return cacheSet(key, { ok: true, service: 'github', source: user, items, fetchedAt: new Date().toISOString() });
  } catch (e) { return errResult('github', user, e); }
}

/* ================= Hacker News ================= */
async function feedHN(mode, limit, force = false) {
  mode = ['top', 'best', 'new'].includes(mode) ? mode : 'top';
  limit = Math.max(5, Math.min(30, Number(limit) || 15));
  const key = `hn:${mode}:${limit}`;
  const cached = cacheGet(key, force); if (cached) return cached;
  try {
    const listName = mode === 'best' ? 'beststories' : mode === 'new' ? 'newstories' : 'topstories';
    const ids = (await fetchJSON(`https://hacker-news.firebaseio.com/v0/${listName}.json`)).slice(0, limit);
    const stories = (await Promise.all(ids.map((id) =>
      fetchJSON(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).catch(() => null)))).filter(Boolean);
    const items = stories.map((s) => ({
      id: String(s.id),
      title: s.title || '(無題)',
      url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
      author: s.by || '',
      time: new Date(s.time * 1000).toISOString(),
      text: s.text ? stripHtml(s.text).slice(0, 160) : '',
      meta: `${s.score || 0} points · ${s.descendants || 0} コメント`,
    }));
    const label = mode === 'best' ? 'best' : mode === 'new' ? 'new' : 'top';
    return cacheSet(key, { ok: true, service: 'hn', source: label, items, fetchedAt: new Date().toISOString() });
  } catch (e) { return errResult('hn', mode, e); }
}

/* ================= Reddit (OAuth 必要) ================= */
let redditTokenCache = { token: null, expiresAt: 0 };
async function getRedditToken() {
  const id = SECRET('REDDIT_CLIENT_ID'), sec = SECRET('REDDIT_CLIENT_SECRET');
  if (!id || !sec) {
    const e = new Error('REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET を設定してください(設定画面または .env)(https://www.reddit.com/prefs/apps で「script」アプリを作成)');
    e.code = 'credentials_required';
    throw e;
  }
  if (redditTokenCache.token && Date.now() < redditTokenCache.expiresAt - 30000) return redditTokenCache.token;
  const auth = Buffer.from(`${id}:${sec}`).toString('base64');
  const res = await fetchRaw('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Reddit 認証失敗 HTTP ${res.status}(client id/secret を確認してください)`);
  const j = await res.json();
  redditTokenCache = { token: j.access_token, expiresAt: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
  return redditTokenCache.token;
}

async function feedReddit(sub, force = false) {
  const key = `reddit:${sub}`;
  const cached = cacheGet(key, force); if (cached) return cached;
  try {
    const token = await getRedditToken();
    const j = await fetchJSON(`https://oauth.reddit.com/r/${encodeURIComponent(sub)}/new?limit=15&raw_json=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const items = ((j.data && j.data.children) || []).map(({ data: d }) => ({
      id: d.id,
      title: d.title,
      url: `https://www.reddit.com${d.permalink}`,
      author: d.author,
      time: new Date(d.created_utc * 1000).toISOString(),
      text: String(d.selftext || '').slice(0, 160),
      thumb: /^https?:\/\//.test(d.thumbnail || '') ? d.thumbnail : '',
      meta: `r/${sub} · ${d.score} points · ${d.num_comments} コメント`,
    }));
    return cacheSet(key, { ok: true, service: 'reddit', source: sub, items, fetchedAt: new Date().toISOString() });
  } catch (e) { return errResult('reddit', sub, e); }
}

/* ================= RSS / Atom ================= */
function parseFeedXml(xml) {
  const head = xml.slice(0, 3000);
  const isAtom = /<feed[\s>]/i.test(head) && !/<rss[\s>]/i.test(head);
  const blocks = isAtom
    ? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi)
    : xml.match(/<item[\s>][\s\S]*?<\/item>/gi);
  if (!blocks) return [];
  return blocks.slice(0, 20).map((b) => {
    let title = tagContent(b, 'title');
    let url = tagContent(b, 'link');
    let time = tagContent(b, 'pubDate') || tagContent(b, 'published') || tagContent(b, 'updated') || tagContent(b, 'dc:date');
    let author = tagContent(b, 'author') || tagContent(b, 'dc:creator');
    let thumb = tagAttr(b, 'enclosure', 'url');
    if (thumb && !/\.(png|jpe?g|gif|webp)(\?|$)/i.test(thumb)) thumb = '';
    if (isAtom) {
      const am = b.match(/<author[^>]*>[\s\S]*?<name>([\s\S]*?)<\/name>/i);
      if (am) author = decodeXml(am[1].replace(/<!\[CDATA\[|\]\]>/g, '')).trim();
      const lm = b.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']*)["']/i) || b.match(/<link[^>]*href=["']([^"']*)["']/i);
      if (lm) url = decodeXml(lm[1]);
    }
    let text = tagContent(b, 'description') || tagContent(b, 'summary') || tagContent(b, 'content:encoded') || tagContent(b, 'content');
    text = stripHtml(text).slice(0, 180);
    let t = time ? new Date(time) : null;
    if (t && isNaN(t.getTime())) t = null;
    return {
      id: url || title, title: title || '(無題)', url: url || '', author: author || '',
      time: t ? t.toISOString() : '', text, thumb, meta: author ? author : '',
    };
  }).filter((i) => i.title && i.title !== '(無題)' ? true : i.url);
}

async function feedRSS(feed, force = false) {
  const key = `rss:${feed.url}`;
  const cached = cacheGet(key, force); if (cached) return cached;
  let label = feed.name || '';
  try { label = label || new URL(feed.url).hostname; } catch { label = feed.url; }
  try {
    const res = await fetchRaw(feed.url, { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*', timeout: 20000 });
    if (!res.ok) throw new Error(`フィード取得失敗 HTTP ${res.status}`);
    const xml = await res.text();
    const items = parseFeedXml(xml).slice(0, 15);
    if (!items.length) throw new Error('フィードから記事を解析できませんでした(URL を確認してください)');
    return cacheSet(key, { ok: true, service: 'rss', source: label, items, fetchedAt: new Date().toISOString() });
  } catch (e) { return errResult('rss', label, e); }
}

/* ================= YouTube (APIキー or RSS) ================= */
function parseChannelInput(input) {
  let s = String(input || '').trim();
  s = s.replace(/^https?:\/\/(www\.|m\.)?youtube\.com\//i, '').replace(/\/$/, '');
  if (s.startsWith('channel/')) s = s.slice('channel/'.length);
  if (s.startsWith('user/')) s = '@' + s.slice('user/'.length);
  if (s.startsWith('c/')) s = '@' + s.slice('c/'.length);
  return s;
}
async function resolveChannelId(input) {
  const s = parseChannelInput(input);
  if (/^UC[\w-]{22}$/.test(s)) return s;
  const cacheKey = `ytid:${s}`;
  const e = cache.get(cacheKey);
  if (e && Date.now() - e.ts < 24 * 3600 * 1000) return e.data;
  const handle = s.startsWith('@') ? s : '@' + s;
  const res = await fetchRaw(`https://www.youtube.com/${handle}`, { headers: { 'Accept-Language': 'en-US,en;q=0.9' }, timeout: 20000 });
  if (!res.ok) throw new Error(`チャンネル「${input}」のページが見つかりません(HTTP ${res.status})`);
  const html = await res.text();
  const m = html.match(/"externalId":"(UC[\w-]{22})"/) || html.match(/"browseId":"(UC[\w-]{22})"/) || html.match(/channel\/(UC[\w-]{22})/);
  if (!m) throw new Error(`チャンネル「${input}」の ID を解決できませんでした`);
  cache.set(cacheKey, { ts: Date.now(), data: m[1] });
  return m[1];
}

async function feedYoutube(channel, force = false) {
  const key = `yt:${channel}`;
  const cached = cacheGet(key, force); if (cached) return cached;
  const apiKey = SECRET('YOUTUBE_API_KEY');
  try {
    const cid = await resolveChannelId(channel);
    let items;
    if (apiKey) {
      // Data API v3: アップロード再生リスト(UU+サフィックス)から最近の動画を取得
      const uploadsId = 'UU' + cid.slice(2);
      const j = await fetchJSON(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=10&key=${encodeURIComponent(apiKey)}`);
      items = (j.items || []).map((it) => {
        const s = it.snippet || {};
        const vid = (s.resourceId && s.resourceId.videoId) || (it.contentDetails && it.contentDetails.videoId) || '';
        const th = s.thumbnails || {};
        return {
          id: vid, title: s.title || '(無題)', url: `https://www.youtube.com/watch?v=${vid}`,
          author: s.channelTitle || channel, time: s.publishedAt,
          text: String(s.description || '').slice(0, 160),
          thumb: (th.medium || th.default || {}).url || '', meta: s.channelTitle || channel,
        };
      });
    } else {
      // キーなし: 公開 RSS フィード
      const res = await fetchRaw(`https://www.youtube.com/feeds/videos.xml?channel_id=${cid}`);
      if (!res.ok) throw new Error(`RSS フィード取得失敗(HTTP ${res.status})。YOUTUBE_API_KEY を設定すると Data API 経由で取得できます(設定画面または .env)`);
      const xml = await res.text();
      const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) || [];
      items = entries.slice(0, 15).map((b) => {
        const group = (b.match(/<media:group>[\s\S]*?<\/media:group>/i) || [b])[0];
        const title = tagContent(group, 'media:title') || tagContent(b, 'title');
        const url = tagAttr(b, 'link', 'href');
        const time = tagContent(b, 'published') || tagContent(b, 'updated');
        const am = group.match(/<media:author>[\s\S]*?<name>([\s\S]*?)<\/name>/i);
        const author = am ? decodeXml(am[1]) : '';
        const desc = stripHtml(tagContent(group, 'media:description')).slice(0, 160);
        const thumb = tagAttr(b, 'media:thumbnail', 'url');
        const views = tagAttr(group, 'media:statistics', 'views');
        let t = time ? new Date(time) : null; if (t && isNaN(t.getTime())) t = null;
        return {
          id: url, title: title || '(無題)', url, author,
          time: t ? t.toISOString() : '', text: desc, thumb,
          meta: views ? `${Number(views).toLocaleString('ja-JP')} 回視聴` : author,
        };
      }).filter((i) => i.title);
    }
    return cacheSet(key, { ok: true, service: 'youtube', source: channel, items, fetchedAt: new Date().toISOString() });
  } catch (e) { return errResult('youtube', channel, e); }
}

/* ================= X (Twitter) API v2 ================= */
async function feedX(user, force = false) {
  user = String(user).replace(/^@/, '');
  const key = `x:${user}`;
  const cached = cacheGet(key, force); if (cached) return cached;
  try {
    const bearer = SECRET('X_BEARER_TOKEN') || SECRET('TWITTER_BEARER_TOKEN');
    if (!bearer) {
      const e = new Error('X_BEARER_TOKEN を設定してください(設定画面または .env)(developer.x.com で App を作成し Bearer Token を取得)');
      e.code = 'credentials_required';
      throw e;
    }
    const headers = { Authorization: `Bearer ${bearer}` };
    let u;
    try {
      u = await fetchJSON(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(user)}?user.fields=profile_image_url,name`, { headers });
    } catch (err) {
      if (err.status === 401) throw new Error('Bearer Token が無効または期限切れです(401)');
      if (err.status === 403) throw new Error('X API のアクセス権が不足しています(403)。プランと App の権限を確認してください');
      throw err;
    }
    if (!u.data) throw new Error(`ユーザー「@${user}」が見つかりません`);
    const t = await fetchJSON(
      `https://api.twitter.com/2/users/${u.data.id}/tweets?max_results=10&tweet.fields=created_at,public_metrics&exclude=retweets`,
      { headers });
    const items = (t.data || []).map((tw) => ({
      id: tw.id,
      title: tw.text.slice(0, 100) + (tw.text.length > 100 ? '…' : ''),
      url: `https://x.com/${user}/status/${tw.id}`,
      author: `${u.data.name || user} (@${user})`,
      time: tw.created_at,
      text: tw.text.slice(0, 240),
      thumb: u.data.profile_image_url || '',
      meta: `♡ ${(tw.public_metrics && tw.public_metrics.like_count) ?? 0} · 🔁 ${(tw.public_metrics && tw.public_metrics.retweet_count) ?? 0}`,
    }));
    return cacheSet(key, { ok: true, service: 'x', source: `@${user}`, items, fetchedAt: new Date().toISOString() });
  } catch (e) { return errResult('x', `@${user}`, e); }
}

/* ================= Google Calendar ================= */
let gcalTokenCache = { token: null, expiresAt: 0 };
async function getGoogleToken() {
  if (gcalTokenCache.token && Date.now() < gcalTokenCache.expiresAt - 60000) return gcalTokenCache.token;
  // A) サービスアカウント (GOOGLE_APPLICATION_CREDENTIALS=JSONパス)
  const saPath = ENV('GOOGLE_APPLICATION_CREDENTIALS');
  if (saPath) {
    const p = path.isAbsolute(saPath) ? saPath : path.join(ROOT, saPath);
    const sa = JSON.parse(fs.readFileSync(p, 'utf8'));
    const now = Math.floor(Date.now() / 1000);
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const data = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now, exp: now + 3600,
    })}`;
    const sig = crypto.createSign('RSA-SHA256').update(data).sign(sa.private_key, 'base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const res = await fetchRaw('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${data}.${sig}`,
    });
    if (!res.ok) throw new Error(`サービスアカウントのトークン取得失敗 HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j = await res.json();
    gcalTokenCache = { token: j.access_token, expiresAt: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
    return gcalTokenCache.token;
  }
  // B) OAuth リフレッシュトークン
  const cid = SECRET('GOOGLE_CLIENT_ID'), csec = SECRET('GOOGLE_CLIENT_SECRET'), rt = SECRET('GOOGLE_REFRESH_TOKEN');
  if (cid && csec && rt) {
    const body = new URLSearchParams({ client_id: cid, client_secret: csec, refresh_token: rt, grant_type: 'refresh_token' });
    const res = await fetchRaw('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    });
    if (!res.ok) throw new Error(`Google トークン更新失敗 HTTP ${res.status}`);
    const j = await res.json();
    gcalTokenCache = { token: j.access_token, expiresAt: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
    return gcalTokenCache.token;
  }
  const e = new Error('Google 資格情報を設定してください(設定画面または .env)(GOOGLE_APPLICATION_CREDENTIALS=サービスアカウントJSON のパス、または GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN)');
  e.code = 'credentials_required';
  throw e;
}

async function feedGcal(calendarId, force = false) {
  const key = `gcal:${calendarId}`;
  const cached = cacheGet(key, force); if (cached) return cached;
  try {
    const token = await getGoogleToken();
    const timeMin = new Date(Date.now() - 7 * 864e5).toISOString();
    const timeMax = new Date(Date.now() + 21 * 864e5).toISOString();
    const j = await fetchJSON(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
      `?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=20`,
      { headers: { Authorization: `Bearer ${token}` } });
    const now = Date.now();
    const items = (j.items || []).map((ev) => {
      const allDay = !ev.start.dateTime;
      const start = allDay ? new Date(ev.start.date + 'T00:00:00') : new Date(ev.start.dateTime);
      const end = allDay ? new Date(ev.end.date + 'T00:00:00') : new Date(ev.end.dateTime);
      const state = now < start.getTime() ? 'upcoming' : now < end.getTime() ? 'ongoing' : 'past';
      return {
        id: ev.id, title: ev.summary || '(予定なし)', url: ev.htmlLink || '',
        author: (ev.organizer && (ev.organizer.displayName || ev.organizer.email)) || calendarId,
        time: start.toISOString(), endTime: end.toISOString(), allDay, state,
        text: ev.location ? `📍 ${ev.location}` : String(ev.description || '').slice(0, 140),
        meta: '',
      };
    });
    return cacheSet(key, { ok: true, service: 'gcal', source: calendarId, items, fetchedAt: new Date().toISOString() });
  } catch (e) { return errResult('gcal', calendarId, e); }
}

/* ================= 崩壊:スターレイル (HoYoLAB 国際版・非公式API) ================= */
const HOYO = {
  bbs: 'https://bbs-api-os.hoyolab.com',
  luna: 'https://sg-hkrpg-api.hoyolab.com',
  salt: '6s25p5ox5y14umn1p61aqyyvbvvl3lrt', // 国際版 client_type=5 用 salt(コミュニティ準拠)
  actId: 'e202211211516311',                 // HSR デイリーサインイン act_id
};
const HSR_REGIONS = { os_asia: 'アジア', os_usa: '北米', os_eur: '欧州', os_cht: 'TW/HK/MO' };

function generateDS() {
  const t = Math.floor(Date.now() / 1000);
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let r = '';
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)];
  const hash = crypto.createHash('md5').update(`salt=${HOYO.salt}&t=${t}&r=${r}`).digest('hex');
  return `${t},${r},${hash}`;
}

async function hoyoFetch(url, { cookie, method = 'GET', body, referer = 'https://www.hoyolab.com/' } = {}) {
  const headers = {
    'x-rpc-app_version': '2.55.0',
    'x-rpc-client_type': '5',
    'x-rpc-language': 'ja-jp',
    Referer: referer,
    Origin: 'https://www.hoyolab.com',
    DS: generateDS(),
  };
  if (cookie) headers.Cookie = cookie;
  const res = await fetchRaw(url, { method, headers, body: body ? JSON.stringify(body) : undefined, accept: 'application/json', timeout: 15000 });
  if (!res.ok) throw new Error(`HoYoLAB HTTP ${res.status}`);
  return res.json();
}

function hoyoError(retcode, message) {
  const e = new Error(
    retcode === 10001 || retcode === -100 || retcode === 10103
      ? `HoYoLAB Cookie が無効または期限切れです。設定画面で貼り直してください(retcode ${retcode})`
      : retcode === -1
        ? `HoYoLAB エラー retcode -1(パラメータ不正): Cookie の ltmid_v2 の値や UID/サーバー設定を確認してください(${message || ''})`
        : retcode === 10102
          ? 'ゲームデータが非公開です。HoYoLAB アプリ/サイト → 設定 → プライバシー管理 →「リアルタイムデータの表示」を ON にしてください(retcode 10102)'
          : retcode === 10104
            ? 'HoYoLAB へのアクセスが頻繁すぎます。数分待ってから再試行してください(retcode 10104)'
            : `HoYoLAB エラー retcode ${retcode}: ${message || ''}`);
  if (retcode === 10001 || retcode === -100 || retcode === 10103) e.code = 'credentials_required';
  return e;
}

function cookieValue(cookie, name) {
  const m = String(cookie || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : '';
}
function fmtDur(sec) {
  sec = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}時間${m}分` : `${m}分`;
}

// Cookie からサーバー/UID を自動検出(getGameRecordCard)
async function resolveHkrpgRole(cookie, cfg) {
  if (cfg.uid) return { region: cfg.region, role_id: cfg.uid, nickname: '', level: null };
  const ltmid = cookieValue(cookie, 'ltmid_v2') || cookieValue(cookie, 'account_id_v2') || cookieValue(cookie, 'ltuid');
  if (!ltmid) throw new Error('Cookie に ltmid_v2(HoYoLAB UID)が含まれていません。hoyolab.com で Cookie「全体」をコピーしてください');
  const j = await hoyoFetch(`${HOYO.bbs}/game_record/card/wapi/getGameRecordCard?uid=${encodeURIComponent(ltmid)}`, { cookie });
  if (j.retcode !== 0) throw hoyoError(j.retcode, j.message);
  const cards = ((j.data && j.data.list) || []).filter((c) => c.game_biz === 'hkrpg');
  if (!cards.length) throw new Error('この HoYoLAB アカウントにスターレイルの公開キャラクターが見つかりません(プライバシー設定「リアルタイムデータの表示」を確認してください)');
  const card = cards[0];
  return { region: card.region, role_id: card.game_role_id, nickname: card.nickname || '', level: card.level };
}

let hkrpgCheckinAttempt = 0; // サインイン試行の最終時刻(1時間のクールダウン)
async function feedHkrpg(cfg, force = false) {
  const key = 'hkrpg:status';
  const cached = cacheGet(key, force); if (cached) return cached;
  const label = `ステータス(${HSR_REGIONS[cfg.region] || cfg.region}${cfg.uid ? ' · UID ' + cfg.uid : ''})`;
  try {
    const cookie = SECRET('HOYOLAB_COOKIE');
    if (!cookie) {
      const e = new Error('設定画面で HOYOLAB_COOKIE を貼り付けてください。取得方法: hoyolab.com にログイン → F12 → Application → Cookies → ltoken_v2 と ltmid_v2(または Cookie ヘッダー全体)');
      e.code = 'credentials_required';
      throw e;
    }
    const role = await resolveHkrpgRole(cookie, cfg);
    const j = await hoyoFetch(`${HOYO.bbs}/game_record/hkrpg/api/note?server=${encodeURIComponent(role.region)}&role_id=${encodeURIComponent(role.role_id)}`, { cookie });
    if (j.retcode !== 0) throw hoyoError(j.retcode, j.message);
    const d = j.data || {};
    const now = new Date().toISOString();
    const items = [];
    const author = role.nickname || 'Honkai: Star Rail';
    items.push({
      id: 'stamina', title: `⚡ 開拓力 ${d.current_stamina} / ${d.max_stamina}`, url: '', author, time: now,
      text: d.current_stamina >= d.max_stamina ? '満タンです!' : `満タンまで ${fmtDur(d.stamina_recover_time)}${d.current_reserve_stamina ? ` · 予約開拓力 ${d.current_reserve_stamina}` : ''}`,
      meta: 'リアルタイムノート', progress: d.max_stamina ? d.current_stamina / d.max_stamina : 0,
    });
    items.push({
      id: 'daily', title: `📋 日課 ${d.current_train_score} / ${d.max_train_score}`, url: '', author, time: now,
      text: d.current_train_score >= d.max_train_score ? '本日の日課は完了!' : `あと ${Math.max(0, d.max_train_score - d.current_train_score)} ポイント`,
      meta: 'デイリー訓練', progress: d.max_train_score ? d.current_train_score / d.max_train_score : 0,
    });
    items.push({
      id: 'rogue', title: `🌌 模擬宇宙(週間)${d.current_rogue_score} / ${d.max_rogue_score}`, url: '', author, time: now,
      text: '今週の模擬宇宙ポイント', meta: 'ウィークリー', progress: d.max_rogue_score ? d.current_rogue_score / d.max_rogue_score : 0,
    });
    items.push({
      id: 'weekly', title: `🗓 週間割引 ${d.weekly_cocoon_cnt} / ${d.weekly_cocoon_limit}`, url: '', author, time: now,
      text: '凝結虚影・蠹役の匣などの週間ボーナス消化数', meta: 'ウィークリー', progress: d.weekly_cocoon_limit ? d.weekly_cocoon_cnt / d.weekly_cocoon_limit : 0,
    });
    for (const [i, ex] of (d.expeditions || []).entries()) {
      const finished = ex.status === 'Finished';
      items.push({
        id: 'exp' + i, title: `🚀 派遣:${ex.name || '探索'}`, url: '', author, time: now,
        text: finished ? '完了!報酬を受け取れます' : `残り ${fmtDur(ex.remaining_time)}`,
        meta: finished ? '✅ 完了' : '進行中', progress: finished ? 1 : null,
      });
    }
    // デイリーサインイン自動化(オプション)
    if (cfg.checkin) {
      try {
        const info = await hoyoFetch(`${HOYO.luna}/event/luna/info?lang=ja-jp&act_id=${HOYO.actId}&region=${encodeURIComponent(role.region)}`, { cookie, referer: 'https://act.hoyolab.com/' });
        if (info.retcode === 0 && info.data) {
          if (info.data.is_sign) {
            items.unshift({ id: 'checkin', title: `✅ 本日のサインイン済み(今月 ${info.data.total_sign_day} 日)`, url: '', author: 'HoYoLAB サインイン', time: now, text: '', meta: '' });
          } else if (Date.now() - hkrpgCheckinAttempt > 3600e3) {
            hkrpgCheckinAttempt = Date.now();
            const sign = await hoyoFetch(`${HOYO.luna}/event/luna/sign?lang=ja-jp`, { method: 'POST', cookie, referer: 'https://act.hoyolab.com/', body: { act_id: HOYO.actId, region: role.region, lang: 'ja-jp' } });
            if (sign.retcode === 0) {
              const aw = (sign.data && sign.data.award) || {};
              items.unshift({ id: 'checkin', title: `🎁 サインイン完了!(今月 ${(info.data.total_sign_day || 0) + 1} 日目)`, url: '', author: 'HoYoLAB サインイン', time: new Date().toISOString(), text: aw.name ? `報酬: ${aw.name} ×${aw.cnt}` : '', meta: '' });
            } else if (sign.retcode === 2001) {
              items.unshift({ id: 'checkin', title: '✅ 本日のサインイン済み', url: '', author: 'HoYoLAB サインイン', time: now, text: '', meta: '' });
            } else {
              items.unshift({ id: 'checkin', title: `⚠️ サインイン失敗(retcode ${sign.retcode})`, url: '', author: 'HoYoLAB サインイン', time: now, text: sign.message || '', meta: '' });
            }
          } else {
            items.unshift({ id: 'checkin', title: '🕓 未サインイン(クールダウン中・最大1時間後に自動再試行)', url: '', author: 'HoYoLAB サインイン', time: now, text: '', meta: '' });
          }
        }
      } catch (e) {
        items.unshift({ id: 'checkin', title: '⚠️ サインイン確認に失敗: ' + (e.message || e), url: '', author: 'HoYoLAB サインイン', time: new Date().toISOString(), text: '', meta: '' });
      }
    }
    const source = `ステータス${role.nickname ? ' · ' + role.nickname : ''}(${HSR_REGIONS[role.region] || role.region} · UID ${role.role_id})`;
    return cacheSet(key, { ok: true, service: 'hkrpg', source, items, fetchedAt: new Date().toISOString() });
  } catch (e) { return errResult('hkrpg', label, e); }
}

// 公式ニュース(Cookie 不要)
async function feedHkrpgNews(force = false) {
  const key = 'hkrpg:news';
  const cached = cacheGet(key, force); if (cached) return cached;
  try {
    const types = [[1, 'お知らせ'], [2, 'イベント'], [3, 'Latest Info']];
    const lists = await Promise.all(types.map(async ([type, label]) => {
      try {
        const j = await hoyoFetch(`${HOYO.bbs}/community/post/api/getNewsList?gids=6&type=${type}&page_size=5`);
        if (j.retcode !== 0 || !j.data || !Array.isArray(j.data.list)) return [];
        return j.data.list.map((it) => ({ it, label }));
      } catch { return []; }
    }));
    const items = lists.flat().map(({ it, label }) => {
      const p = it.post || {};
      const cover = (Array.isArray(it.cover_list) && it.cover_list[0]) || (it.cover && it.cover.url ? it.cover : null);
      return {
        id: String(p.post_id || p.subject), title: p.subject || '(無題)',
        url: p.post_id ? `https://www.hoyolab.com/article/${p.post_id}` : '',
        author: (it.user && it.user.nickname) || 'HoYoLAB 公式',
        time: p.created_at ? new Date(Number(p.created_at) * 1000).toISOString() : '',
        text: String(p.content || '').replace(/\s+/g, ' ').slice(0, 160),
        thumb: cover ? (cover.url || '') : '',
        meta: label,
      };
    }).filter((i) => i.title && i.title !== '(無題)')
      .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
      .slice(0, 15);
    if (!items.length) throw new Error('ニュースを取得できませんでした');
    return cacheSet(key, { ok: true, service: 'hkrpg', source: 'ニュース(公式)', items, fetchedAt: new Date().toISOString() });
  } catch (e) { return errResult('hkrpg', 'ニュース(公式)', e); }
}

/* ================= 全フィード集約 ================= */
async function feedAll(force = false) {
  const cfg = loadConfig();
  const tasks = [];
  if (cfg.github && cfg.github.enabled) for (const u of cfg.github.users || []) tasks.push(feedGithub(u, force));
  if (cfg.hn && cfg.hn.enabled) tasks.push(feedHN(cfg.hn.mode, cfg.hn.limit, force));
  if (cfg.reddit && cfg.reddit.enabled) for (const s of cfg.reddit.subreddits || []) tasks.push(feedReddit(s, force));
  if (cfg.rss && cfg.rss.enabled) for (const f of cfg.rss.feeds || []) tasks.push(feedRSS(f, force));
  if (cfg.youtube && cfg.youtube.enabled) for (const c of cfg.youtube.channels || []) tasks.push(feedYoutube(c, force));
  if (cfg.x && cfg.x.enabled) for (const a of cfg.x.accounts || []) tasks.push(feedX(a, force));
  if (cfg.gcal && cfg.gcal.enabled) for (const id of cfg.gcal.calendarIds || []) tasks.push(feedGcal(id, force));
  if (cfg.hkrpg && cfg.hkrpg.enabled) {
    tasks.push(feedHkrpg(cfg.hkrpg, force));
    if (cfg.hkrpg.news !== false) tasks.push(feedHkrpgNews(force));
  }
  const results = await Promise.all(tasks);
  return { ok: true, fetchedAt: new Date().toISOString(), env: envStatus(), results };
}

/* ================= HTTP サーバー ================= */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

function json(res, obj, status = 200) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) { reject(new Error('body too large')); req.destroy(); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function serveStatic(res, pathname) {
  if (pathname === '/') pathname = '/index.html';
  const fp = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!fp.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(fp, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }
    const ext = path.extname(fp).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
}

/* ---- Basic 認証(任意) ----
 * BASIC_AUTH_USER と BASIC_AUTH_PASS の両方が設定されている場合のみ有効。
 * 公開 URL(Railway など)にデプロイする際のアクセス制限に使えます。 */
function authorized(req) {
  const user = ENV('BASIC_AUTH_USER'), pass = ENV('BASIC_AUTH_PASS');
  if (!user || !pass) return true; // 未設定なら認証オフ
  const h = req.headers['authorization'] || '';
  if (!h.startsWith('Basic ')) return false;
  let decoded;
  try { decoded = Buffer.from(h.slice(6), 'base64').toString('utf8'); } catch { return false; }
  const i = decoded.indexOf(':');
  if (i < 0) return false;
  const eq = (a, b) => {
    const ba = Buffer.from(String(a)), bb = Buffer.from(String(b));
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
  };
  return eq(decoded.slice(0, i), user) && eq(decoded.slice(i + 1), pass);
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = u.pathname;
  try {
    // ヘルスチェック(Railway 等) — 認証不要・外部APIを叩かない軽量エンドポイント
    if (p === '/api/health') {
      return json(res, { ok: true, service: 'activity-hub', uptime: Math.floor(process.uptime()), time: new Date().toISOString() });
    }
    if (!authorized(req)) {
      res.writeHead(401, {
        'WWW-Authenticate': 'Basic realm="Activity Hub", charset="UTF-8"',
        'Content-Type': 'text/plain; charset=utf-8',
      });
      return res.end('401 Unauthorized');
    }
    if (p === '/api/state') {
      return json(res, { ok: true, config: loadConfig(), env: envStatus(), keySource: keySourceMap() });
    }
    if (p === '/api/secrets' && req.method === 'POST') {
      // 設定画面から API キーを保存(再起動不要・即反映)
      // body: { KEY: "値" } → 保存 / { KEY: null } → 削除 / 未指定・空文字 → 変更なし
      const body = JSON.parse((await readBody(req)) || '{}');
      const updated = [];
      for (const k of SECRET_KEYS) {
        if (!(k in body)) continue;
        const v = body[k];
        if (v === null) { delete runtimeSecrets[k]; updated.push(k); continue; }
        const s = String(v).trim();
        if (s) { runtimeSecrets[k] = s; updated.push(k); }
      }
      persistSecrets();
      cache.clear(); // 認証状態が変わったのでキャッシュを破棄
      redditTokenCache = { token: null, expiresAt: 0 };
      gcalTokenCache = { token: null, expiresAt: 0 };
      return json(res, { ok: true, updated, env: envStatus(), keySource: keySourceMap() });
    }
    if (p === '/api/config' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)) || '{}');
      const cur = loadConfig();
      // セクション単位で浅いマージし、送られなかったフィールド(enabled 等)の消失を防ぐ
      const merged = {};
      for (const k of Object.keys(DEFAULT_CONFIG)) merged[k] = { ...(cur[k] || {}), ...(body[k] || {}) };
      const next = sanitizeConfig(merged);
      saveConfig(next);
      cache.clear(); // 設定変更でキャッシュ破棄
      return json(res, { ok: true, config: next });
    }
    if (p === '/api/starter' && req.method === 'POST') {
      // ウェルカム画面の「サンプルで試す」: キー不要のソースだけを入れた初期設定を投入
      const next = sanitizeConfig(STARTER_CONFIG);
      saveConfig(next);
      cache.clear();
      return json(res, { ok: true, config: next });
    }
    if (p === '/api/feed/all') {
      return json(res, await feedAll(u.searchParams.get('force') === '1'));
    }
    const m = p.match(/^\/api\/feed\/(github|hn|reddit|rss|youtube|x|gcal|hkrpg|hkrpgnews)$/);
    if (m) {
      const force = u.searchParams.get('force') === '1';
      const q = u.searchParams;
      const cfg = loadConfig();
      let out;
      switch (m[1]) {
        case 'github': out = await feedGithub(q.get('user') || '', force); break;
        case 'hn': out = await feedHN(q.get('mode') || cfg.hn.mode, q.get('limit') || cfg.hn.limit, force); break;
        case 'reddit': out = await feedReddit(String(q.get('sub') || '').replace(/^\/?r\//, ''), force); break;
        case 'youtube': out = await feedYoutube(q.get('channel') || '', force); break;
        case 'x': out = await feedX(q.get('user') || '', force); break;
        case 'gcal': out = await feedGcal(q.get('calendarId') || 'primary', force); break;
        case 'hkrpg': out = await feedHkrpg(cfg.hkrpg || DEFAULT_CONFIG.hkrpg, force); break;
        case 'hkrpgnews': out = await feedHkrpgNews(force); break;
        case 'rss': {
          // セキュリティ: config.json に登録済みの URL だけ取得する(オープンプロキシ防止)
          const url = q.get('url') || '';
          const feed = (cfg.rss.feeds || []).find((f) => f.url === url);
          if (!feed) { out = { ok: false, service: 'rss', source: url, message: '設定にない URL は取得できません(設定画面から追加してください)' }; break; }
          out = await feedRSS(feed, force);
          break;
        }
      }
      return json(res, out);
    }
    if (p.startsWith('/api/')) {
      return json(res, { ok: false, message: 'Not Found' }, 404);
    }
    return serveStatic(res, p);
  } catch (e) {
    return json(res, { ok: false, message: e.message || String(e) }, 500);
  }
});

server.listen(PORT, () => {
  const env = envStatus();
  console.log('┌──────────────────────────────────────────────┐');
  console.log('│  ⚡ Activity Hub 起動しました');
  console.log(`│  →  http://localhost:${PORT}`);
  console.log('├──────────────────────────────────────────────┤');
  console.log(`│  設定ファイル: ${CONFIG_PATH}`);
  console.log(`│  シークレット: ${SECRETS_PATH} (${Object.keys(runtimeSecrets).length}件・UIから保存可)`);
  console.log(`│  Basic認証   : ${ENV('BASIC_AUTH_USER') && ENV('BASIC_AUTH_PASS') ? '✅ 有効' : '— 無効'}`);
  console.log('│  資格情報の状態 (.env / 環境変数):');
  console.log(`│   GitHub トークン   : ${env.github ? '✅ 設定済み' : '— 未設定(キーなしでも動作/60回時)'}`);
  console.log(`│   Reddit 認証       : ${env.reddit ? '✅ 設定済み' : '— 未設定(このソースはエラー表示)'}`);
  console.log(`│   YouTube API キー  : ${env.youtube ? '✅ 設定済み' : '— 未設定(RSSフィードで代替)'}`);
  console.log(`│   X Bearer Token    : ${env.x ? '✅ 設定済み' : '— 未設定(このソースはエラー表示)'}`);
  console.log(`│   Google Calendar   : ${env.gcal ? '✅ 設定済み' : '— 未設定(このソースはエラー表示)'}`);
  console.log('└──────────────────────────────────────────────┘');
});
