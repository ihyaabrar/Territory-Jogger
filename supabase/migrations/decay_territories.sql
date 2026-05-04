-- ============================================================
-- Decay Wilayah (Territory Decay) — Persyaratan 10.1–10.4
-- ============================================================
-- Fungsi ini mengurangi luas wilayah sebesar 10% per hari
-- setelah pengguna tidak aktif selama lebih dari 7 hari.
-- Wilayah dihapus jika luas < 0.001 km² setelah decay.
-- Notifikasi pre-decay dikirim 24 jam sebelum decay pertama.
-- ============================================================

-- ─── 1. Tabel decay_warnings ─────────────────────────────────────────────────
-- Menyimpan status peringatan pre-decay per pengguna agar tidak
-- mengirim notifikasi duplikat.
-- Persyaratan: 10.4

CREATE TABLE IF NOT EXISTS public.decay_warnings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  warned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decay_due_at TIMESTAMPTZ NOT NULL,  -- Kapan decay pertama akan diterapkan
  is_sent      BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (user_id, decay_due_at)
);

CREATE INDEX IF NOT EXISTS decay_warnings_user_idx
  ON public.decay_warnings (user_id, decay_due_at);

-- RLS: hanya service role yang dapat mengakses (dikelola oleh Edge Function)
ALTER TABLE public.decay_warnings ENABLE ROW LEVEL SECURITY;

-- Policy: pengguna dapat membaca peringatan miliknya sendiri
CREATE POLICY "decay_warnings_owner_read" ON public.decay_warnings
  FOR SELECT USING (auth.uid() = user_id);

-- ─── 2. Fungsi apply_territory_decay() ───────────────────────────────────────
-- Dipanggil oleh pg_cron setiap hari atau oleh Edge Function terjadwal.
-- Persyaratan: 10.1, 10.2, 10.3, 10.4

CREATE OR REPLACE FUNCTION public.apply_territory_decay()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  -- Konstanta decay
  v_decay_rate          CONSTANT FLOAT := 0.10;        -- 10% per hari
  v_inactive_threshold  CONSTANT INTERVAL := '7 days'; -- Periode tidak aktif
  v_min_area_km2        CONSTANT FLOAT := 0.001;        -- Luas minimum sebelum dihapus
  v_warn_before         CONSTANT INTERVAL := '24 hours'; -- Peringatan 24 jam sebelum decay

  v_territory           RECORD;
  v_profile             RECORD;
  v_new_area            FLOAT;
  v_new_geom            GEOMETRY;
  v_scale_factor        FLOAT;
  v_decay_due_at        TIMESTAMPTZ;

  v_total_decayed       INTEGER := 0;
  v_total_deleted       INTEGER := 0;
  v_total_warned        INTEGER := 0;
  v_result              JSONB;
