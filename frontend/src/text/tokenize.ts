export interface Token {
  text: string;
  isWord: boolean;
}

const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

/** Split text into word and non-word spans; joining all tokens gives back the text. */
export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  for (const m of text.matchAll(WORD)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: text.slice(last, i), isWord: false });
    out.push({ text: m[0], isWord: true });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), isWord: false });
  return out;
}

/** Strip leading/trailing punctuation from a word or phrase. */
export function cleanWord(s: string): string {
  return s.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}
