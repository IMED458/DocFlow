import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { saveDatabase } from "./src/server/db.js";
import {
  DocumentCategory,
  DocumentType,
  DocumentStatus,
  VisaActionStatus,
  TaskStatus,
  UserRole,
  User,
  Document,
  DocumentFile,
  DocumentVersion,
  DocumentRecipient,
  DocumentAddressee,
  DocumentBasisLink,
  DocumentRelatedLink,
  ExternalResolution,
  DocumentExternalResolutionLink,
  NumberingRule,
  VisaAction,
  Resolution,
  Task,
  TaskComment,
  Notification,
  AuditLog,
  ExternalContact,
  HeaderFooterTemplate,
  Stamp,
  DeliveryRecord
} from "./src/types.js";

// Load seeded/persisted DB
import { DatabaseSchema as dbSchema } from "./src/server/db.js";
// Since we exported 'db' implicitly, let's load db from the file directly or require it
const DB_PATH = path.resolve("./db.json");

function getDb() {
  if (fs.existsSync(DB_PATH)) {
    try {
      const content = fs.readFileSync(DB_PATH, "utf-8").trim();
      if (content) {
        const data = JSON.parse(content);
        if (data && Array.isArray(data.users)) {
          return data;
        }
      }
    } catch (e) {
      console.error("Failed to parse db.json, attempting to recover...", e);
    }
  }
  try {
    // Attempt to seed and save the database from db.js
    saveDatabase();
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, "utf-8").trim();
      if (content) return JSON.parse(content);
    }
  } catch (err) {
    console.error("Failed to save and load database from seed module:", err);
  }
  // Ultimate fallback to prevent crashes
  return {
    organizations: [],
    departments: [],
    positions: [],
    users: [],
    documents: [],
    document_versions: [],
    document_files: [],
    document_recipients: [],
    document_addressees: [],
    document_basis_links: [],
    document_related_links: [],
    external_resolutions: [],
    document_external_resolution_links: [],
    numbering_rules: [],
    numbering_sequences: [],
    visa_actions: [],
    resolutions: [],
    tasks: [],
    task_comments: [],
    notifications: [],
    audit_logs: [],
    external_contacts: [],
    header_footer_templates: [],
    stamps: [],
    delivery_records: []
  };
}

function saveDb(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function logAuditEvent(userId: string, userFullName: string, action: string, entityType: string, entityId: string, oldValues?: any, newValues?: any) {
  const data = getDb();
  if (!data.audit_logs) data.audit_logs = [];
  const log: AuditLog = {
    id: "audit-" + Math.random().toString(36).substring(2, 9),
    userId,
    userFullName,
    action,
    entityType,
    entityId,
    oldValues: oldValues ? JSON.stringify(oldValues) : undefined,
    newValues: newValues ? JSON.stringify(newValues) : undefined,
    timestamp: new Date().toISOString()
  };
  data.audit_logs.push(log);
  saveDb(data);
}

function createNotification(userId: string, title: string, message: string) {
  const data = getDb();
  if (!data.notifications) data.notifications = [];
  const not: Notification = {
    id: "not-" + Math.random().toString(36).substring(2, 9),
    userId,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString()
  };
  data.notifications.push(not);
  saveDb(data);
}

const app = express();
// Support generous payload limits for base64 file uploads
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

const PORT = Number(process.env.PORT) || 3000;

function assignDocumentNumber(data: any, doc: Document) {
  if (doc.documentNumber) return doc.documentNumber;

  const rule = data.numbering_rules.find((r: NumberingRule) => r.category === doc.category) || data.numbering_rules[0];
  const seq = data.numbering_sequences.find((s: any) => s.ruleId === rule.id);
  let nextNum = 100001;

  if (seq) {
    seq.currentNumber += 1;
    nextNum = seq.currentNumber;
  } else {
    data.numbering_sequences.push({
      id: "seq-" + Math.random().toString(36).substring(2, 9),
      ruleId: rule.id,
      currentNumber: nextNum,
      year: new Date().getFullYear()
    });
  }

  const paddedNum = String(nextNum).padStart(rule.sequenceLength, "0");
  const year = new Date().getFullYear();
  const yearStr = rule.yearFormat === "YYYY" ? year : rule.yearFormat === "YY" ? String(year).slice(-2) : "";
  doc.documentNumber = `${rule.prefix}${rule.separator}${yearStr}${rule.separator}${paddedNum}`.trim();
  doc.registrationNumber = doc.registrationNumber || `REG-${year}-${Math.floor(Math.random() * 90000 + 10000)}`;
  doc.registrationDate = doc.registrationDate || new Date().toISOString().split("T")[0];
  return doc.documentNumber;
}

// API Auth routes
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const data = getDb();
  const user = data.users.find((u: User) => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ message: "არასწორი ელ-ფოსტა ან პაროლი" });
  }
  const token = "jwt-mock-token-" + user.id;
  logAuditEvent(user.id, `${user.firstName} ${user.lastName}`, "LOGIN", "USER", user.id);
  res.json({ token, user });
});

app.post("/api/auth/logout", (req, res) => {
  res.json({ message: "გამოსვლა წარმატებულია" });
});

app.post("/api/auth/refresh", (req, res) => {
  res.json({ message: "ტოკენი განახლებულია" });
});

app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "ავტორიზაცია საჭიროა" });
  }
  const userId = authHeader.replace("Bearer jwt-mock-token-", "");
  const data = getDb();
  const user = data.users.find((u: User) => u.id === userId);
  if (!user) {
    return res.status(401).json({ message: "მომხმარებელი ვერ მოიძებნა" });
  }
  res.json({ user });
});

// Users endpoints
app.get("/api/users", (req, res) => {
  const data = getDb();
  res.json(data.users);
});

app.post("/api/users", (req, res) => {
  const user: User = req.body;
  const data = getDb();
  user.id = "usr-" + Math.random().toString(36).substring(2, 9);
  user.status = "ACTIVE";
  data.users.push(user);
  saveDb(data);
  res.status(201).json(user);
});

app.get("/api/users/:id", (req, res) => {
  const data = getDb();
  const user = data.users.find((u: User) => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: "მომხმარებელი ვერ მოიძებნა" });
  res.json(user);
});

