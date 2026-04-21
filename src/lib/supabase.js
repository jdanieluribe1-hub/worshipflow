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

export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })

export async function deleteOwnAccount() {
  const { error } = await supabase.rpc('delete_own_account')
  if (error) throw error
}

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

export async function updateProfile(userId, { name, churchName, preferredLanguage }) {
  const updates = { name, church_name: churchName }
  if (preferredLanguage !== undefined) updates.preferred_language = preferredLanguage
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function setActiveChurchDB(userId, churchId) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ active_church_id: churchId })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Churches ────────────────────────────────────────────────────────────────

export async function getChurches(userId) {
  const { data, error } = await supabase
    .from('church_members')
    .select('role, joined_at, churches(*)')
    .eq('user_id', userId)
  if (error) throw error
  return (data || []).map(row => ({ ...row.churches, role: row.role, joined_at: row.joined_at }))
}

export async function createChurch(name) {
  const { data, error } = await supabase.rpc('create_church_for_user', { church_name: name })
  if (error) throw error
  return data
}

export async function getChurchMembers(churchId) {
  const { data, error } = await supabase.rpc('get_church_members', { cid: churchId })
  if (error) throw error
  return data || []
}

export async function updateMemberRole(churchId, userId, role) {
  const { error } = await supabase
    .from('church_members')
    .update({ role })
    .eq('church_id', churchId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function removeMember(churchId, userId) {
  const { error } = await supabase
    .from('church_members')
    .delete()
    .eq('church_id', churchId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function getChurchByInviteToken(token) {
  const { data, error } = await supabase.rpc('get_church_by_invite_token', { token })
  if (error) throw error
  return (data || [])[0] || null
}

export async function joinChurchByToken(token) {
  const { data, error } = await supabase.rpc('join_church_by_token', { token })
  if (error) throw error
  return data
}

export async function getChurchByShortCode(code) {
  const { data, error } = await supabase.rpc('get_church_by_short_code', { code })
  if (error) throw error
  return (data || [])[0] || null
}

export async function joinChurchByShortCode(code) {
  const { data, error } = await supabase.rpc('join_church_by_short_code', { code })
  if (error) throw error
  return data
}

export async function leaveChurch(churchId) {
  const { error } = await supabase.rpc('leave_church', { p_church_id: churchId })
  if (error) throw error
}

export async function regenerateInviteToken(churchId) {
  const { data, error } = await supabase.rpc('regenerate_invite_token', { cid: churchId })
  if (error) throw error
  return data
}

// ─── Songs ───────────────────────────────────────────────────────────────────

export async function getSongs(churchId) {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('church_id', churchId)
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

export async function getSets(churchId) {
  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .eq('church_id', churchId)
    .order('service_date', { ascending: false })
  if (error) throw error
  return data
}

export async function getSetByDate(churchId, date) {
  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .eq('church_id', churchId)
    .eq('service_date', date)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function upsertSet(churchId, serviceDate, songIds, notes = '', keyOverrides = {}, musicLinks = {}) {
  const { data, error } = await supabase
    .from('sets')
    .upsert(
      { church_id: churchId, service_date: serviceDate, song_ids: songIds, notes, key_overrides: keyOverrides, music_links: musicLinks },
      { onConflict: 'church_id,service_date' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function finalizeSet(churchId, serviceDate, songIds, keyOverrides = {}, musicLinks = {}) {
  await incrementPlays(songIds)
  const { data, error } = await supabase
    .from('sets')
    .upsert(
      { church_id: churchId, service_date: serviceDate, song_ids: songIds, finalized: true, key_overrides: keyOverrides, music_links: musicLinks },
      { onConflict: 'church_id,service_date' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSet(churchId, serviceDate) {
  const { error } = await supabase
    .from('sets')
    .delete()
    .eq('church_id', churchId)
    .eq('service_date', serviceDate)
  if (error) throw error
}

// ─── Recommendations ─────────────────────────────────────────────────────────

export async function submitRecommendation(songName, reason, link, churchId) {
  const payload = { song_name: songName, reason, link }
  if (churchId) payload.church_id = churchId
  const { data, error } = await supabase.from('song_recommendations').insert([payload]).select().single()
  if (error) throw error
  return data
}

export async function getRecommendations(churchId) {
  const { data, error } = await supabase
    .from('song_recommendations')
    .select('*')
    .eq('church_id', churchId)
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
  const ext = file.name.split('.').pop().toLowerCase() || 'pdf'
  const fileName = `${Date.now()}-${safeName}.${ext}`
  const { data, error } = await supabase.storage.from('chord-charts').upload(fileName, file, { contentType: file.type || 'application/pdf', upsert: true })
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

// ─── Song Variants ────────────────────────────────────────────────────────────

export async function createSongVariant(songId, name, chordData) {
  const { data, error } = await supabase.rpc('create_song_variant', {
    p_song_id: songId, p_name: name, p_chord_data: chordData
  })
  if (error) throw error
  return data // uuid of new variant
}

export async function updateSongVariant(variantId, name, chordData) {
  const { error } = await supabase.rpc('update_song_variant', {
    p_variant_id: variantId, p_name: name, p_chord_data: chordData
  })
  if (error) throw error
}

export async function publishSongVariant(variantId) {
  const { error } = await supabase.rpc('publish_song_variant', { p_variant_id: variantId })
  if (error) throw error
}

export async function unpublishSongVariant(variantId) {
  const { error } = await supabase.rpc('unpublish_song_variant', { p_variant_id: variantId })
  if (error) throw error
}

export async function deleteSongVariant(variantId) {
  const { error } = await supabase.rpc('delete_song_variant', { p_variant_id: variantId })
  if (error) throw error
}

export async function listSongVariants(songId) {
  const { data, error } = await supabase.rpc('list_song_variants', { p_song_id: songId })
  if (error) throw error
  return data || []
}
