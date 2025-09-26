const admin = require('firebase-admin');
const axios = require('axios'); // এটি error report করার জন্য

// Vercel Environment Variables থেকে আপনার কী লোড করা হচ্ছে
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }
} catch (error) {
  console.error('Firebase admin initialization error', error);
}

module.exports = async (request, response) => {
  // CORS হেডার (যাতে আপনার অ্যাডমিন প্যানেল থেকে অ্যাক্সেস করা যায়)
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { title, message, icon } = request.body;

  if (!title || !message) {
    return response.status(400).json({ error: 'Title and message are required.' });
  }

  try {
    const db = admin.database();
    const tokensSnapshot = await db.ref('fcm_tokens').once('value');
    
    if (!tokensSnapshot.exists()) {
      return response.status(200).json({ success: true, message: 'No subscribed users to notify.' });
    }

    const tokens = Object.keys(tokensSnapshot.val());

    const payload = {
      notification: {
        title: title,
        body: message,
        icon: icon || 'https://c7tvbdapp.web.app/icon-192.png', // ডিফল্ট আইকন
      }
    };

    const messagingResponse = await admin.messaging().sendToDevice(tokens, payload);
    
    // ডাটাবেসে নোটিফিকেশনটি সেভ করা (আপনার পুরনো ইন-অ্যাপ সিস্টেমের জন্য)
    const notificationForDB = { title, message, icon, timestamp: admin.database.ServerValue.TIMESTAMP };
    await db.ref('notifications').push(notificationForDB);

    return response.status(200).json({ success: true, response: messagingResponse });

  } catch (error) {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, {
        content: `Error sending notification: ${error.message}`
    });
    return response.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
};