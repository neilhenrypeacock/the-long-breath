// Cloudflare Worker — proxies EmailOctopus API so the key stays server-side.
// Deploy at: Workers & Pages → Create Worker → paste this file.
// Add secret: Settings → Variables → EO_API_KEY = <your api key>

const LIST_ID = '165ad7d4-26b0-11f1-a551-6775dedd6e52';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: CORS });
    }

    let email;
    try {
      ({ email } = await request.json());
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    const res = await fetch(
      `https://emailoctopus.com/api/1.6/lists/${LIST_ID}/contacts`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: env.EO_API_KEY,
          email_address: email,
          status: 'PENDING', // triggers double opt-in confirmation email
        }),
      }
    );

    const data = await res.json();
    // 409 = already pending/subscribed — treat as success (avoids email enumeration)
    const status = res.status === 409 ? 200 : res.status;
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  },
};
