import React, { useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";

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

const StripeForm = ({ amount, currency, tenantId, email, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState(null);

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

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement,
      billing_details: { name: name.trim(), ...(email ? { email } : {}) },
    });

    if (error) {
      setCardError(error.message);
      onError?.({
        status: "failed",
        error: error.message,
        name: name.trim(),
        paymentMethod: "stripe",
        cardType: "Unknown",
      });
      setLoading(false);
      return;
    }

    const result = {
      status: "Successful",
      transactionId: `txn_${Date.now()}`,
      transactionRef: `ref_${paymentMethod.id}`,
      last4: paymentMethod.card.last4,
      cardBrand: paymentMethod.card.brand
        ? paymentMethod.card.brand.charAt(0).toUpperCase() + paymentMethod.card.brand.slice(1)
        : "Card",
      name: name.trim(),
      token: paymentMethod.id,
      tenantId,
      paymentMethod: "stripe",
      amount,
      currency,
    };

    onSuccess(result);
    setLoading(false);
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

      <div className="stripe-test-hint">
        <span>Test card:</span> 4242 4242 4242 4242 &nbsp;|&nbsp; Any future date &nbsp;|&nbsp; Any CVV
      </div>

      <button
        type="submit"
        className="payment-submit-btn"
        disabled={!stripe || loading}
      >
        {loading ? (
          <span className="payment-btn-spinner" />
        ) : (
          `Pay ${currency} ${parseFloat(amount).toFixed(2)}`
        )}
      </button>
    </form>
  );
};

export default StripeForm;
