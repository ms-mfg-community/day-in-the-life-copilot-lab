import { test, expect } from '@playwright/test';

test.describe('Students UI', () => {
  test('list page renders seeded students', async ({ page }) => {
    await page.goto('/students');
    await expect(page.getByRole('heading', { name: /students/i })).toBeVisible();
    // Seed includes Carson, Alexander, Anand at minimum.
    await expect(page.getByText('Alexander')).toBeVisible();
  });

  test('create form adds a new student', async ({ page }) => {
    await page.goto('/students');
    await page.getByRole('link', { name: /create new/i }).click();
    await page.getByLabel(/first/i).fill('Marie');
    await page.getByLabel(/last/i).fill('Curie');
    await page.getByLabel(/enrollment/i).fill('2024-09-01');
    await page.getByRole('button', { name: /create|save/i }).click();
    await expect(page).toHaveURL(/\/students/);
    await expect(page.getByText('Curie')).toBeVisible();
  });

  test('navigation to courses works', async ({ page }) => {
    await page.goto('/students');
    await page.getByRole('link', { name: /courses/i }).first().click();
    await expect(page).toHaveURL(/\/courses/);
  });
});
