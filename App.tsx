
import React, { useState, useCallback, useMemo } from 'react';
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

const initialDummyData: Place[] = [
  {
    "place_id": "P_20250920T004432_YK",
    "creator_id": "expert_001",
    "status": "draft",
    "created_at": {
      "seconds": 1758329072.389,
      "nanoseconds": 0
    },
    "updated_at": {
      "seconds": 1758329093.684,
      "nanoseconds": 0
    },
    "images": [],
    "linked_spots": [],
    "place_name": "새별오름",
    "average_duration_minutes": 90,
    "attributes": {
      "targetAudience": [
        "모두",
        "자연 애호가",
        "사진가"
      ],
      "recommendedSeasons": [
        "가을"
      ],
      "withKids": "어린이와 함께 방문하기 좋음",
      "withPets": "정보 없음",
      "parkingDifficulty": "정보 없음",
      "admissionFee": "무료",
      "recommended_time_of_day": ["오후", "일몰"]
    },
    "expert_tip_final": "가을에는 풍성한 억새 풍경을 즐길 수 있는 제주 최고의 핫플레이스 오름입니다. 오름 트레킹 후 근처 왕이메 오름이나 가매 오름을 방문하거나, 비 오는 날에는 아르떼뮤지엄이나 대형 카페 제주당에서 시간을 보내는 것을 추천합니다.",
    "address": "제주특별자치도 제주시 애월읍 봉성리 산59-8",
    "category_specific_info": null,
    "comments": [
      {
        "content": "새별오름은 과거 조용했던 오름이었으나, 들불축제, 이효리, 카세 새빌 덕분에 제주도 최고의 핫플레이스가 되었습니다. 최근에는 대규모 카페인 제주당이 근처에 생겨 더욱 뜨거운 관심을 받고 있습니다.",
        "type": "개요"
      },
      {
        "content": "가을이 되면 가장 풍성한 억새 풍경을 자랑하여 아름다운 경치를 선사합니다.",
        "type": "추천"
      },
      {
        "content": "오름을 좋아한다면 가까운 왕이메 오름을, 억새를 더 즐기고 싶다면 가매 오름을 함께 방문하는 것도 좋습니다.",
        "type": "꿀팁"
      },
      {
        "content": "비 오는 날에는 근처 아르떼뮤지엄이나 대형 카페 제주당으로 이동하여 실내 활동을 즐길 수 있습니다.",
        "type": "꿀팁"
      }
    ],
    "location": null,
    "public_info": { "closed_days": [] },
    "region": "애월읍",
    "tags": [
      "오름",
      "핫플레이스",
      "억새",
      "가을",
      "들불축제",
      "경치"
    ],
    "categories": [
      "오름",
      "숲길"
    ],
    "expert_tip_raw": "새별오름은 제주도에서 가장 핫플레이스 오름으로 10여년전까지만해도 정말 조용한 오름이었지만, 들불축제, 이효리, 카세 새빌의 3박자가 제주도 최고의 핫플레이스로 만들었다. 최근에는 새별오름 가까이 제주당이라는 제주도 최대 규모의 관광지에 가까운 카페가 생기면서, 더더욱 이일대를 뜨겁게 달구고, 있다. 제주도 가을 억새의 계절이 오면, 가장 풍성한 억새풍경을 선사하는 새별오름. 오름을 좋아하면, 가까이 왕이메 오름, 억새를 좋아하면, 가매오름도 잊지말자. 비오면 근처에 아르떼뮤지엄이나, 제주당으로 피신가자. ",
    "import_url": ""
  },
  {
    "place_id": "P_20250920T005703_YR",
    "creator_id": "expert_001",
    "status": "draft",
    "created_at": {
      "seconds": 1758329823.5,
      "nanoseconds": 0
    },
    "updated_at": {
      "seconds": 1758329928.923,
      "nanoseconds": 0
    },
    "images": [
      {
        "url": "https://via.placeholder.com/400x300.png?text=Jejudang",
        "caption": "제주당 전경"
      }
    ],
    "linked_spots": [
      {
        "link_type": "함께가기",
        "place_id": "P_20250920T004432_YK",
        "place_name": "새별오름"
      },
      {
        "link_type": "대체장소",
        "place_id": "",
        "place_name": "카페새빌"
      }
    ],
    "place_name": "제주당",
    "average_duration_minutes": 75,
    "attributes": {
      "targetAudience": [
        "누구나",
        "가족",
        "연인"
      ],
      "recommendedSeasons": [
        "아무때나",
        "가을"
      ],
      "withKids": "추천",
      "withPets": "불가",
      "parkingDifficulty": "쉬움",
      "admissionFee": "유료",
      "recommended_time_of_day": ["오후", "일몰"]
    },
    "expert_tip_final": "오픈과 동시에 핫플레이스로 등극한 제주당은 새별오름 뷰와 드넓은 잔디밭, 일몰이 아름다운 연못이 특징입니다. 스마트팜 채소로 만든 신선한 샐러드와 부담 없는 가격의 빵을 즐길 수 있어 남녀노소 누구나 방문하기 좋습니다.",
    "address": "제주특별자치도 제주시 애월읍 평화로 1515",
    "category_specific_info": {
      "priceRange": "1만원 ~ 2만원",
      "signatureMenu": "스마트팜 야채 샐러드, 다양한 베이커리"
    },
    "comments": [
      {
        "type": "총평",
        "content": "오픈하자마자 핫플레이스로 등극한 곳으로, 아낌없는 자금 투입으로 사람들의 눈길을 사로잡았습니다."
      },
      {
        "type": "경치/분위기",
        "content": "새별오름을 한눈에 담을 수 있는 뷰와 주차장 초입의 풍성한 억새, 널찍한 잔디밭, 해질녘 일몰이 아름다운 작은 연못까지 갖춰져 있어 실내외 모두 즐기기 좋습니다."
      },
      {
        "type": "메뉴",
        "content": "바로 옆 스마트팜에서 생산하는 신선한 야채로 만든 샐러드와 저렴한 가격의 빵 메뉴까지 준비되어 있어 음료와 식사를 동시에 해결할 수 있습니다."
      },
      {
        "type": "꿀팁",
        "content": "넓은 주차장과 남녀노소 누구나 좋아할 만한 실내외 공간 덕분에 관광객과 도민 할 것 없이 모두에게 사랑받는 명소입니다."
      }
    ],
    "location": null,
    "public_info": {
      "phone_number": "064-799-1234",
      "operating_hours": "매일 10:00 - 21:00",
      "closed_days": []
    },
    "region": "애월읍",
    "tags": [
      "핫플레이스",
      "새별오름",
      "억새",
      "일몰",
      "잔디밭",
      "연못",
      "베이커리",
      "샐러드",
      "넓은 주차장",
      "가성비",
      "뷰맛집",
      "복합문화공간"
    ],
    "categories": [
      "카페",
      "식당"
    ],
    "expert_tip_raw": "생기자마자 핫플레이스로 등극한곳. 주식회사 대동의 아끼지 않은 자금투입으로 아낌없이 투자가 되어. 사람들의 눈과 발길을 한번에 사로잡음. \n새별오름을 한눈에 담을수 있꼬, 주차장 초입에 풍성한 억새는 가을 제주에 설레는 마음을 . \n그리고 바로 앞 널찍하게 품고 있는 잔디밭과, 해질녘 일몰풍경을 극대화 해주는 작은 연못까지. \n붙어있는 스마트팜에서 생산하는 야채들로 샐러드 메뉴까지 구성하고 있다. 넓은 주차장과\n남녀노소 누구나 좋아할만한 실내외 공간. 카페 새빌이 새별오름의 우측을 담당하고 있노라면\n제주당은 새별오름의 좌측을 담당하고 있는 복합 문화공간까지는 아니지만, 음과 식을 동시에 해결가능한곳. \n카페 새빌이 제주도 핑크뮬리를 대표하는 공간이라면, 이곳은 빵도 싸고 누구나 부담없이 오다닐수 있는 곳으로 한동안 관광객 도민할것 없이 사람들을 모아낼곳",
    "import_url": ""
  },
  {
    "place_id": "P_20250917_211813_01",
    "creator_id": "expert_001",
    "status": "draft",
    "created_at": { "seconds": 1758082693, "nanoseconds": 0 },
    "updated_at": { "seconds": 1758082693, "nanoseconds": 0 },
    "images": [],
    "linked_spots": [],
    "place_name": "곽지해수욕장",
    "average_duration_minutes": 120,
    "attributes": {
        "targetAudience": ["누구나", "가족", "친구"],
        "recommendedSeasons": ["여름"],
        "withKids": "추천",
        "withPets": "가능",
        "parkingDifficulty": "어려움",
        "admissionFee": "무료",
        "recommended_time_of_day": ["오후", "일몰"]
    },
    "expert_tip_final": "에메랄드빛 바다와 아름다운 해안 산책길이 매력적인 해수욕장입니다. 이효리가 패들보드를 타던 곳으로 유명하며, 물이 빠지면 조개잡이 체험도 가능합니다. 최근 주차 공간이 부족해져 방문 시 참고해야 합니다.",
    "address": "제주특별자치도 제주시 애월읍 곽지리",
    "category_specific_info": null,
    "comments": [
        { "type": "배경", "content": "과거 이호해수욕장보다 깨끗한 바다를 찾아오던 제주 도민들에게 가장 사랑받았던 해수욕장입니다. 이효리가 패들보드를 타던 곳으로도 유명해졌습니다." },
        { "type": "특징", "content": "아름다운 바다색과 동해를 연상시키는 적당한 파도가 매력적이며, 바로 옆 한담해변까지 이어지는 해안 산책길이 일품입니다. 물이 빠지면 손으로 조개를 잡는 체험도 가능합니다." },
        { "type": "최신정보", "content": "최근 10년 사이 가장 극적으로 변한 곳 중 하나로, 유료 주차장 외 대부분의 주차 공간이 막혀 방문객들의 불편이 있으며 이로 인해 도민들의 아쉬움을 사고 있습니다." }
    ],
    "location": { "latitude": 33.493, "longitude": 126.305 },
    "public_info": { "closed_days": [] },
    "region": "애월읍",
    "tags": ["해수욕장", "에메랄드빛바다", "애월", "한담해변", "산책코스", "이효리", "패들보드", "조개잡이", "주차유료", "도민추천"],
    "categories": ["관광지", "해수욕장"],
    "expert_tip_raw": "과거 이호해수욕장보다 깨끗한 바다를 찾아오던 제주 도민들에게 가장 사랑받았던 해수욕장입니다. 이효리가 패들보드를 타던 곳으로도 유명해졌습니다. 아름다운 바다색과 동해를 연상시키는 적당한 파도가 매력적이며, 바로 옆 한담해변까지 이어지는 해안 산책길이 일품입니다. 물이 빠지면 손으로 조개를 잡는 체험도 가능합니다. 최근 10년 사이 가장 극적으로 변한 곳 중 하나로, 유료 주차장 외 대부분의 주차 공간이 막혀 방문객들의 불편이 있으며 이로 인해 도민들의 아쉬움을 사고 있습니다.",
    "import_url": ""
  },
  {
      "place_id": "P_20250917_211510_01",
      "creator_id": "expert_001",
      "status": "draft",
      "created_at": { "seconds": 1758082510, "nanoseconds": 0 },
      "updated_at": { "seconds": 1758082510, "nanoseconds": 0 },
      "images": [],
      "linked_spots": [],
      "place_name": "하가리 연화못",
      "average_duration_minutes": 40,
      "attributes": {
          "targetAudience": ["누구나", "연인", "가족"],
          "recommendedSeasons": ["여름"],
          "withKids": "추천",
          "withPets": "가능",
          "parkingDifficulty": "보통",
          "admissionFee": "무료",
          "recommended_time_of_day": ["오전", "낮"]
      },
      "expert_tip_final": "여름철 만개한 연꽃이 절경을 이루는 고즈넉한 연못입니다. 마을 사람들의 노력으로 아름답게 가꿔졌으며, 근처 더럭초등학교와 함께 방문하여 조용한 힐링 시간을 갖기 좋습니다.",
      "address": "제주특별자치도 제주시 애월읍 하가로 192",
      "category_specific_info": null,
      "comments": [
          { "type": "특징", "content": "과거에는 보잘것없던 작은 연못이었으나, 마을 사람들의 노력으로 아름답게 정비되어 여름철 연꽃이 만개하면 절경을 이루는 곳입니다." },
          { "type": "배경", "content": "원래 하가리의 핫플레이스는 광고 촬영으로 유명해진 '더럭분교'였습니다. 이주민 유입으로 학생 수가 늘어 현재는 '더럭초등학교'로 승격되었습니다." },
          { "type": "코스추천", "content": "이제는 더럭초등학교와 함께, 조용하고 아름다운 연꽃을 감상하며 잠시 쉬어가기 좋은 하가리의 대표적인 힐링 스팟입니다." }
      ],
      "location": { "latitude": 33.4688, "longitude": 126.3934 },
      "public_info": { "closed_days": [] },
      "region": "애월읍",
      "tags": ["산책코스", "연꽃", "여름여행", "포토존", "고즈넉함", "더럭초등학교근처", "하가리"],
      "categories": ["관광지", "공원/연못"],
      "expert_tip_raw": "과거에는 보잘것없던 작은 연못이었으나, 마을 사람들의 노력으로 아름답게 정비되어 여름철 연꽃이 만개하면 절경을 이루는 곳입니다. 원래 하가리의 핫플레이스는 광고 촬영으로 유명해진 '더럭분교'였습니다. 이주민 유입으로 학생 수가 늘어 현재는 '더럭초등학교'로 승격되었습니다. 이제는 더럭초등학교와 함께, 조용하고 아름다운 연꽃을 감상하며 잠시 쉬어가기 좋은 하가리의 대표적인 힐링 스팟입니다.",
      "import_url": ""
  },
  {
    "place_id": "P_20250917_211205_01",
    "creator_id": "expert_001",
    "status": "draft",
    "created_at": { "seconds": 1758082325, "nanoseconds": 0 },
    "updated_at": { "seconds": 1758082325, "nanoseconds": 0 },
    "images": [],
    "linked_spots": [],
    "place_name": "항파두리 항몽유적지",
    "average_duration_minutes": 60,
    "attributes": {
      "targetAudience": ["가족", "아이", "역사 애호가", "사진가"],
      "recommendedSeasons": ["가을"],
      "withKids": "추천",
      "withPets": "정보 없음",
      "parkingDifficulty": "보통",
      "admissionFee": "무료",
      "recommended_time_of_day": ["오전", "낮"]
    },
    "expert_tip_final": "계절마다 아름다운 꽃밭이 조성되는 역사 유적지입니다. '나홀로나무' 포토존에서 인생샷을 남기고, 삼별초의 마지막 흔적을 따라 역사 교육과 감성을 동시에 느껴보세요.",
    "address": "제주특별자치도 제주시 애월읍 항파두리로 50",
    "category_specific_info": null,
    "comments": [
      { "type": "특징", "content": "고려시대 삼별초의 마지막 흔적이 남아있는 제주 최대 규모의 항몽 유적지입니다." },
      { "type": "꿀팁", "content": "유적지 자체의 볼거리보다, 입구에 계절마다 다르게 조성되는(예: 가을엔 해바라기, 코스모스) 아름다운 꽃밭이 더 큰 볼거리를 제공합니다." },
      { "type": "포토존 정보", "content": "유적지 끝 토성 위에 외롭게 서 있는 소나무 한 그루가 '나홀로나무 포토존'으로 유명하니 놓치지 마세요." },
      { "type": "전문가평가", "content": "역사적인 의미를 배우며 아름다운 계절 꽃과 인생샷을 함께 남길 수 있는, 교육과 감성을 모두 잡는 곳입니다." }
    ],
    "location": { "latitude": 33.4571, "longitude": 126.4173 },
    "public_info": { "closed_days": [] },
    "region": "애월읍",
    "tags": ["역사탐방", "삼별초", "포토존", "인생샷", "꽃밭", "계절명소", "나홀로나무", "토성", "아이와함께"],
    "categories": ["관광지", "역사문화"],
    "expert_tip_raw": "고려시대 삼별초의 마지막 흔적이 남아있는 제주 최대 규모의 항몽 유적지입니다. 유적지 자체의 볼거리보다, 입구에 계절마다 다르게 조성되는(예: 가을엔 해바라기, 코스모스) 아름다운 꽃밭이 더 큰 볼거리를 제공합니다. 유적지 끝 토성 위에 외롭게 서 있는 소나무 한 그루가 '나홀로나무 포토존'으로 유명하니 놓치지 마세요. 역사적인 의미를 배우며 아름다운 계절 꽃과 인생샷을 함께 남길 수 있는, 교육과 감성을 모두 잡는 곳입니다.",
    "import_url": ""
  },
  {
    "place_id": "P_20250917_211009_01",
    "creator_id": "expert_001",
    "status": "draft",
    "created_at": { "seconds": 1758082209, "nanoseconds": 0 },
    "updated_at": { "seconds": 1758082209, "nanoseconds": 0 },
    "images": [],
    "linked_spots": [],
    "place_name": "돈카츠 서황",
    "average_duration_minutes": 60,
    "attributes": {
      "targetAudience": ["누구나", "친구", "연인"],
      "recommendedSeasons": ["아무때나"],
      "withKids": "가능",
      "withPets": "불가",
      "parkingDifficulty": "보통",
      "admissionFee": "유료",
      "recommended_time_of_day": ["점심", "저녁"]
    },
    "expert_tip_final": "이효리 맛집으로 유명해진 애월 중산간의 돈카츠 전문점입니다. 특히 만족도가 높은 부드러운 생선카츠를 맛보세요. 조용한 마을을 핫플레이스로 바꾼 곳입니다.",
    "address": "제주특별자치도 제주시 애월읍 소길남길 34-1",
    "category_specific_info": { "signatureMenu": "생선카츠", "priceRange": "1만원 ~ 2만원" },
    "comments": [
      { "type": "배경", "content": "과거 조용했던 애월 중산간 마을 소길리에 이효리 님이 방문하면서 일순간에 전국구 핫플레이스로 떠오른 돈카츠 전문점입니다." },
      { "type": "메뉴추천", "content": "다양한 돈카츠 메뉴 중에서도, 부드러운 생선카츠에 대한 만족도가 특히 높습니다." },
      { "type": "인사이트", "content": "이 식당의 유명세는 단순히 맛집 하나를 넘어, 소길리라는 동네 전체의 분위기를 바꿀 정도로 큰 영향을 주었습니다." }
    ],
    "location": { "latitude": 33.4358, "longitude": 126.3908 },
    "public_info": { "closed_days": [] },
    "region": "애월읍",
    "tags": ["돈카츠맛집", "생선카츠", "이효리맛집", "애월맛집", "중산간맛집", "소길리", "핫플레이스"],
    "categories": ["식당"],
    "expert_tip_raw": "과거 조용했던 애월 중산간 마을 소길리에 이효리 님이 방문하면서 일순간에 전국구 핫플레이스로 떠오른 돈카츠 전문점입니다. 다양한 돈카츠 메뉴 중에서도, 부드러운 생선카츠에 대한 만족도가 특히 높습니다. 이 식당의 유명세는 단순히 맛집 하나를 넘어, 소길리라는 동네 전체의 분위기를 바꿀 정도로 큰 영향을 주었습니다.",
    "import_url": ""
  },
  {
    "place_id": "P_20250917_210606_01",
    "creator_id": "expert_001",
    "status": "draft",
    "created_at": { "seconds": 1758081966, "nanoseconds": 0 },
    "updated_at": { "seconds": 1758081966, "nanoseconds": 0 },
    "images": [],
    "linked_spots": [],
    "place_name": "화조원",
    "average_duration_minutes": 90,
    "attributes": {
      "targetAudience": ["가족", "아이"],
      "recommendedSeasons": ["아무때나"],
      "withKids": "추천",
      "withPets": "불가",
      "parkingDifficulty": "보통",
      "admissionFee": "유료",
      "recommended_time_of_day": ["오전", "오후"]
    },
    "expert_tip_final": "제주의 동물원 역할을 하는 곳으로, 아이와 함께하는 가족 여행객에게 강력 추천합니다. 넓은 잔디밭에서 알파카, 새 등 다양한 동물들과 교감하는 특별한 체험을 할 수 있습니다.",
    "address": "제주특별자치도 제주시 애월읍 애원로 804",
    "category_specific_info": null,
    "comments": [
      { "type": "특징", "content": "공식 동물원이 없는 제주에서 동물원 역할을 하는 중요한 곳으로, 특히 아이들의 만족도가 매우 높습니다." },
      { "type": "배경", "content": "이름처럼 초기에는 새가 중심이었으나, 현재는 넓은 잔디밭에서 알파카 등 다양한 동물들과 교감할 수 있는 공간으로 발전했습니다." },
      { "type": "꿀팁", "content": "제주 현지 아이들에게는 필수 소풍 코스로 여겨질 만큼, 아이들을 위한 체험과 볼거리가 잘 갖추어져 있습니다." }
    ],
    "location": { "latitude": 33.4478, "longitude": 126.4172 },
    "public_info": { "closed_days": [] },
    "region": "애월읍",
    "tags": ["아이와함께", "가족여행", "동물체험", "알파카", "새모이주기", "소풍", "제주동물원", "애월"],
    "categories": ["관광지", "체험"],
    "expert_tip_raw": "공식 동물원이 없는 제주에서 동물원 역할을 하는 중요한 곳으로, 특히 아이들의 만족도가 매우 높습니다. 이름처럼 초기에는 새가 중심이었으나, 현재는 넓은 잔디밭에서 알파카 등 다양한 동물들과 교감할 수 있는 공간으로 발전했습니다. 제주 현지 아이들에게는 필수 소풍 코스로 여겨질 만큼, 아이들을 위한 체험과 볼거리가 잘 갖추어져 있습니다.",
    "import_url": ""
  },
  {
    "place_id": "P_20250917_210509_01",
    "creator_id": "expert_001",
    "status": "draft",
    "created_at": { "seconds": 1758081909, "nanoseconds": 0 },
    "updated_at": { "seconds": 1758081909, "nanoseconds": 0 },
    "images": [],
    "linked_spots": [],
    "place_name": "신엄항 (주차장 쉼터)",
    "average_duration_minutes": 20,
    "attributes": {
      "targetAudience": ["누구나", "드라이브 여행자", "나홀로"],
      "recommendedSeasons": ["아무때나"],
      "withKids": "가능",
      "withPets": "가능",
      "parkingDifficulty": "쉬움",
      "admissionFee": "무료",
      "recommended_time_of_day": ["아무때나"]
    },
    "expert_tip_final": "애월해안도로 드라이브 중 잠시 쉬어가기 좋은 고즈넉한 항구입니다. 주차가 편리하며, 작은 포구와 빨간 등대를 배경으로 여유로운 시간을 보내기에 안성맞춤입니다.",
    "address": "제주특별자치도 제주시 애월읍 신엄리 989-1",
    "category_specific_info": null,
    "comments": [
      { "type": "특징", "content": "제주 최고의 드라이브 코스 중 하나인 애월해안도로에서 잠시 쉬어가기 좋은 고즈넉한 작은 항구입니다." },
      { "type": "꿀팁", "content": "넉넉한 주차 공간이 마련되어 있어 부담 없이 차를 세울 수 있으며, 작은 포구와 빨간 등대가 어우러져 여유로운 분위기를 자아냅니다." },
      { "type": "추천대상", "content": "화려한 볼거리보다는, 붐비는 해안도로를 달리다 조용한 바다를 보며 잠시 머물고 싶은 여행자에게 추천합니다." }
    ],
    "location": { "latitude": 33.4938, "longitude": 126.4022 },
    "public_info": { "closed_days": [] },
    "region": "애월읍",
    "tags": ["숨은명소", "쉼터", "애월해안도로", "드라이브코스", "주차편리", "빨간등대", "고즈넉함", "포토존"],
    "categories": ["관광지", "바다"],
    "expert_tip_raw": "제주 최고의 드라이브 코스 중 하나인 애월해안도로에서 잠시 쉬어가기 좋은 고즈넉한 작은 항구입니다. 넉넉한 주차 공간이 마련되어 있어 부담 없이 차를 세울 수 있으며, 작은 포구와 빨간 등대가 어우러져 여유로운 분위기를 자아냅니다. 화려한 볼거리보다는, 붐비는 해안도로를 달리다 조용한 바다를 보며 잠시 머물고 싶은 여행자에게 추천합니다.",
    "import_url": ""
  },
  {
    "place_id": "P_20250917_210232_01",
    "creator_id": "expert_001",
    "status": "draft",
    "created_at": { "seconds": 1758081752, "nanoseconds": 0 },
    "updated_at": { "seconds": 1758081752, "nanoseconds": 0 },
    "images": [],
    "linked_spots": [],
    "place_name": "수산저수지 (그네 포토존)",
    "average_duration_minutes": 30,
    "attributes": {
      "targetAudience": ["사진가", "연인", "친구"],
      "recommendedSeasons": ["봄"],
      "withKids": "가능",
      "withPets": "가능",
      "parkingDifficulty": "보통",
      "admissionFee": "무료",
      "recommended_time_of_day": ["낮"]
    },
    "expert_tip_final": "수산봉 근처에 위치한 유명한 그네 포토존입니다. 저수지와 한라산을 배경으로 멋진 인생샷을 남길 수 있으며, 봄에는 벚꽃 명소로도 알려져 있습니다. (방문 시 공사 여부 확인 필요)",
    "address": "제주특별자치도 제주시 애월읍 수산리 332-2",
    "category_specific_info": null,
    "comments": [
      { "type": "특징", "content": "저수지 자체보다, 수산봉 올라가는 길 소나무에 설치된 전통 그네가 핵심인 포토존 명소입니다." },
      { "type": "꿀팁", "content": "그네를 저수지와 한라산 방향으로 밀면 스릴과 함께 멋진 인생샷을 남길 수 있습니다. 봄철에는 벚꽃도 아름답게 핍니다." },
      { "type": "최신정보", "content": "최근 '드르쿰다' 카페가 새로 들어섰으며, 저수지는 현재 공사로 인해 물이 많이 빠져있는 상태입니다. (2025년 9월 기준)" }
    ],
    "location": { "latitude": 33.4565, "longitude": 126.4385 },
    "public_info": { "closed_days": [] },
    "region": "애월읍",
    "tags": ["포토존", "인생샷", "그네", "수산봉", "한라산뷰", "봄여행", "벚꽃명소", "공사중", "주의필요"],
    "categories": ["관광지", "포토존"],
    "expert_tip_raw": "저수지 자체보다, 수산봉 올라가는 길 소나무에 설치된 전통 그네가 핵심인 포토존 명소입니다. 그네를 저수지와 한라산 방향으로 밀면 스릴과 함께 멋진 인생샷을 남길 수 있습니다. 봄철에는 벚꽃도 아름답게 핍니다. 최근 '드르쿰다' 카페가 새로 들어섰으며, 저수지는 현재 공사로 인해 물이 많이 빠져있는 상태입니다. (2025년 9월 기준)",
    "import_url": ""
  },
  {
    "place_id": "P_20250917_210019_01",
    "creator_id": "expert_001",
    "status": "draft",
    "created_at": { "seconds": 1758081619, "nanoseconds": 0 },
    "updated_at": { "seconds": 1758081619, "nanoseconds": 0 },
    "images": [],
    "linked_spots": [],
    "place_name": "아이바가든",
    "average_duration_minutes": 100,
    "attributes": {
      "targetAudience": ["누구나", "가족", "연인"],
      "recommendedSeasons": ["아무때나"],
      "withKids": "가능",
      "withPets": "불가",
      "parkingDifficulty": "보통",
      "admissionFee": "유료",
      "recommended_time_of_day": ["비오는날", "실내"]
    },
    "expert_tip_final": "가구단지를 리모델링한 미디어 아트 전시관으로, 비 오는 날 실내 관광지로 좋습니다. 최근 한식 뷔페가 입점하여 전시와 식사를 함께 즐길 수 있는 장점이 있습니다.",
    "address": "제주특별자치도 제주시 번영로 378",
    "category_specific_info": null,
    "comments": [
      { "type": "배경", "content": "과거 수년간 고전하던 대규모 가구단지를 리모델링하여 새롭게 태어난 미디어 아트 전시 공간입니다." },
      { "type": "전문가평가", "content": "솔직히 노형슈퍼마켙이나 아르떼뮤지엄에 비하면 인지도가 다소 밀리는 편이지만, 미디어 아트를 좋아하는 사람이라면 충분히 즐길 만한 콘텐츠를 갖추고 있습니다." },
      { "type": "최신정보", "content": "최근 제주에서 유행하는 한식 뷔페가 입점하여, 전시와 식사를 함께 해결할 수 있어 연계 방문객이 늘어나고 있습니다." }
    ],
    "location": { "latitude": 33.4795, "longitude": 126.5791 },
    "public_info": { "closed_days": [] },
    "region": "제주시 동(洞) 지역",
    "tags": ["미디어아트", "실내관광지", "비오는날추천", "포토존", "한식뷔페", "가구단지"],
    "categories": ["관광지", "미디어아트"],
    "expert_tip_raw": "과거 수년간 고전하던 대규모 가구단지를 리모델링하여 새롭게 태어난 미디어 아트 전시 공간입니다. 솔직히 노형슈퍼마켙이나 아르떼뮤지엄에 비하면 인지도가 다소 밀리는 편이지만, 미디어 아트를 좋아하는 사람이라면 충분히 즐길 만한 콘텐츠를 갖추고 있습니다. 최근 제주에서 유행하는 한식 뷔페가 입점하여, 전시와 식사를 함께 해결할 수 있어 연계 방문객이 늘어나고 있습니다.",
    "import_url": ""
  },
  {
    "place_id": "P_20250917_135745_01",
    "creator_id": "expert_001",
    "status": "draft",
    "created_at": { "seconds": 1758056265, "nanoseconds": 0 },
    "updated_at": { "seconds": 1758056265, "nanoseconds": 0 },
    "images": [],
    "linked_spots": [],
    "place_name": "장전리 왕벚꽃 거리",
    "average_duration_minutes": 45,
    "attributes": {
      "targetAudience": ["누구나", "연인", "가족", "친구"],
      "recommendedSeasons": ["봄"],
      "withKids": "추천",
      "withPets": "가능",
      "parkingDifficulty": "어려움",
      "admissionFee": "무료",
      "recommended_time_of_day": ["낮", "축제기간"]
    },
    "expert_tip_final": "애월의 대표적인 벚꽃 명소로, 오래된 왕벚나무가 터널을 이룹니다. 축제 기간에는 차량이 통제되며, 근처 한적한 곳에서 '나만의 벚꽃길'을 찾아보는 것도 좋습니다.",
    "address": "제주특별자치도 제주시 애월읍 장전리 1121",
    "category_specific_info": null,
    "comments": [
      { "type": "특징", "content": "제주시내를 벗어나 애월 지역에서 가장 대표적인 벚꽃 명소로, 수령이 오래된 왕벚나무들이 만들어내는 비정형적인 아름다움이 매력적입니다." },
      { "type": "핵심정보", "content": "매년 축제 기간에는 도로를 통제하고 다양한 행사가 열립니다. 제주시내권의 전농로, 제주대학교 벚꽃길과는 또 다른 매력을 느낄 수 있습니다." },
      { "type": "꿀팁", "content": "축제 기간에는 이 근방 도로 곳곳에 벚꽃이 만개하므로, 차로 5분 거리 안에서 더 조용하고 한적한 '나만의 벚꽃길'을 찾아보는 것도 좋은 방법입니다." }
    ],
    "location": { "latitude": 33.4475, "longitude": 126.4312 },
    "public_info": { "closed_days": [] },
    "region": "애월읍",
    "tags": ["봄여행", "벚꽃명소", "인생샷", "축제", "애월", "드라이브코스", "숨은명소"],
    "categories": ["관광지", "꽃"],
    "expert_tip_raw": "제주시내를 벗어나 애월 지역에서 가장 대표적인 벚꽃 명소로, 수령이 오래된 왕벚나무들이 만들어내는 비정형적인 아름다움이 매력적입니다. 매년 축제 기간에는 도로를 통제하고 다양한 행사가 열립니다. 제주시내권의 전농로, 제주대학교 벚꽃길과는 또 다른 매력을 느낄 수 있습니다. 축제 기간에는 이 근방 도로 곳곳에 벚꽃이 만개하므로, 차로 5분 거리 안에서 더 조용하고 한적한 '나만의 벚꽃길'을 찾아보는 것도 좋은 방법입니다.",
    "import_url": ""
  },
  {
    "place_id": "P_20250917_135130_01",
    "creator_id": "expert_001",
    "status": "draft",
    "created_at": { "seconds": 1758055890, "nanoseconds": 0 },
    "updated_at": { "seconds": 1758055890, "nanoseconds": 0 },
    "images": [],
    "linked_spots": [],
    "place_name": "상가리야자숲",
    "average_duration_minutes": 40,
    "attributes": {
      "targetAudience": ["사진가", "20대", "30대", "연인"],
      "recommendedSeasons": ["아무때나"],
      "withKids": "가능",
      "withPets": "정보 없음",
      "parkingDifficulty": "보통",
      "admissionFee": "유료",
      "recommended_time_of_day": ["낮"]
    },
    "expert_tip_final": "이국적인 야자수를 배경으로 인생샷을 남길 수 있는 포토존 명소입니다. 과거 무료였으나 현재는 유료로 운영되며, 방문 전 가격 정보를 확인하는 것이 좋습니다.",
    "address": "제주특별자치도 제주시 애월읍 어음리 2053-1",
    "category_specific_info": null,
    "comments": [
      { "type": "특징", "content": "제주에서 이국적인 야자수를 배경으로 가장 완성도 높게 포토존이 구성된 장소입니다." },
      { "type": "배경", "content": "과거 몇 년간 무료로 운영되며 인스타그램을 통해 유명해졌으나, 약 1년 전부터 포토존을 보강하고 유료 입장으로 전환되었습니다." },
      { "type": "가격정보", "content": "입장료에 여러 옵션이 포함되어 있지만, 무료였던 곳이 유료로 바뀌면서 가격에 대한 방문객들의 불만이 일부 있는 편입니다." }
    ],
    "location": { "latitude": 33.4347, "longitude": 126.3986 },
    "public_info": { "closed_days": [] },
    "region": "애월읍",
    "tags": ["포토존", "인생샷", "야자수", "이국적풍경", "인스타그램", "유료입장", "가격있음"],
    "categories": ["관광지", "포토존"],
    "expert_tip_raw": "제주에서 이국적인 야자수를 배경으로 가장 완성도 높게 포토존이 구성된 장소입니다. 과거 몇 년간 무료로 운영되며 인스타그램을 통해 유명해졌으나, 약 1년 전부터 포토존을 보강하고 유료 입장으로 전환되었습니다. 입장료에 여러 옵션이 포함되어 있지만, 무료였던 곳이 유료로 바뀌면서 가격에 대한 방문객들의 불만이 일부 있는 편입니다.",
    "import_url": ""
  },
  {
    "place_id": "P_20250917_144955_01",
    "creator_id": "expert_001",
    "status": "draft",
    "created_at": { "seconds": 1758059395, "nanoseconds": 0 },
    "updated_at": { "seconds": 1758059395, "nanoseconds": 0 },
    "images": [],
    "linked_spots": [],
    "place_name": "아르떼뮤지엄 제주",
    "average_duration_minutes": 120,
    "attributes": {
      "targetAudience": ["누구나", "가족", "연인", "아이"],
      "recommendedSeasons": ["아무때나"],
      "withKids": "추천",
      "withPets": "불가",
      "parkingDifficulty": "보통",
      "admissionFee": "유료",
      "recommended_time_of_day": ["비오는날", "실내"]
    },
    "expert_tip_final": "제주에서 가장 유명한 미디어 아트 전시관으로 비 오는 날 실내 관광지로 강력 추천합니다. 취향에 따라 호불호가 갈릴 수 있으니 방문 전 전시 내용을 확인해보세요. 바로 옆 '아르떼뮤지엄 키즈'도 함께 둘러보기 좋습니다.",
    "address": "제주특별자치도 제주시 애월읍 어림비로 478",
    "category_specific_info": null,
    "comments": [
      { "type": "특징", "content": "제주에서 가장 성공한 미디어 아트 전시관으로, 이후 노형슈퍼마켓, 아이바 제주 등 유사한 공간이 생겨나는 데 큰 영향을 주었습니다." },
      { "type": "코스추천", "content": "비 오는 날 제주 서쪽 여행 시 가장 먼저 손꼽히는 실내 관광지이며, 최근에는 바로 옆에 어린이 버전인 '아르떼뮤지엄 키즈'도 오픈했습니다." },
      { "type": "꿀팁", "content": "개인의 취향에 따라 다소 밋밋하게 느껴질 수도 있으므로, 방문 전 공식 홈페이지를 통해 전시 내용을 미리 확인하고 가는 것을 추천합니다." }
    ],
    "location": { "latitude": 33.4391, "longitude": 126.4367 },
    "public_info": { "closed_days": [] },
    "region": "애월읍",
    "tags": ["미디어아트", "실내관광지", "비오는날추천", "핫플레이스", "포토존", "인생샷", "제주서쪽", "호불호"],
    "categories": ["관광지", "미디어아트"],
    "expert_tip_raw": "제주에서 가장 성공한 미디어 아트 전시관으로, 이후 노형슈퍼마켓, 아이바 제주 등 유사한 공간이 생겨나는 데 큰 영향을 주었습니다. 비 오는 날 제주 서쪽 여행 시 가장 먼저 손꼽히는 실내 관광지이며, 최근에는 바로 옆에 어린이 버전인 '아르떼뮤지엄 키즈'도 오픈했습니다. 개인의 취향에 따라 다소 밋밋하게 느껴질 수도 있으므로, 방문 전 공식 홈페이지를 통해 전시 내용을 미리 확인하고 가는 것을 추천합니다.",
    "import_url": ""
  }
];


