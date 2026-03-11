import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import jsPDF from "jspdf";
import StripeForm from "./StripeForm";
import PayPalForm from "./PayPalForm";
import NoosphereLogo from "../../assets/NoosphereLogo-white.png";
import invoiceApi from "../../api/InvoiceApi";
import "./PaymentPage.css";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PK || "pk_test_placeholder");
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || "sb";

/* ── Icons ─────────────────────────────────────────────────────────────── */
const StripeIcon = () => (
  <svg viewBox="0 0 48 30" width="48" height="30" fill="none">
    <rect width="48" height="30" rx="5" fill="#635BFF" />
    <path d="M21 11.4c0-1.1.9-1.5 2.3-1.5 2.1 0 4.7.6 6.8 1.7V6.4A18 18 0 0023.1 5C19 5 16 7.3 16 11.5c0 6.4 8.8 5.4 8.8 8.1 0 1.3-1.1 1.7-2.6 1.7-2.2 0-5.2-1-7.3-2.2v5.3c2.5 1.1 5 1.5 7.3 1.5 4.5 0 7.6-2.2 7.6-6.5-.1-6.9-9-5.7-8.8-8z" fill="#fff" />
  </svg>
);

const PayPalIcon = () => (
  <svg viewBox="0 0 48 30" width="48" height="30" fill="none">
    <rect width="48" height="30" rx="5" fill="#003087" />
    <text x="6" y="20" fill="#fff" fontSize="11" fontWeight="800" fontFamily="Arial,sans-serif">Pay</text>
    <text x="21" y="20" fill="#009CDE" fontSize="11" fontWeight="800" fontFamily="Arial,sans-serif">Pal</text>
  </svg>
);

