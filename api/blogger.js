const axios = require('axios');

module.exports = async (request, response) => {
  const { blogId, category, maxResults } = request.query;

  if (!blogId) {
    return response.status(400).json({ error: 'Blog ID is required' });
  }

  const categoryFilter = (category && category !== 'All Posts') ? `/-/${category}` : '';
  const bloggerApiUrl = `https://www.blogger.com/feeds/${blogId}/posts/default${categoryFilter}?alt=json&max-results=${maxResults || 7}`;

  try {
    const axiosResponse = await axios.get(bloggerApiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return response.status(200).json(axiosResponse.data);

  } catch (error) {
    return response.status(500).json({ 
        error: 'Failed to fetch from Blogger API',
        details: error.message 
    });
  }
};