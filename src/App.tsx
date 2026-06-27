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

const SESSION_USER_KEY = "docflow-georgia-current-user";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
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
	          documentType: documentTypes[0]?.id || DocumentType.MEMO,
    priority: "NORMAL",
    confidentiality: "PUBLIC",
    sender: "",
    recipient: "",
    body: ""
  });

  // New document modal: step 1 = choose type, step 2 = subject + details
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [newDocStep, setNewDocStep] = useState<1 | 2>(1);
  const [creatingDoc, setCreatingDoc] = useState(false);

  // Login Form Helpers
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Fetch lists
  const loadInitialData = async (userObj: User) => {
    try {
      const headers = { "Authorization": `Bearer jwt-mock-token-${userObj.id}` };
      const [resDocs, resUsers, resDepts, resNotifs, resDocTypes] = await Promise.all([
        fetch("/api/documents", { headers }).then(r => r.json()),
        fetch("/api/users", { headers }).then(r => r.json()),
        fetch("/api/departments", { headers }).then(r => r.json()),
        fetch("/api/notifications", { headers }).then(r => r.json()),
        fetch("/api/admin/document-types", { headers }).then(r => r.json())
      ]);

      setDocuments(resDocs);
      setUsers(resUsers);
      setDepartments(resDepts);
      setNotifications(resNotifs);
      setDocumentTypes(resDocTypes || []);
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

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_USER_KEY);
    if (!saved) return;
    try {
      const user = JSON.parse(saved) as User;
      if (user?.id) {
        setCurrentUser(user);
        loadInitialData(user);
      }
    } catch {
      localStorage.removeItem(SESSION_USER_KEY);
    }
  }, []);

  // Persona Selection Quick Login
  const handlePersonaLogin = (selectedUser: User) => {
    setCurrentUser(selectedUser);
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(selectedUser));
    loadInitialData(selectedUser);
  };

  // Standard login submit
  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (loginUsername.includes("@")) {
      setLoginError("შესვლა შესაძლებელია მხოლოდ მომხმარებლის სახელით, არა ელ-ფოსტით.");
      return;
    }
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      if (!res.ok) {
        setLoginError("არასწორი მომხმარებელი ან პაროლი.");
        return;
      }
      const data = await res.json();
      setCurrentUser(data.user);
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(data.user));
      loadInitialData(data.user);
    } catch (err) {
      setLoginError("ავტორიზაცია ვერ მოხერხდა. სცადეთ თავიდან.");
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
    localStorage.removeItem(SESSION_USER_KEY);
    setCurrentUser(null);
    setDocuments([]);
    setActiveTab("dashboard");
  };

  // ახალი დოკუმენტის ოსტატის გახსნა — ჯერ ტიპის არჩევა, შემდეგ საგანი.
  // დოკუმენტი ბაზაში არ იქმნება, სანამ მომხმარებელი არ დაასრულებს შექმნას.
  const openNewDocument = () => {
    setNewDoc({
      subject: "",
      description: "",
      category: DocumentCategory.INTERNAL,
      documentType: documentTypes[0]?.id || DocumentType.MEMO,
      priority: "NORMAL",
      confidentiality: "PUBLIC",
      sender: "",
      recipient: "",
      body: ""
    });
    setNewDocStep(1);
    setShowNewDoc(true);
  };

  // Creation Action — დოკუმენტი იქმნება მხოლოდ აქ, საგნის ჩაწერის შემდეგ.
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newDoc.subject.trim() || !newDoc.documentType) {
      setNewDocStep(newDoc.documentType ? 2 : 1);
      return;
    }

    setCreatingDoc(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({
          ...newDoc,
          subject: newDoc.subject.trim(),
          status: DocumentStatus.DRAFT,
          authorId: currentUser.id,
          departmentId: currentUser.departmentId,
          responsibleId: currentUser.id,
          pageCount: 1,
          attachmentCount: 0
        })
      });

      if (res.ok) {
        const createdDoc = await res.json();
        setShowNewDoc(false);
        setNewDocStep(1);
        await loadInitialData(currentUser);
        setSelectedDocId(createdDoc.id);
        setActiveTab("list");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingDoc(false);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/documents/${id}/draft`, {
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

  // ადმინისტრატორის სრული წაშლა — ნებისმიერ სტატუსში.
  const handleDeleteDocument = async (id: string) => {
    if (!currentUser) return;
    if (!window.confirm("ნამდვილად გსურთ დოკუმენტის სრულად წაშლა? ეს ქმედება შეუქცევადია.")) return;
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer jwt-mock-token-${currentUser.id}` }
      });
      if (res.ok) {
        if (selectedDocId === id) setSelectedDocId(null);
        loadInitialData(currentUser);
      } else {
        const err = await res.json().catch(() => ({}));
        window.alert(err.message || "წაშლა ვერ მოხერხდა");
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

  // საქაღალდის ფილტრის ერთიანი ლოგიკა — გამოიყენება როგორც დათვლისთვის,
  // ისე სიის გასაფილტრად, რომ რაოდენობა ყოველთვის ემთხვეოდეს ნაჩვენებ დოკუმენტებს.
  const isArchivedDoc = (d: Document) =>
    d.archiveStatus === "ARCHIVED" ||
    ((d.status === DocumentStatus.SIGNED || d.status === DocumentStatus.COMPLETED) &&
      !!d.signedAt && Date.now() - new Date(d.signedAt).getTime() > 30 * 24 * 60 * 60 * 1000);

  const matchesFolder = (d: Document, filter: string): boolean => {
    if (isArchivedDoc(d) && filter !== "ARCHIVE_FOLDER") return false; // არქივი ცალკე საქაღალდეშია
    switch (filter) {
      case "ALL": return true;
      case "VISA_FOLDER": return d.status === DocumentStatus.ON_VISA || d.status === DocumentStatus.SENT_TO_VISA;
      case "COMPLETED_FOLDER": return d.status === DocumentStatus.SIGNED || d.status === DocumentStatus.COMPLETED;
      case "ARCHIVE_FOLDER": return isArchivedDoc(d);
      case DocumentStatus.SENT_TO_SIGN: return d.status === DocumentStatus.SENT_TO_SIGN;
      default: return d.status === filter;
    }
  };

  // Counters for left side folder hierarchy
  const folderCount = (filter: string) => documents.filter(d => matchesFolder(d, filter)).length;
  const draftCount = folderCount(DocumentStatus.DRAFT);
  const onVisaCount = folderCount("VISA_FOLDER");
  const signingCount = folderCount(DocumentStatus.SENT_TO_SIGN);
  const unreadCount = folderCount(DocumentStatus.RECEIVED);
  const readCount = folderCount(DocumentStatus.READ);
  const completedCount = folderCount("COMPLETED_FOLDER");
  const archivedCount = folderCount("ARCHIVE_FOLDER");

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

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl w-full max-w-md">
            <div className="space-y-6">
              <h3 className="text-base font-bold text-slate-800 font-display">სისტემაში შესვლა</h3>
              <form onSubmit={handleStandardLogin} className="space-y-4">
                {loginError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-sans">
                    {loginError}
                  </div>
                )}
                <div>
                  <label className="text-xxs font-semibold text-slate-500 block mb-1 font-sans">მომხმარებელი</label>
                  <input
                    type="text"
                    autoComplete="username"
                    placeholder="მომხმარებლის სახელი, მაგ: admin"
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
                    required
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
              onClick={openNewDocument}
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
	              {[
	                { label: "წაუკითხავი", filter: DocumentStatus.RECEIVED, count: unreadCount, tone: "bg-sky-900/40 text-sky-300" },
	                { label: "წაკითხული", filter: DocumentStatus.READ, count: readCount, tone: "bg-slate-800 text-slate-300" },
	                { label: "ხელმოსაწერი", filter: DocumentStatus.SENT_TO_SIGN, count: signingCount, tone: "bg-indigo-950/40 text-indigo-300" },
	                { label: "დასრულებული", filter: "COMPLETED_FOLDER", count: completedCount, tone: "bg-emerald-950/40 text-emerald-400" },
	                { label: "არქივი", filter: "ARCHIVE_FOLDER", count: archivedCount, tone: "bg-violet-950/40 text-violet-300" }
	              ].map(item => (
	                <button
	                  key={item.filter}
	                  onClick={() => {
	                    setListStatusFilter(item.filter);
	                    setListCategoryFilter("ALL");
	                    setActiveTab("list");
	                    setSelectedDocId(null);
	                  }}
	                  className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-left transition font-sans ${
	                    listStatusFilter === item.filter ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/30 hover:text-white"
	                  }`}
	                >
	                  <span>{item.label}</span>
	                  {item.count > 0 && <span className={`${item.tone} font-mono text-[9px] px-1.5 py-0.5 rounded-md font-bold`}>{item.count}</span>}
	                </button>
	              ))}

	              <button
	                onClick={() => {
	                setListStatusFilter(DocumentStatus.DRAFT);
	                setListCategoryFilter("ALL");
	                setActiveTab("list");
	                setSelectedDocId(null);
	              }}
                className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800/30 hover:text-white text-left transition font-sans"
              >
	                <span>დრაფტი</span>
                {draftCount > 0 && <span className="bg-slate-800 text-slate-300 font-mono text-[9px] px-1.5 py-0.5 rounded-md font-bold">{draftCount}</span>}
              </button>

	              <button
                onClick={() => {
	                  setListStatusFilter("VISA_FOLDER");
	                  setListCategoryFilter("ALL");
	                  setActiveTab("list");
	                  setSelectedDocId(null);
	                }}
                className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800/30 hover:text-white text-left transition font-sans"
              >
                <span>ვიზირებაზე</span>
                {onVisaCount > 0 && <span className="bg-amber-900/40 text-amber-400 font-mono text-[9px] px-1.5 py-0.5 rounded-md font-bold">{onVisaCount}</span>}
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
              documentTypes={documentTypes}
              onBack={() => setSelectedDocId(null)}
              onRefresh={() => loadInitialData(currentUser)}
            />
          ) : (
            <>
              {/* Tab: Dashboard */}
              {activeTab === "dashboard" && (
                <Dashboard
                  documents={documents}
                  onOpenNewDocument={openNewDocument}
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
	                      ? documents.filter(d => matchesFolder(d, listStatusFilter))
                      : listCategoryFilter !== "ALL"
                      ? documents.filter(d => d.category === listCategoryFilter && !isArchivedDoc(d))
                      : documents.filter(d => !isArchivedDoc(d))
                  }
                  users={users}
	                  departments={departments}
	                  documentTypes={documentTypes}
                  isAdmin={currentUser.role === UserRole.ADMIN}
                  onOpenDocument={(id) => setSelectedDocId(id)}
                  onEditDocument={(id) => {
                    setSelectedDocId(id);
                  }}
                  onDeleteDraft={handleDeleteDraft}
                  onDeleteDocument={handleDeleteDocument}
                  onRefresh={() => loadInitialData(currentUser)}
                />
              )}

              {/* Tab: Admin Panel */}
              {activeTab === "admin" && currentUser.role === UserRole.ADMIN && (
                <AdminPanel currentUser={currentUser} />
              )}
            </>
          )}
        </div>
      </div>

      {/* New Document Wizard Modal */}
      {showNewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">ახალი დოკუმენტი</h3>
                <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                  {newDocStep === 1 ? "ნაბიჯი 1 — აირჩიეთ დოკუმენტის ტიპი" : "ნაბიჯი 2 — ჩაწერეთ დოკუმენტის საგანი"}
                </p>
              </div>
              <button
                onClick={() => { setShowNewDoc(false); setNewDocStep(1); }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {newDocStep === 1 ? (
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5 font-sans">კატეგორია</label>
                  <select
                    value={newDoc.category}
                    onChange={e => setNewDoc({ ...newDoc, category: e.target.value as DocumentCategory })}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm font-sans bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                  >
                    {Object.values(DocumentCategory).map(cat => (
                      <option key={cat} value={cat}>{GEORGIAN_CATEGORIES[cat]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-2 font-sans">დოკუმენტის ტიპი <span className="text-rose-500">*</span></label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                    {(documentTypes.length ? documentTypes : Object.entries(GEORGIAN_DOCUMENT_TYPES).map(([id, label]) => ({ id, label }))).map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setNewDoc({ ...newDoc, documentType: type.id })}
                        className={`text-left px-3 py-2.5 rounded-xl border text-xs font-sans font-semibold transition ${
                          newDoc.documentType === type.id
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowNewDoc(false); setNewDocStep(1); }}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold font-sans hover:bg-slate-50"
                  >
                    გაუქმება
                  </button>
                  <button
                    type="button"
                    disabled={!newDoc.documentType}
                    onClick={() => setNewDocStep(2)}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold font-sans hover:bg-slate-800 disabled:opacity-40"
                  >
                    შემდეგი →
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateDocument} className="p-6 space-y-4">
                <div className="text-[11px] font-sans text-slate-500">
                  არჩეული ტიპი:{" "}
                  <span className="font-bold text-slate-800">
                    {(documentTypes.find(t => t.id === newDoc.documentType)?.label) || GEORGIAN_DOCUMENT_TYPES[newDoc.documentType as DocumentType] || newDoc.documentType}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5 font-sans">დოკუმენტის საგანი (Subject) <span className="text-rose-500">*</span></label>
                  <input
                    autoFocus
                    value={newDoc.subject}
                    onChange={e => setNewDoc({ ...newDoc, subject: e.target.value })}
                    required
                    placeholder="ჩაწერეთ დოკუმენტის საგანი..."
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm font-sans focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5 font-sans">პრიორიტეტი</label>
                  <select
                    value={newDoc.priority}
                    onChange={e => setNewDoc({ ...newDoc, priority: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm font-sans bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="LOW">დაბალი</option>
                    <option value="NORMAL">ჩვეულებრივი</option>
                    <option value="HIGH">მაღალი</option>
                    <option value="URGENT">სასწრაფო</option>
                  </select>
                </div>

                <div className="flex justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewDocStep(1)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold font-sans hover:bg-slate-50"
                  >
                    ← უკან
                  </button>
                  <button
                    type="submit"
                    disabled={creatingDoc || !newDoc.subject.trim()}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold font-sans hover:bg-slate-800 disabled:opacity-40"
                  >
                    {creatingDoc ? "იქმნება..." : "დოკუმენტის შექმნა"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
