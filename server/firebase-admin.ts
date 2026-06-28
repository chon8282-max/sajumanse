import admin from "firebase-admin";

let initialized = false;

export function initializeFirebaseAdmin() {
  if (initialized) return;
  
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccountJson) {
      console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT 환경변수가 없습니다.");
      return;
    }
    
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    initialized = true;
    console.log("✅ Firebase Admin 초기화 완료");
  } catch (error) {
    console.error("❌ Firebase Admin 초기화 실패:", error);
  }
}

export { admin };