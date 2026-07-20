import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongodb';
import ShowModel from '@/lib/models/Show';

export const dynamic = 'force-dynamic';

/**
 * Cron job — paridade com o Strapi v3 (config/functions/cron.js), porém com SOFT DELETE.
 *
 * O Strapi rodava todo dia às 00:01 e DELETAVA fisicamente os shows com data
 * anterior a hoje. Aqui, em vez de deletar, marcamos `showStatus: 'realizado'`,
 * que é o mesmo estado usado pelo DELETE manual do admin. O GET público de
 * /api/shows já exclui shows 'realizado' por padrão, então o efeito para o
 * visitante é idêntico — mas o histórico é preservado no banco.
 *
 * Agendamento: vercel.json → "1 0 * * *" (00:01, igual ao Strapi).
 *
 * Segurança: a Vercel envia automaticamente o header
 * `Authorization: Bearer ${CRON_SECRET}` quando a env var CRON_SECRET está
 * definida no projeto. Requisições sem esse header são rejeitadas.
 * Para disparo manual (teste): 
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/realize-past-shows
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    // Em produção o segredo é obrigatório para evitar disparos anônimos.
    console.error('[cron] CRON_SECRET não configurado — abortando.');
    return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 503 });
  }

  await connectMongo();

  // Início do dia de hoje (UTC). O campo `date` guarda apenas a data do show,
  // então qualquer show com date < hoje já aconteceu.
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const filter = {
    date: { $lt: startOfToday },
    $or: [{ showStatus: { $ne: 'realizado' } }, { showStatus: { $exists: false } }]
  };

  const pastShows = await ShowModel.find(filter).select('_id title city cidade date').lean();

  if (pastShows.length === 0) {
    return NextResponse.json({ ok: true, realized: 0, message: 'Nenhum show passado para marcar.' });
  }

  const result = await ShowModel.updateMany(filter, { $set: { showStatus: 'realizado' } });

  console.log(
    `[cron] ${new Date().toISOString()} — ${result.modifiedCount} show(s) marcados como realizado:`,
    pastShows.map((s) => `${(s as { title?: string; cidade?: string; city?: string }).title ?? (s as { cidade?: string }).cidade ?? (s as { city?: string }).city} (${new Date(s.date as Date).toISOString().slice(0, 10)})`).join(', ')
  );

  return NextResponse.json({
    ok: true,
    realized: result.modifiedCount,
    shows: pastShows.map((s) => ({ id: String(s._id), date: s.date }))
  });
}
