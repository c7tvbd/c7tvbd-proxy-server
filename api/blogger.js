const axios = require('axios');

module.exports = async (request, response) => {
  // CORS হেডার যোগ করা (এই অংশটিই মূল সমাধান)
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  // OPTIONS রিকোয়েস্ট হ্যান্ডেল করা (ব্রাউজার প্রথমে এটি পাঠায়)
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  const { blogId, category, maxResults } = request.query;

  if (!blogId) {
    return response.status(400).json({ error: 'Blog ID is required' });
  }

  const categoryFilter = (category && category !== 'Featured' && category !== 'All Posts') ? `/-/${encodeURIComponent(category)}` : '';
  const bloggerApiUrl = `https://www.blogger.com/feeds/${blogId}/posts/default${categoryFilter}?alt=json&max-results=${maxResults || 7}`;

  try {
    const axiosResponse = await axios.get(bloggerApiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    return response.status(200).json(axiosResponse.data);

  } catch (error) {
    return response.status(500).json({ 
        error: 'Failed to fetch from Blogger API',
        details: error.message 
    });
  }
};