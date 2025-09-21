// Vercel Serverless Function
export default async function handler(request, response) {
  const { blogId, category, maxResults } = request.query;

  if (!blogId) {
    return response.status(400).json({ error: 'Blog ID is required' });
  }

  const categoryFilter = (category && category !== 'All Posts') ? `/-/${encodeURIComponent(category)}` : '';
  const bloggerApiUrl = `https://www.blogger.com/feeds/${blogId}/posts/default${categoryFilter}?alt=json&max-results=${maxResults || 7}`;

  try {
    const fetchResponse = await fetch(bloggerApiUrl);
    if (!fetchResponse.ok) {
      throw new Error(`Blogger API failed with status: ${fetchResponse.status}`);
    }
    const data = await fetchResponse.json();
    
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return response.status(200).json(data);

  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}