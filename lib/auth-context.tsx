"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth"
import { auth } from "@/lib/firebase"

const googleProvider = new GoogleAuthProvider()

interface AuthContextType {
  user: FirebaseUser | null
  loading: boolean
  signInWithGoogle: () => Promise<FirebaseUser>
  signOut: () => Promise<void>
  getToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Dev bypass: Use a mock user in development
    if (process.env.NODE_ENV === 'development') {
      setUser({
        uid: 'dev-user',
        email: 'dev@evently.local',
        displayName: 'Dev User',
        photoURL: 'https://avatar.vercel.sh/dev',
        getIdToken: async () => 'dev-token',
      } as any)
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider)
    return cred.user
  }

  const signOutFn = async () => {
    await firebaseSignOut(auth)
  }

  const getToken = async () => {
    if (!user) return null
    return user.getIdToken()
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, signInWithGoogle, signOut: signOutFn, getToken }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
