export enum DocumentCategory {
  INCOMING = "INCOMING",
  OUTGOING = "OUTGOING",
  INTERNAL = "INTERNAL",
}

export enum DocumentType {
  LETTER = "LETTER",
  REQUEST = "REQUEST",
  APPLICATION = "APPLICATION",
  ORDER = "ORDER",
  MEMO = "MEMO",
  REPORT = "REPORT",
  CERTIFICATE = "CERTIFICATE",
  CONTRACT = "CONTRACT",
  RESOLUTION = "RESOLUTION",
  OTHER = "OTHER",
}

export enum DocumentStatus {
  DRAFT = "DRAFT",
  REGISTERED = "REGISTERED",
  SENT_TO_VISA = "SENT_TO_VISA",
  ON_VISA = "ON_VISA",
  VISA_APPROVED = "VISA_APPROVED",
  VISA_RETURNED = "VISA_RETURNED",
  SENT_TO_SIGN = "SENT_TO_SIGN",
  SIGNED = "SIGNED",
  SENT = "SENT",
  RECEIVED = "RECEIVED",
  READ = "READ",
  RESOLUTION_ASSIGNED = "RESOLUTION_ASSIGNED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
  CANCELLED = "CANCELLED",
  REJECTED = "REJECTED",
  OVERDUE = "OVERDUE",
}

export enum VisaActionStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  RETURNED = "RETURNED",
}

export enum TaskStatus {
  NEW = "NEW",
  ASSIGNED = "ASSIGNED",
  RECEIVED = "RECEIVED",
  PROGRESS = "PROGRESS",
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  RETURNED = "RETURNED",
  CANCELLED = "CANCELLED",
  OVERDUE = "OVERDUE",
}

export enum UserRole {
  ADMIN = "ADMIN",
  ORG_ADMIN = "ORG_ADMIN",
  CHANCELLERY = "CHANCELLERY",
  AUTHOR = "AUTHOR",
  MANAGER = "MANAGER",
  VISA_APPROVER = "VISA_APPROVER",
  SIGNER = "SIGNER",
  EXECUTOR = "EXECUTOR",
  RECIPIENT = "RECIPIENT",
  AUDITOR = "AUDITOR",
  ARCHIVE_MANAGER = "ARCHIVE_MANAGER",
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  phone: string;
  address: string;
  email: string;
  logoUrl?: string;
}

export interface Department {
  id: string;
  name: string;
  organizationId: string;
}

export interface Position {
  id: string;
  name: string;
  departmentId: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  personalNumber: string;
  email: string;
  phone: string;
  departmentId: string;
  positionId: string;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE";
  substituteId?: string;
  signatureImage?: string; // Base64 or URL
  stampPermission: boolean;
  password?: string;
}

export interface Document {
  id: string;
  documentNumber?: string;
  registrationNumber?: string;
  entryNumber?: string;
  documentDate?: string;
  registrationDate?: string;
  category: DocumentCategory;
  documentType: DocumentType;
  subject: string;
  description: string;
  body: string; // Sanitized HTML
  sender?: string; // external sender for incoming
  recipient?: string; // external recipient for outgoing
  authorId: string;
  departmentId: string;
  responsibleId?: string;
  deadline?: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  confidentiality: "PUBLIC" | "CONFIDENTIAL";
  status: DocumentStatus;
  visaStatus?: "PENDING" | "APPROVED" | "REJECTED" | "RETURNED";
  signatureStatus?: "PENDING" | "SIGNED" | "REJECTED";
  printStatus?: "NOT_PRINTED" | "PRINTED";
  archiveStatus?: "ACTIVE" | "ARCHIVED";
  pageCount: number;
  attachmentCount: number;
  oldDocumentNumber?: string;
  parentDocumentId?: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  signedAt?: string;
  signedById?: string;
  archivedAt?: string;
  cancelledAt?: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  body: string;
  versionNumber: number;
  updatedBy: string;
  updatedAt: string;
}