app.patch("/api/users/:id", (req, res) => {
  const data = getDb();
  const idx = data.users.findIndex((u: User) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "მომხმარებელი ვერ მოიძებნა" });
  data.users[idx] = { ...data.users[idx], ...req.body };
  saveDb(data);
  res.json(data.users[idx]);
});

app.patch("/api/users/:id/deactivate", (req, res) => {
  const data = getDb();
  const idx = data.users.findIndex((u: User) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "მომხმარებელი ვერ მოიძებნა" });
  data.users[idx].status = "INACTIVE";
  saveDb(data);
  res.json(data.users[idx]);
});

// Organizations/Departments/Positions
app.get("/api/organizations", (req, res) => {
  const data = getDb();
  res.json(data.organizations);
});

app.get("/api/departments", (req, res) => {
  const data = getDb();
  res.json(data.departments);
});

app.post("/api/departments", (req, res) => {
  const data = getDb();
  const dep = { id: "dep-" + Math.random().toString(36).substring(2, 9), ...req.body };
  data.departments.push(dep);
  saveDb(data);
  res.status(201).json(dep);
});

app.patch("/api/departments/:id", (req, res) => {
  const data = getDb();
  const idx = data.departments.findIndex((d: any) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "დეპარტამენტი ვერ მოიძებნა" });
  data.departments[idx] = { ...data.departments[idx], ...req.body };
  saveDb(data);
  res.json(data.departments[idx]);
});

app.get("/api/positions", (req, res) => {
  const data = getDb();
  res.json(data.positions || []);
});

app.post("/api/positions", (req, res) => {
  const data = getDb();
  const pos = { id: "pos-" + Math.random().toString(36).substring(2, 9), ...req.body };
  if (!data.positions) data.positions = [];
  data.positions.push(pos);
  saveDb(data);
  res.status(201).json(pos);
});

app.delete("/api/positions/:id", (req, res) => {
  const data = getDb();
  if (!data.positions) data.positions = [];
  const idx = data.positions.findIndex((p: any) => p.id === req.params.id);
  if (idx !== -1) {
    data.positions.splice(idx, 1);
    saveDb(data);
  }
  res.json({ message: "პოზიცია წაიშალა" });
});

// Documents search and CRUD
app.get("/api/documents", (req, res) => {
  const data = getDb();
  let docs = [...data.documents];

  // Rich Filters Implementation
  const {
    category,
    type,
    status,
    search,
    author,
    department,
    priority,
    confidentiality,
    dateFrom,
    dateTo,
    documentNumber,
    registrationNumber,
    entryNumber,
    executor,
    externalResNumber,
    isArchived
  } = req.query;

  if (category) docs = docs.filter(d => d.category === category);
  if (type) docs = docs.filter(d => d.documentType === type);
  if (status) docs = docs.filter(d => d.status === status);
  if (priority) docs = docs.filter(d => d.priority === priority);
  if (confidentiality) docs = docs.filter(d => d.confidentiality === confidentiality);
  if (author) docs = docs.filter(d => d.authorId === author);
  if (department) docs = docs.filter(d => d.departmentId === department);

  if (isArchived === "true") {
    docs = docs.filter(d => d.archiveStatus === "ARCHIVED");
  } else if (isArchived === "false") {
    docs = docs.filter(d => d.archiveStatus !== "ARCHIVED");
  }

  if (documentNumber) docs = docs.filter(d => d.documentNumber?.includes(documentNumber as string));
  if (registrationNumber) docs = docs.filter(d => d.registrationNumber?.includes(registrationNumber as string));
  if (entryNumber) docs = docs.filter(d => d.entryNumber?.includes(entryNumber as string));

  if (dateFrom) {
    docs = docs.filter(d => d.createdAt >= (dateFrom as string));
  }
  if (dateTo) {
    docs = docs.filter(d => d.createdAt <= (dateTo as string));
  }

  if (executor) {
    // Check if tasks assigneeId matches
    const taskDocs = data.tasks.filter((t: any) => t.assigneeId === executor).map((t: any) => t.documentId);
    docs = docs.filter(d => taskDocs.includes(d.id));
  }

  if (externalResNumber) {
    const extLinks = data.document_external_resolution_links
      .filter((l: any) => {
        const ext = data.external_resolutions.find((r: any) => r.id === l.externalResolutionId);
        return ext && ext.resolutionNumber.includes(externalResNumber as string);
      })
      .map((l: any) => l.documentId);
    docs = docs.filter(d => extLinks.includes(d.id));
  }

  if (search) {
    const q = (search as string).toLowerCase();
    docs = docs.filter(
      d =>
        d.subject.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.body.toLowerCase().includes(q) ||
        d.documentNumber?.toLowerCase().includes(q) ||
        d.sender?.toLowerCase().includes(q) ||
        d.recipient?.toLowerCase().includes(q)
    );
  }

  res.json(docs);
});

app.post("/api/documents", (req, res) => {
  const data = getDb();
  const payload: Document = req.body;
  const docId = "doc-" + Math.random().toString(36).substring(2, 9);

  const newDoc: Document = {
    ...payload,
    id: docId,
    status: DocumentStatus.DRAFT,
    pageCount: payload.pageCount || 1,
    attachmentCount: payload.attachmentCount || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    archiveStatus: "ACTIVE"
  };

  data.documents.push(newDoc);

  if (req.body.signerId) {
    newDoc.status = DocumentStatus.SENT_TO_SIGN;
    newDoc.signatureStatus = "PENDING";
    data.visa_actions.push({
      id: "sign-act-" + Math.random().toString(36).substring(2, 9),
      documentId: docId,
      userId: req.body.signerId,
      role: "SIGN",
      status: VisaActionStatus.PENDING
    });
    createNotification(req.body.signerId, "ხელმოსაწერი დოკუმენტი", `დოკუმენტი ${newDoc.subject} გადმოგეცათ ხელმოსაწერად.`);
  }

  // Add initial version
  const ver: DocumentVersion = {
    id: "ver-" + Math.random().toString(36).substring(2, 9),
    documentId: docId,
    body: payload.body || "",
    versionNumber: 1,
    updatedBy: payload.authorId,
    updatedAt: new Date().toISOString()
  };
  if (!data.document_versions) data.document_versions = [];
  data.document_versions.push(ver);

  saveDb(data);

  logAuditEvent(payload.authorId, "მომხმარებელი", "CREATE_DOCUMENT", "DOCUMENT", docId);
  res.status(201).json(newDoc);
});

