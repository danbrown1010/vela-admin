import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

async function checkIsAdmin(userId) {
  const { data, error } = await supabase.rpc('is_admin', { uid: userId })
  return !!data && !error
}

export function useAuth() {
  const [user, setUser]       = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied]   = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 5000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout)
      if (session?.user) {
        setUser(session.user)
        const admin = await checkIsAdmin(session.user.id)
        setIsAdmin(admin)
        setDenied(!admin)
      }
      setLoading(false)
    }).catch(() => {
      clearTimeout(timeout)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setIsAdmin(false)
          setDenied(false)
          setLoading(false)
          return
        }
        if (session?.user) {
          setUser(session.user)
          const admin = await checkIsAdmin(session.user.id)
          setIsAdmin(admin)
          setDenied(!admin)
          setLoading(false)
        }
      }
    )

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    const redirectTo = window.location.origin

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) console.error(error)
  }

  const signOut = async () => {
    setUser(null)
    setIsAdmin(false)
    setDenied(false)
    await supabase.auth.signOut()
  }

  return { user, isAdmin, loading, denied, signInWithGoogle, signOut }
}
