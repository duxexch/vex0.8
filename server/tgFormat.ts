/**
 * tgFormat.ts — unified Telegram post formatter.
 *
 * تطبيق مشكلة واحدة: النصوص المختلطة عربي/إنجليزي تتلخبط بصريًا في تيليجرام
 * (الكلمات اللاتينية والأرقام تُقرأ بترتيب خاطئ داخل جمل عربية)، وبعض المنشورات
 * تصل بلا تنسيق لأن مسار الإرسال لا يمرّ بـ parse_mode أصلًا.
 *
 * ما يفعله هذا الملف لكل منشور قبل الإرسال:
 *   1) تنظيف (BOM، محارف صفرية، مسافات، أسطر زائدة).
 *   2) تحويل Markdown_legacy إلى HTML (`*bold*` → <b>، `_italic_` → <i>،
 *      `` `code` `` → <code>) — وهذا يمنع انكسار الأكواد مثل `ml_3154096`
 *      بسبب شرطة السفلية التي كان تيليجرام يقرأها italic.
 *   3) تعقيم الوسوم إلى القائمة التي يقبلها Telegram HTML فقط.
 *   4) بنية تلقائية: تعداد • ، عناوين غامقة، إبراز الأكواد/الأرقام الطويلة.
 *   5) عزل ثنائي الاتجاه (LRM) حول المقاطع اللاتينية/الرقمية خارج الوسوم حتى
 *      لا تنقلب أمام النص العربي.
 *
 * الناتج دائمًا parse_mode: 'HTML' — أي أن كل مسارات الإرسال تُوحَّد عليها.
 */

/** Tags Telegram's HTML parse_mode actually accepts. */
const TG_ALLOWED = new Set([
  'b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del',
  'a', 'code', 'pre', 'blockquote',
]);

/** Block-level tags → newline (Telegram rejects them). */
const BLOCK_TAGS =
  'p|div|h[1-6]|ul|ol|li|section|article|aside|header|footer|main|' +
  'table|thead|tbody|tfoot|tr|td|th|figure|figcaption|details|summary|address|center';

const LRM = '\u200E';
const AR_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const ENTITY_SOURCE = '&(?:[a-zA-Z]+|#\\d+|#x[0-9a-fA-F]+);';
/** A Latin/digit run worth isolating (starts with a letter, digit or @). */
const LAT_RUN_SOURCE = '[@A-Za-z0-9+][A-Za-z0-9_@#%&+=/\\\\.|\'"-]*';
/** Standalone identifiers/long numbers that look wrong in a proportional font. */
const ID_TOKEN_RE = /(^|[\s(])([A-Za-z]{1,14}_\d{3,}|\d{6,})(?=$|[\s).,!؟،:»«])/g;
const BULLET_RE = /^\s*(?:[-*–—•·]|\d+[.)])\s+/;

// ---------------------------------------------------------------- primitives

function keep(store: string[], value: string): string {
  store.push(value);
  return `\u0000${store.length - 1}\u0000`;
}

/** Escape everything except the placeholders we injected (they use \u0000N\u0000). */
function escapeRest(t: string): string {
  return t
    .replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function restore(store: string[], t: string): string {
  return t.replace(/\u0000(\d+)\u0000/g, (m, i) => store[Number(i)] ?? m);
}

/** Keep only what Telegram understands; drop attributes except a safe href. */
function normalizeTag(raw: string): string {
  const m = /^<\/?([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>?$/.exec(raw);
  if (!m) return '';
  const closing = raw.startsWith('</');
  const name = m[1].toLowerCase();
  if (!TG_ALLOWED.has(name)) return '';
  if (closing) return `</${name}>`;
  if (name === 'a') {
    const href = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/.exec(m[2] || '');
    const url = String(href?.[1] ?? href?.[2] ?? href?.[3] ?? '').trim();
    if (!/^(https?:\/\/|tg:\/\/|mailto:)/i.test(url)) return '';
    return `<a href="${url.replace(/["<>]/g, '')}">`;
  }
  return `<${name}>`;
}

// ------------------------------------------------------------------ markdown

/**
 * Telegram legacy Markdown → HTML. Code spans are extracted first so
 * `_` / `*` inside identifiers (ml_3154096) are never treated as emphasis.
 */
function markdownToHtml(t: string): string {
  const stash: string[] = [];

  t = t.replace(/```[\w-]*\n?([\s\S]*?)```/g, (_m, c) => `<pre>${String(c).replace(/\n+$/, '')}</pre>`);
  t = t.replace(/`([^`\n]+)`/g, (_m, c) => `<code>${c}</code>`);

  t = t.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_m, label, url) => {
    const u = String(url).trim();
    if (!/^(https?:\/\/|tg:\/\/|mailto:)/i.test(u)) return String(label);
    return `<a href="${u.replace(/["<>]/g, '')}">${label}</a>`;
  });

  // Pull generated <pre>/<code>/<a> out of the way of emphasis rules.
  t = t.replace(/<pre>[\s\S]*?<\/pre>|<code>[\s\S]*?<\/code>|<a\s[^>]*>[\s\S]*?<\/a>/g, (m) => keep(stash, m));

  t = t.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  t = t.replace(/__([^_\n]+)__/g, '<b>$1</b>');
  t = t.replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<b>$2</b>');
  t = t.replace(/(^|[^_\w])_([^_\n]+)_(?!_)/g, '$1<i>$2</i>');
  t = t.replace(/~~([^~\n]+)~~/g, '<s>$1</s>');

  return restore(stash, t);
}