app.get("/api/documents/:id", (req, res) => {
  const data = getDb();
  const doc = data.documents.find((d: Document) => d.id === req.params.id);
  if (!doc) return res.status(404).json({ message: "დოკუმენტი ვერ მოიძებნა" });
  res.json(doc);
});

app.patch("/api/documents/:id", (req, res) => {
  const data = getDb();
  const idx = data.documents.findIndex((d: Document) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "დოკუმენტი ვერ მოიძებნა" });

  const doc = data.documents[idx];
  // If already signed, cannot edit metadata
  if (doc.status === DocumentStatus.SIGNED) {
    return res.status(400).json({ message: "ხელმოწერილი დოკუმენტის რედაქტირება შეუძლებელია" });
  }

  data.documents[idx] = {
    ...doc,
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  saveDb(data);
  logAuditEvent(req.body.updatedBy || "system", "მომხმარებელი", "EDIT_DOCUMENT", "DOCUMENT", doc.id);
  res.json(data.documents[idx]);
});

app.delete("/api/documents/:id/draft", (req, res) => {
  const data = getDb();
  const idx = data.documents.findIndex((d: Document) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "დოკუმენტი ვერ მოიძებნა" });

  const doc = data.documents[idx];
  if (doc.status !== DocumentStatus.DRAFT) {
    return res.status(400).json({ message: "მხოლოდ პროექტის წაშლაა შესაძლებელი" });
  }

  data.documents.splice(idx, 1);
  saveDb(data);
  res.json({ message: "პროექტი წაიშალა წარმატებით" });
});

// Document Registration
app.post("/api/documents/:id/register", (req, res) => {
  const data = getDb();
  const idx = data.documents.findIndex((d: Document) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "დოკუმენტი ვერ მოიძებნა" });

  const doc = data.documents[idx];

  doc.status = DocumentStatus.REGISTERED;
  const docNumber = assignDocumentNumber(data, doc);

  saveDb(data);
  logAuditEvent(req.body.userId || "chancellery", "რეგისტრატორი", "REGISTER_DOCUMENT", "DOCUMENT", doc.id, null, { docNumber });

  res.json(doc);
});

app.post("/api/documents/:id/send", (req, res) => {
  const data = getDb();
  const idx = data.documents.findIndex((d: Document) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "დოკუმენტი ვერ მოიძებნა" });

  const doc = data.documents[idx];
  assignDocumentNumber(data, doc);
  doc.status = DocumentStatus.SENT;
  saveDb(data);

  res.json(doc);
});

app.post("/api/documents/:id/cancel", (req, res) => {
  const data = getDb();
  const idx = data.documents.findIndex((d: Document) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "დოკუმენტი ვერ მოიძებნა" });

  data.documents[idx].status = DocumentStatus.CANCELLED;
  data.documents[idx].cancelledAt = new Date().toISOString();
  saveDb(data);
  res.json(data.documents[idx]);
});

app.post("/api/documents/:id/archive", (req, res) => {
  const data = getDb();
  const idx = data.documents.findIndex((d: Document) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "დოკუმენტი ვერ მოიძებნა" });

  data.documents[idx].archiveStatus = "ARCHIVED";
  data.documents[idx].archivedAt = new Date().toISOString();
  saveDb(data);
  res.json(data.documents[idx]);
});

app.post("/api/documents/:id/restore", (req, res) => {
  const data = getDb();
  const idx = data.documents.findIndex((d: Document) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "დოკუმენტი ვერ მოიძებნა" });

  data.documents[idx].archiveStatus = "ACTIVE";
  saveDb(data);
  res.json(data.documents[idx]);
});

app.get("/api/documents/:id/history", (req, res) => {
  const data = getDb();
  const history = data.audit_logs.filter((l: any) => l.entityId === req.params.id || (l.entityType === "TASK" && data.tasks.find((t: any) => t.id === l.entityId)?.documentId === req.params.id));
  res.json(history);
});

// Document Body & Versioning
app.get("/api/documents/:id/body", (req, res) => {
  const data = getDb();
  const doc = data.documents.find((d: Document) => d.id === req.params.id);
  if (!doc) return res.status(404).json({ message: "დოკუმენტი ვერ მოიძებნა" });
  res.json({ body: doc.body });
});

app.patch("/api/documents/:id/body", (req, res) => {
  const { body, userId } = req.body;
  const data = getDb();
  const idx = data.documents.findIndex((d: Document) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "დოკუმენტი ვერ მოიძებნა" });

  const doc = data.documents[idx];
  if (doc.status === DocumentStatus.SIGNED) {
    return res.status(400).json({ message: "ხელმოწერილი დოკუმენტის ტექსტის შეცვლა შეუძლებელია" });
  }

  const oldBody = doc.body;
  doc.body = body;
  doc.updatedAt = new Date().toISOString();

  // Create new version history
  if (!data.document_versions) data.document_versions = [];
  const versions = data.document_versions.filter((v: any) => v.documentId === req.params.id);
  const nextVer = versions.length + 1;

  const ver: DocumentVersion = {
    id: "ver-" + Math.random().toString(36).substring(2, 9),
    documentId: req.params.id,
    body,
    versionNumber: nextVer,
    updatedBy: userId || "unknown",
    updatedAt: new Date().toISOString()
  };
  data.document_versions.push(ver);

  saveDb(data);
  logAuditEvent(userId || "unknown", "ავტორი", "EDIT_BODY", "DOCUMENT", req.params.id, { body: oldBody }, { body });

  res.json({ body, version: nextVer });
});

app.get("/api/documents/:id/versions", (req, res) => {
  const data = getDb();
  const versions = data.document_versions.filter((v: any) => v.documentId === req.params.id);
  res.json(versions);
});

