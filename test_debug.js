
const gplayRaw = require('google-play-scraper');
const gplay = gplayRaw.default || gplayRaw;
require('global-agent/bootstrap');

async function test() {
    // 测试 1: 直接用包名
    const realId = 'com.rapido.credito.cash.rttsa';
    // 测试 2: 用带重音符号的名称 (模拟用户手动输入)
    const nameWithAccent = 'RápidoCrédito';
    
    const country = 'mx';
    const lang = 'es';

    console.log(`\n--- Test 1: Direct Package ID (${realId}) ---`);
    try {
        const reviews = await gplay.reviews({
            appId: realId,
            country: country,
            lang: lang,
            sort: gplay.sort.NEWEST,
            num: 10
        });
        console.log(`Success! Found ${reviews.length} reviews.`);
    } catch (e) {
        console.error('Test 1 failed:', e.message);
    }

    console.log(`\n--- Test 2: Search by Name (${nameWithAccent}) ---`);
    try {
        console.log(`Searching for: ${nameWithAccent}...`);
        const searchResults = await gplay.search({
            term: nameWithAccent,
            num: 1,
            country: country,
            lang: lang
        });
        
        if (searchResults.length > 0) {
            const best = searchResults[0];
            console.log(`Found: ${best.title} (${best.appId})`);
            const reviews = await gplay.reviews({
                appId: best.appId,
                country: country,
                lang: lang,
                sort: gplay.sort.NEWEST,
                num: 10
            });
            console.log(`Success! Found ${reviews.length} reviews.`);
        } else {
            console.log('No search results found.');
        }
    } catch (e) {
        console.error('Test 2 failed:', e.message);
    }
}

test();
