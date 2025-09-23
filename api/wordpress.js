const axios = require('axios');

// WordPress থেকে পাওয়া ডেটাকে আমাদের অ্যাপের ফরম্যাটে সাজানোর জন্য একটি হেল্পার ফাংশন
const formatPost = (post) => {
    let imageUrl = '/icon-192.png'; // ডিফল্ট ইমেজ
    // পোস্টের সাথে সংযুক্ত ফিচারড ইমেজ (thumbnail) আছে কিনা তা চেক করা
    if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
        imageUrl = post._embedded['wp:featuredmedia'][0].source_url;
    }

    return {
        id: post.id,
        title: post.title.rendered,
        content: post.content.rendered, // .rendered ব্যবহার করে HTML কনটেন্ট পাওয়া যায়
        thumbnail: imageUrl,
        publishedDate: new Date(post.date).toLocaleDateString('bn-BD', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }),
    };
};

module.exports = async (request, response) => {
    // CORS হেডার যোগ করা (যাতে ব্রাউজার থেকে কোনো সমস্যা না হয়)
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    const { websiteUrl, category, maxResults } = request.query;

    if (!websiteUrl) {
        return response.status(400).json({ error: 'Website URL is required' });
    }

    const baseUrl = `${websiteUrl}/wp-json/wp/v2`;
    let postsUrl = `${baseUrl}/posts?_embed&per_page=${maxResults || 10}`;

    try {
        // যদি কোনো নির্দিষ্ট ক্যাটাগরির জন্য রিকোয়েস্ট আসে
        if (category && category !== 'Featured' && category !== 'All Posts') {
            // ১. প্রথমে ক্যাটাগরির নাম দিয়ে তার ID খুঁজে বের করা
            const categorySearchUrl = `${baseUrl}/categories?search=${encodeURIComponent(category)}`;
            const categoriesResponse = await axios.get(categorySearchUrl);
            
            if (categoriesResponse.data.length > 0) {
                const categoryId = categoriesResponse.data[0].id;
                // ২. সেই ID ব্যবহার করে নির্দিষ্ট ক্যাটাগরির পোস্ট খোঁজা
                postsUrl = `${baseUrl}/posts?_embed&categories=${categoryId}&per_page=${maxResults || 10}`;
            } else {
                // যদি ক্যাটাগরিটি খুঁজে না পাওয়া যায়, তবে খালি অ্যারে পাঠানো
                return response.status(200).json([]);
            }
        }

        const postsResponse = await axios.get(postsUrl);
        
        // প্রতিটি পোস্টকে আমাদের প্রয়োজনীয় ফরম্যাটে সাজিয়ে নেওয়া
        const formattedPosts = postsResponse.data.map(formatPost);
        
        return response.status(200).json(formattedPosts);

    } catch (error) {
        return response.status(500).json({
            error: 'Failed to fetch from WordPress API',
            details: error.message,
            requestedUrl: postsUrl // ডিবাগিং এর জন্য
        });
    }
};