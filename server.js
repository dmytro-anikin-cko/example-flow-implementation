const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("/api/config", (req, res) => {
  res.json({ publicKey: process.env.CKO_PUBLIC_KEY });
});

app.post("/api/get-payment-session", async (req, res) => {
  try {
    const sessionReq = {
      amount: 1000,
      currency: "EUR",
      billing: {
        address: {
          country: "GB",
        },
      },
      success_url: "https://example.com/success",
      failure_url: "https://example.com/failure",
      processing_channel_id: process.env.CKO_PROCESSING_CHANNEL_ID,
      disabled_payment_methods: ["remember_me"],
      payment_method_configuration: {
        card: {
          store_payment_details: "enabled",
        },
      },
    };

    const ckoRes = await fetch(
      "https://api.sandbox.checkout.com/payment-sessions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CKO_SECRET_KEY}`,
        },
        body: JSON.stringify(sessionReq),
      }
    );

    const result = await ckoRes.json();
    res.status(200).json(result);
  } catch (err) {
    console.error("Payment error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/create-instrument", async (req, res) => {
  const { token } = req.body;

  try {
    const ckoRes = await fetch("https://api.sandbox.checkout.com/instruments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CKO_SECRET_KEY}`,
      },
      body: JSON.stringify({
        type: "token",
        token: token, // tok_xxx
      }),
    });

    const result = await ckoRes.json();
    // result.id will be src_yyy
    res.status(200).json(result);
  } catch (err) {
    console.error("Instrument creation error:", err);
    res.status(500).json({ error: "Failed to create instrument" });
  }
});

app.post("/api/request-payment", async (req, res) => {
  let {instrument} = req.body;
  try {
    const payReq = {
      source: {
        type: "id",
        id: instrument,
      },
      processing_channel_id: process.env.CKO_PROCESSING_CHANNEL_ID,
      amount: 500,
      currency: "GBP",
      reference: "example-flow-implementation",
      "3ds": {
        enabled: false,
      },
      success_url: "https://checkout.checkout.test.success",
      failure_url: "https://checkout.checkout.test.failure",
    };

    const response = await fetch("https://api.sandbox.checkout.com/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CKO_SECRET_KEY}`,
      },
      body: JSON.stringify(payReq),
    });
    const payment = await response.json();
    console.log(payment);
  } catch (error) {
    console.error("❌ Error fetching payment session:", error);
    return null;
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
