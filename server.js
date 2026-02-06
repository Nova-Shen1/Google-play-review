require('dotenv').config();

const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const os = require('os');

// 注意：这里删除了原来的 const gplay = require(...)

// 重试包装函数
const withRetry = async (fn, retries = 3, delay = 2000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            const isNetworkError = err.message.includes('ECONNRESET') || 
                                 err.message.includes('ETIMEDOUT') || 
                                 err.message.includes('socket hang up') ||
                                 err.message.includes('network');
            
            if (i === retries - 1 || !isNetworkError) throw err;
            console.warn(`[RETRY] 请求失败，正在进行第 ${i + 1} 次重试... (${err.message})`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 确保 data 目录存在 (Vercel 环境下 /tmp 是可写的，但 data 目录可能受限)
// 注意：Vercel 部署后文件系统是只读的，data 里的 json 无法持久保存。
// 建议后期使用数据库，目前为了跑通代码先保留逻辑。
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

const APPS_FILE = path.join(__dirname, 'data', 'apps.json');
const SNAPSHOTS_FILE = path.join(__dirname, 'data', 'review_snapshots.json');

// --- 辅助函数保持不变 ---
const readSnapshots = () => {
    try {
        if (!fs.existsSync(SNAPSHOTS_FILE)) return {};
        return JSON.parse(fs.readFileSync(SNAPSHOTS_FILE, 'utf8'));
    } catch (e) { return {}; }
};

const writeSnapshots = (data) => {
    try {
        fs.writeFileSync(SNAPSHOTS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) { return false; }
};

const readApps = () => {
    try {
        if (!fs.existsSync(APPS_FILE)) return { ng: [], mx: [], ph: [] };
        return JSON.parse(fs.readFileSync(APPS_FILE, 'utf8'));
    } catch (e) { return { ng: [], mx: [], ph: [] }; }
};

const writeApps = (data) => {
    try {
        fs.writeFileSync(APPS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) { return false; }
};

// ==========================================
// 修改后的 API 路由 (使用了动态导入)
// ==========================================

// 获取 App 基础详情
app.get('/api/app-info', async (req, res) => {
    // 关键改动：动态导入 gplay
    const gplay = (await import('google-play-scraper')).default;

    let { app_id, country = 'ng', lang = 'en' } = req.query;
    if (app_id) app_id = app_id.normalize('NFC');
    if (!app_id) return res.status(400).json({ status: "error", message: "app_id is required" });

    const primaryLang = lang.split(',')[0];

    try {
        let detail;
        try {
            detail = await withRetry(() => gplay.app({ 
                appId: app_id,
                country: String(country).toLowerCase(),
                lang: String(primaryLang).toLowerCase()
            }));
        } catch (e) {
            const searchResults = await withRetry(() => gplay.search({
                term: app_id,
                num: 1,
                country: String(country).toLowerCase(),
                lang: String(primaryLang).toLowerCase()
            }));
            
            if (searchResults && searchResults.length > 0) {
                detail = await withRetry(() => gplay.app({
                    appId: searchResults[0].appId,
                    country: String(country).toLowerCase(),
                    lang: String(primaryLang).toLowerCase()
                }));
            } else {
                throw new Error(`找不到该 App: ${app_id}`);
            }
        }
        
        return res.json({
            status: "success",
            data: {
                appId: detail.appId,
                title: detail.title,
                score: detail.score ? detail.score.toFixed(1) : "0.0",
                scoreText: detail.scoreText,
                installs: detail.installs,
                genre: detail.genre
            }
        });
    } catch (err) {
        return res.status(500).json({ status: "error", message: err.message });
    }
});

// 获取评论列表
app.get('/api/reviews', async (req, res) => {
    // 关键改动：动态导入 gplay
    const gplay = (await import('google-play-scraper')).default;

    let { app_id, country = 'ng', lang = 'en', limit = 1000 } = req.query;
    if (app_id) app_id = app_id.normalize('NFC');

    const appId = app_id || 'unknown_app';
    const count = Math.max(1, Math.min(1000, Number(limit) || 1000));
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 2);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 8);

    const fetchReviewsForLang = async (id, l) => {
        try {
            const result = await withRetry(() => gplay.reviews({
                appId: id,
                country: String(country).toLowerCase(),
                lang: String(l).trim().toLowerCase(),
                sort: 2,
                num: 1000 
            }));
            return Array.isArray(result) ? result : (result.data || []);
        } catch (e) { return []; }
    };

    try {
        const langList = lang.split(',');
        const allResults = await Promise.all(langList.map(l => fetchReviewsForLang(appId, l)));
        const reviews = allResults.flat();

        // 这里的后续逻辑（过滤、统计等）保持你原有的不变即可
        // ... (篇幅原因，此处略过你原有的 map/filter 逻辑，请保留你原始代码中的那部分)
        
        // 注意：由于是示例，请确保把你原代码中从 const allReviews = reviews.map 开始
        // 到 res.json 结束的所有逻辑粘贴回这里。
        res.json({ status: "success", message: "请记得把原有的过滤统计逻辑粘贴回此处" });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

// 其他路由 (app.post('/api/apps') 等) 保持不变即可...

app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务启动成功，端口: ${PORT}`);
});

// ==========================================
// 模拟数据生成器
// ==========================================
const generateMockReviews = (appId, count = 10) => {
    const templates = [
        { user: "Adekunle", text: "This app is a scam! Interest rate is too high. I borrowed 5000 and asked to pay 8000 in 7 days.", score: 1 },
        { user: "Chidi", text: "They called my mother and my boss! Very rude agents. DO NOT DOWNLOAD.", score: 1 },
        { user: "Olumide", text: "I did not apply for loan but they sent money to my account forcefully.", score: 1 },
        { user: "Fatima", text: "My loan is pending for 3 days now. Useless app.", score: 2 },
        { user: "Emeka", text: "High interest rate. Too much deduction.", score: 1 },
        { user: "Zainab", text: "Please increase my limit. I paid on time but limit is still 2000.", score: 2 },
        { user: "Ibrahim", text: "Thieves! They debit my card automatically.", score: 1 },
        { user: "Ngozi", text: "Good app but interest is high.", score: 2 },
        { user: "Yusuf", text: "Why did you reject my application?", score: 1 },
        { user: "Grace", text: "Rubbish app.", score: 1 }
    ];

    const reviews = [];
    for (let i = 0; i < count; i++) {
        const tpl = templates[Math.floor(Math.random() * templates.length)];
        reviews.push({
            id: `server_${Date.now()}_${i}`,
            appId: appId,
            userName: tpl.user,
            text: tpl.text,
            score: tpl.score,
            time: new Date().toISOString(),
            analysis: null
        });
    }
    return reviews;
};

// 3. 获取 App 基础详情 (用于仪表板评分显示)
app.get('/api/app-info', async (req, res) => {
    let { app_id, country = 'ng', lang = 'en' } = req.query;
    
    if (app_id) {
        app_id = app_id.normalize('NFC');
    }

    if (!app_id) return res.status(400).json({ status: "error", message: "app_id is required" });

    // 提取第一个语言（详情接口通常只支持单一语言）
    const primaryLang = lang.split(',')[0];
    console.log(`[GET] /api/app-info - App: ${app_id}, Country: ${country}, Lang: ${primaryLang}`);

    try {
        let detail;
        try {
            console.log(`[INFO] 正在获取 App 详情: appId=${app_id}, gl=${country}, hl=${primaryLang}`);
            detail = await withRetry(() => gplay.app({ 
                appId: app_id,
                country: String(country).toLowerCase(),
                lang: String(primaryLang).toLowerCase()
            }));
        } catch (e) {
            console.warn(`[INFO] 直接获取 App 详情失败，尝试搜索: ${app_id}`);
            // 尝试搜索，处理用户输入 App 名称而非 ID 的情况
            const searchResults = await withRetry(() => gplay.search({
                term: app_id,
                num: 1,
                country: String(country).toLowerCase(),
                lang: String(primaryLang).toLowerCase()
            }));
            
            if (searchResults && searchResults.length > 0) {
                const bestMatch = searchResults[0];
                console.log(`[INFO] 搜索到匹配 App: ${bestMatch.title} (${bestMatch.appId})`);
                
                // 如果搜索到的第一个结果包含原始查询关键词，则认为匹配成功
                const queryLower = app_id.toLowerCase();
                const titleLower = bestMatch.title.toLowerCase();
                const idLower = bestMatch.appId.toLowerCase();
                
                if (titleLower.includes(queryLower) || idLower.includes(queryLower) || queryLower.includes(idLower)) {
                    detail = await withRetry(() => gplay.app({
                        appId: bestMatch.appId,
                        country: String(country).toLowerCase(),
                        lang: String(primaryLang).toLowerCase()
                    }));
                } else {
                    console.warn(`[WARN] 搜索结果与查询不匹配: "${bestMatch.title}" vs "${app_id}"`);
                    throw new Error(`找不到该 App: ${app_id} (最接近的结果是 ${bestMatch.title})`);
                }
            } else {
                throw new Error(`找不到该 App: ${app_id}`);
            }
        }
        
        console.log(`[INFO] 成功获取 App 详情: ${detail.title}, Score: ${detail.score}, appId: ${detail.appId}`);

        return res.json({
            status: "success",
            data: {
                appId: detail.appId,
                title: detail.title,
                score: detail.score ? detail.score.toFixed(1) : "0.0",
                scoreText: detail.scoreText,
                installs: detail.installs,
                genre: detail.genre
            }
        });
    } catch (err) {
        console.error(`[ERROR] 获取 App 详情完全失败 (${app_id}):`, err.message);
        let errorMsg = `获取 App 详情失败: ${err.message}`;
        if (err.message.includes('ECONNRESET') || err.message.includes('ETIMEDOUT') || err.message.includes('socket hang up')) {
            errorMsg = `网络连接异常。请检查后端服务器的代理设置 (Clash/VPN) 是否正常工作，以及是否能访问 Google Play。 (${err.message})`;
        }
        return res.status(500).json({ status: "error", message: errorMsg });
    }
});

// ==========================================
// API Routes
// ==========================================

// 1. 获取差评列表 (优先真实抓取，失败则回退模拟)
app.get('/api/reviews', async (req, res) => {
    let {
        app_id,
        country = 'ng',
        lang = 'en',
        days = 1,
        min_rating = 1,
        max_rating = 2,
        limit = 1000
    } = req.query;

    // 对 appId 进行 Unicode 规范化处理，防止重音符号等字符导致的匹配问题
    if (app_id) {
        app_id = app_id.normalize('NFC');
    }

    const appId = app_id || 'unknown_app';
    const minRate = Number(min_rating) || 1;
    const maxRate = Number(max_rating) || 2;
    const count = Math.max(1, Math.min(1000, Number(limit) || 1000));

    // 计算目标日期范围：当天 - 2 到 当天 - 8 (共7天)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 2);
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 8);
    startDate.setHours(0, 0, 0, 0);

    console.log(`[GET] /api/reviews - App: ${appId}, Range: ${startDate.toISOString()} to ${endDate.toISOString()}, Langs: ${lang}`);

    // 确定真实 appId
    let realAppId = app_id;

    const fetchReviewsForLang = async (id, l) => {
        const options = {
            appId: id,
            country: String(country).toLowerCase(), // 对应 Google Play 的 gl 参数
            lang: String(l).trim().toLowerCase(),   // 对应 Google Play 的 hl 参数
            sort: 2, // NEWEST
            num: 1000 
        };
        try {
            console.log(`[INFO] 正在从 Google Play 抓取评论: appId=${id}, gl=${options.country}, hl=${options.lang}`);
            const result = await withRetry(() => gplay.reviews(options));
            const items = Array.isArray(result) ? result : (result.data || []);
            console.log(`[INFO] 成功抓取语言 ${options.lang}: ${items.length} 条评论`);
            return items;
        } catch (e) {
            console.error(`[ERROR] 抓取语言 ${options.lang} 失败:`, e.message);
            return []; // 某个语言失败不影响其他语言
        }
    };

    const fetchAllReviews = async (id) => {
        const langList = lang.split(',');
        const allResults = await Promise.all(langList.map(l => fetchReviewsForLang(id, l)));
        // 合并并去重（通过评论 ID）
        const merged = [];
        const seenIds = new Set();
        
        allResults.flat().forEach(r => {
            if (r.id && !seenIds.has(r.id)) {
                seenIds.add(r.id);
                merged.push(r);
            } else if (!r.id) {
                merged.push(r);
            }
        });
        
        return merged;
    };

    try {
        let reviews = await fetchAllReviews(realAppId);
        
        // 如果抓取结果为空，或者抓取过程中报错，尝试搜索回退
        if (reviews.length === 0) {
            console.warn(`[INFO] 未能直接抓取到评论，尝试在国家 ${country} 搜索匹配 App: ${app_id}`);
            const primaryLang = lang.split(',')[0];
            const searchResults = await withRetry(() => gplay.search({ 
                term: app_id, 
                num: 1, 
                country: country,
                lang: primaryLang
            }));
            
            if (searchResults && searchResults.length > 0) {
                const bestMatch = searchResults[0];
                const queryLower = app_id.toLowerCase();
                const titleLower = bestMatch.title.toLowerCase();
                const idLower = bestMatch.appId.toLowerCase();

                // 只有在标题或 ID 包含查询词时才回退，防止乱抓
                if (titleLower.includes(queryLower) || idLower.includes(queryLower) || queryLower.includes(idLower)) {
                    realAppId = bestMatch.appId;
                    console.log(`[INFO] 搜索找到实际 appId: ${realAppId} (${bestMatch.title})，重新抓取...`);
                    reviews = await fetchAllReviews(realAppId);
                } else {
                    console.warn(`[WARN] 搜索结果不匹配，放弃回退抓取: "${bestMatch.title}" vs "${app_id}"`);
                }
            }
        }
        
        console.log(`[INFO] 最终抓取到 ${reviews.length} 条原始评论 (合并去重后)`);

        // 映射为前端需要的结构
        const allReviews = reviews.map(r => {
            return {
                id: r.id || `gplay_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                appId: realAppId,
                userName: r.userName || r.user || '用户',
                text: r.text || '',
                score: r.score || 0,
                time: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
                analysis: null
            };
        });

        // 1. 过滤日期范围内的所有评分评论 (T-2 到 T-8)
        const reviewsInRange = allReviews.filter(r => {
            const dt = new Date(r.time);
            return dt >= startDate && dt <= endDate;
        });

        // 2. 统计逻辑：
        // 严格遵循用户要求的 T-2 到 T-8 范围
        let finalReviewsForStats = reviewsInRange;
        let isFallbackUsed = false;

        // 如果范围内确实没有评论，统计结果就应该是 0，不再回退到全量抓取
        if (reviewsInRange.length === 0 && allReviews.length > 0) {
            console.log(`[INFO] 日期范围内 (T-2 到 T-8) 无评论`);
        }

        const totalInDateRange = finalReviewsForStats.length;
        const badInDateRange = finalReviewsForStats.filter(r => r.score <= 2).length;
        
        // 计算范围内所有评论的平均分 (1-5星)
        let avgScoreInDateRange = 0;
        if (totalInDateRange > 0) {
            const sum = finalReviewsForStats.reduce((acc, r) => acc + Number(r.score), 0);
            avgScoreInDateRange = parseFloat((sum / totalInDateRange).toFixed(2));
        }
        
        console.log(`[INFO] 统计结果 - appId: ${realAppId}, 范围内总数: ${totalInDateRange}, 差评数: ${badInDateRange}, 平均分: ${avgScoreInDateRange}`);
        
        const stats = {
            totalInDateRange,
            badInDateRange,
            avgScoreInDateRange,
            isFallbackUsed
        };

        // 3. 评论列表展示逻辑：
        // 严格只显示 1-2 星差评。如果没有差评，列表将保持为空。
        const filteredData = finalReviewsForStats.filter(r => {
            const score = Number(r.score);
            return score >= minRate && score <= maxRate;
        });

        console.log(`[DEBUG] appId: ${realAppId}, 过滤前总数: ${finalReviewsForStats.length}, 过滤后差评数: ${filteredData.length} (评分范围: ${minRate}-${maxRate})`);

        let data = filteredData;

        // 4. 截取需要的数量用于列表显示
        data = data.slice(0, count);

        // 5. 格式化输出时间，并确保使用请求的 appId (维持前端关联一致性)
        data = data.map(r => ({
            ...r,
            appId: app_id, // 强制使用请求时的 ID
            time: r.time.includes('T') ? r.time.split('T')[0] : r.time
        }));

        // 6. 异步记录 4-5 星好评快照 (不阻塞主请求)
        setImmediate(() => {
            recordGoodReviewSnapshots(realAppId, allReviews);
        });

        return res.json({ 
            status: "success", 
            data, 
            stats,
            range: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
            debug: {
                totalFetched: allReviews.length,
                totalInRange: reviewsInRange.length,
                realAppId: realAppId
            }
        });
    } catch (err) {
        console.warn(`[WARN] gplay 抓取失败 (${appId}): ${err.message}`);
        let errorMsg = `抓取评论失败: ${err.message}`;
        if (err.message.includes('ECONNRESET') || err.message.includes('ETIMEDOUT') || err.message.includes('socket hang up')) {
            errorMsg = `网络连接超时或被重置。请检查后端服务器的代理设置 (Clash/VPN) 是否正常工作，以及是否能访问 Google Play。 (${err.message})`;
        }
        return res.status(500).json({ status: "error", message: errorMsg });
    }
});

