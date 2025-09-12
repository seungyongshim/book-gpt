import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createElement } from 'react';
import NovelGenerator from '../NovelGenerator';

// Mock the chat store
const mockSendMessage = vi.fn();
const mockSetUserInput = vi.fn();

vi.mock('../../../stores/chatStore', () => ({
  useChatStore: () => ({
    sendMessage: mockSendMessage,
    setUserInput: mockSetUserInput,
    isSending: false
  })
}));

describe('NovelGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the novel generator interface', () => {
    render(createElement(NovelGenerator));
    
    expect(screen.getByText('🎭 AI 소설 생성기')).toBeInTheDocument();
    expect(screen.getByText('책 설정, 등장인물, 주요 사건을 입력하면 완전한 소설을 자동으로 생성합니다')).toBeInTheDocument();
  });

  it('renders all required input sections', () => {
    render(createElement(NovelGenerator));
    
    // Check for main sections
    expect(screen.getByText('책 설정')).toBeInTheDocument();
    expect(screen.getByText('등장인물')).toBeInTheDocument();
    expect(screen.getByText('주요 사건')).toBeInTheDocument();
    
    // Check for required fields
    expect(screen.getByText('소설 제목 *')).toBeInTheDocument();
    expect(screen.getByText('장르 *')).toBeInTheDocument();
  });

  it('validates required fields before generation', () => {
    render(createElement(NovelGenerator));
    
    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    // Try to generate without required fields
    const generateButton = screen.getByText('✨ 소설 생성하기');
    fireEvent.click(generateButton);
    
    expect(alertSpy).toHaveBeenCalledWith('제목, 장르, 최소 1명의 캐릭터, 최소 1개의 이벤트를 입력해주세요.');
    expect(mockSendMessage).not.toHaveBeenCalled();
    
    alertSpy.mockRestore();
  });
});