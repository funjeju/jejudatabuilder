// src/firebase.ts (or services/firebase.ts)
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase 프로젝트 설정 (Firebase 콘솔에서 가져오기)
const firebaseConfig = {
  apiKey: "AIzaSyD33sh80picSyFd1-r1bVyQH1UdFdAXyes",
  authDomain: "jejudb.firebaseapp.com",
  projectId: "jejudb",
  // 수정: storageBucket 주소를 스크린샷에 나온 실제 주소로 변경합니다.
  storageBucket: "jejudb.firebasestorage.app",
  messagingSenderId: "39776551937",
  appId: "1:39776551937:web:f5c4a1b2c3d4e5f6a7b8c9"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firestore 인스턴스 내보내기
export const db = getFirestore(app);