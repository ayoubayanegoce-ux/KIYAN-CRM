"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition cursor-pointer flex items-center gap-2"
    >
      <Printer size={15} /> طباعة / حفظ كـ PDF
    </button>
  );
}
