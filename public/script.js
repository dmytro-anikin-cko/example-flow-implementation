let component = null;
let checkout;
let paymentSession;
let isValid = false;
const showPayButton = false;

const flowContainer = document.getElementById("flow-container");
const sessionStatus = document.getElementById("session-status");
const loader = document.getElementById("loader");
const payButton = document.getElementById("payButton");
const loadingOverlay = document.getElementById("loading-overlay");
const paymentResult = document.getElementById("payment-result");

const tokenize = async () => {
  if (isValid) {
    const response = await component.tokenize();
    return response;
  }
};

const showLoadingOverlay = () => {
  flowContainer.classList.add("hidden");
  payButton.classList.add("hidden");
  loadingOverlay.classList.remove("hidden");
};

const hideLoadingOverlay = () => {
  loadingOverlay.classList.add("hidden");
  flowContainer.classList.remove("hidden");
  payButton.classList.remove("hidden");
};

const showPaymentResult = (paymentId, status) => {
  hideLoadingOverlay();
  flowContainer.classList.add("hidden");
  payButton.classList.add("hidden");
  paymentResult.innerHTML = `
    <div class="text-center py-8">
      <div class="text-green-500 text-5xl mb-4">&#10003;</div>
      <h2 class="text-xl font-semibold text-gray-800 mb-2">Payment ${status}</h2>
      <p class="text-sm text-gray-500 mb-1">Payment ID</p>
      <p class="font-mono text-sm text-gray-700 bg-gray-100 rounded px-3 py-2 inline-block">${paymentId}</p>
    </div>
  `;
  paymentResult.classList.remove("hidden");
};

(async () => {
  const fetchConfig = async () => {
    const res = await fetch("/api/config");
    return res.json();
  };

  const createPaymentSession = async () => {
    try {
      const response = await fetch("/api/get-payment-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.json();
    } catch (error) {
      console.error("Error fetching payment session:", error);
      loader.innerHTML = `<span class="text-red-600">Network error while loading payment session.</span>`;
      return null;
    }
  };

  loader.classList.remove("hidden");

  const [config, session] = await Promise.all([
    fetchConfig(),
    createPaymentSession(),
  ]);
  paymentSession = session;

  if (!paymentSession || !paymentSession.id) {
    loader.innerHTML = `<span class="text-red-600">❌ Failed to initialize a valid payment session.</span>`;
    return;
  }

  checkout = await CheckoutWebComponents({
    publicKey: config.publicKey,
    environment: "sandbox",
    paymentSession,
    onChange: (k) => {
      // Enable/disable pay button based on form validity
      isValid = component.isValid();
      payButton.disabled = !isValid;

      // ALTERNATIVE tokenization method:
      // if (isValid) {
      //   tokenize();
      // }
    },

    // ALTERNATIVE tokenization method:
    // onTokenized: (_self, tokenizeResult) => {
    //   // Enable/disable pay button based on form validity
    //   isValid = component.isValid();
    //   payButton.disabled = !isValid;

    //   console.log("onTokenize:", tokenizeResult);
    //   return { continue: true };
    // },

    onCardBinChanged: (_self, cardMetadata) => {
      console.log("onCardBinChanged:", cardMetadata);
    },
    onError: (_, error) => console.error(error),
    onPaymentCompleted: async (_self, paymentResponse) => {
      console.log("onPaymentCompleted: ", paymentResponse);
      showPaymentResult(paymentResponse.id, paymentResponse.status || "Completed");
    },
    onSubmit: (_self) => {
      // Show loading overlay to prevent further user interaction
      showLoadingOverlay();
    },
  });

  component = checkout.create("card", { showPayButton });

  payButton.addEventListener("click", async () => {
    payButton.disabled = true;
    payButton.textContent = "Processing...";

    // Tokenize
    const tokenResult = await tokenize();
    if (!tokenResult?.data?.token) {
      console.error("Tokenization failed");
      return;
    }
    const token = tokenResult.data.token;


    // DO WHATEVER WITH THE TOKEN
    // Create instrument (tok_ → src_) or create a payment request
    const instrumentRes = await fetch("/api/create-instrument", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const instrument = await instrumentRes.json();

    if (!instrument?.id) {
      console.error("Instrument creation failed");
      return;
    }


    const paymentRes = await fetch("api/request-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instrument }),
    });
    const payment = await paymentRes.json();

    if (!payment?.id) {
      console.error("Payment request failed");
      return;
    }

    console.log("Payment request successful");
    console.log(payment);
    return;
  });

  if (await component.isAvailable()) {
    console.log("Available✅");
    component.mount(flowContainer);
  } else {
    console.log("Not Available❌");
    alert(`Not Available❌`);
  }

  loader.classList.add("hidden");
  sessionStatus.textContent = `✅ Your Payment Session ID is: ${paymentSession.id}`;
  sessionStatus.classList.remove("hidden");
})();
