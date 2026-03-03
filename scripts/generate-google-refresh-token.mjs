import 'dotenv/config';
import { createServer } from 'node:http';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const clientId = process.env.GOOGLE_CLI_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
const clientSecret =
  process.env.GOOGLE_CLI_CLIENT_SECRET ||
  process.env.GOOGLE_CLIE_CLIENT_SECRET ||
  process.env.GOOGLE_CLIENT_SECRET ||
  '';
const callbackHost = process.env.GOOGLE_CLI_CALLBACK_HOST || 'localhost';
const callbackPort = Number(process.env.GOOGLE_CLI_CALLBACK_PORT || '53682');
const callbackPath = process.env.GOOGLE_CLI_CALLBACK_PATH || '/oauth2callback';
const redirectUri = process.env.GOOGLE_CLI_REDIRECT_URI || `http://${callbackHost}:${callbackPort}${callbackPath}`;
const scope = process.env.GOOGLE_CLI_SCOPE || 'https://www.googleapis.com/auth/gmail.readonly';

function requireValue(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function isLocalhostRedirect(uri) {
  try {
    const parsed = new URL(uri);
    return parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

function waitForAuthCodeViaCallback(timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (server, value, isError = false) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      server.close(() => {
        if (isError) {
          reject(value);
        } else {
          resolve(value);
        }
      });
    };

    const server = createServer((req, res) => {
      const requestUrl = new URL(req.url || '/', `http://${callbackHost}:${callbackPort}`);

      if (requestUrl.pathname !== callbackPath) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      const error = requestUrl.searchParams.get('error');
      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`OAuth error: ${error}`);
        finish(server, new Error(`Google OAuth returned error: ${error}`), true);
        return;
      }

      const code = requestUrl.searchParams.get('code');
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Missing code');
        finish(server, new Error('OAuth callback did not include an authorization code'), true);
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h3>Authorization complete</h3><p>You can close this tab and return to the terminal.</p>');
      finish(server, code, false);
    });

    server.on('error', (error) => {
      finish(server, new Error(`Failed to start local callback server: ${error.message}`), true);
    });

    server.listen(callbackPort, callbackHost);

    const timeoutHandle = setTimeout(() => {
      finish(server, new Error(`Timed out waiting for OAuth callback after ${timeoutMs}ms`), true);
    }, timeoutMs);
  });
}

async function main() {
  requireValue('GOOGLE_CLI_CLIENT_ID (or GOOGLE_CLIENT_ID)', clientId);
  requireValue('GOOGLE_CLI_CLIENT_SECRET/GOOGLE_CLIE_CLIENT_SECRET (or GOOGLE_CLIENT_SECRET)', clientSecret);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('include_granted_scopes', 'true');

  console.log('\nOpen this URL and complete consent:\n');
  console.log(authUrl.toString());
  let authCode = '';

  if (isLocalhostRedirect(redirectUri)) {
    console.log(`\nWaiting for callback on ${redirectUri}`);
    console.log('If this fails, ensure this exact redirect URI is added to your Google OAuth client settings.\n');
    authCode = await waitForAuthCodeViaCallback();
  } else {
    console.log('\nAfter consent, copy the `code` query parameter from the redirected URL and paste it below.\n');
    const rl = readline.createInterface({ input, output });
    try {
      authCode = (await rl.question('Authorization code: ')).trim();
      if (!authCode) {
        throw new Error('Authorization code cannot be empty');
      }
    } finally {
      rl.close();
    }
  }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: authCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    if (!data.refresh_token) {
      throw new Error('No refresh_token was returned. Use prompt=consent and ensure this is the first grant or revoke existing consent.');
    }

    console.log('\nCopy this into your .env:\n');
    console.log(`GOOGLE_CLI_REFRESH_TOKEN=${data.refresh_token}`);

    if (data.access_token) {
      console.log('\nAccess token was also returned (short-lived).');
    }
}

main().catch((error) => {
  console.error('\nFailed to generate Google refresh token:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});