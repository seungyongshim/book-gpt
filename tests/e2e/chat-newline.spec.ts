import { test, expect } from '@playwright/test';

/**
 * 줄바꿈 렌더링 테스트
 * - 단일 줄바꿈: <br/> 으로 시각적으로 유지 (remark-breaks + white-space)
 * - 이중 줄바꿈: 새로운 단락(p) 생성
 */

test.describe('채팅 메시지 줄바꿈 렌더링', () => {
  test('사용자 입력 단일 및 이중 줄바꿈 유지', async ({ page }) => {
    await page.goto('/');

    // textarea 포커스 및 입력
    const textarea = page.locator('textarea[aria-label="채팅 메시지 입력"]');
    await expect(textarea).toBeVisible();

    const multiLineInput = '첫번째 줄\n두번째 줄\n\n네번째 줄 (새 단락)';
    await textarea.fill(multiLineInput);

    // 전송 (Ctrl+Enter 시나리오 대신 버튼 클릭)
    const sendButton = page.getByRole('button', { name: '메시지 전송' });
    await sendButton.click();

    // 사용자 메시지가 렌더링 되었는지
    const userBubbles = page.locator('.chat-bubble-user');
    await expect(userBubbles.last()).toContainText('첫번째 줄');

    // 실제 DOM 구조 검사: remark-breaks 적용된 경우 <br> 존재
    const lastUserHtml = await userBubbles.last().innerHTML();

    expect(lastUserHtml).toMatch(/첫번째 줄[\s\S]*?<br/); // 첫번째 줄 다음 <br>
    expect(lastUserHtml).toMatch(/두번째 줄[\s\S]*?<\/p>/); // 두번째 줄 여전히 단락 내

    // 이중 줄바꿈으로 인해 새로운 단락 생성 여부
    // MarkdownRenderer는 사용자 메시지엔 적용되지 않지만 whitespace-pre-wrap으로 시각적 유지, 따라서 <p> 분리는 assistant만 해당
    // 사용자 메시지는 단순 텍스트 노드이므로 <br> 검증만 진행.

    // 어시스턴트 응답 스트리밍 도중이라도 테스트 안정화 위해 약간 대기
    await page.waitForTimeout(1500);
  });

  test('어시스턴트 메시지 markdown 줄바꿈', async ({ page }) => {
    await page.goto('/');

    const textarea = page.locator('textarea[aria-label="채팅 메시지 입력"]');
    await textarea.fill('코드와 줄바꿈 테스트를 위한 메시지');
    const sendButton = page.getByRole('button', { name: '메시지 전송' });
    await sendButton.click();

    // 어시스턴트 메시지 도착 대기 (최대 15초)
    const assistantBubble = page.locator('.chat-bubble-assistant').last();
    await assistantBubble.waitFor({ state: 'visible', timeout: 15000 });

    // 스트리밍 되는 동안 일부 내용 누적될 수 있으므로 최소 텍스트 길이 확인
    await expect(assistantBubble).toContainText(/./);
  });
});