// Files Upload & Download
app.get("/api/documents/:id/files", (req, res) => {
  const data = getDb();
  const files = data.document_files.filter((f: any) => f.documentId === req.params.id);
  res.json(files);
});

app.post("/api/documents/:id/files", (req, res) => {
  const { filename, size, mimeType, base64Data, uploaderId, fileType } = req.body;
  const data = getDb();

  const fileId = "file-" + Math.random().toString(36).substring(2, 9);
  const newFile: DocumentFile = {
    id: fileId,
    documentId: req.params.id,
    filename,
    storageKey: base64Data, // Save base64 as key directly for simple zero-config mock database
    mimeType,
    size,
    hash: "sha256-mock-" + Math.random().toString(36).substring(2, 9),
    uploaderId: uploaderId || "system",
    uploadDate: new Date().toISOString(),
    fileType: fileType || "ATTACHMENT"
  };

  data.document_files.push(newFile);

  // Update attachment count on document
  const docIdx = data.documents.findIndex((d: any) => d.id === req.params.id);
  if (docIdx !== -1) {
    data.documents[docIdx].attachmentCount += 1;
  }

  saveDb(data);
  logAuditEvent(uploaderId || "system", "მომხმარებელი", "UPLOAD_FILE", "FILE", fileId, null, { filename });

  res.status(201).json(newFile);
});

app.get("/api/files/:id/download", (req, res) => {
  const data = getDb();
  const file = data.document_files.find((f: any) => f.id === req.params.id);
  if (!file) return res.status(404).json({ message: "ფაილი ვერ მოიძებნა" });

  logAuditEvent(req.query.userId as string || "unknown", "მომხმარებელი", "DOWNLOAD_FILE", "FILE", file.id);
  res.json({ filename: file.filename, mimeType: file.mimeType, base64Data: file.storageKey });
});

app.delete("/api/files/:id", (req, res) => {
  const data = getDb();
  const idx = data.document_files.findIndex((f: any) => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "ფაილი ვერ მოიძებნა" });

  const file = data.document_files[idx];

  // Check if document is signed
  const doc = data.documents.find((d: any) => d.id === file.documentId);
  if (doc && doc.status === DocumentStatus.SIGNED) {
    return res.status(400).json({ message: "ხელმოწერილი დოკუმენტიდან ფაილის წაშლა შეუძლებელია" });
  }

  data.document_files.splice(idx, 1);

  if (doc) {
    doc.attachmentCount = Math.max(0, doc.attachmentCount - 1);
  }

  saveDb(data);
  res.json({ message: "ფაილი წაიშალა" });
});

// Basis documents / Old document linking
app.get("/api/documents/search-basis", (req, res) => {
  const { query } = req.query;
  const data = getDb();
  if (!query) return res.json([]);
  const q = (query as string).toLowerCase();

  const results = data.documents.filter(
    (d: any) =>
      d.documentNumber?.toLowerCase().includes(q) ||
      d.registrationNumber?.toLowerCase().includes(q) ||
      d.subject.toLowerCase().includes(q)
  );
  res.json(results);
});

app.post("/api/documents/:id/basis-links", (req, res) => {
  const { basisDocumentId, relationshipType, comment, userId } = req.body;
  const data = getDb();

  const linkId = "link-" + Math.random().toString(36).substring(2, 9);
  const link: DocumentBasisLink = {
    id: linkId,
    documentId: req.params.id,
    basisDocumentId,
    relationshipType: relationshipType || "საფუძვლად გამოყენებული დოკუმენტი",
    comment,
    linkedBy: userId || "system",
    linkedAt: new Date().toISOString()
  };

  if (!data.document_basis_links) data.document_basis_links = [];
  data.document_basis_links.push(link);
  saveDb(data);

  logAuditEvent(userId || "system", "მომხმარებელი", "ADD_BASIS_LINK", "DOCUMENT", req.params.id, null, { basisDocumentId });
  res.status(201).json(link);
});

app.get("/api/documents/:id/basis-links", (req, res) => {
  const data = getDb();
  if (!data.document_basis_links) return res.json([]);
  const links = data.document_basis_links.filter((l: any) => l.documentId === req.params.id);
  res.json(links);
});

app.delete("/api/documents/:id/basis-links/:linkId", (req, res) => {
  const data = getDb();
  if (!data.document_basis_links) return res.status(404).json({ message: "ბმული ვერ მოიძებნა" });

  const idx = data.document_basis_links.findIndex((l: any) => l.id === req.params.linkId);
  if (idx === -1) return res.status(404).json({ message: "ბმული ვერ მოიძებნა" });

  data.document_basis_links.splice(idx, 1);
  saveDb(data);
  res.json({ message: "საფუძველი წაიშალა" });
});

// External Resolutions Links
app.get("/api/external-resolutions", (req, res) => {
  const data = getDb();
  res.json(data.external_resolutions || []);
});

app.post("/api/external-resolutions", (req, res) => {
  const data = getDb();
  const ext: ExternalResolution = {
    id: "ext-res-" + Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
    ...req.body
  };
  if (!data.external_resolutions) data.external_resolutions = [];
  data.external_resolutions.push(ext);
  saveDb(data);
  res.status(201).json(ext);
});

app.get("/api/external-resolutions/:id", (req, res) => {
  const data = getDb();
  const ext = data.external_resolutions?.find((r: any) => r.id === req.params.id);
  if (!ext) return res.status(404).json({ message: "გარე რეზოლუცია ვერ მოიძებნა" });
  res.json(ext);
});

app.post("/api/documents/:id/external-resolution-links", (req, res) => {
  const { externalResolutionId, relationshipType, comment, userId } = req.body;
  const data = getDb();

  const linkId = "link-ext-" + Math.random().toString(36).substring(2, 9);
  const link: DocumentExternalResolutionLink = {
    id: linkId,
    documentId: req.params.id,
    externalResolutionId,
    relationshipType: relationshipType || "გარე რეზოლუციაზე მიბმული",
    comment,
    linkedBy: userId || "system",
    linkedAt: new Date().toISOString()
  };

  if (!data.document_external_resolution_links) data.document_external_resolution_links = [];
  data.document_external_resolution_links.push(link);
  saveDb(data);

  res.status(201).json(link);
});

