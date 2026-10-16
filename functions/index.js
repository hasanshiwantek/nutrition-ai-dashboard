const { onCall, HttpsError } = require("firebase-functions/v2/https"); // ✅ Gen 2

exports.setMyAdminClaim = onCall(
  { region: "us-central1", cors: false },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Login required.");

    // ⚠️ Sirf ek baar use karo, phir delete karo yeh function
    await admin.auth().setCustomUserClaims(uid, { role: "admin" });
    return { success: true, uid };
  },
); // functions/index.js
exports.registerUserAsAffiliate = onCall(
  {
    region: "us-central1",
    cors: true, // or ["http://localhost:5173"]
  },
  async (request) => {
    const { userId } = request.data || {};
    if (!userId) {
      throw new HttpsError("invalid-argument", "userId is required");
    }

    // your logic here

    return { success: true };
  },
);
