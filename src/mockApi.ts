import seedDb from "../db.json";
import { firebaseConfig } from "./firebase";

type Db = Record<string, any[]>;

const SYNC_EVENT_NAME = "docflow:data-changed";
const SYNC_CHANNEL_NAME = "docflow-georgia-sync";
const SYNC_STORAGE_KEY = "docflow-georgia-sync-pulse";
const syncChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(SYNC_CHANNEL_NAME) : null;

const defaultDocumentTypes = [
  { id: "LETTER", label: "წერილი", isActive: true },
  { id: "REQUEST", label: "მოთხოვნა", isActive: true },
  { id: "APPLICATION", label: "განცხადება", isActive: true },
  { id: "ORDER", label: "ბრძანება", isActive: true },
  { id: "MEMO", label: "მოხსენებითი ბარათი", isActive: true },
  { id: "REPORT", label: "ანგარიში", isActive: true },
  { id: "CERTIFICATE", label: "ცნობა", isActive: true },
  { id: "CONTRACT", label: "ხელშეკრულება", isActive: true },
  { id: "RESOLUTION", label: "რეზოლუცია", isActive: true },
  { id: "OTHER", label: "სხვა", isActive: true },
];

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
  "document-types": "document_types",
};

// ყველა კოლექცია, რომელიც Firestore-ში ინახება (db.json-ის გასაღებები + document_types).
const ALL_COLLECTIONS = [
  "organizations", "departments", "positions", "users", "documents",
  "document_versions", "document_files", "document_recipients", "document_addressees",
  "document_basis_links", "document_related_links", "external_resolutions",
  "document_external_resolution_links", "numbering_rules", "numbering_sequences",
  "visa_actions", "resolutions", "tasks", "task_comments", "notifications",
  "audit_logs", "external_contacts", "header_footer_templates", "stamps",
  "delivery_records", "document_types",
];

const FIRESTORE_LOAD_TIMEOUT_MS = 4500;
const FIRESTORE_REFRESH_INTERVAL_MS = 5000;
const FIRESTORE_BATCH_SIZE = 400;
const FIRESTORE_DOCUMENTS_BASE =
  `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
const FIRESTORE_API_KEY_PARAM = `key=${encodeURIComponent(firebaseConfig.apiKey)}`;

// მონაცემები ინახება Firestore-ში; ბრაუზერში ვაკეშირებთ მეხსიერებაში სწრაფი წვდომისთვის.
function shouldUseMockApi() {
  return (
    import.meta.env.VITE_STATIC_API === "true" ||
    import.meta.env.PROD ||
    location.hostname.endsWith("github.io")
  );
}

let cache: Db | null = null;
let loadPromise: Promise<Db> | null = null;
let lastRemoteLoadAt = 0;
// ბოლოს დასინქრონებული მდგომარეობა — id → JSON (მინიმალური ჩაწერებისთვის).
const synced: Record<string, Map<string, string>> = {};

function emptyDb(): Db {
  const d: Db = {};
  for (const name of ALL_COLLECTIONS) d[name] = [];
  return d;
}

function normalizeSeed(): Db {
  const seed = structuredClone(seedDb) as Db;
  for (const name of ALL_COLLECTIONS) if (!Array.isArray(seed[name])) seed[name] = [];
  seed.document_types = seed.document_types?.length ? seed.document_types : defaultDocumentTypes;
  return seed;
}

function snapshotAll(db: Db) {
  for (const name of ALL_COLLECTIONS) snapshotSynced(name, db[name] || []);
}

function fallbackDb(reason: unknown): Db {
  console.warn("Firestore დროულად არ ჩაიტვირთა; დროებით ვიყენებთ საწყის მონაცემებს", reason);
  const seed = normalizeSeed();
  snapshotAll(seed);
  return seed;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`Firestore load timeout after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function firestoreDocumentName(collectionName: string, id: string) {
  return `projects/${firebaseConfig.projectId}/databases/(default)/documents/${encodeURIComponent(collectionName)}/${encodeURIComponent(id)}`;
}

function firestoreCollectionUrl(collectionName: string, pageToken?: string) {
  const params = new URLSearchParams({ key: firebaseConfig.apiKey, pageSize: "1000" });
  if (pageToken) params.set("pageToken", pageToken);
  return `${FIRESTORE_DOCUMENTS_BASE}/${encodeURIComponent(collectionName)}?${params.toString()}`;
}

function firestoreCommitUrl() {
  return `${FIRESTORE_DOCUMENTS_BASE}:commit?${FIRESTORE_API_KEY_PARAM}`;
}

function toFirestoreValue(value: any): any {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "object") return { mapValue: { fields: toFirestoreFields(value) } };
  return { stringValue: String(value) };
}

function toFirestoreFields(row: any) {
  return Object.fromEntries(
    Object.entries(JSON.parse(JSON.stringify(row))).map(([key, value]) => [key, toFirestoreValue(value)])
  );
}

function fromFirestoreValue(value: any): any {
  if (!value || "nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in value) return fromFirestoreFields(value.mapValue.fields || {});
  return null;
}

function fromFirestoreFields(fields: Record<string, any> = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)]));
}

