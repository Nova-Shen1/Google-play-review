const gplayRaw = require('google-play-scraper');
const gplay = gplayRaw.default || gplayRaw;
require('dotenv').config();

// --- 修改后的代理逻辑 ---
// 仅当不在 Vercel 环境且存在代理配置时启用
if (process.env.HTTP_PROXY && !process.env.VERCEL) {
    try {
        const globalAgent = require('global-agent');
        process.env.GLOBAL_AGENT_HTTP_PROXY = process.env.HTTP_PROXY;
        globalAgent.bootstrap();
        console.log(`[LOCAL INFO] 已启用本地代理: ${process.env.HTTP_PROXY}`);
    } catch (e) {
        console.warn('[WARN] 无法加载 global-agent，请确保已安装该 npm 包');
    }
} else if (process.env.VERCEL) {
    console.log('[INFO] Vercel 环境：已自动跳过代理配置，直接连接 Google');
}

async function testGplay() {
    const appId = 'ng.com.fairmoney.fairmoney';
    const country = 'ng';
    
    // 确保 gplay 已经加载（特别是如果你在 server.js 中是动态导入的）
    if (!gplay) {
        console.error('Error: gplay 模块尚未加载完成！');
        return;
    }

    console.log(`[TEST] 正在请求 Google Play...`);
    
    try {
        const results = await gplay.reviews({
            appId: appId,
            country: country,
            sort: 2, 
            num: 10
        });
        
        // ... 后面的 log 逻辑保持不变
    } catch (err) {
        console.error('抓取失败！具体原因:', err.message);
        // 如果是在 Vercel 看到这个，通常是 appId 不存在或被 Google 暂时封锁 IP
    }
}
        
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