app.get("/api/documents/:id/external-resolution-links", (req, res) => {
  const data = getDb();
  if (!data.document_external_resolution_links) return res.json([]);
  const links = data.document_external_resolution_links.filter((l: any) => l.documentId === req.params.id);
  res.json(links);
});

app.delete("/api/documents/:id/external-resolution-links/:linkId", (req, res) => {
  const data = getDb();
  if (!data.document_external_resolution_links) return res.status(404).json({ message: "ბმული ვერ მოიძებნა" });

  const idx = data.document_external_resolution_links.findIndex((l: any) => l.id === req.params.linkId);
  if (idx === -1) return res.status(404).json({ message: "ბმული ვერ მოიძებნა" });

  data.document_external_resolution_links.splice(idx, 1);
  saveDb(data);
  res.json({ message: "გარე რეზოლუციის ბმული წაიშალა" });
});

// Recipients / Addressees
app.get("/api/recipients/search", (req, res) => {
  const { query } = req.query;
  const data = getDb();
  if (!query) return res.json(data.external_contacts);
  const q = (query as string).toLowerCase();

  const contacts = data.external_contacts.filter((c: any) => c.name.toLowerCase().includes(q) || c.organization.toLowerCase().includes(q));
  res.json(contacts);
});

app.post("/api/documents/:id/recipients", (req, res) => {
  const data = getDb();
  const rec: DocumentRecipient = {
    id: "rec-" + Math.random().toString(36).substring(2, 9),
    documentId: req.params.id,
    ...req.body
  };
  if (!data.document_recipients) data.document_recipients = [];
  data.document_recipients.push(rec);
  saveDb(data);
  res.status(201).json(rec);
});

app.get("/api/documents/:id/recipients", (req, res) => {
  const data = getDb();
  if (!data.document_recipients) return res.json([]);
  const recs = data.document_recipients.filter((r: any) => r.documentId === req.params.id);
  res.json(recs);
});

app.delete("/api/documents/:id/recipients/:recipientId", (req, res) => {
  const data = getDb();
  if (!data.document_recipients) return res.status(404).json({ message: "ადრესატი ვერ მოიძებნა" });

  const idx = data.document_recipients.findIndex((r: any) => r.id === req.params.recipientId);
  if (idx === -1) return res.status(404).json({ message: "ადრესატი ვერ მოიძებნა" });

  data.document_recipients.splice(idx, 1);
  saveDb(data);
  res.json({ message: "ადრესატი წაიშალა" });
});

// Visa routing and processes
app.get("/api/documents/:id/visa-history", (req, res) => {
  const data = getDb();
  const history = data.visa_actions.filter((a: any) => a.documentId === req.params.id);
  res.json(history);
});

app.post("/api/documents/:id/visa/send", (req, res) => {
  const { visaUsers, userId } = req.body; // array of userIds
  const data = getDb();

  const idx = data.documents.findIndex((d: Document) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "დოკუმენტი ვერ მოიძებნა" });

  data.documents[idx].status = DocumentStatus.SENT_TO_VISA;

  // Create pending visa actions
  visaUsers.forEach((vId: string) => {
    const act: VisaAction = {
      id: "visa-act-" + Math.random().toString(36).substring(2, 9),
      documentId: req.params.id,
      userId: vId,
      role: "VISA",
      status: VisaActionStatus.PENDING
    };
    data.visa_actions.push(act);
    createNotification(vId, "ვიზირების მოთხოვნა", `დოკუმენტი ${data.documents[idx].subject} გადმოგეცათ ვიზირებისთვის.`);
  });

  saveDb(data);
  logAuditEvent(userId || "system", "ავტორი", "SEND_TO_VISA", "DOCUMENT", req.params.id);

  res.json(data.documents[idx]);
});

app.post("/api/documents/:id/visa/approve", (req, res) => {
  const { userId, comment } = req.body;
  const data = getDb();

  const actIdx = data.visa_actions.findIndex((a: any) => a.documentId === req.params.id && a.userId === userId && a.status === VisaActionStatus.PENDING);
  if (actIdx === -1) return res.status(404).json({ message: "აქტიური ვიზირება ვერ მოიძებნა" });

  data.visa_actions[actIdx].status = VisaActionStatus.APPROVED;
  data.visa_actions[actIdx].comment = comment;
  data.visa_actions[actIdx].actionDate = new Date().toISOString();

  // If all visa actions for this doc are approved, change doc visaStatus
  const docVisaActs = data.visa_actions.filter((a: any) => a.documentId === req.params.id && a.role === "VISA");
  const allApproved = docVisaActs.every((a: any) => a.status === VisaActionStatus.APPROVED);

  const docIdx = data.documents.findIndex((d: any) => d.id === req.params.id);
  if (allApproved && docIdx !== -1) {
    data.documents[docIdx].status = DocumentStatus.VISA_APPROVED;
    data.documents[docIdx].visaStatus = "APPROVED";
    createNotification(data.documents[docIdx].authorId, "დოკუმენტი დავიზებულია", `თქვენი დოკუმენტი ${data.documents[docIdx].subject} წარმატებით დავიზდა.`);
  }

  saveDb(data);
  const u = data.users.find((user: any) => user.id === userId);
  logAuditEvent(userId, u ? `${u.firstName} ${u.lastName}` : "ვიზატორი", "APPROVE_VISA", "DOCUMENT", req.params.id, null, { comment });

  res.json({ message: "ვიზირება დადასტურდა" });
});

app.post("/api/documents/:id/visa/return", (req, res) => {
  const { userId, comment } = req.body;
  const data = getDb();

  const actIdx = data.visa_actions.findIndex((a: any) => a.documentId === req.params.id && a.userId === userId && a.status === VisaActionStatus.PENDING);
  if (actIdx === -1) return res.status(404).json({ message: "აქტიური ვიზირება ვერ მოიძებნა" });

  data.visa_actions[actIdx].status = VisaActionStatus.RETURNED;
  data.visa_actions[actIdx].comment = comment;
  data.visa_actions[actIdx].actionDate = new Date().toISOString();

  const docIdx = data.documents.findIndex((d: any) => d.id === req.params.id);
  if (docIdx !== -1) {
    data.documents[docIdx].status = DocumentStatus.VISA_RETURNED;
    createNotification(data.documents[docIdx].authorId, "დოკუმენტი დაბრუნებულია", `დოკუმენტი ${data.documents[docIdx].subject} დაბრუნდა შესასწორებლად.`);
  }

  saveDb(data);
  res.json({ message: "დოკუმენტი დაბრუნდა შესასწორებლად" });
});

