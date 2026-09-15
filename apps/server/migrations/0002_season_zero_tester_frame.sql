CREATE TABLE cosmetic_ownership (
  account_id uuid NOT NULL REFERENCES accounts(id),
  slot text NOT NULL CHECK(slot IN ('BOARD_THEME','CHECKER_SET','DICE_SKIN','PROFILE_FRAME','REACTION_PACK')),
  cosmetic_id text NOT NULL,
  source text NOT NULL,
  source_reference text NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(account_id,slot,cosmetic_id)
);

CREATE TABLE cosmetic_equipment (
  account_id uuid NOT NULL REFERENCES accounts(id),
  slot text NOT NULL CHECK(slot IN ('BOARD_THEME','CHECKER_SET','DICE_SKIN','PROFILE_FRAME','REACTION_PACK')),
  cosmetic_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(account_id,slot),
  FOREIGN KEY(account_id,slot,cosmetic_id)
    REFERENCES cosmetic_ownership(account_id,slot,cosmetic_id)
);

WITH eligible AS (
  SELECT DISTINCT ON (mp.account_id)
    mp.account_id, m.id AS match_id, m.finished_at
  FROM match_players mp
  JOIN matches m ON m.id=mp.match_id
  WHERE m.status='FINISHED' AND m.winner IS NOT NULL
  ORDER BY mp.account_id, m.finished_at ASC NULLS LAST, m.id ASC
)
INSERT INTO cosmetic_ownership(account_id,slot,cosmetic_id,source,source_reference,acquired_at)
SELECT account_id,'PROFILE_FRAME','season0_tester_frame','SEASON_0_PARTICIPATION',match_id::text,
       COALESCE(finished_at,now())
FROM eligible
ON CONFLICT DO NOTHING;

INSERT INTO cosmetic_equipment(account_id,slot,cosmetic_id)
SELECT account_id,'PROFILE_FRAME','season0_tester_frame'
FROM cosmetic_ownership
WHERE slot='PROFILE_FRAME' AND cosmetic_id='season0_tester_frame'
ON CONFLICT(account_id,slot) DO NOTHING;
