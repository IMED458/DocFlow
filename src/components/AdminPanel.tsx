import React, { useState, useEffect } from "react";
import {
  Users,
  ShieldAlert,
  FileCheck,
  Hash,
  Contact,
  ClipboardList,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Building,
  Key,
  Edit2,
  Settings,
  Layout,
  RefreshCw
} from "lucide-react";
import {
  User,
  UserRole,
  GEORGIAN_ROLES,
  roleLabel,
  normalizeRole,
  ExternalContact,
  NumberingRule,
  Stamp,
  AuditLog,
  HeaderFooterTemplate,
  DocumentType,
  GEORGIAN_DOCUMENT_TYPES,
  GEORGIAN_CATEGORIES
} from "../types.js";

interface AdminPanelProps {
  currentUser: User;
}

export default function AdminPanel({ currentUser }: AdminPanelProps) {
  const [adminTab, setAdminTab] = useState("users");
  const [users, setUsers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<ExternalContact[]>([]);
  const [rules, setRules] = useState<NumberingRule[]>([]);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [templates, setTemplates] = useState<HeaderFooterTemplate[]>([]);

  // Editing states
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form Inputs - Create User
  const [newUser, setNewUser] = useState<Partial<User>>({
    firstName: "",
    lastName: "",
    personalNumber: "",
    username: "",
    email: "",
    phone: "",
	    role: UserRole.EMPLOYEE,
	    departmentId: "",
	    stampPermission: false,
    positionName: "",
    password: ""
  });

  // Form Inputs - Positions list
  const [newPositionName, setNewPositionName] = useState("");
  const [newPositionDepartmentId, setNewPositionDepartmentId] = useState("");
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newDocumentTypeLabel, setNewDocumentTypeLabel] = useState("");
  const [editingRule, setEditingRule] = useState<NumberingRule | null>(null);

  // Form Inputs - Templates list
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    headerTextGeo: "",
    headerTextEng: "",
    identificationCode: "",
    website: "",
    address: "",
    phone: "",
    email: "",
    headerImage: "",
    footerImage: ""
  });

  const [newContact, setNewContact] = useState<Partial<ExternalContact>>({
    name: "",
    organization: "",
    taxId: "",
    address: "",
    email: "",
    phone: "",
    contactType: "ORGANIZATION"
  });

  const loadAdminData = async () => {
    try {
      const headers = { "Authorization": `Bearer jwt-mock-token-${currentUser.id}` };
      const [resUsers, resContacts, resRules, resStamps, resAudit, resPositions, resTemplates, resDepartments, resDocumentTypes] = await Promise.all([
        fetch("/api/users", { headers }).then(r => r.json()),
        fetch("/api/admin/external-contacts", { headers }).then(r => r.json()),
        fetch("/api/admin/numbering-rules", { headers }).then(r => r.json()),
        fetch("/api/admin/stamps", { headers }).then(r => r.json()),
        fetch("/api/audit-logs", { headers }).then(r => r.json()),
        fetch("/api/positions", { headers }).then(r => r.json()),
        fetch("/api/admin/header-footer-templates", { headers }).then(r => r.json()),
        fetch("/api/departments", { headers }).then(r => r.json()),
        fetch("/api/admin/document-types", { headers }).then(r => r.json())
      ]);

      setUsers(resUsers);
      setContacts(resContacts);
      setRules(resRules);
      setStamps(resStamps);
      setAuditLogs(resAudit);
      setPositions(resPositions || []);
      setTemplates(resTemplates || []);
      setDepartments(resDepartments || []);
      setDocumentTypes(resDocumentTypes || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [adminTab]);

  // User Actions
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = (newUser.username || "").trim();
    if (!username) {
      window.alert("მომხმარებლის სახელი აუცილებელია.");
      return;
    }
    if (username.includes("@")) {
      window.alert("მომხმარებლის სახელი არ უნდა იყოს ელ-ფოსტა.");
      return;
    }
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({
          ...newUser,
          status: "ACTIVE"
        })
      });
      if (res.ok) {
        setNewUser({
          firstName: "",
          lastName: "",
          personalNumber: "",
          username: "",
          email: "",
          phone: "",
	          role: UserRole.EMPLOYEE,
	          departmentId: "",
	          stampPermission: false,
          positionName: "",
          password: ""
        });
        loadAdminData();
      } else {
        const err = await res.json().catch(() => ({}));
        window.alert(err.message || "მომხმარებლის შექმნა ვერ მოხერხდა.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify(editingUser)
      });
      if (res.ok) {
        setEditingUser(null);
        loadAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Upload signature base64 image
  const handleSignatureUpload = (userId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}/signature-profile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
          },
          body: JSON.stringify({ signatureImage: reader.result })
        });
        if (res.ok) {
          loadAdminData();
        }
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  // Delete User Signature
  const handleDeleteSignature = async (userId: string) => {
    if (!window.confirm("ნამდვილად გსურთ ხელმოწერის წაშლა?")) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/signature-profile`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer jwt-mock-token-${currentUser.id}` }
      });
      if (res.ok) {
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Position
  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPositionName.trim()) return;
    try {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({ name: newPositionName, departmentId: newPositionDepartmentId || departments[0]?.id || "dep-general" })
      });
      if (res.ok) {
        setNewPositionName("");
        setNewPositionDepartmentId("");
        loadAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartmentName.trim()) return;
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({ name: newDepartmentName, organizationId: "org-1" })
      });
      if (res.ok) {
        setNewDepartmentName("");
        loadAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateNumberingRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;
    try {
      const res = await fetch(`/api/admin/numbering-rules/${editingRule.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify(editingRule)
      });
      if (res.ok) {
        setEditingRule(null);
        loadAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateDocumentType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocumentTypeLabel.trim()) return;
    try {
      const res = await fetch("/api/admin/document-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({ label: newDocumentTypeLabel })
      });
      if (res.ok) {
        setNewDocumentTypeLabel("");
        loadAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Position
  const handleDeletePosition = async (id: string) => {
    if (!window.confirm("ნამდვილად გსურთ ამ პოზიციის წაშლა ნუსხიდან?")) return;
    try {
      const res = await fetch(`/api/positions/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer jwt-mock-token-${currentUser.id}` }
      });
      if (res.ok) {
        loadAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Header/Footer Template
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/header-footer-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify(newTemplate)
      });
      if (res.ok) {
        setNewTemplate({
          name: "",
          headerTextGeo: "",
          headerTextEng: "",
          identificationCode: "",
          website: "",
          address: "",
          phone: "",
          email: "",
          headerImage: "",
          footerImage: ""
        });
        loadAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Template
  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm("ნამდვილად გსურთ ამ შაბლონის წაშლა?")) return;
    try {
      const res = await fetch(`/api/admin/header-footer-templates/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer jwt-mock-token-${currentUser.id}` }
      });
      if (res.ok) {
        loadAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Set Default Template
  const handleSetDefaultTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/header-footer-templates/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify({ isDefault: true })
      });
      if (res.ok) {
        loadAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Template Images base64 helper
  const handleTemplateImageUpload = (type: "header" | "footer", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (type === "header") {
        setNewTemplate(prev => ({ ...prev, headerImage: reader.result as string }));
      } else {
        setNewTemplate(prev => ({ ...prev, footerImage: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Create Contact
  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/external-contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
        },
        body: JSON.stringify(newContact)
      });
      if (res.ok) {
        setNewContact({
          name: "",
          organization: "",
          taxId: "",
          address: "",
          email: "",
          phone: "",
          contactType: "ORGANIZATION"
        });
        loadAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Stamp (Base64)
  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch("/api/admin/stamps", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer jwt-mock-token-${currentUser.id}`
          },
          body: JSON.stringify({ name: file.name, imageUrl: reader.result })
        });
        if (res.ok) {
          loadAdminData();
        }
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  // Delete Stamp
  const handleDeleteStamp = async (stampId: string) => {
    if (!window.confirm("ნამდვილად გსურთ ბეჭდის წაშლა?")) return;
    try {
      const res = await fetch(`/api/admin/stamps/${stampId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer jwt-mock-token-${currentUser.id}` }
      });
      if (res.ok) {
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Panel Greeting */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display">ადმინისტრირების პანელი</h2>
          <p className="text-slate-400 text-xs font-sans mt-1">ორგანიზაციის სტრუქტურის, ნუმერაციის, ბეჭდებისა და აუდიტის მართვა.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column sidebar admin nav */}
        <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-100 h-fit">
          {[
	            { id: "users", label: "მომხმარებლები", icon: Users },
	            { id: "departments", label: "დეპარტამენტები / განყოფილებები", icon: Building },
	            { id: "positions_list", label: "თანამდებობების ნუსხა", icon: Building },
	            { id: "document_types", label: "დოკუმენტის ტიპები", icon: FileCheck },
            { id: "templates", label: "შაბლონები (ბლანკები)", icon: Layout },
            { id: "signatures", label: "ხელმოწერები", icon: FileCheck },
            { id: "stamps", label: "ბეჭდები და შტამპები", icon: ShieldAlert },
            { id: "numbering", label: "ნუმერაციის წესები", icon: Hash },
            { id: "contacts", label: "გარე რეესტრი", icon: Contact },
            { id: "audit", label: "აუდიტის ჟურნალი", icon: ClipboardList }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setAdminTab(tab.id);
                setEditingUser(null);
              }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-sans font-semibold text-left transition ${
                adminTab === tab.id ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right 3 columns: content panels */}
        <div className="lg:col-span-3">
          {/* Tab 1: Users Directory */}
          {adminTab === "users" && (
            <div className="space-y-6">
              {/* Add/Edit User Form */}
              {!editingUser ? (
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
                  <h3 className="text-base font-bold text-slate-800 font-display mb-4">ახალი თანამშრომლის რეგისტრაცია</h3>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="flex flex-col">
                        <label className="text-xxs font-semibold text-slate-500 mb-1">სახელი <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          placeholder="სახელი"
                          value={newUser.firstName}
                          onChange={e => setNewUser({ ...newUser, firstName: e.target.value })}
                          required
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xxs font-semibold text-slate-500 mb-1">გვარი <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          placeholder="გვარი"
                          value={newUser.lastName}
                          onChange={e => setNewUser({ ...newUser, lastName: e.target.value })}
                          required
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xxs font-semibold text-slate-500 mb-1">პირადი ნომერი (11 ნიშნა) <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          placeholder="პირადი ნომერი"
                          value={newUser.personalNumber}
                          onChange={e => setNewUser({ ...newUser, personalNumber: e.target.value })}
                          required
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans font-mono focus:outline-hidden"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xxs font-semibold text-slate-500 mb-1">მომხმარებლის სახელი (username) <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          autoComplete="off"
                          placeholder="მაგ: g.meladze (არა ელ-ფოსტა)"
                          value={newUser.username || ""}
                          onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                          required
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans font-mono focus:outline-hidden"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xxs font-semibold text-slate-500 mb-1">ელ-ფოსტა (არასავალდებულო)</label>
                        <input
                          type="email"
                          placeholder="ელ-ფოსტა"
                          value={newUser.email || ""}
                          onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xxs font-semibold text-slate-500 mb-1">ტელეფონი</label>
                        <input
                          type="text"
                          placeholder="ტელეფონი"
                          value={newUser.phone}
                          onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
                        />
                      </div>
	                      <div className="flex flex-col">
	                        <label className="text-xxs font-semibold text-slate-500 mb-1">როლი სისტემაში <span className="text-rose-500">*</span></label>
                        <select
                          value={newUser.role}
                          onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden bg-white"
                        >
                          {Object.entries(GEORGIAN_ROLES).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
	                        </select>
	                      </div>

	                      <div className="flex flex-col">
	                        <label className="text-xxs font-semibold text-slate-500 mb-1">დეპარტამენტი / განყოფილება</label>
	                        <select
	                          value={newUser.departmentId || ""}
	                          onChange={e => setNewUser({ ...newUser, departmentId: e.target.value, positionName: "" })}
	                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden bg-white"
	                        >
	                          <option value="">— აირჩიეთ —</option>
	                          {departments.map(dep => (
	                            <option key={dep.id} value={dep.id}>{dep.name}</option>
	                          ))}
	                        </select>
	                      </div>

	                      <div className="flex flex-col">
	                        <label className="text-xxs font-semibold text-slate-500 mb-1">თანამდებობა (აირჩიეთ ნუსხიდან)</label>
                        <select
                          onChange={e => {
                            if (e.target.value) {
                              setNewUser(prev => ({ ...prev, positionName: e.target.value }));
                            }
                          }}
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden bg-white"
                        >
                          <option value="">— აირჩიეთ —</option>
	                          {positions.filter(p => !newUser.departmentId || p.departmentId === newUser.departmentId).map(p => (
	                            <option key={p.id} value={p.name}>{p.name}</option>
	                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-xxs font-semibold text-slate-500 mb-1">ან ჩაწერეთ ხელით (Manual)</label>
                        <input
                          type="text"
                          placeholder="თანამდებობა ხელით..."
                          value={newUser.positionName || ""}
                          onChange={e => setNewUser({ ...newUser, positionName: e.target.value })}
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-xxs font-semibold text-slate-500 mb-1">სისტემის პაროლი <span className="text-rose-500">*</span></label>
                        <input
                          type="password"
                          placeholder="სისტემის პაროლი"
                          value={newUser.password}
                          onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                          required
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-sans text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newUser.stampPermission}
                          onChange={e => setNewUser({ ...newUser, stampPermission: e.target.checked })}
                          className="rounded"
                        />
                        აქვს ოფიციალური ბეჭდის გამოყენების უფლება
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-6 py-2.5 font-sans font-semibold text-xs flex items-center justify-center gap-1.5 transition ml-auto"
                    >
                      <Plus className="w-4 h-4" />
                      მომხმარებლის რეგისტრაცია
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-slate-50 p-6 rounded-2xl border-2 border-indigo-100 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-800 font-display">მომხმარებლის რედაქტირება: {editingUser.firstName} {editingUser.lastName}</h3>
                    <button
                      onClick={() => setEditingUser(null)}
                      className="text-slate-400 hover:text-slate-600 font-sans text-xs flex items-center gap-1"
                    >
                      <XCircle className="w-4 h-4" />
                      გაუქმება
                    </button>
                  </div>
                  <form onSubmit={handleUpdateUser} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="flex flex-col">
                        <label className="text-xxs font-semibold text-slate-500 mb-1">სახელი</label>
                        <input
                          type="text"
                          value={editingUser.firstName}
                          onChange={e => setEditingUser({ ...editingUser, firstName: e.target.value })}
                          required
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans bg-white focus:outline-hidden"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xxs font-semibold text-slate-500 mb-1">გვარი</label>
                        <input
                          type="text"
                          value={editingUser.lastName}
                          onChange={e => setEditingUser({ ...editingUser, lastName: e.target.value })}
                          required
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans bg-white focus:outline-hidden"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xxs font-semibold text-slate-500 mb-1">პირადი ნომერი</label>
                        <input
                          type="text"
                          value={editingUser.personalNumber}
                          onChange={e => setEditingUser({ ...editingUser, personalNumber: e.target.value })}
                          required
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans font-mono bg-white focus:outline-hidden"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xxs font-semibold text-slate-500 mb-1">მომხმარებლის სახელი (username)</label>
                        <input
                          type="text"
                          value={editingUser.username || ""}
                          onChange={e => setEditingUser({ ...editingUser, username: e.target.value })}
                          required
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans font-mono bg-white focus:outline-hidden"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xxs font-semibold text-slate-500 mb-1">ელ-ფოსტა (არასავალდებულო)</label>
                        <input
                          type="email"
                          value={editingUser.email || ""}
                          onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans bg-white focus:outline-hidden"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xxs font-semibold text-slate-500 mb-1">ტელეფონი</label>
                        <input
                          type="text"
                          value={editingUser.phone || ""}
                          onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })}
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans bg-white focus:outline-hidden"
                        />
                      </div>
	                      <div className="flex flex-col">
	                        <label className="text-xxs font-semibold text-slate-500 mb-1">როლი სისტემაში</label>
                        <select
                          value={editingUser.role}
                          onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans bg-white focus:outline-hidden"
                        >
                          {Object.entries(GEORGIAN_ROLES).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
	                        </select>
	                      </div>

	                      <div className="flex flex-col">
	                        <label className="text-xxs font-semibold text-slate-500 mb-1">დეპარტამენტი / განყოფილება</label>
	                        <select
	                          value={editingUser.departmentId || ""}
	                          onChange={e => setEditingUser({ ...editingUser, departmentId: e.target.value, positionName: "" })}
	                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans bg-white focus:outline-hidden"
	                        >
	                          <option value="">— აირჩიეთ —</option>
	                          {departments.map(dep => (
	                            <option key={dep.id} value={dep.id}>{dep.name}</option>
	                          ))}
	                        </select>
	                      </div>

	                      <div className="flex flex-col">
	                        <label className="text-xxs font-semibold text-slate-500 mb-1">თანამდებობა (აირჩიეთ ნუსხიდან)</label>
                        <select
                          onChange={e => {
                            if (e.target.value) {
                              setEditingUser(prev => prev ? ({ ...prev, positionName: e.target.value }) : null);
                            }
                          }}
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden bg-white"
                        >
                          <option value="">— აირჩიეთ —</option>
	                          {positions.filter(p => !editingUser.departmentId || p.departmentId === editingUser.departmentId).map(p => (
	                            <option key={p.id} value={p.name}>{p.name}</option>
	                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-xxs font-semibold text-slate-500 mb-1">ან ჩაწერეთ ხელით (Manual)</label>
                        <input
                          type="text"
                          value={editingUser.positionName || ""}
                          onChange={e => setEditingUser({ ...editingUser, positionName: e.target.value })}
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans bg-white focus:outline-hidden"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-xxs font-semibold text-slate-500 mb-1">აქტიური სტატუსი</label>
                        <select
                          value={editingUser.status}
                          onChange={e => setEditingUser({ ...editingUser, status: e.target.value as "ACTIVE" | "INACTIVE" })}
                          className="border border-slate-200 rounded-lg p-2 text-xs font-sans bg-white focus:outline-hidden"
                        >
                          <option value="ACTIVE">აქტიური</option>
                          <option value="INACTIVE">შეჩერებული</option>
                        </select>
                      </div>

                      <div className="flex flex-col md:col-span-2">
                        <label className="text-xxs font-bold text-indigo-600 mb-1">პაროლის აღდგენა / შეცვლა (Reset Password)</label>
                        <input
                          type="password"
                          placeholder="ჩაწერეთ ახალი პაროლი შესაცვლელად..."
                          value={editingUser.password || ""}
                          onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                          className="border border-indigo-200 bg-indigo-50/20 rounded-lg p-2 text-xs font-sans focus:outline-hidden focus:border-indigo-400"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-sans text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingUser.stampPermission}
                          onChange={e => setEditingUser({ ...editingUser, stampPermission: e.target.checked })}
                          className="rounded"
                        />
                        აქვს ოფიციალური ბეჭდის გამოყენების უფლება
                      </label>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg px-4 py-2 text-xs font-sans font-semibold transition"
                      >
                        გაუქმება
                      </button>
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-6 py-2 text-xs font-sans font-semibold transition"
                      >
                        შენახვა და განახლება
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Users List Grid */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-x-auto">
                <table className="w-full min-w-[900px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 text-xs font-sans font-semibold uppercase">
                      <th className="p-4">სახელი და გვარი</th>
                      <th className="p-4">მომხმარებელი</th>
                      <th className="p-4">პირადი ნომერი</th>
                      <th className="p-4">ელ-ფოსტა / ტელეფონი</th>
                      <th className="p-4">როლი</th>
                      <th className="p-4">თანამდებობა (ხელით)</th>
                      <th className="p-4">სტატუსი</th>
                      <th className="p-4 text-center">რედაქტირება</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-sans">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-semibold text-slate-800">{u.firstName} {u.lastName}</td>
                        <td className="p-4 font-mono text-slate-700">{u.username || "—"}</td>
                        <td className="p-4 font-mono text-slate-500">{u.personalNumber}</td>
                        <td className="p-4 text-slate-600">
                          <div>{u.email}</div>
                          <div className="text-xxs text-slate-400 font-mono">{u.phone || "—"}</div>
                        </td>
                        <td className="p-4 text-indigo-600 font-semibold">{roleLabel(u.role)}</td>
                        <td className="p-4 text-slate-600 font-medium">{u.positionName || "—"}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}>
                            {u.status === "ACTIVE" ? "აქტიური" : "შეჩერებული"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => {
                              setEditingUser({ ...u, role: normalizeRole(u.role), password: "" });
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 rounded-lg transition"
                            title="რედაქტირება / პაროლის შეცვლა"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

	          {/* Tab 1a: Manage Departments */}
	          {adminTab === "departments" && (
	            <div className="space-y-6">
	              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
	                <h3 className="text-base font-bold text-slate-800 font-display mb-4">დეპარტამენტები / განყოფილებები</h3>
	                <form onSubmit={handleCreateDepartment} className="flex gap-3">
	                  <input
	                    type="text"
	                    placeholder="დეპარტამენტის ან განყოფილების დასახელება..."
	                    value={newDepartmentName}
	                    onChange={e => setNewDepartmentName(e.target.value)}
	                    required
	                    className="border border-slate-200 rounded-lg p-2.5 text-xs font-sans focus:outline-hidden flex-1"
	                  />
	                  <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-5 text-xs font-sans font-semibold flex items-center gap-1 transition">
	                    <Plus className="w-4 h-4" />
	                    დამატება
	                  </button>
	                </form>
	              </div>

	              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
	                {departments.map(dep => (
	                  <div key={dep.id} className="bg-white border border-slate-100 rounded-xl p-4">
	                    <div className="font-bold text-slate-800 text-sm">{dep.name}</div>
	                    <div className="text-xxs text-slate-400 mt-1">თანამდებობები: {positions.filter(p => p.departmentId === dep.id).length}</div>
	                  </div>
	                ))}
	              </div>
	            </div>
	          )}

	          {/* Tab 1b: Manage Positions List */}
	          {adminTab === "positions_list" && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
                <h3 className="text-base font-bold text-slate-800 font-display mb-4">თანამდებობების ნუსხის მართვა</h3>
	                <form onSubmit={handleCreatePosition} className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3">
	                  <input
                    type="text"
                    placeholder="ჩაწერეთ ახალი თანამდებობის დასახელება..."
                    value={newPositionName}
                    onChange={e => setNewPositionName(e.target.value)}
                    required
	                    className="border border-slate-200 rounded-lg p-2.5 text-xs font-sans focus:outline-hidden flex-1"
	                  />
	                  <select
	                    value={newPositionDepartmentId}
	                    onChange={e => setNewPositionDepartmentId(e.target.value)}
	                    required
	                    className="border border-slate-200 rounded-lg p-2.5 text-xs font-sans focus:outline-hidden bg-white"
	                  >
	                    <option value="">დეპარტამენტი...</option>
	                    {departments.map(dep => (
	                      <option key={dep.id} value={dep.id}>{dep.name}</option>
	                    ))}
	                  </select>
	                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-5 text-xs font-sans font-semibold flex items-center gap-1 transition"
                  >
                    <Plus className="w-4 h-4" />
                    ნუსხაში დამატება
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 text-xs font-sans font-semibold uppercase">
                      <th className="p-4">თანამდებობა</th>
	                      <th className="p-4">დეპარტამენტი</th>
	                      <th className="p-4 text-center w-24">წაშლა</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-sans">
                    {positions.length === 0 ? (
                      <tr>
	                        <td colSpan={3} className="p-4 text-center text-slate-400 italic">თანამდებობების ნუსხა ცარიელია</td>
                      </tr>
                    ) : (
                      positions.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 transition">
	                          <td className="p-4 text-slate-800 font-semibold">{p.name}</td>
	                          <td className="p-4 text-slate-500">{departments.find(dep => dep.id === p.departmentId)?.name || "—"}</td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDeletePosition(p.id)}
                              className="p-1 hover:text-rose-600 text-slate-400 rounded transition"
                              title="ნუსხიდან წაშლა"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
	          )}

	          {/* Tab 1c: Document Types */}
	          {adminTab === "document_types" && (
	            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
	              <h3 className="text-base font-bold text-slate-800 font-display border-b border-slate-100 pb-3">
	                დოკუმენტის ტიპები
	              </h3>
	              <form onSubmit={handleCreateDocumentType} className="flex gap-3">
	                <input
	                  value={newDocumentTypeLabel}
	                  onChange={e => setNewDocumentTypeLabel(e.target.value)}
	                  placeholder="მაგ: ოქმი, ბრძანება, აქტი..."
	                  className="border border-slate-200 rounded-lg p-2.5 text-xs font-sans focus:outline-hidden flex-1"
	                />
	                <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-5 text-xs font-sans font-semibold flex items-center gap-1 transition">
	                  <Plus className="w-4 h-4" />
	                  ტიპის დამატება
	                </button>
	              </form>
	              <p className="text-xs text-slate-500 font-sans">
	                თანამშრომელი დოკუმენტის შექმნისას ვალდებულია აირჩიოს ტიპი. ამ ტიპებით ხდება ძებნა, ფილტრაცია და ნუმერაციის წესზე მიბმა.
	              </p>
	              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
	                {(documentTypes.length ? documentTypes : Object.entries(GEORGIAN_DOCUMENT_TYPES).map(([id, label]) => ({ id, label, isActive: true }))).map(typeItem => (
	                  <div key={typeItem.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50">
	                    <div className="font-bold text-sm text-slate-800">{typeItem.label}</div>
	                    <div className="text-xxs text-slate-400 mt-1 font-mono">{typeItem.id}</div>
	                    <div className="text-xxs text-emerald-600 font-bold mt-2">აქტიური</div>
	                  </div>
	                ))}
	              </div>
	            </div>
	          )}

	          {/* Tab 1c: Manage Letterhead/Footer Templates */}
	          {adminTab === "templates" && (
            <div className="space-y-6">
              {/* Create Template Form */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
                <h3 className="text-base font-bold text-slate-800 font-display mb-4">ახალი ოფიციალური ბლანკის (Template) შექმნა</h3>
                <form onSubmit={handleCreateTemplate} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <label className="text-xxs font-semibold text-slate-500 mb-1">ბლანკის სახელი <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="მაგ: ოფიციალური წერილებისთვის"
                        value={newTemplate.name}
                        onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        required
                        className="border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xxs font-semibold text-slate-500 mb-1">საიდენტიფიკაციო კოდი <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="საიდენტიფიკაციო კოდი"
                        value={newTemplate.identificationCode}
                        onChange={e => setNewTemplate({ ...newTemplate, identificationCode: e.target.value })}
                        required
                        className="border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xxs font-semibold text-slate-500 mb-1">სათაურის ქართული ტექსტი <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="საქართველოს განათლებისა და მეცნიერების სამინისტრო"
                        value={newTemplate.headerTextGeo}
                        onChange={e => setNewTemplate({ ...newTemplate, headerTextGeo: e.target.value })}
                        required
                        className="border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xxs font-semibold text-slate-500 mb-1">სათაურის ინგლისური ტექსტი</label>
                      <input
                        type="text"
                        placeholder="Ministry of Education and Science of Georgia"
                        value={newTemplate.headerTextEng}
                        onChange={e => setNewTemplate({ ...newTemplate, headerTextEng: e.target.value })}
                        className="border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xxs font-semibold text-slate-500 mb-1">მისამართი / ტელეფონი</label>
                      <input
                        type="text"
                        placeholder="დიმიტრი უზნაძის ქ. 52, თბილისი"
                        value={newTemplate.address}
                        onChange={e => setNewTemplate({ ...newTemplate, address: e.target.value })}
                        className="border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xxs font-semibold text-slate-500 mb-1">ვებ-გვერდი / ელ-ფოსტა</label>
                      <input
                        type="text"
                        placeholder="www.mes.gov.ge"
                        value={newTemplate.website}
                        onChange={e => setNewTemplate({ ...newTemplate, website: e.target.value })}
                        className="border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xxs font-semibold text-indigo-600 mb-1">ატვირთეთ Letterhead (ზედა ლოგო/ბანერი)</label>
                      <label className="border border-dashed border-slate-200 rounded-lg p-2 bg-slate-50 text-center cursor-pointer hover:bg-slate-100 transition text-[11px] font-sans text-slate-600">
                        {newTemplate.headerImage ? "✓ ბანერი ატვირთულია" : "აირჩიეთ ფაილი (PNG/JPG)..."}
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleTemplateImageUpload("header", e)} className="hidden" />
                      </label>
                      {newTemplate.headerImage && (
                        <img src={newTemplate.headerImage} className="w-full max-h-44 object-contain mt-2 rounded border border-slate-100 bg-white" />
                      )}
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xxs font-semibold text-indigo-600 mb-1">ატვირთეთ Footer (ქვედა ბანერი/ფუუტერი)</label>
                      <label className="border border-dashed border-slate-200 rounded-lg p-2 bg-slate-50 text-center cursor-pointer hover:bg-slate-100 transition text-[11px] font-sans text-slate-600">
                        {newTemplate.footerImage ? "✓ ფუთერი ატვირთულია" : "აირჩიეთ ფაილი (PNG/JPG)..."}
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleTemplateImageUpload("footer", e)} className="hidden" />
                      </label>
                      {newTemplate.footerImage && (
                        <img src={newTemplate.footerImage} className="w-full max-h-32 object-contain mt-2 rounded border border-slate-100 bg-white" />
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-6 py-2 text-xs font-sans font-semibold transition flex items-center gap-1 ml-auto"
                  >
                    <Plus className="w-4 h-4" />
                    ბლანკის შაბლონის შენახვა
                  </button>
                </form>
              </div>

              {/* Templates List Grid */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-800 font-display">არსებული ოფიციალური ბლანკები</h3>
                <div className="grid grid-cols-1 gap-4">
                  {templates.map(tpl => (
                    <div key={tpl.id} className="p-4 border border-slate-200 rounded-xl flex flex-col md:flex-row justify-between gap-4 bg-slate-50/50">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-800 font-sans">{tpl.name}</span>
                          {tpl.isDefault ? (
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 px-2 py-0.5 rounded-full">ნაგულისხმევი (Default)</span>
                          ) : (
                            <button
                              onClick={() => handleSetDefaultTemplate(tpl.id)}
                              className="text-xxs text-indigo-600 hover:underline font-sans font-semibold"
                            >
                              სტანდარტულად დაყენება
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 font-sans">საიდენტიფიკაციო კოდი: {tpl.identificationCode} | ვებ-გვერდი: {tpl.website || "—"}</p>
                        <p className="text-xxs text-slate-500 font-sans italic">სათაური: {tpl.headerTextGeo}</p>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block">Letterhead Banner:</span>
                            {tpl.headerImage ? (
                              <img src={tpl.headerImage} className="w-full max-h-36 object-contain rounded border border-slate-200 bg-white" />
                            ) : (
                              <span className="text-xxs text-slate-400 italic font-sans block">არ არის</span>
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block">Footer Banner:</span>
                            {tpl.footerImage ? (
                              <img src={tpl.footerImage} className="w-full max-h-28 object-contain rounded border border-slate-200 bg-white" />
                            ) : (
                              <span className="text-xxs text-slate-400 italic font-sans block">არ არის</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 p-2 rounded-xl transition"
                          title="წაშლა"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Employee Signatures */}
          {adminTab === "signatures" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
              <h3 className="text-base font-bold text-slate-800 font-display border-b border-slate-100 pb-3">
                თანამშრომელთა ხელმოწერების მართვა
              </h3>
              <p className="text-xs text-slate-500 font-sans">ატვირთეთ ან წაშალეთ თანამშრომლების ოფიციალური ხელმოწერები (PNG format):</p>

              <div className="divide-y divide-slate-100 space-y-4">
                {users.map(u => (
                  <div key={u.id} className="pt-4 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-semibold text-xs text-slate-800 font-sans block">{u.firstName} {u.lastName}</span>
                      <span className="text-xxs font-sans text-slate-400 block mt-0.5">{u.positionName || roleLabel(u.role)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Signature preview */}
                      {u.signatureImage ? (
                        <div className="flex items-center gap-3">
                          <div className="border border-slate-200 rounded p-1 bg-white">
                            <img src={u.signatureImage} alt="ხელმოწერა" className="w-24 h-12 object-contain" />
                          </div>
                          <button
                            onClick={() => handleDeleteSignature(u.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-3 py-1.5 rounded text-xxs font-sans font-bold transition flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            წაშლა
                          </button>
                        </div>
                      ) : (
                        <span className="text-xxs text-slate-400 font-sans italic mr-2">ხელმოწერა არ არის</span>
                      )}

                      <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-xxs font-sans font-bold cursor-pointer transition">
                        ატვირთვა
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleSignatureUpload(u.id, e)} className="hidden" />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Stamps & Seals */}
          {adminTab === "stamps" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-800 font-display">
                  სამინისტროს ბეჭდები
                </h3>
                <label className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-sans font-medium px-3 py-2 rounded-lg cursor-pointer transition">
                  ახალი ბეჭდის ატვირთვა
                  <input type="file" onChange={handleStampUpload} className="hidden" />
                </label>
              </div>

              {/* Stamps grid list */}
              {stamps.length === 0 ? (
                <p className="text-xs text-slate-400 font-sans">ბეჭდები არ არის</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {stamps.map(stamp => (
                    <div key={stamp.id} className="p-4 border border-slate-200 rounded-xl flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <img src={stamp.imageUrl} alt="ბეჭედი" className="w-16 h-16 object-contain rounded bg-white border" />
                        <div>
                          <span className="font-semibold text-xs text-slate-800 font-sans block">{stamp.name}</span>
                          <span className="text-xxs font-sans text-emerald-600 mt-1 block">აქტიური</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteStamp(stamp.id)}
                        className="text-slate-400 hover:text-rose-600 p-2 rounded-lg transition"
                        title="ბეჭდის წაშლა"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Numbering Rules */}
          {adminTab === "numbering" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
              <h3 className="text-base font-bold text-slate-800 font-display border-b border-slate-100 pb-3">
                ნუმერაციის წესები
              </h3>

	              <div className="space-y-4">
	                {editingRule && (
	                  <form onSubmit={handleUpdateNumberingRule} className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3">
	                    <input value={editingRule.prefix} onChange={e => setEditingRule({ ...editingRule, prefix: e.target.value })} className="border border-slate-200 rounded-lg p-2 text-xs" placeholder="პრეფიქსი" />
	                    <input value={editingRule.separator} onChange={e => setEditingRule({ ...editingRule, separator: e.target.value })} className="border border-slate-200 rounded-lg p-2 text-xs" placeholder="გამყოფი" />
	                    <input type="number" value={editingRule.sequenceLength} onChange={e => setEditingRule({ ...editingRule, sequenceLength: Number(e.target.value) })} className="border border-slate-200 rounded-lg p-2 text-xs" placeholder="სიგრძე" />
	                    <select value={editingRule.yearFormat} onChange={e => setEditingRule({ ...editingRule, yearFormat: e.target.value as "YYYY" | "YY" | "NONE" })} className="border border-slate-200 rounded-lg p-2 text-xs bg-white">
	                      <option value="YYYY">YYYY</option>
	                      <option value="YY">YY</option>
	                      <option value="NONE">წლის გარეშე</option>
	                    </select>
	                    <select value={editingRule.category || ""} onChange={e => setEditingRule({ ...editingRule, category: e.target.value as any })} className="border border-slate-200 rounded-lg p-2 text-xs bg-white">
	                      <option value="">ყველა კატეგორია</option>
	                      {Object.entries(GEORGIAN_CATEGORIES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
	                    </select>
	                    <select value={editingRule.documentType || ""} onChange={e => setEditingRule({ ...editingRule, documentType: e.target.value as DocumentType })} className="border border-slate-200 rounded-lg p-2 text-xs bg-white">
	                      <option value="">ყველა ტიპი</option>
	                      {Object.entries(GEORGIAN_DOCUMENT_TYPES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
	                    </select>
	                    <div className="md:col-span-3 flex justify-end gap-2">
	                      <button type="button" onClick={() => setEditingRule(null)} className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white">გაუქმება</button>
	                      <button type="submit" className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white">შენახვა</button>
	                    </div>
	                  </form>
	                )}
	                {rules.map(rule => (
	                  <div key={rule.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
	                    <div>
	                      <span className="font-bold text-xs text-indigo-600 font-sans block">პრეფიქსი: {rule.prefix}</span>
	                      <p className="text-xs font-sans text-slate-600 mt-1">
	                        განმცალკევებელი: "{rule.separator}" | სიგრძე: {rule.sequenceLength} | ტიპი: {rule.documentType ? GEORGIAN_DOCUMENT_TYPES[rule.documentType] : "ყველა"}
	                      </p>
	                    </div>
	                    <button onClick={() => setEditingRule(rule)} className="text-xxs font-sans text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg font-bold">
	                      რედაქტირება
	                    </button>
	                  </div>
	                ))}
              </div>
            </div>
          )}

          {/* Tab 5: External Contact Registry */}
          {adminTab === "contacts" && (
            <div className="space-y-6">
              {/* New Contact */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
                <h3 className="text-base font-bold text-slate-800 font-display mb-4">გარე პარტნიორების რეესტრი</h3>
                <form onSubmit={handleCreateContact} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="ორგანიზაციის დასახელება"
                    value={newContact.organization}
                    onChange={e => setNewContact({ ...newContact, organization: e.target.value, name: e.target.value })}
                    required
                    className="border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
                  />
                  <input
                    type="text"
                    placeholder="საიდენტიფიკაციო კოდი (Tax ID)"
                    value={newContact.taxId}
                    onChange={e => setNewContact({ ...newContact, taxId: e.target.value })}
                    required
                    className="border border-slate-200 rounded-lg p-2 text-xs font-sans font-mono focus:outline-hidden"
                  />
                  <input
                    type="email"
                    placeholder="ელ-ფოსტა"
                    value={newContact.email}
                    onChange={e => setNewContact({ ...newContact, email: e.target.value })}
                    className="border border-slate-200 rounded-lg p-2 text-xs font-sans focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2 font-sans font-semibold text-xs flex items-center justify-center gap-1 focus:outline-hidden"
                  >
                    <Plus className="w-4 h-4" />
                    პარტნიორის დამატება
                  </button>
                </form>
              </div>

              {/* Contacts list */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 text-xs font-sans font-semibold uppercase">
                      <th className="p-4">ორგანიზაცია</th>
                      <th className="p-4">კოდი</th>
                      <th className="p-4">ელ-ფოსტა</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-sans">
                    {contacts.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-semibold text-slate-800">{c.organization}</td>
                        <td className="p-4 font-mono text-slate-500">{c.taxId}</td>
                        <td className="p-4 text-slate-600">{c.email || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 6: System Audit Logs */}
          {adminTab === "audit" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-800 font-display border-b border-slate-100 pb-3">
                სისტემური აუდიტის ჟურნალი
              </h3>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {auditLogs.map(log => (
                  <div key={log.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-sans">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{log.userFullName}</span>
                      <span className="text-slate-400 font-mono">{log.timestamp.replace("T", " ").substring(0, 19)}</span>
                    </div>
                    <p className="text-indigo-600 font-semibold mt-1.5">ქმედება: {log.action}</p>
                    <span className="text-[10px] text-slate-400 font-mono block mt-1">Entity: {log.entityType} ({log.entityId})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
