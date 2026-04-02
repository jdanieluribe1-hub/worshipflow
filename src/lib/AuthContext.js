import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase, getProfile, getChurches, setActiveChurchDB } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfileState] = useState(null)
  const [churches, setChurches] = useState([])
  const [activeChurch, setActiveChurchState] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadUserData(u) {
    try {
      const p = await getProfile(u.id)
      setProfileState(p)
      if (p) {
        const churchList = await getChurches(u.id)
        setChurches(churchList)
        const active = churchList.find(c => c.id === p.active_church_id) || churchList[0] || null
        setActiveChurchState(active)
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        loadUserData(u)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        loadUserData(u)
      } else {
        setProfileState(null)
        setChurches([])
        setActiveChurchState(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  function setProfile(p) {
    setProfileState(p)
  }

  async function setActiveChurch(church) {
    if (!user) return
    setActiveChurchState(church)
    await setActiveChurchDB(user.id, church.id)
  }

  async function refreshChurches() {
    if (!user) return
    const churchList = await getChurches(user.id)
    setChurches(churchList)
    const p = await getProfile(user.id)
    setProfileState(p)
    const active = churchList.find(c => c.id === p?.active_church_id) || churchList[0] || null
    setActiveChurchState(active)
    return { churches: churchList, activeChurch: active }
  }

  return (
    <AuthContext.Provider value={{ user, profile, setProfile, loading, churches, activeChurch, setActiveChurch, refreshChurches }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
