'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthChangeEvent, SupabaseClient } from '@supabase/supabase-js'
import supabase from '@/lib/supabaseClient'

interface AuthContextType {
  user: User | null
  session: Session | null
  supabaseClient: SupabaseClient
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, options?: { data?: any }) => Promise<any>
  signOut: () => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabaseClient = supabase

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabaseClient.auth])

  const signIn = async (email: string, password: string) => {
    const result = await supabaseClient.auth.signInWithPassword({
      email,
      password
    })
    return result
  }

  const signUp = async (email: string, password: string, options?: { data?: any }) => {
    const result = await supabaseClient.auth.signUp({
      email,
      password,
      options
    })
    return result
  }

  const signOut = async () => {
    const result = await supabaseClient.auth.signOut()
    return result
  }

  const value = {
    user,
    session,
    supabaseClient,
    loading,
    signIn,
    signUp,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}