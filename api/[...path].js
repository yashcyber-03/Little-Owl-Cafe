'use strict';
// Little Owl Cafe API as a single Vercel serverless function.
// Storage: Upstash Redis (Vercel Marketplace) over its REST API. No npm dependencies.
const crypto = require('crypto');
const SEED = require('./_seed');

const DB_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const DB_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const PASS = process.env.ADMIN_PASSWORD;
const SECRET = process.env.SESSION_SECRET || PASS || '';
const hasStore = () => !!DB_URL || !process.env.VERCEL; // local dev falls back to memory

const mem = { kv: {}, h: {} };
async function cmd(a) {
  if (DB_URL) {
    const r = await fetch(DB_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + DB_TOKEN }, body: JSON.stringify(a) });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j.result;
  }
  const [c, k, f, v] = a;
  switch (c) {
    case 'GET': return mem.kv[k] ?? null;
    case 'SET': mem.kv[k] = f; return 'OK';
    case 'INCR': mem.kv[k] = (+mem.kv[k] || 0) + 1; return mem.kv[k];
    case 'EXPIRE': return 1;
    case 'HSET': (mem.h[k] = mem.h[k] || {})[f] = v; return 1;
    case 'HGET': return (mem.h[k] || {})[f] ?? null;
    case 'HDEL': delete (mem.h[k] || {})[f]; return 1;
    case 'HGETALL': return Object.entries(mem.h[k] || {}).flat();
  }
}

const uid = () => crypto.randomBytes(4).toString('hex');
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const clean = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n);
const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10); // IST
const sign = e => crypto.createHmac('sha256', SECRET).update(String(e)).digest('hex');
const makeToken = () => { const e = Date.now() + 8 * 3600e3; return e + '.' + sign(e); };
const authed = req => {
  const [e, sig] = (req.headers.authorization || '').replace('Bearer ', '').split('.');
  if (!e || !sig || !SECRET || +e < Date.now()) return false;
  const good = sign(e);
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
};
async function limited(key, max, sec) {
  const n = await cmd(['INCR', 'rl:' + key]);
  if (n === 1) await cmd(['EXPIRE', 'rl:' + key, sec]);
  return n > max;
}
async function getMenu() {
  const s = await cmd(['GET', 'menu']);
  if (s) return JSON.parse(s);
  await cmd(['SET', 'menu', JSON.stringify(SEED)]);
  return SEED;
}

module.exports = async (req, res) => {
  const out = (c, o) => res.status(c).json(o);
  res.setHeader('Cache-Control', 'no-store');
  try {
    const p = new URL(req.url, 'http://x').pathname.replace(/\/$/, ''), M = req.method;
    const parts = p.split('/'), id = parts[4];
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const ip = String(req.headers['x-forwarded-for'] || 'local').split(',')[0].trim();

    if (p === '/api/menu' && M === 'GET') return out(200, hasStore() ? await getMenu() : SEED);
    if (!hasStore()) return out(503, { error: 'Database not connected. Add Upstash Redis in the Vercel project.' });

    if (p === '/api/reservations' && M === 'POST') {
      if (await limited('r' + ip, 5, 3600)) return out(429, { error: 'Too many requests. Please call the cafe.' });
      const r = { name: clean(b.name, 60), phone: clean(b.phone, 20), date: clean(b.date, 10), time: clean(b.time, 5), guests: parseInt(b.guests, 10), note: clean(b.note, 300) };
      if (r.name.length < 2) return out(400, { error: 'Enter your name.' });
      if (!/^[0-9+\s-]{8,15}$/.test(r.phone)) return out(400, { error: 'Enter a valid phone number.' });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date) || r.date < today()) return out(400, { error: 'Choose today or a later date.' });
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)) return out(400, { error: 'Choose a time.' });
      if (!(r.guests >= 1 && r.guests <= 20)) return out(400, { error: 'Guests must be between 1 and 20.' });
      Object.assign(r, { id: uid(), status: 'pending', created: new Date().toISOString() });
      await cmd(['HSET', 'res', r.id, JSON.stringify(r)]);
      return out(201, { ok: true, id: r.id });
    }

    if (p === '/api/admin/login' && M === 'POST') {
      if (!PASS) return out(503, { error: 'ADMIN_PASSWORD is not set in Vercel.' });
      if (await limited('l' + ip, 10, 900)) return out(429, { error: 'Too many attempts. Try again later.' });
      if (!crypto.timingSafeEqual(sha(b.password), sha(PASS))) return out(401, { error: 'Wrong password.' });
      return out(200, { token: makeToken() });
    }

    if (p.startsWith('/api/admin/')) {
      if (!authed(req)) return out(401, { error: 'Please sign in.' });
      if (parts[3] === 'reservations') {
        if (M === 'GET') {
          const flat = await cmd(['HGETALL', 'res']), list = [];
          for (let i = 1; i < flat.length; i += 2) list.push(JSON.parse(flat[i]));
          return out(200, list.sort((a, c) => (a.date + a.time).localeCompare(c.date + c.time)));
        }
        const cur = id && await cmd(['HGET', 'res', id]);
        if (!cur) return out(404, { error: 'Not found.' });
        if (M === 'PATCH' && ['pending', 'confirmed', 'cancelled'].includes(b.status)) {
          const r = JSON.parse(cur); r.status = b.status;
          await cmd(['HSET', 'res', id, JSON.stringify(r)]); return out(200, { ok: true });
        }
        if (M === 'DELETE') { await cmd(['HDEL', 'res', id]); return out(200, { ok: true }); }
      }
      if (parts[3] === 'menu') {
        const menu = await getMenu();
        if (M === 'POST') {
          const it = { id: uid(), cat: clean(b.cat, 40), name: clean(b.name, 60), desc: clean(b.desc, 160), tag: clean(b.tag, 20) };
          if (!it.cat || !it.name) return out(400, { error: 'Category and name are required.' });
          menu.push(it); await cmd(['SET', 'menu', JSON.stringify(menu)]); return out(201, it);
        }
        if (M === 'DELETE') { await cmd(['SET', 'menu', JSON.stringify(menu.filter(x => x.id !== id))]); return out(200, { ok: true }); }
      }
    }
    return out(404, { error: 'Not found.' });
  } catch (e) {
    return out(500, { error: 'Server error. Please try again.' });
  }
};