app.post("/api/documents/:id/visa/reject", (req, res) => {
  const { userId, comment } = req.body;
  const data = getDb();

  const actIdx = data.visa_actions.findIndex((a: any) => a.documentId === req.params.id && a.userId === userId && a.status === VisaActionStatus.PENDING);
  if (actIdx === -1) return res.status(404).json({ message: "აქტიური ვიზირება ვერ მოიძებნა" });

  data.visa_actions[actIdx].status = VisaActionStatus.REJECTED;
  data.visa_actions[actIdx].comment = comment;
  data.visa_actions[actIdx].actionDate = new Date().toISOString();

  const docIdx = data.documents.findIndex((d: any) => d.id === req.params.id);
  if (docIdx !== -1) {
    data.documents[docIdx].status = DocumentStatus.REJECTED;
    createNotification(data.documents[docIdx].authorId, "დოკუმენტი უარყოფილია", `დოკუმენტი ${data.documents[docIdx].subject} უარყოფილია ვიზატორის მიერ.`);
  }

  saveDb(data);
  res.json({ message: "დოკუმენტი უარყოფილია" });
});

// Signatures workflow
app.get("/api/documents/:id/signatures", (req, res) => {
  const data = getDb();
  const sigs = data.visa_actions.filter((a: any) => a.documentId === req.params.id && a.role === "SIGN");
  res.json(sigs);
});

app.post("/api/documents/:id/signature/request", (req, res) => {
  const { signerId, userId } = req.body;
  const data = getDb();

  const idx = data.documents.findIndex((d: Document) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "დოკუმენტი ვერ მოიძებნა" });

  data.documents[idx].status = DocumentStatus.SENT_TO_SIGN;

  const act: VisaAction = {
    id: "visa-act-" + Math.random().toString(36).substring(2, 9),
    documentId: req.params.id,
    userId: signerId,
    role: "SIGN",
    status: VisaActionStatus.PENDING
  };
  data.visa_actions.push(act);
  createNotification(signerId, "ხელმოწერის მოთხოვნა", `დოკუმენტი ${data.documents[idx].subject} გადმოგეცათ ხელმოსაწერად.`);

  saveDb(data);
  res.json(data.documents[idx]);
});

app.post("/api/documents/:id/sign", (req, res) => {
  const { userId, comment } = req.body;
  const data = getDb();

  const docIdx = data.documents.findIndex((d: Document) => d.id === req.params.id);
  if (docIdx === -1) return res.status(404).json({ message: "დოკუმენტი ვერ მოიძებნა" });

  const doc = data.documents[docIdx];

  // Set action to APPROVED
  const actIdx = data.visa_actions.findIndex((a: any) => a.documentId === req.params.id && a.userId === userId && a.role === "SIGN" && a.status === VisaActionStatus.PENDING);
  if (actIdx !== -1) {
    data.visa_actions[actIdx].status = VisaActionStatus.APPROVED;
    data.visa_actions[actIdx].comment = comment;
    data.visa_actions[actIdx].actionDate = new Date().toISOString();
  }

  // Finalize document status
  doc.status = DocumentStatus.SIGNED;
  doc.signatureStatus = "SIGNED";
  doc.signedAt = new Date().toISOString();
  doc.signedById = userId;

  // Recalculate files hash if necessary
  saveDb(data);

  const u = data.users.find((user: any) => user.id === userId);
  logAuditEvent(userId, u ? `${u.firstName} ${u.lastName}` : "ხელმომწერი", "SIGN_DOCUMENT", "DOCUMENT", req.params.id);
  createNotification(doc.authorId, "დოკუმენტი ხელმოწერილია", `დოკუმენტი ${doc.subject} წარმატებით ხელმოწერილია.`);

  res.json(doc);
});

// Admin employee signatures profiles
app.get("/api/admin/users/:id/signature-profile", (req, res) => {
  const data = getDb();
  const user = data.users.find((u: any) => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: "მომხმარებელი ვერ მოიძებნა" });
  res.json({ signatureImage: user.signatureImage });
});

app.post("/api/admin/users/:id/signature-profile", (req, res) => {
  const { signatureImage } = req.body;
  const data = getDb();
  const idx = data.users.findIndex((u: any) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "მომხმარებელი ვერ მოიძებნა" });

  data.users[idx].signatureImage = signatureImage;
  saveDb(data);
  res.json({ message: "ხელმოწერა აიტვირთა" });
});

app.delete("/api/admin/users/:id/signature-profile", (req, res) => {
  const data = getDb();
  const idx = data.users.findIndex((u: any) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "მომხმარებელი ვერ მოიძებნა" });

  data.users[idx].signatureImage = undefined;
  saveDb(data);
  res.json({ message: "ხელმოწერა წაიშალა" });
});

// Headers and Footers templates admin
app.get("/api/admin/header-footer-templates", (req, res) => {
  const data = getDb();
  res.json(data.header_footer_templates || []);
});

app.post("/api/admin/header-footer-templates", (req, res) => {
  const data = getDb();
  const tpl: HeaderFooterTemplate = {
    id: "tpl-" + Math.random().toString(36).substring(2, 9),
    isDefault: false,
    ...req.body
  };
  if (!data.header_footer_templates) data.header_footer_templates = [];
  data.header_footer_templates.push(tpl);
  saveDb(data);
  res.status(201).json(tpl);
});

app.patch("/api/admin/header-footer-templates/:id", (req, res) => {
  const data = getDb();
  const idx = data.header_footer_templates.findIndex((t: any) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "ბლანკი ვერ მოიძებნა" });

  data.header_footer_templates[idx] = { ...data.header_footer_templates[idx], ...req.body };
  saveDb(data);
  res.json(data.header_footer_templates[idx]);
});

