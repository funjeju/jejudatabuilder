import React, { useState } from 'react';
import type { Place, ImageInfo, Comment, LinkedSpot, PublicInfo } from '../types';
import {
  TARGET_AUDIENCE_GROUPS,
  RECOMMENDED_SEASONS_GROUPS,
  WITH_KIDS_OPTIONS,
  WITH_PETS_OPTIONS,
  PARKING_DIFFICULTY_OPTIONS,
  ADMISSION_FEE_OPTIONS,
  LINK_TYPE_OPTIONS,
  COMMENT_TYPE_OPTIONS,
  ALL_REGIONS
} from '../constants';
import Button from './common/Button';
import Card from './common/Card';
import Input from './common/Input';
import Textarea from './common/Textarea';
import Select from './common/Select';
import CheckboxGroup from './common/CheckboxGroup';

interface ReviewDashboardProps {
  initialData: Place;
  onSave: (finalData: Place) => void;
  allSpots: Place[];
  onAddStubSpot: (spotName: string) => Place;
  onBack: () => void;
}

const LinkedSpotEditor: React.FC<{
  spot: LinkedSpot;
  index: number;
  allSpots: Place[];
  onAddStub: (spotName: string) => Place;
  onChange: (index: number, field: keyof LinkedSpot, value: string) => void;
  onRemove: (index: number) => void;
}> = ({ spot, index, allSpots, onAddStub, onChange, onRemove }) => {
  const [inputValue, setInputValue] = useState(spot.place_name);
  const [showStubButton, setShowStubButton] = useState(false);
  const datalistId = `spots-datalist-${index}`;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setInputValue(name);
    
    const existingSpot = allSpots.find(s => s.place_name.toLowerCase() === name.toLowerCase());

    if (existingSpot) {
      onChange(index, 'place_id', existingSpot.place_id);
      onChange(index, 'place_name', existingSpot.place_name);
      setShowStubButton(false);
    } else {
      onChange(index, 'place_id', ''); // Clear ID if it's a new name
      onChange(index, 'place_name', name);
      setShowStubButton(name.trim().length > 0);
    }
  };

  const handleCreateStub = () => {
    const newStub = onAddStub(inputValue);
    onChange(index, 'place_id', newStub.place_id);
    // onChange(index, 'place_name', newStub.place_name); // inputValue is already set
    setShowStubButton(false);
  };
  
  return (
     <div className="border p-3 rounded-md space-y-2 relative">
      <button onClick={() => onRemove(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl leading-none">&times;</button>
      <Select label="관계" value={spot.link_type} onChange={e => onChange(index, 'link_type', e.target.value)} options={LINK_TYPE_OPTIONS} />
      <Input
        label="연계 스팟 이름"
        value={inputValue}
        onChange={handleInputChange}
        list={datalistId}
        autoComplete="off"
      />
       <datalist id={datalistId}>
        {allSpots.map(s => <option key={s.place_id} value={s.place_name} />)}
      </datalist>

      {showStubButton && (
        <Button onClick={handleCreateStub} variant="secondary" size="normal" fullWidth>
          + '{inputValue}' 새 스팟으로 임시 등록
        </Button>
      )}
      <Input label="연계 스팟 ID" value={spot.place_id} onChange={e => onChange(index, 'place_id', e.target.value)} placeholder="자동으로 채워집니다" readOnly={!showStubButton}/>
    </div>
  );
};


const ReviewDashboard: React.FC<ReviewDashboardProps> = ({ initialData, onSave, allSpots, onAddStubSpot, onBack }) => {
  const [data, setData] = useState<Place>(initialData);

  const handleInputChange = <K extends keyof Place,>(field: K, value: Place[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleAttributeChange = <K extends keyof NonNullable<Place['attributes']>>(field: K, value: NonNullable<Place['attributes']>[K]) => {
    setData(prev => ({
      ...prev,
      // FIX: Used a non-null assertion `!` for `prev.attributes` and removed `as object` cast.
      // This is safe because the UI for attributes is only rendered when `data.attributes` exists,
      // ensuring `prev.attributes` is not undefined when this handler is called. This fixes the
      // TypeScript error about missing properties on the `Attributes` type.
      attributes: { ...(prev.attributes!), [field]: value },
    }));
  };

  const handlePublicInfoChange = <K extends keyof NonNullable<Place['public_info']>>(field: K, value: NonNullable<Place['public_info']>[K]) => {
    setData(prev => ({
      ...prev,
      // FIX: Removed `as object` cast. Spreading `prev.public_info` (which can be undefined) is safe
      // because all properties on `PublicInfo` are optional. This improves type safety.
      public_info: { ...(prev.public_info), [field]: value },
    }));
  };

  const handleTagsChange = (tagsString: string) => {
    const tagsArray = tagsString.split(',').map(tag => tag.trim()).filter(Boolean);
    handleInputChange('tags', tagsArray);
  }

  const handleCommentChange = (index: number, field: keyof Comment, value: string) => {
    const newComments = [...(data.comments || [])];
    newComments[index] = { ...newComments[index], [field]: value };
    handleInputChange('comments', newComments);
  };
  
  const addComment = () => {
    const newComments: Comment[] = [...(data.comments || []), { type: '특징', content: '' }];
    handleInputChange('comments', newComments);
  };

  const removeComment = (index: number) => {
    const newComments = (data.comments || []).filter((_, i) => i !== index);
    handleInputChange('comments', newComments);
  };

  const handleImageFileChange = (index: number, file: File | null) => {
    if (!file) return;
    const newImages = [...(data.images || [])];
    newImages[index] = {
      ...newImages[index],
      file: file,
      url: URL.createObjectURL(file),
    };
    handleInputChange('images', newImages);
  };

  const handleImageCaptionChange = (index: number, caption: string) => {
    const newImages = [...(data.images || [])];
    newImages[index] = { ...newImages[index], caption: caption };
    handleInputChange('images', newImages);
  };

  const addImage = () => {
    if ((data.images || []).length < 3) {
      handleInputChange('images', [...(data.images || []), { url: '', caption: '' }]);
    }
  };

  const removeImage = (index: number) => {
    handleInputChange('images', (data.images || []).filter((_, i) => i !== index));
  };

  const handleLinkedSpotChange = (index: number, field: keyof LinkedSpot, value: string) => {
    const newLinkedSpots = [...(data.linked_spots || [])];
    newLinkedSpots[index] = { ...newLinkedSpots[index], [field]: value };
    handleInputChange('linked_spots', newLinkedSpots);
  };

  const addLinkedSpot = () => {
    if ((data.linked_spots || []).length < 5) {
      const newLinkedSpots: LinkedSpot[] = [...(data.linked_spots || []), { link_type: '함께가기', place_id: '', place_name: '' }];
      handleInputChange('linked_spots', newLinkedSpots);
    }
  };

  const removeLinkedSpot = (index: number) => {
    const newLinkedSpots = (data.linked_spots || []).filter((_, i) => i !== index);
    handleInputChange('linked_spots', newLinkedSpots);
  };


  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">3단계: AI 초안 생성 및 인터랙티브 검수</h2>
      
      {initialData.status === 'draft' && (
        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 rounded-r-md" role="alert">
            <p className="font-bold">검수 대기 중</p>
            <p>이 스팟은 현재 '초안(draft)' 상태입니다. 내용을 검토하고 수정하신 후, '기본 정보' 섹션에서 상태를 'published'로 변경하고 최종 저장해주세요.</p>
        </div>
      )}

      <p className="text-md text-gray-600">AI가 생성한 초안입니다. 각 항목을 검토하고 자유롭게 수정해주세요.</p>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="font-semibold text-lg mb-4">기본 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="스팟 이름" value={data.place_name} onChange={e => handleInputChange('place_name', e.target.value)} />
              <Select 
                label="상태" 
                value={data.status} 
                onChange={e => handleInputChange('status', e.target.value as Place['status'])}
                options={['draft', 'published', 'rejected']} 
              />
              <div className="md:col-span-2">
                <Input label="주소" value={data.address || ''} onChange={e => handleInputChange('address', e.target.value)} />
              </div>
               <Input label="평균 체류 시간 (분)" type="number" value={data.average_duration_minutes || ''} onChange={e => handleInputChange('average_duration_minutes', e.target.value ? parseInt(e.target.value, 10) : null)} />
            </div>
             <div className="mt-4">
                <Select
                  label="지역"
                  value={data.region || ''}
                  onChange={(e) => handleInputChange('region', e.target.value)}
                >
                  <option value="">지역을 선택해주세요</option>
                  {ALL_REGIONS.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </Select>
            </div>
            <div className="mt-4">
                <Input label="태그 (쉼표로 구분)" value={(data.tags || []).join(', ')} onChange={e => handleTagsChange(e.target.value)} placeholder="예: #인생샷, #오션뷰, #분위기좋은" />
            </div>
          </Card>

           <Card>
            <h3 className="font-semibold text-lg mb-4">공개 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Input label="운영 시간" value={data.public_info?.operating_hours || ''} onChange={e => handlePublicInfoChange('operating_hours', e.target.value)} placeholder="예: 09:00 - 18:00 (월요일 휴무)" />
               <Input label="정기 휴무일 (쉼표로 구분)" value={data.public_info?.closed_days?.join(', ') || ''} onChange={e => handlePublicInfoChange('closed_days', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} placeholder="예: 월요일, 화요일" />
               <Input label="연락처" value={data.public_info?.phone_number || ''} onChange={e => handlePublicInfoChange('phone_number', e.target.value)} placeholder="예: 064-123-4567"/>
               <Input label="웹사이트 URL" value={data.public_info?.website_url || ''} onChange={e => handlePublicInfoChange('website_url', e.target.value)} placeholder="예: https://instagram.com/jeju_spot"/>
            </div>
          </Card>
          
          {data.attributes && (
            <Card>
              <h3 className="font-semibold text-lg mb-4">핵심 속성</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <Select label="아이와 함께" value={data.attributes.withKids} onChange={e => handleAttributeChange('withKids', e.target.value)} options={WITH_KIDS_OPTIONS} />
                <Select label="반려동물" value={data.attributes.withPets} onChange={e => handleAttributeChange('withPets', e.target.value)} options={WITH_PETS_OPTIONS} />
                <Select label="주차 난이도" value={data.attributes.parkingDifficulty} onChange={e => handleAttributeChange('parkingDifficulty', e.target.value)} options={PARKING_DIFFICULTY_OPTIONS} />
                <Select label="입장료" value={data.attributes.admissionFee} onChange={e => handleAttributeChange('admissionFee', e.target.value)} options={ADMISSION_FEE_OPTIONS} />
                 <div className="col-span-2 md:col-span-3">
                   <Input label="추천 시간대 (쉼표로 구분)" value={(data.attributes.recommended_time_of_day || []).join(', ')} onChange={e => handleAttributeChange('recommended_time_of_day', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} placeholder="예: 오전, 일몰, 점심시간 피하기" />
                 </div>
              </div>
              <div className="mt-6">
                <CheckboxGroup 
                    label="추천 대상" 
                    optionGroups={TARGET_AUDIENCE_GROUPS}
                    baseOption="누구나"
                    selectedOptions={data.attributes.targetAudience} 
                    onChange={opt => handleAttributeChange('targetAudience', data.attributes.targetAudience.includes(opt) ? data.attributes.targetAudience.filter(o => o !== opt) : [...data.attributes.targetAudience, opt])} 
                />
              </div>
              <div className="mt-6">
                <CheckboxGroup 
                    label="추천 시즌" 
                    optionGroups={RECOMMENDED_SEASONS_GROUPS}
                    baseOption="아무때나"
                    selectedOptions={data.attributes.recommendedSeasons} 
                    onChange={opt => handleAttributeChange('recommendedSeasons', data.attributes.recommendedSeasons.includes(opt) ? data.attributes.recommendedSeasons.filter(o => o !== opt) : [...data.attributes.recommendedSeasons, opt])} 
                />
              </div>
            </Card>
          )}

           <Card>
            <h3 className="font-semibold text-lg mb-4">전문가 TIP</h3>
            <div className="space-y-4">
              <Textarea label="원본 설명 (수정 불가)" value={data.expert_tip_raw || ''} rows={5} readOnly className="bg-gray-100" />
              <Textarea label="AI 정제 TIP (수정 가능)" value={data.expert_tip_final || ''} onChange={e => handleInputChange('expert_tip_final', e.target.value)} rows={5} />
            </div>
          </Card>

        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <h3 className="font-semibold text-lg mb-4">이미지 (최대 3개)</h3>
            <div className="space-y-4">
              {(data.images || []).map((img, index) => (
                <div key={index} className="border p-3 rounded-md space-y-2 relative">
                   <button onClick={() => removeImage(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl leading-none">&times;</button>
                   {img.url && <img src={img.url} alt="preview" className="rounded-md w-full h-32 object-cover"/>}
                   <input type="file" accept="image/*" onChange={e => handleImageFileChange(index, e.target.files ? e.target.files[0] : null)} className="text-sm w-full file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                   <Input label="캡션" value={img.caption} onChange={e => handleImageCaptionChange(index, e.target.value)} />
                </div>
              ))}
              {(data.images || []).length < 3 && <Button onClick={addImage} variant="secondary" fullWidth>+ 이미지 추가</Button>}
            </div>
          </Card>
          
          <Card>
            <h3 className="font-semibold text-lg mb-4">상세 코멘트</h3>
            <div className="space-y-3">
              {(data.comments || []).map((comment, index) => (
                <div key={index} className="border p-3 rounded-md space-y-2 relative">
                  <button onClick={() => removeComment(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl leading-none">&times;</button>
                  <Select label="유형" value={comment.type} onChange={e => handleCommentChange(index, 'type', e.target.value)} options={COMMENT_TYPE_OPTIONS} />
                  <Textarea label="내용" value={comment.content} onChange={e => handleCommentChange(index, 'content', e.target.value)} rows={3} />
                </div>
              ))}
              <Button onClick={addComment} variant="secondary" fullWidth>+ 코멘트 추가</Button>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-lg mb-4">연계 장소 (최대 5개)</h3>
            <div className="space-y-3">
              {(data.linked_spots || []).map((spot, index) => (
                <LinkedSpotEditor
                  key={index}
                  spot={spot}
                  index={index}
                  allSpots={allSpots}
                  onAddStub={onAddStubSpot}
                  onChange={handleLinkedSpotChange}
                  onRemove={removeLinkedSpot}
                />
              ))}
              {(data.linked_spots || []).length < 5 && (
                <Button onClick={addLinkedSpot} variant="secondary" fullWidth>+ 연계 장소 추가</Button>
              )}
            </div>
          </Card>
        </div>
      </div>
      
      <div className="mt-8 flex justify-end space-x-4">
        <Button onClick={onBack} variant="secondary" size="large">
            뒤로가기 (수정)
        </Button>
        <Button onClick={() => onSave(data)} size="large">
            최종 저장
        </Button>
      </div>
    </div>
  );
};

export default ReviewDashboard;