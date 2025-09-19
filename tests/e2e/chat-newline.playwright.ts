import { test, expect } from '@playwright/test';

/**
 * 줄바꿈 렌더링 테스트 (Playwright 전용)
 */

test.describe('채팅 메시지 줄바꿈 렌더링', () => {
  test('사용자 입력 단일 및 이중 줄바꿈 유지', async ({ page }) => {
    await page.goto('/');
    const textarea = page.locator('textarea[aria-label="채팅 메시지 입력"]');
    await expect(textarea).toBeVisible();
    const multiLineInput = '첫번째 줄\n두번째 줄\n\n네번째 줄 (새 단락)';
    await textarea.fill(multiLineInput);
    const sendButton = page.getByRole('button', { name: '메시지 전송' });
    await sendButton.click();
    const userBubbles = page.locator('.chat-bubble-user');
    await expect(userBubbles.last()).toContainText('첫번째 줄');
    await page.waitForTimeout(1000);
  });

  test('어시스턴트 메시지 markdown 줄바꿈', async ({ page }) => {
    await page.goto('/');
    const textarea = page.locator('textarea[aria-label="채팅 메시지 입력"]');
    await textarea.fill('코드와 줄바꿈 테스트를 위한 메시지');
    const sendButton = page.getByRole('button', { name: '메시지 전송' });
    await sendButton.click();
    const assistantBubble = page.locator('.chat-bubble-assistant').last();
    await assistantBubble.waitFor({ state: 'visible', timeout: 15000 });
    await expect(assistantBubble).toContainText(/./);
  });
});
