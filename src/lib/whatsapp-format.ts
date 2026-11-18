// Parses WhatsApp's inline formatting into a small tree that React can render
// without dangerouslySetInnerHTML:
//   *bold*  _italic_  ~strikethrough~  ```monospace```
// Like WhatsApp, a marker only counts at a word boundary and must hug its text,
// so "2*3*4", "snake_case_name" and "* not bold *" stay plain.

export type FormatNode =
  | { type: "text"; text: string }
  | { type: "bold" | "italic" | "strike"; children: FormatNode[] }
  | { type: "code"; text: string };

const INLINE = String.raw`(?<![\p{L}\p{N}M])M(?=\S)([^M\n]+?)(?<=\S)M(?![\p{L}\p{N}M])`;
// Unicode-mode regexes reject needless escapes like \_ and \~, so only escape "*".
const inline = (marker: "*" | "_" | "~") => INLINE.replaceAll("M", marker === "*" ? "\\*" : marker);

const PATTERN = new RegExp(
  ["```([\\s\\S]+?)```", inline("*"), inline("_"), inline("~")].join("|"),
  "gu",
);

export function parseWhatsAppFormatting(input: string): FormatNode[] {
  const nodes: FormatNode[] = [];
  let cursor = 0;

  for (const match of input.matchAll(PATTERN)) {
    const [whole, code, bold, italic, strike] = match;
    if (match.index > cursor) nodes.push({ type: "text", text: input.slice(cursor, match.index) });

    if (code !== undefined) nodes.push({ type: "code", text: code });
    else if (bold !== undefined) nodes.push({ type: "bold", children: parseWhatsAppFormatting(bold) });
    else if (italic !== undefined) nodes.push({ type: "italic", children: parseWhatsAppFormatting(italic) });
    else if (strike !== undefined) nodes.push({ type: "strike", children: parseWhatsAppFormatting(strike) });

    cursor = match.index + whole.length;
  }

  if (cursor < input.length) nodes.push({ type: "text", text: input.slice(cursor) });
  return nodes;
}

/** The text with formatting markers removed, e.g. for chat-list previews. */
export function stripWhatsAppFormatting(input: string): string {
  const flatten = (nodes: FormatNode[]): string =>
    nodes.map((node) => ("children" in node ? flatten(node.children) : node.text)).join("");
  return flatten(parseWhatsAppFormatting(input));
}
