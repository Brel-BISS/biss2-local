-- ================================================================
--  BISS 2 — Schéma base de données locale PostgreSQL
--  BISS Tech — Douala, Cameroun
--  Version locale (sans Supabase, sans Lovable)
-- ================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────────
-- SOCIETES
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS societes (
  id          TEXT PRIMARY KEY,
  nom         TEXT NOT NULL,
  secteur     TEXT,
  ville       TEXT DEFAULT 'Douala',
  responsable TEXT,
  email       TEXT UNIQUE,
  telephone   TEXT,
  cree_le     TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────
-- UTILISATEURS (remplace Supabase Auth)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS utilisateurs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  societe_id  TEXT REFERENCES societes(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  mot_de_passe TEXT NOT NULL,  -- bcrypt hash
  est_admin   BOOLEAN DEFAULT false,
  cree_le     TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────
-- SYSTEMES (modules ESP32)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS systemes (
  id                   TEXT PRIMARY KEY,
  societe_id           TEXT NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  nom                  TEXT NOT NULL,
  mac                  TEXT UNIQUE,
  ip                   TEXT,
  ssid                 TEXT,
  en_ligne             BOOLEAN DEFAULT false,
  dernier_contact      TIMESTAMPTZ,
  description          TEXT DEFAULT '',
  lieu                 TEXT DEFAULT '',
  batiment             TEXT DEFAULT '',
  etage                TEXT DEFAULT 'RDC',
  type_acces           TEXT DEFAULT 'Entrée/Sortie' CHECK (type_acces IN ('Entrée','Sortie','Entrée/Sortie','Parking','Ascenseur','Autre')),
  photo_url            TEXT,
  coordonnees_gps      JSONB DEFAULT '{"lat":null,"lng":null}'::jsonb,
  horaires_actifs      JSONB DEFAULT '{"debut":"00:00","fin":"23:59","jours":"LMMJVSD"}'::jsonb,
  niveau_securite      INTEGER DEFAULT 1 CHECK (niveau_securite BETWEEN 1 AND 3),
  firmware_version     TEXT DEFAULT '4.1.0',
  rssi                 INTEGER DEFAULT 0,
  duree_ouverture      INTEGER DEFAULT 5 CHECK (duree_ouverture BETWEEN 1 AND 30),
  wifi_config          JSONB DEFAULT '{"ssid":"","password":"","ip_statique":"","gateway":"","masque":""}'::jsonb,
  mode_enrolement      BOOLEAN DEFAULT false,
  mode_enrolement_type TEXT DEFAULT 'ajout',
  enrolement_expire_le TIMESTAMPTZ,
  cree_le              TIMESTAMPTZ DEFAULT now(),
  cree_par             TEXT DEFAULT ''
);

-- ────────────────────────────────────────────────────────────────
-- PERSONNEL
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS personnel (
  id               TEXT PRIMARY KEY,
  societe_id       TEXT NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  uid              TEXT NOT NULL,
  nom              TEXT NOT NULL,
  prenom           TEXT,
  departement      TEXT,
  poste            TEXT,
  matricule        TEXT,
  telephone        TEXT,
  email            TEXT DEFAULT '',
  photo_url        TEXT,
  type_badge       TEXT CHECK (type_badge IN ('Standard','Admin','Invité')) DEFAULT 'Standard',
  heure_debut      TEXT,
  heure_fin        TEXT,
  expiration       DATE,
  statut           TEXT CHECK (statut IN ('Actif','Inactif','Blacklisté')) DEFAULT 'Actif',
  module_enrolement TEXT,
  jours_autorises  TEXT DEFAULT 'LMMJVSD',
  max_acces_jour   INTEGER DEFAULT 0,
  notes            TEXT DEFAULT '',
  enrole_le        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (societe_id, uid)
);

-- ────────────────────────────────────────────────────────────────
-- ACCES LOGS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS acces_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  societe_id  TEXT NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  horodatage  TIMESTAMPTZ DEFAULT now(),
  uid         TEXT,
  nom         TEXT,
  prenom      TEXT,
  departement TEXT,
  porte_id    TEXT,
  sens        TEXT CHECK (sens IN ('Entrée','Sortie')),
  resultat    TEXT CHECK (resultat IN ('Autorisé','Refusé','Alarme')),
  raison      TEXT
);

-- ────────────────────────────────────────────────────────────────
-- ENROLEMENTS EN ATTENTE
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrolements_attente (
  id          BIGSERIAL PRIMARY KEY,
  societe_id  TEXT NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  uid         TEXT NOT NULL,
  module_id   TEXT,
  horodatage  TIMESTAMPTZ DEFAULT now(),
  traite      BOOLEAN DEFAULT false
);

-- ────────────────────────────────────────────────────────────────
-- FIRMWARE VERSIONS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS firmware_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  societe_id  TEXT NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  version     TEXT NOT NULL,
  description TEXT DEFAULT '',
  fichier_url TEXT NOT NULL,
  taille_kb   INTEGER DEFAULT 0,
  checksum_md5 TEXT DEFAULT '',
  cree_le     TIMESTAMPTZ DEFAULT now(),
  cree_par    TEXT DEFAULT ''
);

