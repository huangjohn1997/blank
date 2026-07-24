/* Surface gate for the textbook.
   Renders every route at phone and desktop widths and fails on:
     · any console error or uncaught exception (a dead exhibit)
     · page-level horizontal overflow
     · any element wider than the viewport
     · an unrendered <math> element (MathML support/markup break)
     · a help panel that opens outside the viewport
   Run:  node tests/surface.mjs           (add --shots to write screenshots)
*/
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const ROOT = resolve(process.argv[2] || '.');
const PAGES = (process.env.PAGES || 'index.html,ch01.html,ch02.html,ch03.html,ch04.html').split(',');
const WIDTHS = [
  { w: 320, h: 780, name: 'iphone-se' },
  { w: 390, h: 844, name: 'iphone' },
  { w: 768, h: 1024, name: 'tablet' },
  { w: 1280, h: 900, name: 'desktop' }
];
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/plain' };

const server = createServer(async (req, res) => {
  try {
    const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();
const failures = [];
const note = (m) => console.log('   ' + m);

for (const page of PAGES) {
  console.log('\n▸ ' + page);
  for (const vp of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
    const pg = await ctx.newPage();
    const errs = [];
    pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
    const resp = await pg.goto(base + page, { waitUntil: 'load' });
    if (!resp || !resp.ok()) { failures.push(`${page}: HTTP ${resp && resp.status()}`); await ctx.close(); continue; }
    await pg.waitForSelector('html[data-ready="1"]', { timeout: 8000 }).catch(() => failures.push(`${page} @${vp.w}: runtime never finished booting`));
    await pg.waitForTimeout(350);
    // open every optional disclosure so its contents are measured too
    await pg.evaluate(() => document.querySelectorAll('details').forEach(d => (d.open = true)));
    await pg.waitForTimeout(200);

    const report = await pg.evaluate(() => {
      const vw = window.innerWidth;
      const cls = e => (typeof e.className === 'string' ? e.className : e.getAttribute('class') || '');
      // an element may exceed the viewport only if an ancestor scrolls it
      const contained = e => {
        let n = e.parentElement;
        while (n && n !== document.body) {
          const ox = getComputedStyle(n).overflowX;
          if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
          n = n.parentElement;
        }
        return false;
      };
      const wide = [];
      document.querySelectorAll('body *').forEach(e => {
        const r = e.getBoundingClientRect();
        if (getComputedStyle(e).position === 'fixed' || contained(e)) return;
        if (r.width > vw + 1.5) wide.push(e.tagName.toLowerCase() + '.' + cls(e).split(/\s+/)[0] + ' → ' + Math.round(r.width) + 'px');
        else if (r.right > vw + 1.5) wide.push('overhang ' + e.tagName.toLowerCase() + '.' + cls(e).split(/\s+/)[0] + ' right=' + Math.round(r.right));
      });
      const maths = Array.from(document.querySelectorAll('math'));
      const deadMath = maths.filter(m => m.getBoundingClientRect().width < 4).length;
      const broken = Array.from(document.querySelectorAll('.readout')).filter(r => /could not start/.test(r.textContent)).length;
      const labEls = Array.from(document.querySelectorAll('[id^="lab-"]'));
      const empty = labEls.filter(l => l.childElementCount === 0).map(l => l.id);
      return {
        scrollWidth: document.documentElement.scrollWidth, vw,
        wide: [...new Set(wide)].slice(0, 8),
        maths: maths.length, deadMath, broken,
        labs: labEls.length, empty,
        checks: document.querySelectorAll('.check[data-check]').length
      };
    });

    if (report.scrollWidth > report.vw + 1) failures.push(`${page} @${vp.w}: page scrollWidth ${report.scrollWidth} > ${report.vw}`);
    if (report.wide.length) failures.push(`${page} @${vp.w}: oversized elements → ${report.wide.join(' | ')}`);
    if (report.deadMath) failures.push(`${page} @${vp.w}: ${report.deadMath} <math> element(s) rendered at zero width`);
    if (report.broken) failures.push(`${page} @${vp.w}: ${report.broken} exhibit(s) failed to start`);
    if (report.empty.length) failures.push(`${page} @${vp.w}: ${report.empty.length} exhibit(s) rendered empty → ${report.empty.join(', ')}`);
    if (errs.length) failures.push(`${page} @${vp.w}: ${errs.slice(0, 4).join(' | ')}`);

    // help panel must open, be readable, and stay inside the viewport
    const term = await pg.$('.term');
    if (term) {
      await term.click();
      await pg.waitForTimeout(220);
      const pnl = await pg.evaluate(() => {
        const p = document.getElementById('panel');
        if (!p || p.dataset.open !== '1') return { open: false };
        const r = p.getBoundingClientRect();
        return { open: true, left: r.left, right: r.right, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight, text: (document.getElementById('panel-body').textContent || '').length };
      });
      if (!pnl.open) failures.push(`${page} @${vp.w}: glossary panel did not open`);
      else {
        if (pnl.left < -1 || pnl.right > pnl.vw + 1) failures.push(`${page} @${vp.w}: panel escapes viewport (${Math.round(pnl.left)}…${Math.round(pnl.right)} of ${pnl.vw})`);
        if (pnl.h > pnl.vh) failures.push(`${page} @${vp.w}: panel taller than viewport`);
        if (pnl.text < 40) failures.push(`${page} @${vp.w}: panel opened empty`);
      }
      await pg.keyboard.press('Escape');
    } else if (page !== 'index.html') {
      failures.push(`${page}: no glossary term on the page`);
    }

    note(`${String(vp.w).padStart(4)}px  scrollW ${report.scrollWidth}  math ${report.maths}  checks ${report.checks}  ${report.wide.length ? '⚠ ' + report.wide.length + ' wide' : 'clean'}`);

    if (process.argv.includes('--shots') && (vp.w === 390 || vp.w === 1280)) {
      await pg.screenshot({ path: `/tmp/claude-0/-home-user-blank/a1c654d0-50db-5a3b-86c4-75133f183be0/scratchpad/shot-${page.replace('.html', '')}-${vp.w}.png`, fullPage: vp.w === 390 });
    }
    await ctx.close();
  }
}

// dark mode pass on one chapter: contrast smoke test
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  const pg = await ctx.newPage();
  await pg.goto(base + 'ch04.html', { waitUntil: 'load' }).catch(() => {});
  await pg.waitForTimeout(400);
  const bad = await pg.evaluate(() => {
    function lum(c) {
      const m = c.match(/[\d.]+/g); if (!m) return null;
      const [r, g, b] = m.slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    function bgOf(e) {
      let n = e;
      while (n && n !== document.documentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c;
        n = n.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    }
    const out = [];
    document.querySelectorAll('p,li,.fig-cap,.readout,.stat .v,.stat .k,.eqn-r,.do,.hint-scroll,td,th,.opt').forEach(e => {
      if (!e.textContent.trim() || e.offsetParent === null) return;
      const f = lum(getComputedStyle(e).color), b = lum(bgOf(e));
      if (f == null || b == null) return;
      const ratio = (Math.max(f, b) + 0.05) / (Math.min(f, b) + 0.05);
      const size = parseFloat(getComputedStyle(e).fontSize);
      const need = size >= 24 || (size >= 18.66 && parseInt(getComputedStyle(e).fontWeight, 10) >= 700) ? 3 : 4.5;
      if (ratio < need) out.push(e.className + '|' + e.tagName + ' ' + ratio.toFixed(2) + ' need ' + need);
    });
    return [...new Set(out)].slice(0, 10);
  });
  if (bad.length) failures.push('ch04 dark contrast: ' + bad.join(' | '));
  else console.log('\n▸ dark mode contrast (ch04 @390): clean');
  await ctx.close();
}

await browser.close();
server.close();

console.log('\n' + '─'.repeat(60));
if (failures.length) {
  console.log('FAIL — ' + failures.length + ' issue(s):');
  failures.forEach(f => console.log(' ✗ ' + f));
  process.exit(1);
}
console.log('PASS — all routes clean at 320/390/768/1280 + dark mode.');
