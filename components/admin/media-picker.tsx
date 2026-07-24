'use client';

import { useEffect, useState } from 'react';
import NextImage from 'next/image';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

export interface MediaPickerItem {
  _id: string;
  url: string;
  name?: string;
}

interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: MediaPickerItem) => void;
}

export function MediaPicker({ open, onOpenChange, onSelect }: MediaPickerProps) {
  const [items, setItems] = useState<MediaPickerItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          type: 'image',
          pageSize: '60',
          sort: 'createdAt',
          order: 'desc'
        });

        if (search.trim()) {
          params.set('search', search.trim());
        }

        const response = await fetch(`/api/media?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Falha ao carregar a biblioteca (${response.status})`);
        }

        const json = (await response.json()) as { data?: MediaPickerItem[] };

        if (!cancelled) {
          setItems(Array.isArray(json.data) ? json.data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar a biblioteca');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Escolher da biblioteca</DialogTitle>
          <DialogDescription>
            Selecione uma imagem já enviada. Nenhum arquivo novo será enviado ao Cloudinary.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar pelo nome do arquivo..."
            className="pl-9"
          />
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
            </div>
          )}

          {!isLoading && error && (
            <p className="py-12 text-center text-sm text-red-600">{error}</p>
          )}

          {!isLoading && !error && items.length === 0 && (
            <p className="py-12 text-center text-sm text-slate-500">Nenhuma imagem encontrada.</p>
          )}

          {!isLoading && !error && items.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  title={item.name}
                  onClick={() => {
                    onSelect(item);
                    onOpenChange(false);
                  }}
                  className="overflow-hidden rounded-lg border text-left transition hover:border-indigo-500 hover:shadow-md"
                >
                  <NextImage
                    src={item.url}
                    alt={item.name || 'Imagem da biblioteca'}
                    width={300}
                    height={200}
                    className="h-28 w-full object-cover"
                    unoptimized
                  />
                  <span className="block truncate px-2 py-1 text-[11px] text-slate-600">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
