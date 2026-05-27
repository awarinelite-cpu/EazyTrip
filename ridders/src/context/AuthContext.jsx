import React, { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Register — role: "sender" | "rider" | "admin"
  const register = async (email, password, displayName, role = "sender", extra = {}) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      email,
      displayName,
      role,
      phone: extra.phone || "",
      isActive: true,
      isVerified: role === "admin",   // admins auto-verified; riders need KYC
      walletBalance: 0,
      totalDeliveries: 0,
      rating: 0,
      ratingCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...extra,
    });
    return cred;
  };

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  const fetchUserProfile = async (uid) => {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const profile = { id: snap.id, ...snap.data() };
      setUserProfile(profile);
      return profile;
    }
    return null;
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    register,
    login,
    logout,
    resetPassword,
    fetchUserProfile,
    isAdmin:  userProfile?.role === "admin",
    isRider:  userProfile?.role === "rider",
    isSender: userProfile?.role === "sender",
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
