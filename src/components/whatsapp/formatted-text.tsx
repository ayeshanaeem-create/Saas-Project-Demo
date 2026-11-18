import { Fragment, useMemo } from "react";

import { parseWhatsAppFormatting, type FormatNode } from "@/lib/whatsapp-format";

/** Renders *bold*, _italic_, ~strike~ and ```monospace``` the way WhatsApp does. */
export function FormattedText({ text }: { text: string }) {
  const nodes = useMemo(() => parseWhatsAppFormatting(text), [text]);
  return <>{renderNodes(nodes)}</>;
}

function renderNodes(nodes: FormatNode[]) {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text":
        return <Fragment key={i}>{node.text}</Fragment>;
      case "bold":
        return <strong key={i} className="font-semibold">{renderNodes(node.children)}</strong>;
      case "italic":
        return <em key={i}>{renderNodes(node.children)}</em>;
      case "strike":
        return <s key={i}>{renderNodes(node.children)}</s>;
      case "code":
        return (
          <code key={i} className="font-mono text-[0.9em]">
            {node.text}
          </code>
        );
    }
  });
}
