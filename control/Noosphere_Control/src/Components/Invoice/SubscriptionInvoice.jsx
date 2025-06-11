import React from "react";
import NoosphereLogo from "../../assets/NoosphereLogo-black.png";

const SubscriptionInvoice = ({
  companyAddress = {
    street: "931 10th street",
    suite: "Suite 776, Modesto",
    state: "CA 95354",
  },
  invoiceId = "INV001331",
  dueDate = "12 May 2025",
  billingFrequency = "Monthly",
  customerInfo = {
    name: "ACME Org",
    street: "24, Allison Street",
    city: "Dallas, Texas, US",
    zip: "655849",
  },
  items = [
    {
      id: "1",
      description: "Noosphere ABA PMS\n(Plan Name)",
      rate: "(Rate)",
      quantity: 1,
      price: "(Price)",
    },
  ],
  total = "(Price)",
}) => {
  const styles = {
    body: {
     
      margin: 0,
      padding: "20px",
      color: "#333",
    },
    invoiceContainer: {
      maxWidth: "600px",
      margin: "0 auto",
      background: "#fff",
      padding: "40px",
      borderRadius: "8px",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
    },
    invoiceHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "40px",
    },
    logoSection: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    logo: {
      width: "24px",
      height: "24px",
      background: "#000",
      borderRadius: "50%",
      position: "relative",
      "::before": {
        content: '""',
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "12px",
        height: "12px",
        background: "#fff",
        borderRadius: "50%",
      },
    },
    companyName: {
      fontSize: "20px",
      fontWeight: 600,
      color: "#000",
      margin: 0,
    },
    invoiceTitle: {
      fontSize: "20px",
      fontWeight: 600,
      color: "#000",
      margin: 0,
    },
    companyAddress: {
      margin: "30px 0",
      lineHeight: 1.6,
      color: "#666",
      fontSize: "14px",
    },
    invoiceMeta: {
      textAlign: "right",
      margin: "30px 0",
      fontSize: "14px",
      color: "#666",
      lineHeight: 1.6,
    },
    invoiceMetaStrong: {
      color: "#000",
    },
    customerSection: {
      margin: "40px 0",
    },
    sectionTitle: {
      fontSize: "16px",
      fontWeight: 600,
      color: "#000",
      marginBottom: "15px",
    },
    customerInfo: {
      color: "#666",
      fontSize: "14px",
      lineHeight: 1.6,
      whiteSpace: "pre-line", // Preserve line breaks
    },
    invoiceTable: {
      width: "100%",
      borderCollapse: "collapse",
      margin: "40px 0",
    },
    invoiceTableTh: {
      background: "none",
      border: "none",
      borderBottom: "1px solid #e5e5e5",
      padding: "15px 0",
      textAlign: "left",
      fontSize: "14px",
      fontWeight: 600,
      color: "#000",
    },
    invoiceTableThLast: {
      textAlign: "right",
    },
    invoiceTableTd: {
      border: "none",
      padding: "20px 0",
      fontSize: "14px",
      color: "#666",
      verticalAlign: "top",
    },
    invoiceTableTdLast: {
      textAlign: "right",
    },
    invoiceTableTbodyTr: {
      borderBottom: "1px solid #f5f5f5",
    },
    totalRow: {
      borderTop: "1px solid #e5e5e5",
      borderBottom: "none",
    },
    totalRowTd: {
      paddingTop: "20px",
      fontWeight: 600,
      color: "#000",
    },
    placeholder: {
      color: "#999",
      fontStyle: "italic",
    },
  };

  return (
    <div style={styles.body}>
      <div style={styles.invoiceContainer}>
        <div style={styles.invoiceHeader}>
          <div style={styles.logoSection}>
            <img
              src={NoosphereLogo}
              alt="Noosphere Logo"
              className="logo-image"
            />
          </div>
          <h1 style={styles.invoiceTitle}>Subscription Invoice</h1>
        </div>

        <div style={styles.companyAddress}>
          {companyAddress.street}
          <br />
          {companyAddress.suite}
          <br />
          {companyAddress.state}
        </div>

        <div style={styles.invoiceMeta}>
          <strong style={styles.invoiceMetaStrong}>Invoice ID:</strong>{" "}
          {invoiceId}
          <br />
          <strong style={styles.invoiceMetaStrong}>Due Date:</strong> {dueDate}
          <br />
          <strong style={styles.invoiceMetaStrong}>
            Billing Frequency:
          </strong>{" "}
          {billingFrequency}
        </div>

        <div style={styles.customerSection}>
          <div style={styles.sectionTitle}>Customer Information</div>
          <div style={styles.customerInfo}>
            {customerInfo.name}
            <br />
            {customerInfo.street}
            <br />
            {customerInfo.city}
            <br />
            {customerInfo.zip}
          </div>
        </div>

        <table style={styles.invoiceTable}>
          <thead>
            <tr>
              <th style={styles.invoiceTableTh}>Item</th>
              <th style={styles.invoiceTableTh}>Description</th>
              <th style={styles.invoiceTableTh}>Rate</th>
              <th style={styles.invoiceTableTh}>Quantity</th>
              <th
                style={{
                  ...styles.invoiceTableTh,
                  ...styles.invoiceTableThLast,
                }}
              >
                Price
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} style={styles.invoiceTableTbodyTr}>
                <td style={styles.invoiceTableTd}>{item.id}</td>
                <td style={styles.invoiceTableTd}>{item.description}</td>
                <td
                  style={{
                    ...styles.invoiceTableTd,
                    ...(item.rate.startsWith("(") ? styles.placeholder : {}),
                  }}
                >
                  {item.rate}
                </td>
                <td style={styles.invoiceTableTd}>{item.quantity}</td>
                <td
                  style={{
                    ...styles.invoiceTableTd,
                    ...styles.invoiceTableTdLast,
                    ...(item.price.startsWith("(") ? styles.placeholder : {}),
                  }}
                >
                  {item.price}
                </td>
              </tr>
            ))}
            <tr style={styles.totalRow}>
              <td colSpan="4" style={styles.totalRowTd}>
                Total:
              </td>
              <td
                style={{
                  ...styles.totalRowTd,
                  ...styles.invoiceTableTdLast,
                  ...(total.startsWith("(") ? styles.placeholder : {}),
                }}
              >
                {total}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SubscriptionInvoice;
