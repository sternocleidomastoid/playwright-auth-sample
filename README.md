# Playwright Sample

A simple Playwright test suite to load and test a web application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. The `.env` file contains the base URL:
```
BASE_URL=http://localhost:5173/
```

For Gmail-based forgot-password verification, also set:
```
GOOGLE_TEST_EMAIL=your-test-inbox@gmail.com
GOOGLE_CLI_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLI_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_CLI_REFRESH_TOKEN=your-google-oauth-refresh-token
GMAIL_UI_EMAIL=your-test-inbox@gmail.com
GMAIL_UI_PASSWORD=your-gmail-password
```

The Gmail helper exchanges `GOOGLE_CLI_CLIENT_ID` and `GOOGLE_CLI_CLIENT_SECRET` + `GOOGLE_CLI_REFRESH_TOKEN`
for an access token at runtime, then polls Gmail API for the password reset email.

To generate `GOOGLE_CLI_REFRESH_TOKEN` the first time:

1. Ensure `GOOGLE_CLI_CLIENT_ID` and one of `GOOGLE_CLI_CLIENT_SECRET` or `GOOGLE_CLIE_CLIENT_SECRET` are set in `.env`.
2. Add this redirect URI to your Google OAuth client: `http://localhost:53682/oauth2callback`.
3. (Optional) Override callback settings using `GOOGLE_CLI_REDIRECT_URI` or `GOOGLE_CLI_CALLBACK_PORT`.
4. Run:
```bash
npm run google:refresh-token
```
5. Open the printed consent URL, authenticate, and grant access.
6. The script captures the auth code automatically on localhost and prints `GOOGLE_CLI_REFRESH_TOKEN=...`.
7. Copy that value into `.env`.

If no refresh token is returned, revoke app consent for that Google account and run the script again.

## Running Tests

```bash
npm test
```

Or run with UI:
```bash
npm run test:ui
```

Or debug:
```bash
npm run test:debug
```