BEGIN
  -- ── Langkah 1: Kirim peringatan pre-decay (Persyaratan 10.4) ──────────────
  -- Cari pengguna yang akan memasuki periode decay dalam 24 jam ke depan
  -- (yaitu: last_active antara 6 hari lalu dan 7 hari lalu)
  FOR v_profile IN
    SELECT DISTINCT p.id AS user_id, p.last_active,
           (p.last_active + v_inactive_threshold) AS decay_due_at
    FROM public.profiles p
    WHERE
      -- Pengguna yang akan mencapai 7 hari tidak aktif dalam 24 jam ke depan
      p.last_active <= (NOW() - v_inactive_threshold + v_warn_before)
      AND p.last_active > (NOW() - v_inactive_threshold)
      -- Hanya jika mereka masih memiliki wilayah
      AND EXISTS (
        SELECT 1 FROM public.territories t WHERE t.user_id = p.id
      )
  LOOP
    v_decay_due_at := v_profile.last_active + v_inactive_threshold;

    -- Simpan peringatan jika belum ada (UNIQUE constraint mencegah duplikat)
    INSERT INTO public.decay_warnings (user_id, warned_at, decay_due_at, is_sent)
    VALUES (v_profile.user_id, NOW(), v_decay_due_at, TRUE)
    ON CONFLICT (user_id, decay_due_at) DO NOTHING;

    IF FOUND THEN
      v_total_warned := v_total_warned + 1;

      -- Kirim notifikasi via pg_notify agar Edge Function dapat memprosesnya
      PERFORM pg_notify(
        'decay_warning',
        json_build_object(
          'user_id',      v_profile.user_id,
          'decay_due_at', v_decay_due_at,
          'warned_at',    NOW()
        )::text
      );
    END IF;
  END LOOP;

  -- ── Langkah 2: Terapkan decay pada wilayah pengguna tidak aktif ───────────
  -- Persyaratan 10.1: pengguna tidak aktif > 7 hari
  -- Persyaratan 10.2: kurangi 10% per hari setelah periode tidak aktif
  FOR v_territory IN
    SELECT
      t.id,
      t.user_id,
      t.geom,
      t.area_km2,
      p.last_active
    FROM public.territories t
    JOIN public.profiles p ON p.id = t.user_id
    WHERE
      -- Pengguna tidak aktif lebih dari 7 hari
      p.last_active < (NOW() - v_inactive_threshold)
      -- Wilayah masih di atas minimum
      AND t.area_km2 >= v_min_area_km2
  LOOP
    -- Faktor skala area: 1 - 10% = 0.9
    v_scale_factor := 1.0 - v_decay_rate;
    v_new_area := v_territory.area_km2 * v_scale_factor;

    -- Persyaratan 10.3: hapus wilayah jika luas < 0.001 km² setelah decay
    IF v_new_area < v_min_area_km2 THEN
      DELETE FROM public.territories WHERE id = v_territory.id;
      v_total_deleted := v_total_deleted + 1;
    ELSE
      -- Skalakan geometri secara proporsional di sekitar centroid poligon.
      -- Karena area = linear², faktor skala linear = sqrt(area_scale_factor).
      v_new_geom := ST_Translate(
        ST_Scale(
          ST_Translate(
            v_territory.geom,
            -ST_X(ST_Centroid(v_territory.geom)),
            -ST_Y(ST_Centroid(v_territory.geom))
          ),
          sqrt(v_scale_factor),  -- sqrt(0.9) ≈ 0.9487
          sqrt(v_scale_factor)
        ),
        ST_X(ST_Centroid(v_territory.geom)),
        ST_Y(ST_Centroid(v_territory.geom))
      );

      UPDATE public.territories
      SET
        geom       = v_new_geom,
        area_km2   = v_new_area,
        updated_at = NOW()
      WHERE id = v_territory.id;

      v_total_decayed := v_total_decayed + 1;
    END IF;
  END LOOP;

  -- ── Langkah 3: Hapus wilayah yang sudah di bawah minimum ─────────────────
  -- Tangani kasus di mana area_km2 sudah < minimum sebelum decay ini
  DELETE FROM public.territories t
  USING public.profiles p
  WHERE t.user_id = p.id
    AND p.last_active < (NOW() - v_inactive_threshold)
    AND t.area_km2 < v_min_area_km2;

  -- ── Hasil ─────────────────────────────────────────────────────────────────
  v_result := json_build_object(
    'executed_at',   NOW(),
    'decayed_count', v_total_decayed,
    'deleted_count', v_total_deleted,
    'warned_count',  v_total_warned
  );

  RETURN v_result;
END;
$func$;

-- ─── 3. Aktifkan pg_cron ─────────────────────────────────────────────────────
-- pg_cron tersedia di Supabase sebagai ekstensi opsional.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

GRANT USAGE ON SCHEMA cron TO postgres;

-- ─── 4. Jadwalkan job decay harian ───────────────────────────────────────────
-- Hapus job lama jika ada, lalu buat yang baru.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'territory-decay-daily';

SELECT cron.schedule(
  'territory-decay-daily',
  '0 2 * * *',  -- Setiap hari pukul 02:00 UTC
  'SELECT public.apply_territory_decay()'
);

-- ─── 5. Komentar dokumentasi ─────────────────────────────────────────────────
COMMENT ON FUNCTION public.apply_territory_decay() IS
  'Menerapkan decay wilayah harian: mengurangi luas 10% per hari setelah 7 hari tidak aktif, '
  'menghapus wilayah < 0.001 km², dan mengirim peringatan pre-decay 24 jam sebelumnya. '
  'Persyaratan: 10.1, 10.2, 10.3, 10.4';

COMMENT ON TABLE public.decay_warnings IS
  'Menyimpan status peringatan pre-decay per pengguna untuk mencegah notifikasi duplikat. '
  'Persyaratan: 10.4';
