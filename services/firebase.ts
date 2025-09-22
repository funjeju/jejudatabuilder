// src/firebase.ts (or services/firebase.ts)
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase 프로젝트 설정 (Firebase 콘솔에서 가져오기)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firestore 인스턴스 내보내기
export const db = getFirestore(app);