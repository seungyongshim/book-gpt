import { useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { BookOpen, Users, Zap, Wand2 } from 'lucide-react';

interface StoryElement {
  bookSettings: {
    title: string;
    genre: string;
    theme: string;
    setting: string;
  };
  characters: {
    name: string;
    role: string;
    personality: string;
  }[];
  events: {
    title: string;
    description: string;
    importance: 'high' | 'medium' | 'low';
  }[];
}

export default function NovelGenerator() {
  const { sendMessage, setUserInput, isSending } = useChatStore();
  const [storyElements, setStoryElements] = useState<StoryElement>({
    bookSettings: {
      title: '',
      genre: '',
      theme: '',
      setting: ''
    },
    characters: [{ name: '', role: '', personality: '' }],
    events: [{ title: '', description: '', importance: 'medium' }]
  });

  const addCharacter = () => {
    setStoryElements(prev => ({
      ...prev,
      characters: [...prev.characters, { name: '', role: '', personality: '' }]
    }));
  };

  const removeCharacter = (index: number) => {
    setStoryElements(prev => ({
      ...prev,
      characters: prev.characters.filter((_, i) => i !== index)
    }));
  };

  const updateCharacter = (index: number, field: keyof StoryElement['characters'][0], value: string) => {
    setStoryElements(prev => ({
      ...prev,
      characters: prev.characters.map((char, i) => 
        i === index ? { ...char, [field]: value } : char
      )
    }));
  };

  const addEvent = () => {
    setStoryElements(prev => ({
      ...prev,
      events: [...prev.events, { title: '', description: '', importance: 'medium' }]
    }));
  };

  const removeEvent = (index: number) => {
    setStoryElements(prev => ({
      ...prev,
      events: prev.events.filter((_, i) => i !== index)
    }));
  };

  const updateEvent = (index: number, field: keyof StoryElement['events'][0], value: string | StoryElement['events'][0]['importance']) => {
    setStoryElements(prev => ({
      ...prev,
      events: prev.events.map((event, i) => 
        i === index ? { ...event, [field]: value } : event
      )
    }));
  };

  const updateBookSettings = (field: keyof StoryElement['bookSettings'], value: string) => {
    setStoryElements(prev => ({
      ...prev,
      bookSettings: { ...prev.bookSettings, [field]: value }
    }));
  };

  const generateNovel = async () => {
    const { bookSettings, characters, events } = storyElements;
    
    // Validate required fields
    if (!bookSettings.title || !bookSettings.genre || characters.every(c => !c.name) || events.every(e => !e.title)) {
      alert('제목, 장르, 최소 1명의 캐릭터, 최소 1개의 이벤트를 입력해주세요.');
      return;
    }

    // Generate comprehensive prompt for novel creation
    const prompt = `
당신은 전문 소설가입니다. 다음 요소들을 바탕으로 완전한 소설을 작성해주세요:

**소설 설정:**
- 제목: ${bookSettings.title}
- 장르: ${bookSettings.genre}
- 주제: ${bookSettings.theme || '미지정'}
- 배경: ${bookSettings.setting || '미지정'}

**등장인물:**
${characters.filter(c => c.name).map((char, i) => 
  `${i + 1}. ${char.name} - ${char.role || '역할 미지정'} (성격: ${char.personality || '미지정'})`
).join('\n')}

**주요 사건들:**
${events.filter(e => e.title).map((event, i) => 
  `${i + 1}. ${event.title} (중요도: ${event.importance})
   - ${event.description || '설명 없음'}`
).join('\n')}

**작성 요구사항:**
1. 완전한 소설 형태로 작성 (서론-전개-위기-절정-결말)
2. 각 장면을 생동감 있게 묘사
3. 캐릭터들의 대화와 심리 묘사 포함
4. 주요 사건들을 자연스럽게 연결
5. ${bookSettings.genre} 장르에 맞는 분위기와 스타일
6. 최소 5000자 이상의 완성된 소설

지금 바로 소설 작성을 시작해주세요.`;

    setUserInput(prompt);
    await sendMessage();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
          🎭 AI 소설 생성기
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          책 설정, 등장인물, 주요 사건을 입력하면 완전한 소설을 자동으로 생성합니다
        </p>
      </div>

      {/* Book Settings Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">책 설정</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              소설 제목 *
            </label>
            <input
              type="text"
              value={storyElements.bookSettings.title}
              onChange={(e) => updateBookSettings('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="예: 운명의 십자로"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              장르 *
            </label>
            <select
              value={storyElements.bookSettings.genre}
              onChange={(e) => updateBookSettings('genre', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">장르 선택</option>
              <option value="로맨스">로맨스</option>
              <option value="미스터리">미스터리</option>
              <option value="판타지">판타지</option>
              <option value="SF">SF</option>
              <option value="추리">추리</option>
              <option value="스릴러">스릴러</option>
              <option value="드라마">드라마</option>
              <option value="역사소설">역사소설</option>
              <option value="청춘">청춘</option>
              <option value="가족">가족</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              주제
            </label>
            <input
              type="text"
              value={storyElements.bookSettings.theme}
              onChange={(e) => updateBookSettings('theme', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="예: 사랑과 희생, 성장과 용기"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              배경 설정
            </label>
            <input
              type="text"
              value={storyElements.bookSettings.setting}
              onChange={(e) => updateBookSettings('setting', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="예: 19세기 런던, 현대 서울, 마법의 왕국"
            />
          </div>
        </div>
      </div>

      {/* Characters Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-500" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">등장인물</h2>
          </div>
          <button
            onClick={addCharacter}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            + 인물 추가
          </button>
        </div>

        <div className="space-y-4">
          {storyElements.characters.map((character, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  이름 *
                </label>
                <input
                  type="text"
                  value={character.name}
                  onChange={(e) => updateCharacter(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="캐릭터 이름"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  역할
                </label>
                <input
                  type="text"
                  value={character.role}
                  onChange={(e) => updateCharacter(index, 'role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="주인공, 조연, 악역 등"
                />
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={character.personality}
                  onChange={(e) => updateCharacter(index, 'personality', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="성격 특징"
                />
                {storyElements.characters.length > 1 && (
                  <button
                    onClick={() => removeCharacter(index)}
                    className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Events Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">주요 사건</h2>
          </div>
          <button
            onClick={addEvent}
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
          >
            + 사건 추가
          </button>
        </div>

        <div className="space-y-4">
          {storyElements.events.map((event, index) => (
            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    사건 제목 *
                  </label>
                  <input
                    type="text"
                    value={event.title}
                    onChange={(e) => updateEvent(index, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="사건 제목"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    중요도
                  </label>
                  <select
                    value={event.importance}
                    onChange={(e) => updateEvent(index, 'importance', e.target.value as StoryElement['events'][0]['importance'])}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="low">낮음</option>
                    <option value="medium">보통</option>
                    <option value="high">높음</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  {storyElements.events.length > 1 && (
                    <button
                      onClick={() => removeEvent(index)}
                      className="w-full px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  상세 설명
                </label>
                <textarea
                  value={event.description}
                  onChange={(e) => updateEvent(index, 'description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="사건에 대한 자세한 설명을 입력하세요..."
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <div className="text-center">
        <button
          onClick={generateNovel}
          disabled={isSending}
          className="px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-3 mx-auto"
        >
          <Wand2 className="w-6 h-6" />
          {isSending ? '소설 생성 중...' : '✨ 소설 생성하기'}
        </button>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          생성 버튼을 누르면 채팅창에서 소설이 실시간으로 생성됩니다
        </p>
      </div>
    </div>
  );
}