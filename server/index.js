// ================================================================
//  BISS 2 — Serveur local Express + PostgreSQL
//  BISS Tech — Douala, Cameroun
//  Remplace Supabase cloud — 100% local
// ================================================================

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

// ── Config ────────────────────────────────────────────────────────
const PORT       = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'biss2_jwt_secret_local_2024';
const API_KEY    = 'biss2_esp32_key';

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'biss2',
  user:     process.env.DB_USER     || 'biss2',
  password: process.env.DB_PASSWORD || 'biss2_password',
});

const app    = express();
const server = createServer(app);

// ── WebSocket (Realtime — remplace Supabase Realtime) ─────────────
const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

function broadcast(event, data) {
  const msg = JSON.stringify({ event, data });
  for (const client of clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

// ── Middlewares ───────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Auth middleware ───────────────────────────────────────────────
function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ erreur: 'Non authentifié' });
  try {
    const token = header.replace('Bearer ', '');
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ erreur: 'Token invalide' });
  }
}

function json(res, body, status = 200) {
  return res.status(status).json(body);
}

// ════════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════════

// POST /api/auth/connexion
app.post('/api/auth/connexion', async (req, res) => {
  const { email, mot_de_passe } = req.body;
  if (!email || !mot_de_passe)
    return json(res, { erreur: 'Email et mot de passe requis' }, 400);

  const { rows } = await pool.query(
    'SELECT * FROM utilisateurs WHERE email = $1', [email]
  );
  const user = rows[0];
  if (!user || !await bcrypt.compare(mot_de_passe, user.mot_de_passe))
    return json(res, { erreur: 'Identifiants incorrects' }, 401);

  const token = jwt.sign(
    { id: user.id, email: user.email, societe_id: user.societe_id, est_admin: user.est_admin },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  json(res, { token, utilisateur: { id: user.id, email: user.email, societe_id: user.societe_id, est_admin: user.est_admin } });
});

// POST /api/auth/inscription
app.post('/api/auth/inscription', async (req, res) => {
  const { nom, secteur, ville, responsable, email, telephone, mot_de_passe } = req.body;
  if (!email || !mot_de_passe || !nom)
    return json(res, { erreur: 'Champs obligatoires manquants' }, 400);

  const societeId = 'soc-' + Date.now().toString(36);
  const hash = await bcrypt.hash(mot_de_passe, 10);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO societes (id, nom, secteur, ville, responsable, email, telephone)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [societeId, nom, secteur || '', ville || 'Douala', responsable || '', email, telephone || '']
    );
    const { rows } = await client.query(
      `INSERT INTO utilisateurs (id, societe_id, email, mot_de_passe)
       VALUES ($1,$2,$3,$4) RETURNING id, email, societe_id, est_admin`,
      [uuidv4(), societeId, email, hash]
    );
    await client.query('COMMIT');
    const user = rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, societe_id: user.societe_id, est_admin: user.est_admin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    json(res, { token, utilisateur: user });
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23505') return json(res, { erreur: 'Email déjà utilisé' }, 409);
    json(res, { erreur: e.message }, 500);
  } finally {
    client.release();
  }
});

// GET /api/auth/moi
app.get('/api/auth/moi', authRequired, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.societe_id, u.est_admin, s.nom as societe_nom
     FROM utilisateurs u LEFT JOIN societes s ON s.id = u.societe_id
     WHERE u.id = $1`, [req.user.id]
  );
  if (!rows[0]) return json(res, { erreur: 'Utilisateur introuvable' }, 404);
  json(res, rows[0]);
});

// ════════════════════════════════════════════════════════════════
//  SOCIETES
// ════════════════════════════════════════════════════════════════
app.get('/api/societes/:id', authRequired, async (req, res) => {
  const sid = req.user.est_admin ? req.params.id : req.user.societe_id;
  const { rows } = await pool.query('SELECT * FROM societes WHERE id = $1', [sid]);
  if (!rows[0]) return json(res, { erreur: 'Introuvable' }, 404);
  json(res, rows[0]);
});

app.put('/api/societes/:id', authRequired, async (req, res) => {
  const { nom, secteur, ville, responsable, email, telephone } = req.body;
  await pool.query(
    `UPDATE societes SET nom=$1, secteur=$2, ville=$3, responsable=$4, email=$5, telephone=$6
     WHERE id=$7`,
    [nom, secteur, ville, responsable, email, telephone, req.params.id]
  );
  const { rows } = await pool.query('SELECT * FROM societes WHERE id=$1', [req.params.id]);
  json(res, rows[0]);
});

// ════════════════════════════════════════════════════════════════
//  SYSTEMES (modules ESP32)
// ════════════════════════════════════════════════════════════════
app.get('/api/systemes', authRequired, async (req, res) => {
  const sid = req.user.societe_id;
  const { rows } = await pool.query(
    'SELECT * FROM systemes WHERE societe_id=$1 ORDER BY id', [sid]
  );
  json(res, rows);
});

app.post('/api/systemes', authRequired, async (req, res) => {
  const s = req.body;
  const sid = req.user.societe_id;
  const { rows } = await pool.query(
    `INSERT INTO systemes (id, societe_id, nom, mac, ip, description, lieu, batiment, etage,
      type_acces, niveau_securite, duree_ouverture, cree_par)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [s.id || ('M-'+Date.now().toString(36)), sid, s.nom, s.mac||null, s.ip||null,
     s.description||'', s.lieu||'', s.batiment||'', s.etage||'RDC',
     s.type_acces||'Entrée/Sortie', s.niveau_securite||1, s.duree_ouverture||5,
     req.user.email]
  );
  json(res, rows[0], 201);
});

