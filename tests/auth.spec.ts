import { test, expect, type Page } from '@playwright/test';
import { getTigrmailClient, deleteInbox, getMailosaurClient, getPasswordResetEmail, getSignupConfirmationEmail, generateMailosaurEmail, TEST_EMAIL, SIGNUP_PASSWORD, NEW_PASSWORD } from './testHelpers';
import { getPasswordResetEmailFromGmail } from './google';

const signupTestEmail = process.env.GOOGLE_TEST_EMAIL || '';
const gmailUiEmail = process.env.GMAIL_UI_EMAIL || signupTestEmail;
const gmailUiPassword = process.env.GMAIL_UI_PASSWORD || '';

async function loginToGmail(page: Page, email: string, password: string): Promise<void> {
  await page.goto('https://mail.google.com/');

  const inboxLoaded = page.locator('input[aria-label="Search mail"]');
  if (await inboxLoaded.isVisible().catch(() => false)) {
    return;
  }

  const useAnotherAccount = page.locator('button:has-text("Use another account")').first();
  if (await useAnotherAccount.isVisible().catch(() => false)) {
    await useAnotherAccount.click();
  }

  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toBeVisible({ timeout: 30000 });
  await emailInput.fill(email);
  await page.locator('button:has-text("Next")').click();

  const passwordInput = page.locator('input[type="password"]');
  await expect(passwordInput).toBeVisible({ timeout: 30000 });
  await passwordInput.fill(password);
  await page.locator('button:has-text("Next")').click();

  await expect(inboxLoaded).toBeVisible({ timeout: 90000 });
}

async function openVerificationEmail(page: Page): Promise<void> {
  const deadline = Date.now() + 180000;

  while (Date.now() < deadline) {
    await page.goto('https://mail.google.com/mail/u/0/#inbox');

    const verificationRow = page
      .locator('tr.zA')
      .filter({ hasText: /verify|verification|confirm/i })
      .first();

    if (await verificationRow.count()) {
      await verificationRow.click();
      return;
    }

    await page.waitForTimeout(10000);
  }

  throw new Error('Verification email was not received within 3 minutes');
}

async function clickVerificationLink(page: Page): Promise<void> {
  const verificationLink = page
    .locator('a[href*="/u/verify"], a[href*="/u/email-verification"], a:has-text("Verify"), a:has-text("Confirm")')
    .first();

  await expect(verificationLink).toBeVisible({ timeout: 30000 });

  const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
  await verificationLink.click();
  const popup = await popupPromise;
  const verificationPage = popup ?? page;

  await verificationPage.waitForLoadState('domcontentloaded');
  await expect(
    verificationPage.locator('text=/verified|confirmed|success/i').first()
  ).toBeVisible({ timeout: 20000 });
}

test.skip('Load web app successfully', async ({ page }) => {
  await page.goto('/');
  expect(page).toHaveURL(new RegExp(process.env.BASE_URL || 'localhost:5173'));
  await expect(page).toHaveTitle(/./);
  await expect(page.locator('text=Get started by signing in to your account')).toBeVisible();
});

test.skip('Click LOG IN button and verify login page loads', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("LOG IN")');
  await expect(page.locator('input[name="username"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"][name="action"]')).toBeVisible();
});

test.skip('Login with valid credentials', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("LOG IN")');
  await page.locator('input[name="username"]').fill(process.env.LOGIN_USERNAME!);
  await page.locator('input[name="password"]').fill(process.env.LOGIN_PASSWORD!);
  await page.locator('button[type="submit"][name="action"]').click();
  await page.waitForURL(/.*/, { timeout: 5000 });
  await expect(page.locator('text=Successfully authenticated!')).toBeVisible();
});

test('Complete signup flow', async ({ page }) => {
  const gmailTestEmail = process.env.GOOGLE_TEST_EMAIL || '';
  const gmailSignUpPassword = process.env.SIGNUP_PASSWORD || '';

  await page.goto('/');
  await page.click('button:has-text("LOG IN")');
  await page.click('a:has-text("Sign up")');
  await page.waitForURL(/.*signup.*/, { timeout: 5000 });

  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.locator('text=/^Sign Up to/')).toBeVisible();

  await page.locator('input[name="email"]').fill(gmailTestEmail);
  await page.locator('input[name="password"]').fill(gmailSignUpPassword);
  await page.locator('button[type="submit"][name="action"]').click();
  await page.waitForTimeout(2000);

  await expect(page.locator('text=Successfully authenticated!')).toBeVisible();

});

test('Complete forgot password flow with Gmail API verification', async ({ page }) => {
  const gmailTestEmail = process.env.GOOGLE_TEST_EMAIL || '';
  const resetRequestedAt = new Date();

  await page.goto('/');
  await page.click('button:has-text("LOG IN")');
  await page.click('a:has-text("Forgot password?")');
  await page.waitForURL(/.*forgot.*|.*reset.*/, { timeout: 5000 });

  await page.locator('input[name="email"]').fill(gmailTestEmail);
  await page.locator('button[type="submit"][name="action"][value="default"]').click();

  const resetLink = await getPasswordResetEmailFromGmail(gmailTestEmail, resetRequestedAt);

  await page.goto(resetLink);

  await page.locator('input[id="password-reset"]').fill(NEW_PASSWORD);
  await page.locator('input[id="re-enter-password"]').fill(NEW_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);

  await expect(page.locator('text=/password.*Changed.*successful/i')).toBeVisible({ timeout: 10000 });

  await page.goto('/');
  await page.click('button:has-text("LOG IN")');
  await page.locator('input[name="username"]').fill(gmailTestEmail);
  await page.locator('input[name="password"]').fill(NEW_PASSWORD);
  await page.screenshot({ path: 'test-results/forgot-password-gmail-before-login-submit.png', fullPage: true });
  
  await page.locator('button[type="submit"][name="action"]').click();

  await expect(page.locator('text=Successfully authenticated!')).toBeVisible();
    await page.screenshot({ path: 'test-results/forgot-password-gmail-after-login-submit.png', fullPage: true });
});

// REfactor by operations
// further separate test filed functional vs UI inspections
// Variables, secrets and environment management
// Explore signup teardown , e.g. disable/deactive user in AUth0