// --------------------------------------------------------------- structure

/** Bullets → •, short emoji/first lines → bold headings. Never touches tagged lines. */
function autoStructure(t: string): string {
  const lines = t.split('\n');
  let firstSeen = false;

  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (/<\/?[a-z]/i.test(trimmed)) return line; // already formatted — leave alone

      if (BULLET_RE.test(trimmed)) {
        return `• ${trimmed.replace(BULLET_RE, '')}`;
      }

      const hasMidColon = /:\s+\S/.test(trimmed);
      const endsSentence = /[.،,؟!?;]$/.test(trimmed);
      const isEmojiLead = /^\p{Extended_Pictographic}/u.test(trimmed);

      // `# title` style headings
      const h = /^#{1,6}\s+(.+)$/.exec(trimmed);
      if (h) return `<b>${h[1].trim()}</b>`;

      const shortEnough = trimmed.length <= (isEmojiLead ? 64 : 70);
      const headingish = shortEnough && !hasMidColon && !endsSentence;

      if (!firstSeen) {
        firstSeen = true;
        if (headingish) return `<b>${trimmed}</b>`;
        return line;
      }
      if (headingish && isEmojiLead) return `<b>${trimmed}</b>`;
      return line;
    })
    .join('\n');
}

/** Wrap ID-like tokens in <code> (outside tags / code spans) so they render LTR. */
function autoCode(t: string): string {
  const out: string[] = [];
  let inCode = 0;
  for (const part of t.split(/(<[^>]*>)/)) {
    if (!part) continue;
    if (part.startsWith('<')) {
      if (/<\/?(code|pre)\b/i.test(part)) inCode += part.startsWith('</') ? -1 : 1;
      out.push(part);
      continue;
    }
    out.push(inCode > 0 ? part : part.replace(ID_TOKEN_RE, (_m, pre, tok) => `${pre}<code>${tok}</code>`));
  }
  return out.join('');
}

/**
 * Wrap every Latin/digit run with LRM when the segment mixes Arabic with it.
 * Skips tags (attributes stay intact) and <code>/<pre> content (keeps codes
 * copy-pasteable). Entities (`&amp;`) are matched first in the same pass so
 * they are never split. Idempotent: existing LRM is stripped first.
 */
function isolateBidi(t: string): string {
  const out: string[] = [];
  let inCode = 0;

  for (const part of t.split(/(<[^>]*>)/)) {
    if (!part) continue;
    if (part.startsWith('<')) {
      if (/<\/?(code|pre)\b/i.test(part)) inCode += part.startsWith('</') ? -1 : 1;
      out.push(part);
      continue;
    }
    if (inCode > 0) { out.push(part); continue; }

    let seg = part.replace(/\u200E+/g, '');
    if (!AR_RE.test(seg)) { out.push(seg); continue; }

    // Alternation keeps entities intact while isolating Latin/digit runs.
    seg = seg.replace(
      new RegExp(`${ENTITY_SOURCE}|${LAT_RUN_SOURCE}`, 'g'),
      (m) => (m.startsWith('&') ? m : `${LRM}${m}${LRM}`)
    );
    seg = seg.replace(/\u200E{2,}/g, LRM);
    out.push(seg);
  }
  return out.join('');
}

// ------------------------------------------------------------------ public

export interface TgPrepared {
  text: string;
  parse_mode: 'HTML';
}

/**
 * Prepare any raw post/message for Telegram: one canonical, structured,
 * bidi-safe HTML body. Always returns parse_mode 'HTML'.
 *
 * @param raw    the post as generated (markdown, html or plain)
 * @param _hint optional channel format hint — accepted for call-site
 *              compatibility, the output format is always HTML.
 */
export function prepareTgText(raw: string, _hint?: string): TgPrepared {
  let t = String(raw ?? '');

  // 1) clean
  t = t
    .replace(/^\uFEFF/, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u200B-\u200D\u2060]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  // 2) markdown → html (code-safe)
  t = markdownToHtml(t);

  // 3) block tags → newlines, unknown tags unwrapped
  t = t.replace(new RegExp(`<\\s*(?:br|hr)\\s*/?>`, 'gi'), '\n');
  t = t.replace(new RegExp(`</?(?:${BLOCK_TAGS})\\b[^>]*>`, 'gi'), '\n');
  t = t.replace(/<\/?([a-zA-Z][\w-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g, (m) =>
    TG_ALLOWED.has((/^<\/?([a-zA-Z])/.exec(m)?.[1] || '').toLowerCase()) ? m : ''
  );
  t = t.replace(/<([a-zA-Z/][^<>]*)$/, ''); // tag truncated by length slicing

  // 4) protect real tags → escape the rest → restore (bullet-proof against
  //    stray `<`, `&` in plain text breaking "can't parse entities")
  const stash: string[] = [];
  t = t.replace(/<\/?[a-zA-Z][^<>]*>/g, (m) => keep(stash, normalizeTag(m)));
  t = escapeRest(t);
  t = restore(stash, t);

  // 5) structure + identifiers + bidi
  t = autoStructure(t);
  t = autoCode(t);
  t = isolateBidi(t);

  t = t
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

  return { text: t, parse_mode: 'HTML' };
}

/** Convenience: prepare and return just the body. */
export function tgText(raw: string, hint?: string): string {
  return prepareTgText(raw, hint).text;
}