app.put('/api/systemes/:id', authRequired, async (req, res) => {
  const s = req.body;
  const { rows } = await pool.query(
    `UPDATE systemes SET nom=$1, description=$2, lieu=$3, batiment=$4, etage=$5,
      type_acces=$6, niveau_securite=$7, duree_ouverture=$8, mac=$9, ip=$10
     WHERE id=$11 AND societe_id=$12 RETURNING *`,
    [s.nom, s.description||'', s.lieu||'', s.batiment||'', s.etage||'RDC',
     s.type_acces||'Entrée/Sortie', s.niveau_securite||1, s.duree_ouverture||5,
     s.mac||null, s.ip||null, req.params.id, req.user.societe_id]
  );
  json(res, rows[0]);
});

app.delete('/api/systemes/:id', authRequired, async (req, res) => {
  await pool.query('DELETE FROM systemes WHERE id=$1 AND societe_id=$2',
    [req.params.id, req.user.societe_id]);
  json(res, { ok: true });
});

// Envoyer une commande au module
app.post('/api/systemes/:id/commande', authRequired, async (req, res) => {
  const { cmd, payload } = req.body;
  const sid = req.user.societe_id;
  const { rows } = await pool.query(
    `INSERT INTO commandes (id, societe_id, systeme_id, cmd, payload)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [uuidv4(), sid, req.params.id, cmd, JSON.stringify(payload||{})]
  );
  broadcast('commande', { systeme_id: req.params.id, cmd, payload });
  json(res, rows[0], 201);
});

// ════════════════════════════════════════════════════════════════
//  PERSONNEL
// ════════════════════════════════════════════════════════════════
app.get('/api/personnel', authRequired, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM personnel WHERE societe_id=$1 ORDER BY nom, prenom',
    [req.user.societe_id]
  );
  json(res, rows);
});

app.post('/api/personnel', authRequired, async (req, res) => {
  const p = req.body;
  const sid = req.user.societe_id;
  const pid = `${sid}:${p.uid}`;
  const { rows } = await pool.query(
    `INSERT INTO personnel (id, societe_id, uid, nom, prenom, departement, poste, matricule,
      telephone, email, type_badge, heure_debut, heure_fin, expiration, statut, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [pid, sid, p.uid, p.nom.toUpperCase(), p.prenom||null, p.departement||null,
     p.poste||null, p.matricule||null, p.telephone||null, p.email||'',
     p.type_badge||'Standard', p.heure_debut||null, p.heure_fin||null,
     p.expiration||null, p.statut||'Actif', p.notes||'']
  );
  json(res, rows[0], 201);
});

app.put('/api/personnel/:id', authRequired, async (req, res) => {
  const p = req.body;
  const { rows } = await pool.query(
    `UPDATE personnel SET nom=$1, prenom=$2, departement=$3, poste=$4, matricule=$5,
      telephone=$6, email=$7, type_badge=$8, heure_debut=$9, heure_fin=$10,
      expiration=$11, statut=$12, notes=$13
     WHERE id=$14 AND societe_id=$15 RETURNING *`,
    [p.nom.toUpperCase(), p.prenom||null, p.departement||null, p.poste||null,
     p.matricule||null, p.telephone||null, p.email||'', p.type_badge||'Standard',
     p.heure_debut||null, p.heure_fin||null, p.expiration||null, p.statut||'Actif',
     p.notes||'', req.params.id, req.user.societe_id]
  );
  json(res, rows[0]);
});

app.delete('/api/personnel/:id', authRequired, async (req, res) => {
  await pool.query('DELETE FROM personnel WHERE id=$1 AND societe_id=$2',
    [req.params.id, req.user.societe_id]);
  json(res, { ok: true });
});

// ════════════════════════════════════════════════════════════════
//  ACCES LOGS
// ════════════════════════════════════════════════════════════════
app.get('/api/acces-logs', authRequired, async (req, res) => {
  const { page=1, limit=20, search='', resultat='', date_debut='', date_fin='' } = req.query;
  const offset = (parseInt(page)-1) * parseInt(limit);
  let where = ['a.societe_id=$1'];
  const params = [req.user.societe_id];
  let i = 2;
  if (search) { where.push(`(a.nom ILIKE $${i} OR a.uid ILIKE $${i} OR a.porte_id ILIKE $${i})`); params.push(`%${search}%`); i++; }
  if (resultat) { where.push(`a.resultat=$${i}`); params.push(resultat); i++; }
  if (date_debut) { where.push(`a.horodatage >= $${i}`); params.push(date_debut); i++; }
  if (date_fin) { where.push(`a.horodatage <= $${i}`); params.push(date_fin); i++; }

  const sql = `SELECT * FROM acces_logs a WHERE ${where.join(' AND ')} ORDER BY horodatage DESC LIMIT $${i} OFFSET $${i+1}`;
  params.push(parseInt(limit), offset);
  const { rows } = await pool.query(sql, params);

  const cntSql = `SELECT COUNT(*) FROM acces_logs a WHERE ${where.join(' AND ')}`;
  const { rows: cnt } = await pool.query(cntSql, params.slice(0, -2));
  json(res, { logs: rows, total: parseInt(cnt[0].count), page: parseInt(page), limit: parseInt(limit) });
});

// ════════════════════════════════════════════════════════════════
//  TRACABILITE / PRESENCES
// ════════════════════════════════════════════════════════════════
app.get('/api/presences', authRequired, async (req, res) => {
  const { date, uid } = req.query;
  let where = ['a.societe_id=$1', "a.resultat='Autorisé'"];
  const params = [req.user.societe_id];
  let i = 2;
  if (date) { where.push(`(a.horodatage AT TIME ZONE 'Africa/Douala')::date = $${i}`); params.push(date); i++; }
  if (uid)  { where.push(`a.uid = $${i}`); params.push(uid); i++; }

  const { rows } = await pool.query(
    `SELECT a.*, p.nom, p.prenom, p.departement
     FROM acces_logs a
     LEFT JOIN personnel p ON p.societe_id=a.societe_id AND p.uid=a.uid
     WHERE ${where.join(' AND ')}
     ORDER BY a.horodatage`,
    params
  );
  json(res, rows);
});

// ════════════════════════════════════════════════════════════════
//  DASHBOARD KPIs
// ════════════════════════════════════════════════════════════════
app.get('/api/dashboard', authRequired, async (req, res) => {
  const sid = req.user.societe_id;
  const [kpi, horaire, modules] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE horodatage::date = CURRENT_DATE) as total_jour,
        COUNT(*) FILTER (WHERE resultat='Autorisé' AND horodatage::date=CURRENT_DATE) as ok_jour,
        COUNT(*) FILTER (WHERE resultat IN ('Refusé','Alarme') AND horodatage::date=CURRENT_DATE) as refus_jour,
        COUNT(*) as total_all
      FROM acces_logs WHERE societe_id=$1
    `, [sid]),
    pool.query(`
      SELECT
        EXTRACT(HOUR FROM horodatage AT TIME ZONE 'Africa/Douala')::int as heure,
        COUNT(*) FILTER (WHERE resultat='Autorisé') as ok,
        COUNT(*) FILTER (WHERE resultat IN ('Refusé','Alarme')) as refus
      FROM acces_logs
      WHERE societe_id=$1 AND horodatage >= NOW()-INTERVAL '24 hours'
      GROUP BY heure ORDER BY heure
    `, [sid]),
    pool.query(`
      SELECT id, nom, en_ligne, ip, firmware_version, rssi, dernier_contact
      FROM systemes WHERE societe_id=$1
    `, [sid])
  ]);
  json(res, {
    kpi: kpi.rows[0],
    par_heure: horaire.rows,
    modules: modules.rows
  });
});

// ════════════════════════════════════════════════════════════════
//  FIRMWARE OTA
// ════════════════════════════════════════════════════════════════
app.get('/api/firmwares', authRequired, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM firmware_versions WHERE societe_id=$1 ORDER BY cree_le DESC',
    [req.user.societe_id]
  );
  json(res, rows);
});

app.post('/api/firmwares', authRequired, async (req, res) => {
  const { version, description, fichier_url, taille_kb, checksum_md5 } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO firmware_versions (id, societe_id, version, description, fichier_url, taille_kb, checksum_md5, cree_par)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [uuidv4(), req.user.societe_id, version, description||'', fichier_url, taille_kb||0, checksum_md5||'', req.user.email]
  );
  json(res, rows[0], 201);
});

app.get('/api/ota-deploiements', authRequired, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM ota_deploiements WHERE societe_id=$1 ORDER BY demarre_le DESC LIMIT 100',
    [req.user.societe_id]
  );
  json(res, rows);
});

app.post('/api/ota-deploiements', authRequired, async (req, res) => {
  const { firmware_id, systeme_id } = req.body;
  // Récupérer URL du firmware
  const fw = await pool.query('SELECT * FROM firmware_versions WHERE id=$1', [firmware_id]);
  if (!fw.rows[0]) return json(res, { erreur: 'Firmware introuvable' }, 404);
  const sys = await pool.query('SELECT firmware_version FROM systemes WHERE id=$1', [systeme_id]);

  const { rows } = await pool.query(
    `INSERT INTO ota_deploiements (id, societe_id, firmware_id, systeme_id, statut, version_avant)
     VALUES ($1,$2,$3,$4,'en_attente',$5) RETURNING *`,
    [uuidv4(), req.user.societe_id, firmware_id, systeme_id, sys.rows[0]?.firmware_version||'']
  );

  // Insérer la commande OTA dans la file
  await pool.query(
    `INSERT INTO commandes (id, societe_id, systeme_id, cmd, payload)
     VALUES ($1,$2,$3,'OTA',$4)`,
    [uuidv4(), req.user.societe_id, systeme_id,
     JSON.stringify({ url: fw.rows[0].fichier_url, deploiement_id: rows[0].id, version: fw.rows[0].version })]
  );
  broadcast('ota', { deploiement: rows[0] });
  json(res, rows[0], 201);
});

// ════════════════════════════════════════════════════════════════
//  ENROLEMENTS EN ATTENTE
// ════════════════════════════════════════════════════════════════
app.get('/api/enrolements-attente', authRequired, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM enrolements_attente WHERE societe_id=$1 AND traite=false ORDER BY horodatage DESC',
    [req.user.societe_id]
  );
  json(res, rows);
});

app.put('/api/enrolements-attente/:id/traiter', authRequired, async (req, res) => {
  await pool.query(
    'UPDATE enrolements_attente SET traite=true WHERE id=$1 AND societe_id=$2',
    [req.params.id, req.user.societe_id]
  );
  json(res, { ok: true });
});

// ════════════════════════════════════════════════════════════════
//  API PUBLIQUE ESP32 — COMPATIBLE FIRMWARE BISS 2 v4.x
//  Même interface que l'app Lovable — le firmware n'a PAS besoin
//  d'être modifié, il suffit de changer BASE_URL dans le .ino
// ════════════════════════════════════════════════════════════════
function esp32Auth(req, res, next) {
  if (req.headers['x-api-key'] !== API_KEY)
    return res.status(401).json({ erreur: 'Clé API invalide' });
  next();
}

app.post('/api/public/esp32/:action', esp32Auth, async (req, res) => {
  const { action } = req.params;
  const body = req.body || {};
  const societeId = String(body.societe_id || '');
  const systemeId = String(body.systeme_id || body.porte_id || '');

  if (!societeId)
    return json(res, { erreur: 'societe_id requis' }, 400);

  switch (action) {

    // ── HEARTBEAT ────────────────────────────────────────────────
    case 'heartbeat': {
      const maj = {
        en_ligne: true,
        dernier_contact: new Date().toISOString(),
        ...(body.ip   ? { ip:   body.ip }                     : {}),
        ...(body.ssid ? { ssid: body.ssid }                   : {}),
        ...(body.rssi != null ? { rssi: parseInt(body.rssi) } : {}),
        ...(body.firmware_version ? { firmware_version: body.firmware_version } : {}),
      };
      const sets = Object.entries(maj).map(([k], i) => `${k}=$${i+1}`).join(', ');
      const vals = Object.values(maj);
      vals.push(systemeId, societeId);
      await pool.query(
        `UPDATE systemes SET ${sets} WHERE id=$${vals.length-1} AND societe_id=$${vals.length}`,
        vals
      );
      // Récupérer commandes en attente
      const { rows: cmds } = await pool.query(
        `SELECT * FROM commandes WHERE societe_id=$1 AND systeme_id=$2 AND consommee=false ORDER BY cree_le`,
        [societeId, systemeId]
      );
      if (cmds.length) {
        await pool.query(
          `UPDATE commandes SET consommee=true, consommee_le=now() WHERE id=ANY($1)`,
          [cmds.map(c => c.id)]
        );
      }
      broadcast('heartbeat', { systeme_id: systemeId, en_ligne: true, rssi: body.rssi });
      return json(res, { ok: true, commandes: cmds.map(c => ({ cmd: c.cmd, payload: c.payload })) });
    }

    // ── ACCES ────────────────────────────────────────────────────
    case 'acces': {
      const uid = String(body.uid || '');
      if (!uid) return json(res, { erreur: 'uid requis' }, 400);
      const sens = body.sens === 'Sortie' ? 'Sortie' : 'Entrée';
      const horodatage = body.horodatage || new Date().toISOString();

      const { rows: [p] } = await pool.query(
        `SELECT uid, nom, prenom, departement, statut, expiration, heure_debut, heure_fin
         FROM personnel WHERE societe_id=$1 AND uid=$2`,
        [societeId, uid]
      );

      let resultat = 'Autorisé', raison = 'OK';
      if (!p) {
        resultat = 'Alarme'; raison = 'Badge inconnu';
      } else if (p.statut === 'Blacklisté') {
        resultat = 'Alarme'; raison = 'Blacklisté';
      } else if (p.statut !== 'Actif') {
        resultat = 'Refusé'; raison = 'Expiré';
      } else if (p.expiration && new Date(p.expiration).getTime() < Date.now()) {
        resultat = 'Refusé'; raison = 'Expiré';
      } else if (p.heure_debut && p.heure_fin) {
        const d = new Date(horodatage);
        const hhmm = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        if (hhmm < p.heure_debut || hhmm > p.heure_fin) {
          resultat = 'Refusé'; raison = 'Hors horaire';
        }
      }

      const { rows: [log] } = await pool.query(
        `INSERT INTO acces_logs (id, societe_id, horodatage, uid, nom, prenom, departement, porte_id, sens, resultat, raison)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [uuidv4(), societeId, horodatage, uid, p?.nom||null, p?.prenom||null,
         p?.departement||null, systemeId, sens, resultat, raison]
      );
      broadcast('acces', log);
      return json(res, { autorise: resultat === 'Autorisé', raison, resultat });
    }

    // ── CARTE MAITRE ─────────────────────────────────────────────
    case 'carte-maitre': {
      const uid = String(body.uid || '');
      if (!uid) return json(res, { erreur: 'uid requis' }, 400);
      const { rows: [maitre] } = await pool.query(
        `SELECT uid, nom, prenom, type_badge, statut FROM personnel
         WHERE societe_id=$1 AND uid=$2`,
        [societeId, uid]
      );
      if (!maitre || maitre.type_badge !== 'Admin' || maitre.statut !== 'Actif')
        return json(res, { ok: false, raison: 'Carte maître non reconnue' }, 403);

      const { rows: [mod] } = await pool.query(
        `SELECT mode_enrolement, mode_enrolement_type, enrolement_expire_le
         FROM systemes WHERE id=$1 AND societe_id=$2`,
        [systemeId, societeId]
      );
      const encoreActif = mod?.mode_enrolement &&
        (!mod.enrolement_expire_le || new Date(mod.enrolement_expire_le).getTime() > Date.now());
      let mode = 'ajout';
      if (encoreActif) mode = mod?.mode_enrolement_type === 'ajout' ? 'suppression' : null;

      await pool.query(
        `UPDATE systemes SET mode_enrolement=$1, mode_enrolement_type=$2, enrolement_expire_le=$3
         WHERE id=$4 AND societe_id=$5`,
        [mode !== null, mode||'ajout',
         mode === null ? null : new Date(Date.now() + 60000).toISOString(),
         systemeId, societeId]
      );
      broadcast('enrolement', { systeme_id: systemeId, mode });
      return json(res, { ok: true, mode, expire_dans: mode ? 60 : 0 });
    }

    // ── BADGE ENROLEMENT ─────────────────────────────────────────
    case 'badge-enrolement': {
      const uid = String(body.uid || '');
      if (!uid) return json(res, { erreur: 'uid requis' }, 400);

      const { rows: [module] } = await pool.query(
        `SELECT mode_enrolement, mode_enrolement_type, enrolement_expire_le
         FROM systemes WHERE id=$1 AND societe_id=$2`,
        [systemeId, societeId]
      );
      const actif = module?.mode_enrolement &&
        (!module.enrolement_expire_le || new Date(module.enrolement_expire_le).getTime() > Date.now());
      if (!actif) return json(res, { ok: false, raison: 'Mode enrôlement inactif' }, 409);

      const { rows: [existant] } = await pool.query(
        `SELECT id, nom, prenom, type_badge FROM personnel WHERE societe_id=$1 AND uid=$2`,
        [societeId, uid]
      );

      if (module?.mode_enrolement_type === 'suppression') {
        await pool.query(
          `UPDATE systemes SET mode_enrolement=false, enrolement_expire_le=null WHERE id=$1 AND societe_id=$2`,
          [systemeId, societeId]
        );
        if (!existant) return json(res, { ok: false, raison: 'Badge inconnu' }, 404);
        if (existant.type_badge === 'Admin')
          return json(res, { ok: false, raison: 'Suppression carte maître interdite' }, 403);
        await pool.query('DELETE FROM personnel WHERE id=$1', [existant.id]);
        broadcast('personnel', { action: 'suppression', uid });
        return json(res, { ok: true, action: 'suppression', uid, personne: `${existant.nom} ${existant.prenom||''}`.trim() });
      }

      if (existant) return json(res, { ok: false, raison: 'Badge déjà enrôlé' }, 409);

      const { rows: [enrol] } = await pool.query(
        `INSERT INTO enrolements_attente (societe_id, uid, module_id, traite)
         VALUES ($1,$2,$3,false) RETURNING *`,
        [societeId, uid, systemeId]
      );
      await pool.query(
        `UPDATE systemes SET mode_enrolement=false, enrolement_expire_le=null WHERE id=$1 AND societe_id=$2`,
        [systemeId, societeId]
      );
      broadcast('enrolement_attente', enrol);
      return json(res, { ok: true, uid });
    }

    // ── OTA PROGRESSION ──────────────────────────────────────────
    case 'ota-progression': {
      const id = String(body.deploiement_id || '');
      if (!id) return json(res, { erreur: 'deploiement_id requis' }, 400);
      const statut = String(body.statut || 'en_cours');
      const termine = statut === 'succes' || statut === 'echec';
      await pool.query(
        `UPDATE ota_deploiements SET statut=$1, progression=$2, message_erreur=$3,
          termine_le=$4 WHERE id=$5 AND societe_id=$6`,
        [statut, Number(body.progression||0), body.message_erreur||'',
         termine ? new Date().toISOString() : null, id, societeId]
      );
      if (statut === 'succes' && body.version) {
        await pool.query(
          `UPDATE systemes SET firmware_version=$1 WHERE id=$2 AND societe_id=$3`,
          [body.version, systemeId, societeId]
        );
      }
      broadcast('ota_progression', { deploiement_id: id, statut, progression: body.progression });
      return json(res, { ok: true });
    }

    default:
      return json(res, { erreur: `Action inconnue : ${action}` }, 404);
  }
});

// ── Hors ligne détection (mark modules offline after 90s) ─────────
setInterval(async () => {
  try {
    const { rows } = await pool.query(
      `UPDATE systemes SET en_ligne=false
       WHERE en_ligne=true AND dernier_contact < NOW() - INTERVAL '90 seconds'
       RETURNING id, societe_id`
    );
    for (const s of rows) broadcast('hors_ligne', { systeme_id: s.id });
  } catch {}
}, 30000);

// ── Health check ──────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, service: 'BISS 2 Local Server', version: '1.0.0' }));

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   BISS 2 — Serveur local démarré                ║
║   Port API  : http://localhost:${PORT}             ║
║   WebSocket : ws://localhost:${PORT}               ║
║   BISS Tech — Douala, Cameroun                   ║
╚══════════════════════════════════════════════════╝
  `);
});
