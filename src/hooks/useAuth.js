import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

async function checkIsAdmin(userId) {
  const { data, error } = await supabase.rpc('is_admin', { uid: userId })
  return !!data && !error
}

export function useAuth() {
  const [user, setUser]           = useState(null)
  const [isAdmin, setIsAdmin]     = useState(false)
  const [loading, setLoading]     = useState(true)
  const [noSession, setNoSession] = useState(false)
  const [denied, setDenied]       = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => { setLoading(false); setNoSession(true) }, 5000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout)
      if (!session) {
        setNoSession(true)
        setLoading(false)
        return
      }
      // Validate the token is still live — getSession() reads localStorage without refreshing
      const { data: { user: validUser }, error: userError } = await supabase.auth.getUser()
      if (userError || !validUser) {
        setNoSession(true)
        setLoading(false)
        return
      }
      setUser(validUser)
      const admin = await checkIsAdmin(validUser.id)
      setIsAdmin(admin)
      setDenied(!admin)
      setLoading(false)
    }).catch(() => {
      clearTimeout(timeout)
      setNoSession(true)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // INITIAL_SESSION is handled by the getSession() path above
        if (event === 'INITIAL_SESSION') return
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null); setIsAdmin(false); setDenied(false); setNoSession(true); setLoading(false)
          return
        }
        setUser(session.user)
        const admin = await checkIsAdmin(session.user.id)
        setIsAdmin(admin); setDenied(!admin); setNoSession(false); setLoading(false)
      }
    )

    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) console.error(error)
  }

  const signOut = async () => {
    setUser(null); setIsAdmin(false); setDenied(false); setNoSession(true)
    await supabase.auth.signOut()
  }

  return { user, isAdmin, loading, noSession, denied, signInWithGoogle, signOut }
}
