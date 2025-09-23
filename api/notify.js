// <<--- notify.js এর সম্পূর্ণ কোড ---<<
const admin = require('firebase-admin');

// Firebase Admin SDK আরম্ভ করা
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
      databaseURL: "https://c7tvbdapp-default-rtdb.asia-southeast1.firebasedatabase.app"
    });
  }
} catch (error) {
  console.error('Firebase admin initialization error', error);
}

module.exports = async (request, response) => {
    // CORS হেডার যোগ করা
    response.setHeader('Access-Control-Allow-Origin', '*'); // এখানে আপনার অ্যাডমিন প্যানেলের ডোমেইনও দিতে পারেন
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }
    
    // শুধুমাত্র POST রিকোয়েস্ট গ্রহণ করা হবে
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { title, message, icon, actionUrl } = request.body;

    if (!title || !message) {
        return response.status(400).json({ error: 'Title and message are required' });
    }

    const db = admin.database();
    const tokensRef = db.ref('fcm_tokens');
    
    try {
        const snapshot = await tokensRef.once('value');
        const tokensObject = snapshot.val();

        if (!tokensObject) {
            return response.status(200).json({ success: true, message: 'No registered devices to notify.' });
        }

        const tokens = Object.keys(tokensObject);

        const payload = {
            notification: {
                title: title,
                body: message,
                icon: icon || '/icon-192.png'
            },
            webpush: {
                fcm_options: {
                    link: actionUrl || 'https://c7tvbdapp.web.app' // ডিফল্ট লিঙ্ক
                }
            }
        };

        const messagingResponse = await admin.messaging().sendToDevice(tokens, payload);
        
        console.log('Successfully sent message:', messagingResponse);
        return response.status(200).json({ success: true, results: messagingResponse.results });

    } catch (error) {
        console.error('Error sending notification:', error);
        return response.status(500).json({ error: 'Failed to send notification', details: error.message });
    }
};