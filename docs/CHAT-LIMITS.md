# Chat capacity and allowances

The event-created `src/chat-limits.js` is the shared capacity policy vendored into
the hosted server and browser. Hosted chat configuration exposes these public
bounds. Organization entitlements separately control included usage.

| Application bound | Before | Current |
| --- | --- | --- |
| Serialized model request, including tools and opaque replay state | 97,952 UTF-8 bytes (100,000 minus output reservation) | 750,000 UTF-8 bytes |
| History entries at new-message admission, including internal tool activity | 100 | 1,000 |
| User message length | 6,000 characters | 24,000 characters |
| Model output budget per step | 2,048 tokens | 4,096 tokens |
| Model steps per user turn | 8 | 16 |
| Provider timeout per step | 45 seconds | 90 seconds |
| Tool calls per model step | 8 | 8 |
| Provider response bound | 512 KiB | 512 KiB |
| New conversations per user, rolling day | 100 | 100 |
| Write previews per user, rolling day | 200 | 200 |
| Proposal validity | 15 minutes | 15 minutes |

History admission is checked before accepting a user message; the accepted turn
can append model/tool entries afterward. Capacity is finite. This release keeps
full model history and does not summarize, truncate, or silently drop it. Request
capacity is checked before usage reservation and provider dispatch. One byte is
reserved as one token, plus the output budget, then reconciled against reported
usage. This conservative reservation is not a tokenizer or the model's native
context window. Larger requests therefore need more allowance headroom.

The configured hosted Meta model is Muse Spark 1.3; Meta lists a 1-million-token
context window in its [model documentation](https://dev.meta.ai/models/muse-spark).
The application byte guard is separate. Changing providers/models requires
checking their own context and output capabilities.

Default included allowances remain 500,000 tokens per user per database day and
2 million per organization usage period. The owner-requested demo grant remains
10 million per user per database day and 50 million per organization usage period.
The daily user counter spans that user's organizations. Existing plan access,
usage/budget enforcement, human approvals, controller leases and permissions apply.
No chat overages or automatic translation spending are introduced.

Long conversation replay now follows 250-event pages before reconnecting to live
updates. Historical tool activity is replayed without navigating or executing new
work. Pending approvals keep their existing authority and expiry checks.

Verification uses synthetic provider responses, a disposable database and browser
fixtures. It covers requests above the old bound, UTF-8 byte boundaries, allowance
reservations, both model adapters, continuation after 100 history entries, larger
messages, the new upper bounds, and reload after more than 1,000 stored events.
