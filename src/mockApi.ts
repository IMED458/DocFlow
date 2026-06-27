import seedDb from "../db.json";

type Db = Record<string, any[]>;

const STORAGE_KEY = "docflow-georgia-static-db";

const collectionByApiName: Record<string, string> = {
  organizations: "organizations",
  departments: "departments",
  positions: "positions",
  users: "users",
  documents: "documents",
  tasks: "tasks",
  notifications: "notifications",
  "audit-logs": "audit_logs",
  "external-contacts": "external_contacts",
  "numbering-rules": "numbering_rules",
  stamps: "stamps",
  "header-footer-templates": "header_footer_templates",
  "external-resolutions": "external_resolutions",
};

function shouldUseMockApi() {
  return import.meta.env.VITE_STATIC_API === "true" || location.hostname.endsWith("github.io");
}

function readDb(): Db {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  const fresh = structuredClone(seedDb) as Db;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

function writeDb(db: Db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

async function readBody(init?: RequestInit) {
  if (!init?.body) return {};
  if (typeof init.body === "string") {
    try {
      return JSON.parse(init.body);
    } catch {
      return {};
    }
  }
  return {};
}

function nextId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function assignDocumentNumber(db: Db, doc: any) {
  if (doc.documentNumber) return;
  const year = new Date().getFullYear();
  const prefix = doc.category === "INCOMING" ? "IN" : doc.category === "OUTGOING" ? "OUT" : "INT";
  const sequence = (db.documents || []).filter((item) => item.documentNumber?.startsWith(`${prefix}-${year}-`)).length + 1;
  doc.documentNumber = `${prefix}-${year}-${String(sequence).padStart(6, "0")}`;
  doc.registrationNumber = doc.registrationNumber || `REG-${year}-${String(sequence).padStart(6, "0")}`;
  doc.registrationDate = doc.registrationDate || new Date().toISOString().split("T")[0];
}

function getCurrentUserId(request: Request) {
  const auth = request.headers.get("Authorization") || "";
  return auth.replace("Bearer jwt-mock-token-", "") || "usr-admin";
}

function filterDocuments(documents: any[], url: URL) {
  const q = url.searchParams.get("q")?.toLowerCase();
  const status = url.searchParams.get("status");
  const category = url.searchParams.get("category");
  return documents.filter((doc) => {
    if (q && !`${doc.subject} ${doc.description} ${doc.documentNumber || ""}`.toLowerCase().includes(q)) return false;
    if (status && status !== "ALL" && doc.status !== status) return false;
    if (category && category !== "ALL" && doc.category !== category) return false;
    return true;
  });
}

function collectionResponse(db: Db, apiName: string, url: URL) {
  const key = collectionByApiName[apiName];
  if (!key) return null;
  const rows = db[key] || [];
  return apiName === "documents" ? filterDocuments(rows, url) : rows;
}

async function handleApi(request: Request, init?: RequestInit) {
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const method = (init?.method || request.method || "GET").toUpperCase();
  const db = readDb();
  const userId = getCurrentUserId(request);

  if (parts[0] === "auth" && parts[1] === "login" && method === "POST") {
    const body = await readBody(init);
    const user = db.users.find((u) => u.email === body.email && (!u.password || u.password === body.password));
    if (!user) return json({ message: "არასწორი ელ-ფოსტა ან პაროლი" }, { status: 401 });
    return json({ token: `jwt-mock-token-${user.id}`, user });
  }

  if (parts[0] === "auth" && parts[1] === "me") {
    const user = db.users.find((u) => u.id === userId);
    return user ? json({ user }) : json({ message: "მომხმარებელი ვერ მოიძებნა" }, { status: 401 });
  }

  if (parts[0] === "auth") return json({ ok: true });

  if (parts[0] === "reports") return json([]);
  if (parts[0] === "recipients" && parts[1] === "search") return json(db.users || []);
  if (parts[0] === "admin" && parts[1] === "settings") return json({ appName: "DocFlow Georgia" });

  if (parts[0] === "admin" && parts[1] === "users" && parts[3] === "signature-profile") {
    const user = db.users.find((u) => u.id === parts[2]);
    if (!user) return json({ message: "მომხმარებელი ვერ მოიძებნა" }, { status: 404 });
    if (method === "GET") return json({ signatureImage: user.signatureImage });
    if (method === "POST") {
      user.signatureImage = (await readBody(init)).signatureImage;
      writeDb(db);
      return json({ message: "ხელმოწერა აიტვირთა" });
    }
    if (method === "DELETE") {
      delete user.signatureImage;
      writeDb(db);
      return json({ message: "ხელმოწერა წაიშალა" });
    }
  }

  const collectionName = parts[0] === "admin" ? parts[1] : parts[0];
  const collectionKey = collectionByApiName[collectionName];

  if (parts[0] === "notifications" && parts[1] === "clear" && method === "POST") {
    db.notifications = [];
    writeDb(db);
    return json({ ok: true });
  }

  if (parts[0] === "notifications" && parts[2] === "read" && method === "POST") {
    const item = db.notifications.find((n) => n.id === parts[1]);
    if (item) item.read = true;
    writeDb(db);
    return json(item || { ok: true });
  }

  if (parts[0] === "documents") {
    const docId = parts[1];
    const doc = db.documents.find((d) => d.id === docId);

    if (method === "GET" && parts.length === 1) return json(filterDocuments(db.documents || [], url));
    if (method === "POST" && parts.length === 1) {
      const body = await readBody(init);
      const now = new Date().toISOString();
      const created = {
        ...body,
        id: nextId("doc"),
        status: body.status || "DRAFT",
        body: body.body || "",
        departmentId: body.departmentId || "dep-chanc",
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      };
      db.documents.unshift(created);
      db.document_recipients.push({
        id: nextId("rec"),
        documentId: created.id,
        recipientType: "CHANCELLERY",
        recipientName: "კანცელარია",
        recipientPosition: "საქმისწარმოების სამსახური",
        deliveryMethod: "SYSTEM",
        status: "PENDING",
        createdAt: now,
      });
      if (body.signerId) {
        created.status = "SENT_TO_SIGN";
        created.signatureStatus = "PENDING";
        db.visa_actions.push({
          id: nextId("sign-act"),
          documentId: created.id,
          userId: body.signerId,
          role: "SIGN",
          status: "PENDING",
        });
      }
      writeDb(db);
      return json(created, { status: 201 });
    }
    if (!doc) return json({ message: "დოკუმენტი ვერ მოიძებნა" }, { status: 404 });
    if (method === "GET" && parts.length === 2) return json(doc);
    if (method === "PATCH" && parts.length === 2) {
      Object.assign(doc, await readBody(init), { updatedBy: userId, updatedAt: new Date().toISOString() });
      writeDb(db);
      return json(doc);
    }
    if (parts[2] === "body") {
      if (method === "GET") return json({ body: doc.body || "" });
      if (method === "PATCH") {
        doc.body = (await readBody(init)).body || "";
        writeDb(db);
        return json({ body: doc.body });
      }
    }
    if (parts[2] === "files") return json(db.document_files.filter((f) => f.documentId === docId));
    if (parts[2] === "recipients" && method === "GET") return json(db.document_recipients.filter((r) => r.documentId === docId));
    if (parts[2] === "recipients" && method === "POST") {
      const created = { ...(await readBody(init)), id: nextId("rec"), documentId: docId };
      db.document_recipients.push(created);
      writeDb(db);
      return json(created, { status: 201 });
    }
    if (parts[2] === "recipients" && method === "DELETE") {
      db.document_recipients = db.document_recipients.filter((r) => r.id !== parts[3]);
      writeDb(db);
      return json({ ok: true });
    }
    if (parts[2] === "basis-links") return json(db.document_basis_links.filter((r) => r.documentId === docId));
    if (parts[2] === "versions") return json(db.document_versions.filter((v) => v.documentId === docId));
    if (parts[2] === "visa-history") return json(db.visa_actions.filter((v) => v.documentId === docId));
    if (parts[2] === "resolutions") return json(db.resolutions.filter((r) => r.documentId === docId));
    if (method === "POST" && parts[2] === "visa" && parts[3] === "send") {
      const body = await readBody(init);
      doc.status = "SENT_TO_VISA";
      doc.visaStatus = "PENDING";
      (body.visaUsers || []).forEach((visaUserId: string) => {
        db.visa_actions.push({
          id: nextId("visa-act"),
          documentId: docId,
          userId: visaUserId,
          role: "VISA",
          status: "PENDING",
        });
      });
      writeDb(db);
      return json(doc);
    }
    if (method === "POST" && parts[2] === "visa" && ["approve", "return", "reject"].includes(parts[3])) {
      const action = db.visa_actions.find((item) => item.documentId === docId && item.userId === userId && item.role === "VISA" && item.status === "PENDING");
      if (action) {
        action.status = parts[3] === "approve" ? "APPROVED" : parts[3] === "return" ? "RETURNED" : "REJECTED";
        action.actionDate = new Date().toISOString();
      }
      const allVisaApproved = db.visa_actions
        .filter((item) => item.documentId === docId && item.role === "VISA")
        .every((item) => item.status === "APPROVED");
      doc.status = parts[3] === "approve" && allVisaApproved ? "SENT_TO_SIGN" : parts[3] === "approve" ? "SENT_TO_VISA" : parts[3] === "return" ? "VISA_RETURNED" : "REJECTED";
      doc.visaStatus = parts[3] === "approve" ? "APPROVED" : parts[3] === "return" ? "RETURNED" : "REJECTED";
      if (parts[3] === "approve" && allVisaApproved) {
        doc.signatureStatus = "PENDING";
        const hasAuthorSign = db.visa_actions.some((item) => item.documentId === docId && item.userId === doc.authorId && item.role === "SIGN" && item.status === "PENDING");
        if (!hasAuthorSign) {
          db.visa_actions.push({
            id: nextId("sign-act"),
            documentId: docId,
            userId: doc.authorId,
            role: "SIGN",
            status: "PENDING",
          });
        }
      }
      writeDb(db);
      return json(doc);
    }
    if (method === "POST" && parts[2] === "signature" && parts[3] === "request") {
      const body = await readBody(init);
      const targetSignerId = body.signerId || doc.authorId;
      doc.status = "SENT_TO_SIGN";
      doc.signatureStatus = "PENDING";
      const hasPending = db.visa_actions.some((item) => item.documentId === docId && item.userId === targetSignerId && item.role === "SIGN" && item.status === "PENDING");
      if (hasPending) {
        writeDb(db);
        return json(doc);
      }
      db.visa_actions.push({
        id: nextId("sign-act"),
        documentId: docId,
        userId: targetSignerId,
        role: "SIGN",
        status: "PENDING",
      });
      writeDb(db);
      return json(doc);
    }
    if (method === "POST") {
      const statusByAction: Record<string, string> = {
        register: "REGISTERED",
        send: "SENT",
        cancel: "CANCELLED",
        archive: "ARCHIVED",
        restore: "REGISTERED",
        "send-to-visa": "ON_VISA",
        "visa-action": "VISA_APPROVED",
        "request-signature": "SENT_TO_SIGN",
        sign: "SIGNED",
      };
      if (parts[2] === "send" || parts[2] === "register") assignDocumentNumber(db, doc);
      if (parts[2] === "sign") doc.signedById = userId;
      doc.status = statusByAction[parts[2]] || doc.status;
      doc.updatedAt = new Date().toISOString();
      writeDb(db);
      return json(doc);
    }
  }

  if (collectionKey) {
    const idIndex = parts[0] === "admin" ? 2 : 1;
    const id = parts[idIndex];
    if (method === "GET" && !id) return json(collectionResponse(db, collectionName, url));
    if (method === "POST" && !id) {
      const body = await readBody(init);
      const created = { ...body, id: body.id || nextId(collectionName) };
      db[collectionKey].push(created);
      writeDb(db);
      return json(created, { status: 201 });
    }
    const item = db[collectionKey].find((row) => row.id === id);
    if (!item) return json({ message: "ჩანაწერი ვერ მოიძებნა" }, { status: 404 });
    if (method === "GET") return json(item);
    if (method === "PATCH") {
      Object.assign(item, await readBody(init));
      writeDb(db);
      return json(item);
    }
    if (method === "DELETE") {
      db[collectionKey] = db[collectionKey].filter((row) => row.id !== id);
      writeDb(db);
      return json({ ok: true });
    }
  }

  return json({ ok: true });
}

export function installMockApi() {
  if (!shouldUseMockApi()) return;

  const realFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, init);
    }
    return realFetch(input, init);
  };
}
