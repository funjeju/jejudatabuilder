import React, { useState, useEffect } from 'react';
import Modal from './common/Modal';
import Input from './common/Input';
import Button from './common/Button';
import type { WeatherSource } from '../types';

interface AddWeatherSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<WeatherSource, 'id'> & { id?: string }) => void;
  initialData?: WeatherSource | null;
}

const AddWeatherSourceModal: React.FC<AddWeatherSourceModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && initialData) {
      setYoutubeUrl(initialData.youtubeUrl);
      setTitle(initialData.title);
      setApiKey(initialData.apiKey);
      setError('');
    } else if (!isOpen) {
      // Reset when modal is closed, regardless of initialData
      setYoutubeUrl('');
      setTitle('');
      setApiKey('');
      setError('');
    }
  }, [isOpen, initialData]);

  const handleSave = () => {
    if (!youtubeUrl.trim() || !title.trim()) {
      setError('유튜브 주소와 지역 제목은 필수 항목입니다.');
      return;
    }
    setError('');
    onSave({ id: initialData?.id, youtubeUrl, title, apiKey });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "소스 수정" : "새 날씨 정보 소스 추가"}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          실시간 날씨를 스트리밍하는 유튜브 주소와 해당 지역, 그리고 필요 시 기상청 API 키를 입력해주세요.
        </p>
        <Input
          label="유튜브 주소"
          id="youtubeUrl"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
        <Input
          label="지역 제목"
          id="sourceTitle"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 제주시 조천읍 날씨"
        />
        <Input
          label="기상청 API 키 (선택/지역별)"
          id="apiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="지역별 API 키가 필요한 경우 입력"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end space-x-2 pt-4">
          <Button onClick={onClose} variant="secondary">취소</Button>
          <Button onClick={handleSave}>저장</Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddWeatherSourceModal;
