"use client";

import { useState, useTransition } from "react";
import { StickyNote, X, Loader2, Phone, MessageSquare, Plus } from "lucide-react";
import { getNotes, addNote, type Note, type NoteType } from "@/app/actions/notes";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

export default function NotesModal({ leadId, leadName }: { leadId: string; leadName: string }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isLoading, startLoadTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [content, setContent] = useState("");
  const [type, setType] = useState<NoteType>("note");
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    startLoadTransition(async () => {
      try {
        const result = await getNotes(leadId);
        setNotes(result);
        setLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل تحميل الملاحظات");
      }
    });
  }

  function handleOpen() {
    setOpen(true);
    if (!loaded) load();
  }

  function handleAdd() {
    if (!content.trim()) return;
    setError(null);
    startSaveTransition(async () => {
      try {
        await addNote(leadId, content, type);
        setContent("");
        load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل إضافة الملاحظة");
      }
    });
  }

  return (
    <>
      <button
        onClick={handleOpen}
        title="ملاحظات وسجل المكالمات"
        className="p-2 rounded-lg bg-slate-800 hover:bg-amber-700 text-slate-300 hover:text-white transition cursor-pointer"
      >
        <StickyNote size={14} />
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <StickyNote size={16} /> ملاحظات — {leadName}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setType("note")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition ${
                    type === "note" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  <MessageSquare size={12} /> ملاحظة
                </button>
                <button
                  onClick={() => setType("call")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition ${
                    type === "call" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  <Phone size={12} /> مكالمة
                </button>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                placeholder="اكتب ملاحظة أو ملخص مكالمة..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm resize-none focus:outline-blue-500"
              />
              <button
                onClick={handleAdd}
                disabled={isSaving || !content.trim()}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} إضافة
              </button>
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 border-t border-slate-800 pt-3">
              {isLoading && !loaded ? (
                <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
                  <Loader2 size={16} className="animate-spin" /> جاري التحميل...
                </div>
              ) : notes.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">لا توجد ملاحظات بعد.</p>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                          note.type === "call"
                            ? "bg-purple-950 text-purple-400 border border-purple-800"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {note.type === "call" ? <Phone size={10} /> : <MessageSquare size={10} />}
                        {note.type === "call" ? "مكالمة" : "ملاحظة"}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {dateFormatter.format(new Date(note.created_at))}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
