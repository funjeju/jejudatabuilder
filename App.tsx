
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Place, InitialFormData, Suggestion, EditLog, WeatherSource } from './types';
import InitialForm from './components/InitialForm';
import ReviewDashboard from './components/ReviewDashboard';
import ContentLibrary from './components/ContentLibrary';
import SpotDetailView from './components/SpotDetailView';
import Chatbot from './components/Chatbot';
import WeatherChatModal from './components/WeatherChatModal';
import TripPlannerModal from './components/TripPlannerModal';
import Spinner from './components/common/Spinner';
import Modal from './components/common/Modal';
import Button from './components/common/Button';
import { generateDraft } from './services/geminiService';
import { KLokalLogo, WITH_KIDS_OPTIONS, WITH_PETS_OPTIONS, PARKING_DIFFICULTY_OPTIONS, ADMISSION_FEE_OPTIONS } from './constants';
import { collection, query, onSnapshot, setDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from './services/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { sanitizePlaceForFirestore, parsePlaceFromFirestore } from './services/placeFirestore';

type AppStep = 'library' | 'initial' | 'loading' | 'review' | 'view';

// Utility to set a value in a nested object using a string path
// This is a simplified version and might not cover all edge cases like lodash.set
const setValueByPath = (obj: any, path: string, value: any) => {
    const keys = path.replace(/\[(\w+)\]/g, '.$1').split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (typeof current[key] === 'undefined' || current[key] === null) {
            // Check if next key is a number, to create an array or object
            current[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
        }
        current = current[key];
    }
    current[keys[keys.length - 1]] = value;
    return obj;
};

const ChatbotIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9.4 12.4h-2v-2h2v2zm3.2 0h-2v-2h2v2zm3.2 0h-2v-2h2v2z" />
    </svg>
);

const App: React.FC = () => {
  // 수정: 정의되지 않은 initialDummyData 대신 빈 배열로 초기 상태를 변경합니다.
  // 이제 데이터는 Firebase에서 직접 불러오게 됩니다.
  const [spots, setSpots] = useState<Place[]>([]);
  const [step, setStep] = useState<AppStep>('library');
  const [dataToEdit, setDataToEdit] = useState<Place | null>(null);
  const [spotToView, setSpotToView] = useState<Place | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDataSaved, setIsDataSaved] = useState(false);
  const [finalData, setFinalData] = useState<Place | null>(null);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isWeatherChatOpen, setIsWeatherChatOpen] = useState(false);
  const [isTripPlannerOpen, setIsTripPlannerOpen] = useState(false);
  const [weatherSources, setWeatherSources] = useState<WeatherSource[]>([]);
