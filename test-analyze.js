const axios = require('axios');

async function testAnalyze() {
    const reviews = [
        { id: "t1", text: "They threatened my family and called my boss!" }, // Expected: viol
        { id: "t2", text: "The amount is too small, I need 50000 but only got 2000." }, // Expected: amt
        { id: "t3", text: "They deducted 3000 as service fee, too expensive." }, // Expected: int
        { id: "t4", text: "I did not apply but money was sent automatically." }, // Expected: force
        { id: "t5", text: "My application is pending for 5 days, scam app." }, // Expected: rej
        { id: "t6", text: "😊👍" } // Expected: other
    ];

    try {
        const response = await axios.post('http://127.0.0.1:3000/api/analyze', { reviews }, {
            proxy: false
        });
        console.log('Analysis Results:');
        response.data.results.forEach((res, i) => {
            console.log(`Review ${i+1}: Text="${reviews[i].text}" -> Category=${res.category}, Confidence=${res.confidence}`);
        });
    } catch (err) {
        console.error('Test failed:', err.message);
    }
}

testAnalyze();
