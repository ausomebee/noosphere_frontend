import React, { useRef, useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import invoiceApi from "../../api/InvoiceApi";

// The test-card crib is for us, not for payers. Gate it on the publishable key
// so it disappears by itself the moment a live key is configured.
const IS_TEST_MODE = (import.meta.env.VITE_STRIPE_PK || "").startsWith("pk_test");

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "15px",
      color: "#1a1a1a",
      fontFamily: "'Inter', sans-serif",
      "::placeholder": { color: "#9ca3af" },
      iconColor: "#6b7280",
    },
    invalid: { color: "#dc2626", iconColor: "#dc2626" },
  },
};

// Stripe says this PaymentIntent can't take another attempt (e.g. it was
// cancelled), so the next submit must ask the server for a fresh one.
const isIntentUnusable = (err) =>
  err?.code === "payment_intent_unexpected_state" ||
  err?.payment_intent?.status === "canceled";

const StripeForm = ({ token, amount, currency, tenantId, email, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState(null);
  // The PaymentIntent from the first submit. A declined card leaves it ready
  // for another attempt, so retries reuse it instead of piling up a new
  // PaymentIntent per click. Keyed by token so a different link never reuses it.
  const intentRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!name.trim()) {
      setCardError("Cardholder name is required.");
      return;
    }

    setLoading(true);
    setCardError(null);

    const cardElement = elements.getElement(CardElement);
    const billingDetails = { name: name.trim(), ...(email ? { email } : {}) };

    try {
      // 1. Ask the server for a PaymentIntent. It derives the amount from the
      //    invoice behind the token, so nothing here can change what is
      //    charged. Done before touching the card so a dead or already-paid
      //    link fails without an authorisation attempt.
      //    Reused across retries on this page (see intentRef).
      if (intentRef.current?.token !== token) {
        const intent = await invoiceApi.CreateStripePaymentIntent({ token });
        intentRef.current = { token, clientSecret: intent.clientSecret };
      }
      const { clientSecret } = intentRef.current;

      // 2. Tokenise. This is only for the receipt: confirmCardPayment's
      //    client-side response doesn't expand the charge, so the brand and
      //    last 4 have to come from the PaymentMethod.
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: billingDetails,
      });
      if (pmError) throw pmError;

      // 3. The actual charge. Handles the 3-D Secure challenge itself when the
      //    intent comes back as requires_action.
      const { error: confirmError, paymentIntent } =
        await stripe.confirmCardPayment(clientSecret, {
          payment_method: paymentMethod.id,
        });
      if (confirmError) {
        if (isIntentUnusable(confirmError)) intentRef.current = null;
        throw confirmError;
      }

      // Anything other than succeeded is not a payment — never report it as one.
      if (paymentIntent?.status !== "succeeded") {
        if (paymentIntent?.status === "canceled") intentRef.current = null;
        throw new Error(
          `Payment was not completed (status: ${paymentIntent?.status || "unknown"}). You have not been charged.`
        );
      }

      onSuccess({
        status: "Successful",
        // Real Stripe identifiers now — these resolve in the dashboard.
        paymentIntentId: paymentIntent.id,
        transactionId: paymentIntent.id,
        transactionRef: paymentIntent.latest_charge || paymentIntent.id,
        last4: paymentMethod.card?.last4,
        cardBrand: paymentMethod.card?.brand
          ? paymentMethod.card.brand.charAt(0).toUpperCase() + paymentMethod.card.brand.slice(1)
          : "Card",
        name: name.trim(),
        token: paymentMethod.id,
        tenantId,
        paymentMethod: "stripe",
        amount,
        currency,
      });
    } catch (err) {
      const message = err?.message || "Payment failed. Please try again.";
      setCardError(message);
      onError?.({
        status: "failed",
        error: message,
        name: name.trim(),
        paymentMethod: "stripe",
        cardType: "Unknown",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="payment-form-group">
        <label className="payment-form-label">Cardholder Name</label>
        <input
          type="text"
          className="payment-form-input"
          placeholder="Name on card"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="payment-form-group">
        <label className="payment-form-label">Card Details</label>
        <div className="card-element-wrapper">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      {cardError && <p className="payment-form-error">{cardError}</p>}

      {IS_TEST_MODE && (
        <div className="stripe-test-hint">
          <span>Test card:</span> 4242 4242 4242 4242 &nbsp;|&nbsp; Any future date &nbsp;|&nbsp; Any CVV
        </div>
      )}

      <button
        type="submit"
        className="payment-submit-btn"
        disabled={!stripe || loading}
      >
        {loading ? (
          <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ) : (
          `Pay ${currency} ${parseFloat(amount).toFixed(2)}`
        )}
      </button>
    </form>
  );
};

export default StripeForm;
