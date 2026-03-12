# Checkout.com Flow — Example Integration

A minimal Node.js + vanilla JS example showing how to accept card payments using [Checkout.com Flow](https://www.checkout.com/docs/payments/accept-payments/accept-a-payment-on-your-website) (Web Components).

The project demonstrates a complete payment lifecycle:

1. Create a **Payment Session** (server-side)
2. Render the **Flow card component** (client-side)
3. **Tokenize** card details
4. **Create an instrument** from the token (`tok_` → `src_`)
5. **Request a payment** using the instrument
6. Display the **payment ID** on completion

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
- Exposes `/api/config` so the client can retrieve the public key without hardcoding it
- Creates a Payment Session with billing address, amount, currency, and processing channel
- Provides endpoints for instrument creation and payment requests, all authenticated with the secret key

### Client (`public/script.js`)

- Fetches the public key and payment session in parallel on page load
- Initializes `CheckoutWebComponents` with the session and event callbacks:
  - **`onChange`** — enables/disables the pay button based on card validity
  - **`onCardBinChanged`** — logs card metadata (scheme, BIN, etc.)
  - **`onPaymentCompleted`** — displays the payment ID on screen
  - **`onSubmit`** — shows a loading overlay during processing
- Mounts a single `"card"` component into the page
- On pay button click: tokenizes → creates instrument → requests payment → shows result
