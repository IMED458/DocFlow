// Firebase ინიციალიზაცია — ყველა მონაცემი ინახება Cloud Firestore-ში.
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAHPteUiMrry3PqyaqomcLgCM_kcLTBPM8",
  authDomain: "docflow-36240.firebaseapp.com",
  projectId: "docflow-36240",
  storageBucket: "docflow-36240.firebasestorage.app",
  messagingSenderId: "315603050541",
  appId: "1:315603050541:web:ae7a87c07fcbaf8b8ed8a4",
  measurementId: "G-MS4Z4WE7RZ",
};

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);
export const firestore: Firestore = getFirestore(firebaseApp);

// Analytics მხოლოდ მხარდაჭერილ (https) გარემოში — localhost-ზე ჩუმად გამოტოვდება.
export async function initAnalytics(): Promise<void> {
  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    if (await isSupported()) {
      getAnalytics(firebaseApp);
    }
  } catch {
    /* analytics არააუცილებელია — შეცდომას ვაიგნორებთ */
  }
}
