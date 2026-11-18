/** Reads a newline-delimited JSON stream, calling `onValue` for each complete line. */
export async function readNdjson(body: ReadableStream<Uint8Array>, onValue: (value: unknown) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const drainLines = () => {
    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) onValue(JSON.parse(line));
      newline = buffer.indexOf("\n");
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    // `stream: true` holds back a multi-byte character split across chunks.
    buffer += decoder.decode(value, { stream: true });
    drainLines();
  }
  buffer += decoder.decode();
  drainLines();
  const rest = buffer.trim();
  if (rest) onValue(JSON.parse(rest));
}
