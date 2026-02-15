import { test, expect } from '@playwright/test';

test.describe('SpeakOps Smoke Test', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('AI Agents');
    await expect(page.locator('text=Continue with Google')).toBeVisible();
  });

  test('should navigate through dashboard', async ({ page }) => {
    // With dev bypass, we should go straight to dashboard if we hit it
    await page.goto('/dashboard');
    
    // If no agents, it redirects to /create-agent
    await page.waitForURL(url => url.pathname === '/dashboard' || url.pathname === '/create-agent', { timeout: 10000 });
    
    // Check for theme toggle (present on all pages with sidebar)
    await expect(page.locator('button[aria-label*="theme"]')).toBeVisible();
  });

  test('should open strategy session', async ({ page }) => {
    await page.goto('/assistant');
    await expect(page.locator('text=Business Assistant')).toBeVisible();
    await expect(page.locator('text=New Strategy Session')).toBeVisible();
  });

  test('should load knowledge base', async ({ page }) => {
    await page.goto('/documents');
    await expect(page.locator('text=Knowledge Base')).toBeVisible();
    await expect(page.locator('text=Add Documents')).toBeVisible();
  });

  test('should load agent creation page', async ({ page }) => {
    await page.goto('/create-agent');
    await expect(page.locator('text=Create Your AI Agent')).toBeVisible();
    await expect(page.locator('label:has-text("Agent Name")')).toBeVisible();
  });
});
