// <<--- notify.js এর চূড়ান্ত এবং ১০০% সঠিক কোড ---<<
const admin = require('firebase-admin');

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      // <<--- মূল পরিবর্তনটি এই লাইনে ---<<
      // process.env.FIREBASE_SERVICE_ACCOUNT_KEY একটি টেক্সট, সেটিকে JSON.parse দিয়ে অবজেক্ট বানানো হচ্ছে
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
      databaseURL: "https://c7tvbdapp-default-rtdb.asia-southeast1.firebasedatabase.app"
    });
  }
} catch (error) { console.error('Firebase admin initialization error', error); }

module.exports = async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    if (request.method === 'OPTIONS') { return response.status(200).end(); }
    if (request.method !== 'POST') { return response.status(405).json({ error: 'Method Not Allowed' }); }

    const { title, message, icon, action } = request.body;

    if (!title || !message) { return response.status(400).json({ error: 'Title and message are required' }); }

    const db = admin.database();
    const tokensRef = db.ref('fcm_tokens');
    
    try {
        const snapshot = await tokensRef.once('value');
        const tokensObject = snapshot.val();
        if (!tokensObject) { return response.status(200).json({ success: true, message: 'No devices to notify.' }); }

        const tokens = Object.keys(tokensObject);
        
        let clickUrl = 'https://c7tvbdapp.web.app';
        if (action === 'live') {
            clickUrl = 'https://c7tvbdapp.web.app/#live';
        } else if (action === 'news') {
            clickUrl = 'https://c7tvbdapp.web.app/#news';
        }

        const payload = {
            notification: {
                title: title,
                body: message,
                icon: icon || '/icon-192.png'
            },
            data: {
                url: clickUrl
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