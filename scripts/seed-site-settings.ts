/**
 * Seed das configurações do site (sitesettings).
 *
 * Popula o banco com o conteúdo que hoje está hardcoded no frontend:
 *   - home_background          (foto do Zé na home)
 *   - messages_post_background (foto revelada pelas bolhas em /messages/post)
 *   - biography_pt / biography_en (linha do tempo completa da biografia)
 *
 * É IDEMPOTENTE e NÃO SOBRESCREVE: se a chave já existe no banco, ela é
 * pulada. Assim, rodar o seed de novo nunca apaga edições feitas no admin.
 * Para forçar a re-seed de uma chave, delete o documento antes.
 *
 * Uso: npm run seed:site-settings
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import {
  DEFAULT_HOME_BACKGROUND,
  DEFAULT_MESSAGES_POST_BACKGROUND,
  DEFAULT_BIOGRAPHY_PT,
  DEFAULT_BIOGRAPHY_EN
} from './site-settings-defaults';

// Carrega .env.local / .env sem depender do pacote dotenv.
for (const file of ['.env.local', '.env']) {
  const envPath = path.join(process.cwd(), file);
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI || !MONGODB_DB_NAME) {
  console.error('Defina MONGODB_URI e MONGODB_DB_NAME no .env antes de rodar o seed.');
  process.exit(1);
}

const SiteSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

const SiteSetting =
  mongoose.models.SiteSetting || mongoose.model('SiteSetting', SiteSettingSchema);

const SEEDS: Array<{ key: string; value: unknown; label: string }> = [
  { key: 'home_background', value: DEFAULT_HOME_BACKGROUND, label: 'Imagem de fundo da Home' },
  {
    key: 'messages_post_background',
    value: DEFAULT_MESSAGES_POST_BACKGROUND,
    label: 'Imagem de fundo de /messages/post'
  },
  { key: 'biography_pt', value: DEFAULT_BIOGRAPHY_PT, label: 'Biografia (PT-BR)' },
  { key: 'biography_en', value: DEFAULT_BIOGRAPHY_EN, label: 'Biografia (EN)' }
];

async function main() {
  await mongoose.connect(MONGODB_URI as string, { dbName: MONGODB_DB_NAME });
  console.log(`Conectado ao banco "${MONGODB_DB_NAME}".\n`);

  for (const seed of SEEDS) {
    const existing = await SiteSetting.findOne({ key: seed.key });
    if (existing) {
      console.log(`⏭  ${seed.label} (${seed.key}) — já existe, pulando.`);
      continue;
    }

    await SiteSetting.create({ key: seed.key, value: seed.value });
    console.log(`✅ ${seed.label} (${seed.key}) — criada.`);
  }

  await mongoose.disconnect();
  console.log('\nSeed concluído.');
}

main().catch((error) => {
  console.error('Erro no seed:', error);
  process.exit(1);
});
