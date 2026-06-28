import admin from "firebase-admin";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let initialized = false;

export function initializeFirebaseAdmin() {
  if (initialized) return;
  
  try {
    const serviceAccountPath = join(__dirname, "sajuacademy-9c161-firebase-adminsdk-fbsvc-e3a3544427.json");
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
    
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