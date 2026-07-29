import React, { useEffect, useState, useCallback } from 'react'
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { db, auth, functions } from '../firebase'

const Affiliate = () => {
    const [affiliate, setAffiliate] = useState(null)
    const [requestingPayout, setRequestingPayout] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [connecting, setConnecting] = useState(false)

    // Referrals state
    const [referrals, setReferrals] = useState([])
    const [referralsLoading, setReferralsLoading] = useState(false)
    const [referralsError, setReferralsError] = useState(null)

    // Fetch affiliate data
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                setError("Not logged in")
                setLoading(false)
                return
            }

            try {
                const ref = doc(db, "affiliates", currentUser.uid)
                const snap = await getDoc(ref)

                if (snap.exists()) {
                    setAffiliate({ id: snap.id, ...snap.data() })
                    setError('')
                } else {
                    setError("No affiliate record found for this user")
                }
            } catch (err) {
                setError("Failed to load affiliate")
            } finally {
                setLoading(false)
            }
        })

        return () => unsubscribe()
    }, [])

    // Fetch referrals (same style as your users fetch)
    const fetchReferrals = useCallback(async (affiliateId) => {
        if (!affiliateId) {
            setReferrals([])
            return
        }

        setReferralsLoading(true)
        setReferralsError(null)

        try {
            const q = query(
                collection(db, "affiliate_referrals"),
                where("affiliateId", "==", affiliateId)
                // orderBy("createdAt", "desc")
            )

            const snapshot = await getDocs(q)

            const rows = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            }))

            setReferrals(rows)
        } catch (err) {

            setReferralsError(err?.message || "Failed to load referrals")
            setReferrals([])
        } finally {
            setReferralsLoading(false)
        }
    }, [])

    // Call fetchReferrals when affiliate is loaded
    useEffect(() => {
        if (affiliate?.id) {
            fetchReferrals(affiliate.id)
        }
    }, [affiliate?.id, fetchReferrals])

    const handleConnectStripe = async () => {
        setConnecting(true)
        try {
            const connectStripeAccount = httpsCallable(functions, "connectStripeAccount")
            const result = await connectStripeAccount({ affiliateId: affiliate?.id })
            const url = result?.data?.onboardingUrl
            if (url) {
                window.location.href = url
            } else {
                console.log("connectStripeAccount response:", result?.data)
            }
        } catch (err) {
            console.error("Connect Stripe failed:", err)
            alert(err?.message || "Failed to connect Stripe account")
        } finally {
            setConnecting(false)
        }
    }

    const handleRequestPayout = async () => {
        setRequestingPayout(true)
        try {
            const requestAffiliatePayout = httpsCallable(functions, "requestAffiliatePayout")
            const result = await requestAffiliatePayout()

            const data = result?.data
            if (data?.success) {
                alert(data?.message || "Payout requested successfully")
                setAffiliate((prev) => ({ ...prev, canRequestPayout: false }))
            } else {
                alert(data?.message || "Payout request could not be completed")
            }
        } catch (err) {
            console.error("Request payout failed:", err)
            alert(err?.message || "Failed to request payout")
        } finally {
            setRequestingPayout(false)
        }
    }

    if (loading) {
        return <div style={{ padding: '20px' }}>Loading...</div>
    }

    if (error) {
        return <div style={{ padding: '20px', color: 'red' }}>{error}</div>
    }

    if (!affiliate) {
        return <div style={{ padding: '20px' }}>No data found.</div>
    }

    const stripeConnected = affiliate.stripe_settings?.stripeConnected
    const payoutsEnabled = affiliate.stripe_settings?.payoutsEnabled && affiliate?.canRequestPayout

    const formatDate = (timestamp) => {
        if (!timestamp) return '-'
        const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }
    const getStatusBadge = (status) => {
        const isConverted = status === 'converted'
        return (
            <span style={{
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 500,
                background: isConverted ? '#d1f7d1' : '#fef3c7',
                color: isConverted ? '#137a13' : '#92400e',
            }}>
                {status || '-'}
            </span>
        )
    }

    const getSubStatusBadge = (status) => {
        if (!status) return <span style={{ color: '#9ca3af' }}>-</span>
        const isActive = status === 'ACTIVE'
        return (
            <span style={{
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 500,
            }}>
                {status}
            </span>
        )
    }

    return (
        <div>
            {/* ===== Metric Cards ===== */}
            <div style={metricsGrid}>
                {/* Active Subscribers */}
                <div style={metricCard}>
                    <div style={metricHeader}>
                        <div style={{ ...iconCircle, background: '#f3e8ff' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="#9333ea" />
                            </svg>
                        </div>
                        <span style={metricLabel}>Active Subscribers</span>
                    </div>
                    <div style={metricValue}>{affiliate.activeSubscribers ?? 0}</div>
                    <div style={metricSub}>Active now</div>
                </div>

                {/* Total Referrals */}
                <div style={metricCard}>
                    <div style={metricHeader}>
                        <div style={{ ...iconCircle, background: '#fff7ed' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="#ea580c" />
                            </svg>
                        </div>
                        <span style={metricLabel}>Total Referrals</span>
                    </div>
                    <div style={metricValue}>{affiliate.totalReferrals ?? 0}</div>
                    <div style={metricSub}>All time</div>
                </div>

                {/* Total Earned */}
                <div style={metricCard}>
                    <div style={metricHeader}>
                        <div style={{ ...iconCircle, background: '#ecfdf5' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" fill="#16a34a" />
                            </svg>
                        </div>
                        <span style={metricLabel}>Total Earned</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={metricValue}>
                            ${Number(affiliate.totalEarned ?? 0).toFixed(2)}
                        </div>

                    </div>

                    <div style={metricSub}>↑ Lifetime earnings</div>
                </div>
                <div style={metricCard}>
                    <div style={metricHeader}>
                        <div style={{ ...iconCircle, background: '#ecfdf5' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">

                                <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="#ea580c" />

                            </svg>
                        </div>
                        <span style={metricLabel}>Available Balance</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={metricValue}>
                            ${Number(affiliate?.availableBalance ?? 0).toFixed(2)}
                        </div>

                        {payoutsEnabled && (
                            <button
                                style={{
                                    ...btnPrimary,
                                    opacity: requestingPayout ? 0.6 : 1,
                                    cursor: requestingPayout ? 'not-allowed' : 'pointer',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                }}
                                onClick={handleRequestPayout}
                                disabled={requestingPayout || Number(affiliate?.availableBalance) == 0}
                            >
                                {requestingPayout ? 'Loading...' : 'Payout'}
                            </button>
                        )}
                    </div>

                    <div style={metricSub}>Ready to withdraw</div>
                </div>

                {/* Available Balance */}
                {/* <div style={metricCard}>

                    <div style={metricHeader}>

                        <div style={{ ...iconCircle, background: '#ecfdf5' }}>

                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">

                                <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="#ea580c" />

                            </svg>

                        </div>

                        <span style={metricLabel}>Available Balance</span>

                    </div>



                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>

                        <div style={metricValue}>

                            ${Number(affiliate.availableBalance ?? 0).toFixed(2)}

                        </div>



                    </div>



                    <div style={metricSub}>Ready to withdraw</div>

                </div> */}



                {/* Paid Balance */}
                <div style={metricCard}>
                    <div style={metricHeader}>
                        <div style={{ ...iconCircle, background: '#ecfdf5' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="#16a34a" />
                            </svg>
                        </div>
                        <span style={metricLabel}>Paid Balance</span>
                    </div>
                    <div style={metricValue}>${Number(affiliate.paidBalance ?? 0).toFixed(2)}</div>
                    <div style={metricSub}>Total paid till date</div>
                </div>
            </div>

            {/* ===== Details Card ===== */}
            <div style={{ ...cardStyle, marginTop: '24px' }}>
                {affiliate.branchLink && (
                    <Row
                        label="Branch Link"
                        value={
                            <a
                                href={affiliate.branchLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all' }}
                            >
                                {affiliate.branchLink}
                            </a>
                        }
                    />
                )}

                <Row label="Affiliate Code" value={affiliate.affiliateCode || '-'} />

                <Row
                    label="Stripe Connected"
                    value={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                                padding: '2px 10px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                background: stripeConnected ? '#d1f7d1' : '#f7d1d1',
                                color: stripeConnected ? '#137a13' : '#a11',
                            }}>
                                {stripeConnected ? 'Yes' : 'No'}
                            </span>
                            {!stripeConnected && (
                                <button
                                    style={{ ...btnPrimary, opacity: connecting ? 0.6 : 1 }}
                                    onClick={handleConnectStripe}
                                    disabled={connecting}
                                >
                                    {connecting ? 'Connecting...' : 'Connect Stripe'}
                                </button>
                            )}
                        </div>
                    }
                />

                <Row
                    label="Payouts Enabled"
                    value={
                        <span style={{
                            padding: '2px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            background: affiliate.stripe_settings?.payoutsEnabled ? '#d1f7d1' : '#f7d1d1',
                            color: affiliate.stripe_settings?.payoutsEnabled ? '#137a13' : '#a11',
                        }}>
                            {affiliate.stripe_settings?.payoutsEnabled ? 'Yes' : 'No'}
                        </span>
                    }
                />
            </div>

            {/* ===== Referrals Table ===== */}
            <div style={{ ...cardStyle, marginTop: '24px', padding: '0' }}>
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                        Referrals
                    </h3>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>
                        {referrals.length} total
                    </span>
                </div>

                {referralsLoading ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                        Loading referrals...
                    </div>
                ) : referralsError ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#b91c1c' }}>
                        {referralsError}
                    </div>
                ) : referrals.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                        No referrals yet
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                                    <th style={thStyle}>User</th>
                                    <th style={thStyle}>Email</th>
                                    <th style={thStyle}>Subscription</th>
                                    <th style={thStyle}>Created</th>
                                    <th style={thStyle}>Last Commission</th>
                                </tr>
                            </thead>
                            <tbody>
                                {referrals?.map((ref) => (
                                    <tr key={ref.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: 500 }}>{ref.referredUserName || '-'}</div>
                                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                                {ref?.referredUserId?.slice(0, 8)}…
                                            </div>
                                        </td>
                                        <td style={tdStyle}>{ref.referredUserEmail || '-'}</td>
                                        <td style={tdStyle}>{getSubStatusBadge(ref.subscriptionStatus)}</td>
                                        <td style={tdStyle}>{formatDate(ref.createdAt)}</td>
                                        <td style={tdStyle}>{formatDate(ref.lastCommissionAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

const Row = ({ label, value }) => (
    <div style={rowStyle}>
        <span style={{ color: '#666', fontSize: '14px' }}>{label}</span>
        <span style={{ fontWeight: 500, fontSize: '14px' }}>{value}</span>
    </div>
)

/* ========== Styles ========== */

const metricsGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
}

const metricCard = {
    background: '#fff',
    border: '1px solid #eee',
    borderRadius: '16px',
    padding: '18px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
}

const metricHeader = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '4px',
}

const iconCircle = {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
}

const metricLabel = {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: 500,
}

const metricValue = {
    fontSize: '26px',
    fontWeight: 700,
    color: '#111827',
    letterSpacing: '-0.5px',
}

const metricSub = {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '2px',
}

const cardStyle = {
    border: '1px solid #eee',
    borderRadius: '12px',
    padding: '8px 16px',
    background: '#fff',
}

const rowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f2f2f2',
}

const btnPrimary = {
    padding: '6px 14px',
    borderRadius: '8px',
    border: 'none',
    background: '#635bff',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
}

const thStyle = {
    padding: '12px 16px',
    fontWeight: 600,
    color: '#6b7280',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
}

const tdStyle = {
    padding: '14px 16px',
    color: '#374151',
    verticalAlign: 'middle',
}

export default Affiliate