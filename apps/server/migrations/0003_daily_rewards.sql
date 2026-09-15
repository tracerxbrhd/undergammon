CREATE TABLE daily_reward_claims (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id),
  claim_date date NOT NULL,
  cycle_day smallint NOT NULL CHECK(cycle_day BETWEEN 1 AND 7),
  reward_coins integer NOT NULL CHECK(reward_coins > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id,claim_date)
);
