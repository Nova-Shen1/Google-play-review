const gplay = require('google-play-scraper');
console.log('gplay exports keys:', Object.keys(gplay));
if (gplay.sort) {
    console.log('gplay.sort keys:', Object.keys(gplay.sort));
} else {
    console.log('gplay.sort is undefined');
}