export interface DocumentFile {
  id: string;
  documentId: string;
  filename: string;
  storageKey: string;
  mimeType: string;
  size: number;
  hash: string;
  uploaderId: string;
  uploadDate: string;
  fileType: "MAIN" | "ATTACHMENT" | "BASIS" | "EXECUTION" | "SIGNATURE" | "STAMP";
}

export interface DocumentRecipient {
  id: string;
  documentId: string;
  userId?: string;
  departmentId?: string;
  positionId?: string;
  externalContactId?: string;
  role: "RECIPIENT" | "READ" | "COPY";
}

export interface DocumentAddressee {
  id: string;
  documentId: string;
  userId: string;
  status: "UNREAD" | "READ";
  readAt?: string;
}

export interface DocumentBasisLink {
  id: string;
  documentId: string;
  basisDocumentId: string;
  relationshipType: string; // e.g. "PRACTICE", "RESPONSE", "CORRECTION", "CONTINUATION"
  comment?: string;
  linkedBy: string;
  linkedAt: string;
}

export interface DocumentRelatedLink {
  id: string;
  documentId: string;
  relatedDocumentId: string;
  comment?: string;
  linkedBy: string;
  linkedAt: string;
}

export interface ExternalResolution {
  id: string;
  resolutionNumber: string;
  resolutionDate: string;
  organization: string;
  person: string;
  title: string;
  description: string;
  fileUrl?: string;
  createdBy: string;
  createdAt: string;
}

export interface DocumentExternalResolutionLink {
  id: string;
  documentId: string;
  externalResolutionId: string;
  relationshipType: string;
  comment?: string;
  linkedBy: string;
  linkedAt: string;
}

export interface NumberingRule {
  id: string;
  prefix: string;
  separator: string;
  yearFormat: "YYYY" | "YY" | "NONE";
  sequenceLength: number;
  resetYearly: boolean;
  category?: DocumentCategory;
  departmentId?: string;
  documentType?: DocumentType;
}

export interface NumberingSequence {
  id: string;
  ruleId: string;
  currentNumber: number;
  year: number;
}

export interface VisaAction {
  id: string;
  documentId: string;
  userId: string;
  role: "VISA" | "SIGN";
  status: VisaActionStatus;
  comment?: string;
  actionDate?: string;
}

export interface Resolution {
  id: string;
  documentId: string;
  text: string;
  creatorId: string;
  createdAt: string;
  deadline?: string;
}

