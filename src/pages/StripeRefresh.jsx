import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../firebase"; // apni firebase config path adjust karlena

const StripeRefresh = () => {
    const [retrying, setRetrying] = useState(false);
    const [error, setError] = useState("");
    const [uid, setUid] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUid(currentUser ? currentUser.uid : null);
        });
        return () => unsubscribe();
    }, []);

    const handleRetry = async () => {
        setRetrying(true);
        setError("");
        try {
            const connectStripeAccount = httpsCallable(functions, "connectStripeAccount");
            const result = await connectStripeAccount({ affiliateId: uid });

            const url = result?.data?.onboardingUrl;
            if (url) {
                window.location.href = url;
            } else {
                setError("Could not generate a new onboarding link. Please try again.");
            }
        } catch (err) {
            console.error("Retry Stripe onboarding failed:", err);
            setError(err?.message || "Something went wrong. Please try again.");
        } finally {
            setRetrying(false);
        }
    };

    return (
        <div style={styles.wrapper}>
            <div style={styles.card}>
                <div style={styles.iconCircle}>
                    <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#a11"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="13" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>

                <h1 style={styles.title}>Onboarding not completed</h1>
                <p style={styles.text}>
                    Your Stripe onboarding link expired or was closed before finishing.
                </p>
                <p style={styles.subtext}>
                    No worries — you can start again from here.
                </p>

                {error && <p style={styles.errorText}>{error}</p>}

                <button
                    style={{ ...styles.btn, opacity: retrying ? 0.6 : 1 }}
                    onClick={handleRetry}
                    disabled={retrying}
                >
                    {retrying ? "Generating new link..." : "Restart Stripe onboarding"}
                </button>
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
        background: "#f7d1d1",
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
        margin: "0 0 24px",
    },
    errorText: {
        fontSize: "13px",
        color: "#a11",
        margin: "0 0 16px",
    },
    btn: {
        padding: "10px 20px",
        borderRadius: "8px",
        border: "none",
        background: "#635bff",
        color: "#fff",
        fontSize: "14px",
        fontWeight: 500,
        cursor: "pointer",
        width: "100%",
    },
};

export default StripeRefresh;