// 2. 提交 AI 分析
app.post('/api/analyze', (req, res) => {
    const { reviews, country = 'ng' } = req.body;
    
    if (!reviews || !Array.isArray(reviews)) {
        return res.status(400).json({ status: "error", message: "Invalid reviews data" });
    }

    console.log(`[POST] /api/analyze - Count: ${reviews.length}, Country: ${country}`);

    // 优化的 AI 分析逻辑 (规则引擎 - 支持多语言：英语、西班牙语、菲律宾语)
    const results = reviews.map(r => {
        const text = (r.text || '').toLowerCase();
        let category = 'other';
        let confidence = 0.6;

        // --- 1. 强领 (force) - 极高优先级 ---
        const forceEng = text.match(/(without consent|didn't apply|did not apply|don't apply|do not apply|never apply|force|automatic|automatically|unauthorized|didn't ask|did not ask|without my permission|forced loan|gave me loan without|disbursed without)/i);
        const forceSpa = text.match(/(sin permiso|sin consentimiento|automátic|no ped|no solicit|forzado|sin mi autorización|deposito sin|me depositaron sin|prestamo forzado)/i);
        const forcePhi = text.match(/(kusa|sapilitan|hindi ako nag-apply|nag-disburse nang hindi|automatik)/i);

        // --- 2. 违规催收 (viol) - 高优先级 ---
        // 包含：威胁、骚扰、爆通讯录、辱骂、私聊转账
        const violEng = text.match(/(rude|abuse|insult|vulgar|shout|stupid|idiot|fool|curse|barking|animal|dog|mad|harass|disturb|calling|threat|threaten|family|mother|father|parent|boss|contact|relative|shame|photo|picture|post|defame|embarrass|early|before|repay to|pay into|personal account|whatsapp|bank transfer to|illegal collection|harassing|calling my friends)/i);
        const violSpa = text.match(/(groser|insult|acos|amenaz|difam|avergonz|parient|famili|contact|foto|imagen|cobrar antes|depósito|cuenta personal|otra cuenta|whatsapp|amenazan|marcan a mis|llaman a mis|cobranza)/i);
        const violPhi = text.match(/(bastos|mura|pananakot|pamilya|kontak|pagbabanta|tinatakot|binabastos|tinatawagan ang mga)/i);

        // --- 3. 利息/费用不满 (int) ---
        // 包含：高利息、高砍头费、实际到账少
        const intEng = text.match(/(less than|deduct|service fee|hidden fee|charge|expensive|interest|percentage|high rate|cut|excessive|received|got|too much fee|high interest|rip off| robbery|7 days only)/i);
        const intSpa = text.match(/(interés|tasa|comisión|cargo|deduc|descuento|recibí menos|caro|excesiv|cobro|robo|mucho interes|solo 7 dias|gastos de gestion)/i);
        const intPhi = text.match(/(mataas na interes|bawas|singil|sobrang mahal|7 araw lang)/i);

        // --- 4. 拒贷/诈骗 (rej) ---
        // 包含：拒绝、审核中、诈骗（指不放款）、信息安全
        const rejEng = text.match(/(reject|decline|fail|unsuccessful|not approve|didn't pass|denied|refused|pending|review|stuck|processing|waiting|scam|fraud|fake|stealing|info|data|phishing)/i);
        const rejSpa = text.match(/(rechaz|deneg|pendient|proces|espera|fraud|estaf|robo|información personal|engaño)/i);
        const rejPhi = text.match(/(rejected|scam|hindi naapprove|naghihintay|manloloko|pekeng)/i);

        // --- 5. 额度不满 (amt) ---
        // 包含：额度低、想要提额
        const amtEng = text.match(/(low|small|tiny|poor|little|meager|amount|limit|quota|increase|higher|upgrade|raise|disappointed|unhappy|sad|not enough|very small)/i);
        const amtSpa = text.match(/(bajo|poco|pequeñ|limit|cantid|monto|aument|decepcion|insuficiente|muy poquito)/i);
        const amtPhi = text.match(/(mababa|maliit|dagdag|kulang|napaka liit)/i);

        // --- 6. 其他 (other) - 显式定义的其他类 ---
        // 包含：没用的app、无法登录、程序异常、贷款用途描述（如支付、节假日、生活消费等）
        const otherEng = text.match(/(useless|waste of time|can't login|cannot login|unable to login|not working|crash|bug|error|worst app|garbage|trash|loading|open|not opening|doesn't open|won't open|useless app|pay for|payment|holiday|vacation|travel|medical|school|fees|rent|buy|purchase|shopping|gift|used for|purpose|need money for)/i);
        const otherSpa = text.match(/(no funciona|basura|no sirve|peor aplicacion|tiempo perdido|no abre|error|falla|pagar|vacaciones|viaje|médico|colegio|alquiler|comprar|compras|regalo|uso para|propósito|necesito dinero para)/i);
        const otherPhi = text.match(/(sayang oras|hindi gumagana|pangit|basura|pambayad|bakasyon|biyahe|ospital|matrikula|upa|pambili|gamit sa|layunin|kailangan ng pera para)/i);
        const otherChi = text.match(/(没用|没用的app|没用的程序|无法登录|登录失败|异常|闪退|打不开|垃圾|支付|还款|消费|节假日|过年|买东西|交学费|生活费|贷款用途|用处|买车|买房|旅游)/);

        // 判定逻辑与置信度优化
        if (forceEng || forceSpa || forcePhi) {
            category = 'force';
            confidence = 0.95 + (forceEng ? 0.03 : 0.01);
        } else if (violEng || violSpa || violPhi) {
            category = 'viol';
            confidence = 0.90;
            // 如果同时包含威胁和联系人，置信度极高
            if (text.match(/(threat|amenaz|threaten|harass|acos)/i) && text.match(/(contact|family|parent|relative|famili|pamilya|kontak)/i)) {
                confidence = 0.98;
            }
        } else if (otherEng || otherSpa || otherPhi || otherChi) {
            // 提升“其他/技术异常”的优先级，确保程序异常优先于利息/额度等业务分类
            category = 'other';
            confidence = 0.85; 
        } else if (intEng || intSpa || intPhi) {
            category = 'int';
            confidence = 0.85;
            if (text.match(/(interest|tasa|interés|fee|comisión)/i)) confidence = 0.92;
        } else if (rejEng || rejSpa || rejPhi) {
            category = 'rej';
            confidence = 0.85;
            if (text.match(/(scam|fraud|estaf|fake)/i)) confidence = 0.90;
        } else if (amtEng || amtSpa || amtPhi) {
            category = 'amt';
            confidence = 0.80;
            if (text.match(/(limit|monto|amount|increase|aument)/i)) confidence = 0.88;
        }

        // --- 7. 兜底逻辑 ---
        if (category === 'other' && text.length > 0 && confidence < 0.8) {
            // 如果评论很长但没匹配到关键词，维持 other 但降低置信度
            confidence = text.length > 50 ? 0.5 : 0.4;
        }

        // 如果文本长度太短或仅包含无意义内容
        if (text.length < 5 || (!/[a-zA-Záéíóúüñ]/.test(text) && !/[\u4e00-\u9fa5]/.test(text))) {
            category = 'other';
            confidence = 0.3;
        }

        return {
            id: r.id,
            category: category,
            confidence: parseFloat(confidence.toFixed(2))
        };
    });

    // 模拟网络延迟
    setTimeout(() => {
        res.json({
            status: "success",
            results: results
        });
    }, 1000);
});

// 3. 健康检查 (用于测试连接)
app.get('/', (req, res) => {
    res.send('GP Review Analyzer Backend is Running!');
});

// 4. 获取 5 星好评存留率统计
app.get('/api/retention-stats', (req, res) => {
    let { app_id } = req.query;
    
    // 如果没有提供 app_id，尝试从 query 中查找可能的参数名，或者返回空
    if (!app_id) {
         // 这里可以根据实际情况增强，比如支持按国家搜索 app_id
         return res.status(400).json({ status: "error", message: "app_id is required" });
    }
    
    app_id = app_id.normalize('NFC');
    
    const snapshots = readSnapshots();
    const appSnapshots = snapshots[app_id];
    
    if (!appSnapshots) {
        return res.json({ 
            status: "success", 
            data: { 
                retentionRate: 0, 
                deletedRate: 0, 
                baseDate: null, 
                targetDate: null,
                message: "暂无历史数据"
            } 
        });
    }

    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgoDate = new Date();
    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
    const sevenDaysAgo = sevenDaysAgoDate.toISOString().split('T')[0];

    // 查找最近的历史数据（优先 7 天前，如果没有则找最早的一天）
    const dates = Object.keys(appSnapshots).sort();
    let baseDate = sevenDaysAgo;
    
    if (!appSnapshots[baseDate]) {
        // 如果没有正好 7 天前的数据，找一个最近的（至少 1 天前）
        const validDates = dates.filter(d => d < today);
        if (validDates.length > 0) {
            // 找最接近 7 天前的
            baseDate = validDates[0]; // 简化逻辑：直接取最早的一天作为基准
        } else {
             return res.json({ 
                status: "success", 
                data: { 
                    retentionRate: 0, 
                    deletedRate: 0, 
                    baseDate: null, 
                    targetDate: today,
                    message: "数据积累不足 1 天"
                } 
            });
        }
    }

    const baseIds = appSnapshots[baseDate] || [];
    const todayIds = appSnapshots[today] || [];
    
    if (baseIds.length === 0) {
        return res.json({ 
            status: "success", 
            data: { 
                retentionRate: 0, 
                deletedRate: 0, 
                baseDate, 
                targetDate: today,
                message: "基准日无 5 星评论"
            } 
        });
    }

    // 计算留存
    // 留存数：基准日的 ID 在今日依然存在
    const retainedCount = baseIds.filter(id => todayIds.includes(id)).length;
    const deletedCount = baseIds.length - retainedCount;
    
    const retentionRate = parseFloat(((retainedCount / baseIds.length) * 100).toFixed(1));
    const deletedRate = parseFloat(((deletedCount / baseIds.length) * 100).toFixed(1));

    return res.json({
        status: "success",
        data: {
            retentionRate,
            deletedRate,
            baseDate,
            targetDate: today,
            baseCount: baseIds.length,
            retainedCount,
            deletedCount
        }
    });
});

// Start Server
const os = require('os');
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

app.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log(`[SUCCESS] 服务已启动，可供跨机器访问`);
    console.log(`- 本地访问: http://localhost:${PORT}`);
    console.log(`- 局域网访问: http://${localIP}:${PORT}`);
});
