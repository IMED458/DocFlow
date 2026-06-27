import React, { useState } from "react";
import {
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Lock,
  RefreshCw,
  FolderOpen
} from "lucide-react";
import {
  Document,
  DocumentCategory,
  DocumentStatus,
  DocumentType,
  GEORGIAN_DOCUMENT_STATUSES,
  GEORGIAN_DOCUMENT_TYPES,
  GEORGIAN_CATEGORIES
} from "../types.js";

interface DocumentListProps {
  documents: Document[];
  users: any[];
  departments: any[];
  onOpenDocument: (id: string) => void;
  onEditDocument: (id: string) => void;
  onDeleteDraft: (id: string) => void;
  onRefresh: () => void;
}

export default function DocumentList({
  documents,
  users,
  departments,
  onOpenDocument,
  onEditDocument,
  onDeleteDraft,
  onRefresh
}: DocumentListProps) {
  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("ALL");
  const [type, setType] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [priority, setPriority] = useState<string>("ALL");
  const [confidentiality, setConfidentiality] = useState<string>("ALL");
  const [executor, setExecutor] = useState<string>("ALL");
  const [docNumber, setDocNumber] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Sort State
  const [sortBy, setSortBy] = useState<keyof Document>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Sorting helper
  const handleSort = (field: keyof Document) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Filter logic
  let filtered = documents.filter(doc => {
    if (category !== "ALL" && doc.category !== category) return false;
    if (type !== "ALL" && doc.documentType !== type) return false;
    if (status !== "ALL" && doc.status !== status) return false;
    if (priority !== "ALL" && doc.priority !== priority) return false;
    if (confidentiality !== "ALL" && doc.confidentiality !== confidentiality) return false;

    if (docNumber && !doc.documentNumber?.toLowerCase().includes(docNumber.toLowerCase())) return false;
    if (regNumber && !doc.registrationNumber?.toLowerCase().includes(regNumber.toLowerCase())) return false;

    if (dateFrom && doc.createdAt < dateFrom) return false;
    if (dateTo && doc.createdAt > dateTo) return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        doc.subject.toLowerCase().includes(q) ||
        doc.description.toLowerCase().includes(q) ||
        doc.documentNumber?.toLowerCase().includes(q) ||
        doc.sender?.toLowerCase().includes(q) ||
        doc.recipient?.toLowerCase().includes(q)
      );
    }

    return true;
  });

  // Sort logic
  filtered.sort((a, b) => {
    let aVal = a[sortBy] ?? "";
    let bVal = b[sortBy] ?? "";

    if (typeof aVal === "string") {
      return sortOrder === "asc" ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
    }
    return 0;
  });

  // Checkbox toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(d => d.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Status Badge Renderer
  const renderStatusBadge = (s: DocumentStatus) => {
    const label = GEORGIAN_DOCUMENT_STATUSES[s] || s;
    let style = "bg-slate-100 text-slate-700";

    switch (s) {
      case DocumentStatus.DRAFT:
        style = "bg-slate-100 text-slate-700 border-slate-200";
        break;
      case DocumentStatus.REGISTERED:
        style = "bg-blue-50 text-blue-700 border-blue-200";
        break;
      case DocumentStatus.ON_VISA:
      case DocumentStatus.SENT_TO_VISA:
        style = "bg-amber-50 text-amber-700 border-amber-200";
        break;
      case DocumentStatus.VISA_APPROVED:
        style = "bg-emerald-50 text-emerald-700 border-emerald-200";
        break;
      case DocumentStatus.SIGNED:
        style = "bg-teal-50 text-teal-700 border-teal-200";
        break;
      case DocumentStatus.CANCELLED:
        style = "bg-rose-50 text-rose-700 border-rose-200";
        break;
      case DocumentStatus.OVERDUE:
        style = "bg-red-50 text-red-700 border-red-200 animate-pulse";
        break;
    }

    return (
      <span className={`px-2.5 py-1 text-xs font-sans font-medium rounded-full border ${style}`}>
        {label}
      </span>
    );
  };

  // Priority Badge Renderer
  const renderPriorityBadge = (p: string) => {
    let style = "bg-slate-100 text-slate-700";
    let label = "დაბალი";

    if (p === "NORMAL") {
      style = "bg-blue-50 text-blue-700";
      label = "საშუალო";
    } else if (p === "HIGH") {
      style = "bg-orange-50 text-orange-700";
      label = "მაღალი";
    } else if (p === "URGENT") {
      style = "bg-red-50 text-red-700 font-bold";
      label = "სასწრაფო";
    }

    return (
      <span className={`px-2 py-0.5 rounded text-xxs font-sans font-medium ${style}`}>
        {label}
      </span>
    );
  };

  const getUserName = (id: string) => {
    const u = users.find(x => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : "უცნობი";
  };

  return (
    <div className="space-y-4">
      {/* Search and Toggle Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="ძებნა სათაურით, შინაარსით ან ნომრით..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-sans focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-sans transition ${
              showFilters ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Filter className="w-4 h-4" />
            ფილტრები
          </button>
          <button
            onClick={onRefresh}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition"
            title="განახლება"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Advanced Filter Drawer */}
      {showFilters && (
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5 font-sans">კატეგორია</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
            >
              <option value="ALL">ყველა</option>
              {Object.entries(GEORGIAN_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5 font-sans">ტიპი</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
            >
              <option value="ALL">ყველა</option>
              {Object.entries(GEORGIAN_DOCUMENT_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5 font-sans">სტატუსი</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
            >
              <option value="ALL">ყველა</option>
              {Object.entries(GEORGIAN_DOCUMENT_STATUSES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5 font-sans">პრიორიტეტი</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
            >
              <option value="ALL">ყველა</option>
              <option value="LOW">დაბალი</option>
              <option value="NORMAL">საშუალო</option>
              <option value="HIGH">მაღალი</option>
              <option value="URGENT">სასწრაფო</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5 font-sans">თარიღიდან</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5 font-sans">თარიღამდე</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
            />
          </div>

          {/* Doc Number */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5 font-sans">დოკუმენტის ნომერი</label>
            <input
              type="text"
              placeholder="MES..."
              value={docNumber}
              onChange={e => setDocNumber(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
            />
          </div>

          {/* Reg Number */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5 font-sans">რეგისტრაციის ნომერი</label>
            <input
              type="text"
              placeholder="REG..."
              value={regNumber}
              onChange={e => setRegNumber(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
            />
          </div>
        </div>
      )}

      {/* Document Grid/Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 text-xs font-sans font-semibold uppercase tracking-wider">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 focus:ring-slate-900"
                  />
                </th>
                <th className="p-4 w-16">სტატუსი</th>
                <th className="p-4 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("category")}>
                  კატეგორია {sortBy === "category" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("subject")}>
                  დოკუმენტის საგანი {sortBy === "subject" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("documentNumber")}>
                  ნომერი და თარიღი {sortBy === "documentNumber" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="p-4">პრიორიტეტი</th>
                <th className="p-4">ავტორი</th>
                <th className="p-4 text-right">ქმედება</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 font-sans">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    დოკუმენტები ვერ მოიძებნა
                  </td>
                </tr>
              ) : (
                filtered.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition group">
                    {/* Checkbox */}
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(doc.id)}
                        onChange={() => toggleSelect(doc.id)}
                        className="rounded border-slate-300 focus:ring-slate-900"
                      />
                    </td>

                    {/* Status badge */}
                    <td className="p-4">{renderStatusBadge(doc.status)}</td>

                    {/* Category */}
                    <td className="p-4 font-sans font-medium text-slate-800">
                      {GEORGIAN_CATEGORIES[doc.category] || doc.category}
                    </td>

                    {/* Subject/Type */}
                    <td className="p-4 max-w-xs">
                      <span className="text-xxs font-sans uppercase font-bold text-slate-400 tracking-wider block">
                        {GEORGIAN_DOCUMENT_TYPES[doc.documentType] || doc.documentType}
                      </span>
                      <span className="font-sans font-medium text-slate-800 block truncate mt-0.5" title={doc.subject}>
                        {doc.subject}
                      </span>
                    </td>

                    {/* Number and Date */}
                    <td className="p-4">
                      <span className="font-mono text-xs text-slate-600 block">
                        {doc.documentNumber || "—"}
                      </span>
                      <span className="text-xxs text-slate-400 font-sans block mt-0.5">
                        {doc.documentDate || doc.createdAt.split("T")[0]}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="p-4">{renderPriorityBadge(doc.priority)}</td>

                    {/* Author */}
                    <td className="p-4 font-sans text-slate-600">
                      {getUserName(doc.authorId)}
                    </td>

                    {/* Action buttons */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition">
                        <button
                          onClick={() => onOpenDocument(doc.id)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          title="დეტალები"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {doc.status === DocumentStatus.DRAFT && (
                          <>
                            <button
                              onClick={() => onEditDocument(doc.id)}
                              className="p-1.5 bg-slate-50 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                              title="რედაქტირება"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteDraft(doc.id)}
                              className="p-1.5 bg-slate-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                              title="წაშლა"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Status Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-sans text-slate-500">
          <div>
            ნაჩვენებია <span className="font-bold text-slate-700">{filtered.length}</span>-დან{" "}
            <span className="font-bold text-slate-700">{filtered.length}</span> დოკუმენტი
          </div>
          <div className="flex items-center gap-1.5">
            <button className="px-2.5 py-1 border border-slate-200 bg-white rounded-md text-slate-400 cursor-not-allowed">
              წინა
            </button>
            <button className="px-2.5 py-1 border border-slate-200 bg-slate-900 text-white rounded-md">
              1
            </button>
            <button className="px-2.5 py-1 border border-slate-200 bg-white rounded-md text-slate-400 cursor-not-allowed">
              შემდეგი
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
