import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectMongo } from '@/lib/mongodb';
import CdModel from '@/lib/models/Cd';
import CdTrackModel from '@/lib/models/CdTrack';
import LyricModel from '@/lib/models/Lyric';
import UploadFileModel from '@/lib/models/UploadFile';
import { cdSchema } from '@/lib/validations/cd';
import { requireAdmin } from '@/lib/api';
import { attachFile, detachFile, deleteFileIfOrphan } from '@/lib/upload';
import { generateSlug, isObjectId } from '@/lib/utils';
import { softDeleteMultipleMedia } from '@/lib/cloudinary-helpers';

function normalizeRelatedIds(related: unknown): string[] {
  const entries = Array.isArray(related) ? related : related ? [related] : [];

  return entries
    .map((entry) => {
      if (!entry) return null;

      if (entry instanceof Types.ObjectId) {
        return entry.toString();
      }

      if (typeof entry === 'object') {
        const raw = entry as { ref?: unknown; _id?: unknown; id?: unknown };
        const candidate = raw.ref ?? raw._id ?? raw.id;
        if (candidate instanceof Types.ObjectId) {
          return candidate.toString();
        }
        if (typeof candidate === 'string') {
          return candidate;
        }
        if (candidate) {
          return candidate.toString();
        }
        return null;
      }

      return entry.toString();
    })
    .filter((value): value is string => Boolean(value));
}

function cleanForStrapi(obj: Record<string, unknown>): Record<string, unknown> {
  const {
    created_by,
    updated_by,
    deleted,
    deletedAt,
    deletedBy,
    deletionReason,
    relatedTo,
    status,
    publishedAt,
    ...clean
  } = obj;

  return clean;
}

function resolveObjectId(value: unknown): Types.ObjectId | null {
  if (!value) return null;
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(value);
  }
  if (typeof value === 'object' && value !== null) {
    const obj = value as { _id?: unknown; id?: unknown; ref?: unknown };

    if (obj.ref) {
      return resolveObjectId(obj.ref);
    }

    const candidate = obj._id ?? obj.id;
    return resolveObjectId(candidate);
  }
  return null;
}