app.delete("/api/admin/header-footer-templates/:id", (req, res) => {
  const data = getDb();
  const idx = data.header_footer_templates.findIndex((t: any) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "ბლანკი ვერ მოიძებნა" });

  data.header_footer_templates.splice(idx, 1);
  saveDb(data);
  res.json({ message: "ბლანკი წაიშალა" });
});

// Stamps admin
app.get("/api/admin/stamps", (req, res) => {
  const data = getDb();
  res.json(data.stamps || []);
});

app.post("/api/admin/stamps", (req, res) => {
  const data = getDb();
  const stamp: Stamp = {
    id: "stamp-" + Math.random().toString(36).substring(2, 9),
    isActive: true,
    ...req.body
  };
  if (!data.stamps) data.stamps = [];
  data.stamps.push(stamp);
  saveDb(data);
  res.status(201).json(stamp);
});

app.patch("/api/admin/stamps/:id", (req, res) => {
  const data = getDb();
  const idx = data.stamps.findIndex((s: any) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "ბეჭედი ვერ მოიძებნა" });

  data.stamps[idx] = { ...data.stamps[idx], ...req.body };
  saveDb(data);
  res.json(data.stamps[idx]);
});

app.delete("/api/admin/stamps/:id", (req, res) => {
  const data = getDb();
  const idx = data.stamps.findIndex((s: any) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "ბეჭედი ვერ მოიძებნა" });

  data.stamps.splice(idx, 1);
  saveDb(data);
  res.json({ message: "ბეჭედი წაიშალა" });
});

// Tasks and Resolutions
app.get("/api/documents/:id/resolutions", (req, res) => {
  const data = getDb();
  const list = data.resolutions.filter((r: any) => r.documentId === req.params.id);
  res.json(list);
});

app.post("/api/documents/:id/resolutions", (req, res) => {
  const { text, creatorId, deadline } = req.body;
  const data = getDb();

  const resId = "res-" + Math.random().toString(36).substring(2, 9);
  const newRes: Resolution = {
    id: resId,
    documentId: req.params.id,
    text,
    creatorId,
    createdAt: new Date().toISOString(),
    deadline
  };

  data.resolutions.push(newRes);

  // Mark document with resolution assigned
  const docIdx = data.documents.findIndex((d: any) => d.id === req.params.id);
  if (docIdx !== -1) {
    data.documents[docIdx].status = DocumentStatus.RESOLUTION_ASSIGNED;
  }

  saveDb(data);
  logAuditEvent(creatorId, "მენეჯერი", "CREATE_RESOLUTION", "RESOLUTION", resId, null, { text });

  res.status(201).json(newRes);
});

app.get("/api/tasks", (req, res) => {
  const data = getDb();
  res.json(data.tasks || []);
});

app.post("/api/resolutions/:id/tasks", (req, res) => {
  const { assigneeId, coAssignees, deadline, description, createdBy, documentId } = req.body;
  const data = getDb();

  const tskId = "tsk-" + Math.random().toString(36).substring(2, 9);
  const newTask: Task = {
    id: tskId,
    documentId,
    resolutionId: req.params.id,
    assigneeId,
    coAssignees: coAssignees || [],
    status: TaskStatus.ASSIGNED,
    deadline,
    description,
    createdBy,
    createdAt: new Date().toISOString(),
    completionFiles: []
  };

  data.tasks.push(newTask);

  // Send notification to assignee
  createNotification(assigneeId, "ახალი დავალება", `თქვენ დაგეკისრათ დავალება: ${description}`);

  saveDb(data);
  logAuditEvent(createdBy, "მენეჯერი", "CREATE_TASK", "TASK", tskId, null, { description });

  res.status(201).json(newTask);
});

app.get("/api/tasks/:id", (req, res) => {
  const data = getDb();
  const tsk = data.tasks.find((t: any) => t.id === req.params.id);
  if (!tsk) return res.status(404).json({ message: "დავალება ვერ მოიძებნა" });
  res.json(tsk);
});

app.patch("/api/tasks/:id", (req, res) => {
  const data = getDb();
  const idx = data.tasks.findIndex((t: any) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "დავალება ვერ მოიძებნა" });

  data.tasks[idx] = { ...data.tasks[idx], ...req.body };
  saveDb(data);
  res.json(data.tasks[idx]);
});

app.post("/api/tasks/:id/complete", (req, res) => {
  const { completionText, completionFiles } = req.body;
  const data = getDb();

  const idx = data.tasks.findIndex((t: any) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "დავალება ვერ მოიძებნა" });

  const tsk = data.tasks[idx];
  tsk.status = TaskStatus.COMPLETED;
  tsk.completionText = completionText;
  tsk.completionFiles = completionFiles || [];
  tsk.completedAt = new Date().toISOString();

  // Send notification to task creator
  createNotification(tsk.createdBy, "დავალება შესრულდა", `შემსრულებელმა დაასრულა დავალება: ${tsk.description}`);

  saveDb(data);
  logAuditEvent(tsk.assigneeId, "შემსრულებელი", "COMPLETE_TASK", "TASK", tsk.id);

  res.json(tsk);
});

app.post("/api/tasks/:id/return", (req, res) => {
  const { returnedReason } = req.body;
  const data = getDb();

  const idx = data.tasks.findIndex((t: any) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "დავალება ვერ მოიძებნა" });

  const tsk = data.tasks[idx];
  tsk.status = TaskStatus.RETURNED;
  tsk.returnedReason = returnedReason;

  createNotification(tsk.assigneeId, "დავალება დაბრუნდა", `დავალება დაგიბრუნდათ შესასწორებლად: ${returnedReason}`);

  saveDb(data);
  res.json(tsk);
});

// Notifications
app.get("/api/notifications", (req, res) => {
  const { userId } = req.query;
  const data = getDb();
  let list = data.notifications || [];
  if (userId) {
    list = list.filter((n: any) => n.userId === userId);
  }
  res.json(list);
});

app.post("/api/notifications/:id/read", (req, res) => {
  const data = getDb();
  const idx = data.notifications.findIndex((n: any) => n.id === req.params.id);
  if (idx !== -1) {
    data.notifications[idx].read = true;
    saveDb(data);
  }
  res.json({ success: true });
});