// Firestore에서 스팟 데이터 불러오기
  useEffect(() => {
    const q = query(collection(db, "spots"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const spotsArray: Place[] = querySnapshot.docs.map((docSnap) =>
        parsePlaceFromFirestore(docSnap.data(), docSnap.id)
      );
      setSpots(spotsArray);
    }, (snapshotError) => {
      console.error('Error loading spots from Firestore:', snapshotError);
    });
    return () => unsubscribe();
  }, []);

  // Firestore에서 날씨 정보 소스 불러오기
  useEffect(() => {
    const q = query(collection(db, "weatherSources"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const sourcesArray: WeatherSource[] = [];
      querySnapshot.forEach((doc) => {
        sourcesArray.push(doc.data() as WeatherSource);
      });
      setWeatherSources(sourcesArray);
    });
    return () => unsubscribe();
  }, []);
  const handleGenerateDraft = useCallback(async (formData: InitialFormData) => {

    setStep('loading');
    setError(null);
    try {
      const generatedData = await generateDraft(formData);
      const now = Date.now() / 1000;
      const timestamp = { seconds: now, nanoseconds: 0 };
      
      const defaultAttributes = {
        targetAudience: [],
        recommendedSeasons: [],
        withKids: WITH_KIDS_OPTIONS[1], // "가능"
        withPets: WITH_PETS_OPTIONS[2], // "불가"
        parkingDifficulty: PARKING_DIFFICULTY_OPTIONS[1], // "보통"
        admissionFee: ADMISSION_FEE_OPTIONS[2], // "정보없음"
      };

      const completeData: Place = {
        // App-generated data
        place_id: dataToEdit?.place_id || `P_${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}_${Math.random().toString(36).substring(2, 4).toUpperCase()}`,
        creator_id: 'expert_001',
        status: 'draft',
        created_at: dataToEdit?.created_at || timestamp,
        updated_at: timestamp,

        // Defaults for arrays and nullable fields
        images: [],
        linked_spots: [],
        average_duration_minutes: null,

        // Data from AI, with fallbacks
        ...generatedData,

        // Overwrite with user's direct input as source of truth
        place_name: formData.spotName,
        categories: formData.categories,
        expert_tip_raw: formData.spotDescription,
        import_url: formData.importUrl,

        // Carefully merge nested objects
        attributes: { ...defaultAttributes, ...(generatedData.attributes || {}) },
        public_info: { ...(generatedData.public_info || {}) },
        comments: generatedData.comments || [],
        tags: generatedData.tags || [],
      };

      setDataToEdit(completeData);
      setStep('review');
    } catch (err) {
      console.error('Error generating draft:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setStep('initial');
    }
  }, [dataToEdit]);


  const handleOpenReview = (finalData: Place) => {
    setFinalData(finalData);
    setIsDataSaved(false);
    setIsModalOpen(true);
  };
  
  const handleGoBack = useCallback(() => {
    if (step === 'review') {
      setStep('initial');
    } else if (step === 'initial') {
      setDataToEdit(null);
      setStep('library');
    } else if (step === 'view') {
        setSpotToView(null);
        setStep('library');
    }
  }, [step]);

  // Firestore에 데이터 저장 함수 추가
  const handleSaveToFirebase = async (data: Place) => {
      const docId = data.place_id;
      const sanitized = sanitizePlaceForFirestore(data);
      await setDoc(doc(db, "spots", docId), sanitized);
  };
  
  // 날씨 소스 데이터 Firestore에 저장 함수 추가
  const handleSaveWeatherSourceToFirebase = async (data: Omit<WeatherSource, 'id'> & { id?: string }) => {
      const id = data.id || `ws_${Date.now()}`;
      await setDoc(doc(db, "weatherSources", id), { ...data, id });
  };
  
  // 날씨 소스 데이터 Firestore에서 삭제 함수 추가
  const handleDeleteWeatherSourceFromFirebase = async (id: string) => {
      await deleteDoc(doc(db, "weatherSources", id));
  };
  
  // 수정: 이미지 업로드를 처리하기 위해 함수를 async 비동기 방식으로 변경합니다.
  const handleConfirmSave = async () => {
    if (finalData) {
      try {
        const storage = getStorage();
        const now = { seconds: Date.now() / 1000, nanoseconds: 0 };
        const dataToSave = { ...finalData, updated_at: now, status: finalData.status === 'stub' ? 'draft' : finalData.status };

        // 이미지 업로드 로직 추가
        if (dataToSave.images && dataToSave.images.length > 0) {
          const uploadPromises = dataToSave.images.map(async (imageInfo) => {
            // 'file' 객체가 있는 경우에만 (즉, 새로 추가되거나 수정된 이미지일 때만) 업로드합니다.
            if (imageInfo.file) {
              // 파일 이름으로 Storage 내 저장 경로를 만듭니다. 예: images/스팟ID/파일명
              const imageRef = ref(storage, `images/${dataToSave.place_id}/${imageInfo.file.name}`);
              // 파일을 Storage에 업로드합니다.
              await uploadBytes(imageRef, imageInfo.file);
              // 업로드된 파일의 다운로드 URL을 받아옵니다.
              const downloadURL = await getDownloadURL(imageRef);
              // 기존 imageInfo 객체에서 file 객체는 제거하고, url을 최종 URL로 업데이트합니다.
              return { url: downloadURL, caption: imageInfo.caption };
            }
            // 이미 URL만 있는 기존 이미지는 그대로 반환합니다.
            return imageInfo;
          });
          // 모든 이미지의 업로드 및 URL 변환 작업이 끝날 때까지 기다립니다.
          const uploadedImages = await Promise.all(uploadPromises);
          dataToSave.images = uploadedImages.map(({ file, ...rest }) => rest); // 최종적으로 file 속성 제거
        }

        await handleSaveToFirebase(dataToSave);
        console.log('Final data saved:', JSON.stringify(dataToSave, null, 2));
        setIsDataSaved(true);
      } catch (error) {
        console.error("Error saving data or uploading files: ", error);
        setError("데이터 저장 또는 파일 업로드 중 오류가 발생했습니다.");
      }
    }
  };

  const handleAddStubSpot = (spotName: string): Place => {
    const newPlaceId = `P_${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}_${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
    const now = Date.now() / 1000;
    const timestamp = { seconds: now, nanoseconds: 0 };
    const newStub: Place = {
      place_id: newPlaceId,
      place_name: spotName,
      status: 'stub',
      created_at: timestamp,
      updated_at: timestamp,
      categories: [],
      images: [],
      linked_spots: [],
      comments: []
    };
    // 로컬 상태 업데이트 로직 대신 Firebase 저장 함수 호출
    handleSaveToFirebase(newStub); 
    return newStub;
  };

    const handleAddSuggestion = (placeId: string, fieldPath: string, content: string) => {
        let spotForFirebase: Place | null = null;
        setSpots(prevSpots => {
            return prevSpots.map(spot => {
                if (spot.place_id === placeId) {
                    const now = { seconds: Date.now() / 1000, nanoseconds: 0 };
                    const newSuggestion: Suggestion = {
                        id: `sugg_${Date.now()}`,
                        author: 'Collaborator', // Hardcoded for demo
                        content,
                        createdAt: now,
                        status: 'pending',
                    };

                    const updatedSuggestions = { ...(spot.suggestions || {}) };
                    if (!updatedSuggestions[fieldPath]) {
                        updatedSuggestions[fieldPath] = [];
                    }
                    updatedSuggestions[fieldPath].push(newSuggestion);

                    const updatedSpot = { ...spot, suggestions: updatedSuggestions };
                    spotForFirebase = updatedSpot;
                    return updatedSpot;
                }
                return spot;
            });
        });

        if (spotForFirebase) {
            handleSaveToFirebase(spotForFirebase).catch(error => {
                console.error('Error saving suggestion to Firestore:', error);
            });
        }
    };

    const handleResolveSuggestion = (placeId: string, fieldPath: string, suggestionId: string, resolution: 'accepted' | 'rejected') => {
        let spotForFirebase: Place | null = null;
        setSpots(prevSpots => {
            return prevSpots.map(spot => {
                if (spot.place_id === placeId) {
                    const suggestionsForField = spot.suggestions?.[fieldPath] || [];
                    let suggestionToResolve: Suggestion | undefined;

                    const updatedSuggestionsForField = suggestionsForField.map(s => {
                        if (s.id === suggestionId) {
                            suggestionToResolve = s;
                            return { ...s, status: resolution };
                        }
                        return s;
                    });

                    if (!suggestionToResolve) return spot;

                    const updatedSpot = { ...spot };
                    updatedSpot.suggestions = { ...(spot.suggestions), [fieldPath]: updatedSuggestionsForField };

                    if (resolution === 'accepted') {
                        const now = { seconds: Date.now() / 1000, nanoseconds: 0 };

                        // Get previous value (for history log)
                        const previousValue = JSON.parse(JSON.stringify(spot)); // deep copy to get value
                        const pathKeys = fieldPath.replace(/\[(\w+)\]/g, '.$1').split('.');
                        let prevValRef = previousValue;
                        for(const key of pathKeys) {
                            if (prevValRef) prevValRef = prevValRef[key];
                        }

                        let newValue: any = suggestionToResolve.content;

                        if (fieldPath === 'tags') {
                            if (typeof newValue === 'string') {
                                newValue = newValue.split(',').map(tag => tag.trim()).filter(Boolean);
                            } else if (!Array.isArray(newValue)) {
                                newValue = [];
                            }
                        } else if (fieldPath === 'expert_tip_final') {
                            const existingTip = spot.expert_tip_final || '';
                            const today = new Date();
                            const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
                            const appendix = `[${dateString} 추가된 내용]\n${suggestionToResolve.content}`;
                            newValue = existingTip ? `${existingTip}\n\n${appendix}` : appendix;
                        }

                        setValueByPath(updatedSpot, fieldPath, newValue);

                        const newLogEntry: EditLog = {
                            fieldPath,
                            previousValue: prevValRef,
                            newValue: newValue,
                            acceptedBy: 'Admin', // Hardcoded for demo
                            acceptedAt: now,
                            suggestionId,
                        };
                        updatedSpot.edit_history = [...(spot.edit_history || []), newLogEntry];
                        updatedSpot.updated_at = now;
                    }

                    if (spotToView?.place_id === placeId) {
                        setSpotToView(updatedSpot);
                    }

                    spotForFirebase = updatedSpot;
                    return updatedSpot;
                }
                return spot;
            });
        });

        if (spotForFirebase) {
            handleSaveToFirebase(spotForFirebase).catch(error => {
                console.error('Error updating suggestion in Firestore:', error);
            });
        }
    };
  
  const handleExitToLibrary = () => {
    setIsModalOpen(false);
    setIsDataSaved(false);
    setStep('library');
    setDataToEdit(null);
    setFinalData(null);
    setError(null);
    setSpotToView(null);
  };

  const handleStartNew = () => {
    setDataToEdit(null);
    setStep('initial');
  };

  const handleEditSpot = (spot: Place) => {
    setSpotToView(null);
    setDataToEdit(spot);
    if (spot.status === 'stub') {
      setStep('initial');
    } else {
      setStep('review');
    }
  };

  const handleViewSpot = (spot: Place) => {
    setSpotToView(spot);
    setStep('view');
  };
  
  const handleCloseModal = () => setIsModalOpen(false);

  const handleNavigateFromChatbot = (placeId: string) => {
    const spot = spots.find(s => s.place_id === placeId);
    if (spot) {
        setSpotToView(spot);
        setStep('view');
        setIsChatbotOpen(false); // Close chatbot on navigation
    }
  };

  const handleSaveWeatherSource = (data: Omit<WeatherSource, 'id'> & { id?: string }) => {
      handleSaveWeatherSourceToFirebase(data);
  };

  const handleDeleteWeatherSource = (id: string) => {
      handleDeleteWeatherSourceFromFirebase(id);
  };
  const renderContent = () => {
    switch (step) {
      case 'library':
        return <ContentLibrary 
                  spots={spots} 
                  onAddNew={handleStartNew} 
                  onEdit={handleEditSpot} 
                  onView={handleViewSpot}
                  onOpenWeatherChat={() => setIsWeatherChatOpen(true)}
                  onOpenTripPlanner={() => setIsTripPlannerOpen(true)}
                />;
      case 'view':
        if (spotToView) {
            return <SpotDetailView 
                        spot={spotToView} 
                        onBack={handleGoBack} 
                        onEdit={handleEditSpot}
                        onAddSuggestion={handleAddSuggestion}
                        onResolveSuggestion={handleResolveSuggestion}
                    />;
        }
        setStep('library');
        return null;
      case 'initial': {
        const initialValues = dataToEdit ? {
            spotName: dataToEdit.place_name,
            categories: dataToEdit.categories || [],
            spotDescription: dataToEdit.expert_tip_raw || '',
            importUrl: dataToEdit.import_url || '',
        } : undefined;
        return <InitialForm onGenerateDraft={handleGenerateDraft} error={error} onBack={handleGoBack} initialValues={initialValues} />;
      }
      case 'loading':
        return (
          <div className="text-center p-10">
            <Spinner />
            <p className="text-lg text-gray-600 mt-4">AI가 전문가님의 설명을 분석하여 초안을 생성 중입니다... 잠시만 기다려주세요.</p>
          </div>
        );
      case 'review':
        if (dataToEdit) {
          return <ReviewDashboard initialData={dataToEdit} onSave={handleOpenReview} allSpots={spots} onAddStubSpot={handleAddStubSpot} onBack={handleGoBack} />;
        }
        // Fallback to library if no data to edit
        setStep('library');
        return null;
      default:
        return null;
    }
  };
  
  const HeaderButton = useMemo(() => {
    if (step === 'library') return null;

    return (
      <button
        onClick={handleExitToLibrary}
        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        라이브러리로 돌아가기
      </button>
    );
  }, [step]);


  return (
    <div className="min-h-screen bg-gray-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
                <KLokalLogo />
                <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
                    K-LOKAL: AI 데이터빌더
                </h1>
            </div>
            {HeaderButton}
        </header>
        <main>
          {renderContent()}
        </main>
        <footer className="text-center mt-12 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} K-LOKAL Project. All Rights Reserved.</p>
        </footer>
      </div>
      
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="생성된 JSON 데이터 미리보기"
      >
        <div className="space-y-6">
          <div>
            <p className="text-gray-600">
              아래는 최종 생성된 JSON 데이터입니다. 내용을 확인 후 저장하거나, 다시 돌아가 수정할 수 있습니다.
            </p>
            {isDataSaved && 
              <p className="mt-2 text-sm font-semibold text-green-600 bg-green-50 p-3 rounded-md">
                ✓ 저장 완료! (브라우저 콘솔을 확인하세요)
              </p>
            }
          </div>
          <div className="bg-gray-100 p-4 rounded-md max-h-96 overflow-y-auto border border-gray-200">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap">
              {JSON.stringify(finalData, null, 2)}
            </pre>
          </div>
          <div className="flex justify-end items-center space-x-3 pt-5 border-t mt-2">
            <Button onClick={handleCloseModal} variant="secondary" disabled={isDataSaved}>
              수정하기
            </Button>
            <Button onClick={handleConfirmSave} disabled={isDataSaved}>
              {isDataSaved ? '저장됨' : '저장하기'}
            </Button>
            <Button onClick={handleExitToLibrary}>
              라이브러리로 이동
            </Button>
          </div>
        </div>
      </Modal>

        <button 
            onClick={() => setIsChatbotOpen(true)}
            className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 z-50"
            aria-label="Open AI Assistant"
        >
            <ChatbotIcon className="h-8 w-8" />
        </button>

        <Chatbot 
            isOpen={isChatbotOpen} 
            onClose={() => setIsChatbotOpen(false)}
            spots={spots}
            onNavigateToSpot={handleNavigateFromChatbot}
        />

        <WeatherChatModal
          isOpen={isWeatherChatOpen}
          onClose={() => setIsWeatherChatOpen(false)}
          weatherSources={weatherSources}
          onSaveSource={handleSaveWeatherSource}
          onDeleteSource={handleDeleteWeatherSource}
        />

        <TripPlannerModal
          isOpen={isTripPlannerOpen}
          onClose={() => setIsTripPlannerOpen(false)}
          spots={spots}
        />
    </div>
  );
};

export default App;
