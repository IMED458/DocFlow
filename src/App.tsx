import React, { useState, useEffect } from "react";
import {
  FileText,
  Clock,
  CheckCircle,
  Inbox,
  UserCheck,
  Send,
  PlusCircle,
  AlertTriangle,
  Archive,
  Layers,
  Bell,
  Search,
  LogOut,
  FolderOpen,
  User as UserIcon,
  HelpCircle,
  Menu,
  X,
  FileDown,
  FileUp,
  Settings
} from "lucide-react";
import {
  Document,
  DocumentCategory,
  DocumentStatus,
  DocumentType,
  GEORGIAN_CATEGORIES,
  GEORGIAN_DOCUMENT_STATUSES,
  GEORGIAN_DOCUMENT_TYPES,
  User,
  UserRole,
  GEORGIAN_ROLES
} from "./types.js";

import Dashboard from "./components/Dashboard.js";
import DocumentList from "./components/DocumentList.js";
import DocumentDetails from "./components/DocumentDetails.js";
import AdminPanel from "./components/AdminPanel.js";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  // Layout Tab Navigation
  // Tabs: "dashboard", "list", "new", "admin", "details"
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Status Filter overrides from dashboard
  const [listStatusFilter, setListStatusFilter] = useState<string>("ALL");
  const [listCategoryFilter, setListCategoryFilter] = useState<string>("ALL");

  // New Document Draft Form
  const [newDoc, setNewDoc] = useState({
    subject: "",
    description: "",
    category: DocumentCategory.INTERNAL,
    documentType: DocumentType.MEMO,
    priority: "NORMAL",
    confidentiality: "PUBLIC",
    sender: "",
    recipient: "",
    body: ""
  });

  // Login Form Helpers
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Fetch lists
  const loadInitialData = async (userObj: User) => {
    try {
      const headers = { "Authorization": `Bearer jwt-mock-token-${userObj.id}` };
      const [resDocs, resUsers, resDepts, resNotifs] = await Promise.all([
        fetch("/api/documents", { headers }).then(r => r.json()),
        fetch("/api/users", { headers }).then(r => r.json()),
        fetch("/api/departments", { headers }).then(r => r.json()),
        fetch("/api/notifications", { headers }).then(r => r.json())
      ]);

      setDocuments(resDocs);
      setUsers(resUsers);
      setDepartments(resDepts);
      setNotifications(resNotifs);
    } catch (e) {
      console.error("Failed to load initial workspace data", e);
    }
  };

  // Mock auto refresh periodically
  useEffect(() => {
    if (currentUser) {
      loadInitialData(currentUser);
      const timer = setInterval(() => loadInitialData(currentUser), 10000);
      return () => clearInterval(timer);
    }
  }, [currentUser]);

  // Persona Selection Quick Login
  const handlePersonaLogin = (selectedUser: User) => {
    setCurrentUser(selectedUser);
    loadInitialData(selectedUser);
  };

  // Standard login submit
  const handleStandardLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple look up mock
    const found = users.find(u => u.email.toLowerCase() === loginUsername.toLowerCase());
    if (found) {
      setCurrentUser(found);
      loadInitialData(found);
    } else {
      setLoginError("მომხმარებელი მსგავსი ელ-ფოსტით ვერ მოიძებნა.");
    }
  };

  // Fetch all users list initially for the login selector
  useEffect(() => {
    fetch("/api/users")
      .then(r => r.json())
      .then(data => setUsers(data))
      .catch(e => console.error(e));
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    setDocuments([]);
    setActiveTab("dashboard");
  };

  const handleCreateDocumentDirectly = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({
          subject: "ახალი დოკუმენტი",
          description: "ახალი დოკუმენტის პროექტი",
          category: DocumentCategory.INTERNAL,
          documentType: DocumentType.MEMO,
          priority: "NORMAL",
          confidentiality: "PUBLIC",
          sender: "სამინისტროს შიდა აპარატი",
          recipient: "შიდა რეზოლუცია",
          body: `<p>გთხოვთ ჩაწეროთ დოკუმენტის ტექსტი აქ...</p>`,
          authorId: currentUser.id,
          departmentId: currentUser.departmentId,
          responsibleId: currentUser.id,
          pageCount: 1,
          attachmentCount: 0
        })
      });

      if (res.ok) {
        const createdDoc = await res.json();
        await loadInitialData(currentUser);
        setSelectedDocId(createdDoc.id);
        setActiveTab("list");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Creation Action
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({
          ...newDoc,
          authorId: currentUser.id,
          departmentId: currentUser.departmentId,
          responsibleId: currentUser.id,
          pageCount: 1,
          attachmentCount: 0
        })
      });

      if (res.ok) {
        const createdDoc = await res.json();
        // Reset and switch
        setNewDoc({
          subject: "",
          description: "",
          category: DocumentCategory.INTERNAL,
          documentType: DocumentType.MEMO,
          priority: "NORMAL",
          confidentiality: "PUBLIC",
          sender: "",
          recipient: "",
          body: ""
        });
        await loadInitialData(currentUser);
        setSelectedDocId(createdDoc.id);
        setActiveTab("list");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer jwt-mock-token-${currentUser.id}` }
      });
      if (res.ok) {
        loadInitialData(currentUser);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Read notification handler
  const handleReadNotification = async (id: string) => {
    if (!currentUser) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        headers: { "Authorization": `Bearer jwt-mock-token-${currentUser.id}` }
      });
      loadInitialData(currentUser);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearNotifications = async () => {
    if (!currentUser) return;
    try {
      await fetch("/api/notifications/clear", {
        method: "POST",
        headers: { "Authorization": `Bearer jwt-mock-token-${currentUser.id}` }
      });
      loadInitialData(currentUser);
    } catch (e) {
      console.error(e);
    }
  };

  // Counters for left side folder hierarchy
  const draftCount = documents.filter(d => d.status === DocumentStatus.DRAFT).length;
  const onVisaCount = documents.filter(d => d.status === DocumentStatus.ON_VISA).length;
  const signedCount = documents.filter(d => d.status === DocumentStatus.SIGNED).length;
  const overdueCount = documents.filter(d => d.status === DocumentStatus.OVERDUE).length;

  // Unread notification count
  const unreadNotifications = notifications.filter(n => !n.isRead);

  // Login View Guard
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 md:p-8">
        <div className="max-w-4xl mx-auto w-full flex flex-col items-center justify-center flex-1 my-12">
          {/* Brand Card banner */}
          <div className="text-center space-y-3 mb-8">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 font-display">DocFlow Georgia</h1>
            <p className="text-sm text-slate-500 font-sans max-w-md">
              საქართველოს საჯარო ორგანიზაციების ელექტრონული საქმისწარმოების მართვის უსაფრთხო პლატფორმა.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-8 rounded-3xl border border-slate-100 shadow-xl w-full max-w-3xl">
            {/* Quick Demo Personas (Click to Login directly) */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-800 font-display">სატესტო პროფილები (Personas)</h3>
              <p className="text-xxs text-slate-400 font-sans leading-relaxed">
                დააწკაპუნეთ სასურველ როლზე, რათა შეხვიდეთ შესაბამისი უფლებამოსილებით:
              </p>
              <div className="space-y-2">
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handlePersonaLogin(u)}
                    className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-indigo-200 bg-slate-50/50 hover:bg-indigo-50/30 transition flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-xs text-slate-800 font-sans block">
                        {u.firstName} {u.lastName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-sans mt-0.5 block">
                        კოდი: {u.personalNumber}
                      </span>
                    </div>
                    <span className="text-xxs font-sans font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      {GEORGIAN_ROLES[u.role] || u.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Standard Login Forms */}
            <div className="space-y-6 flex flex-col justify-center">
              <h3 className="text-base font-bold text-slate-800 font-display">სისტემაში შესვლა</h3>
              <form onSubmit={handleStandardLogin} className="space-y-4">
                {loginError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-sans">
                    {loginError}
                  </div>
                )}
                <div>
                  <label className="text-xxs font-semibold text-slate-500 block mb-1 font-sans">ელ-ფოსტა</label>
                  <input
                    type="email"
                    placeholder="name@organization.gov.ge"
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs font-sans focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
                  />
                </div>
                <div>
                  <label className="text-xxs font-semibold text-slate-500 block mb-1 font-sans">პაროლი</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs font-sans focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-xl text-xs font-sans font-bold transition shadow-sm"
                >
                  ავტორიზაცია
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer info in Georgian */}
        <div className="text-center text-slate-400 text-xxs font-sans">
          © {new Date().getFullYear()} DocFlow Georgia. საავტორო უფლებები დაცულია.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Left Navigation Sidebar */}
      <div className="w-full md:w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 shrink-0">
        {/* Brand Banner */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black tracking-wider font-display text-white">DocFlow Georgia</h1>
            <span className="text-[9px] text-indigo-400 font-sans tracking-widest font-bold uppercase block mt-0.5">
              საჯარო საქმისწარმოება
            </span>
          </div>
        </div>

        {/* Employee Profile summary */}
        <div className="p-4 mx-4 my-4 bg-slate-800/50 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            {currentUser.firstName[0]}
            {currentUser.lastName[0]}
          </div>
          <div>
            <span className="font-semibold text-xs text-white font-sans block truncate">
              {currentUser.firstName} {currentUser.lastName}
            </span>
            <span className="text-[10px] text-indigo-300 font-semibold font-sans block mt-0.5 truncate">
              {GEORGIAN_ROLES[currentUser.role]}
            </span>
            <span className="text-[8px] text-emerald-400 font-sans flex items-center gap-1 mt-1">
              ● აქტიური
            </span>
          </div>
        </div>

        {/* Tree Menu Links */}
        <div className="flex-1 px-4 space-y-6 overflow-y-auto">
          {/* Main sections */}
          <div className="space-y-1">
            <button
              onClick={() => {
                setActiveTab("dashboard");
                setSelectedDocId(null);
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-sans font-semibold text-left transition ${
                activeTab === "dashboard" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/40 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                სამუშაო მაგიდა
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("list");
                setSelectedDocId(null);
                setListStatusFilter("ALL");
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-sans font-semibold text-left transition ${
                activeTab === "list" && listStatusFilter === "ALL" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/40 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Inbox className="w-4 h-4" />
                დოკუმენტები
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("new");
                setSelectedDocId(null);
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-sans font-semibold text-left transition text-slate-400 hover:bg-slate-800/40 hover:text-white"
            >
              <span className="flex items-center gap-2.5">
                <PlusCircle className="w-4 h-4" />
                ახალი დოკუმენტი
              </span>
            </button>

            {currentUser.role === UserRole.ADMIN && (
              <button
                onClick={() => {
                  setActiveTab("admin");
                  setSelectedDocId(null);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-sans font-semibold text-left transition ${
                  activeTab === "admin" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/40 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4" />
                  ადმინისტრირება
                </span>
              </button>
            )}
          </div>

          {/* Folder hierarchies */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 block">საქაღალდეები</span>
            <div className="space-y-1 text-xs">
              <button
                onClick={() => {
                  setListStatusFilter(DocumentStatus.DRAFT);
                  setActiveTab("list");
                }}
                className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800/30 hover:text-white text-left transition font-sans"
              >
                <span>პროექტები (Drafts)</span>
                {draftCount > 0 && <span className="bg-slate-800 text-slate-300 font-mono text-[9px] px-1.5 py-0.5 rounded-md font-bold">{draftCount}</span>}
              </button>

              <button
                onClick={() => {
                  setListStatusFilter(DocumentStatus.ON_VISA);
                  setActiveTab("list");
                }}
                className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800/30 hover:text-white text-left transition font-sans"
              >
                <span>ვიზირებაზე</span>
                {onVisaCount > 0 && <span className="bg-amber-900/40 text-amber-400 font-mono text-[9px] px-1.5 py-0.5 rounded-md font-bold">{onVisaCount}</span>}
              </button>

              <button
                onClick={() => {
                  setListStatusFilter(DocumentStatus.SIGNED);
                  setActiveTab("list");
                }}
                className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800/30 hover:text-white text-left transition font-sans"
              >
                <span>ხელმოწერილი</span>
                {signedCount > 0 && <span className="bg-emerald-950/40 text-emerald-400 font-mono text-[9px] px-1.5 py-0.5 rounded-md font-bold">{signedCount}</span>}
              </button>
            </div>
          </div>
        </div>

        {/* Log out bottom section */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-sans font-semibold text-slate-400 hover:bg-rose-950/20 hover:text-rose-400 transition text-left"
          >
            <LogOut className="w-4 h-4" />
            გასვლა
          </button>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Controls bar */}
        <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between gap-4 h-16 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-slate-800 text-sm md:text-base">
              საქართველოს საჯარო სამინისტროების დოკუმენტბრუნვის პლატფორმა
            </h2>
          </div>

          {/* Notifications and profile controls */}
          <div className="flex items-center gap-3 relative">
            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-mono font-bold text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>

              {/* Notification dropdown list */}
              {showNotificationDropdown && (
                <div className="absolute top-11 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 w-80 z-50 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <span className="text-xs font-bold text-slate-700 font-display">შეტყობინებები</span>
                    <button onClick={handleClearNotifications} className="text-xxs text-indigo-600 font-bold hover:text-indigo-800">
                      ყველას გასუფთავება
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xxs text-slate-400 font-sans p-4 text-center">ახალი შეტყობინებები არ არის</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            handleReadNotification(n.id);
                            setSelectedDocId(n.documentId);
                            setActiveTab("details");
                            setShowNotificationDropdown(false);
                          }}
                          className={`p-2.5 rounded-xl cursor-pointer text-xxs font-sans transition border ${
                            n.isRead ? "bg-white border-slate-100 text-slate-500" : "bg-indigo-50/40 border-indigo-100 text-slate-800 font-semibold"
                          }`}
                        >
                          <p>{n.message}</p>
                          <span className="text-[9px] text-slate-400 mt-1 block">{n.createdAt.split("T")[0]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Language status */}
            <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-slate-600 font-sans font-bold text-xxs">
              KA
            </span>
          </div>
        </div>

        {/* Content canvas with scrollable area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Details tab override */}
          {selectedDocId ? (
            <DocumentDetails
              documentId={selectedDocId}
              currentUser={currentUser}
              onBack={() => setSelectedDocId(null)}
              onRefresh={() => loadInitialData(currentUser)}
            />
          ) : (
            <>
              {/* Tab: Dashboard */}
              {activeTab === "dashboard" && (
                <Dashboard
                  documents={documents}
                  onOpenNewDocument={() => setActiveTab("new")}
                  onFilterStatus={(st) => {
                    setListStatusFilter(st);
                    setActiveTab("list");
                  }}
                  onFilterCategory={(cat) => {
                    setListCategoryFilter(cat);
                    setActiveTab("list");
                  }}
                  userId={currentUser.id}
                />
              )}

              {/* Tab: List */}
              {activeTab === "list" && (
                <DocumentList
                  documents={
                    listStatusFilter !== "ALL"
                      ? documents.filter(d => d.status === listStatusFilter)
                      : listCategoryFilter !== "ALL"
                      ? documents.filter(d => d.category === listCategoryFilter)
                      : documents
                  }
                  users={users}
                  departments={departments}
                  onOpenDocument={(id) => setSelectedDocId(id)}
                  onEditDocument={(id) => {
                    setSelectedDocId(id);
                  }}
                  onDeleteDraft={handleDeleteDraft}
                  onRefresh={() => loadInitialData(currentUser)}
                />
              )}

              {activeTab === "new" && (
                <div className="max-w-6xl mx-auto space-y-5">
                  <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
                    <h3 className="font-display font-bold text-slate-900 text-lg">ახალი დოკუმენტი</h3>
                    <p className="text-xs text-slate-500 mt-1 font-sans">შეავსეთ ძირითადი ველები. შექმნის შემდეგ დოკუმენტი გაიხსნება ტექსტის რედაქტირებისთვის.</p>
                  </div>

                  <form onSubmit={handleCreateDocument} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                        კატეგორია
                        <select
                          value={newDoc.category}
                          onChange={e => setNewDoc({ ...newDoc, category: e.target.value as DocumentCategory })}
                          className="border border-slate-200 rounded-xl p-3 text-sm font-sans bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                        >
                          {Object.values(DocumentCategory).map(cat => (
                            <option key={cat} value={cat}>{GEORGIAN_CATEGORIES[cat]}</option>
                          ))}
                        </select>
                      </label>

                      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                        ტიპი
                        <select
                          value={newDoc.documentType}
                          onChange={e => setNewDoc({ ...newDoc, documentType: e.target.value as DocumentType })}
                          className="border border-slate-200 rounded-xl p-3 text-sm font-sans bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                        >
                          {Object.values(DocumentType).map(type => (
                            <option key={type} value={type}>{GEORGIAN_DOCUMENT_TYPES[type]}</option>
                          ))}
                        </select>
                      </label>

                      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                        პრიორიტეტი
                        <select
                          value={newDoc.priority}
                          onChange={e => setNewDoc({ ...newDoc, priority: e.target.value })}
                          className="border border-slate-200 rounded-xl p-3 text-sm font-sans bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                        >
                          <option value="LOW">დაბალი</option>
                          <option value="NORMAL">ჩვეულებრივი</option>
                          <option value="HIGH">მაღალი</option>
                          <option value="URGENT">სასწრაფო</option>
                        </select>
                      </label>
                    </div>

                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                      სათაური
                      <input
                        value={newDoc.subject}
                        onChange={e => setNewDoc({ ...newDoc, subject: e.target.value })}
                        required
                        className="border border-slate-200 rounded-xl p-3 text-sm font-sans focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                      მოკლე აღწერა
                      <textarea
                        value={newDoc.description}
                        onChange={e => setNewDoc({ ...newDoc, description: e.target.value })}
                        rows={3}
                        className="border border-slate-200 rounded-xl p-3 text-sm font-sans leading-6 resize-y min-h-28 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                      />
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                        გამგზავნი
                        <input
                          value={newDoc.sender}
                          onChange={e => setNewDoc({ ...newDoc, sender: e.target.value })}
                          className="border border-slate-200 rounded-xl p-3 text-sm font-sans focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                        მიმღები
                        <input
                          value={newDoc.recipient}
                          onChange={e => setNewDoc({ ...newDoc, recipient: e.target.value })}
                          className="border border-slate-200 rounded-xl p-3 text-sm font-sans focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                        />
                      </label>
                    </div>

                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                      ტექსტი
                      <textarea
                        value={newDoc.body}
                        onChange={e => setNewDoc({ ...newDoc, body: e.target.value })}
                        rows={10}
                        className="border border-slate-200 rounded-xl p-4 text-sm font-sans leading-7 resize-y min-h-72 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                      />
                    </label>

                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setActiveTab("list")} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold font-sans">
                        გაუქმება
                      </button>
                      <button type="submit" className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold font-sans hover:bg-slate-800">
                        დოკუმენტის შექმნა
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tab: Admin Panel */}
              {activeTab === "admin" && currentUser.role === UserRole.ADMIN && (
                <AdminPanel currentUser={currentUser} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