// Reports endpoints
app.get("/api/reports/documents", (req, res) => {
  const data = getDb();
  // Group by category, status, type
  const docs = data.documents;
  const report = {
    total: docs.length,
    incoming: docs.filter((d: any) => d.category === DocumentCategory.INCOMING).length,
    outgoing: docs.filter((d: any) => d.category === DocumentCategory.OUTGOING).length,
    internal: docs.filter((d: any) => d.category === DocumentCategory.INTERNAL).length,
    drafts: docs.filter((d: any) => d.status === DocumentStatus.DRAFT).length,
    registered: docs.filter((d: any) => d.status === DocumentStatus.REGISTERED).length,
    signed: docs.filter((d: any) => d.status === DocumentStatus.SIGNED).length,
    archived: docs.filter((d: any) => d.archiveStatus === "ARCHIVED").length,
    byType: {
      LETTER: docs.filter((d: any) => d.documentType === DocumentType.LETTER).length,
      REQUEST: docs.filter((d: any) => d.documentType === DocumentType.REQUEST).length,
      APPLICATION: docs.filter((d: any) => d.documentType === DocumentType.APPLICATION).length,
      ORDER: docs.filter((d: any) => d.documentType === DocumentType.ORDER).length,
      MEMO: docs.filter((d: any) => d.documentType === DocumentType.MEMO).length,
      REPORT: docs.filter((d: any) => d.documentType === DocumentType.REPORT).length,
      CERTIFICATE: docs.filter((d: any) => d.documentType === DocumentType.CERTIFICATE).length,
      CONTRACT: docs.filter((d: any) => d.documentType === DocumentType.CONTRACT).length,
      OTHER: docs.filter((d: any) => d.documentType === DocumentType.OTHER).length
    }
  };
  res.json(report);
});

app.get("/api/reports/tasks", (req, res) => {
  const data = getDb();
  const tasks = data.tasks || [];
  const report = {
    total: tasks.length,
    new: tasks.filter((t: any) => t.status === TaskStatus.NEW || t.status === TaskStatus.ASSIGNED).length,
    inProgress: tasks.filter((t: any) => t.status === TaskStatus.PROGRESS).length,
    completed: tasks.filter((t: any) => t.status === TaskStatus.COMPLETED).length,
    returned: tasks.filter((t: any) => t.status === TaskStatus.RETURNED).length,
    overdue: tasks.filter((t: any) => t.status === TaskStatus.OVERDUE || (t.deadline && t.deadline < new Date().toISOString() && t.status !== TaskStatus.COMPLETED)).length
  };
  res.json(report);
});

app.get("/api/reports/overdue", (req, res) => {
  const data = getDb();
  const tasks = data.tasks || [];
  const overdue = tasks.filter((t: any) => t.deadline && t.deadline < new Date().toISOString() && t.status !== TaskStatus.COMPLETED);
  res.json(overdue);
});

app.get("/api/reports/workload", (req, res) => {
  const data = getDb();
  const users = data.users;
  const tasks = data.tasks || [];

  const workload = users.map((u: any) => {
    const userTasks = tasks.filter((t: any) => t.assigneeId === u.id);
    return {
      userId: u.id,
      fullName: `${u.firstName} ${u.lastName}`,
      departmentId: u.departmentId,
      totalTasks: userTasks.length,
      completedTasks: userTasks.filter((t: any) => t.status === TaskStatus.COMPLETED).length,
      pendingTasks: userTasks.filter((t: any) => t.status !== TaskStatus.COMPLETED).length
    };
  });
  res.json(workload);
});

app.get("/api/audit-logs", (req, res) => {
  const data = getDb();
  res.json((data.audit_logs || []).reverse());
});

// Admin rules and settings
app.get("/api/admin/settings", (req, res) => {
  res.json({
    appName: "DocFlow Georgia",
    language: "ka",
    logoText: "ელექტრონული დოკუმენტბრუნვა",
    allowedMimeTypes: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg", "application/zip"],
    maxFileSizeMb: 10
  });
});

app.get("/api/admin/numbering-rules", (req, res) => {
  const data = getDb();
  res.json(data.numbering_rules || []);
});

app.post("/api/admin/numbering-rules", (req, res) => {
  const data = getDb();
  const rule: NumberingRule = {
    id: "rule-" + Math.random().toString(36).substring(2, 9),
    ...req.body
  };
  if (!data.numbering_rules) data.numbering_rules = [];
  data.numbering_rules.push(rule);
  saveDb(data);
  res.status(201).json(rule);
});

app.patch("/api/admin/numbering-rules/:id", (req, res) => {
  const data = getDb();
  const idx = data.numbering_rules.findIndex((r: any) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "წესი ვერ მოიძებნა" });

  data.numbering_rules[idx] = { ...data.numbering_rules[idx], ...req.body };
  saveDb(data);
  res.json(data.numbering_rules[idx]);
});

// External contacts admin registry
app.get("/api/admin/external-contacts", (req, res) => {
  const data = getDb();
  res.json(data.external_contacts || []);
});

app.post("/api/admin/external-contacts", (req, res) => {
  const data = getDb();
  const contact: ExternalContact = {
    id: "cont-" + Math.random().toString(36).substring(2, 9),
    ...req.body
  };
  if (!data.external_contacts) data.external_contacts = [];
  data.external_contacts.push(contact);
  saveDb(data);
  res.status(201).json(contact);
});

app.patch("/api/admin/external-contacts/:id", (req, res) => {
  const data = getDb();
  const idx = data.external_contacts.findIndex((c: any) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "კონტაქტი ვერ მოიძებნა" });

  data.external_contacts[idx] = { ...data.external_contacts[idx], ...req.body };
  saveDb(data);
  res.json(data.external_contacts[idx]);
});

app.delete("/api/admin/external-contacts/:id", (req, res) => {
  const data = getDb();
  const idx = data.external_contacts.findIndex((c: any) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "კონტაქტი ვერ მოიძებნა" });

  data.external_contacts.splice(idx, 1);
  saveDb(data);
  res.json({ message: "კონტაქტი წაიშალა" });
});

// Vite Middleware for client side hot reload integration or static production asset serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DocFlow Georgia Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
