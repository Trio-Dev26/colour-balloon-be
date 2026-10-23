interface RichTextNode {
  text?: unknown;
  content?: unknown;
}

/**
 * Plain text of a TipTap JSON document: its text nodes in order, with blocks
 * separated by a space. Used for search, lists and counting blanks.
 */
export function plainText(doc: unknown): string {
  const parts: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const { text, content } = node as RichTextNode;
    if (typeof text === 'string') parts.push(text);
    if (Array.isArray(content)) {
      content.forEach(walk);
      parts.push(' ');
    }
  };
  walk(doc);
  return parts.join('').replace(/\s+/g, ' ').trim();
}
