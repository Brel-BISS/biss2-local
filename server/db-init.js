// ================================================================
//  BISS 2 — Initialisation base de données PostgreSQL locale
//  Exécutez : node server/db-init.js
// ================================================================

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_HOST     = process.env.DB_HOST     || 'localhost';
const DB_PORT     = process.env.DB_PORT     || '5432';
const DB_NAME     = process.env.DB_NAME     || 'biss2';
const DB_USER     = process.env.DB_USER     || 'biss2';
const DB_PASSWORD = process.env.DB_PASSWORD || 'biss2_password';

async function init() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' BISS 2 — Initialisation base de données');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Connexion en postgres pour créer l'utilisateur et la base
  const admin = new Client({ host: DB_HOST, port: parseInt(DB_PORT), database: 'postgres', user: 'postgres' });
  try {
    await admin.connect();
    console.log('✓ Connecté en tant que postgres');

    // Créer l'utilisateur si inexistant
    const { rows: users } = await admin.query(
      `SELECT 1 FROM pg_roles WHERE rolname=$1`, [DB_USER]
    );
    if (users.length === 0) {
      await admin.query(`CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}'`);
      console.log(`✓ Utilisateur «${DB_USER}» créé`);
    } else {
      console.log(`→ Utilisateur «${DB_USER}» déjà existant`);
    }

    // Créer la base si inexistante
    const { rows: dbs } = await admin.query(
      `SELECT 1 FROM pg_database WHERE datname=$1`, [DB_NAME]
    );
    if (dbs.length === 0) {
      await admin.query(`CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}`);
      console.log(`✓ Base «${DB_NAME}» créée`);
    } else {
      console.log(`→ Base «${DB_NAME}» déjà existante`);
    }

    await admin.query(`GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER}`);
    console.log('✓ Privilèges accordés');
  } finally {
    await admin.end();
  }

  // 2. Appliquer le schéma
  const biss2 = new Client({
    host: DB_HOST, port: parseInt(DB_PORT),
    database: DB_NAME, user: DB_USER, password: DB_PASSWORD
  });
  try {
    await biss2.connect();
    console.log('\n→ Application du schéma...');
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    await biss2.query(schema);
    console.log('✓ Schéma et données de démo appliqués');
  } finally {
    await biss2.end();
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' ✅ Base de données BISS 2 prête !');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n Comptes de démo :');
  console.log('   Admin   : admin@biss.tech  / password');
  console.log('   Société : demo@camrail.cm  / password');
  console.log('\n Démarrer le serveur :');
  console.log('   npm run server\n');
}

init().catch(e => {
  console.error('\n❌ Erreur :', e.message);
  console.error('\nSolution :');
  console.error('  1. Vérifiez que PostgreSQL est installé et démarré');
  console.error('  2. Assurez-vous que l\'utilisateur postgres peut se connecter');
  console.error('  3. Essayez : sudo -u postgres psql -c "\\l"');
  process.exit(1);
});
