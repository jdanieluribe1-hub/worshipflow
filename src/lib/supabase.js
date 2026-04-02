import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Auth ────────────────────────────────────────────────────────────────────

export const signUp = (email, password) =>
  supabase.auth.signUp({ email, password })

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

// ─── Profiles ────────────────────────────────────────────────────────────────

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function createProfile(userId, name, churchName) {
  const { data, error } = await supabase
    .from('profiles')
    .insert([{ id: userId, name, church_name: churchName }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProfile(userId, { name, churchName }) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ name, church_name: churchName })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Songs ───────────────────────────────────────────────────────────────────

export async function getSongs(userId) {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('user_id', userId)
    .order('title')
  if (error) throw error
  return data
}

export async function addSong(song) {
  const { data, error } = await supabase.from('songs').insert([song]).select().single()
  if (error) throw error
  return data
}

export async function updateSong(id, updates) {
  const { data, error } = await supabase.from('songs').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteSong(id) {
  const { error } = await supabase.from('songs').delete().eq('id', id)
  if (error) throw error
}

export async function incrementPlays(songIds) {
  for (const id of songIds) {
    const { data: song } = await supabase.from('songs').select('plays_3weeks,plays_3months,plays_year').eq('id', id).single()
    if (song) {
      await supabase.from('songs').update({
        plays_3weeks: song.plays_3weeks + 1,
        plays_3months: song.plays_3months + 1,
        plays_year: song.plays_year + 1,
      }).eq('id', id)
    }
  }
}

// ─── Sets ────────────────────────────────────────────────────────────────────

export async function getSets(userId) {
  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .eq('user_id', userId)
    .order('service_date', { ascending: false })
  if (error) throw error
  return data
}

export async function getSetByDate(userId, date) {
  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .eq('user_id', userId)
    .eq('service_date', date)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function upsertSet(userId, serviceDate, songIds, notes = '', keyOverrides = {}, musicLinks = {}) {
  const { data, error } = await supabase
    .from('sets')
    .upsert(
      { user_id: userId, service_date: serviceDate, song_ids: songIds, notes, key_overrides: keyOverrides, music_links: musicLinks },
      { onConflict: 'user_id,service_date' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function finalizeSet(userId, serviceDate, songIds, keyOverrides = {}, musicLinks = {}) {
  await incrementPlays(songIds)
  const { data, error } = await supabase
    .from('sets')
    .upsert(
      { user_id: userId, service_date: serviceDate, song_ids: songIds, finalized: true, key_overrides: keyOverrides, music_links: musicLinks },
      { onConflict: 'user_id,service_date' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSet(userId, serviceDate) {
  const { error } = await supabase
    .from('sets')
    .delete()
    .eq('user_id', userId)
    .eq('service_date', serviceDate)
  if (error) throw error
}

// ─── Recommendations ─────────────────────────────────────────────────────────

export async function submitRecommendation(songName, reason, link) {
  const { data, error } = await supabase.from('song_recommendations').insert([{ song_name: songName, reason, link }]).select().single()
  if (error) throw error
  return data
}

export async function getRecommendations(userId) {
  const { data, error } = await supabase
    .from('song_recommendations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function deleteRecommendation(id) {
  const { error } = await supabase.from('song_recommendations').delete().eq('id', id)
  if (error) throw error
}

// ─── Storage ─────────────────────────────────────────────────────────────────

export async function uploadPDF(file, songTitle) {
  const safeName = songTitle
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '-')
    .toLowerCase()
    .replace(/-+/g, '-')
    .slice(0, 50)
  const fileName = `${Date.now()}-${safeName}.pdf`
  const { data, error } = await supabase.storage.from('chord-charts').upload(fileName, file, { contentType: 'application/pdf', upsert: true })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('chord-charts').getPublicUrl(fileName)
  return urlData.publicUrl
}

// ─── Band View (public, no auth) ─────────────────────────────────────────────

export async function getSongsForBand(bandToken) {
  const { data, error } = await supabase.rpc('get_songs_for_band', { token: bandToken })
  if (error) throw error
  return data || []
}

export async function getSetsForBand(bandToken) {
  const { data, error } = await supabase.rpc('get_sets_for_band', { token: bandToken })
  if (error) throw error
  return data || []
}
