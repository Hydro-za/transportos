"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="print:hidden rounded-xl border px-4 py-2 text-sm font-medium" style={{ borderColor: "#ccc" }}>
      Print / Save as PDF
    </button>
  );
}
