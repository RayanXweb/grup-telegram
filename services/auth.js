import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    sendPasswordResetEmail,
    onAuthStateChanged,
    getIdToken
} from 'firebase/auth';
import { firebaseConfig } from '../config/firebase-config.js';

let auth = null;
let app = null;

export function initializeAuth() {
    if (!app) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        
        // Enable persistence
        auth.setPersistence('local');
    }
    return auth;
}

export async function login(email, password) {
    try {
        const auth = initializeAuth();
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        throw error;
    }
}

export async function logout() {
    try {
        const auth = initializeAuth();
        await signOut(auth);
    } catch (error) {
        throw error;
    }
}

export async function resetPassword(email) {
    try {
        const auth = initializeAuth();
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        throw error;
    }
}

export async function getCurrentUser() {
    const auth = initializeAuth();
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

export async function getAuthToken() {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('No authenticated user');
    }
    return await getIdToken(user);
}

export function onAuthChange(callback) {
    const auth = initializeAuth();
    return onAuthStateChanged(auth, callback);
}

export { auth };
