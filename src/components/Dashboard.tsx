import React from "react";
import {
  FileText,
  Clock,
  CheckCircle,
  FileDown,
  FileUp,
  AlertTriangle,
  Archive,
  Layers,
  Inbox,
  UserCheck,
  Send,
  PlusCircle
} from "lucide-react";
import { Document, DocumentCategory, DocumentStatus, GEORGIAN_CATEGORIES, GEORGIAN_DOCUMENT_STATUSES } from "../types.js";

interface DashboardProps {
  documents: Document[];
  onOpenNewDocument: () => void;
  onFilterStatus: (status: DocumentStatus | "ALL") => void;
  onFilterCategory: (category: DocumentCategory | "ALL") => void;
  userId: string;
}

export default function Dashboard({
  documents,
  onOpenNewDocument,
  onFilterStatus,
  onFilterCategory,
  userId
}: DashboardProps) {
  // Compute Stats
  const totalDocs = documents.length;
  const draftDocs = documents.filter(d => d.status === DocumentStatus.DRAFT).length;
  const incomingDocs = documents.filter(d => d.category === DocumentCategory.INCOMING).length;
  const outgoingDocs = documents.filter(d => d.category === DocumentCategory.OUTGOING).length;
  const internalDocs = documents.filter(d => d.category === DocumentCategory.INTERNAL).length;
  const signedDocs = documents.filter(d => d.status === DocumentStatus.SIGNED).length;
  const archivedDocs = documents.filter(d => d.archiveStatus === "ARCHIVED").length;

  // Documents waiting for user's action
  const waitingForMe = documents.filter(d => {
    // Simulated rule: is the user a recipient or responsible and status is not draft/signed/cancelled
    return (
      (d.responsibleId === userId || d.authorId !== userId) &&
      d.status !== DocumentStatus.SIGNED &&
      d.status !== DocumentStatus.DRAFT &&
      d.status !== DocumentStatus.CANCELLED
    );
  }).length;

  const urgentDocs = documents.filter(d => d.priority === "URGENT" || d.priority === "HIGH").length;

  // Simple weekly chart stats
  const weeklyStats = [
    { label: "ორშაბათი", count: 4 },
    { label: "სამშაბათი", count: 7 },
    { label: "ოთხშაბათი", count: 5 },
    { label: "ხუთშაბათი", count: 9 },
    { label: "პარასკევი", count: totalDocs },
  ];

  return (
    <div className="space-y-6">
      {/* Banner / Greeting */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display">სამუშაო სივრცე — DocFlow Georgia</h2>
          <p className="text-slate-400 mt-1 text-sm font-sans">
            ელექტრონული დოკუმენტბრუნვისა და დავალებების კონტროლის ერთიანი სისტემა.
          </p>
        </div>
        <div>
          <button
            onClick={onOpenNewDocument}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl transition font-sans font-medium text-sm shadow-sm"
          >
            <PlusCircle className="w-5 h-5" />
            ახალი დოკუმენტი
          </button>
        </div>
      </div>

      {/* Main Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div
          onClick={() => onFilterCategory("ALL")}
          className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 hover:shadow-md transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <span className="text-slate-500 text-xs font-sans font-semibold uppercase tracking-wider block">
              სულ დოკუმენტები
            </span>
            <span className="text-3xl font-bold text-slate-800 font-display mt-2 block">
              {totalDocs}
            </span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2 */}
        <div
          onClick={() => onFilterCategory(DocumentCategory.INCOMING)}
          className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 hover:shadow-md transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <span className="text-slate-500 text-xs font-sans font-semibold uppercase tracking-wider block">
              შემოსული წერილები
            </span>
            <span className="text-3xl font-bold text-slate-800 font-display mt-2 block">
              {incomingDocs}
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileDown className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3 */}
        <div
          onClick={() => onFilterCategory(DocumentCategory.OUTGOING)}
          className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 hover:shadow-md transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <span className="text-slate-500 text-xs font-sans font-semibold uppercase tracking-wider block">
              გასული წერილები
            </span>
            <span className="text-3xl font-bold text-slate-800 font-display mt-2 block">
              {outgoingDocs}
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <FileUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4 */}
        <div
          onClick={() => onFilterStatus(DocumentStatus.SIGNED)}
          className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 hover:shadow-md transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <span className="text-slate-500 text-xs font-sans font-semibold uppercase tracking-wider block">
              ხელმოწერილი
            </span>
            <span className="text-3xl font-bold text-slate-800 font-display mt-2 block">
              {signedDocs}
            </span>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid: Actions, Notifications, Weekly Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Alerts & Folders */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-100 space-y-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 font-display flex items-center gap-2">
            <Inbox className="w-5 h-5 text-indigo-500" />
            სწრაფი საქაღალდეები
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => onFilterStatus(DocumentStatus.DRAFT)}
              className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition cursor-pointer flex items-center gap-3 border border-slate-100"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-sm font-sans">პროექტები (Drafts)</h4>
                <p className="text-xs text-slate-500 mt-1 font-mono">{draftDocs} დოკუმენტი</p>
              </div>
            </div>

            <div
              onClick={() => onFilterStatus(DocumentStatus.ON_VISA)}
              className="p-4 rounded-xl bg-amber-50 hover:bg-amber-100 transition cursor-pointer flex items-center gap-3 border border-amber-100"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-amber-900 text-sm font-sans">ჩემი ვიზირებები</h4>
                <p className="text-xs text-amber-600 mt-1 font-mono">{waitingForMe} დოკუმენტი</p>
              </div>
            </div>

            <div
              onClick={() => onFilterStatus(DocumentStatus.ARCHIVED)}
              className="p-4 rounded-xl bg-violet-50 hover:bg-violet-100 transition cursor-pointer flex items-center gap-3 border border-violet-100"
            >
              <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-violet-950 text-sm font-sans">არქივი (Archived)</h4>
                <p className="text-xs text-violet-600 mt-1 font-mono">{archivedDocs} დოკუმენტი</p>
              </div>
            </div>

            <div
              onClick={() => onFilterStatus(DocumentStatus.OVERDUE)}
              className="p-4 rounded-xl bg-rose-50 hover:bg-rose-100 transition cursor-pointer flex items-center gap-3 border border-rose-100"
            >
              <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-rose-950 text-sm font-sans">ვადაგადაცილებული</h4>
                <p className="text-xs text-rose-600 mt-1 font-mono">{urgentDocs} დოკუმენტი</p>
              </div>
            </div>
          </div>

          {/* Bar Chart Mockup (CSS only, gorgeous layout) */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 font-sans">
              რეგისტრაციის კვირის სტატისტიკა
            </h4>
            <div className="flex items-end justify-between gap-2 h-36 pt-4">
              {weeklyStats.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    className="w-full bg-slate-900 hover:bg-indigo-600 transition-all rounded-t-lg relative group"
                    style={{ height: `${(item.count / 15) * 100}%` }}
                  >
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xxs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">
                      {item.count}
                    </span>
                  </div>
                  <span className="text-xxs font-sans text-slate-500 font-medium truncate w-full text-center">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Mini Guidelines / Activities */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-100 space-y-6">
          <h3 className="text-lg font-bold text-slate-800 font-display">
            საკანცელარიო წესები
          </h3>
          <div className="space-y-4 text-sm font-sans text-slate-600">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-800 block">1. რეგისტრაცია</span>
              დოკუმენტის პროექტი (Draft) რეგისტრაციის შემდეგ იღებს უნიკალურ ნომერს (MES format) და მისი შინაარსის შეცვლა იზღუდება.
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-800 block">2. ვიზირება და ხელმოწერა</span>
              ხელმოწერამდე დოკუმენტი უნდა დავიზდეს შესაბამისი უფლებამოსილი პირების (ვიზატორების) მიერ.
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-800 block">3. შესრულების კონტროლი</span>
              რეზოლუციის დადება წარმოშობს დავალებებს, რომელთა შესრულების ვადა მკაცრად კონტროლდება.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
