"use client";

import { useState, useTransition } from "react";
import { Mail, X, Copy, Check, Loader2, RotateCw, Send, CheckCircle2 } from "lucide-react";
import { generateOutreachForLead } from "@/app/actions/outreach";
import { sendOutreachEmail } from "@/app/actions/email";

export default function OutreachModal({ leadId, leadName }: { leadId: string; leadName: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSending, startSendTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  function fetchEmail() {
    setError(null);
    setSent(false);
    setSendError(null);
    startTransition(async () => {
      try {
        const result = await generateOutreachForLead(leadId);
        setSubject(result.subject);
        setBody(result.body);
        setLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل توليد البريد");
      }
    });
  }

  function handleOpen() {
    setOpen(true);
    if (!loaded) fetchEmail();
  }

  function handleCopy() {
    navigator.clipboard.writeText(`Objet : ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleSend() {
    setSendError(null);
    startSendTransition(async () => {
      try {
        await sendOutreachEmail(leadId, subject, body);
        setSent(true);
      } catch (e) {
        setSendError(e instanceof Error ? e.message : "فشل إرسال البريد");
      }
    });
  }

  return (
    <>
      <button
        onClick={handleOpen}
        title="Générer un e-mail de prospection"
        className="p-2 rounded-lg bg-slate-800 hover:bg-blue-700 text-slate-300 hover:text-white transition cursor-pointer"
      >
        <Mail size={14} />
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Mail size={16} /> Email de prospection — {leadName}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {isPending && !loaded ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-sm gap-2">
                <Loader2 size={16} className="animate-spin" /> Génération en cours...
              </div>
            ) : error ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  onClick={fetchEmail}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm cursor-pointer"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400">Objet</label>
                  <input
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      setSent(false);
                      setSendError(null);
                    }}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:outline-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Message</label>
                  <textarea
                    value={body}
                    onChange={(e) => {
                      setBody(e.target.value);
                      setSent(false);
                      setSendError(null);
                    }}
                    rows={10}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm resize-none focus:outline-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copié" : "Copier"}
                  </button>
                  <button
                    onClick={fetchEmail}
                    disabled={isPending}
                    title="Régénérer"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    <RotateCw size={14} className={isPending ? "animate-spin" : ""} /> Régénérer
                  </button>
                </div>

                <button
                  onClick={handleSend}
                  disabled={isSending || sent}
                  className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition cursor-pointer disabled:cursor-not-allowed ${
                    sent
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                  }`}
                >
                  {isSending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> جاري الإرسال...
                    </>
                  ) : sent ? (
                    <>
                      <CheckCircle2 size={14} /> تم الإرسال بنجاح
                    </>
                  ) : (
                    <>
                      <Send size={14} /> إرسال الإيميل مباشرة
                    </>
                  )}
                </button>

                {sendError && <p className="text-red-400 text-xs text-center">{sendError}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
