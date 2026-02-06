const gplayRaw = require('google-play-scraper');
const gplay = gplayRaw.default || gplayRaw;
require('dotenv').config();

// 启用全局代理
if (process.env.HTTP_PROXY) {
    const globalAgent = require('global-agent');
    process.env.GLOBAL_AGENT_HTTP_PROXY = process.env.HTTP_PROXY;
    globalAgent.bootstrap();
    console.log(`[INFO] 全局代理已启用: ${process.env.GLOBAL_AGENT_HTTP_PROXY}`);
}

async function testGplay() {
    const appId = 'ng.com.fairmoney.fairmoney';
    const country = 'ng';
    
    console.log(`Testing gplay.reviews for ${appId} in ${country}...`);
    
    try {
        const results = await gplay.reviews({
            appId: appId,
            country: country,
            sort: 2, // NEWEST
            num: 10
        });
        
        console.log('Result type:', typeof results, 'Is array:', Array.isArray(results));
        console.log('Result keys:', Object.keys(results));
        if (results.data) console.log('results.data exists, length:', results.data.length);
        const reviews = Array.isArray(results) ? results : (results.data || []);
        console.log('Success! Count:', reviews.length);
        if (reviews.length > 0) {
            console.log('First review full keys:', Object.keys(reviews[0]));
            console.log('First review userName:', reviews[0].userName);
            console.log('First review user:', reviews[0].user);
            console.log('First review text:', reviews[0].text.substring(0, 50));
        }
    } catch (err) {
        console.error('Failed!');
        console.error('Error Message:', err.message);
        if (err.response) {
            console.error('Response Status:', err.response.statusCode);
            console.error('Response Body:', err.response.body);
        }
    }
}

testGplay();
