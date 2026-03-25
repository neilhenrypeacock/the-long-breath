// Netlify serverless function — proxies EmailOctopus API so the key
// stays server-side and CORS is handled correctly.

const LIST_ID = '165ad7d4-26b0-11f1-a551-6775dedd6e52';
const API_KEY = process.env.EO_API_KEY || 'eo_ac9bfbba9843fb0ceb60fc1b71fb5004fa085a9fc4cc10291fcf256abcfc91b3';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method not allowed' };
  }

  let email;
  try {
    ({ email } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid email' }) };
  }

  const res = await fetch(
    `https://emailoctopus.com/api/1.6/lists/${LIST_ID}/contacts`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: API_KEY, email_address: email, status: 'PENDING' })
    }
  );

  const data = await res.json();

  // 409 = already pending/subscribed — treat as success (avoids email enumeration)
  const status = res.status === 409 ? 200 : res.status;
  return { statusCode: status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
};
