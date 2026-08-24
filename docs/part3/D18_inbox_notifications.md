# D18 — ROBika Inbox / Notification Architecture

> Two layers (§66): **Inbox** = persistent reward/system messages with claimable attachments; **Notifications** = transient contextual in-game toasts. Both server-originated or event-bus generated; nothing grant-capable lives client-side.

---

## 1. Inbox

### Message kinds
`reward` (claimable attachment: gems/credits/items/xp) · `system` (announcements, maintenance notes) · `payment_receipt` (top-up confirmation) · `gacha_result` (pull summary record).

### Lifecycle
```
created (server) → unread badge → opened → [claim → attachment validated+granted via RPC] → read/archived
expiry: expires_at sweeps unclaimed reward attachments (policy: rewards never expire silently in MVP — default null)
```
- Claim path reuses `wallet_apply`/grant RPCs with idempotency key = message id ⇒ double-claim impossible.
- UI: envelope icon in HUD + `/profile` inbox drawer; pixel-styled letter cards; unread dot; bulk claim button.
- Realtime channel `inbox:{user_id}` pushes new rows when online.

## 2. Notifications (toasts)

### Sources
EventBus events mapped to toast codes: `quest.completed`, `player.levelup`, `item.obtained`, `skin.obtained`, `achievement.unlocked`, `sync.completed`, payment/gacha confirmations, error/offline banners.

### Rules
- Queue with max 3 visible, 4s default lifetime, stacking animation, per-code cooldown to prevent spam during combat bursts.
- Priority classes: `critical` (payment success, sync conflicts) persist until acknowledged; `ambient` auto-dismiss.
- Mobile landscape: top-center compact bar; desktop: top-right stack.
- Every notification optionally mirrors a row in `notifications` table for cross-session history (configurable per code).

## 3. Copy & Localization

All strings keyed (`notify.quest.completed.title`); placeholders typed (`{quest}`, `+{amount} Gems`). Tone guide: adventurous, concise, no corporate speak — BOT-1 may voice system messages where fitting.

## 4. Offline

- Inbox cached read-only; claims queue as intents applied on sync.
- Toasts work fully offline from local events; server-origin ones appear after reconnect digest ("While you were away" inbox summary).

## 5. Testing (feeds D22)

Integration: claim idempotency; expiry sweep behavior; realtime push ordering.
E2E: complete quest → toast fires + inbox row exists → claim grants once (balance checked twice).
UI: notification storm test (10 rapid events) respects max-visible + cooldowns.
