/**
 * Clipboard utility functions
 * Eliminates duplication of clipboard copy logic with fallback support
 */

export interface ClipboardResult {
  success: boolean;
  error?: string;
}

/**
 * Copy text to clipboard with modern API and fallback support
 */
export async function copyToClipboard(text: string): Promise<ClipboardResult> {
  // Try modern clipboard API first
  try {
    await navigator.clipboard.writeText(text);
    console.log('텍스트가 클립보드에 복사되었습니다.');
    return { success: true };
  } catch (error) {
    console.error('Modern clipboard API failed:', error);
  }

  // Fallback to older execCommand method
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (successful) {
      console.log('폴백 방법으로 클립보드에 복사되었습니다.');
      return { success: true };
    } else {
      throw new Error('execCommand failed');
    }
  } catch (fallbackError) {
    const errorMessage = `클립보드 복사 실패: ${fallbackError}`;
    console.error(errorMessage);
    return { 
      success: false, 
      error: errorMessage 
    };
  }
}