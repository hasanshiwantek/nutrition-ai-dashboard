const { onCall, HttpsError } = require("firebase-functions/v2/https"); // ✅ Gen 2

exports.setMyAdminClaim = onCall(
    { region: "us-central1", cors: false },
    async (request) => {
        const uid = request.auth?.uid;
        if (!uid) throw new HttpsError("unauthenticated", "Login required.");

        // ⚠️ Sirf ek baar use karo, phir delete karo yeh function
        await admin.auth().setCustomUserClaims(uid, { role: "admin" });
        return { success: true, uid };
    }
);