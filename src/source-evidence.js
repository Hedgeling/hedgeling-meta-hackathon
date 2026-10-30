// SPDX-License-Identifier: Apache-2.0
// Runs beside a separately operated extractor. Reads only its supplied snapshot;
// no filesystem access, source execution, credentials, or network requests.
export const EVIDENCE_LIMITS = Object.freeze({ perString: 2, snippetBytes: 2048, totalBytes: 262144, radius: 3 });
export function attachSourceEvidence(entries, files) {
  const sources = new Map(files.map(f => [f.path, f.content.split(/\r?\n/)]));
  let used = 0;
  return entries.map(entry => {
    let count = 0;
    return { ...entry, contexts: (entry.contexts || []).map(context => ({ ...context,
      locations: (context.locations || []).map(location => {
        const lines = sources.get(location.file), line = location.line;
        if (!lines || !Number.isSafeInteger(line) || line < 1 || line > lines.length || count >= EVIDENCE_LIMITS.perString) return location;
        const startLine = Math.max(1, line - EVIDENCE_LIMITS.radius), endLine = Math.min(lines.length, line + EVIDENCE_LIMITS.radius);
        const text = lines.slice(startLine - 1, endLine).join('\n'), bytes = Buffer.byteLength(text);
        // Skip oversized excerpts instead of silently cutting a statement/UTF-8.
        if (bytes > EVIDENCE_LIMITS.snippetBytes || used + bytes > EVIDENCE_LIMITS.totalBytes) return location;
        used += bytes; count++;
        return { ...location, snippet: { text, startLine, endLine } };
      }),
    })) };
  });
}
