// hooks/useAuthGuard.js
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, getIdTokenResult, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { logoutManual } from "../store/authSlice"; // adjust path

export const useAuthGuard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        let expiryTimer = null;

        const doLogout = async () => {
            if (expiryTimer) clearTimeout(expiryTimer);
            try {
                await signOut(auth);
            } catch (_) { }
            dispatch(logoutManual());
            navigate("/");
        };

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            // No user — session ended
            if (!user) {
                dispatch(logoutManual());
                navigate("/");
                return;
            }

            try {
                const tokenResult = await getIdTokenResult(user);
                const expiresAt = new Date(tokenResult.expirationTime).getTime();
                const msLeft = expiresAt - Date.now();

                if (msLeft <= 0) {
                    // Already expired
                    await doLogout();
                    return;
                }

                // Schedule logout at exact expiry (Firebase tokens = 1hr)
                expiryTimer = setTimeout(doLogout, msLeft);

            } catch (err) {
                console.error("[useAuthGuard] token check error:", err);
                await doLogout();
            }
        });

        // Cleanup on unmount
        return () => {
            unsubscribe();
            if (expiryTimer) clearTimeout(expiryTimer);
        };
    }, []); // ← empty deps, runs once on mount
};