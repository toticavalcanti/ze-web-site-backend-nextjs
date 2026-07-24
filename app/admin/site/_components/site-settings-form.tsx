'use client';

import { useState } from 'react';
import NextImage from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUpload, type UploadedImage } from '@/components/admin/image-upload';
import { MediaPicker } from '@/components/admin/media-picker';
import { cn } from '@/lib/utils';
import {
  ArrowDown,
  ArrowUp,
  Heading2,
  Image as ImageIcon,
  Loader2,
  Pilcrow,
  Save,
  Trash2,
  UploadCloud,
  X
} from 'lucide-react';
import type {
  BackgroundSetting,
  BiographyBlock,
  BiographyContent,
  SiteSettingsMap
} from '@/types/site-settings';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function saveSetting(key: string, value: unknown) {
  const response = await fetch(`/api/settings/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `Falha ao salvar (${response.status})`);
  }
}

/* ------------------------------------------------------------------ */
/* Fundo (home / messages)                                             */
/* ------------------------------------------------------------------ */

interface BackgroundCardProps {
  settingKey: 'home_background' | 'messages_post_background';
  title: string;
  description: string;
  initial?: BackgroundSetting | null;
}

function BackgroundCard({ settingKey, title, description, initial }: BackgroundCardProps) {
  const [current, setCurrent] = useState<BackgroundSetting | null>(initial ?? null);
  const [pending, setPending] = useState<UploadedImage[]>([]);
  const [isRemoved, setIsRemoved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const preview = isRemoved ? null : (pending[0]?.url ?? current?.url);
  const hasChange = isRemoved ? current?.url !== '' && current?.url != null : pending.length > 0;

  const handleSave = async () => {
    if (!hasChange) return;
    setIsSaving(true);
    try {
      if (isRemoved) {
        await saveSetting(settingKey, null);
        setCurrent(null);
        setPending([]);
        setIsRemoved(false);
        toast.success(`${title} removida!`);
      } else if (pending[0]) {
        const value: BackgroundSetting = { url: pending[0].url, mediaId: pending[0]._id };
        await saveSetting(settingKey, value);
        setCurrent(value);
        setPending([]);
        toast.success(`${title} atualizada!`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = () => {
    setPending([]);
    setIsRemoved(true);
  };

  const handleSelectFromPicker = (item: { _id: string; url: string; name?: string }) => {
    setIsRemoved(false);
    setPending([{ _id: item._id, url: item.url, name: item.name }]);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];

    if (!validTypes.includes(file.type)) {
      toast.error('Apenas imagens PNG, JPEG e WebP são permitidas.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'photos-background');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Falha no upload');
      }

      const data = (await response.json()) as UploadedImage;
      setIsRemoved(false);
      setPending([data]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao fazer upload da imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {preview && (
          <div className="group relative overflow-hidden rounded-lg border">
            <NextImage
              src={preview}
              alt={title}
              width={1200}
              height={500}
              className="h-56 w-full object-cover"
              unoptimized
            />
            <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
              {hasChange ? 'Nova imagem (não salva)' : 'Imagem atual'}
            </span>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute right-3 top-3 h-8 w-8 rounded-full shadow-md transition-transform hover:scale-105"
              onClick={handleRemove}
              title="Remover imagem"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        <label
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/40 p-6 text-center transition hover:border-primary',
            isDragging && 'border-indigo-500 bg-indigo-50/50',
            isUploading && 'opacity-60'
          )}
        >
          {isUploading ? (
            <Loader2 className="mb-2 h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <UploadCloud className="mb-2 h-6 w-6 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">Arraste e solte ou clique para enviar</p>
          <Input
            type="file"
            className="hidden"
            onChange={(event) => handleFileUpload(event.target.files)}
            disabled={isUploading}
            accept="image/png,image/jpeg,image/webp"
          />
        </label>

        <Button type="button" variant="outline" className="w-full" onClick={() => setIsPickerOpen(true)}>
          <ImageIcon className="mr-2 h-4 w-4" /> Escolher da biblioteca
        </Button>

        <MediaPicker
          open={isPickerOpen}
          onOpenChange={setIsPickerOpen}
          onSelect={handleSelectFromPicker}
        />

        <div className="flex items-center justify-end gap-3">
          {hasChange && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPending([]);
                setIsRemoved(false);
              }}
              disabled={isSaving}
            >
              Descartar
            </Button>
          )}
          <Button type="button" onClick={handleSave} disabled={!hasChange || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Biografia — editor de blocos                                        */
/* ------------------------------------------------------------------ */

const EMPTY_BIOGRAPHY: BiographyContent = { writtenBy: '', blocks: [] };

function makeBlock(type: BiographyBlock['type']): BiographyBlock {
  if (type === 'heading') return { type: 'heading', text: '' };
  if (type === 'paragraph') return { type: 'paragraph', text: '' };
  return { type: 'image', title: '', url: '', alt: '', caption: '', width: 800, height: 800 };
}

interface BlockEditorProps {
  block: BiographyBlock;
  index: number;
  total: number;
  onChange: (index: number, block: BiographyBlock) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
}

function BlockEditor({ block, index, total, onChange, onMove, onRemove }: BlockEditorProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const labels: Record<BiographyBlock['type'], string> = {
    heading: 'Título (ano/período)',
    paragraph: 'Parágrafo',
    image: 'Imagem'
  };

  return (
    <div className="rounded-lg border bg-white/60 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold',
            block.type === 'heading' && 'bg-indigo-100 text-indigo-700',
            block.type === 'paragraph' && 'bg-slate-100 text-slate-700',
            block.type === 'image' && 'bg-amber-100 text-amber-700'
          )}
        >
          {index + 1}. {labels[block.type]}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            title="Mover para cima"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            title="Mover para baixo"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500 hover:text-red-600"
            onClick={() => onRemove(index)}
            title="Remover bloco"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {block.type === 'heading' && (
        <Input
          value={block.text}
          placeholder="Ex.: 1971 - 1980"
          onChange={(e) => onChange(index, { ...block, text: e.target.value })}
        />
      )}

      {block.type === 'paragraph' && (
        <Textarea
          value={block.text}
          rows={5}
          placeholder="Texto do parágrafo…"
          onChange={(e) => onChange(index, { ...block, text: e.target.value })}
        />
      )}

      {block.type === 'image' && (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Título (acima da foto)</label>
              <Input
                value={block.title}
                placeholder="Ex.: Zé Ramalho aos 3 anos"
                onChange={(e) => onChange(index, { ...block, title: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Legenda (abaixo da foto)</label>
              <Input
                value={block.caption}
                placeholder="Ex.: Brejo do Cruz - PB - 1952"
                onChange={(e) => onChange(index, { ...block, caption: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Texto alternativo (acessibilidade)</label>
            <Input
              value={block.alt}
              placeholder="Descrição da imagem"
              onChange={(e) => onChange(index, { ...block, alt: e.target.value })}
            />
          </div>
          {block.url ? (
            <div className="flex items-start gap-4">
              <NextImage
                src={block.url}
                alt={block.alt || block.title || 'Imagem da biografia'}
                width={200}
                height={200}
                className="h-32 w-32 rounded-md border object-cover"
                unoptimized
              />
              <div className="flex flex-1 flex-col gap-2">
                <p className="break-all text-xs text-slate-500">{block.url}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onChange(index, { ...block, url: '' })}
                  >
                    Enviar outra
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPickerOpen(true)}
                  >
                    Escolher da biblioteca
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <ImageUpload
                value={[]}
                onChange={(files) => {
                  const file = files[0];
                  if (file) {
                    onChange(index, { ...block, url: file.url, alt: block.alt || file.name || '' });
                  }
                }}
                folder="fixed-images"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setIsPickerOpen(true)}>
                Escolher da biblioteca
              </Button>
            </div>
          )}

          <MediaPicker
            open={isPickerOpen}
            onOpenChange={setIsPickerOpen}
            onSelect={(item) =>
              onChange(index, { ...block, url: item.url, alt: block.alt || item.name || '' })
            }
          />
        </div>
      )}
    </div>
  );
}

interface BiographyEditorProps {
  settingKey: 'biography_pt' | 'biography_en';
  initial?: BiographyContent | null;
}

function BiographyEditor({ settingKey, initial }: BiographyEditorProps) {
  const [content, setContent] = useState<BiographyContent>(initial ?? EMPTY_BIOGRAPHY);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const update = (updater: (previous: BiographyContent) => BiographyContent) => {
    setContent(updater);
    setIsDirty(true);
  };

  const handleBlockChange = (index: number, block: BiographyBlock) => {
    update((previous) => ({
      ...previous,
      blocks: previous.blocks.map((item, i) => (i === index ? block : item))
    }));
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    update((previous) => {
      const blocks = [...previous.blocks];
      const target = index + direction;
      if (target < 0 || target >= blocks.length) return previous;
      [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
      return { ...previous, blocks };
    });
  };

  const handleRemove = (index: number) => {
    update((previous) => ({
      ...previous,
      blocks: previous.blocks.filter((_, i) => i !== index)
    }));
  };

  const handleAdd = (type: BiographyBlock['type']) => {
    update((previous) => ({ ...previous, blocks: [...previous.blocks, makeBlock(type)] }));
  };

  const handleSave = async () => {
    const emptyImage = content.blocks.find((block) => block.type === 'image' && !block.url);
    if (emptyImage) {
      toast.error('Há um bloco de imagem sem foto. Envie a imagem ou remova o bloco.');
      return;
    }

    setIsSaving(true);
    try {
      await saveSetting(settingKey, content);
      setIsDirty(false);
      toast.success('Biografia salva!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Escrito por</label>
        <Input
          value={content.writtenBy}
          placeholder="Ex.: Roberta Ramalho"
          onChange={(e) => update((previous) => ({ ...previous, writtenBy: e.target.value }))}
          className="max-w-md"
        />
      </div>

      <div className="space-y-3">
        {content.blocks.map((block, index) => (
          <BlockEditor
            key={index}
            block={block}
            index={index}
            total={content.blocks.length}
            onChange={handleBlockChange}
            onMove={handleMove}
            onRemove={handleRemove}
          />
        ))}
        {content.blocks.length === 0 && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
            Nenhum bloco ainda. Rode <code>npm run seed:site-settings</code> no backend para importar a
            biografia atual do site, ou adicione blocos abaixo.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => handleAdd('heading')}>
          <Heading2 className="mr-2 h-4 w-4" /> Título
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => handleAdd('paragraph')}>
          <Pilcrow className="mr-2 h-4 w-4" /> Parágrafo
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => handleAdd('image')}>
          <ImageIcon className="mr-2 h-4 w-4" /> Imagem
        </Button>
        <div className="ml-auto">
          <Button type="button" onClick={handleSave} disabled={!isDirty || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar biografia
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form principal                                                      */
/* ------------------------------------------------------------------ */

interface SiteSettingsFormProps {
  initialSettings: SiteSettingsMap;
}

export function SiteSettingsForm({ initialSettings }: SiteSettingsFormProps) {
  const [biographyTab, setBiographyTab] = useState<'pt' | 'en'>('pt');

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-8 xl:grid-cols-2">
        <BackgroundCard
          settingKey="home_background"
          title="Fundo da Home"
          description="Foto de fundo da página inicial (atrás do letreiro ZÉ RAMALHO)."
          initial={initialSettings.home_background}
        />
        <BackgroundCard
          settingKey="messages_post_background"
          title="Fundo de Mensagens (/messages/post)"
          description="Foto revelada pela animação de bolhas na página de envio de mensagem."
          initial={initialSettings.messages_post_background}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Biografia</CardTitle>
          <CardDescription>
            Linha do tempo exibida em /biography-pt-br e /biography-en. Edite os blocos na ordem em que
            aparecem na página.
          </CardDescription>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant={biographyTab === 'pt' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBiographyTab('pt')}
            >
              🇧🇷 Português
            </Button>
            <Button
              type="button"
              variant={biographyTab === 'en' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBiographyTab('en')}
            >
              🇺🇸 English
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mantemos os dois montados para não perder edições ao alternar de aba. */}
          <div className={biographyTab === 'pt' ? '' : 'hidden'}>
            <BiographyEditor settingKey="biography_pt" initial={initialSettings.biography_pt} />
          </div>
          <div className={biographyTab === 'en' ? '' : 'hidden'}>
            <BiographyEditor settingKey="biography_en" initial={initialSettings.biography_en} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
