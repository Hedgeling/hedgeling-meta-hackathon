// SPDX-License-Identifier: Apache-2.0
// Synthetic event-created UI for local context-enrichment verification.
export function ContextWorkshop({ saved, count, onSave, onArchive }) {
  return <section aria-label="Workspace settings">
    <h1>Team preferences</h1>
    <p>Choose how your team receives project updates.</p>
    <label htmlFor="nickname">Workspace nickname</label>
    {/* This maxlength applies to the user's nickname, not the label above. */}
    <input id="nickname" maxLength={32} />
    <button onClick={onSave}>Save changes</button>
    {saved && <p role="status">Your preferences have been saved.</p>}
    <button onClick={onArchive}>Archive project</button>
    <p>Archived projects stay available in your history.</p>
    <label htmlFor="updates">Email me about new translations</label>
    <input id="updates" type="checkbox" />
    <p aria-live="polite">{count} translations are ready for review.</p>
  </section>;
}
