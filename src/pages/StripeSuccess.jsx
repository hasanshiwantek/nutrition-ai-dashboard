import React from "react";

const StripeSuccess = () => {
    return (
        <div style={styles.wrapper}>
            <div style={styles.card}>
                <div style={styles.iconCircle}>
                    <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#137a13"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M20 6 9 17l-5-5" />
                    </svg>
                </div>

                <h1 style={styles.title}>Stripe onboarding completed</h1>
                <p style={styles.text}>We're verifying your account.</p>
                <p style={styles.subtext}>You may close this page.</p>
            </div>
        </div>
    );
};

const styles = {
    wrapper: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f6f7f9",
        padding: "20px",
    },
    card: {
        background: "#fff",
        borderRadius: "16px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        padding: "40px 32px",
        maxWidth: "420px",
        width: "100%",
        textAlign: "center",
    },
    iconCircle: {
        width: "72px",
        height: "72px",
        borderRadius: "50%",
        background: "#d1f7d1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 24px",
    },
    title: {
        fontSize: "20px",
        fontWeight: 600,
        color: "#1a1a1a",
        margin: "0 0 12px",
    },
    text: {
        fontSize: "15px",
        color: "#444",
        margin: "0 0 6px",
    },
    subtext: {
        fontSize: "14px",
        color: "#888",
        margin: 0,
    },
};

export default StripeSuccess;