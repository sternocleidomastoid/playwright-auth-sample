import { Tigrmail } from 'tigrmail';
import MailosaurClient from 'mailosaur';

export const TIGRMAIL_TOKEN = process.env.TIGRMAIL_API_KEY ?? process.env.TIGRMAIL_TOKEN;
export const MAILOSAUR_API_KEY = process.env.MAILOSAUR_API_KEY || '';
export const MAILOSAUR_SERVER_ID = process.env.MAILOSAUR_SERVER_ID || '';
export const TEST_EMAIL = process.env.TEST_EMAIL || '';
export const SIGNUP_PASSWORD = process.env.SIGNUP_PASSWORD || '!';
export const NEW_PASSWORD = process.env.NEW_PASSWORD || '';

export const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || '';
export const AUTH0_MGMT_API_TOKEN = process.env.AUTH0_MGMT_API_TOKEN || '';
export const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID || '';
export const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET || '';

export async function getAuth0ManagementToken(): Promise<string> {
  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_CLIENT_SECRET) {
    throw new Error('AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_CLIENT_SECRET environment variables are required');
  }

  try {
    const response = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
        audience: `https://dev-1mtlpwlwklhtmtw5.au.auth0.com/api/v2/`,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to obtain Auth0 management token: ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string };
    return data.access_token;
  } catch (error) {
    console.error('Error obtaining Auth0 management token:', error);
    throw error;
  }
}

export function getTigrmailClient(): Tigrmail {
  if (!TIGRMAIL_TOKEN) {
    throw new Error('TIGRMAIL_API_KEY or TIGRMAIL_TOKEN environment variable is not set');
  }
  return new Tigrmail({ token: TIGRMAIL_TOKEN });
}

export async function deleteInbox(tigrClient: Tigrmail, email: string): Promise<void> {
  const tigrCleanup = tigrClient as unknown as {
    deleteInbox?: (email: string) => Promise<void>;
    deleteEmailAddress?: (email: string) => Promise<void>;
  };

  if (typeof tigrCleanup.deleteInbox === 'function') {
    await tigrCleanup.deleteInbox(email);
  } else if (typeof tigrCleanup.deleteEmailAddress === 'function') {
    await tigrCleanup.deleteEmailAddress(email);
  }
}

export async function deleteAuth0User(email: string): Promise<void> {
  if (!AUTH0_DOMAIN) {
    console.warn('AUTH0_DOMAIN not set, skipping Auth0 user deletion');
    return;
  }

  try {
    // Get management token
    const token = AUTH0_MGMT_API_TOKEN || await getAuth0ManagementToken();

    // Get user by email
    const searchResponse = await fetch(
      `https://${AUTH0_DOMAIN}/api/v2/users-by-email?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(searchResponse)

    if (!searchResponse.ok) {
      console.warn(`Failed to search for user ${email} in Auth0`);
      return;
    }

    const users = await searchResponse.json() as Array<{ user_id: string }>;
    if (users.length === 0) {
      console.log(`No user found with email ${email} in Auth0`);
      return;
    }

    const userId = users[0].user_id;

    // Delete user
    const deleteResponse = await fetch(
      `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );


    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete Auth0 user: ${deleteResponse.statusText}`);
    }

    console.log(`Successfully deleted Auth0 user: ${email}`);
  } catch (error) {
    console.error('Error deleting Auth0 user:', error);
    throw error;
  }
}

export function getMailosaurClient(): MailosaurClient {
  if (!MAILOSAUR_API_KEY) {
    throw new Error('MAILOSAUR_API_KEY environment variable is not set');
  }
  return new MailosaurClient(MAILOSAUR_API_KEY);
}

export function generateMailosaurEmail(): string {
  if (!MAILOSAUR_SERVER_ID) {
    throw new Error('MAILOSAUR_SERVER_ID environment variable is not set');
  }
  const randomId = Math.random().toString(36).substring(2, 15);
  return `test-${randomId}@${MAILOSAUR_SERVER_ID}.mailosaur.net`;
}

export async function getPasswordResetEmail(mailosaur: MailosaurClient, emailAddress: string): Promise<string> {
  if (!MAILOSAUR_SERVER_ID) {
    throw new Error('MAILOSAUR_SERVER_ID environment variable is not set');
  }

  const email = await mailosaur.messages.get(
    MAILOSAUR_SERVER_ID,
    {
      sentTo: emailAddress,
      subject: 'Reset your password'
    },
    { timeout: 60000,
      receivedAfter: new Date(Date.now()
    ) }
      // Wait up to 60 seconds for the email to arrive
  );

  if (!email) {
    throw new Error('No password reset email received');
  }
  
const resetLinkText = email.html?.links?.find(link =>
  typeof link.text === 'string' && link.text.includes('/u/reset-verify?ticket=')
)?.text;

if (!resetLinkText) {
  throw new Error('No password reset link text found in email');
}

return resetLinkText;
}

export async function getSignupConfirmationEmail(mailosaur: MailosaurClient, emailAddress: string): Promise<string> {
  if (!MAILOSAUR_SERVER_ID) {
    throw new Error('MAILOSAUR_SERVER_ID environment variable is not set');
  }

  const email = await mailosaur.messages.get(
    MAILOSAUR_SERVER_ID,
    {
      sentTo: emailAddress,
    },
    { timeout: 60000,
      receivedAfter: new Date(Date.now() - 5000)
    }
  );

  if (!email) {
    throw new Error('No signup confirmation email received');
  }

  const confirmationLinkText = email.html?.links?.find(link =>
    typeof link.text === 'string' && link.text.includes('/u/verify')
  )?.text;

  if (!confirmationLinkText) {
    throw new Error('No signup confirmation link found in email');
  }

  return confirmationLinkText;
}
