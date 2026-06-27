import { DocumentStatus } from "./types.js";

export type WorkflowAction = {
  role: "VISA" | "SIGN";
  status: "PENDING" | "APPROVED" | "REJECTED" | "RETURNED" | "WAITING_FOR_VISA";
  userId: string;
};

export function shouldAssignOfficialNumber(status: string) {
  return [
    DocumentStatus.REGISTERED,
    DocumentStatus.SIGNED,
    DocumentStatus.COMPLETED,
  ].includes(status as DocumentStatus);
}

export function canEditDocument(status: string) {
  return ![
    DocumentStatus.SIGNED,
    DocumentStatus.COMPLETED,
    DocumentStatus.CANCELLED,
    DocumentStatus.ARCHIVED,
  ].includes(status as DocumentStatus);
}

export function activeVisaForUser(actions: WorkflowAction[], userId: string) {
  return actions.some((action) => action.role === "VISA" && action.userId === userId && action.status === "PENDING");
}

export function activeSignatureForUser(actions: WorkflowAction[], userId: string) {
  return actions.some((action) => action.role === "SIGN" && action.userId === userId && action.status === "PENDING");
}

export function canProceedToSignature(actions: WorkflowAction[]) {
  const visas = actions.filter((action) => action.role === "VISA");
  return visas.length === 0 || visas.every((action) => action.status === "APPROVED");
}

export function workflowFolderFlags(input: {
  status: string;
  readState?: "READ" | "UNREAD";
  createdBy?: string;
  authorId?: string;
  currentUserId: string;
  isChancellery?: boolean;
  hasPendingChancellery?: boolean;
  actions?: WorkflowAction[];
}) {
  const actions = input.actions || [];
  const isDraftOwner = input.status === DocumentStatus.DRAFT && [input.createdBy, input.authorId].includes(input.currentUserId);
  return {
    visa: activeVisaForUser(actions, input.currentUserId),
    signing: activeSignatureForUser(actions, input.currentUserId),
    unread: input.readState !== "READ",
    read: input.readState === "READ",
    chancellery: !!input.isChancellery && !!input.hasPendingChancellery,
    returned: [DocumentStatus.RETURNED_FOR_EDITING, DocumentStatus.VISA_RETURNED].includes(input.status as DocumentStatus),
    drafts: isDraftOwner,
    sent: input.createdBy === input.currentUserId && !isDraftOwner,
    completed: [DocumentStatus.SIGNED, DocumentStatus.COMPLETED, DocumentStatus.REGISTERED].includes(input.status as DocumentStatus),
  };
}
