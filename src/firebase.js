import { initializeApp } from "firebase/app"
import { getFirestore, collection, doc, setDoc, getDoc } from "firebase/firestore"
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyAHJMes20QY_D4cWJOJ_m9KtgRdKuQ96yE",
  authDomain: "telc-vocab-app.firebaseapp.com",
  projectId: "telc-vocab-app",
  storageBucket: "telc-vocab-app.firebasestorage.app",
  messagingSenderId: "86102703553",
  appId: "1:86102703553:web:0e0165a647cd9ff8cd0340"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: "select_account" })

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  } catch (error) {
    console.error("Google sign-in failed:", error)
    throw error
  }
}

export async function saveProgressToFirebase(progress) {
  const user = auth.currentUser
  if (!user) return false

  try {
    await setDoc(doc(db, "progress", user.uid), {
      data: progress,
      lastUpdated: new Date().toISOString(),
      email: user.email
    })
    return true
  } catch (error) {
    console.error("Failed to save progress to Firebase:", error)
    return false
  }
}

export async function loadProgressFromFirebase() {
  const user = auth.currentUser
  if (!user) return null

  try {
    const snap = await getDoc(doc(db, "progress", user.uid))
    if (snap.exists()) {
      return snap.data().data
    }
    return null
  } catch (error) {
    console.error("Failed to load progress from Firebase:", error)
    return null
  }
}
