import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor: instancia }) => onChange(instancia.getHTML()),
  });

  // Sincroniza quando o valor externo muda (ex: carregou notícia para edição).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  const botoes = [
    {
      rotulo: 'B',
      titulo: 'Negrito',
      ativo: editor.isActive('bold'),
      acao: () => editor.chain().focus().toggleBold().run(),
    },
    {
      rotulo: 'I',
      titulo: 'Itálico',
      ativo: editor.isActive('italic'),
      acao: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      rotulo: 'H2',
      titulo: 'Título',
      ativo: editor.isActive('heading', { level: 2 }),
      acao: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      rotulo: 'H3',
      titulo: 'Subtítulo',
      ativo: editor.isActive('heading', { level: 3 }),
      acao: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      rotulo: '••',
      titulo: 'Lista',
      ativo: editor.isActive('bulletList'),
      acao: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      rotulo: '"',
      titulo: 'Citação',
      ativo: editor.isActive('blockquote'),
      acao: () => editor.chain().focus().toggleBlockquote().run(),
    },
  ];

  return (
    <div className="editor">
      <div className="editor-toolbar" role="toolbar">
        {botoes.map((botao) => (
          <button
            key={botao.titulo}
            type="button"
            title={botao.titulo}
            className={botao.ativo ? 'ativo' : ''}
            onClick={botao.acao}
          >
            {botao.rotulo}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} className="editor-conteudo" />
    </div>
  );
}