async function firestoreRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Firestore REST ${response.status}: ${text || response.statusText}`);
  }
  if (response.status === 204) return {};
  return response.json();
}

function snapshotSynced(name: string, rows: any[]) {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row?.id == null) continue;
    map.set(String(row.id), JSON.stringify(row));
  }
  synced[name] = map;
}

async function writeRowsToFirestore(name: string, rows: any[]) {
  for (let i = 0; i < rows.length; i += FIRESTORE_BATCH_SIZE) {
    const writes = rows.slice(i, i + FIRESTORE_BATCH_SIZE)
      .filter((row) => row?.id != null)
      .map((row) => ({
        update: {
          name: firestoreDocumentName(name, String(row.id)),
          fields: toFirestoreFields(row),
        },
      }));
    if (writes.length) {
      await firestoreRequest(firestoreCommitUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writes }),
      });
    }
  }
}

async function seedFirestore(seed: Db) {
  for (const name of ALL_COLLECTIONS) {
    await writeRowsToFirestore(name, seed[name] || []);
    snapshotSynced(name, seed[name] || []);
  }
}

async function loadFromFirestore(): Promise<Db> {
  const result = emptyDb();
  await Promise.all(
    ALL_COLLECTIONS.map(async (name) => {
      const rows: any[] = [];
      let pageToken: string | undefined;
      do {
        const data = await firestoreRequest(firestoreCollectionUrl(name, pageToken));
        rows.push(...(data.documents || []).map((doc: any) => fromFirestoreFields(doc.fields || {})));
        pageToken = data.nextPageToken;
      } while (pageToken);
      result[name] = rows;
      snapshotSynced(name, result[name]);
    })
  );
  const userCount = result.users.length;

  // პირველი გაშვება — ცარიელი Firestore → ვთესავთ საწყის მონაცემებს.
  if (userCount === 0) {
    const seed = normalizeSeed();
    await seedFirestore(seed);
    return seed;
  }

  // document_types აუცილებელია; თუ ცარიელია, ვავსებთ ნაგულისხმევით.
  if (!result.document_types || result.document_types.length === 0) {
    result.document_types = defaultDocumentTypes;
    await writeRowsToFirestore("document_types", defaultDocumentTypes);
    snapshotSynced("document_types", defaultDocumentTypes);
  }
  return result;
}

async function ensureLoaded(refresh = false): Promise<Db> {
  const refreshIsStale = refresh && cache && Date.now() - lastRemoteLoadAt >= FIRESTORE_REFRESH_INTERVAL_MS;
  if (cache && !refreshIsStale) return cache;
  if (!loadPromise) {
    loadPromise = withTimeout(loadFromFirestore(), FIRESTORE_LOAD_TIMEOUT_MS)
      .then((db) => {
        cache = db;
        lastRemoteLoadAt = Date.now();
        return db;
      })
      .catch((e) => {
        if (cache) return cache;
        cache = fallbackDb(e);
        return cache;
      })
      .finally(() => {
        loadPromise = null;
      });
  }
  return loadPromise;
}

// ცვლილებების Firestore-ში ჩაწერა — სერიულად, მხოლოდ ცვლილებები.
let writeChain: Promise<void> = Promise.resolve();

function notifyDataChanged() {
  window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: { at: Date.now() } }));
  syncChannel?.postMessage({ type: "data-changed", at: Date.now() });
  try {
    localStorage.setItem(SYNC_STORAGE_KEY, String(Date.now()));
  } catch {
    /* cross-tab storage pulse is optional */
  }
}

async function writeDb(db: Db) {
  const snapshot = structuredClone(db) as Db;
  cache = snapshot;
  const pendingWrite = writeChain.catch(() => undefined).then(() => persistChanges(snapshot));
  writeChain = pendingWrite.catch(() => undefined);
  await pendingWrite;
  notifyDataChanged();
}

async function persistChanges(db: Db) {
  for (const name of ALL_COLLECTIONS) {
    const rows = db[name] || [];
    const prev = synced[name] || new Map<string, string>();
    const next = new Map<string, string>();
    const ops: Array<{ type: "set" | "del"; id: string; data?: any }> = [];

    for (const row of rows) {
      if (row?.id == null) continue;
      const id = String(row.id);
      const json = JSON.stringify(row);
      next.set(id, json);
      if (prev.get(id) !== json) ops.push({ type: "set", id, data: JSON.parse(json) });
    }
    for (const id of prev.keys()) {
      if (!next.has(id)) ops.push({ type: "del", id });
    }
    if (ops.length === 0) { synced[name] = next; continue; }

    for (let i = 0; i < ops.length; i += FIRESTORE_BATCH_SIZE) {
      const writes = ops.slice(i, i + FIRESTORE_BATCH_SIZE).map((op) => (
        op.type === "set"
          ? {
              update: {
                name: firestoreDocumentName(name, op.id),
                fields: toFirestoreFields(op.data),
              },
            }
          : { delete: firestoreDocumentName(name, op.id) }
      ));
      await firestoreRequest(firestoreCommitUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writes }),
      });
    }
    synced[name] = next;
  }
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
  const rule = (db.numbering_rules || []).find((item: any) =>
    (!item.documentType || item.documentType === doc.documentType) &&
    (!item.category || item.category === doc.category) &&
    (!item.departmentId || item.departmentId === doc.departmentId)
  ) || (db.numbering_rules || [])[0];
  const prefix = rule?.prefix || (doc.category === "INCOMING" ? "IN" : doc.category === "OUTGOING" ? "OUT" : "INT");
  const separator = rule?.separator ?? "-";
  const yearPart = rule?.yearFormat === "NONE" ? "" : rule?.yearFormat === "YY" ? String(year).slice(-2) : String(year);
  const sequenceLength = Number(rule?.sequenceLength || 6);
  const ruleId = rule?.id || `${prefix}-${doc.category || "ALL"}-${doc.documentType || "ALL"}`;
  db.numbering_sequences = db.numbering_sequences || [];
  let sequence = db.numbering_sequences.find((item: any) => item.ruleId === ruleId && item.year === year);
  if (!sequence) {
    const usedNumbers = (db.documents || [])
      .map((item: any) => item.documentNumber)
      .filter((value: any) => typeof value === "string" && value.startsWith([prefix, yearPart].filter(Boolean).join(separator)));
    sequence = { id: nextId("seq"), ruleId, currentNumber: usedNumbers.length, year };
    db.numbering_sequences.push(sequence);
  }
  let next = Number(sequence.currentNumber || 0);
  let candidate = "";
  do {
    next += 1;
    const serial = String(next).padStart(sequenceLength, "0");
    candidate = [prefix, yearPart, serial].filter(Boolean).join(separator);
  } while ((db.documents || []).some((item: any) => item.id !== doc.id && item.documentNumber === candidate));
  sequence.currentNumber = next;
  doc.documentNumber = candidate;
  doc.registrationNumber = doc.registrationNumber || `REG-${year}-${String(next).padStart(sequenceLength, "0")}`;
  doc.registrationDate = doc.registrationDate || new Date().toISOString().split("T")[0];
}

function assignInternalNumber(db: Db, doc: any) {
  if (doc.entryNumber) return;
  const year = new Date().getFullYear();
  const sequence = (db.documents || []).filter((item) => item.createdAt?.startsWith(String(year))).length + 1;
  doc.entryNumber = String(sequence).padStart(6, "0");
  doc.documentDate = doc.documentDate || new Date().toISOString().split("T")[0];
}

function getCurrentUserId(request: Request) {
  const auth = request.headers.get("Authorization") || "";
  return auth.replace("Bearer jwt-mock-token-", "") || "usr-admin";
}

function isChancelleryUser(user: any, db?: Db) {
  const department = db?.departments?.find((item: any) => item.id === user?.departmentId);
  const text = [
    user?.departmentId,
    user?.departmentName,
    department?.name,
    user?.positionName,
    user?.role,
    user?.username,
  ].filter(Boolean).join(" ").toLowerCase();
  return user?.departmentId === "dep-chanc" || text.includes("კანცელარ") || text.includes("chancellery");
}

function documentAuthorIds(doc: any) {
  const ids = new Set([doc.authorId, doc.createdBy, doc.responsibleId].filter(Boolean));
  (doc.authors || []).forEach((author: any) => author.userId && ids.add(author.userId));
  return ids;
}

function visaActionsFor(db: Db, docId: string, role?: string) {
  return (db.visa_actions || []).filter((item: any) => item.documentId === docId && (!role || item.role === role));
}

function readStateFor(db: Db, docId: string, userId: string) {
  return (db.document_addressees || []).find((item: any) => item.documentId === docId && item.userId === userId)?.status;
}

function markDocumentRead(db: Db, docId: string, userId: string) {
  db.document_addressees = db.document_addressees || [];
  const now = new Date().toISOString();
  const existing = db.document_addressees.find((item: any) => item.documentId === docId && item.userId === userId);
  if (existing) {
    existing.status = "READ";
    existing.readAt = now;
    return existing;
  }
  const created = {
    id: nextId("addr"),
    documentId: docId,
    userId,
    status: "READ",
    readAt: now,
  };
  db.document_addressees.push(created);
  return created;
}

function ensureUnreadState(db: Db, docId: string, userId?: string) {
  if (!userId) return;
  db.document_addressees = db.document_addressees || [];
  const exists = db.document_addressees.some((item: any) => item.documentId === docId && item.userId === userId);
  if (!exists) {
    db.document_addressees.push({
      id: nextId("addr"),
      documentId: docId,
      userId,
      status: "UNREAD",
    });
  }
}

function notifyUser(db: Db, userId: string | undefined, title: string, message: string) {
  if (!userId) return;
  db.notifications = db.notifications || [];
  db.notifications.push({
    id: nextId("not"),
    userId,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

function activeVisaAction(db: Db, docId: string, userId: string) {
  return db.visa_actions?.find((item: any) =>
    item.documentId === docId && item.userId === userId && item.role === "VISA" && item.status === "PENDING"
  );
}

function activeSignAction(db: Db, docId: string, userId: string) {
  return db.visa_actions?.find((item: any) =>
    item.documentId === docId && item.userId === userId && item.role === "SIGN" && item.status === "PENDING"
  );
}

function ensureSignatureAction(db: Db, doc: any, signerId?: string, waitingForVisa = false) {
  const targetSignerId = signerId || doc.authorId || doc.createdBy;
  if (!targetSignerId) return;
  db.visa_actions = db.visa_actions || [];
  const existing = db.visa_actions.find((item: any) =>
    item.documentId === doc.id && item.userId === targetSignerId && item.role === "SIGN" && ["PENDING", "WAITING_FOR_VISA"].includes(item.status)
  );
  if (existing) {
    existing.status = waitingForVisa ? "WAITING_FOR_VISA" : "PENDING";
    return;
  }
  db.visa_actions.push({
    id: nextId("sign-act"),
    documentId: doc.id,
    userId: targetSignerId,
    role: "SIGN",
    status: waitingForVisa ? "WAITING_FOR_VISA" : "PENDING",
    createdAt: new Date().toISOString(),
  });
  if (!waitingForVisa) {
    ensureUnreadState(db, doc.id, targetSignerId);
    notifyUser(db, targetSignerId, "ხელმოსაწერი დოკუმენტი", `ხელმოსაწერად შემოვიდა: ${doc.subject || doc.entryNumber}`);
  }
}

function activateWaitingSignatures(db: Db, doc: any) {
  (db.visa_actions || []).forEach((item: any) => {
    if (item.documentId === doc.id && item.role === "SIGN" && item.status === "WAITING_FOR_VISA") {
      item.status = "PENDING";
      ensureUnreadState(db, doc.id, item.userId);
      notifyUser(db, item.userId, "ხელმოსაწერი დოკუმენტი", `ვიზირება დასრულდა: ${doc.subject || doc.entryNumber}`);
    }
  });
}

function activeChancelleryRecipient(db: Db, docId: string) {
  return (db.document_recipients || []).find((recipient: any) =>
    recipient.documentId === docId && recipient.recipientType === "CHANCELLERY" && recipient.status === "PENDING"
  );
}

function hasCompletedVisa(db: Db, docId: string) {
  const visas = visaActionsFor(db, docId, "VISA");
  return visas.length > 0 && visas.every((item: any) => item.status === "APPROVED");
}

function canProceedToSignature(db: Db, docId: string) {
  const visas = visaActionsFor(db, docId, "VISA");
  return visas.length === 0 || visas.every((item: any) => item.status === "APPROVED");
}

function ensureChancelleryRecipients(db: Db, doc: any) {
  db.document_recipients = db.document_recipients || [];
  db.notifications = db.notifications || [];
  const now = new Date().toISOString();
  const chancelleryUsers = (db.users || []).filter((user: any) => isChancelleryUser(user, db));
  const targetUsers = chancelleryUsers.length ? chancelleryUsers : [{ id: "dep-chanc", firstName: "კანცელარია", lastName: "" }];

  targetUsers.forEach((user: any) => {
    const exists = db.document_recipients.some((recipient: any) =>
      recipient.documentId === doc.id &&
      recipient.recipientType === "CHANCELLERY" &&
      (recipient.recipientUserId || recipient.userId || "dep-chanc") === (user.id || "dep-chanc")
    );
    if (!exists) {
      db.document_recipients.push({
        id: nextId("rec"),
        documentId: doc.id,
        recipientType: "CHANCELLERY",
        recipientUserId: user.id,
        recipientName: user.id === "dep-chanc" ? "კანცელარია" : `${user.firstName} ${user.lastName}`.trim(),
        recipientPosition: user.positionName || "საქმისწარმოების სამსახური",
        deliveryMethod: "SYSTEM",
        status: "PENDING",
        createdAt: now,
      });
      if (user.id && user.id !== "dep-chanc") {
        ensureUnreadState(db, doc.id, user.id);
        notifyUser(db, user.id, "კანცელარიაში დასამუშავებელი დოკუმენტი", `შემოვიდა: ${doc.subject || doc.documentNumber || doc.entryNumber}`);
      }
    }
  });
}

function canUserSeeDocument(db: Db, doc: any, userId: string) {
  const user = (db.users || []).find((item: any) => item.id === userId);
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (isChancelleryUser(user, db)) return true;
  if (documentAuthorIds(doc).has(userId)) return true;
  if (visaActionsFor(db, doc.id).some((item: any) => item.userId === userId)) return true;
  if ((db.document_recipients || []).some((recipient: any) =>
    recipient.documentId === doc.id && (recipient.recipientUserId === userId || recipient.userId === userId)
  )) return true;
  return false;
}

function filterDocuments(db: Db, documents: any[], url: URL, userId: string) {
  const q = (url.searchParams.get("q") || url.searchParams.get("search") || "").toLowerCase();
  const status = url.searchParams.get("status");
  const category = url.searchParams.get("category");
  const entryNumber = url.searchParams.get("entryNumber")?.toLowerCase();
  return documents.filter((doc) => {
    if (!canUserSeeDocument(db, doc, userId)) return false;
    if (q && !`${doc.subject || ""} ${doc.description || ""} ${doc.documentNumber || ""} ${doc.registrationNumber || ""} ${doc.entryNumber || ""} ${doc.body || ""}`.toLowerCase().includes(q)) return false;
    if (entryNumber && !`${doc.entryNumber || ""}`.toLowerCase().includes(entryNumber)) return false;
    if (status && status !== "ALL" && doc.status !== status) return false;
    if (category && category !== "ALL" && doc.category !== category) return false;
    return true;
  }).map((doc) => {
    const pendingVisa = !!activeVisaAction(db, doc.id, userId);
    const pendingSign = !!activeSignAction(db, doc.id, userId);
    const chancelleryPending = !!activeChancelleryRecipient(db, doc.id);
    const user = (db.users || []).find((item: any) => item.id === userId);
    const isChancellery = isChancelleryUser(user, db);
    const returned = ["RETURNED_FOR_EDITING", "VISA_RETURNED"].includes(doc.status);
    const readState = readStateFor(db, doc.id, userId);
    const isRecipient = (db.document_recipients || []).some((recipient: any) =>
      recipient.documentId === doc.id && (recipient.recipientUserId === userId || recipient.userId === userId)
    );
    const hasUserWork = pendingVisa || pendingSign || isRecipient || (isChancellery && chancelleryPending);
    return {
      ...doc,
      quickAction: pendingVisa ? "VISA" : pendingSign ? "SIGN" : isChancellery && chancelleryPending ? "CHANCELLERY_FORWARD" : undefined,
      readState,
      folderFlags: {
        main: true,
        visa: pendingVisa,
        signing: pendingSign,
        unread: hasUserWork && readState !== "READ",
        read: readState === "READ",
        chancellery: isChancellery && chancelleryPending,
        returned: returned && documentAuthorIds(doc).has(userId),
        drafts: doc.status === "DRAFT" && (doc.createdBy === userId || doc.authorId === userId),
        sent: doc.createdBy === userId && ["SENT", "SENT_TO_VISA", "ON_VISA", "WAITING_FOR_VISA", "VISA_IN_PROGRESS", "SENT_TO_SIGN", "WAITING_FOR_SIGNATURE", "SIGNED", "COMPLETED"].includes(doc.status),
        completed: ["SIGNED", "COMPLETED", "REGISTERED"].includes(doc.status),
      },
    };
  });
}

function collectionResponse(db: Db, apiName: string, url: URL) {
  const key = collectionByApiName[apiName];
  if (!key) return null;
  const rows = db[key] || [];
  return apiName === "documents" ? filterDocuments(db, rows, url, "usr-admin") : rows;
}

async function handleApi(request: Request, init?: RequestInit) {
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const method = (init?.method || request.method || "GET").toUpperCase();
  const db = await ensureLoaded(method === "GET");
  const userId = getCurrentUserId(request);

  if (parts[0] === "auth" && parts[1] === "login" && method === "POST") {
    const body = await readBody(init);
    const login = String(body.username ?? "").trim().toLowerCase();
    const user = db.users.find(
      (u) => String(u.username || "").trim().toLowerCase() === login && (!u.password || u.password === body.password)
    );
    if (!user) return json({ message: "არასწორი მომხმარებელი ან პაროლი" }, { status: 401 });
    return json({ token: `jwt-mock-token-${user.id}`, user });
  }

  if (parts[0] === "auth" && parts[1] === "me") {
    const user = db.users.find((u) => u.id === userId);
    return user ? json({ user }) : json({ message: "მომხმარებელი ვერ მოიძებნა" }, { status: 401 });
  }

  if (parts[0] === "auth") return json({ ok: true });

  if (parts[0] === "files") {
    db.document_files = db.document_files || [];
    const file = db.document_files.find((f: any) => f.id === parts[1]);
    if (parts[2] === "download") {
      if (!file) return json({ message: "ფაილი ვერ მოიძებნა" }, { status: 404 });
      return json({ filename: file.filename, mimeType: file.mimeType, base64Data: file.storageKey });
    }
    if (method === "DELETE") {
      db.document_files = db.document_files.filter((f: any) => f.id !== parts[1]);
      if (file) {
        const owner = db.documents.find((d) => d.id === file.documentId);
        if (owner) owner.attachmentCount = Math.max(0, (owner.attachmentCount || 0) - 1);
      }
      await writeDb(db);
      return json({ message: "ფაილი წაიშალა" });
    }
  }

  if (parts[0] === "reports") return json([]);
  if (parts[0] === "recipients" && parts[1] === "search") {
    const q = (url.searchParams.get("query") || "").toLowerCase();
    const contacts = (db.external_contacts || []).filter((c: any) =>
      !q ||
      c.name?.toLowerCase().includes(q) ||
      c.organization?.toLowerCase().includes(q) ||
      c.taxId?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q)
    );
    return json(contacts);
  }
  if (parts[0] === "documents" && parts[1] === "search-basis") {
    const text = (url.searchParams.get("query") || url.searchParams.get("q") || "").toLowerCase();
    const documentNumber = url.searchParams.get("documentNumber")?.toLowerCase();
    const entryNumber = url.searchParams.get("entryNumber")?.toLowerCase();
    const subject = url.searchParams.get("subject")?.toLowerCase();
    const author = url.searchParams.get("author");
    const category = url.searchParams.get("category");
    const type = url.searchParams.get("type");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");
    const hasAny = text || documentNumber || entryNumber || subject || author || category || type || dateFrom || dateTo;
    if (!hasAny) return json([]);
    const results = (db.documents || []).filter((d: any) => {
      if (text) {
        const m = d.documentNumber?.toLowerCase().includes(text) ||
          d.registrationNumber?.toLowerCase().includes(text) ||
          d.entryNumber?.toLowerCase().includes(text) ||
          d.subject?.toLowerCase().includes(text) ||
          d.body?.toLowerCase().includes(text);
        if (!m) return false;
      }
      if (documentNumber && !d.documentNumber?.toLowerCase().includes(documentNumber)) return false;
      if (entryNumber && !d.entryNumber?.toLowerCase().includes(entryNumber)) return false;
      if (subject && !d.subject?.toLowerCase().includes(subject)) return false;
      if (author && d.authorId !== author) return false;
      if (category && d.category !== category) return false;
      if (type && d.documentType !== type) return false;
      if (dateFrom && (d.documentDate || d.createdAt) < dateFrom) return false;
      if (dateTo && (d.documentDate || d.createdAt) > dateTo + "￿") return false;
      return true;
    });
    return json(results);
  }
  if (parts[0] === "admin" && parts[1] === "settings") return json({ appName: "DocFlow Georgia" });

  if (parts[0] === "admin" && parts[1] === "users" && parts[3] === "signature-profile") {
    const user = db.users.find((u) => u.id === parts[2]);
    if (!user) return json({ message: "მომხმარებელი ვერ მოიძებნა" }, { status: 404 });
    if (method === "GET") return json({ signatureImage: user.signatureImage });
    if (method === "POST") {
      user.signatureImage = (await readBody(init)).signatureImage;
      await writeDb(db);
      return json({ message: "ხელმოწერა აიტვირთა" });
    }
    if (method === "DELETE") {
      delete user.signatureImage;
      await writeDb(db);
      return json({ message: "ხელმოწერა წაიშალა" });
    }
  }

  const collectionName = parts[0] === "admin" ? parts[1] : parts[0];
  const collectionKey = collectionByApiName[collectionName];

  if (parts[0] === "notifications" && parts[1] === "clear" && method === "POST") {
    db.notifications = [];
    await writeDb(db);
    return json({ ok: true });
  }

  if (parts[0] === "notifications" && parts[2] === "read" && method === "POST") {
    const item = db.notifications.find((n) => n.id === parts[1]);
    if (item) item.read = true;
    await writeDb(db);
    return json(item || { ok: true });
  }

  if (parts[0] === "documents") {
    const docId = parts[1];
    const doc = db.documents.find((d) => d.id === docId);

	    if (method === "GET" && parts.length === 1) return json(filterDocuments(db, db.documents || [], url, userId));
	    if (method === "POST" && parts.length === 1) {
	      const body = await readBody(init);
	      const now = new Date().toISOString();
      const authorId = body.authorId || body.authors?.find((author: any) => author.userId)?.userId || userId;
	      const created = {
	        ...body,
	        id: nextId("doc"),
	        status: body.status || "DRAFT",
	        body: body.body || "",
        authorId,
        responsibleId: body.responsibleId || userId,
	        departmentId: body.departmentId || "dep-chanc",
	        createdBy: userId,
	        updatedBy: userId,
	        createdAt: now,
	        updatedAt: now,
	      };
	      assignInternalNumber(db, created);
	      db.documents.unshift(created);
      if (authorId !== userId || body.signerId) {
        ensureSignatureAction(db, created, body.signerId || authorId, true);
      }
	      await writeDb(db);
	      return json(created, { status: 201 });
	    }
    if (!doc) return json({ message: "დოკუმენტი ვერ მოიძებნა" }, { status: 404 });
    if (parts[2] === "read" && method === "POST") {
      const state = markDocumentRead(db, docId, userId);
      await writeDb(db);
      return json(state);
    }
    if (method === "DELETE" && parts.length === 2) {
      const requester = db.users.find((u) => u.id === userId);
      if (!requester || requester.role !== "ADMIN") {
        return json({ message: "დოკუმენტის სრულად წაშლა მხოლოდ ადმინისტრატორს შეუძლია" }, { status: 403 });
      }
      const byDoc = (arr?: any[]) => (arr || []).filter((x: any) => x.documentId !== docId);
      db.documents = db.documents.filter((d) => d.id !== docId);
      db.document_versions = byDoc(db.document_versions);
      db.document_files = byDoc(db.document_files);
      db.document_recipients = byDoc(db.document_recipients);
      db.document_addressees = byDoc(db.document_addressees);
      db.document_basis_links = byDoc(db.document_basis_links);
      db.document_related_links = byDoc(db.document_related_links);
      db.document_external_resolution_links = byDoc(db.document_external_resolution_links);
      db.visa_actions = byDoc(db.visa_actions);
      db.resolutions = byDoc(db.resolutions);
      db.tasks = byDoc(db.tasks);
      await writeDb(db);
      return json({ message: "დოკუმენტი სრულად წაიშალა" });
    }
    if (method === "GET" && parts.length === 2) return json(doc);
    if (method === "PATCH" && parts.length === 2) {
      Object.assign(doc, await readBody(init), { updatedBy: userId, updatedAt: new Date().toISOString() });
      await writeDb(db);
      return json(doc);
    }
    if (parts[2] === "body") {
      if (method === "GET") return json({ body: doc.body || "" });
      if (method === "PATCH") {
        doc.body = (await readBody(init)).body || "";
        await writeDb(db);
        return json({ body: doc.body });
      }
    }
    if (parts[2] === "files") {
      db.document_files = db.document_files || [];
      if (method === "POST") {
        const body = await readBody(init);
        const created = {
          id: nextId("file"),
          documentId: docId,
          filename: body.filename,
          storageKey: body.base64Data,
          mimeType: body.mimeType,
          size: body.size,
          hash: "sha256-mock-" + Math.random().toString(36).slice(2, 9),
          uploaderId: body.uploaderId || userId,
          uploadDate: new Date().toISOString(),
          fileType: body.fileType || "ATTACHMENT",
        };
        db.document_files.push(created);
        doc.attachmentCount = (doc.attachmentCount || 0) + 1;
        await writeDb(db);
        return json(created, { status: 201 });
      }
      return json(db.document_files.filter((f) => f.documentId === docId));
    }
    if (parts[2] === "recipients" && method === "GET") return json(db.document_recipients.filter((r) => r.documentId === docId));
	    if (parts[2] === "recipients" && method === "POST") {
	      const created = { ...(await readBody(init)), id: nextId("rec"), documentId: docId };
	      db.document_recipients.push(created);
      if (created.recipientUserId || created.userId) {
        ensureUnreadState(db, docId, created.recipientUserId || created.userId);
      } else if (created.recipientType === "CHANCELLERY" || !created.recipientUserId) {
        doc.status = "WAITING_FOR_CHANCELLERY";
        ensureChancelleryRecipients(db, doc);
      }
	      await writeDb(db);
	      return json(created, { status: 201 });
	    }
    if (parts[2] === "recipients" && method === "DELETE") {
      db.document_recipients = db.document_recipients.filter((r) => r.id !== parts[3]);
      await writeDb(db);
      return json({ ok: true });
    }
    if (parts[2] === "basis-links") {
      db.document_basis_links = db.document_basis_links || [];
      if (method === "POST") {
        const body = await readBody(init);
        const link = {
          id: nextId("link"),
          documentId: docId,
          basisDocumentId: body.basisDocumentId,
          relationshipType: body.relationshipType || "საფუძვლად გამოყენებული დოკუმენტი",
          comment: body.comment,
          linkedBy: body.userId || userId,
          linkedAt: new Date().toISOString(),
        };
        db.document_basis_links.push(link);
        await writeDb(db);
        return json(link, { status: 201 });
      }
      if (method === "DELETE") {
        db.document_basis_links = db.document_basis_links.filter((l) => l.id !== parts[3]);
        await writeDb(db);
        return json({ ok: true });
      }
      return json(db.document_basis_links.filter((r) => r.documentId === docId));
    }
    if (parts[2] === "external-resolution-links") {
      db.document_external_resolution_links = db.document_external_resolution_links || [];
      if (method === "POST") {
        const body = await readBody(init);
        const link = { id: nextId("link-ext"), documentId: docId, ...body, linkedAt: new Date().toISOString() };
        db.document_external_resolution_links.push(link);
        await writeDb(db);
        return json(link, { status: 201 });
      }
      if (method === "DELETE") {
        db.document_external_resolution_links = db.document_external_resolution_links.filter((l) => l.id !== parts[3]);
        await writeDb(db);
        return json({ ok: true });
      }
      return json(db.document_external_resolution_links.filter((r) => r.documentId === docId));
    }
    if (parts[2] === "versions") return json(db.document_versions.filter((v) => v.documentId === docId));
    if (parts[2] === "visa-history") return json(db.visa_actions.filter((v) => v.documentId === docId));
    if (parts[2] === "resolutions") {
      db.resolutions = db.resolutions || [];
      if (method === "POST") {
        const body = await readBody(init);
        const res = {
          id: nextId("res"),
          documentId: docId,
          text: body.text,
          creatorId: body.creatorId || userId,
          deadline: body.deadline,
          createdAt: new Date().toISOString(),
        };
        db.resolutions.push(res);
        doc.status = "RESOLUTION_ASSIGNED";
        await writeDb(db);
        return json(res, { status: 201 });
      }
      return json(db.resolutions.filter((r) => r.documentId === docId));
    }
		    if (method === "POST" && parts[2] === "visa" && parts[3] === "send") {
		      const body = await readBody(init);
		      const visaUsers = Array.from(new Set((body.visaUsers || []).filter(Boolean)));
		      if (visaUsers.length === 0) return json({ message: "აირჩიეთ ვიზირების მონაწილე ან გაგზავნეთ პირდაპირ ხელმოსაწერად." }, { status: 400 });
		      doc.status = "VISA_IN_PROGRESS";
		      doc.visaStatus = "PENDING";
		      doc.signatureStatus = undefined;
		      db.visa_actions = (db.visa_actions || []).filter((item: any) =>
	        !(item.documentId === docId && item.role === "VISA" && item.status === "PENDING")
	      );
	      visaUsers.forEach((visaUserId: string) => {
	        db.visa_actions.push({
	          id: nextId("visa-act"),
	          documentId: docId,
	          userId: visaUserId,
	          role: "VISA",
		          status: "PENDING",
		          createdAt: new Date().toISOString(),
		        });
          ensureUnreadState(db, docId, visaUserId);
          notifyUser(db, visaUserId, "ვიზირებისთვის დოკუმენტი", `დავიზება საჭიროა: ${doc.subject || doc.entryNumber}`);
		      });
        ensureSignatureAction(db, doc, doc.authorId, true);
		      await writeDb(db);
		      return json(doc);
		    }
		    if (method === "POST" && parts[2] === "visa" && ["approve", "return", "reject"].includes(parts[3])) {
		      const action = activeVisaAction(db, docId, userId);
		      if (!action) return json({ message: "თქვენთვის აქტიური ვიზირება არ მოიძებნა" }, { status: 403 });
          const body = await readBody(init);
		      if (action) {
		        action.status = parts[3] === "approve" ? "APPROVED" : parts[3] === "return" ? "RETURNED" : "REJECTED";
		        action.actionDate = new Date().toISOString();
		        action.comment = body.comment;
		      }
	      const allVisaApproved = db.visa_actions
	        .filter((item) => item.documentId === docId && item.role === "VISA")
	        .every((item) => item.status === "APPROVED");
		      doc.status = parts[3] === "approve" && allVisaApproved ? "WAITING_FOR_SIGNATURE" : parts[3] === "approve" ? "VISA_IN_PROGRESS" : parts[3] === "return" ? "RETURNED_FOR_EDITING" : "REJECTED";
		      doc.visaStatus = parts[3] === "approve" && allVisaApproved ? "APPROVED" : parts[3] === "approve" ? "PENDING" : parts[3] === "return" ? "RETURNED" : "REJECTED";
		      if (parts[3] === "approve" && allVisaApproved) {
		        doc.signatureStatus = "PENDING";
          activateWaitingSignatures(db, doc);
          ensureSignatureAction(db, doc, doc.authorId);
        }
        if (parts[3] === "return") {
          doc.returnComment = body.comment || "დოკუმენტი დაბრუნდა შესასწორებლად";
          notifyUser(db, doc.createdBy || doc.authorId, "დოკუმენტი დაბრუნდა", doc.returnComment);
		      }
		      await writeDb(db);
		      return json(doc);
		    }
	    if (method === "POST" && parts[2] === "signature" && parts[3] === "request") {
	      if (doc.category === "INCOMING") {
	        assignDocumentNumber(db, doc);
	        doc.status = "REGISTERED";
	        doc.signatureStatus = undefined;
	        doc.updatedAt = new Date().toISOString();
	        await writeDb(db);
	        return json(doc);
	      }
	      if (!canProceedToSignature(db, docId)) {
	        return json({ message: "არჩეული ვიზირების მონაწილეების დადასტურებამდე ხელმოწერა ვერ დაიწყება." }, { status: 409 });
	      }
		      const body = await readBody(init);
		      const targetSignerId = body.signerId || doc.authorId;
		      doc.status = "WAITING_FOR_SIGNATURE";
		      doc.signatureStatus = "PENDING";
		      const hasPending = db.visa_actions.some((item) => item.documentId === docId && item.userId === targetSignerId && item.role === "SIGN" && item.status === "PENDING");
		      if (hasPending) {
		        await writeDb(db);
	        return json(doc);
	      }
	      ensureSignatureAction(db, doc, targetSignerId);
		      await writeDb(db);
		      return json(doc);
		    }
	    if (method === "POST") {
	      if (parts[2] === "cancel") {
	        const actor = db.users.find((user) => user.id === userId);
	        if (!actor || actor.role !== "ADMIN") {
	          return json({ message: "დოკუმენტის გაუქმება მხოლოდ ადმინისტრატორს ან დირექტორს შეუძლია" }, { status: 403 });
	        }
	      }
      if (parts[2] === "return") {
        const body = await readBody(init);
        doc.status = "RETURNED_FOR_EDITING";
        doc.returnComment = body.comment || "დოკუმენტი დაბრუნდა შესასწორებლად";
        doc.signatureStatus = doc.signatureStatus === "SIGNED" ? "SIGNED" : undefined;
        (db.visa_actions || []).forEach((item: any) => {
          if (item.documentId === docId && ["PENDING", "WAITING_FOR_VISA"].includes(item.status)) {
            item.status = "RETURNED";
            item.actionDate = new Date().toISOString();
            item.comment = doc.returnComment;
          }
        });
        notifyUser(db, doc.createdBy || doc.authorId, "დოკუმენტი დაბრუნდა", doc.returnComment);
        doc.updatedAt = new Date().toISOString();
        await writeDb(db);
        return json(doc);
      }
      if (parts[2] === "chancellery" && parts[3] === "forward") {
        const actor = db.users.find((user) => user.id === userId);
        if (!isChancelleryUser(actor, db)) {
          return json({ message: "გადაგზავნა მხოლოდ კანცელარიას შეუძლია" }, { status: 403 });
        }
        const body = await readBody(init);
        const targetUserId = body.recipientUserId || body.userId;
        (db.document_recipients || []).forEach((recipient: any) => {
          if (recipient.documentId === docId && recipient.recipientType === "CHANCELLERY" && recipient.status === "PENDING") {
            recipient.status = "FORWARDED";
            recipient.forwardedAt = new Date().toISOString();
            recipient.forwardedBy = userId;
          }
        });
        if (targetUserId) {
          db.document_recipients.push({
            id: nextId("rec"),
            documentId: docId,
            recipientType: "INTERNAL",
            recipientUserId: targetUserId,
            recipientName: body.recipientName,
            deliveryMethod: "SYSTEM",
            status: "SENT",
            createdAt: new Date().toISOString(),
          });
          ensureUnreadState(db, docId, targetUserId);
          notifyUser(db, targetUserId, "შემოსული დოკუმენტი", `მოგივიდათ დოკუმენტი: ${doc.subject || doc.documentNumber || doc.entryNumber}`);
          doc.status = "SENT_TO_RECIPIENT";
        } else {
          db.delivery_records = db.delivery_records || [];
          db.delivery_records.push({
            id: nextId("del"),
            documentId: docId,
            method: body.deliveryMethod || "HAND",
            recipientName: body.recipientName || doc.recipient || "გარე ადრესატი",
            date: new Date().toISOString(),
          });
          doc.status = "SENT";
        }
        doc.updatedAt = new Date().toISOString();
        await writeDb(db);
        return json(doc);
      }
	      const statusByAction: Record<string, string> = {
	        register: "REGISTERED",
	        send: "SENT",
        cancel: "CANCELLED",
        archive: "ARCHIVED",
        restore: "REGISTERED",
        "send-to-visa": "ON_VISA",
        "visa-action": "VISA_APPROVED",
	        "request-signature": "WAITING_FOR_SIGNATURE",
	        sign: "SIGNED",
	      };
	      if (parts[2] === "register") assignDocumentNumber(db, doc);
		      if (parts[2] === "sign") {
		        const action = activeSignAction(db, docId, userId);
		        if (!action) return json({ message: "დოკუმენტი თქვენთან ხელმოსაწერად არ არის" }, { status: 403 });
		        if (!canProceedToSignature(db, docId)) {
		          return json({ message: "არჩეული ვიზირების მონაწილეების დადასტურებამდე ხელმოწერა ვერ მოხერხდება." }, { status: 409 });
	        }
	        assignDocumentNumber(db, doc);
	        action.status = "APPROVED";
	        action.actionDate = new Date().toISOString();
		        doc.signedById = userId;
		        doc.signedAt = new Date().toISOString();
		        doc.signatureStatus = "SIGNED";
          const hasPendingSignatures = (db.visa_actions || []).some((item: any) => item.documentId === docId && item.role === "SIGN" && item.status === "PENDING");
          if (!hasPendingSignatures) {
            const hasExternalRecipient = (db.document_recipients || []).some((recipient: any) => recipient.documentId === docId && !recipient.recipientUserId && !recipient.userId);
            const hasChancelleryRecipient = (db.document_recipients || []).some((recipient: any) => recipient.documentId === docId && recipient.recipientType === "CHANCELLERY");
            if (hasExternalRecipient || hasChancelleryRecipient) {
              doc.status = "WAITING_FOR_CHANCELLERY";
              ensureChancelleryRecipients(db, doc);
            } else {
              doc.status = "SIGNED";
            }
          }
		      }
      if (parts[2] !== "sign") doc.status = statusByAction[parts[2]] || doc.status;
	      doc.updatedAt = new Date().toISOString();
	      await writeDb(db);
	      return json(doc);
    }
  }

  // რეზოლუციაზე დავალების გაწერა
  if (parts[0] === "resolutions" && parts[2] === "tasks" && method === "POST") {
    db.tasks = db.tasks || [];
    const body = await readBody(init);
    const task = {
      id: nextId("tsk"),
      documentId: body.documentId,
      resolutionId: parts[1],
      assigneeId: body.assigneeId,
      coAssignees: body.coAssignees || [],
      status: "ASSIGNED",
      deadline: body.deadline,
      description: body.description,
      createdBy: body.createdBy || userId,
      createdAt: new Date().toISOString(),
      completionFiles: [],
    };
    db.tasks.push(task);
    db.notifications = db.notifications || [];
    db.notifications.push({
      id: nextId("not"),
      userId: body.assigneeId,
      title: "ახალი დავალება",
      message: `თქვენ დაგეკისრათ დავალება: ${body.description}`,
      read: false,
      createdAt: new Date().toISOString(),
    });
    await writeDb(db);
    return json(task, { status: 201 });
  }

  // დავალების შესრულება/დაბრუნება
  if (parts[0] === "tasks" && parts[2] && method === "POST") {
    db.tasks = db.tasks || [];
    const task = db.tasks.find((t) => t.id === parts[1]);
    if (!task) return json({ message: "დავალება ვერ მოიძებნა" }, { status: 404 });
    const body = await readBody(init);
    if (parts[2] === "complete") {
      task.status = "COMPLETED";
      task.completionText = body.completionText;
      task.completionFiles = body.completionFiles || [];
      task.completedAt = new Date().toISOString();
    } else if (parts[2] === "return") {
      task.status = "RETURNED";
      task.returnedReason = body.returnedReason;
    }
    await writeDb(db);
    return json(task);
  }

  if (collectionKey) {
    const idIndex = parts[0] === "admin" ? 2 : 1;
    const id = parts[idIndex];
    if (method === "GET" && !id) return json(collectionResponse(db, collectionName, url));
    if (method === "POST" && !id) {
      const body = await readBody(init);
      const created = { ...body, id: body.id || nextId(collectionName) };
      db[collectionKey].push(created);
      await writeDb(db);
      return json(created, { status: 201 });
    }
    const item = db[collectionKey].find((row) => row.id === id);
    if (!item) return json({ message: "ჩანაწერი ვერ მოიძებნა" }, { status: 404 });
    if (method === "GET") return json(item);
    if (method === "PATCH") {
      Object.assign(item, await readBody(init));
      await writeDb(db);
      return json(item);
    }
    if (method === "DELETE") {
      db[collectionKey] = db[collectionKey].filter((row) => row.id !== id);
      await writeDb(db);
      return json({ ok: true });
    }
  }

  return json({ ok: true });
}

export function installMockApi() {
  if (!shouldUseMockApi()) return;

  // მონაცემების ადრეული ჩატვირთვა Firestore-დან (არ ვბლოკავთ).
  void ensureLoaded();

  const realFetch = window.fetch.bind(window);
  syncChannel?.addEventListener("message", (event) => {
    if (event.data?.type === "data-changed") {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: event.data }));
    }
  });
  window.addEventListener("storage", (event) => {
    if (event.key === SYNC_STORAGE_KEY) {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: { at: Number(event.newValue) || Date.now() } }));
    }
  });
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, init).catch((error) => {
        console.error("DocFlow API / Firestore შეცდომა", error);
        return json(
          {
            message:
              "მონაცემების Firebase-ში შენახვა ვერ მოხერხდა. შეამოწმეთ Firestore rules და Firebase პროექტის კავშირი.",
          },
          { status: 500 }
        );
      });
    }
    return realFetch(input, init);
  };
}
