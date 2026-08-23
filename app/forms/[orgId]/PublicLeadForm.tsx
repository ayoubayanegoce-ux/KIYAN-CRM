"use client";

import { useState, type FormEvent } from "react";
import { Send, CheckCircle2, Loader2 } from "lucide-react";

export default function PublicLeadForm({ orgId }: { orgId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState(""); // حقل مصيدة (honeypot)، يبقى فارغاً عند مستخدم حقيقي
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    try {
      const res = await fetch(`/api/forms/${orgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, notes, website }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الإرسال");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "فشل الإرسال");
    }
  }

  if (status === "sent") {
    return (
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
        <CheckCircle2 size={40} className="mx-auto text-emerald-400" />
        <h2 className="text-lg font-semibold">شكراً لتواصلك معنا!</h2>
        <p className="text-sm text-slate-400">سيتواصل معك فريقنا في أقرب وقت ممكن.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-4"
    >
      <h2 className="text-lg font-semibold text-center mb-2">تواصل معنا</h2>

      <input
        type="text"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div>
        <label className="text-xs text-slate-400">الاسم *</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:outline-blue-500"
        />
      </div>
      <div>
        <label className="text-xs text-slate-400">البريد الإلكتروني *</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:outline-blue-500"
        />
      </div>
      <div>
        <label className="text-xs text-slate-400">اسم الشركة</label>
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:outline-blue-500"
        />
      </div>
      <div>
        <label className="text-xs text-slate-400">احتياجاتك</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm resize-none focus:outline-blue-500"
        />
      </div>

      {error && <p className="text-red-400 text-xs text-center">{error}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
      >
        {status === "sending" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        إرسال
      </button>
    </form>
  );
}
