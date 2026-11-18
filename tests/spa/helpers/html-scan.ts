// A small, quote-aware HTML start-tag scanner: the oracle for the AC3 assertions in
// tests/spa/markdown-pipeline.test.ts (specs/005-teaching-spa.md section 2.2).
//
// AC3 is a claim about markup, not about characters. "No on* attribute" means no attribute NAMED on*,
// and "no <script>" means no script ELEMENT, so a whole-string regex gets both directions wrong on
// pipeline output:
//   false alarm  `<code>onclick="x"</code>` is escaped text; `<img alt="<script>x</script>">` is an
//                inert quoted attribute value; the autolink <javascript:x> leaves `javascript:`
//                behind as link text.
//   false pass   a `>` inside a quoted value ends a naive `<[^>]*>` match early and hides every
//                attribute after it.
// The scanner reads start tags the way an HTML tokenizer does: a tag name, then attributes whose
// quoted values may contain `>`. It treats every `<` followed by a letter as a tag, comments and
// raw-text elements included, so it can over-report but not under-report. Attribute values are
// entity-decoded ONCE, which is what a browser does before it parses a URL.
//
// No HTML parser is added to the repository for this (rehype-parse, parse5 and jsdom are not
// dependencies). The scanner has its own self-test in markdown-pipeline.test.ts, because an oracle
// that cannot fail proves nothing. Like the other helpers here it imports nothing from the code
// under test.

/** One attribute as a parser reports it. */
export interface ScannedAttribute {
  /** Lower-cased. */
  name: string;
  /** Character references decoded once. `''` for a bare attribute. */
  value: string;
}

/** One start or end tag. */
export interface ScannedTag {
  /** Lower-cased. */
  name: string;
  closing: boolean;
  attributes: ScannedAttribute[];
}

/** The prefix rehype-sanitize's default schema puts on `id`, `name` and the aria id references. */
const PREFIX = 'user-content-';

/** The attributes the default schema clobber-prefixes besides `id` and `name`; their value is a list of ids. */
const ID_LIST_ATTRIBUTES = ['aria-labelledby', 'aria-describedby'];

/** Attributes whose value is a URL. Only the first four are in the default schema; the rest must never appear. */
const URL_ATTRIBUTES = new Set([
  'href',
  'src',
  'cite',
  'longdesc',
  'action',
  'formaction',
  'poster',
  'data',
  'background',
  'ping',
  'srcset',
  'xlink:href',
]);

/** The URL schemes the default schema allows, per attribute. A URL attribute not listed here allows none. */
const ALLOWED_SCHEMES: Record<string, readonly string[]> = {
  href: ['http', 'https', 'irc', 'ircs', 'mailto', 'xmpp'],
  cite: ['http', 'https'],
  longdesc: ['http', 'https'],
  src: ['http', 'https'],
};

/** The named references worth decoding. A Map, not an object: `&constructor;` must not find Object's constructor. */
const NAMED_REFERENCES = new Map([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
  ['Tab', '\t'],
  ['NewLine', '\n'],
  ['colon', ':'],
]);

/**
 * Decode character references exactly once, as a browser does for an attribute value. Numeric references
 * decode with or without the closing `;`; named ones only with it. Decoding twice would turn the legitimate
 * relative URL `jav&#x26;#x09;ascript:x` (which the stringifier writes for the text `jav&#x09;ascript:x`)
 * into a tab and then into `javascript:x`, a false alarm.
 */
export function decodeOnce(value: string): string {
  return value.replace(
    /&#([0-9]+);?|&#[xX]([0-9a-fA-F]+);?|&([A-Za-z][A-Za-z0-9]*);/g,
    (match: string, decimal?: string, hex?: string, named?: string) => {
      if (named !== undefined) return NAMED_REFERENCES.get(named) ?? match;
      const code = decimal !== undefined ? Number.parseInt(decimal, 10) : Number.parseInt(hex as string, 16);
      const valid = code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff);
      return valid ? String.fromCodePoint(code) : '\uFFFD';
    },
  );
}

/**
 * Every start and end tag in `html`, in document order. Attribute names are lower-cased and values are decoded
 * once. Text, comments and doctypes produce nothing.
 */
