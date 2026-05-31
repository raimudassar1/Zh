const https = require('https');

const LOTTIE_API = 'https://graphql.lottiefiles.com/2022-08';
const body = JSON.stringify({
  query: `{
    search(query: "correct", first: 2, sort: POPULAR, contentType: JSON) {
      edges {
        node {
          id
          name
        }
      }
    }
  }`
});

const req = https.request(LOTTIE_API, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'User-Agent': 'Mozilla/5.0'
  }
}, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', console.error);
req.write(body);
req.end();
