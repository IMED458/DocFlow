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
  FolderOpen,
  PenLine
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
  documentTypes?: any[];
  isAdmin?: boolean;
  onOpenDocument: (id: string) => void;
  onEditDocument: (id: string) => void;
  onDeleteDraft: (id: string) => void;
  onDeleteDocument?: (id: string) => void;
  onRefresh: () => void;
  currentUserId: string;
}

export default function DocumentList({
  documents,
  users,
  departments,
  documentTypes = [],
  isAdmin = false,
  onOpenDocument,
  onEditDocument,
  onDeleteDraft,
  onDeleteDocument,
  onRefresh,
  currentUserId
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
  const [entryNumberFilter, setEntryNumberFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Sort State
  const [sortBy, setSortBy] = useState<keyof Document>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [workingAction, setWorkingAction] = useState<string | null>(null);

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
    if (entryNumberFilter && !doc.entryNumber?.toLowerCase().includes(entryNumberFilter.toLowerCase())) return false;

    if (dateFrom && doc.createdAt < dateFrom) return false;
    if (dateTo && doc.createdAt > dateTo) return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        doc.subject.toLowerCase().includes(q) ||
        doc.description.toLowerCase().includes(q) ||
        doc.documentNumber?.toLowerCase().includes(q) ||
        doc.registrationNumber?.toLowerCase().includes(q) ||
        doc.entryNumber?.toLowerCase().includes(q) ||
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
      <span className={`inline-block max-w-[120px] text-center leading-tight px-2.5 py-1 text-[11px] font-sans font-medium rounded-lg border whitespace-normal break-words ${style}`}>
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

  const getTypeLabel = (id: string) => {
    return documentTypes.find(typeItem => typeItem.id === id)?.label || GEORGIAN_DOCUMENT_TYPES[id as DocumentType] || id;
  };

  const runWorkflowAction = async (doc: Document, action: "visa" | "sign") => {
    const actionKey = `${doc.id}-${action}`;
    setWorkingAction(actionKey);
    try {
      const endpoint = action === "visa" ? `/api/documents/${doc.id}/visa/approve` : `/api/documents/${doc.id}/sign`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUserId}`,
        },
        body: JSON.stringify({
          userId: currentUserId,
          comment: action === "visa" ? "დავიზებულია სიიდან" : "ხელმოწერილია სიიდან",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        window.alert(err.message || "ქმედება ვერ შესრულდა.");
        return;
      }
      onRefresh();
    } catch (error) {
      console.error(error);
      window.alert("ქმედება ვერ შესრულდა. სცადეთ თავიდან.");
    } finally {
      setWorkingAction(null);
    }
  };

  const quickActionFor = (doc: Document) => {
    const quickAction = (doc as any).quickAction;
    if (quickAction === "VISA") {
      return { type: "visa" as const, label: "დავიზება", title: "დოკუმენტის ვიზირება" };
    }
    if (quickAction === "SIGN") {
      return { type: "sign" as const, label: "ხელმოწერა", title: "დოკუმენტის ხელმოწერა" };
    }
    return null;
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
            placeholder="ძებნა სათაურით, შინაარსით, შიდა ან დოკ. ნომრით..."
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
	              {documentTypes.filter(item => !GEORGIAN_DOCUMENT_TYPES[item.id as DocumentType]).map(item => (
	                <option key={item.id} value={item.id}>{item.label}</option>
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

          {/* Internal (Entry) Number */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5 font-sans">შიდა ნომერი</label>
            <input
              type="text"
              placeholder="000123"
              value={entryNumberFilter}
              onChange={e => setEntryNumberFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs font-sans font-mono focus:outline-hidden"
            />
          </div>
        </div>
      )}

      {/* Document Grid/Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-b from-slate-100 to-slate-50 border-b border-slate-200 text-slate-700 text-[11px] font-sans font-bold">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 focus:ring-slate-900"
                  />
                </th>
                <th className="p-3 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("category")}>
                  მდგომარეობა
                </th>
                <th className="p-3 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("documentType")}>
                  ტიპი / სტატუსი
                </th>
                <th className="p-3 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("documentNumber")}>
                  დოკუმენტის N / თარიღი
                </th>
                <th className="p-3">შიდა N / თარიღი</th>
                <th className="p-3">ვადა</th>
                <th className="p-3">ავტორი</th>
                <th className="p-3">პასუხები</th>
                <th className="p-3">ადრესატი</th>
                <th className="p-3 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("subject")}>თემა</th>
                <th className="p-3">მიღების დრო</th>
                <th className="p-3 text-center">პრიორიტეტი</th>
                <th className="p-3 text-right">ქმედება</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-12 text-center text-slate-400 font-sans">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    დოკუმენტები ვერ მოიძებნა
                  </td>
                </tr>
              ) : (
	                filtered.map(doc => {
                    const quickAction = quickActionFor(doc);
                    return (
		                  <tr key={doc.id} onDoubleClick={() => onOpenDocument(doc.id)} className="hover:bg-sky-50 odd:bg-white even:bg-slate-50/70 transition group align-top border-b border-slate-100 cursor-pointer">
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
		                    <td className="p-3 text-xs font-semibold">
		                      <div className="flex flex-col items-center gap-1.5">
		                        <span className="text-slate-700">{GEORGIAN_CATEGORIES[doc.category] || doc.category}</span>
		                        {renderStatusBadge(doc.status)}
                            {quickAction && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  runWorkflowAction(doc, quickAction.type);
                                }}
                                disabled={workingAction === `${doc.id}-${quickAction.type}`}
                                className={`mt-1 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold border transition disabled:opacity-50 ${
                                  quickAction.type === "visa"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                    : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                                }`}
                                title={quickAction.title}
                              >
                                <PenLine className="w-3 h-3" />
                                {workingAction === `${doc.id}-${quickAction.type}` ? "..." : quickAction.label}
                              </button>
                            )}
		                      </div>
		                    </td>

                    {/* Category */}
	                    <td className="p-3 font-sans text-xs font-semibold text-slate-800">
	                      {getTypeLabel(doc.documentType)}
	                      <span className="block text-slate-400 mt-1">{GEORGIAN_DOCUMENT_STATUSES[doc.status] || doc.status}</span>
	                    </td>

                    {/* Subject/Type */}
	                    <td className="p-3 text-center">
	                      <span className="font-mono text-xs text-slate-700 block">{doc.documentNumber || "-"}</span>
	                      <span className="text-[11px] text-slate-500 font-sans block mt-0.5">{doc.registrationDate || "-"}</span>
	                    </td>

                    {/* Number and Date */}
	                    <td className="p-3 text-center">
	                      <span className="font-mono text-xs text-slate-700 block">{doc.entryNumber || "—"}</span>
	                      <span className="text-[11px] text-slate-500 font-sans block mt-0.5">{doc.documentDate || doc.createdAt.split("T")[0]}</span>
	                    </td>

                    {/* Priority */}
	                    <td className="p-3 text-center text-xs">{doc.deadline || "-"}</td>

                    {/* Author */}
	                    <td className="p-3 font-sans text-xs text-slate-700 max-w-[180px]">{getUserName(doc.authorId)}</td>
	                    <td className="p-3 text-center text-xs font-mono">{doc.attachmentCount || 0} / {doc.pageCount || 0}</td>
	                    <td className="p-3 font-sans text-xs text-slate-700 max-w-[180px] truncate">{doc.recipient || doc.sender || "-"}</td>
	                    <td className="p-3 max-w-sm">
	                      <span className="font-sans font-medium text-slate-900 block line-clamp-3" title={doc.subject}>{doc.subject}</span>
	                    </td>
	                    <td className="p-3 text-center text-xs font-semibold">{doc.createdAt.split("T")[0]}<br />{doc.createdAt.split("T")[1]?.substring(0, 5)}</td>
	                    <td className="p-3 text-center">
	                      <span className={`inline-block w-5 h-5 rounded-full ${doc.priority === "URGENT" || doc.priority === "HIGH" ? "bg-red-500" : doc.priority === "NORMAL" ? "bg-yellow-300" : "bg-emerald-400"}`} title={doc.priority}></span>
	                    </td>

                    {/* Action buttons */}
	                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition">
                        <button
                          onClick={() => onOpenDocument(doc.id)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          title="დეტალები"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {doc.status === DocumentStatus.DRAFT && (
                          <button
                            onClick={() => onEditDocument(doc.id)}
                            className="p-1.5 bg-slate-50 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                            title="რედაქტირება"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {doc.status === DocumentStatus.DRAFT && !isAdmin && (
                          <button
                            onClick={() => onDeleteDraft(doc.id)}
                            className="p-1.5 bg-slate-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                            title="პროექტის წაშლა"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && onDeleteDocument && (
                          <button
                            onClick={() => onDeleteDocument(doc.id)}
                            className="p-1.5 bg-slate-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                            title="დოკუმენტის სრულად წაშლა (ადმინი)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
	                  </tr>
                    );
                  })
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
