import { connectMongo } from '@/lib/mongodb';
import DvdModel from '@/lib/models/Dvd';
import { Types } from 'mongoose';

async function fixDvdTracks() {
  await connectMongo();

  const dvds = await DvdModel.find({});

  for (const dvd of dvds) {
    if (!Array.isArray(dvd.track)) continue;

    const cleanedTracks = dvd.track
      .map((item) => {
        if (item && typeof item === 'object' && 'ref' in (item as Record<string, unknown>)) {
          return (item as { ref?: unknown }).ref ?? null;
        }
        return item;
      })
      .map((value) => {
        if (value instanceof Types.ObjectId) return value;
        if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
          return new Types.ObjectId(value);
        }
        return null;
      })
      .filter((value): value is Types.ObjectId => value !== null);

    dvd.track = cleanedTracks;
    await dvd.save();
    console.log(`✅ DVD ${dvd.title} corrigido`);
  }

  console.log('✅ Migração concluída!');
  process.exit(0);
}

fixDvdTracks().catch((error) => {
  console.error('❌ Erro ao corrigir DVDs', error);
  process.exit(1);
});