-- ────────────────────────────────────────────────────────────────
-- OTA DEPLOIEMENTS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ota_deploiements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  societe_id    TEXT NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  firmware_id   UUID REFERENCES firmware_versions(id) ON DELETE SET NULL,
  systeme_id    TEXT REFERENCES systemes(id) ON DELETE CASCADE,
  statut        TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente','en_cours','succes','echec')),
  progression   INTEGER DEFAULT 0,
  version_avant TEXT DEFAULT '',
  version_apres TEXT DEFAULT '',
  message_erreur TEXT DEFAULT '',
  demarre_le    TIMESTAMPTZ DEFAULT now(),
  termine_le    TIMESTAMPTZ
);

-- ────────────────────────────────────────────────────────────────
-- COMMANDES (vers ESP32 via heartbeat)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commandes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  societe_id  TEXT NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  systeme_id  TEXT REFERENCES systemes(id) ON DELETE CASCADE,
  cmd         TEXT NOT NULL,
  payload     JSONB DEFAULT '{}'::jsonb,
  consommee   BOOLEAN DEFAULT false,
  cree_le     TIMESTAMPTZ DEFAULT now(),
  consommee_le TIMESTAMPTZ
);

-- ────────────────────────────────────────────────────────────────
-- VUE PRESENCES
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_presences AS
SELECT
  societe_id,
  uid,
  (date_trunc('day', horodatage AT TIME ZONE 'Africa/Douala'))::date AS jour,
  MIN(horodatage) AS arrivee,
  MAX(horodatage) AS depart,
  COUNT(*)        AS passages
FROM acces_logs
WHERE resultat = 'Autorisé'
GROUP BY societe_id, uid, jour;

-- ────────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_acces_logs_societe_horodatage ON acces_logs(societe_id, horodatage DESC);
CREATE INDEX IF NOT EXISTS idx_acces_logs_uid ON acces_logs(uid);
CREATE INDEX IF NOT EXISTS idx_personnel_societe_uid ON personnel(societe_id, uid);
CREATE INDEX IF NOT EXISTS idx_commandes_systeme_consommee ON commandes(systeme_id, consommee);
CREATE INDEX IF NOT EXISTS idx_systemes_societe ON systemes(societe_id);

-- ────────────────────────────────────────────────────────────────
-- DONNEES DE DEMO
-- ────────────────────────────────────────────────────────────────

-- Société
INSERT INTO societes (id, nom, secteur, ville, responsable, email, telephone)
VALUES ('soc-demo', 'Camrail Logistique', 'Transport', 'Douala', 'Alain Nkomo', 'contact@camrail-demo.cm', '+237 699 000 001')
ON CONFLICT (id) DO NOTHING;

