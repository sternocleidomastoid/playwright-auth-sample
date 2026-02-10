import { test, expect } from '@playwright/test';
import { getTigrmailClient, deleteInbox, deleteAuth0User, TEST_EMAIL, SIGNUP_PASSWORD, NEW_PASSWORD } from './testHelpers';

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

test('Complete signup flow using tigrmail', async ({ page }) => {
  const tigrClient = getTigrmailClient();
  const tigrmailEmail = await tigrClient.createEmailAddress();

  try {
    await page.goto('/');
    await page.click('button:has-text("LOG IN")');
    await page.click('a:has-text("Sign up")');
    await page.waitForURL(/.*signup.*/, { timeout: 5000 });

    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('text=/^Sign Up to/')).toBeVisible();

    await page.locator('input[name="email"]').fill(tigrmailEmail);
    await page.locator('input[name="password"]').fill(SIGNUP_PASSWORD);
    await page.locator('button[type="submit"][name="action"]').click();
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Welcome')).toBeVisible();
  } finally {
    // Clean up: delete Auth0 user and temporary inbox even if test fails
    await deleteAuth0User(tigrmailEmail);
    await deleteInbox(tigrClient, tigrmailEmail);
  }
});

test.skip('Complete forgot password flow with email verification', async ({ page }) => {
  const tigr = getTigrmailClient();

  await page.goto('/');
  await page.click('button:has-text("LOG IN")');
  await page.click('a:has-text("Forgot password?")');
  await page.waitForURL(/.*forgot.*|.*reset.*/, { timeout: 5000 });

  await page.locator('input[name="email"]').fill(TEST_EMAIL);
  await page.locator('button[type="submit"][name="action"][value="default"]').click();

  const message = await tigr.pollNextMessage({ inbox: TEST_EMAIL });
  if (!message) {
    throw new Error('No password reset email received');
  }

  const resetLink = message.body?.match(/https?:\/\/[^\s]*reset-verify[^\s]*/)?.[ 0];
  if (!resetLink) {
    throw new Error('No password reset link found in email');
  }

  await page.goto(resetLink);

  await page.locator('input[id="password-reset"]').fill(NEW_PASSWORD);
  await page.locator('input[id="re-enter-password"]').fill(NEW_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);

  await expect(page.locator('text=/password.*Changed.*successful/i')).toBeVisible({ timeout: 10000 });

  await page.goto('/');
  await page.click('button:has-text("LOG IN")');
  await page.locator('input[name="username"]').fill(TEST_EMAIL);
  await page.locator('input[name="password"]').fill(NEW_PASSWORD);
  await page.locator('button[type="submit"][name="action"]').click();

  await expect(page.locator('text=Successfully authenticated!')).toBeVisible();
});

// REfactor by operations
// further separate test filed functional vs UI inspections
// Explore mailosaur
// Variables, secrets and environment management
// Explore signup teardown , e.g. disable/deactive user in AUth0
// Effect of increasing number of users in test tenants