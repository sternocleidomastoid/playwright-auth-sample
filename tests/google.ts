const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLI_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLI_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_CLI_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN || '';

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: 'Bearer';
  scope?: string;
};

type GmailListResponse = {
  messages?: Array<{ id: string; threadId: string }>;
  resultSizeEstimate?: number;
};

type GmailMessagePartBody = {
  data?: string;
};

type GmailMessagePart = {
  mimeType?: string;
  body?: GmailMessagePartBody;
  parts?: GmailMessagePart[];
};

type GmailMessageResponse = {
  id: string;
  internalDate: string;
  snippet?: string;
  payload?: GmailMessagePart;
};

function decodeBase64Url(base64Url: string): string {
  const normalized = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function collectMessageText(part?: GmailMessagePart): string {
  if (!part) {
    return '';
  }

  const ownBody = part.body?.data ? decodeBase64Url(part.body.data) : '';
  const childBodies = (part.parts || []).map(collectMessageText).filter(Boolean);
  return [ownBody, ...childBodies].join('\n');
}

function findResetLink(content: string): string | null {
  const directUrlPattern = /https?:\/\/[^\s"'<>]+\/u\/reset-verify\?ticket=[^\s"'<>]+/i;
  const directMatch = content.match(directUrlPattern);
  if (directMatch?.[0]) {
    return directMatch[0].replace(/&amp;/g, '&');
  }

  return null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getGmailMessage(accessToken: string, messageId: string): Promise<GmailMessageResponse> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to read Gmail message ${messageId}: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<GmailMessageResponse>;
}

async function listGmailMessages(accessToken: string, query: string): Promise<GmailListResponse> {
  const encodedQuery = encodeURIComponent(query);
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodedQuery}&maxResults=10`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to list Gmail messages: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<GmailListResponse>;
}

export async function getGoogleAccessToken(): Promise<string> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLI_CLIENT_ID/GOOGLE_CLIENT_ID and GOOGLE_CLI_CLIENT_SECRET/GOOGLE_CLIENT_SECRET are required');
  }

  if (!GOOGLE_REFRESH_TOKEN) {
    throw new Error('GOOGLE_CLI_REFRESH_TOKEN or GOOGLE_REFRESH_TOKEN is required to call Gmail API');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to obtain Google access token: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as GoogleTokenResponse;
  if (!data.access_token) {
    throw new Error('Google OAuth response did not include an access token');
  }

  return data.access_token;
}

export async function getPasswordResetEmailFromGmail(
  sentTo: string,
  receivedAfter: Date = new Date(),
  timeoutMs = 90000,
  pollIntervalMs = 5000
): Promise<string> {
  const accessToken = await getGoogleAccessToken();
  const deadline = Date.now() + timeoutMs;
  const thresholdMs = receivedAfter.getTime();
  const query = `to:${sentTo} subject:\"Reset your password\"`;

  while (Date.now() < deadline) {
    const listResponse = await listGmailMessages(accessToken, query);
    const messages = listResponse.messages || [];

    for (const messageMeta of messages) {
      const message = await getGmailMessage(accessToken, messageMeta.id);
      const internalDate = Number(message.internalDate || '0');
      if (internalDate < thresholdMs) {
        continue;
      }

      const bodyText = collectMessageText(message.payload);
      const combinedText = `${bodyText}\n${message.snippet || ''}`;
      const resetLink = findResetLink(combinedText);

      if (resetLink) {
        return resetLink;
      }
    }

    await wait(pollIntervalMs);
  }

  throw new Error(`No password reset email found in Gmail for ${sentTo} within ${timeoutMs}ms`);
}