async function loadCd(identifier: string, { log = false } = {}) {
  const logger = (...args: unknown[]) => {
    if (log) {
      console.log(...args);
    }
  };

  const isId = isObjectId(identifier);
  logger('🔍 Identifier:', identifier);
  logger('🔍 É ObjectId?', isId);
  const query = isId ? { _id: identifier } : { slug: identifier };
  logger('🔍 Query:', query);

  const cdDoc = await CdModel.findOne(query).lean().exec();

  logger('🔍 CD encontrado?', Boolean(cdDoc));
  if (log) {
    logger('📦 Campos do documento:', cdDoc ? Object.keys(cdDoc) : []);
    logger('📅 createdAt:', (cdDoc as { createdAt?: unknown })?.createdAt);
    logger('📅 updatedAt:', (cdDoc as { updatedAt?: unknown })?.updatedAt);
    logger('🔢 __v:', (cdDoc as { __v?: unknown })?.__v);
  }

  if (!cdDoc) {
    logger('❌ CD não encontrado');
    return null;
  }

  logger('✅ CD encontrado:', cdDoc.title);
  logger('🎵 Track IDs:', cdDoc.track);

  const result: Record<string, unknown> = JSON.parse(JSON.stringify(cdDoc));

  // Garante que o campo `id` seja reinserido apenas ao final.
  delete result.id;

  if (cdDoc.cover) {
    try {
      const coverId = resolveObjectId(cdDoc.cover);
      if (coverId) {
        const coverDoc = await UploadFileModel.findOne({ _id: coverId, deleted: { $ne: true } }).lean().exec();
        if (coverDoc) {
          const coverCopy = JSON.parse(JSON.stringify(coverDoc)) as Record<string, unknown>;
          coverCopy.id = coverDoc._id.toString();

          coverCopy.related = normalizeRelatedIds(coverDoc.related);

          result.cover = cleanForStrapi(coverCopy);
        }
      }
    } catch (error) {
      logger('⚠️ Erro cover:', error);
    }
  }

  result.track = [];

  if (Array.isArray(cdDoc.track) && cdDoc.track.length > 0) {
    try {
      const trackIds = cdDoc.track
        .map((entry) => {
          if (entry && typeof entry === 'object' && 'ref' in (entry as Record<string, unknown>)) {
            return resolveObjectId((entry as { ref?: unknown }).ref ?? null);
          }
          return resolveObjectId(entry);
        })
        .filter((value): value is Types.ObjectId => Boolean(value));

      logger('🔍 Total de track IDs no CD:', trackIds.length);
      logger('🔍 IDs das tracks:', trackIds.map((id) => id.toString()));

      const tracks = await CdTrackModel.find({ _id: { $in: trackIds } }).lean().exec();
      logger('📊 Tracks encontradas no DB:', tracks.length);
      logger('📊 Tracks esperadas:', trackIds.length);

      if (tracks.length !== trackIds.length) {
        const foundIds = new Set(tracks.map((track) => track._id.toString()));
        const missingIds = trackIds
          .map((id) => id.toString())
          .filter((id) => !foundIds.has(id));
        logger('⚠️ Tracks não encontradas:', missingIds);
      }

      const tracksById = new Map<string, Record<string, unknown>>();

      for (const track of tracks) {
        logger('📝 Processando track:', track._id.toString(), '- Nome:', track.name);
        const trackCopy = JSON.parse(JSON.stringify(track)) as Record<string, unknown>;
        const trackIdString = track._id.toString();
        trackCopy.id = trackIdString;

        if (track.lyric) {
          try {
            const lyricId = resolveObjectId(track.lyric);
            if (lyricId) {
              const lyricDoc = await LyricModel.findById(lyricId)
                .select('_id title slug composer content body text')
                .lean();
              if (lyricDoc) {
                trackCopy.lyric = {
                  _id: lyricDoc._id,
                  title: (lyricDoc as Record<string, unknown>).title,
                  slug: (lyricDoc as Record<string, unknown>).slug,
                  composer: (lyricDoc as Record<string, unknown>).composer,
                  content:
                    (lyricDoc as Record<string, unknown>).content ||
                    (lyricDoc as Record<string, unknown>).body ||
                    (lyricDoc as Record<string, unknown>).text ||
                    '',
                  id: lyricDoc._id.toString()
                };
              }
            }
          } catch (error) {
            logger('⚠️ Erro lyric:', error);
          }
        }

        if (track.track) {
          try {
            const audioId = resolveObjectId(track.track);
            if (audioId) {
              const audioDoc = await UploadFileModel.findOne({ _id: audioId, deleted: { $ne: true } }).lean().exec();
              if (audioDoc) {
                const audioCopy = JSON.parse(JSON.stringify(audioDoc)) as Record<string, unknown>;
                audioCopy.id = audioDoc._id.toString();

                audioCopy.related = normalizeRelatedIds(audioDoc.related);

                trackCopy.track = [cleanForStrapi(audioCopy)];
              }
            }
          } catch (error) {
            logger('⚠️ Erro audio:', error);
          }
        }

        if (!Array.isArray(trackCopy.track)) {
          trackCopy.track = [];
        }

        tracksById.set(trackIdString, cleanForStrapi(trackCopy));
        logger('✅ Track adicionada ao Map:', trackIdString);
      }

      logger('🗺️ Tracks no Map:', Array.from(tracksById.keys()));
      logger('🗺️ Total no Map:', tracksById.size);

      const orderedTracks = trackIds
        .map((id) => {
          const trackId = id.toString();
          const track = tracksById.get(trackId);

          if (!track) {
            logger('⚠️ Track não encontrada no Map:', trackId);
            return null;
          }

          if (!(track as { _id?: unknown })._id) {
            logger('⚠️ Track sem _id:', trackId);
            return null;
          }

          return track;
        })
        .filter((value): value is Record<string, unknown> => value !== null && Boolean((value as { _id?: unknown })._id));

      result.track = orderedTracks;
      logger('✅ Total de tracks válidas:', orderedTracks.length);
      logger('✅ IDs das tracks válidas:', orderedTracks.map((track) => track._id));
      logger('✅ Tracks populados:', orderedTracks.length);
      if (orderedTracks.length > 0) {
        logger('✅ Primeira track:', JSON.stringify(orderedTracks[0], null, 2));
      }
    } catch (error) {
      logger('❌ Erro tracks:', error);
    }
  }

  // Adiciona o campo `id` somente após popular todas as dependências,
  // espelhando a ordem emitida pelo Strapi.
  result.id = cdDoc._id.toString();

  return cleanForStrapi(result);
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  console.log('\n🔍 ===== GET CD BY ID =====');
  console.log('📌 Parâmetro recebido:', params.id);
  console.log('📌 É ObjectId?', isObjectId(params.id));

  try {
    await connectMongo();

    const cd = await loadCd(params.id, { log: true });

    if (!cd) {
      console.log('❌ CD não encontrado');
      console.log('===== FIM GET CD =====\n');
      return NextResponse.json(null, { status: 404 });
    }

    const cdRecord = cd as Record<string, unknown>;
    const cover = cdRecord.cover as { related?: unknown } | undefined;

    console.log('✅ CD encontrado:', cdRecord.title);
    console.log('✅ Campos retornados:', Object.keys(cdRecord));
    console.log('✅ Cover tem related?', cover?.related ? 'SIM' : 'NÃO');
    console.log('===== FIM GET CD =====\n');
    return NextResponse.json(cd);
  } catch (error) {
    console.error('❌ Erro no GET CD:', error);
    return NextResponse.json({ error: 'Erro ao buscar CD' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAdmin();
  if ('response' in authResult) return authResult.response;

  if (!isObjectId(params.id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = cdSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 });
    }

    await connectMongo();
    const cd = await CdModel.findById(params.id);
    if (!cd) {
      return NextResponse.json({ error: 'CD não encontrado' }, { status: 404 });
    }

    const previousCover = cd.cover?.toString();
    const { tracks, slug: incomingSlug, ...restData } = parsed.data;
    const updateData = { ...restData } as typeof restData & { status?: 'draft' | 'published' };
    const hasPublishedAtField =
      Object.prototype.hasOwnProperty.call(body, 'published_at') ||
      Object.prototype.hasOwnProperty.call(body, 'publishedAt');
    if (hasPublishedAtField) {
      const publishedAtValue = updateData.publishedAt ?? updateData.published_at ?? null;
      if (publishedAtValue) {
        updateData.status = 'published';
        updateData.publishedAt = publishedAtValue;
        updateData.published_at = publishedAtValue;
      } else {
        updateData.status = 'draft';
        updateData.publishedAt = null;
        updateData.published_at = null;
      }
    }

    const titleForSlug =
      typeof updateData.title === 'string' && updateData.title.trim().length > 0
        ? updateData.title
        : typeof cd.title === 'string'
          ? cd.title
          : '';
    const slugInput = typeof incomingSlug === 'string' ? incomingSlug.trim() : '';
    const slugSource = slugInput || titleForSlug;

    if (slugSource) {
      const normalizedSlug = generateSlug(slugSource);
      let finalSlug = normalizedSlug;
      let counter = 1;
      while (await CdModel.exists({ slug: finalSlug, _id: { $ne: cd._id } })) {
        finalSlug = `${normalizedSlug}-${counter++}`;
      }
      cd.slug = finalSlug;
    }

    Object.assign(cd, updateData, { updated_by: authResult.session.user!.id });

    if (tracks) {
      const keepTrackIds: string[] = [];

      for (const track of tracks) {
        if (track._id && isObjectId(track._id)) {
          const existingTrack = await CdTrackModel.findById(track._id);
          if (existingTrack) {
            const previousAudio = existingTrack.track?.toString();
            existingTrack.name = track.name;
            existingTrack.composers = track.composers;
            existingTrack.time = track.time;
            existingTrack.lyric = track.lyric;
            existingTrack.track = track.track || undefined;
            await existingTrack.save();
            if (track.track && track.track !== previousAudio) {
              await attachFile({ fileId: track.track, refId: existingTrack._id, kind: 'CdTrack', field: 'track' });
              await detachFile(previousAudio, existingTrack._id);
              await deleteFileIfOrphan(previousAudio, {
                reason: 'track_deleted',
                relatedTo: `Track:${existingTrack._id.toString()}`,
                userId: authResult.session.user!.id
              });
            } else if (!track.track && previousAudio) {
              await detachFile(previousAudio, existingTrack._id);
              await deleteFileIfOrphan(previousAudio, {
                reason: 'track_deleted',
                relatedTo: `Track:${existingTrack._id.toString()}`,
                userId: authResult.session.user!.id
              });
            }
            keepTrackIds.push(existingTrack._id.toString());
          }
        } else {
          const created = await CdTrackModel.create({
            name: track.name,
            composers: track.composers,
            time: track.time,
            track: track.track || undefined,
            lyric: track.lyric
          });
          if (track.track) {
            await attachFile({ fileId: track.track, refId: created._id, kind: 'CdTrack', field: 'track' });
          }
          keepTrackIds.push(created._id.toString());
        }
      }

      const oldTrackIds = (cd.track ?? [])
        .map((value) => (typeof value === 'string' ? value : value?.toString()))
        .filter((value): value is string => Boolean(value));

      for (const oldId of oldTrackIds) {
        if (!keepTrackIds.includes(oldId)) {
          const toRemove = await CdTrackModel.findById(oldId);
          if (toRemove) {
            const audioId = toRemove.track?.toString();
            await toRemove.deleteOne();
            if (audioId) {
              await detachFile(audioId, toRemove._id);
              await deleteFileIfOrphan(audioId, {
                reason: 'track_deleted',
                relatedTo: `Track:${toRemove._id.toString()}`,
                userId: authResult.session.user!.id
              });
            }
          }
        }
      }

      cd.track = keepTrackIds;
    }

    await cd.save();

    if (updateData.cover && updateData.cover !== previousCover) {
      await attachFile({ fileId: updateData.cover, refId: cd._id, kind: 'Cd', field: 'cover' });
      await detachFile(previousCover, cd._id);
      await deleteFileIfOrphan(previousCover, {
        reason: 'cover_replaced',
        relatedTo: `CD:${cd._id.toString()}`,
        userId: authResult.session.user!.id
      });
    } else if (!updateData.cover && previousCover) {
      await detachFile(previousCover, cd._id);
      await deleteFileIfOrphan(previousCover, {
        reason: 'cover_replaced',
        relatedTo: `CD:${cd._id.toString()}`,
        userId: authResult.session.user!.id
      });
    }

    const populatedCd = await loadCd(cd._id.toString());
    return NextResponse.json(populatedCd);
  } catch (error) {
    console.error('CD update error', error);
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAdmin();
  if ('response' in authResult) return authResult.response;

  if (!isObjectId(params.id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  await connectMongo();
  const cd = await CdModel.findById(params.id);
  if (!cd) {
    return NextResponse.json({ error: 'CD não encontrado' }, { status: 404 });
  }

  const coverId = cd.cover?.toString();
  const trackIds = (cd.track ?? [])
    .map((value) => (typeof value === 'string' ? value : value?.toString()))
    .filter((value): value is string => Boolean(value));

  const tracks = trackIds.length ? await CdTrackModel.find({ _id: { $in: trackIds } }) : [];

  const mediaIds: string[] = [];

  if (coverId) {
    mediaIds.push(coverId);
  }

  for (const track of tracks) {
    const audioId = track.track?.toString();
    if (audioId) {
      mediaIds.push(audioId);
      await detachFile(audioId, track._id);
    }
    await track.deleteOne();
  }

  if (coverId) {
    await detachFile(coverId, cd._id);
  }

  await cd.deleteOne();

  if (mediaIds.length > 0) {
    await softDeleteMultipleMedia(mediaIds, 'cd_deleted', authResult.session.user!.id, `CD:${params.id}`);
  }

  return NextResponse.json({
    message: `CD removido. ${mediaIds.length} arquivos marcados para limpeza.`
  });
}