const Check = ({ size = 16, color = "#60c0a0" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M6 3l5 5-5 5" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const RefundIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 .49-3.48"/>
  </svg>
);

const BigCheck = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <circle cx="40" cy="40" r="40" fill="#ECFDF3" />
    <circle cx="40" cy="40" r="30" fill="#D1FAE5" />
    <path d="M27 40L36 49L54 29" stroke="#027A48" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CardBrands = () => (
  <div className="pp-card-brands">
    <svg viewBox="0 0 38 24" width="38" height="24"><rect width="38" height="24" rx="4" fill="#1A1F71"/><text x="6" y="17" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="Arial,sans-serif" letterSpacing="1">VISA</text></svg>
    <svg viewBox="0 0 38 24" width="38" height="24"><rect width="38" height="24" rx="4" fill="#252525"/><circle cx="15" cy="12" r="7" fill="#EB001B"/><circle cx="23" cy="12" r="7" fill="#F79E1B"/><path d="M19 7.8a7 7 0 0 1 0 8.4A7 7 0 0 1 19 7.8z" fill="#FF5F00"/></svg>
    <svg viewBox="0 0 38 24" width="38" height="24"><rect width="38" height="24" rx="4" fill="#2557D6"/><text x="5" y="16" fill="#fff" fontSize="8" fontWeight="bold" fontFamily="Arial,sans-serif">AMEX</text></svg>
    <svg viewBox="0 0 38 24" width="38" height="24"><rect width="38" height="24" rx="4" fill="#fff" stroke="#e5e7eb" strokeWidth="1"/><circle cx="26" cy="12" r="7" fill="#FF6600"/><text x="3" y="15" fill="#231F20" fontSize="5.5" fontWeight="bold" fontFamily="Arial,sans-serif">DISCOVER</text></svg>
  </div>
);

/* ── Helpers ─────────────────────────────────────────────────────────── */
const getPriceLabel = (billingFrequency, quantity) => {
  if (billingFrequency === "Monthly") return "/month";
  if (quantity === 1) return "/year";
  return `/${quantity} years`;
};

const calculateEndDate = (billingFrequency, quantity) => {
  const d = new Date();
  const qty = quantity || 1;
  if (billingFrequency === "Monthly") {
    d.setMonth(d.getMonth() + qty);
  } else {
    d.setFullYear(d.getFullYear() + qty);
  }
  return d.toISOString();
};

/* ── Plan Features Panel (shared between desktop left & mobile) ───────── */
const PlanInfo = ({ plan, invoice, currency, amount }) => {
  const features = plan.features?.length > 0
    ? plan.features.map((f) => f.name)
    : [];

  return (
    <div className="pp-left-body">
      <p className="pp-left-eyebrow">
        {invoice.tenant?.companyName
          ? `Subscribing for ${invoice.tenant.companyName}`
          : "You are subscribing to"}
      </p>
      <h2 className="pp-left-plan">{plan.name || "Subscription Plan"}</h2>

      <div className="pp-price-display">
        <span className="pp-price-currency">{currency}</span>
        <span className="pp-price-amount">{parseFloat(amount).toFixed(2)}</span>
        <span className="pp-price-per">{getPriceLabel(invoice.billingFrequency, invoice.quantity)}</span>
      </div>

      {features.length > 0 && (
        <>
          <p className="pp-features-header">What's included</p>
          <ul className="pp-features">
          {features.map((name, i) => (
            <li key={i} className="pp-feature-item">
              <span className="pp-feature-check"><Check size={14} color="#60c0a0" /></span>
              {name}
            </li>
          ))}
        </ul>
        </>
      )}
    </div>
  );
};

/* ── Component ───────────────────────────────────────────────────────── */
const PaymentPage = () => {
  const { token } = useParams();

  const [invoice, setInvoice] = useState(null);
  const [validating, setValidating] = useState(true);
  const [tokenError, setTokenError] = useState(null);
  const [recording, setRecording] = useState(false);

  const [selectedMethod, setSelectedMethod] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [paymentError, setPaymentError] = useState(null);

  useEffect(() => {
    if (!token) {
      setTokenError("No payment token provided.");
      setValidating(false);
      return;
    }
    invoiceApi.ValidatePaymentToken({ token })
      .then((res) => setInvoice(res.data))
      .catch((err) => setTokenError(err.message || "This payment link is invalid or has expired."))
      .finally(() => setValidating(false));
  }, [token]);

  const handleSuccess = async (result) => {
    setRecording(true);
    try {
      await invoiceApi.RecordPayment({
        tenantId: invoice.tenantId,
        invoiceId: invoice.id,
        planId: invoice.planId,
        billingCycle: invoice.billingFrequency === "Monthly" ? "MONTHLY" : "YEARLY",
        endDate: calculateEndDate(invoice.billingFrequency, invoice.quantity),
        transactionId: result.transactionId || "",
        transactionRef: result.transactionRef || "",
        amount: invoice.total,
        cardType: result.cardBrand || result.paymentMethod || "Unknown",
        lastFourDigits: result.last4 || "N/A",
        gatewayToken: result.token || "",
        holderName: result.name || "",
        paymentStatus: "SUCCESS",
        gateway: result.paymentMethod || "stripe",
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to record payment:", err);
    } finally {
      setRecording(false);
    }
    setPaymentResult(result);
    setPaymentError(null);
  };

  const handleError = async (error) => {
    setPaymentError(error.error || "Payment failed. Please try again.");
    try {
      await invoiceApi.RecordPayment({
        tenantId: invoice.tenantId,
        invoiceId: invoice.id,
        planId: invoice.planId,
        billingCycle: invoice.billingFrequency === "Monthly" ? "MONTHLY" : "YEARLY",
        endDate: calculateEndDate(invoice.billingFrequency, invoice.quantity),
        transactionId: error.transactionId || "",
        transactionRef: error.transactionRef || "",
        amount: invoice.total,
        cardType: error.cardType || "Unknown",
        lastFourDigits: error.last4 || "N/A",
        gatewayToken: error.token || "",
        holderName: error.name || "",
        paymentStatus: "FAILED",
        gateway: error.paymentMethod || selectedMethod || "unknown",
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to record payment failure:", err);
    }
  };

  /* ── Loading ──────────────────────────────────────────────────────── */
  if (validating || recording) {
    return (
      <div className="pp-page" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#fff" }}>
          <div className="payment-btn-spinner" style={{ margin: "0 auto 16px", borderTopColor: "#60a5fa", borderColor: "rgba(255,255,255,0.2)" }} />
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)" }}>
            {recording ? "Recording payment…" : "Validating payment link…"}
          </p>
        </div>
      </div>
    );
  }

  /* ── Token Error ──────────────────────────────────────────────────── */
  if (tokenError || !invoice) {
    return (
      <div className="pp-page" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 440, padding: "0 24px" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>⏰</div>
          <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: "0 0 12px" }}>
            This payment link has expired
          </h2>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 1.8, margin: "0 0 20px" }}>
            Think of this link like a one-time ticket — it was only valid for a limited time and can no longer be used to make a payment.
          </p>
          <div style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: "16px 20px",
            textAlign: "left",
          }}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>What to do next</p>
            {[
              "Contact the person or company who sent you this link.",
              "Ask them to send you a fresh payment link.",
              "Once you receive the new link, open it and complete your payment.",
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < 2 ? 10 : 0, alignItems: "flex-start" }}>
                <span style={{ minWidth: 22, height: 22, borderRadius: "50%", background: "#1E90FF", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 1.5 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Derived values ───────────────────────────────────────────────── */
  const plan = invoice.plan || {};
  const amount = invoice.total ?? plan.pricePerMonth?.price ?? 0;
  const currency = plan.pricePerMonth?.currency || "USD";
  const planName = plan.name || "Subscription Plan";
  const tenantId = invoice.tenantId;
  const panelColor = plan.colourCode || "#1e3a8a";
  const payerEmail = invoice.tenant?.email || invoice.email || "";

  /* ── Receipt PDF download ─────────────────────────────────────────── */
  const downloadReceipt = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    let y = 48;

    // Header bar
    doc.setFillColor(30, 144, 255);
    doc.rect(0, 0, pw, 80, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Receipt", 40, 50);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Noosphere", pw - 40, 50, { align: "right" });

    y = 110;

    // Title
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Transaction Summary", 40, y);
    y += 24;

    // Divider
    doc.setDrawColor(220, 220, 220);
    doc.line(40, y, pw - 40, y);
    y += 20;

    const rows = [
      ["Status",         paymentResult.status || "SUCCESS"],
      ["Transaction ID", paymentResult.transactionId || "—"],
      ["Reference",      paymentResult.transactionRef || "—"],
      ...(paymentResult.last4 ? [["Card", `•••• •••• •••• ${paymentResult.last4}`]] : []),
      ["Name",           paymentResult.name || "—"],
      ["Company",        invoice.tenant?.companyName || "—"],
      ["Plan",           planName],
      ["Billing",        `${invoice.billingFrequency}${invoice.quantity > 1 ? ` × ${invoice.quantity}` : ""}`],
      ["Payment Method", paymentResult.paymentMethod || "—"],
      ["Amount Charged", `${currency} ${parseFloat(amount).toFixed(2)}`],
      ["Date",           new Date().toLocaleString("en-US")],
    ];

    doc.setFontSize(11);
    rows.forEach(([label, value], i) => {
      const rowY = y + i * 28;
      // alternating row background
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(40, rowY - 14, pw - 80, 24, "F");
      }
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text(label, 52, rowY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      // highlight amount and status
      if (label === "Amount Charged" || label === "Status") {
        doc.setTextColor(2, 122, 72);
        doc.setFont("helvetica", "bold");
      }
      doc.text(String(value), pw - 52, rowY, { align: "right" });
    });

    y += rows.length * 28 + 24;

    // Footer note
    doc.setDrawColor(220, 220, 220);
    doc.line(40, y, pw - 40, y);
    y += 16;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("A confirmation email has been sent to your registered address. Thank you for your payment.", 40, y);

    const safeName = (paymentResult.name || "payer").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const fileName = `receipt-${safeName}.pdf`;
    doc.save(fileName);
  };

  /* ── Success ──────────────────────────────────────────────────────── */
  if (paymentResult) {
    return (
      <div className="pp-page">
        <div className="pp-success-wrap">
          <div className="pp-success-left">
            <img src={NoosphereLogo} alt="Noosphere" className="pp-logo" />
            <BigCheck />
            <h1 className="pp-success-h1">You're all set!</h1>
            <p className="pp-success-desc">
              Your <strong>{planName}</strong> is now active. Welcome to the Noosphere family.
            </p>
            <div className="pp-success-amount">
              {currency} {parseFloat(amount).toFixed(2)} <span>charged</span>
            </div>
          </div>
          <div className="pp-success-right">
            <p className="pp-receipt-title">Payment Receipt</p>
            <div className="pp-receipt">
              {[
                { label: "Status",         value: paymentResult.status,         accent: true },
                { label: "Transaction ID", value: paymentResult.transactionId,  mono: true },
                { label: "Reference",      value: paymentResult.transactionRef, mono: true },
                ...(paymentResult.last4 ? [{ label: "Card", value: `•••• •••• •••• ${paymentResult.last4}` }] : []),
                { label: "Name",           value: paymentResult.name },
                { label: "Company",        value: invoice.tenant?.companyName },
                { label: "Plan",           value: planName },
                { label: "Billing",        value: `${invoice.billingFrequency}${invoice.quantity > 1 ? ` × ${invoice.quantity}` : ""}` },
                { label: "Method",         value: paymentResult.paymentMethod,  cap: true },
                { label: "Amount",         value: `${currency} ${parseFloat(amount).toFixed(2)}` },
              ].map(({ label, value, accent, mono, cap }) => value ? (
                <div className="pp-receipt-row" key={label}>
                  <span className="pp-receipt-label">{label}</span>
                  <span className={`pp-receipt-val${accent ? " pp-green" : ""}${mono ? " pp-mono" : ""}${cap ? " pp-cap" : ""}`}>{value}</span>
                </div>
              ) : null)}
            </div>
            <p className="pp-receipt-note">A confirmation email has been sent to your registered address.</p>
            <button className="pp-download-btn" onClick={downloadReceipt}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download Receipt
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main ─────────────────────────────────────────────────────────── */
  return (
    <div className="pp-page">
      <div className="pp-shell">

        {/* ── Left panel (desktop) ─────────────────────────────────────── */}
        <div className="pp-left" style={{ background: `linear-gradient(155deg, ${panelColor} 0%, ${panelColor}cc 100%)` }}>
          <div className="pp-blob pp-blob-1" />
          <div className="pp-blob pp-blob-2" />
          <div className="pp-blob pp-blob-3" />
          <div className="pp-left-inner">
            <img src={NoosphereLogo} alt="Noosphere" className="pp-logo" />
            <PlanInfo plan={plan} invoice={invoice} currency={currency} amount={amount} />
          </div>
        </div>

        {/* ── Right panel ─────────────────────────────────────────────── */}
        <div className="pp-right">

          {/* mobile-only hero */}
          <div className="pp-mobile-hero" style={{ background: `linear-gradient(155deg, ${panelColor} 0%, ${panelColor}cc 100%)` }}>
            <div className="pp-mobile-hero-blob pp-mobile-hero-blob-1" />
            <div className="pp-mobile-hero-blob pp-mobile-hero-blob-2" />
            <div className="pp-mobile-hero-inner">
              <img src={NoosphereLogo} alt="Noosphere" className="pp-logo" />
              <div className="pp-mobile-hero-body">
                <p className="pp-mobile-hero-eyebrow">
                  {invoice.tenant?.companyName
                    ? `Subscribing for ${invoice.tenant.companyName}`
                    : "You are subscribing to"}
                </p>
                <h2 className="pp-mobile-hero-plan">{planName}</h2>
                <div className="pp-mobile-hero-price">
                  <span className="pp-mobile-hero-currency">{currency}</span>
                  <span className="pp-mobile-hero-amount">{parseFloat(amount).toFixed(2)}</span>
                  <span className="pp-mobile-hero-per">{getPriceLabel(invoice.billingFrequency, invoice.quantity)}</span>
                </div>
              </div>
              {plan.features?.length > 0 && (
                <div className="pp-mobile-hero-features">
                  <p className="pp-mobile-hero-features-label">What's included</p>
                  <ul className="pp-mobile-features">
                    {plan.features.map((f) => (
                      <li key={f.id} className="pp-mobile-feature-item">
                        <span className="pp-mobile-feature-check">
                          <Check size={11} color="#60c0a0" />
                        </span>
                        {f.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="pp-right-inner">

            {/* ── Header ────────────────────────────────────────────── */}
            <div className="pp-right-head">
              <div className="pp-secure-pill">
                <LockIcon /> SSL Secured
              </div>
              <h1 className="pp-right-title">
                {selectedMethod === "stripe"  ? "Card Details" :
                 selectedMethod === "paypal"  ? "Pay with PayPal" :
                 "Secure Checkout"}
              </h1>
              <p className="pp-right-sub">
                {selectedMethod
                  ? `Completing payment for ${planName}`
                  : "Choose how you'd like to pay. All transactions are encrypted."}
              </p>
            </div>

            {/* ── Amount summary pill ───────────────────────────────── */}
            {!selectedMethod && (
              <div className="pp-amount-pill">
                <div className="pp-amount-pill-left">
                  <span className="pp-amount-pill-label">Due today</span>
                  <span className="pp-amount-pill-plan">{planName}</span>
                </div>
                <span className="pp-amount-pill-value">{currency} {parseFloat(amount).toFixed(2)}</span>
              </div>
            )}

            {/* ── Method selector ───────────────────────────────────── */}
            {!selectedMethod && (
              <div className="pp-methods">
                <p className="pp-methods-header">Payment method</p>

                <button className="pp-method-card" onClick={() => setSelectedMethod("stripe")}>
                  <div className="pp-method-card-inner">
                    <div className="pp-method-icon-wrap pp-method-icon-stripe">
                      <StripeIcon />
                    </div>
                    <div className="pp-method-info">
                      <span className="pp-method-name">Credit / Debit Card</span>
                      <span className="pp-method-hint">Visa, Mastercard, Amex, Discover</span>
                      <CardBrands />
                    </div>
                    <div className="pp-method-right">
                      <span className="pp-method-popular">Popular</span>
                      <ArrowRight />
                    </div>
                  </div>
                </button>

                <button className="pp-method-card pp-method-card--paypal" onClick={() => setSelectedMethod("paypal")}>
                  <div className="pp-method-card-inner">
                    <div className="pp-method-icon-wrap pp-method-icon-paypal">
                      <PayPalIcon />
                    </div>
                    <div className="pp-method-info">
                      <span className="pp-method-name">PayPal</span>
                      <span className="pp-method-hint">Pay quickly using your PayPal account</span>
                    </div>
                    <div className="pp-method-right">
                      <ArrowRight />
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* ── Forms ─────────────────────────────────────────────── */}
            {selectedMethod === "stripe" && (
              <div className="pp-form-card">
                <Elements stripe={stripePromise}>
                  <StripeForm amount={amount} currency={currency} tenantId={tenantId} email={payerEmail} onSuccess={handleSuccess} onError={handleError} />
                </Elements>
              </div>
            )}

            {selectedMethod === "paypal" && (
              <div className="pp-form-card">
                <PayPalScriptProvider options={{ "client-id": PAYPAL_CLIENT_ID, currency: currency || "USD" }}>
                  <PayPalForm amount={amount} currency={currency} tenantId={tenantId} email={payerEmail} onSuccess={handleSuccess} onError={handleError} />
                </PayPalScriptProvider>
              </div>
            )}

            {selectedMethod && (
              <button className="pp-back" onClick={() => { setSelectedMethod(null); setPaymentError(null); }}>
                ← Back to payment methods
              </button>
            )}

            {paymentError && <div className="pp-error">{paymentError}</div>}

            {/* ── Trust row ─────────────────────────────────────────── */}
            <div className="pp-trust-row">
              <span><LockIcon /> 256-bit SSL</span>
              <span><ShieldIcon /> PCI Compliant</span>
              <span><RefundIcon /> Secure payment</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default PaymentPage;
