import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import './WorksheetEditor.css';

const toolbar = [
  [{ header: [false, 1, 2, 3, 4, 5, 6] }],
  ['bold', 'italic', 'underline'],
  [{ align: '' }, { align: 'center' }, { align: 'right' }, { align: 'justify' }],
  [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
  [{ script: 'sub' }, { script: 'super' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ color: [] }],
];

const labels = {
  bold: 'Negrita', italic: 'Cursiva', underline: 'Subrayado',
  'align:': 'Alinear a la izquierda', 'align:center': 'Centrar',
  'align:right': 'Alinear a la derecha', 'align:justify': 'Justificar',
  'list:ordered': 'Lista numerada', 'list:bullet': 'Lista con viñetas',
  'list:check': 'Lista de verificación', 'script:sub': 'Subíndice',
  'script:super': 'Superíndice', 'indent:-1': 'Disminuir sangría',
  'indent:+1': 'Aumentar sangría',
};

export default function WorksheetEditor({ initialValue, onChange }) {
  const hostRef = useRef(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    const host = hostRef.current;
    const container = document.createElement('div');
    host.append(container);
    const editor = new Quill(container, {
      theme: 'snow',
      modules: { toolbar, history: { userOnly: true } },
      formats: ['header', 'bold', 'italic', 'underline', 'align', 'list', 'script', 'indent', 'color'],
      placeholder: 'Escribe la hoja de trabajo…',
    });
    editor.root.setAttribute('role', 'textbox');
    editor.root.setAttribute('aria-label', 'Hoja de trabajo');
    editor.root.setAttribute('aria-multiline', 'true');
    editor.root.setAttribute('spellcheck', 'true');
    // Clipboard conversion handles existing HTML without injecting it into the page.
    const content = String(initialValue ?? '');
    editor.setContents(editor.clipboard.convert(
      /<\/?[a-z][\s\S]*>/i.test(content) ? { html: content } : { text: content },
    ));
    editor.history.clear();
    host.querySelectorAll('.ql-toolbar button').forEach((button) => {
      const format = [...button.classList].find((name) => name.startsWith('ql-'))?.slice(3);
      const label = labels[`${format}:${button.value}`] ?? labels[format] ?? 'Color de texto';
      button.type = 'button';
      button.setAttribute('aria-label', label);
      button.title = label;
    });
    host.querySelectorAll('.ql-picker-label').forEach((picker) => {
      picker.setAttribute('aria-label', picker.closest('.ql-header') ? 'Formato de párrafo' : 'Color de texto');
    });
    const handleChange = () => onChangeRef.current(editor.getLength() <= 1 ? '' : editor.getSemanticHTML());
    editor.on('text-change', handleChange);
    return () => {
      editor.off('text-change', handleChange);
      host.replaceChildren();
    };
  }, [initialValue]);

  return <div className="worksheet-editor" ref={hostRef} />;
}
