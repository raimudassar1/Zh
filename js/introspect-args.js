const https = require('https');

const LOTTIE_API = 'https://graphql.lottiefiles.com/2022-08';
const body = JSON.stringify({
  query: `query {
    __type(name: "Query") {
      fields {
        name
        args {
          name
          type {
            name
            kind
          }
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
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const fields = JSON.parse(data).data.__type.fields;
    for (const f of fields) {
      if (f.name.toLowerCase().includes('search') || f.name.toLowerCase().includes('asset') || f.name.toLowerCase().includes('lottie')) {
        console.log('Field:', f.name);
        console.log('Args:', JSON.stringify(f.args, null, 2));
      }
    }
  });
});

req.on('error', console.error);
req.write(body);
req.end();
