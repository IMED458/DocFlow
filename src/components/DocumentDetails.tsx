import React, { useState, useEffect } from "react";
import {
  FileText,
  FileCode,
  Download,
  Trash2,
  Users,
  Link,
  Clock,
  Printer,
  Plus,
  Send,
  UserCheck,
  Check,
  X,
  PlusCircle,
  AlertCircle,
  Hash,
  HelpCircle,
  Building,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Settings
} from "lucide-react";
import {
  Document,
  DocumentStatus,
  DocumentCategory,
  DocumentType,
  GEORGIAN_DOCUMENT_STATUSES,
  GEORGIAN_DOCUMENT_TYPES,
  GEORGIAN_CATEGORIES,
  GEORGIAN_ROLES,
  VisaActionStatus,
  TaskStatus,
  User,
  UserRole
} from "../types.js";
import DocumentEditor from "./DocumentEditor.js";

interface DocumentDetailsProps {
  documentId: string;
  currentUser: User;
  onBack: () => void;
  onRefresh: () => void;
}

export default function DocumentDetails({
  documentId,
  currentUser,
  onBack,
  onRefresh
}: DocumentDetailsProps) {
  const [viewMode, setViewMode] = useState<"edit" | "print">("edit");
  const [doc, setDoc] = useState<Document | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [basisLinks, setBasisLinks] = useState<any[]>([]);
  const [visaHistory, setVisaHistory] = useState<any[]>([]);
  const [resolutions, setResolutions] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stamps, setStamps] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  // Right sidebar collapsible sections toggles
  const [openSections, setOpenSections] = useState({
    meta: false,
    authors: false,
    signers: false,
    visa: false,
    files: false,
    basis: false,
    recipients: false,
    tasks: false
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => {
      const isOpening = !prev[section];
      if (isOpening) {
        return {
          meta: false,
          authors: false,
          signers: false,
          visa: false,
          files: false,
          basis: false,
          recipients: false,
          tasks: false,
          [section]: true
        };
      } else {
        return {
          meta: false,
          authors: false,
          signers: false,
          visa: false,
          files: false,
          basis: false,
          recipients: false,
          tasks: false
        };
      }
    });
  };

  // Form Inputs
  const [newComment, setNewComment] = useState("");
  const [selectedVisaUsers, setSelectedVisaUsers] = useState<string[]>([]);
  const [selectedSigner, setSelectedSigner] = useState("");
  const [resolutionText, setResolutionText] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");

  // Recipients input
  const [selectedRecipientId, setSelectedRecipientId] = useState("");

  // Basis search
  const [basisQuery, setBasisQuery] = useState("");
  const [basisSearchResults, setBasisSearchResults] = useState<any[]>([]);

  // Fetch all related entities from APIs
  const loadDetails = async () => {
    try {
      const headers = { "Authorization": `Bearer jwt-mock-token-${currentUser.id}` };
      const [
        resDoc,
        resFiles,
        resRecs,
        resBasis,
        resVisa,
        resRes,
        resUsers,
        resStamps,
        resTpls,
        resVer,
        resTasks
      ] = await Promise.all([
        fetch(`/api/documents/${documentId}`, { headers }).then(r => r.json()),
        fetch(`/api/documents/${documentId}/files`, { headers }).then(r => r.json()),
        fetch(`/api/documents/${documentId}/recipients`, { headers }).then(r => r.json()),
        fetch(`/api/documents/${documentId}/basis-links`, { headers }).then(r => r.json()),
        fetch(`/api/documents/${documentId}/visa-history`, { headers }).then(r => r.json()),
        fetch(`/api/documents/${documentId}/resolutions`, { headers }).then(r => r.json()),
        fetch("/api/users", { headers }).then(r => r.json()),
        fetch("/api/admin/stamps", { headers }).then(r => r.json()),
        fetch("/api/admin/header-footer-templates", { headers }).then(r => r.json()),
        fetch(`/api/documents/${documentId}/versions`, { headers }).then(r => r.json()),
        fetch("/api/tasks", { headers }).then(r => r.json())
      ]);

      setDoc(resDoc);
      setFiles(resFiles);
      setRecipients(resRecs);
      setBasisLinks(resBasis);
      setVisaHistory(resVisa);
      setResolutions(resRes);
      setUsers(resUsers);
      setStamps(resStamps);
      setTemplates(resTpls);
      setVersions(resVer);
      setTasks(resTasks.filter((t: any) => t.documentId === documentId));
    } catch (e) {
      console.error("Failed to load details", e);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [documentId]);

  if (!doc) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500 font-sans">
        <Clock className="w-6 h-6 animate-spin mr-2" />
        იტვირთება დეტალები...
      </div>
    );
  }

  // Registration Handler
  const handleRegister = async () => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (res.ok) {
        loadDetails();
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Archive Handler
  const handleArchive = async (archive: boolean) => {
    try {
      const endpoint = archive ? "archive" : "restore";
      const res = await fetch(`/api/documents/${doc.id}/${endpoint}`, {
        method: "POST",
        headers: { "Authorization": `Bearer jwt-mock-token-${currentUser.id}` }
      });
      if (res.ok) {
        loadDetails();
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Cancel Handler
  const handleCancel = async () => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/cancel`, {
        method: "POST",
        headers: { "Authorization": `Bearer jwt-mock-token-${currentUser.id}` }
      });
      if (res.ok) {
        loadDetails();
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update Metadata & Properties
  const handleSaveMetadata = async (fields: Partial<Document>) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({ ...fields, updatedBy: currentUser.id })
      });
      if (res.ok) {
        loadDetails();
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Body update handler
  const handleSaveBody = async (bodyContent: string) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/body`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({ body: bodyContent, userId: currentUser.id })
      });
      if (res.ok) {
        loadDetails();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // File Upload Handler (base64)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const payload = {
          filename: file.name,
          size: file.size,
          mimeType: file.type,
          content: reader.result,
          uploadedBy: currentUser.id
        };

        const res = await fetch(`/api/documents/${doc.id}/files`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          loadDetails();
        }
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileDownload = (fileId: string, filename: string) => {
    fetch(`/api/documents/${doc.id}/files/${fileId}`, {
      headers: { "Authorization": `Bearer jwt-mock-token-${currentUser.id}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.content) {
          const a = window.document.createElement("a");
          a.href = data.content;
          a.download = filename;
          a.click();
        }
      })
      .catch(err => console.error(err));
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/files/${fileId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer jwt-mock-token-${currentUser.id}` }
      });
      if (res.ok) {
        loadDetails();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add Recipient
  const handleAddRecipient = async () => {
    if (!selectedRecipientId) return;
    try {
      const u = users.find(x => x.id === selectedRecipientId);
      const res = await fetch(`/api/documents/${doc.id}/recipients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({
          recipientType: "INTERNAL_USER",
          recipientUserId: u?.id,
          recipientName: u ? `${u.firstName} ${u.lastName}` : "სხვა თანამშრომელი",
          deliveryMethod: "SYSTEM"
        })
      });
      if (res.ok) {
        setSelectedRecipientId("");
        loadDetails();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Recipient
  const handleDeleteRecipient = async (recId: string) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/recipients/${recId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer jwt-mock-token-${currentUser.id}` }
      });
      if (res.ok) {
        loadDetails();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Basis Search & Link
  const handleBasisSearch = async (q: string) => {
    setBasisQuery(q);
    if (q.length < 2) {
      setBasisSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/documents?q=${encodeURIComponent(q)}`, {
        headers: { "Authorization": `Bearer jwt-mock-token-${currentUser.id}` }
      });
      if (res.ok) {
        const list = await res.json();
        setBasisSearchResults(list.filter((x: any) => x.id !== doc.id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddBasis = async (targetId: string) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/basis-links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({
          basisDocumentId: targetId,
          relationshipType: "LINK"
        })
      });
      if (res.ok) {
        setBasisQuery("");
        setBasisSearchResults([]);
        loadDetails();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Send to Visa Approvers
  const handleSendToVisa = async () => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/send-to-visa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({ visaUserIds: selectedVisaUsers })
      });
      if (res.ok) {
        setSelectedVisaUsers([]);
        loadDetails();
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Approve / Return / Reject Visa
  const handleVisaAction = async (action: "approve" | "return" | "reject") => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/visa-action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({ userId: currentUser.id, action, comment: newComment })
      });
      if (res.ok) {
        setNewComment("");
        loadDetails();
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Request final signer signature
  const handleRequestSignature = async () => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/request-signature`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({ signerId: selectedSigner })
      });
      if (res.ok) {
        setSelectedSigner("");
        loadDetails();
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Perform Final Electronic Sign
  const handleSign = async () => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({ userId: currentUser.id, comment: "ხელმოწერილია ელექტრონულად" })
      });
      if (res.ok) {
        loadDetails();
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Resolutions & Tasks creator
  const handleCreateResolution = async () => {
    if (!resolutionText) return;
    try {
      const res = await fetch(`/api/documents/${doc.id}/resolutions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({ text: resolutionText, creatorId: currentUser.id })
      });
      if (res.ok) {
        setResolutionText("");
        loadDetails();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTask = async (resId: string) => {
    if (!taskAssignee || !taskDesc) return;
    try {
      const res = await fetch(`/api/resolutions/${resId}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({
          assigneeId: taskAssignee,
          deadline: taskDeadline,
          description: taskDesc,
          createdBy: currentUser.id,
          documentId: doc.id
        })
      });
      if (res.ok) {
        setTaskAssignee("");
        setTaskDesc("");
        setTaskDeadline("");
        loadDetails();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({ completionText: "დავალება შესრულებულია წარმატებით." })
      });
      if (res.ok) {
        loadDetails();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getUserName = (id: string) => {
    const u = users.find(x => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : "უცნობი";
  };

  const getUserPositionAndDept = (id: string) => {
    const u = users.find(x => x.id === id);
    if (!u) return "";
    return u.positionName || `${u.role === UserRole.ADMIN ? "ადმინისტრატორი" : GEORGIAN_ROLES[u.role]}`;
  };

  const canUserApproveVisa = () => {
    const activeAct = visaHistory.find(
      (h: any) => h.userId === currentUser.id && h.status === VisaActionStatus.PENDING && h.role === "VISA"
    );
    return !!activeAct;
  };

  const canUserSign = () => {
    const activeSignAct = visaHistory.find(
      (h: any) => h.userId === currentUser.id && h.status === VisaActionStatus.PENDING && h.role === "SIGN"
    );
    return !!activeSignAct;
  };

  // Helper templates
  const defaultTemplate = templates.find(t => t.isDefault) || templates[0];
  const defaultStamp = stamps[0];

  return (
    <div className="space-y-6">
      {/* Header with quick workflow progression bar */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button onClick={onBack} className="text-slate-500 hover:text-slate-800 text-xs font-sans font-semibold flex items-center gap-1.5 mb-2 transition">
            ← უკან დოკუმენტებში
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold font-display text-slate-800">
              {doc.documentNumber || "პროექტი (Draft)"}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xxs font-sans font-medium border bg-indigo-50 border-indigo-200 text-indigo-700">
              {GEORGIAN_CATEGORIES[doc.category]}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Register Draft */}
          {doc.status === DocumentStatus.DRAFT && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.CHANCELLERY) && (
            <button
              onClick={handleRegister}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-sans font-semibold transition shadow-xs"
            >
              <Send className="w-4 h-4" />
              რეგისტრაცია
            </button>
          )}

          {/* 2. Deactivate / Cancel */}
          {doc.status !== DocumentStatus.CANCELLED && doc.status !== DocumentStatus.SIGNED && (
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 px-4 py-2 rounded-xl text-xs font-sans font-semibold transition"
            >
              <X className="w-4 h-4" />
              დოკუმენტის გაუქმება
            </button>
          )}

          {/* 3. Archive / Restore */}
          {doc.status === DocumentStatus.SIGNED && (
            <button
              onClick={() => handleArchive(doc.status !== DocumentStatus.ARCHIVED)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-sans font-semibold transition"
            >
              <Check className="w-4 h-4" />
              {doc.status === DocumentStatus.ARCHIVED ? "აღდგენა არქივიდან" : "არქივში გადატანა"}
            </button>
          )}
        </div>
      </div>

      {/* Main split grid: 3 Cols Left for document text / print, 1 Col Right for collapsible panels */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT PANEL: Always displays document subject, and rich text editor/printable sheet */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-6">
            
            {/* Split controls: Normal Edit vs Official Print */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode("edit")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-sans font-semibold transition ${
                    viewMode === "edit" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  ტექსტი და რედაქტირება
                </button>
                <button
                  onClick={() => setViewMode("print")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-sans font-semibold transition ${
                    viewMode === "print" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  ბეჭდვის რეჟიმი (A4)
                </button>
              </div>

              {/* Status display banner */}
              <span className="text-xxs font-bold uppercase tracking-wider font-sans px-3 py-1 rounded-full bg-slate-50 border text-slate-500">
                სტატუსი: {GEORGIAN_DOCUMENT_STATUSES[doc.status]}
              </span>
            </div>

            {viewMode === "edit" ? (
              <div className="space-y-6">
                {/* Subject Block - Always visible at top */}
                <div>
                  <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-1 font-sans">
                    დოკუმენტის საგანი (Subject)
                  </label>
                  {doc.status === DocumentStatus.DRAFT ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={doc.subject}
                        onChange={e => setDoc({ ...doc, subject: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl p-3 text-sm font-sans focus:outline-hidden"
                        placeholder="ჩაწერეთ საგანი..."
                      />
                      <button
                        onClick={() => handleSaveMetadata({ subject: doc.subject })}
                        className="bg-slate-950 text-white hover:bg-slate-800 text-xs font-semibold font-sans px-4 rounded-xl transition"
                      >
                        შენახვა
                      </button>
                    </div>
                  ) : (
                    <h1 className="text-base font-bold text-slate-800 font-sans">{doc.subject}</h1>
                  )}
                </div>

                {/* Always visible Document Text Rich Editor */}
                <div>
                  <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-2 font-sans">
                    დოკუმენტის ტექსტი (Body)
                  </label>
                  <DocumentEditor
                    document={doc}
                    onSaveBody={handleSaveBody}
                    versions={versions}
                    isReadOnly={doc.status === DocumentStatus.SIGNED || doc.status === DocumentStatus.CANCELLED}
                    onRollback={async (ver) => {
                      await handleSaveBody(ver.body);
                    }}
                  />
                </div>
              </div>
            ) : (
              /* A4 Printable Sheet Display */
              <div className="bg-slate-500 p-4 sm:p-8 rounded-2xl flex flex-col items-center overflow-x-auto">
                <div id="printable-doc" className="bg-white w-[210mm] min-h-[297mm] p-12 shadow-2xl relative text-slate-800 font-sans flex flex-col justify-between">
                  <div>
                    {/* Banner Header Template */}
                    <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between gap-4">
                      {defaultTemplate?.headerImage ? (
                        <img src={defaultTemplate.headerImage} className="w-full h-16 object-contain" alt="Header" />
                      ) : (
                        <>
                          <div>
                            <h4 className="text-sm font-bold font-display uppercase tracking-wider text-slate-900">
                              {defaultTemplate?.headerTextGeo || "საქართველოს განათლებისა და მეცნიერების სამინისტრო"}
                            </h4>
                            <p className="text-xxs text-slate-500 font-sans mt-1">
                              {defaultTemplate?.headerTextEng || "Ministry of Education and Science of Georgia"}
                            </p>
                          </div>
                          {/* Coat of arms mockup */}
                          <div className="w-12 h-12 border-2 border-slate-900 rounded-full flex items-center justify-center text-center text-xxs font-bold p-1 shrink-0">
                            ღერბი
                          </div>
                        </>
                      )}
                    </div>

                    {/* Header metadata row */}
                    <div className="flex items-center justify-between text-[10px] font-sans text-slate-500 py-3 border-b border-slate-100">
                      <div>
                        <span>{defaultTemplate?.address || "დიმიტრი უზნაძის ქ. 52, თბილისი, საქართველო"}</span>
                        <br />
                        <span>ტელ: {defaultTemplate?.phone || "+995 32 2 200 220"} | {defaultTemplate?.email || "info@mes.gov.ge"}</span>
                      </div>
                      <div className="text-right">
                        <span>საიდენტიფიკაციო კოდი: {defaultTemplate?.identificationCode || "203851536"}</span>
                        <br />
                        <span>ვებ-გვერდი: {defaultTemplate?.website || "www.mes.gov.ge"}</span>
                      </div>
                    </div>

                    {/* Registered number/date and QR barcode */}
                    <div className="flex items-start justify-between py-6">
                      <div className="space-y-1">
                        <span className="text-xs font-sans block font-semibold text-slate-700">
                          თარიღი: <span className="font-mono text-xs">{doc.registrationDate || new Date().toISOString().split("T")[0]}</span>
                        </span>
                        <span className="text-xs font-sans block font-semibold text-slate-700">
                          დოკუმენტის ნომერი: <span className="font-mono text-xs">{doc.documentNumber || "პროექტი"}</span>
                        </span>
                        <span className="text-xs font-sans block font-semibold text-slate-700">
                          რეგისტრაციის ნომერი: <span className="font-mono text-xs">{doc.registrationNumber || "გაფორმების გარეშე"}</span>
                        </span>
                      </div>

                      {/* QR Code Barcode Placeholder */}
                      <div className="border border-slate-300 p-1.5 rounded bg-slate-50 flex flex-col items-center justify-center shrink-0">
                        <div className="w-14 h-14 bg-slate-800 flex items-center justify-center text-white font-mono text-[5px] text-center p-1">
                          QR კოდი
                        </div>
                        <span className="text-[6px] font-mono mt-1 text-slate-500">DOC-{doc.id.toUpperCase()}</span>
                      </div>
                    </div>

                    {/* Document Title & Content */}
                    <div className="space-y-6 mt-4">
                      <h2 className="text-center text-base font-bold font-display uppercase tracking-wider text-slate-900 border-y border-slate-200 py-2">
                        {GEORGIAN_DOCUMENT_TYPES[doc.documentType]}
                      </h2>

                      {/* Subject */}
                      <p className="text-xs font-sans font-bold text-slate-800">
                        საგანი: {doc.subject}
                      </p>

                      {/* Body Rich Text HTML renderer */}
                      <div
                        className="prose max-w-none text-slate-800 font-sans text-xs leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: doc.body || "<p class='text-slate-400 italic'>ტექსტი არ არის შევსებული</p>" }}
                      ></div>
                    </div>
                  </div>

                  {/* Print bottom footer with sign and stamp */}
                  <div className="mt-12 pt-6 border-t border-slate-200">
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-[10px] font-sans text-slate-400 block">ხელმომწერი თანამდებობა:</span>
                        <span className="font-sans font-bold text-xs text-slate-800 block">
                          {getUserPositionAndDept(doc.authorId) || "ხელმძღვანელი"}
                        </span>
                        <span className="font-sans font-bold text-xs text-slate-700 block mt-1">
                          {getUserName(doc.authorId)}
                        </span>
                      </div>

                      {/* Transparent Signature and Organization Stamp images placement */}
                      <div className="relative w-44 h-24 flex items-center justify-center">
                        {/* Stamp image */}
                        {doc.status === DocumentStatus.SIGNED && defaultStamp && (
                          <img
                            src={defaultStamp.imageUrl}
                            alt="სამინისტროს ბეჭედი"
                            className="absolute w-24 h-24 opacity-65 pointer-events-none select-none"
                          />
                        )}

                        {/* Signature Image */}
                        {doc.status === DocumentStatus.SIGNED && users.find(u => u.id === doc.authorId)?.signatureImage && (
                          <img
                            src={users.find(u => u.id === doc.authorId)?.signatureImage}
                            alt="ავტორის ხელმოწერა"
                            className="absolute w-28 h-20 rotate-[-5deg] z-10 pointer-events-none select-none"
                          />
                        )}

                        {doc.status !== DocumentStatus.SIGNED && (
                          <span className="text-xxs font-sans text-slate-400 border border-dashed border-slate-300 px-3 py-1 rounded">
                            ხელმოწერის ადგილი
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Letterhead Footer Banner */}
                    {defaultTemplate?.footerImage && (
                      <div className="mt-6 border-t border-slate-100 pt-2">
                        <img src={defaultTemplate.footerImage} className="w-full h-8 object-contain" alt="Footer Banner" />
                      </div>
                    )}

                    {/* Watermarks if draft/cancelled */}
                    {doc.status === DocumentStatus.DRAFT && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-30deg] text-slate-200 text-6xl font-black font-display tracking-widest opacity-35 uppercase select-none pointer-events-none">
                        პროექტი
                      </div>
                    )}
                    {doc.status === DocumentStatus.CANCELLED && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-30deg] text-rose-200 text-6xl font-black font-display tracking-widest opacity-35 uppercase select-none pointer-events-none">
                        გაუქმებულია
                      </div>
                    )}

                    {/* Pagination count */}
                    <div className="text-center text-[9px] text-slate-400 font-sans mt-4">
                      ფურცლების რაოდენობა: {doc.pageCount} | დანართების რაოდენობა: {files.length}
                    </div>
                  </div>
                </div>

                {/* Print button */}
                <div className="flex items-center gap-2 mt-4 self-center">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-sans font-semibold transition shadow"
                  >
                    <Printer className="w-4 h-4" />
                    ბეჭდვა / PDF გენერაცია
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Vertical stack of beautiful collapsible widgets */}
        <div className="space-y-4">
          
          {/* Section 1: დოკუმენტის მონაცემები */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <button
              onClick={() => toggleSection("meta")}
              className="w-full px-4 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 font-sans"
            >
              <span className="flex items-center gap-1.5"><Hash className="w-4 h-4 text-indigo-500" /> დოკუმენტის მონაცემები</span>
              {openSections.meta ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openSections.meta && (
              <div className="p-4 space-y-3.5">
                {doc.status === DocumentStatus.DRAFT ? (
                  <div className="space-y-3 text-xs font-sans">
                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">კატეგორია:</label>
                      <select
                        value={doc.category}
                        onChange={e => handleSaveMetadata({ category: e.target.value as DocumentCategory })}
                        className="w-full border border-slate-200 rounded-lg p-2 bg-white"
                      >
                        {Object.entries(GEORGIAN_CATEGORIES).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">ტიპი:</label>
                      <select
                        value={doc.documentType}
                        onChange={e => handleSaveMetadata({ documentType: e.target.value as DocumentType })}
                        className="w-full border border-slate-200 rounded-lg p-2 bg-white"
                      >
                        {Object.entries(GEORGIAN_DOCUMENT_TYPES).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">პრიორიტეტი:</label>
                      <select
                        value={doc.priority}
                        onChange={e => handleSaveMetadata({ priority: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2 bg-white"
                      >
                        <option value="NORMAL">სტანდარტული</option>
                        <option value="URGENT">სასწრაფო</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">საიდუმლოება:</label>
                      <select
                        value={doc.confidentiality}
                        onChange={e => handleSaveMetadata({ confidentiality: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2 bg-white"
                      >
                        <option value="PUBLIC">საჯარო</option>
                        <option value="CONFIDENTIAL">საიდუმლო</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs font-sans text-slate-700">
                    <div>
                      <span className="text-slate-400 block font-semibold">ნომერი:</span>
                      <span className="font-mono font-bold text-slate-800">{doc.documentNumber || "პროექტი"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">რეგისტრაცია:</span>
                      <span className="font-semibold text-slate-800">{doc.registrationNumber || "არააქტიური"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">თარიღი:</span>
                      <span className="font-semibold text-slate-800">{doc.registrationDate || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">კატეგორია:</span>
                      <span className="font-semibold text-slate-800">{GEORGIAN_CATEGORIES[doc.category]}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">ტიპი:</span>
                      <span className="font-semibold text-slate-800">{GEORGIAN_DOCUMENT_TYPES[doc.documentType]}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">კონფიდენციალურობა:</span>
                      <span className="font-semibold text-slate-800">{doc.confidentiality === "CONFIDENTIAL" ? "საიდუმლო" : "საჯარო"}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: ავტორები (Authors) - ANY Employee is assignable */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <button
              onClick={() => toggleSection("authors")}
              className="w-full px-4 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 font-sans"
            >
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-indigo-500" /> დოკუმენტის ავტორი</span>
              {openSections.authors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openSections.authors && (
              <div className="p-4 space-y-3.5">
                {doc.status === DocumentStatus.DRAFT ? (
                  <div className="space-y-1.5">
                    <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block font-sans">
                      აირჩიეთ ნებისმიერი ავტორი:
                    </label>
                    <select
                      value={doc.authorId}
                      onChange={e => handleSaveMetadata({ authorId: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 bg-white text-xs font-sans focus:outline-hidden"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({u.positionName || GEORGIAN_ROLES[u.role]})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1 text-xs font-sans">
                    <span className="font-bold text-slate-800 block">{getUserName(doc.authorId)}</span>
                    <span className="text-slate-400 block text-xxs font-semibold">{getUserPositionAndDept(doc.authorId)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: ხელმომწერები (Signers) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <button
              onClick={() => toggleSection("signers")}
              className="w-full px-4 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 font-sans"
            >
              <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-indigo-500" /> ხელმომწერი პირები</span>
              {openSections.signers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openSections.signers && (
              <div className="p-4 space-y-4">
                {/* Active sign control if user is requested signer */}
                {canUserSign() && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <span className="text-xxs font-bold text-amber-800 uppercase block font-sans">დასადასტურებელია:</span>
                    <button
                      onClick={handleSign}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white py-1.5 rounded-lg text-xs font-sans font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" /> ხელის მოწერა
                    </button>
                  </div>
                )}

                {/* Send to sign panel */}
                {doc.status === DocumentStatus.VISA_APPROVED && (
                  <div className="space-y-2.5">
                    <label className="text-xxs font-bold text-slate-400 block font-sans">გაგზავნეთ ნებისმიერ პირთან:</label>
                    <select
                      value={selectedSigner}
                      onChange={e => setSelectedSigner(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
                    >
                      <option value="">აირჩიეთ ხელმომწერი...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.positionName || GEORGIAN_ROLES[u.role]})</option>
                      ))}
                    </select>
                    <button
                      onClick={handleRequestSignature}
                      disabled={!selectedSigner}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-sans font-semibold py-2 rounded-lg transition disabled:opacity-40"
                    >
                      ხელმოსაწერად გაგზავნა
                    </button>
                  </div>
                )}

                {/* Sign list / status */}
                <div>
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-2 font-sans">ხელმოწერის სტატუსი:</span>
                  {visaHistory.filter(h => h.role === "SIGN").length === 0 ? (
                    <p className="text-xxs text-slate-400 font-sans italic">ჯერ არ გაგზავნილა ხელმოსაწერად</p>
                  ) : (
                    <div className="space-y-1.5">
                      {visaHistory.filter(h => h.role === "SIGN").map(h => (
                        <div key={h.id} className="text-xxs font-sans text-slate-700 flex items-center justify-between border-b pb-1">
                          <span>{getUserName(h.userId)}</span>
                          <span className={`font-semibold ${h.status === VisaActionStatus.APPROVED ? "text-emerald-600" : "text-amber-500"}`}>
                            {h.status === VisaActionStatus.APPROVED ? "ხელმოწერილია" : "მოლოდინში"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: ვიზირებები (Visas) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <button
              onClick={() => toggleSection("visa")}
              className="w-full px-4 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 font-sans"
            >
              <span className="flex items-center gap-1.5"><UserCheck className="w-4 h-4 text-indigo-500" /> ვიზირების პროცესი</span>
              {openSections.visa ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openSections.visa && (
              <div className="p-4 space-y-4">
                {/* Active visa control if user is reviewer */}
                {canUserApproveVisa() && (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-3">
                    <span className="text-xxs font-bold text-indigo-800 uppercase block font-sans">თქვენი ვიზირება:</span>
                    <input
                      type="text"
                      placeholder="კომენტარი..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleVisaAction("approve")}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded-lg text-xxs font-sans font-bold transition"
                      >
                        დასტური
                      </button>
                      <button
                        onClick={() => handleVisaAction("reject")}
                        className="bg-rose-600 hover:bg-rose-500 text-white py-1.5 rounded-lg text-xxs font-sans font-bold transition"
                      >
                        უარყოფა
                      </button>
                    </div>
                  </div>
                )}

                {/* Send to visa checklist */}
                {doc.status === DocumentStatus.REGISTERED && (
                  <div className="space-y-2.5">
                    <label className="text-xxs font-bold text-slate-400 block font-sans">აირჩიეთ ნებისმიერი თანამშრომელი:</label>
                    <div className="border border-slate-200 rounded-lg p-2 h-28 overflow-y-auto space-y-1 bg-white">
                      {users.map(u => (
                        <label key={u.id} className="flex items-center gap-2 text-xxs font-sans cursor-pointer text-slate-700 hover:text-slate-900">
                          <input
                            type="checkbox"
                            checked={selectedVisaUsers.includes(u.id)}
                            onChange={e => {
                              if (e.target.checked) setSelectedVisaUsers([...selectedVisaUsers, u.id]);
                              else setSelectedVisaUsers(selectedVisaUsers.filter(x => x !== u.id));
                            }}
                            className="rounded"
                          />
                          {u.firstName} {u.lastName}
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={handleSendToVisa}
                      disabled={selectedVisaUsers.length === 0}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-sans font-semibold py-2 rounded-lg transition disabled:opacity-40"
                    >
                      ვიზირებაზე გაგზავნა
                    </button>
                  </div>
                )}

                {/* Visa History list */}
                <div>
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-2 font-sans">ვიზების ისტორია:</span>
                  {visaHistory.filter(h => h.role === "VISA").length === 0 ? (
                    <p className="text-xxs text-slate-400 font-sans italic">ვიზირება არ დაწყებულა</p>
                  ) : (
                    <div className="space-y-1.5">
                      {visaHistory.filter(h => h.role === "VISA").map(h => (
                        <div key={h.id} className="text-xxs font-sans text-slate-700 border-b pb-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{getUserName(h.userId)}</span>
                            <span className={`font-semibold ${
                              h.status === VisaActionStatus.APPROVED ? "text-emerald-600" : h.status === VisaActionStatus.PENDING ? "text-amber-500" : "text-rose-600"
                            }`}>
                              {h.status === VisaActionStatus.APPROVED ? "კი" : h.status === VisaActionStatus.PENDING ? "მოლოდინში" : "არა"}
                            </span>
                          </div>
                          {h.comment && <p className="text-slate-400 italic mt-0.5">{h.comment}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 5: დანართები (Attached Files) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <button
              onClick={() => toggleSection("files")}
              className="w-full px-4 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 font-sans"
            >
              <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-indigo-500" /> დანართები ({files.length})</span>
              {openSections.files ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openSections.files && (
              <div className="p-4 space-y-3">
                {/* File Upload Trigger */}
                {doc.status !== DocumentStatus.SIGNED && (
                  <label className="flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-sans font-semibold py-2 rounded-lg cursor-pointer transition">
                    <Plus className="w-4 h-4" /> ფაილის მიბმა
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>
                )}

                {/* Files List */}
                {files.length === 0 ? (
                  <p className="text-xxs text-slate-400 font-sans italic">თანდართული ფაილები არ არის</p>
                ) : (
                  <div className="space-y-2">
                    {files.map(file => (
                      <div key={file.id} className="p-2 bg-slate-50 border rounded-lg flex items-center justify-between text-xxs font-sans">
                        <div className="truncate flex-1 mr-2">
                          <span className="font-semibold text-slate-800 block truncate">{file.filename}</span>
                          <span className="text-slate-400 block">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleFileDownload(file.id, file.filename)}
                            className="p-1 hover:bg-slate-200 text-slate-600 rounded transition"
                            title="ჩამოტვირთვა"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {doc.status !== DocumentStatus.SIGNED && (
                            <button
                              onClick={() => handleFileDelete(file.id)}
                              className="p-1 hover:bg-rose-50 hover:text-rose-600 rounded transition"
                              title="წაშლა"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 6: საფუძვლები (Bases) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <button
              onClick={() => toggleSection("basis")}
              className="w-full px-4 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 font-sans"
            >
              <span className="flex items-center gap-1.5"><Link className="w-4 h-4 text-indigo-500" /> საფუძვლები ({basisLinks.length})</span>
              {openSections.basis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openSections.basis && (
              <div className="p-4 space-y-3">
                {/* Search input for adding bases */}
                {doc.status !== DocumentStatus.SIGNED && (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ჩაწერეთ ნომერი / საგანი..."
                      value={basisQuery}
                      onChange={e => handleBasisSearch(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xxs font-sans focus:outline-hidden"
                    />
                    {basisSearchResults.length > 0 && (
                      <div className="absolute top-9 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 z-40 space-y-1 max-h-32 overflow-y-auto">
                        {basisSearchResults.map(res => (
                          <div
                            key={res.id}
                            onClick={() => handleAddBasis(res.id)}
                            className="p-1.5 hover:bg-slate-50 rounded-md cursor-pointer flex items-center justify-between text-[10px] font-sans"
                          >
                            <span className="truncate max-w-[150px] font-bold">{res.subject}</span>
                            <Plus className="w-3 h-3 text-indigo-500 shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Basis Linked List */}
                {basisLinks.length === 0 ? (
                  <p className="text-xxs text-slate-400 font-sans italic">საფუძვლები არ არის</p>
                ) : (
                  <div className="space-y-2 text-xxs font-sans">
                    {basisLinks.map(link => (
                      <div key={link.id} className="p-2 bg-slate-50 border rounded-lg flex items-center justify-between">
                        <span className="truncate font-semibold text-slate-700">ბმა: {link.basisDocumentId.substring(0, 8)}...</span>
                        {doc.status !== DocumentStatus.SIGNED && (
                          <button
                            onClick={async () => {
                              await fetch(`/api/documents/${doc.id}/basis-links/${link.id}`, {
                                method: "DELETE",
                                headers: { "Authorization": `Bearer jwt-mock-token-${currentUser.id}` }
                              });
                              loadDetails();
                            }}
                            className="text-rose-500 hover:underline font-semibold"
                          >
                            წაშლა
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 7: ადრესატები (Recipients) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <button
              onClick={() => toggleSection("recipients")}
              className="w-full px-4 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 font-sans"
            >
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-indigo-500" /> ადრესატები ({recipients.length})</span>
              {openSections.recipients ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openSections.recipients && (
              <div className="p-4 space-y-3">
                {/* Add recipient controls */}
                {doc.status !== DocumentStatus.SIGNED && (
                  <div className="flex gap-1.5">
                    <select
                      value={selectedRecipientId}
                      onChange={e => setSelectedRecipientId(e.target.value)}
                      className="border border-slate-200 rounded-lg p-2 text-xxs font-sans bg-white flex-1 focus:outline-hidden"
                    >
                      <option value="">თანამშრომელი...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddRecipient}
                      className="bg-slate-900 text-white rounded-lg px-3 hover:bg-slate-800 transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Recipients List */}
                {recipients.length === 0 ? (
                  <p className="text-xxs text-slate-400 font-sans italic">ადრესატები არ არის</p>
                ) : (
                  <div className="space-y-1.5">
                    {recipients.map(rec => (
                      <div key={rec.id} className="p-2 bg-slate-50 border rounded-lg flex items-center justify-between text-xxs font-sans text-slate-700">
                        <span className="font-semibold truncate">{rec.recipientName}</span>
                        {doc.status !== DocumentStatus.SIGNED && (
                          <button
                            onClick={() => handleDeleteRecipient(rec.id)}
                            className="text-rose-500 hover:underline shrink-0"
                          >
                            წაშლა
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 8: დავალებები და რეზოლუცია (Tasks & Resolutions) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <button
              onClick={() => toggleSection("tasks")}
              className="w-full px-4 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 font-sans"
            >
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-indigo-500" /> დავალებები ({tasks.length})</span>
              {openSections.tasks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openSections.tasks && (
              <div className="p-4 space-y-4">
                {/* Resolution trigger if signed */}
                {doc.status === DocumentStatus.SIGNED && (
                  <div className="space-y-2">
                    <span className="text-xxs font-bold text-slate-400 block font-sans">რეზოლუციის დადება (Signer/Admin only):</span>
                    <input
                      type="text"
                      placeholder="დაწერეთ რეზოლუცია..."
                      value={resolutionText}
                      onChange={e => setResolutionText(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xxs font-sans focus:outline-hidden"
                    />
                    <button
                      onClick={handleCreateResolution}
                      disabled={!resolutionText}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xxs font-sans font-semibold py-1.5 rounded-lg transition disabled:opacity-40"
                    >
                      რეზოლუციის დადასტურება
                    </button>
                  </div>
                )}

                {/* Resolution tasks list */}
                {resolutions.map(res => (
                  <div key={res.id} className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2.5">
                    <p className="text-xxs font-sans text-slate-700"><span className="font-bold">რეზოლუცია:</span> {res.text}</p>
                    
                    {/* Add task inside this resolution */}
                    <div className="space-y-1.5 pt-1.5 border-t border-indigo-100/60">
                      <select
                        value={taskAssignee}
                        onChange={e => setTaskAssignee(e.target.value)}
                        className="w-full border rounded-lg p-1.5 text-xxs font-sans bg-white"
                      >
                        <option value="">შემსრულებელი...</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="დავალების აღწერა..."
                        value={taskDesc}
                        onChange={e => setTaskDesc(e.target.value)}
                        className="w-full border rounded-lg p-1.5 text-xxs font-sans"
                      />
                      <input
                        type="date"
                        value={taskDeadline}
                        onChange={e => setTaskDeadline(e.target.value)}
                        className="w-full border rounded-lg p-1.5 text-xxs font-sans"
                      />
                      <button
                        onClick={() => handleCreateTask(res.id)}
                        disabled={!taskAssignee || !taskDesc}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] py-1.5 rounded font-sans font-semibold transition disabled:opacity-40"
                      >
                        შემსრულებელზე გაწერა
                      </button>
                    </div>
                  </div>
                ))}

                {/* List of generated tasks */}
                {tasks.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xxs font-bold text-slate-400 block font-sans">გაწერილი დავალებები:</span>
                    {tasks.map(task => (
                      <div key={task.id} className="p-2 bg-slate-50 border rounded-lg space-y-1 text-xxs font-sans">
                        <div className="flex items-center justify-between font-semibold">
                          <span>{getUserName(task.assigneeId)}</span>
                          <span className={task.status === "COMPLETED" ? "text-emerald-600" : "text-amber-500"}>
                            {task.status === "COMPLETED" ? "შესრულდა" : "მუშაობს"}
                          </span>
                        </div>
                        <p className="text-slate-500">{task.description}</p>
                        <p className="text-xxs font-mono text-slate-400">ვადა: {task.deadline || "სასწრაფო"}</p>
                        
                        {task.status !== "COMPLETED" && task.assigneeId === currentUser.id && (
                          <button
                            onClick={() => handleCompleteTask(task.id)}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-1 rounded font-semibold transition"
                          >
                            შესრულებულად მონიშვნა
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
