CREATE TABLE accounts (
 id uuid PRIMARY KEY, status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUSPENDED','BANNED','PENDING_DELETION','DELETED')),
 nickname text NOT NULL, avatar text NOT NULL, language text NOT NULL CHECK(language IN ('ru','en')), mute_reactions boolean NOT NULL DEFAULT false,
 total_xp integer NOT NULL DEFAULT 0 CHECK(total_xp>=0), coins integer NOT NULL DEFAULT 0 CHECK(coins>=0), nickname_changed_at timestamptz,
 deletion_requested_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE account_identities (account_id uuid NOT NULL REFERENCES accounts(id), provider text NOT NULL DEFAULT 'TELEGRAM', subject text NOT NULL, PRIMARY KEY(provider,subject));
CREATE TABLE sessions (hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id), expires_at timestamptz NOT NULL);
CREATE INDEX sessions_account ON sessions(account_id);
CREATE TABLE seasons (id integer PRIMARY KEY, name text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz);
INSERT INTO seasons(id,name) VALUES(0,'Season 0 / Open Beta');
CREATE TABLE ratings(account_id uuid NOT NULL REFERENCES accounts(id), ruleset text NOT NULL CHECK(ruleset IN ('LONG_NARDY','BACKGAMMON')), season_id integer NOT NULL REFERENCES seasons(id), rating integer NOT NULL DEFAULT 1000, peak integer NOT NULL DEFAULT 1000, played integer NOT NULL DEFAULT 0, wins integer NOT NULL DEFAULT 0, streak integer NOT NULL DEFAULT 0, PRIMARY KEY(account_id,ruleset,season_id));
CREATE INDEX ratings_leaderboard ON ratings(season_id,ruleset,rating DESC) WHERE played>=10;
CREATE TABLE matches(id uuid PRIMARY KEY, ruleset text NOT NULL, mode text NOT NULL CHECK(mode IN ('RANKED','CASUAL','PRIVATE')), status text NOT NULL CHECK(status IN ('WAITING_FOR_PLAYERS','ACTIVE','FINISHED')), state_version integer NOT NULL DEFAULT 0, snapshot jsonb NOT NULL, finish_reason text, winner uuid REFERENCES accounts(id), created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz);
CREATE TABLE match_players(match_id uuid NOT NULL REFERENCES matches(id), account_id uuid NOT NULL REFERENCES accounts(id), seat text NOT NULL CHECK(seat IN ('A','B')), unfinished boolean NOT NULL DEFAULT true, rating_before integer, rating_after integer, PRIMARY KEY(match_id,account_id), UNIQUE(match_id,seat));
CREATE UNIQUE INDEX one_unfinished_match ON match_players(account_id) WHERE unfinished;
CREATE TABLE match_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, match_id uuid NOT NULL REFERENCES matches(id), account_id uuid REFERENCES accounts(id), command_id uuid, state_version integer NOT NULL, kind text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(match_id,account_id,command_id));
CREATE TABLE challenges(token text PRIMARY KEY, creator uuid NOT NULL REFERENCES accounts(id), ruleset text NOT NULL, target uuid REFERENCES accounts(id), status text NOT NULL DEFAULT 'OPEN', expires_at timestamptz NOT NULL, match_id uuid REFERENCES matches(id));
CREATE UNIQUE INDEX one_outgoing_challenge ON challenges(creator) WHERE status='OPEN';
CREATE TABLE matchmaking_entries(account_id uuid PRIMARY KEY REFERENCES accounts(id),ruleset text NOT NULL,mode text NOT NULL CHECK(mode IN ('RANKED','CASUAL')),created_at timestamptz NOT NULL DEFAULT now(), heartbeat_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE coin_ledger(id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id), delta integer NOT NULL, balance_after integer NOT NULL CHECK(balance_after>=0), source text NOT NULL, reference text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(account_id,source,reference));
CREATE TABLE admin_audit_log(id uuid PRIMARY KEY,actor uuid NOT NULL REFERENCES accounts(id),target uuid REFERENCES accounts(id),action text NOT NULL,reason text NOT NULL,before_value jsonb NOT NULL,after_value jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE notifications(id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id), kind text NOT NULL CHECK(kind IN ('CHALLENGE_ACCEPTED','MATCH_RECOVERY','SYSTEM_NOTICE')),match_id uuid REFERENCES matches(id),created_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz,attempts integer NOT NULL DEFAULT 0,UNIQUE(account_id,kind,match_id));
CREATE TABLE service_heartbeat(id integer PRIMARY KEY CHECK(id=1),seen_at timestamptz NOT NULL);
CREATE FUNCTION forbid_immutable_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'append-only table'; END $$;
CREATE TRIGGER ledger_immutable BEFORE UPDATE OR DELETE ON coin_ledger FOR EACH ROW EXECUTE FUNCTION forbid_immutable_mutation();
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON admin_audit_log FOR EACH ROW EXECUTE FUNCTION forbid_immutable_mutation();
CREATE TRIGGER events_immutable BEFORE UPDATE OR DELETE ON match_events FOR EACH ROW EXECUTE FUNCTION forbid_immutable_mutation();

ALTER TABLE match_players ADD COLUMN control_id uuid;
