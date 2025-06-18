/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import axios from 'axios';

/*──────── Types ───────*/
type BlockType = string;
interface Block {
  type: BlockType;
  number: number;
  content: string;
}
interface AiState {
  loading: boolean;
  suggestions: string[];
}

/*──────── Gemini helper ─*/
async function geminiRequest(apiKey: string, prompt: string) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' +
    apiKey;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, candidateCount: 1 },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || res.statusText);
  }
  return res.json();
}

/*──────── Component ───*/
export default function App() {
  /* State */
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [history, setHistory] = useState<Block[][]>([]);
  const [blockTypes, setBlockTypes] = useState<BlockType[]>([
    'HB',
    'B',
    'DB',
    'C',
  ]);

  const [isProjectOpen, setProjectOpen] = useState(true);
  const [isToolsOpen, setToolsOpen] = useState(false);
  const [theme, setTheme] = useState(
    localStorage.getItem('wtoon-theme') || 'light'
  );
  const [geminiKey, setGeminiKey] = useState(
    localStorage.getItem('geminiKey') || ''
  );

  const [checking, setChecking] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [aiMap, setAiMap] = useState<Record<number, AiState>>({});

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastInputRef = useRef<HTMLTextAreaElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  /* Helpers */
  const nextNum = (t: BlockType) =>
    Math.max(0, ...blocks.filter((b) => b.type === t).map((b) => b.number)) + 1;
  const pushHist = (p: Block[]) =>
    setHistory((h) => [...h, JSON.parse(JSON.stringify(p))]);

  /* CRUD */
  const addBlock = (t: BlockType) => {
    pushHist(blocks);
    setBlocks((p) => [...p, { type: t, number: nextNum(t), content: '' }]);
  };
  const updateContent = (i: number, v: string) =>
    setBlocks((p) => p.map((b, idx) => (idx === i ? { ...b, content: v } : b)));
  const undo = () =>
    setHistory((h) => {
      if (!h.length) return h;
      setBlocks(h[h.length - 1]);
      return h.slice(0, -1);
    });

  /* Persist */
  useEffect(() => {
    localStorage.setItem(
      'wtoon-project',
      JSON.stringify({ blocks, blockTypes })
    );
  }, [blocks, blockTypes]);
  useEffect(() => {
    const s = localStorage.getItem('wtoon-project');
    if (s) {
      const d = JSON.parse(s);
      setBlocks(d.blocks);
      setBlockTypes(d.blockTypes);
    }
  }, []);

  /* Import/Export */
  const exportProj = () =>
    saveAs(
      new Blob([JSON.stringify({ blocks, blockTypes }, null, 2)], {
        type: 'application/json',
      }),
      'project.wtoon'
    );
  const importProj = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result as string);
        setBlocks(d.blocks);
        setBlockTypes(d.blockTypes);
        setHistory([]);
        setAiMap({});
      } catch {
        alert('Fichier invalide');
      }
    };
    r.readAsText(f);
  };

  /* Reset & type */
  const resetAll = () => {
    if (confirm('Tout effacer ?')) {
      setBlocks([]);
      setHistory([]);
      setAiMap({});
      setReport(null);
      localStorage.removeItem('wtoon-project');
    }
  };
  const addType = () => {
    const n = prompt('Nouveau type')?.trim().toUpperCase();
    if (n && !blockTypes.includes(n)) setBlockTypes((t) => [...t, n]);
  };

  /* DOCX */
  const exportDocx = async () => {
    const doc = new Document({
      sections: [
        {
          children: blocks.map(
            (b) =>
              new Paragraph({
                children: [
                  new TextRun({ text: `${b.type}${b.number} `, bold: true }),
                  new TextRun(b.content),
                ],
              })
          ),
        },
      ],
    });
    saveAs(await Packer.toBlob(doc), 'script_webtoon.docx');
  };

  /* LanguageTool */
  const spellCheck = async () => {
    if (!blocks.length) return;
    setChecking(true);
    setReport(null);
    try {
      const txt = blocks
        .map((b) => `${b.type}${b.number} ${b.content}`)
        .join('\n');
      const p = new URLSearchParams({ text: txt, language: 'fr' });
      const { data } = await axios.post(
        'https://api.languagetool.org/v2/check',
        p,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      setReport(
        !data.matches.length
          ? '✅ Aucun problème'
          : `Problèmes : ${data.matches.length}\n\n` +
              data.matches
                .slice(0, 20)
                .map((m: any) => `→ ${m.message}`)
                .join('\n')
      );
    } catch {
      setReport('Erreur réseau');
    } finally {
      setChecking(false);
    }
  };

  /* AI */
  const askAi = async (i: number) => {
    if (!geminiKey) {
      alert('Ajoute une clé Gemini dans Outils');
      return;
    }
    setAiMap((m) => ({ ...m, [i]: { loading: true, suggestions: [] } }));
    try {
      const prompt = `
Réécris ou corrige en français.
Fournis 3 variantes concises, **sans parenthèses ni explication**, une par ligne :
« ${blocks[i].content} »`;
      const j = await geminiRequest(geminiKey, prompt);
      const raw: string = j.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const s = raw
        .split(/\r?\n+/)
        .map((t) =>
          t
            .replace(/^[\s•\-\d.]+/, '') // supprime puces/numéros
            .replace(/\s*\([^)]*\)\s*$/, '') // supprime parenthèses finales
            .trim()
        )
        .filter(Boolean)
        .slice(0, 3);
      setAiMap((m) => ({ ...m, [i]: { loading: false, suggestions: s } }));
    } catch (e: any) {
      alert('Erreur Gemini : ' + e.message);
      setAiMap((m) => ({ ...m, [i]: { loading: false, suggestions: [] } }));
    }
  };
  const acceptSug = (i: number, s: string) => {
    updateContent(i, s);
    setAiMap((m) => ({ ...m, [i]: { loading: false, suggestions: [] } }));
  };

  /* Theme */
  useEffect(() => {
    document.documentElement.className = theme === 'dark' ? 'dark' : '';
    localStorage.setItem('wtoon-theme', theme);
  }, [theme]);

  /* Scroll focus */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    lastInputRef.current?.focus();
  }, [blocks]);

  /*────────── Render ─*/
  return (
    <div className="app">
      {/* ---------- Sidebar Projet ---------- */}
      {isProjectOpen && (
        <aside className="sidebar project">
          <h3>Projet</h3>
          <p>{blocks.length} blocs</p>
          <button onClick={exportProj}>⭳ Export</button>
          <button onClick={() => importRef.current?.click()}>⭱ Import</button>
          <input
            ref={importRef}
            type="file"
            accept=".wtoon,.json"
            style={{ display: 'none' }}
            onChange={importProj}
          />
          <button onClick={resetAll}>🔄 Reset</button>
          <hr />
          <button onClick={addType}>➕ Type</button>
        </aside>
      )}

      {/* ---------- Main ---------- */}
      <main className="main">
        <header>
          <button onClick={() => setProjectOpen(!isProjectOpen)}>
            {isProjectOpen ? '📂' : '📁'}
          </button>
          <h2>Éditeur Webtoon</h2>
          <button onClick={() => setToolsOpen(!isToolsOpen)}>🛠️</button>
        </header>

        {/* Liste des blocs */}
        <div className="scroll">
          {blocks.map((b, idx) => {
            const ai = aiMap[idx];
            return (
              <div key={idx} className="block">
                <strong>{b.type + b.number}</strong>
                <textarea
                  ref={idx === blocks.length - 1 ? lastInputRef : undefined}
                  value={b.content}
                  onChange={(e) => updateContent(idx, e.target.value)}
                  rows={2}
                  spellCheck
                />
                <button
                  className="ai-btn"
                  onClick={() => askAi(idx)}
                  disabled={ai?.loading}
                >
                  {ai?.loading ? '…' : 'IA'}
                </button>

                {/* suggestions IA */}
                {ai?.suggestions.length > 0 && (
                  <div className="suggestions">
                    {ai.suggestions.map((s, k) => (
                      <div key={k} className="sugg">
                        <span>{s}</span>
                        <button onClick={() => acceptSug(idx, s)}>✔</button>
                      </div>
                    ))}
                    <button onClick={() => askAi(idx)}>Autres</button>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Barre d’outils */}
        <footer>
          {blockTypes.map((t) => (
            <button key={t} onClick={() => addBlock(t)}>
              + {t}
            </button>
          ))}
          <button onClick={undo} disabled={!history.length}>
            ↩️ Undo
          </button>
          <button onClick={exportDocx}>📄 DOCX</button>
          <button onClick={spellCheck} disabled={checking}>
            🔍 Ortho
          </button>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '🌞' : '🌙'}
          </button>
        </footer>
      </main>

      {/* ---------- Sidebar Outils ---------- */}
      {isToolsOpen && (
        <aside className="sidebar tools">
          <h3>Outils</h3>
          <label>
            🔑 Clé Gemini
            <br />
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => {
                setGeminiKey(e.target.value);
                localStorage.setItem('geminiKey', e.target.value);
              }}
              style={{ width: '100%' }}
            />
          </label>
          <hr />
          <h4>Rapport orthographe</h4>
          {checking && <p>Analyse…</p>}
          {report && <pre>{report}</pre>}
          {!report && !checking && <p>Aucun rapport.</p>}
        </aside>
      )}
    </div>
  );
}

/*──────── Style injecté ─*/
const css = `
:root{--bg:#fff;--text:#141414;--sidebar:#fafafa;--border:#ddd;--btn-bg:#f0f0f0;}
.dark{--bg:#1e1e1e;--text:#e5e5e5;--sidebar:#2b2b2b;--border:#444;--btn-bg:#3a3a3a;}
body,html,#root,.app{height:100%;margin:0}
body{background:var(--bg);color:var(--text);font-family:sans-serif;}
button{background:var(--btn-bg);border:1px solid var(--border);padding:4px 8px;margin:2px;color:var(--text);cursor:pointer;}
button:disabled{opacity:.5;cursor:default;}
textarea,input,pre{background:var(--bg);color:var(--text);border:1px solid var(--border);}
.sidebar{background:var(--sidebar);height:100%;overflow:auto;border-right:1px solid var(--border);padding:10px;}
.sidebar.tools{border-left:1px solid var(--border);border-right:none;}
.main{display:flex;flex-direction:column;flex:1;}
header,footer{background:var(--sidebar);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px;padding:6px 10px;}
footer{border-top:1px solid var(--border);border-bottom:none;flex-wrap:wrap;}
.scroll{flex:1;overflow:auto;padding:10px;}
.block{margin-bottom:12px;position:relative;}
.block .ai-btn{position:absolute;right:0;top:0;}
.suggestions{background:var(--sidebar);border:1px solid var(--border);padding:6px;margin-top:4px;}
.sugg{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;}
.sugg button{margin-left:6px;}
`;
const style = document.createElement('style');
style.innerHTML = css;
document.head.appendChild(style);
