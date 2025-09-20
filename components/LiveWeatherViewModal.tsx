import React, { useState, useEffect } from 'react';
import type { WeatherSource } from '../types';
import Modal from './common/Modal';

// Helper to convert YouTube watch URL to embed URL
const getYouTubeEmbedUrl = (url: string): string | null => {
  let videoId = null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
      videoId = urlObj.searchParams.get('v');
    } else if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.substring(1);
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
  } catch (error) {
    console.error("Invalid URL:", error);
    return null;
  }
};

// Helper to truncate text
const truncate = (text: string, length: number): string => {
  if (text.length <= length) return text;
  return text.substring(0, length);
};

interface LiveWeatherViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: WeatherSource[];
}

const LiveWeatherViewModal: React.FC<LiveWeatherViewModalProps> = ({ isOpen, onClose, sources }) => {
  const [activeSource, setActiveSource] = useState<WeatherSource | null>(null);

  useEffect(() => {
    // Set the first source as active when the modal opens or if sources change
    if (isOpen && sources.length > 0) {
      if (!activeSource || !sources.find(s => s.id === activeSource.id)) {
        setActiveSource(sources[0]);
      }
    } else if (!isOpen) {
      setActiveSource(null); // Reset when closed
    }
  }, [isOpen, sources, activeSource]);

  const embedUrl = activeSource ? getYouTubeEmbedUrl(activeSource.youtubeUrl) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="실시간 날씨 영상">
      <div className="flex flex-col h-[70vh] max-h-[600px]">
        {sources.length > 0 ? (
          <>
            {/* Menu Bar */}
            <nav className="flex items-center space-x-2 border-b pb-3 mb-4 overflow-x-auto">
              {sources.map(source => (
                <button
                  key={source.id}
                  onClick={() => setActiveSource(source)}
                  className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors flex-shrink-0 ${
                    activeSource?.id === source.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {truncate(source.title, 5)}
                </button>
              ))}
            </nav>

            {/* Video Player */}
            <div className="flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center">
              {embedUrl ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={embedUrl}
                  title={activeSource?.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <p className="text-white">유효하지 않은 유튜브 주소입니다.</p>
              )}
            </div>
            {activeSource && <p className="text-center text-sm text-gray-600 mt-2 font-semibold">{activeSource.title}</p>}
          </>
        ) : (
          <div className="text-center py-10 text-gray-500">
            <p>표시할 날씨 정보 소스가 없습니다.</p>
            <p className="text-xs mt-1">먼저 날씨 정보 소스를 추가해주세요.</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default LiveWeatherViewModal;