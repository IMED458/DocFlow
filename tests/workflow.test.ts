import assert from "node:assert/strict";
import { DocumentStatus } from "../src/types.js";
import {
  activeSignatureForUser,
  activeVisaForUser,
  canEditDocument,
  canProceedToSignature,
  shouldAssignOfficialNumber,
  workflowFolderFlags,
} from "../src/workflowRules.js";

const userId = "usr-author";
const visaUserId = "usr-visa";

assert.equal(shouldAssignOfficialNumber(DocumentStatus.DRAFT), false, "draft must not receive official number");
assert.equal(shouldAssignOfficialNumber(DocumentStatus.SIGNED), true, "signed document receives official number");

assert.equal(canEditDocument(DocumentStatus.RETURNED_FOR_EDITING), true, "returned document must be editable");
assert.equal(canEditDocument(DocumentStatus.COMPLETED), false, "completed document must not be editable");

const pendingVisaActions = [{ role: "VISA" as const, status: "PENDING" as const, userId: visaUserId }];
assert.equal(activeVisaForUser(pendingVisaActions, visaUserId), true, "active visa must appear for reviewer");
assert.equal(canProceedToSignature(pendingVisaActions), false, "signature must wait for pending visa");

const approvedVisaAndPendingSign = [
  { role: "VISA" as const, status: "APPROVED" as const, userId: visaUserId },
  { role: "SIGN" as const, status: "PENDING" as const, userId },
];
assert.equal(canProceedToSignature(approvedVisaAndPendingSign), true, "all approved visas allow signature");
assert.equal(activeSignatureForUser(approvedVisaAndPendingSign, userId), true, "pending signer must see signature action");

const flags = workflowFolderFlags({
  status: DocumentStatus.WAITING_FOR_SIGNATURE,
  readState: "UNREAD",
  createdBy: "usr-creator",
  authorId: userId,
  currentUserId: userId,
  actions: approvedVisaAndPendingSign,
});
assert.equal(flags.signing, true, "signer sees document in signing folder");
assert.equal(flags.unread, true, "unopened assigned document is unread per user");

const chancelleryFlags = workflowFolderFlags({
  status: DocumentStatus.WAITING_FOR_CHANCELLERY,
  currentUserId: "usr-chanc",
  isChancellery: true,
  hasPendingChancellery: true,
});
assert.equal(chancelleryFlags.chancellery, true, "chancellery sees pending chancellery documents");

console.log("workflow tests passed");
