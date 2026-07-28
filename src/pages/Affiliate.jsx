import React, { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { db, auth, functions } from '../firebase' // functions bhi export hona chahiye firebase config se

const Affiliate = () => {
    const [affiliate, setAffiliate] = useState(null)
    const [requestingPayout, setRequestingPayout] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [connecting, setConnecting] = useState(false)

    useEffect(() => {
        // onAuthStateChanged Firebase ke user ready hone ka wait karta hai
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
                console.error("Error fetching affiliate:", err)
                setError("Failed to load affiliate")
            } finally {
                setLoading(false)
            }
        })

        return () => unsubscribe()
    }, [])

    // Stripe connect action
    const handleConnectStripe = async () => {
        setConnecting(true)
        try {
            const connectStripeAccount = httpsCallable(functions, "connectStripeAccount")
            const result = await connectStripeAccount({ affiliateId: affiliate?.id })

            // Callable function se onboarding URL milta hai to redirect kar do
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

    // TODO: Payouts enable/disable ka actual action yahan wire karna
    // const handleTogglePayouts = () => {
    //     console.log("Toggle payouts clicked", affiliate?.id)
    // }
    // Payout request action
    const handleRequestPayout = async () => {
        setRequestingPayout(true)
        try {
            const requestAffiliatePayout = httpsCallable(functions, "requestAffiliatePayout")
            const result = await requestAffiliatePayout()
            // const result = await requestAffiliatePayout({ affiliateId: affiliate?.id })

            const data = result?.data
            if (data?.success) {
                alert(data?.message || "Payout requested successfully")
                // local state update taake button dobara na chale
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

    return (
        <div style={{ padding: '20px', maxWidth: '480px' }}>
            <h2 style={{ marginBottom: '16px' }}>My Affiliate Dashboard</h2>

            <div style={cardStyle}>
                <Row label="Name" value={affiliate.name || '-'} />
                <Row label="Email" value={affiliate.email || '-'} />
                <Row
                    label="Status"
                    value={
                        <span style={{
                            padding: '2px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            background: affiliate.status === 'active' ? '#d1f7d1' : '#f7d1d1',
                            color: affiliate.status === 'active' ? '#137a13' : '#a11',
                        }}>
                            {affiliate.status || '-'}
                        </span>
                    }
                />
                <Row label="Total Clicks" value={affiliate.totalClicks ?? 0} />
                <Row label="Total Referrals" value={affiliate.totalReferrals ?? 0} />
                <Row label="Total Earned" value={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                            // padding: '2px 10px',
                            borderRadius: '12px',
                        }}>
                            ${Number(affiliate.totalEarned ?? 0).toFixed(2)}
                        </span>
                        {payoutsEnabled && (
                            <button
                                style={{
                                    ...btnPrimary,
                                    opacity: (requestingPayout) ? 0.5 : 1,
                                    cursor: (requestingPayout) ? 'not-allowed' : 'pointer',
                                }}
                                onClick={handleRequestPayout}
                                disabled={requestingPayout}
                            >
                                {requestingPayout ? 'Requesting...' : 'Request Payout'}
                            </button>
                        )}
                    </div>

                } />
                <Row label="Paid Balance" value={`$${Number(affiliate.paidBalance ?? 0).toFixed(2)}`} />

                {/* Stripe Connected row + button */}
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

                {/* Payouts Enabled row + button */}
                <Row
                    label="Payouts Enabled"
                    value={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                                padding: '2px 10px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                background: payoutsEnabled ? '#d1f7d1' : '#f7d1d1',
                                color: payoutsEnabled ? '#137a13' : '#a11',
                            }}>
                                {payoutsEnabled ? 'Yes' : 'No'}
                            </span>

                        </div>
                    }
                />
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

const btnDanger = {
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid #f7d1d1',
    background: '#fff',
    color: '#a11',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
}

export default Affiliate
