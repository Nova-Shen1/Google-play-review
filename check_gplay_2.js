const gplay = require('google-play-scraper');
const realGplay = gplay.default ? gplay.default : gplay;
console.log('realGplay keys:', Object.keys(realGplay));
if (realGplay.sort) {
    console.log('realGplay.sort keys:', Object.keys(realGplay.sort));
} else {
    console.log('realGplay.sort is undefined');
}
