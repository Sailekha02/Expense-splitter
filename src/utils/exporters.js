import { categoryById } from "../../shared/calc.js";
import { memberName } from "./format.js";

const csvCell = (v) => {
  let s = String(v ?? "");
  // stop spreadsheet apps from running a cell as a formula
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function rows(expenses, groupsById, userId) {
  return expenses.map((e) => {
    const g = groupsById[e.groupId];
    const mine = g?.members.find((m) => m.userId === userId);
    const myShare = e.splits.find((s) => s.memberId === mine?.id)?.amount ?? 0;
    return {
      date: e.date,
      description: e.description,
      group: g?.name ?? "",
      category: categoryById(e.category).label,
      paidBy: memberName(g, e.paidBy),
      amount: e.amount.toFixed(2),
      myShare: myShare.toFixed(2),
      split: e.splitType,
      splitDetails: e.splits.map((s) => `${memberName(g, s.memberId)}: ${s.amount.toFixed(2)}`).join("; "),
      notes: e.notes || "",
    };
  });
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function exportCSV(expenses, groupsById, userId) {
  const head = ["Date", "Description", "Group", "Category", "Paid by", "Amount", "Your share", "Split type", "Split details", "Notes"];
  const body = rows(expenses, groupsById, userId).map((r) =>
    [r.date, r.description, r.group, r.category, r.paidBy, r.amount, r.myShare, r.split, r.splitDetails, r.notes].map(csvCell).join(",")
  );
  // BOM so Excel opens ₹ and accents correctly
  download(new Blob(["\ufeff" + [head.join(","), ...body].join("\r\n")], { type: "text/csv;charset=utf-8" }), `expenses-${stamp()}.csv`);
}

export async function exportPDF(expenses, groupsById, userId, currency, userName) {
  // loaded on demand so the PDF library doesn't bloat the first page load
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape" });
  const data = rows(expenses, groupsById, userId);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const share = data.reduce((s, r) => s + Number(r.myShare), 0);

  doc.setFontSize(18);
  doc.text("Expense Report", 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(100);
  // The built-in PDF font has no currency symbols, so amounts use the currency code instead
  doc.text(`${userName} · generated ${stamp()} · ${expenses.length} expenses · total ${currency} ${total.toFixed(2)} · your share ${currency} ${share.toFixed(2)}`, 14, 23);

  autoTable(doc, {
    startY: 28,
    head: [["Date", "Description", "Group", "Category", "Paid by", `Amount (${currency})`, `Your share (${currency})`, "Split"]],
    body: data.map((r) => [r.date, r.description, r.group, r.category, r.paidBy, r.amount, r.myShare, r.split]),
    headStyles: { fillColor: [13, 148, 136] },
    styles: { fontSize: 9 },
    columnStyles: { 5: { halign: "right" }, 6: { halign: "right" } },
  });
  doc.save(`expenses-${stamp()}.pdf`);
}

export function exportJSON(payload) {
  download(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `expense-splitter-backup-${stamp()}.json`);
}
