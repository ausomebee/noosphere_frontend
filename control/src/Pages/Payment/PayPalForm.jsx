import React from "react";
import { PayPalButtons } from "@paypal/react-paypal-js";

const PayPalForm = ({ amount, currency, tenantId, email, onSuccess, onError }) => {
  const createOrder = (data, actions) => {
    return actions.order.create({
      purchase_units: [
        {
          amount: {
            currency_code: currency || "USD",
            value: parseFloat(amount).toFixed(2),
          },
        },
      ],
      ...(email ? { payer: { email_address: email } } : {}),
    });
  };

  const onApprove = async (data, actions) => {
    const order = await actions.order.capture();

    const captureId =
      order.purchase_units?.[0]?.payments?.captures?.[0]?.id || order.id;

    const result = {
      status: "success",
      transactionId: order.id,
      transactionRef: captureId,
      last4: null, // PayPal does not expose card last4
      name:
        `${order.payer?.name?.given_name || ""} ${order.payer?.name?.surname || ""}`.trim(),
      token: data.orderID,
      tenantId,
      paymentMethod: "paypal",
      amount,
      currency,
    };

    onSuccess(result);
  };

  return (
    <div className="paypal-form">
      <p className="paypal-info">
        You will be redirected to PayPal to complete your payment securely.
      </p>
      <PayPalButtons
        style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay" }}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={(err) =>
          onError?.({ status: "failed", error: err.message || "PayPal error", paymentMethod: "paypal" })
        }
        onCancel={() =>
          onError?.({ status: "cancelled", error: "Payment was cancelled.", paymentMethod: "paypal" })
        }
      />
      <div className="stripe-test-hint">
        Use your PayPal sandbox account to test. Sandbox buyer accounts are available in your PayPal Developer dashboard.
      </div>
    </div>
  );
};

export default PayPalForm;
