import { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Mail, HelpCircle, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Suporte | Zé Ramalho CMS',
  description: 'Central de suporte e ajuda para o painel administrativo'
};

export default function SuportePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/40">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/admin"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-purple-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-slate-900">
            Central de Suporte
          </h1>
          <p className="text-lg text-slate-600">
            Encontre ajuda e recursos para gerenciar o conteúdo do site Zé Ramalho
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-lg">
                <Mail className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Contato</h2>
            </div>
            <p className="mb-3 text-slate-600">
              Para dúvidas, sugestões ou reportar problemas, entre em contato:
            </p>
            <a
              href="mailto:suporte@ze-ramalho.com.br"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:brightness-110"
            >
              <Mail className="h-4 w-4" />
              suporte@ze-ramalho.com.br
            </a>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg">
                <BookOpen className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Documentação</h2>
            </div>
            
            <div className="space-y-4 text-slate-600">
              <div>
                <h3 className="mb-2 font-semibold text-slate-900">Gerenciamento de Conteúdo</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-indigo-500">•</span>
                    <span><strong>Livros:</strong> Adicione e gerencie a bibliografia de Zé Ramalho</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-indigo-500">•</span>
                    <span><strong>CDs e DVDs:</strong> Catálogo completo de discografia e videografia</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-indigo-500">•</span>
                    <span><strong>Clipes:</strong> Vídeos musicais e apresentações</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-indigo-500">•</span>
                    <span><strong>Fotos:</strong> Galeria de imagens e registros históricos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-indigo-500">•</span>
                    <span><strong>Letras:</strong> Letras de músicas com informações detalhadas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-indigo-500">•</span>
                    <span><strong>Shows:</strong> Agenda de apresentações e eventos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-indigo-500">•</span>
                    <span><strong>Textos:</strong> Artigos, entrevistas e conteúdo editorial</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-indigo-500">•</span>
                    <span><strong>Mensagens:</strong> Comunicação com fãs e visitantes</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-slate-900">Biblioteca de Mídia</h3>
                <p>
                  Faça upload de imagens, vídeos e outros arquivos. A biblioteca permite organizar
                  e reutilizar mídia em diferentes seções do site.
                </p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-slate-900">Dicas Importantes</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-indigo-500">•</span>
                    <span>Sempre preencha os campos obrigatórios antes de salvar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-indigo-500">•</span>
                    <span>Use imagens otimizadas para melhor performance do site</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-indigo-500">•</span>
                    <span>Revise o conteúdo antes de publicar</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg">
                <HelpCircle className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Instruções Básicas</h2>
            </div>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-purple-500">•</span>
                <span>Use o menu lateral para navegar entre as diferentes seções de conteúdo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-purple-500">•</span>
                <span>Clique em &quot;Adicionar novo&quot; para criar novos itens em cada seção</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-purple-500">•</span>
                <span>Use os botões de edição e exclusão para gerenciar conteúdo existente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-purple-500">•</span>
                <span>A biblioteca de mídia permite fazer upload e gerenciar imagens e arquivos</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
