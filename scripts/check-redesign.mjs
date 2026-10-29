import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function fail(message) {
  console.error('REDESIGN CHECK FAILED: ' + message);
  process.exitCode = 1;
}
function checkJavaScript(file, source, label) {
  const temp = path.join(os.tmpdir(), 'mnote-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.cjs');
  fs.writeFileSync(temp, source, 'utf8');
  const result = spawnSync(process.execPath, ['--check', temp], { encoding: 'utf8' });
  fs.rmSync(temp, { force: true });
  if (result.status !== 0) fail(label + ' syntax error:\n' + (result.stderr || result.stdout));
}
function extractScripts(file) {
  const html = fs.readFileSync(file, 'utf8');
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  const found = [];
  let match;
  while ((match = re.exec(html))) {
    const attrs = match[1] || '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i)?.[1]?.toLowerCase();
    if (type && !['text/javascript', 'application/javascript', 'module'].includes(type)) continue;
    if (match[2].trim()) found.push(match[2]);
  }
  return found;
}
function topLevelCssRulesAreMedia(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let depth = 0, quote = '', escaped = false, start = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '{') {
      if (depth === 0) {
        const prelude = css.slice(start, i).trim();
        if (!prelude.startsWith('@media')) return { ok: false, prelude };
      }
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth < 0) return { ok: false, prelude: 'unexpected closing brace' };
      if (depth === 0) start = i + 1;
    }
  }
  if (depth !== 0) return { ok: false, prelude: 'unbalanced CSS braces' };
  return { ok: true };
}

for (const file of ['index.html', 'admin.html']) {
  for (const [i, source] of extractScripts(file).entries()) checkJavaScript(file, source, file + ' inline script ' + (i + 1));
}
checkJavaScript('public-desktop.js', fs.readFileSync('public-desktop.js', 'utf8'), 'public-desktop.js');

const index = fs.readFileSync('index.html', 'utf8');
const publicJs = fs.readFileSync('public-desktop.js', 'utf8');
const publicCss = fs.readFileSync('public-desktop.css', 'utf8');
const responsiveCss = fs.readFileSync('public-responsive.css', 'utf8');
const admin = fs.readFileSync('admin.html', 'utf8');
const adminCss = fs.readFileSync('admin-redesign.css', 'utf8');

if (!/<link\b(?=[^>]*\bhref=["']public-desktop\.css(?:\?[^"']*)?["'])(?=[^>]*\bmedia=["']\(min-width:\s*1024px\)["'])[^>]*>/i.test(index)) fail('Public desktop CSS must be media-qualified at 1024px; cache-busting query strings are allowed.');
if (!/<link\b(?=[^>]*\bhref=["']public-responsive\.css(?:\?[^"']*)?["'])[^>]*>/i.test(index)) fail('Public responsive detail stylesheet is missing.');
if (!/<script\b(?=[^>]*\bsrc=["']public-desktop\.js(?:\?[^"']*)?["'])(?=[^>]*\bdefer(?:\s|>|=))[^>]*>/i.test(index)) fail('Public desktop enhancement script is missing; cache-busting query strings are allowed.');
if (!publicJs.includes("if (!window.matchMedia('(min-width: 1024px)').matches) return;")) fail('Public desktop script must exit below 1024px.');
const media = topLevelCssRulesAreMedia(publicCss);
if (!media.ok) fail('Public desktop CSS has a top-level rule outside a media query: ' + media.prelude);
const responsiveMedia = topLevelCssRulesAreMedia(responsiveCss);
if (!responsiveMedia.ok) fail('Public responsive CSS has a top-level rule outside a media query: ' + responsiveMedia.prelude);
if (!/@media\s+screen\s+and\s+\(max-width:\s*1023px\)/i.test(responsiveCss) || !/@media\s+screen\s+and\s+\(max-width:\s*760px\)/i.test(responsiveCss)) fail('Public responsive detail breakpoints are missing.');
if (!/<link\b(?=[^>]*\bhref=["']admin-redesign\.css(?:\?[^"']*)?["'])[^>]*>/i.test(admin)) fail('Admin responsive stylesheet is not linked; cache-busting query strings are allowed.');
if (!admin.includes('data-view="labels"') || !admin.includes('data-view="activity"')) fail('Admin labels/activity views are missing.');
if (!admin.includes('async function bulkStatus') || !admin.includes('showUndo(start.id')) fail('Bulk review or swipe undo implementation is missing.');
if (!/@media\s*\(\s*max-width:\s*600px\s*\)/i.test(adminCss) || !/@media\s*\(\s*min-width:\s*1024px\s*\)/i.test(adminCss)) fail('Admin responsive breakpoints are missing.');

const baselineResult = spawnSync('git', ['show', 'origin/main:index.html'], { encoding: 'utf8' });
if (baselineResult.status === 0) {
  const baseline = baselineResult.stdout;
  const style = html => html.match(/<style\b[^>]*>[\s\S]*?<\/style>/i)?.[0] || '';
  if (style(index) !== style(baseline)) fail('Public inline CSS changed; this includes the mobile CSS and must remain untouched.');
  const queries = html => html.match(/@media[^{]+/g) || [];
  if (JSON.stringify(queries(index)) !== JSON.stringify(queries(baseline))) fail('Existing public CSS media-query rules changed.');
  if (!/const mobile=window\.innerWidth<=760,tablet=window\.innerWidth<=1023;/.test(index) || !/if\(mobile\)cols=2;else if\(tablet\)/.test(index)) fail('Original public grid sizing for mobile and tablet widths is not preserved.');
} else {
  console.warn('Could not compare index.html against origin/main; local baseline comparison skipped.');
}

if (!process.exitCode) console.log('Redesign source checks passed. Browser visual and live Supabase workflow tests still require a real browser/session.');
