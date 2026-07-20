import { connectMongo } from '@/lib/mongodb';
import SiteSettingModel from '@/lib/models/SiteSetting';
import type { SiteSettingsMap } from '@/types/site-settings';
import { SiteSettingsForm } from './_components/site-settings-form';

export const dynamic = 'force-dynamic';

export default async function AdminSitePage() {
  await connectMongo();
  const settings = await SiteSettingModel.find().lean();

  const map: SiteSettingsMap = {};
  for (const setting of settings) {
    const { key, value } = setting as unknown as { key: string; value: unknown };
    (map as Record<string, unknown>)[key] = value;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Site</h1>
        <p className="mt-2 text-sm text-slate-600">
          Conteúdos globais do site público: imagens de fundo e biografia. As alterações aparecem no
          site em até 10 segundos (revalidate do frontend).
        </p>
      </div>
      <SiteSettingsForm initialSettings={map} />
    </div>
  );
}
