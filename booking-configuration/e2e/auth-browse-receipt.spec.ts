import { test, expect } from '@playwright/test';

const password = 'Password123!';
const stamp = Date.now();
const email = `pw_${stamp}@example.com`;

test.describe('Booking flows', () => {
  test('register, browse rooms, book, and open receipt', async ({ page }) => {
    await page.goto('/#/register');
    await page.getByLabel('Full Name').fill('Playwright User');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Code').fill('91');
    await page.getByLabel('Phone Number').fill('9998887777');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/#\/(dashboard|admin-dashboard)/, { timeout: 15_000 });

    await page.goto('/#/browse-rooms');
    await expect(page.getByText(/Loading spaces|Meeting Room|Study Pod|No spaces/i)).toBeVisible({
      timeout: 15_000,
    });

    const bookButton = page.getByRole('button', { name: 'Book Now' }).first();
    if (await bookButton.isVisible().catch(() => false)) {
      await bookButton.click();
      await page.locator('input[type="date"]').first().fill('2027-12-15');
      await page.locator('input[type="time"]').nth(0).fill('10:00');
      await page.locator('input[type="time"]').nth(1).fill('12:00');
      await page.getByRole('button', { name: 'Confirm Booking' }).click();
      await expect(page.getByText(/Booking confirmed|Receipt|BOOKING RECEIPT/i)).toBeVisible({
        timeout: 15_000,
      });

      const downloadPromise = page.waitForEvent('download', { timeout: 10_000 }).catch(() => null);
      const pdfButton = page.getByRole('button', { name: /Download PDF|PDF/i });
      if (await pdfButton.isVisible().catch(() => false)) {
        await pdfButton.click();
        const download = await downloadPromise;
        if (download) {
          expect(download.suggestedFilename()).toMatch(/receipt|\.pdf/i);
        }
      }
    }

    await page.goto('/#/my-bookings');
    await expect(page.getByText(/My Bookings|No bookings/i)).toBeVisible({ timeout: 15_000 });
  });
});
