const https = require('https');

/**
 * Fetches temporary TURN server credentials from Metered.ca
 * Returns an array of RTCIceServer objects ready for the WebRTC peer connection.
 */
async function getTurnCredentials() {
    const domain = process.env.METERED_DOMAIN;
    const secretKey = process.env.TURN_SECRET_KEY;

    if (!domain || !secretKey) {
        console.warn('[TURN] METERED_DOMAIN or TURN_SECRET_KEY not set in .env. Falling back to Google STUN only.');
        return null; // Return null to indicate no TURN available, letting the client fallback
    }

    return new Promise((resolve, reject) => {
        // Metered documentation explicitly says to append the secretKey to the URL query string
        const options = {
            hostname: domain,
            port: 443,
            path: `/api/v1/turn/credentials?apiKey=${secretKey}`,
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const credentials = JSON.parse(data);
                        resolve(credentials);
                    } catch (e) {
                        console.error('[TURN] Failed to parse Metered response:', e);
                        reject(new Error('Invalid JSON response from Metered'));
                    }
                } else {
                    console.error('[TURN] Metered API error:', res.statusCode, data);
                    reject(new Error(`Metered API returned status ${res.statusCode}`));
                }
            });
        });

        req.on('error', (e) => {
            console.error('[TURN] Request failed:', e);
            reject(e);
        });

        req.end();
    });
}

module.exports = {
    getTurnCredentials
};