-- Utilisateurs (mots de passe: admin2024 / biss2024 — hash bcrypt)
INSERT INTO utilisateurs (id, societe_id, email, mot_de_passe, est_admin)
VALUES
  ('00000000-0000-0000-0000-000000000001', NULL, 'admin@biss.tech',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', true),
  ('00000000-0000-0000-0000-000000000002', 'soc-demo', 'demo@camrail.cm',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', false)
ON CONFLICT (email) DO NOTHING;

-- Modules ESP32
INSERT INTO systemes (id, societe_id, nom, mac, ip, ssid, en_ligne, firmware_version, etage, batiment, lieu, type_acces, niveau_securite, duree_ouverture)
VALUES
  ('P1', 'soc-demo', 'Entrée principale', 'A0:B7:65:2C:11:04', '192.168.1.50', 'BISS-WiFi', true,  '4.1.0', 'RDC',       'Bâtiment A', 'Hall', 'Entrée/Sortie', 2, 5),
  ('P2', 'soc-demo', 'Atelier technique', 'A0:B7:65:2C:33:9E', '192.168.1.51', 'BISS-WiFi', true,  '4.1.0', '1er étage', 'Bâtiment B', 'Atelier', 'Entrée',       1, 5),
  ('P3', 'soc-demo', 'Salle serveurs',    'A0:B7:65:2C:77:B2', '192.168.1.52', 'BISS-WiFi', false, '4.0.0', '2ème étage','Bâtiment A', 'Data', 'Entrée',         3, 3)
ON CONFLICT (id) DO NOTHING;

-- Personnel
INSERT INTO personnel (id, societe_id, uid, nom, prenom, departement, poste, type_badge, statut, heure_debut, heure_fin)
VALUES
  ('soc-demo:04A2B7C1', 'soc-demo', '04A2B7C1', 'NKOMO',    'Alain',   'Direction',    'Directeur Général', 'Admin',    'Actif',     NULL,    NULL),
  ('soc-demo:04C3D8E2', 'soc-demo', '04C3D8E2', 'MBALLA',   'Estelle', 'Comptabilité', 'Comptable',         'Standard', 'Actif',     '08:00', '18:00'),
  ('soc-demo:04E5F9A3', 'soc-demo', '04E5F9A3', 'TCHOUMI',  'Boris',   'Technique',    'Technicien',        'Standard', 'Actif',     '07:00', '16:00'),
  ('soc-demo:04B1C4D5', 'soc-demo', '04B1C4D5', 'NGO BELL', 'Sandrine','Commercial',   'Commerciale',       'Standard', 'Actif',     '08:30', '17:30'),
  ('soc-demo:04F7A2B9', 'soc-demo', '04F7A2B9', 'ETOUNDI',  'Cyrille', 'Sécurité',     'Chef Sécurité',     'Admin',    'Actif',     NULL,    NULL),
  ('soc-demo:04D9E3C7', 'soc-demo', '04D9E3C7', 'FOTSO',    'Marlène', 'Technique',    'Technicienne',      'Standard', 'Inactif',   '08:00', '17:00'),
  ('soc-demo:04A8B6F2', 'soc-demo', '04A8B6F2', 'KAMDEM',   'Yves',    'Prestataire',  'Prestataire',       'Invité',   'Actif',     '09:00', '13:00'),
  ('soc-demo:04C2E7D4', 'soc-demo', '04C2E7D4', 'OWONA',    'Grâce',   'Commercial',   'Commerciale',       'Standard', 'Actif',     '08:00', '17:00'),
  ('soc-demo:04E4A1B8', 'soc-demo', '04E4A1B8', 'BIKOI',    'Serge',   'Prestataire',  'Agent',             'Invité',   'Blacklisté','10:00', '12:00')
ON CONFLICT (societe_id, uid) DO NOTHING;
