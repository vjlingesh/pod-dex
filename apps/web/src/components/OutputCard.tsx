import { useState } from "react";
import type { Output } from "../api.js";

type Props = {
  output: Output;
  onToggleUsed: (markedUsed: boolean) => void | Promise<void>;
};

export function OutputCard({ output, onToggleUsed }: Props) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  async function copy() {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(output.body.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access needs a secure context; say so rather than failing silently.
      setCopyFailed(true);
    }
  }

  return (
    <section className={`card output ${output.markedUsed ? "used" : ""}`}>
      <div className="output-head">
        <h2>{output.title}</h2>
        <div className="output-actions">
          <button type="button" className="secondary" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </button>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={output.markedUsed}
              onChange={(e) => void onToggleUsed(e.target.checked)}
            />
            Used
          </label>
        </div>
      </div>

      {copyFailed && (
        <p className="error small" role="alert">
          Could not reach the clipboard — select the text below and copy manually.
        </p>
      )}

      <pre className="output-body">{output.body.markdown}</pre>

      {output.generatedBy === "fake" && (
        <p className="muted small">
          Generated offline — set OPENROUTER_API_KEY to use a real model.
        </p>
      )}
    </section>
  );
}
