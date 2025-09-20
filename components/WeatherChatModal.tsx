import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import type { WeatherSource, WeatherCardData } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import AddWeatherSourceModal from './AddWeatherSourceModal';
import WeatherSourceListModal from './WeatherSourceListModal';
import WeatherCard from './WeatherCard';
import LiveWeatherViewModal from './LiveWeatherViewModal';

// The API key is sourced from the environment variable `process.env.API_KEY`.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Utility to convert image URL to a base64 part for Gemini API
async function urlToGenerativePart(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const mimeType = blob.type;
  if (!mimeType.startsWith('image/')) {
    throw new Error('URL does not point to a valid image.');
  }
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return {
    inlineData: {
      mimeType,
      data: base64
    }
  };
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  weatherCard?: WeatherCardData;
}

interface WeatherChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  weatherSources: WeatherSource[];
  onSaveSource: (data: Omit<WeatherSource, 'id'> & { id?: string }) => void;
  onDeleteSource: (id: string) => void;
}

const WeatherChatModal: React.FC<WeatherChatModalProps> = ({ isOpen, onClose, weatherSources, onSaveSource, onDeleteSource }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isLiveViewOpen, setIsLiveViewOpen] = useState(false);
  const [sourceToEdit, setSourceToEdit] = useState<WeatherSource | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    if (isOpen && !chat) {
        const systemInstruction = `You are '제주실시간날씨전용챗봇', a specialized AI assistant for providing real-time weather information for Jeju Island based on a list of live YouTube streams.
- Your answers MUST be in Korean.
- Your primary function is to answer questions about the current weather at specific locations in Jeju.
- You are given a list of available live camera locations. This is your ONLY source of truth.
- **CRITICAL RULE**: When a user asks about the weather in a specific location that is on your list (e.g., "한라산 날씨 어때?", "성산읍은 지금 비 와?"), you MUST respond with ONLY a JSON object in a markdown code block.
- The JSON object must have a single key "weatherInquiry", containing an object with two keys:
    1. "sourceId": The 'id' of the matching weather source from the provided list.
    2. "responseText": A brief, engaging sentence acknowledging the user's request. For example: "네, 한라산의 현재 날씨를 실시간 영상으로 확인해 드릴게요. 잠시만 기다려주세요..."
- **Example JSON Response**:
\`\`\`json
{
  "weatherInquiry": {
    "sourceId": "ws_1",
    "responseText": "네, 한라산의 현재 날씨를 실시간 영상으로 분석해 보여드릴게요!"
  }
}
\`\`\`
- If a user asks about a location NOT on your list, you MUST state that you do not have real-time information for that specific place and then list the locations you DO have information for. For example: "죄송하지만, OOO 지역의 실시간 정보는 가지고 있지 않아요. 현재 확인 가능한 지역은 한라산, 성산읍, ... 입니다."
- For general conversation, respond naturally in plain text. DO NOT use JSON.`;

        const newChat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: { systemInstruction }
        });
        setChat(newChat);
        setMessages([
            { role: 'ai', content: '안녕하세요! 제주 실시간 날씨 챗봇입니다. 알고 싶은 지역의 날씨를 물어보세요. (예: 한라산 날씨 어때?)' }
        ]);
    }
  }, [isOpen, chat]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !chat) return;

    const userMessage: Message = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsLoading(true);

    const context = `
# AVAILABLE REAL-TIME CAMERA LOCATIONS
This is the only data you can use to answer questions about current weather conditions.

\`\`\`json
${JSON.stringify(weatherSources.map(s => ({ id: s.id, title: s.title })), null, 2)}
\`\`\`

# USER'S QUESTION
${currentInput}
    `;

    try {
        const stream = await chat.sendMessageStream({ message: context });
        
        let fullResponseText = '';
        // Add a temporary AI message that will be filled by the stream
        setMessages(prev => [...prev, { role: 'ai', content: '' }]);

        for await (const chunk of stream) {
            fullResponseText += chunk.text;
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.role === 'ai') {
                    lastMessage.content = fullResponseText;
                }
                return newMessages;
            });
        }

        // After stream, parse the full response for the JSON command
        const jsonMatch = fullResponseText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            try {
                const parsedJson = JSON.parse(jsonMatch[1]);
                if (parsedJson.weatherInquiry) {
                    const { sourceId, responseText } = parsedJson.weatherInquiry;
                    const source = weatherSources.find(s => s.id === sourceId);
                    if (source) {
                        // 1. Replace the streamed message with the introductory text
                        // 2. Add a new message with the WeatherCard component
                        setMessages(prev => {
                            const updatedMessages = [...prev];
                            updatedMessages[updatedMessages.length - 1] = { role: 'ai', content: responseText };
                            
                            const weatherCardData: WeatherCardData = {
                                status: 'analyzing',
                                sourceTitle: source.title,
                                imageUrl: 'https://i.imgur.com/gT3gA2t.png',
                                weatherData: {
                                    temp: '15°C',
                                    humidity: '60%',
                                    wind: '3m/s'
                                }
                            };
                            updatedMessages.push({ role: 'ai', content: '', weatherCard: weatherCardData });
                            return updatedMessages;
                        });
                    }
                }
            } catch (e) {
                console.error("Failed to parse JSON from weather AI:", e);
                // The message already contains the raw text, which is a good fallback.
            }
        }
    } catch (error) {
        console.error("Weather chat error:", error);
        setMessages(prev => {
             const newMessages = [...prev];
             const lastMessage = newMessages[newMessages.length - 1];
             if (lastMessage && lastMessage.role === 'ai' && lastMessage.content === '') {
                lastMessage.content = '죄송합니다, 답변을 가져오는 중 오류가 발생했습니다.';
             } else {
                newMessages.push({ role: 'ai', content: '죄송합니다, 답변을 가져오는 중 오류가 발생했습니다.' });
             }
             return newMessages;
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handleWeatherCardComplete = async (source: WeatherCardData) => {
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'ai', content: '' }]);

    try {
        const imagePart = await urlToGenerativePart(source.imageUrl);
        const textPart = {
            text: `당신은 제주도 전문 기상 캐스터입니다. 이 CCTV 이미지는 '${source.sourceTitle}' 지역의 실시간 영상입니다. 이미지를 보고 현재 날씨(하늘 상태, 구름, 안개, 비/눈 여부 등)를 상세하고 생생하게 브리핑해주세요.`
        };

        const response = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });
        
        let fullResponseText = '';
        for await (const chunk of response) {
            fullResponseText += chunk.text;
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.role === 'ai') {
                    lastMessage.content = fullResponseText;
                }
                return newMessages;
            });
        }
    } catch (error) {
        console.error("Image analysis error:", error);
         setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'ai') {
                lastMessage.content = '죄송합니다, 이미지 분석 중 오류가 발생했습니다.';
            }
            return newMessages;
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setSourceToEdit(null);
    setIsAddModalOpen(true);
  };
  
  const handleOpenEditModal = (source: WeatherSource) => {
    setSourceToEdit(source);
    setIsListModalOpen(false); // Close list modal
    setIsAddModalOpen(true); // Open edit modal
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="제주실시간날씨전용챗봇">
        <div className="flex flex-col h-[70vh] max-h-[600px]">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b gap-y-2">
            <h4 className="text-lg font-semibold text-gray-700">정보 소스 관리</h4>
            <div className="flex space-x-2 flex-wrap justify-end gap-y-2">
              <Button onClick={() => setIsListModalOpen(true)} variant="secondary">목록 보기 및 편집</Button>
              <Button onClick={handleOpenAddModal} size="normal">
                유튜브 주소 입력하기
              </Button>
              <Button 
                onClick={() => setIsLiveViewOpen(true)} 
                className="bg-sky-500 text-white hover:bg-sky-600 focus:ring-sky-400"
              >
                유튜브로 실시간 날씨보기
              </Button>
            </div>
          </header>
          
          <main className="flex-1 my-4 p-2 overflow-y-auto bg-gray-100 rounded-lg">
            <div className="space-y-4 p-2">
              {messages.map((msg, index) => (
                <div key={index}>
                    {msg.role === 'user' ? (
                        <div className="flex items-end gap-2 justify-end">
                            <div className="px-4 py-2 rounded-2xl max-w-xs md:max-w-sm break-words bg-indigo-600 text-white rounded-br-none">
                                {msg.content}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-end gap-2 justify-start">
                            <div className="max-w-xs md:max-w-sm w-full">
                                {msg.content && (
                                    <div className="px-4 py-2 rounded-2xl break-words bg-white text-gray-800 border rounded-bl-none mb-2">
                                        {msg.content}
                                        {isLoading && index === messages.length - 1 && !msg.weatherCard && <span className="inline-block w-2 h-4 ml-1 bg-gray-600 animate-pulse"></span>}
                                    </div>
                                )}
                                {msg.weatherCard && <WeatherCard initialData={msg.weatherCard} onComplete={() => handleWeatherCardComplete(msg.weatherCard!)} />}
                            </div>
                        </div>
                    )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </main>

          <footer className="pt-2 border-t">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="날씨에 대해 물어보세요..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isLoading}
              />
              <Button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()} className="rounded-full !px-4 !py-2">
                전송
              </Button>
            </div>
          </footer>
        </div>
      </Modal>

      <WeatherSourceListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        sources={weatherSources}
        onEdit={handleOpenEditModal}
        onDelete={onDeleteSource}
      />

      <AddWeatherSourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={onSaveSource}
        initialData={sourceToEdit}
      />
      
      <LiveWeatherViewModal
        isOpen={isLiveViewOpen}
        onClose={() => setIsLiveViewOpen(false)}
        sources={weatherSources}
      />
    </>
  );
};

export default WeatherChatModal;