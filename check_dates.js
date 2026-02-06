const gplayRaw = require('google-play-scraper');
const gplay = gplayRaw.default || gplayRaw;

// Enable proxy
const globalAgent = require('global-agent');
process.env.GLOBAL_AGENT_HTTP_PROXY = 'http://127.0.0.1:7890';
globalAgent.bootstrap();

async function testDates() {
    const appId = 'com.rapido.credito.cash.rttsa';
    const country = 'mx';
    const lang = 'es';

    try {
        console.log(`Fetching reviews for ${appId} in ${country} to check dates...`);
        const result = await gplay.reviews({
            appId: appId,
            country: country,
            lang: lang,
            sort: 2, // NEWEST
            num: 20
        });

        const reviews = Array.isArray(result) ? result : (result.data || []);
        console.log(`Found ${reviews.length} reviews.`);
        
        const now = new Date();
        console.log(`Current Date: ${now.toISOString()}`);

        reviews.forEach((r, i) => {
            const rDate = new Date(r.date);
            const diffDays = Math.floor((now - rDate) / (1000 * 60 * 60 * 24));
            console.log(`[${i+1}] Date: ${r.date} (${diffDays} days ago), Score: ${r.score}, User: ${r.userName}`);
        });

    } catch (e) {
        console.error('Test failed:', e.message);
    }
}

testDates();
