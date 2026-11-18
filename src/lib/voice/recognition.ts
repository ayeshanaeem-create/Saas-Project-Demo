// Browser speech-to-text (Web Speech API). Chrome and Edge send the audio to their cloud
// speech service, so recognition needs an internet connection. Only the bits we use are
// typed here, because TypeScript's DOM types don't reliably include SpeechRecognition.

type RecognitionAlternative = { transcript: string };
type RecognitionResult = ArrayLike<RecognitionAlternative> & { isFinal: boolean };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};

type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isRecognitionSupported(): boolean {
  return recognitionConstructor() !== null;
}

export type Heard =
  | { kind: "speech"; text: string }
  /** Nothing was said before the browser gave up listening. */
  | { kind: "silence" }
  | { kind: "aborted" }
  /** e.g. "not-allowed" (microphone blocked), "network", "audio-capture". */
  | { kind: "error"; error: string };

/** Listens for one utterance and resolves with what was said. Abort `signal` to stop early. */
export function listenOnce(options: {
  lang?: string;
  onInterim?: (text: string) => void;
  signal: AbortSignal;
}): Promise<Heard> {
  const Recognition = recognitionConstructor();
  if (!Recognition) return Promise.resolve({ kind: "error", error: "unsupported" });
  if (options.signal.aborted) return Promise.resolve({ kind: "aborted" });

  return new Promise<Heard>((resolve) => {
    const recognition = new Recognition();
    recognition.lang = options.lang ?? "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let finalText = "";
    let settled = false;
    const settle = (heard: Heard) => {
      if (settled) return;
      settled = true;
      options.signal.removeEventListener("abort", onAbort);
      resolve(heard);
    };
    const onAbort = () => {
      settle({ kind: "aborted" });
      try {
        recognition.abort();
      } catch {
        // already stopped
      }
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]!;
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += text;
        else interim += text;
      }
      options.onInterim?.(`${finalText}${interim}`.trim());
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech") settle({ kind: "silence" });
      else if (event.error === "aborted") settle({ kind: "aborted" });
      else settle({ kind: "error", error: event.error });
    };
    recognition.onend = () => settle(finalText.trim() ? { kind: "speech", text: finalText.trim() } : { kind: "silence" });

    options.signal.addEventListener("abort", onAbort);
    try {
      recognition.start();
    } catch {
      settle({ kind: "error", error: "start-failed" });
    }
  });
}
