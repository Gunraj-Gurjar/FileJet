import os from 'os';
import { NextResponse } from 'next/server';

export async function GET() {
    const networks = os.networkInterfaces();
    let localIp = null;

    for (const name of Object.keys(networks)) {
        for (const net of networks[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                localIp = net.address;
                break;
            }
        }
        if (localIp) break;
    }

    return NextResponse.json({ ip: localIp });
}
