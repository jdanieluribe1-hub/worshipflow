import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getSongs() {
  const { data, error } = await supabase.from('songs').select('*').order('title')
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

export async function getSets() {
  const { data, error } = await supabase.from('sets').select('*').order('service_date', { ascending: false })
  if (error) throw error
  return data
}

export async function getSetByDate(date) {
  const { data, error } = await supabase.from('sets').select('*').eq('service_date', date).single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function upsertSet(serviceDate, songIds, notes = '') {
  const { data, error } = await supabase.from('sets').upsert({ service_date: serviceDate, song_ids: songIds, notes }, { onConflict: 'service_date' }).select().single()
  if (error) throw error
  return data
}

export async function finalizeSet(serviceDate, songIds) {
  await incrementPlays(songIds)
  const { data, error } = await supabase.from('sets').upsert({ service_date: serviceDate, song_ids: songIds, finalized: true }, { onConflict: 'service_date' }).select().single()
  if (error) throw error
  return data
}

export async function deleteSet(serviceDate) {
  const { error } = await supabase.from('sets').delete().eq('service_date', serviceDate)
  if (error) throw error
}

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