export function scanTags(html: string): ScannedTag[] {
  const tags: ScannedTag[] = [];
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) break;
    const closing = html[lt + 1] === '/';
    const nameStart = lt + (closing ? 2 : 1);
    if (!/[A-Za-z]/.test(html.charAt(nameStart))) {
      i = lt + 1; // a `<` that does not open a tag is text
      continue;
    }
    let j = nameStart;
    while (j < html.length && !/[\s/>]/.test(html[j])) j += 1;
    const tag: ScannedTag = { name: html.slice(nameStart, j).toLowerCase(), closing, attributes: [] };
    for (;;) {
      while (j < html.length && /[\s/]/.test(html[j])) j += 1;
      if (j >= html.length) break;
      if (html[j] === '>') {
        j += 1;
        break;
      }
      const nameFrom = j;
      j += 1; // the first character always belongs to the name, even a stray `=`
      while (j < html.length && !/[\s/>=]/.test(html[j])) j += 1;
      const name = html.slice(nameFrom, j).toLowerCase();
      while (j < html.length && /\s/.test(html[j])) j += 1;
      let value = '';
      if (html[j] === '=') {
        j += 1;
        while (j < html.length && /\s/.test(html[j])) j += 1;
        const quote = html[j];
        if (quote === '"' || quote === "'") {
          const end = html.indexOf(quote, j + 1);
          value = html.slice(j + 1, end === -1 ? html.length : end);
          j = end === -1 ? html.length : end + 1;
        } else {
          const from = j;
          while (j < html.length && !/[\s>]/.test(html[j])) j += 1;
          value = html.slice(from, j);
        }
      }
      tag.attributes.push({ name, value: decodeOnce(value) });
    }
    tags.push(tag);
    i = j;
  }
  return tags;
}

/** What a browser's URL parser sees: tab, CR and LF removed anywhere, leading and trailing C0 controls and spaces trimmed. */
function urlAsParsed(value: string): string {
  return value.replace(/[\t\n\r]/g, '').replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, '');
}

/** The lower-cased URL scheme of an already-decoded attribute value, or `undefined` for a relative reference. */
export function schemeOf(value: string): string | undefined {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(urlAsParsed(value));
  return match ? match[1].toLowerCase() : undefined;
}

const isHeading = (tag: ScannedTag): boolean => !tag.closing && /^h[1-6]$/.test(tag.name);

/**
 * Every way `html` breaks AC3, as readable strings; `[]` when it does not. AC3 reads: no `on*` event-handler
 * attribute, no <script>, no `javascript:` URL, and a prefixed `id` on every heading. Two checks go further, because
 * the prefix is only a defence if nothing escapes it: every `id`, `name` and aria id reference carries the prefix
 * (not just a heading's), and no URL attribute carries a scheme outside the default sanitize schema's allowlist.
 */
export function ac3Violations(html: string): string[] {
  const found: string[] = [];
  for (const tag of scanTags(html)) {
    const where = `<${tag.closing ? '/' : ''}${tag.name}>`;
    if (tag.name === 'script') found.push(`${where} element`);
    if (isHeading(tag) && !tag.attributes.some((attribute) => attribute.name === 'id')) found.push(`${where} has no id`);
    for (const { name, value } of tag.attributes) {
      if (name.startsWith('on')) found.push(`event-handler attribute "${name}" on ${where}`);
      if (URL_ATTRIBUTES.has(name)) {
        const scheme = schemeOf(value);
        if (scheme === 'javascript') found.push(`javascript: URL in "${name}" on ${where}`);
        else if (scheme !== undefined && !(ALLOWED_SCHEMES[name] ?? []).includes(scheme)) {
          found.push(`scheme "${scheme}:" not allowed in "${name}" on ${where}`);
        }
      }
      if ((name === 'id' || name === 'name') && !value.startsWith(PREFIX)) {
        found.push(`"${name}" value "${value}" on ${where} lacks the ${PREFIX} prefix`);
      }
      if (ID_LIST_ATTRIBUTES.includes(name)) {
        for (const id of value.split(/\s+/).filter(Boolean)) {
          if (!id.startsWith(PREFIX)) found.push(`"${name}" value "${id}" on ${where} lacks the ${PREFIX} prefix`);
        }
      }
    }
  }
  return found;
}

/** The `id` of every heading start tag in document order; `undefined` where a heading has none. */
export function headingIds(html: string): Array<string | undefined> {
  return scanTags(html)
    .filter(isHeading)
    .map((tag) => tag.attributes.find((attribute) => attribute.name === 'id')?.value);
}

/** The values of attribute `name` on every start tag called `tagName`, in document order. */
export function attributeValues(html: string, tagName: string, name: string): string[] {
  return scanTags(html)
    .filter((tag) => !tag.closing && tag.name === tagName)
    .flatMap((tag) => tag.attributes.filter((attribute) => attribute.name === name).map((attribute) => attribute.value));
}

/** The `id` values that appear on more than one element, each listed once. */
export function duplicateIds(html: string): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const tag of scanTags(html)) {
    if (tag.closing) continue;
    for (const attribute of tag.attributes) {
      if (attribute.name !== 'id') continue;
      if (seen.has(attribute.value)) repeated.add(attribute.value);
      seen.add(attribute.value);
    }
  }
  return [...repeated];
}