const initialWeatherSources: WeatherSource[] = [
  {
    id: 'ws_1',
    youtubeUrl: 'https://www.youtube.com/watch?v=qR4_UaB3p20',
    title: '한라산 어리목 날씨',
    apiKey: '',
  },
  {
    id: 'ws_2',
    youtubeUrl: 'https://www.youtube.com/watch?v=i9oF-yq4q7w',
    title: '성산일출봉 날씨',
    apiKey: '',
  },
  {
    id: 'ws_3',
    youtubeUrl: 'https://www.youtube.com/watch?v=oYp8F-yq4q7w',
    title: '애월 한담해변 날씨',
    apiKey: '',
  },
  {
    id: 'ws_4',
    youtubeUrl: 'https://www.youtube.com/watch?v=wTU0VEG4D-w',
    title: '서귀포 법환포구 날씨',
    apiKey: '',
  },
  {
    id: 'ws_5',
    youtubeUrl: 'https://www.youtube.com/watch?v=XhI-d7SqvPs',
    title: '서귀포 중문 날씨',
    apiKey: '',
  },
  {
    id: 'ws_6',
    youtubeUrl: 'https://www.youtube.com/watch?v=11bYUj-O_5I',
    title: '제주공항 날씨',
    apiKey: '',
  },
];


const ChatbotIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9.4 12.4h-2v-2h2v2zm3.2 0h-2v-2h2v2zm3.2 0h-2v-2h2v2z" />
    </svg>
);


const App: React.FC = () => {
  const [spots, setSpots] = useState<Place[]>(initialDummyData);
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
  const [weatherSources, setWeatherSources] = useState<WeatherSource[]>(initialWeatherSources);
  
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

  const handleConfirmSave = () => {
    if (finalData) {
      const existingIndex = spots.findIndex(s => s.place_id === finalData.place_id);
      const now = { seconds: Date.now() / 1000, nanoseconds: 0 };
      const dataToSave = { ...finalData, updated_at: now, status: finalData.status === 'stub' ? 'draft' : finalData.status };

      if (existingIndex > -1) {
        const updatedSpots = [...spots];
        updatedSpots[existingIndex] = dataToSave;
        setSpots(updatedSpots);
      } else {
        setSpots(prev => [...prev, dataToSave]);
      }
      console.log('Final data saved:', JSON.stringify(dataToSave, null, 2));
      setIsDataSaved(true);
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
    setSpots(prev => [...prev, newStub]);
    return newStub;
  };

    const handleAddSuggestion = (placeId: string, fieldPath: string, content: string) => {
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

                    return { ...spot, suggestions: updatedSuggestions };
                }
                return spot;
            });
        });
    };

    const handleResolveSuggestion = (placeId: string, fieldPath: string, suggestionId: string, resolution: 'accepted' | 'rejected') => {
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
                    
                    return updatedSpot;
                }
                return spot;
            });
        });
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
    if (data.id) { // Editing existing
      setWeatherSources(prev => prev.map(source => 
          source.id === data.id ? { ...source, youtubeUrl: data.youtubeUrl, title: data.title, apiKey: data.apiKey } : source
      ));
    } else { // Adding new
      const newSource: WeatherSource = {
        id: `ws_${Date.now()}`,
        youtubeUrl: data.youtubeUrl,
        title: data.title,
        apiKey: data.apiKey,
      };
      setWeatherSources(prev => [...prev, newSource]);
    }
  };

  const handleDeleteWeatherSource = (id: string) => {
    setWeatherSources(prev => prev.filter(source => source.id !== id));
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
