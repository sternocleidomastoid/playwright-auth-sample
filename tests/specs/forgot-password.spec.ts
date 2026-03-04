import { test } from '@playwright/test';
import { getPasswordResetEmailFromGmail } from '../../helpers/google';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { AuthenticatedPage } from '../pages/AuthenticatedPage';

const NEW_PASSWORD = 'NewPassword123!';

test('Complete forgot password flow with Gmail API verification', async ({ page }) => {
  const gmailTestEmail = process.env.GOOGLE_TEST_EMAIL || '';
  const resetRequestedAt = new Date();
  const homePage = new HomePage(page);
  const loginPage = new LoginPage(page);
  const forgotPasswordPage = new ForgotPasswordPage(page);
  const resetPasswordPage = new ResetPasswordPage(page);
  const authenticatedPage = new AuthenticatedPage(page);

  await homePage.goto();
  await homePage.clickLogin();
  await loginPage.goToForgotPassword();
  await forgotPasswordPage.expectLoaded();
  await forgotPasswordPage.requestReset(gmailTestEmail);

  const resetLink = await getPasswordResetEmailFromGmail(gmailTestEmail, resetRequestedAt);

  await resetPasswordPage.goto(resetLink);
  await resetPasswordPage.resetPassword(NEW_PASSWORD);
  await page.waitForTimeout(2000);
  await resetPasswordPage.expectResetSuccess();

  await homePage.goto();
  await homePage.clickLogin();
  await loginPage.fillCredentials(gmailTestEmail, NEW_PASSWORD);
  await page.screenshot({ path: 'test-results/forgot-password-gmail-before-login-submit.png', fullPage: true });
  await loginPage.submit();

  await authenticatedPage.expectAuthenticated();
  await page.screenshot({ path: 'test-results/forgot-password-gmail-after-login-submit.png', fullPage: true });
});
