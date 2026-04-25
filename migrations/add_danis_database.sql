-- Migration: Dani's Database
-- Adds public song template support.
-- Run this in Supabase SQL editor (Dashboard → SQL Editor → New query).

-- 1. Add columns to songs table
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS is_public_template boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_template_id uuid REFERENCES songs(id) ON DELETE SET NULL;

-- 2. Index so fetching public templates is fast
CREATE INDEX IF NOT EXISTS idx_songs_public_template
  ON songs(is_public_template)
  WHERE is_public_template = true;

-- 3. Allow any authenticated user to SELECT public template songs
--    (This is an OR condition alongside the existing church-scoped SELECT policy)
CREATE POLICY "Public template songs viewable by authenticated users"
  ON songs FOR SELECT
  TO authenticated
  USING (is_public_template = true);

-- 4. RPC: Toggle a song's public template status (Daniel's account only)
CREATE OR REPLACE FUNCTION toggle_song_public_template(p_song_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status boolean;
BEGIN
  IF auth.email() != 'jdanieluribe.1@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE songs
  SET is_public_template = NOT is_public_template
  WHERE id = p_song_id
  RETURNING is_public_template INTO v_new_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Song not found';
  END IF;

  RETURN v_new_status;
END;
$$;

-- 5. RPC: Import a public template song into a church's library
CREATE OR REPLACE FUNCTION import_template_song(p_song_id uuid, p_church_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template songs%ROWTYPE;
  v_existing_id uuid;
  v_new_id uuid;
BEGIN
  -- Verify the song is a public template
  SELECT * INTO v_template FROM songs WHERE id = p_song_id AND is_public_template = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template song not found or not public';
  END IF;

  -- Verify the caller is a member of the target church
  IF NOT EXISTS (
    SELECT 1 FROM church_members
    WHERE church_id = p_church_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this church';
  END IF;

  -- Return existing copy if already imported
  SELECT id INTO v_existing_id FROM songs
  WHERE church_id = p_church_id AND source_template_id = p_song_id;
  IF FOUND THEN
    RETURN v_existing_id;
  END IF;

  -- Copy song into the church's library
  INSERT INTO songs (
    church_id, title, artist, key, tempo, themes, specialty, notes,
    lyrics, pdf_url, plays_3weeks, plays_3months, plays_year,
    is_public_template, source_template_id
  ) VALUES (
    p_church_id,
    v_template.title,
    v_template.artist,
    v_template.key,
    v_template.tempo,
    v_template.themes,
    v_template.specialty,
    v_template.notes,
    v_template.lyrics,
    v_template.pdf_url,
    0, 0, 0,
    false,
    p_song_id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;
