# Checkout.com Flow — Example Integration

A minimal Node.js + vanilla JS example that uses [Checkout.com Flow](https://www.checkout.com/docs/payments/accept-payments/accept-a-payment-on-your-website) (Web Components) as a **tokenization-only component** with a **custom pay button**, then converts the short-lived token into a **long-lived instrument** for payment processing.

## What This Project Demonstrates

Flow is used here purely for **secure card capture and tokenization** — it renders a single card iframe, collects card details, and returns a short-lived token (`tok_`). The rest of the payment lifecycle is handled by your own backend:

```
┌─────────────┐      ┌─────────────┐      ┌──────────────────┐
│  Flow Card  │      │ Your Server │      │  Checkout.com API │
│  Component  │      │             │      │                   │
└──────┬──────┘      └──────┬──────┘      └────────┬──────────┘
       │                    │                      │
       │  1. tokenize()     │                      │
       │──── tok_xxx ──────>│                      │
       │                    │  2. POST /instruments │
       │                    │──── tok_xxx ─────────>│
       │                    │<─── src_yyy ──────────│
       │                    │                       │
       │                    │  3. POST /payments    │
       │                    │──── src_yyy ─────────>│
       │                    │<─── pay_zzz ──────────│
       │                    │                       │
       │  4. payment ID     │                       │
       │<───────────────────│                       │
```

1. **Tokenize** — Flow captures card details in a PCI-compliant iframe and returns a short-lived token (`tok_`)
2. **Create instrument** — your server exchanges the token for a long-lived, reusable instrument (`src_`) via the Checkout.com Instruments API
3. **Request payment** — your server uses the instrument ID to charge the card via the Checkout.com Payments API
4. **Display result** — the client shows the payment ID to the user

## Prerequisites

- **Node.js** v18+ (uses native `fetch`)
- A **Checkout.com Sandbox** account with a secret key, public key, and processing channel ID

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/your-org/example-flow-implementation.git
cd example-flow-implementation

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
```

Open `.env` and fill in your credentials:

```
CKO_SECRET_KEY=sk_sbox_...
CKO_PUBLIC_KEY=pk_sbox_...
CKO_PROCESSING_CHANNEL_ID=pc_...
```

```bash
# 4. Start the server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Test Cards

Use the [Checkout.com sandbox test cards](https://www.checkout.com/docs/developer-resources/testing/test-cards):

## Project Structure

```
├── server.js              Express server with three API routes
├── public/
│   ├── index.html         Page with the Flow container and custom pay button
│   ├── script.js          Client-side Flow initialization, tokenization, and UI logic
│   └── style.css          Minimal layout styles
├── .env.example           Template for required environment variables
├── package.json
```

## API Routes

| Method | Route                      | Description                                      |
|--------|----------------------------|--------------------------------------------------|
| GET    | `/api/config`              | Returns the public key to the client              |
| POST   | `/api/get-payment-session` | Creates a Payment Session via the Checkout.com API |
| POST   | `/api/create-instrument`   | Exchanges a token for an instrument (`tok_` → `src_`) |
| POST   | `/api/request-payment`     | Requests a payment using the instrument ID         |

## How It Works

### Server (`server.js`)

- Serves the static frontend from `public/`
- **`GET /api/config`** — exposes the public key so it isn't hardcoded on the client
- **`POST /api/get-payment-session`** — creates a Payment Session (billing address, amount, currency, and processing channel are all configured here, server-side)
- **`POST /api/create-instrument`** — takes the short-lived `tok_` from Flow and exchanges it for a long-lived `src_` instrument via the Checkout.com Instruments API. This instrument can be stored and reused for future payments
- **`POST /api/request-payment`** — charges the card by sending the instrument ID (`src_`) to the Checkout.com Payments API

### Client (`public/script.js`)

- Fetches the public key and payment session in parallel on page load
- Initializes `CheckoutWebComponents` with `showPayButton: false` so Flow acts as a **tokenization-only component** — no built-in submit behavior
- Mounts a single `"card"` component into a container on the page
- A **custom pay button** controls the flow: on click it calls `component.tokenize()` to get a `tok_`, then sends it through the server's instrument and payment endpoints
- Event callbacks handle UX:
  - **`onChange`** — enables/disables the custom pay button based on card validity via `component.isValid()`
  - **`onCardBinChanged`** — receives card metadata (scheme, BIN, etc.) for display or analytics
  - **`onSubmit`** — shows a loading overlay while the payment is processing
  - **`onPaymentCompleted`** — displays the payment ID on screen
