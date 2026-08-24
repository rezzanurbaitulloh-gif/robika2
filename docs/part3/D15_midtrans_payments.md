# D15 — ROBika Midtrans Payment Architecture

> All payments flow through a single **PaymentService** interface with a Midtrans adapter. Server-only secrets; idempotent webhooks; Gems granted exactly once; never on client-side success alone (§61/§62).

⚠️ Environment note: `/home/reja/ROBika/env` sets `MIDTRANS_IS_PRODUCTION=true` while its comment says sandbox testing — resolve before enabling real money. Phase 0 ships payments behind feature flag `PAYMENTS_ENABLED=false`.

---

## 1. Interface & Adapter

```ts
// lib/payments/types.ts
interface PaymentService {
  createOrder(input: CreateOrderInput): Promise<SnapToken>;
  getStatus(orderId: string): Promise<GatewayStatus>;
  verifyNotification(payload: unknown, signature: string): Promise<boolean>; // sha512 signature check
}
```
- `MidtransAdapter` implements against Snap API using `MIDTRANS_SERVER_KEY`; base URL switches on `MIDTRANS_IS_PRODUCTION`.
- Swap-ability kept for tests (`FakePaymentService`) — architecture not married to Midtrans.

## 2. Order Lifecycle

```
Client /shop → POST /api/payments/create-order {product_id}
  ├─ auth + product validation from topup_products
  ├─ insert payment_orders(status=created) + purchases(pending)
  ├─ adapter.createOrder → snap_token stored
  └─ return snap token → client opens Snap popup

User pays in Snap
Midtrans POSTs notification → /api/payments/webhook
  ├─ verify signature sha512(order_id+status_code+gross_amount+serverKey)
  ├─ INSERT payment_events with event_digest unique  ← idempotency gate
  │     duplicate digest ⇒ ACK 200, do nothing
  ├─ adapter.getStatus(orderId) cross-check (never trust payload alone)
  ├─ RPC finalize_payment(order_id):
  │     orders.status=settlement · purchases=paid→delivered
  │     wallet_apply(+gems, reason='topup', idem=order_id)
  └─ inbox receipt row + EventBus payment.completed → client wallet refresh
```

Failure paths map Midtrans statuses (`deny/cancel/expire/failure`) to order status updates without grants; refund handling marks purchases refunded and writes negative ledger entry (manual ops trigger MVP).

## 3. Idempotency Guarantees

1. `payment_events.event_digest UNIQUE` — replays no-op at the door.
2. `finalize_payment` re-checks `orders.status` transition validity (settlement only from pending/created).
3. `wallet_apply` idempotency key = order_id ⇒ even if called twice by race, second is rejected.
4. Client retry of create-order for same pending product returns existing open order instead of duplicating.

## 4. Security Rules (feeds D23)

- Server keys never leave server runtime; client gets only snap token.
- Gross amount always recomputed server-side from product config — client-sent amount ignored.
- Webhook route: raw-body signature verify before JSON parse usage; rate-limited; responds 200 fast, processes async if needed.
- Logs redact tokens; store only last4-style refs.

## 5. UX States (§67)

Shop top-up modal: creating → snap-opened → awaiting-payment → success (confetti + balance tick) / failed / expired (retry creates fresh order). Purchase history shows gateway status chips synced via polling until terminal state.

## 6. Testing (feeds D22)

Integration with FakePaymentService: happy path, duplicate webhook replay, signature mismatch reject, status cross-check divergence (payload says settlement, gateway says pending ⇒ hold, no grant).
Contract test against Midtrans sandbox once flag flips (staging env only).
E2E: full purchase simulation in sandbox mode.