export interface Task {
  id: string;
  documentId: string;
  resolutionId: string;
  assigneeId: string;
  coAssignees: string[]; // User IDs
  status: TaskStatus;
  deadline?: string;
  description: string;
  completionText?: string;
  completionFiles?: string[]; // URLs or Base64 keys
  returnedReason?: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userFullName: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: string; // JSON String
  newValues?: string; // JSON String
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface ExternalContact {
  id: string;
  name: string;
  organization: string;
  taxId?: string;
  address?: string;
  email?: string;
  phone?: string;
  contactType: "ORGANIZATION" | "INDIVIDUAL";
  notes?: string;
}

export interface HeaderFooterTemplate {
  id: string;
  name: string;
  headerImage?: string; // base64
  footerImage?: string; // base64
  headerTextGeo: string;
  headerTextEng?: string;
  logoUrl?: string;
  contactDetails?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  identificationCode?: string;
  isDefault: boolean;
}

export interface Stamp {
  id: string;
  name: string;
  imageUrl: string; // base64
  isActive: boolean;
}

export interface DeliveryRecord {
  id: string;
  documentId: string;
  method: "EMAIL" | "COURIER" | "POST" | "HAND" | "SYSTEM";
  trackingNumber?: string;
  recipientName: string;
  date: string;
  attachmentUrl?: string;
}

// Translations / UI Helpers
export const GEORGIAN_DOCUMENT_STATUSES: Record<DocumentStatus, string> = {
  [DocumentStatus.DRAFT]: "პროექტი",
  [DocumentStatus.REGISTERED]: "რეგისტრირებული",
  [DocumentStatus.SENT_TO_VISA]: "ვიზირებაზე გაგზავნილი",
  [DocumentStatus.ON_VISA]: "ვიზირებაზე",
  [DocumentStatus.VISA_APPROVED]: "დავიზებული",
  [DocumentStatus.VISA_RETURNED]: "ვიზირებიდან დაბრუნებული",
  [DocumentStatus.SENT_TO_SIGN]: "ხელმოსაწერად გაგზავნილი",
  [DocumentStatus.SIGNED]: "ხელმოწერილი",
  [DocumentStatus.SENT]: "გაგზავნილი",
  [DocumentStatus.RECEIVED]: "მიღებული",
  [DocumentStatus.READ]: "წაკითხული",
  [DocumentStatus.RESOLUTION_ASSIGNED]: "რეზოლუცია დადებული",
  [DocumentStatus.IN_PROGRESS]: "შესრულებაში",
  [DocumentStatus.COMPLETED]: "შესრულებული",
  [DocumentStatus.ARCHIVED]: "დაარქივებული",
  [DocumentStatus.CANCELLED]: "გაუქმებული",
  [DocumentStatus.REJECTED]: "უარყოფილი",
  [DocumentStatus.OVERDUE]: "ვადაგადაცილებული",
};

export const GEORGIAN_TASK_STATUSES: Record<TaskStatus, string> = {
  [TaskStatus.NEW]: "ახალი",
  [TaskStatus.ASSIGNED]: "მინიჭებული",
  [TaskStatus.RECEIVED]: "მიღებული",
  [TaskStatus.PROGRESS]: "შესრულებაში",
  [TaskStatus.PENDING]: "მოლოდინში",
  [TaskStatus.COMPLETED]: "შესრულებული",
  [TaskStatus.RETURNED]: "დაბრუნებული",
  [TaskStatus.CANCELLED]: "გაუქმებული",
  [TaskStatus.OVERDUE]: "ვადაგადაცილებული",
};

export const GEORGIAN_CATEGORIES: Record<DocumentCategory, string> = {
  [DocumentCategory.INCOMING]: "შემოსული",
  [DocumentCategory.OUTGOING]: "გასული",
  [DocumentCategory.INTERNAL]: "შიდა",
};

export const GEORGIAN_DOCUMENT_TYPES: Record<DocumentType, string> = {
  [DocumentType.LETTER]: "წერილი",
  [DocumentType.REQUEST]: "მოთხოვნა",
  [DocumentType.APPLICATION]: "განცხადება",
  [DocumentType.ORDER]: "ბრძანება",
  [DocumentType.MEMO]: "მოხსენებითი ბარათი",
  [DocumentType.REPORT]: "ანგარიში",
  [DocumentType.CERTIFICATE]: "ცნობა",
  [DocumentType.CONTRACT]: "ხელშეკრულება",
  [DocumentType.RESOLUTION]: "რეზოლუცია",
  [DocumentType.OTHER]: "სხვა",
};

export const GEORGIAN_ROLES: Record<UserRole, string> = {
  [UserRole.ADMIN]: "სისტემის ადმინისტრატორი",
  [UserRole.ORG_ADMIN]: "ორგანიზაციის ადმინისტრატორი",
  [UserRole.CHANCELLERY]: "კანცელარია / რეგისტრატორი",
  [UserRole.AUTHOR]: "დოკუმენტის ავტორი",
  [UserRole.MANAGER]: "მენეჯერი / რეზოლუციის ავტორი",
  [UserRole.VISA_APPROVER]: "ვიზატორი",
  [UserRole.SIGNER]: "ხელმომწერი",
  [UserRole.EXECUTOR]: "შემსრულებელი",
  [UserRole.RECIPIENT]: "ადრესატი / მკითხველი",
  [UserRole.AUDITOR]: "აუდიტორი",
  [UserRole.ARCHIVE_MANAGER]: "არქივის მენეჯერი",
};
