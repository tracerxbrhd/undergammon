ALTER TABLE match_players
  ADD COLUMN xp_before integer,
  ADD COLUMN xp_after integer,
  ADD COLUMN xp_gained integer;

ALTER TABLE match_players
  ADD CONSTRAINT match_player_xp_result_consistent CHECK (
    (xp_before IS NULL AND xp_after IS NULL AND xp_gained IS NULL)
    OR (xp_before >= 0 AND xp_after >= xp_before AND xp_gained = xp_after - xp_before)
  );
