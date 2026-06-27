import fs from "fs";
import path from "path";
import {
  User,
  Organization,
  Department,
  Position,
  Document,
  DocumentVersion,
  DocumentFile,
  DocumentRecipient,
  DocumentAddressee,
  DocumentBasisLink,
  DocumentRelatedLink,
  ExternalResolution,
  DocumentExternalResolutionLink,
  NumberingRule,
  NumberingSequence,
  VisaAction,
  Resolution,
  Task,
  TaskComment,
  Notification,
  AuditLog,
  ExternalContact,
  HeaderFooterTemplate,
  Stamp,
  DeliveryRecord,
  UserRole,
  DocumentCategory,
  DocumentType,
  DocumentStatus,
  VisaActionStatus,
  TaskStatus
} from "../types.js";

const DB_PATH = path.resolve("./db.json");

export interface DatabaseSchema {
  organizations: Organization[];
  departments: Department[];
  positions: Position[];
  users: User[];
  documents: Document[];
  document_versions: DocumentVersion[];
  document_files: DocumentFile[];
  document_recipients: DocumentRecipient[];
  document_addressees: DocumentAddressee[];
  document_basis_links: DocumentBasisLink[];
  document_related_links: DocumentRelatedLink[];
  external_resolutions: ExternalResolution[];
  document_external_resolution_links: DocumentExternalResolutionLink[];
  numbering_rules: NumberingRule[];
  numbering_sequences: NumberingSequence[];
  visa_actions: VisaAction[];
  resolutions: Resolution[];
  tasks: Task[];
  task_comments: TaskComment[];
  notifications: Notification[];
  audit_logs: AuditLog[];
  external_contacts: ExternalContact[];
  header_footer_templates: HeaderFooterTemplate[];
  stamps: Stamp[];
  delivery_records: DeliveryRecord[];
}

let db: DatabaseSchema = {
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

// Seed Helper
function generateUUID(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function loadDatabase() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf-8");
      db = JSON.parse(data);
    } else {
      seedDatabase();
      saveDatabase();
    }
  } catch (error) {
    console.error("Failed to load database, seeding fresh...", error);
    seedDatabase();
    saveDatabase();
  }
}

export function saveDatabase() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save database:", error);
  }
}

function seedDatabase() {
  console.log("Seeding Database...");

  // 1. Organizations
  const org: Organization = {
    id: "org-1",
    name: "საქართველოს განათლებისა და მეცნიერების სამინისტრო",
    code: "203851536",
    phone: "+995 32 2 200 220",
    address: "თბილისი, დიმიტრი უზნაძის ქ. 52",
    email: "info@mes.gov.ge",
    logoUrl: ""
  };
  db.organizations.push(org);

  // 2. Departments
  const deps: Department[] = [
    { id: "dep-it", name: "საინფორმაციო ტექნოლოგიების დეპარტამენტი", organizationId: "org-1" },
    { id: "dep-legal", name: "იურიდიული დეპარტამენტი", organizationId: "org-1" },
    { id: "dep-chanc", name: "კანცელარია", organizationId: "org-1" },
    { id: "dep-finance", name: "საფინანსო დეპარტამენტი", organizationId: "org-1" },
    { id: "dep-pr", name: "საზოგადოებასთან ურთიერთობის დეპარტამენტი", organizationId: "org-1" }
  ];
  db.departments = deps;

  // 3. Positions
  const pos: Position[] = [
    { id: "pos-it-head", name: "საინფორმაციო ტექნოლოგიების დეპარტამენტის უფროსი", departmentId: "dep-it" },
    { id: "pos-it-spec", name: "წამყვანი სპეციალისტი", departmentId: "dep-it" },
    { id: "pos-legal-head", name: "იურიდიული დეპარტამენტის უფროსი", departmentId: "dep-legal" },
    { id: "pos-legal-adv", name: "მთავარი იურისტი", departmentId: "dep-legal" },
    { id: "pos-chanc-head", name: "კანცელარიის უფროსი", departmentId: "dep-chanc" },
    { id: "pos-chanc-reg", name: "უფროსი რეგისტრატორი", departmentId: "dep-chanc" },
    { id: "pos-finance-head", name: "საფინანსო დეპარტამენტის უფროსი", departmentId: "dep-finance" },
    { id: "pos-pr-head", name: "საზოგადოებასთან ურთიერთობის სამსახურის უფროსი", departmentId: "dep-pr" }
  ];
  db.positions = pos;

  // 4. Users (plain passwords for mock auth)
  const users: User[] = [
    {
      id: "usr-admin",
      firstName: "ადმინისტრატორი",
      lastName: "სისტემური",
      personalNumber: "01024035678",
      email: "admin@docflow.ge",
      phone: "+995 599 111 222",
      departmentId: "dep-it",
      positionId: "pos-it-head",
      role: UserRole.ADMIN,
      status: "ACTIVE",
      stampPermission: true,
      password: "admin123"
    },
    {
      id: "usr-chanc",
      firstName: "გიორგი",
      lastName: "მელაძე",
      personalNumber: "01019088765",
      email: "register@docflow.ge",
      phone: "+995 599 333 444",
      departmentId: "dep-chanc",
      positionId: "pos-chanc-reg",
      role: UserRole.CHANCELLERY,
      status: "ACTIVE",
      stampPermission: true,
      password: "register123"
    },
    {
      id: "usr-manager",
      firstName: "ლადო",
      lastName: "ახვლედიანი",
      personalNumber: "01005044321",
      email: "manager@docflow.ge",
      phone: "+995 599 555 666",
      departmentId: "dep-it",
      positionId: "pos-it-head",
      role: UserRole.MANAGER,
      status: "ACTIVE",
      stampPermission: false,
      password: "manager123"
    },
    {
      id: "usr-signer",
      firstName: "მარიამ",
      lastName: "ბერიძე",
      personalNumber: "01012033445",
      email: "signer@docflow.ge",
      phone: "+995 599 777 888",
      departmentId: "dep-legal",
      positionId: "pos-legal-head",
      role: UserRole.SIGNER,
      status: "ACTIVE",
      stampPermission: true,
      signatureImage: "data:image/png;base64,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"
    },
    {
      id: "usr-executor",
      firstName: "დავით",
      lastName: "კობახიძე",
      personalNumber: "01027066543",
      email: "executor@docflow.ge",
      phone: "+995 599 999 000",
      departmentId: "dep-it",
      positionId: "pos-it-spec",
      role: UserRole.EXECUTOR,
      status: "ACTIVE",
      stampPermission: false,
      password: "executor123"
    },
    {
      id: "usr-visa",
      firstName: "ნინო",
      lastName: "ჭანტურია",
      personalNumber: "01030044556",
      email: "visa@docflow.ge",
      phone: "+995 599 888 777",
      departmentId: "dep-legal",
      positionId: "pos-legal-adv",
      role: UserRole.VISA_APPROVER,
      status: "ACTIVE",
      stampPermission: false,
      password: "visa123"
    }
  ];
  db.users = users;

  // 5. Numbering Rules
  const rules: NumberingRule[] = [
    {
      id: "rule-1",
      prefix: "MES",
      separator: " ",
      yearFormat: "YYYY",
      sequenceLength: 6,
      resetYearly: true
    },
    {
      id: "rule-in",
      prefix: "IN",
      separator: "-",
      yearFormat: "YYYY",
      sequenceLength: 6,
      resetYearly: true,
      category: DocumentCategory.INCOMING
    },
    {
      id: "rule-out",
      prefix: "OUT",
      separator: "-",
      yearFormat: "YYYY",
      sequenceLength: 6,
      resetYearly: true,
      category: DocumentCategory.OUTGOING
    }
  ];
  db.numbering_rules = rules;

  // 6. Numbering Sequences
  const seqs: NumberingSequence[] = [
    { id: "seq-1", ruleId: "rule-1", currentNumber: 805303, year: 2026 },
    { id: "seq-in", ruleId: "rule-in", currentNumber: 128, year: 2026 },
    { id: "seq-out", ruleId: "rule-out", currentNumber: 45, year: 2026 }
  ];
  db.numbering_sequences = seqs;

  // 7. Stamp
  const stamps: Stamp[] = [
    {
      id: "stamp-1",
      name: "სამინისტროს ოფიციალური ბეჭედი",
      imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABwSgBFAAAACXBIWXMAAAsTAAALEwEAmpwYAAAHe0lEQVR4nO2dbVBU1xnHf3dhlYVllYV1gSgI6gIuSgSNoFEbS6fGZpI0bZPMpE0nab90mrap7bSZTmdaZ9Lp9At96bSZTidp6jSdaatO0mYidVDoRFESQQREBAXWXYFl2V3YvR8gK9fLvXv3Xg677+fOnHPPOf/7P8/933PPuYfDGBgYGBgYGBgYGBgYGBhExY/66Yf9e3j5/9p+Nf8v8E+YofM73T7Z/NfO64M3v9v9g7Xzst/m807n68f3MvvM0OncOnZ7h3fT6ey42b3T6fS76Tqd39Zg6WpksHTe8ePZ38+2M0B6h/fQ6XTZ93mXpTtt3rVzzb+XgW/9mOnatdf/jP978SInTrTzR6fzdvN3Otv+vXb6ZPr6M0B6x27v9G4GSO/0M0C68rscu3baZesOk6Uzzf87WbquD56D16bTO317bT3b9vWunWvX2un0Ovv9e/97gqV3SAdId8W/pZ0NffAatTNgfK8PXp/MvMvWb/b7zNru27/O0L3m8+k9O26H78u+T3bXv3G8V3Z8F6Pff2fXg+nbfp30Gdv/I3+Wff1gO+W1e33Xv6WvL8v3f3/Wf66f9S7L9073tq73K2VfZ5f9O/Kz7HP6XpPZ+Z7szvP0OfYpve7IunK67vSZpM9eW/atO9963el8607n3vOznT6T/F1u8+DZdUe2X+uO++r9/XbWvdM373Lp896rX6t6v+p8886b6b7f3p86p89vO30/u/9N8na5u79NdnZ96t7W9X6VvT6vvd6m7O2v2pX7Vfbq37Wb/96u/u9bZZfv1+p9X3Yqy678nO9j2fezz7Xb+u/0/fTfVfe2zndve/XfbZZf+dmV9T43n7/qfa177XqX7X9/1e93t6v3bZdffWe2s1PZ993m9H3u7rv/7bK7f//6p35/dfv6v0rWb7v1fqX7+6v2fV99zvepe9/vSvf2u3Z6/5+86f7bZfe5fvaXfW650/fZZXfpv7tT2dn/Xen+b5XN/fO46S7X953Wv3bpfS+ZfTfLfUdfX0Zf97qPZZdl3fP8G/r3997pfS/L97H+r+t03tHX+X/V39/0713Wv2nZ6XzXfN+7ZZff+6Xsu8vSfZ9+P32fev1+Vv5++vy/zO7fe7+X3f/9Vfb32ezr17+f7u+Psvv/bZb+u9uUf3er0v28vUu69/1U7+vrvH2u7L5n3e/lS9Xf3eXv8n+f7tq9p/f9VL0//V6+XP25/O8u/f91p+p8r7u8re/V/b33/t8q/e91u/S+1+X0vW87+b0P6feZvt97X7U+T70/fX/7Pv798fN369+vL9vU/Srfj/F9S/++Z3b72W3L8n/Prsvyv2eX9W9T9X79+Z8vtf/Xp7LPX3V++jL6/fa9D+/Huv7b+v/L3FvdruyH+vW35fv0+Zsc3vdX9vXv7fO/O7/+X32eXfa5L+nrXtfXveZzfZ+Vn+/T2be660rZfX53m/v7Wv/39S5vp7L/70vSva77mX6/7UryvXrfZ/p6lzfv6/P22XmZ6ff9bO6/X9vntnXP9y3p6733vO9D+vO6+Z9zfZ97v9bH9XWXe7/O507fX9mvvNfcN59nvsuvU+fX++6r10/fp96XPl/9ufzvLvt3vS/LvpfP/Yvszrt9MttZt8/2u32fd9k6eW06fV9/v6Fvfe892b+e9D4vy/fF93lJ/S79ffre7++D8/7f8/0g/f8qfT/V99v9f7tL/9b3s89b3fG95rS++z4va36v77O9fB8P6H88X76f/p9pX9P/O93P63vd2V3Z95/L8j2b0/eR+/76/T9g6L8D+L60/f/VfWqZ6ff53Wf0fe6X8vX+G8v/6n6g+9n6/p7Zf9P1vW6fve/Auu9O78/fZ8Pz+f6tqW83U/fZef1b9319uuv7bK/ve8/vvs8+eK/P+6n0vU/f50P8PfT7D6TfP9+v9W2m/X7D+b/fMPfv3M/T7ZOf+pDPW+p8L1/H9u/O9/mN/t85fZ8f0Pc93vX5eG1b/P9+g7z76Z86ff+7ffN++V6+F9+L7/v8RreZfS++X+p7mbtz+l6/ke/X+rO77vv3N+T9XN9nzb5++n+66750H3UffO9G93nX9+9vWP896vstfX99H7n9O/L79L7fv8633/2W+T78Of9Z+r3sfs/s68vu/+Z89vfeMv9ntp3P/r7vPrvMez+Zff9997rPzXedvM/Nd8y8zzXvfb/KznfPe98vtfv+Lvf9Uv3fvvv+LvP9Uvb3XfPvMv8v83fP/+06vd9675S+XzK/+16+j6T36X1evvX+TffZ59/3e++UvevP786+9yX1e++973tf9t+Pfe8u33rv9N/P++6zy/u9bJ28NqTPW2fbeu96n7W9U/f6Ndf76b7u79e6/XfK7v7XznvPtfu/L8v/vF9i37vrLteu+/8vUf+93DfdO33X/f93Z99O/Uen+/5B9r+r1v6ffz9e6Y/tP6e9ZpU9pX/Z9pW7fU+q3Zf6fdKfe/wfdfqXfvveZPv4D/gL+Ar6An8A/wAfgA3AA/ge/A/8CH4APwAf9V5D//W6f/N/v7p9O90+607vVvdPpdPdOfz//H8gIqZis5e/xAAAAAElFTkSuQmCC",
      isActive: true
    }
  ];
  db.stamps = stamps;

  // 8. Header Footer Templates
  const templates: HeaderFooterTemplate[] = [
    {
      id: "tpl-default",
      name: "სამინისტროს ოფიციალური ბლანკი",
      headerTextGeo: "საქართველოს განათლებისა და მეცნიერების სამინისტრო",
      headerTextEng: "Ministry of Education and Science of Georgia",
      logoUrl: "",
      contactDetails: "ტელ: +995 32 2 200 220 | ელ-ფოსტა: info@mes.gov.ge",
      address: "თბილისი, დიმიტრი უზნაძის ქ. 52",
      phone: "+995 32 2 200 220",
      email: "info@mes.gov.ge",
      website: "www.mes.gov.ge",
      identificationCode: "203851536",
      isDefault: true
    }
  ];
  db.header_footer_templates = templates;

  // 9. External Contacts
  const contacts: ExternalContact[] = [
    {
      id: "cont-parl",
      name: "საქართველოს პარლამენტი",
      organization: "საქართველოს პარლამენტი",
      taxId: "204582674",
      address: "რუსთაველის გამზ. 8, თბილისი",
      email: "contact@parliament.ge",
      phone: "+995 32 2 281 100",
      contactType: "ORGANIZATION",
      notes: "საქართველოს უმაღლესი წარმომადგენლობითი ორგანო"
    },
    {
      id: "cont-tbilisi",
      name: "თბილისის მერია",
      organization: "ქალაქ თბილისის მერია",
      taxId: "204493002",
      address: "შარტავას ქ. 7, თბილისი",
      email: "info@tbilisi.gov.ge",
      phone: "+995 32 2 722 222",
      contactType: "ORGANIZATION",
      notes: "ადგილობრივი თვითმმართველობის ორგანო"
    }
  ];
  db.external_contacts = contacts;

  // 10. External Resolutions
  const extRes: ExternalResolution[] = [
    {
      id: "ext-res-1",
      resolutionNumber: "12-A/2026",
      resolutionDate: "2026-05-15",
      organization: "საქართველოს მთავრობა",
      person: "ირაკლი კობახიძე",
      title: "საჯარო უწყებებში ელექტრონული მმართველობის დანერგვის შესახებ",
      description: "მთავრობის დადგენილება #514 ციფრული ტრანსფორმაციის ხელშეწყობის შესახებ.",
      createdBy: "usr-admin",
      createdAt: "2026-05-20T10:00:00Z"
    }
  ];
  db.external_resolutions = extRes;

  // 11. Documents (Seeded beautifully in Georgian)
  const docs: Document[] = [
    {
      id: "doc-1",
      documentNumber: "MES 2 26 0000805303",
      registrationNumber: "REG-2026-000214",
      entryNumber: "IN-2026-000128",
      documentDate: "2026-06-25",
      registrationDate: "2026-06-25",
      category: DocumentCategory.INCOMING,
      documentType: DocumentType.LETTER,
      subject: "თანამშრომლობა ციფრული განათლების პროექტებში",
      description: "თბილისის მერიის წერილი სკოლებში კომპიუტერული ლაბორატორიების მოწყობის თაობაზე.",
      body: `<h3>პატივცემულო მინისტრის მოადგილევ,</h3>
<p>გაცნობებთ, რომ ქალაქ თბილისის მერია გეგმავს ახალი საგანმანათლებლო პროექტის დაწყებას, რომელიც მიზნად ისახავს თბილისის საჯარო სკოლებში თანამედროვე ტექნოლოგიური ლაბორატორიების მოწყობას და მოსწავლეებში პროგრამირების საფუძვლების პოპულარიზაციას.</p>
<p>აღნიშნულიდან გამომდინარე, გთხოვთ განიხილოთ ჩვენი წინადადება ერთობლივი სამუშაო ჯგუფის შექმნისა და პროექტის საპილოტე ვერსიის შემუშავების შესახებ.</p>
<p>საფუძვლად გთხოვთ იხელმძღვანელოთ მთავრობის #514 დადგენილებით (გარე რეზოლუცია #12-A/2026).</p>
<p>პატივისცემით,<br/><strong>კახა კალაძე</strong><br/>თბილისის მერი</p>`,
      sender: "თბილისის მერია",
      recipient: "საქართველოს განათლების სამინისტრო",
      authorId: "usr-chanc",
      departmentId: "dep-chanc",
      responsibleId: "usr-manager",
      deadline: "2026-07-10",
      priority: "HIGH",
      confidentiality: "PUBLIC",
      status: DocumentStatus.RESOLUTION_ASSIGNED,
      visaStatus: "APPROVED",
      signatureStatus: "SIGNED",
      printStatus: "NOT_PRINTED",
      archiveStatus: "ACTIVE",
      pageCount: 2,
      attachmentCount: 1,
      createdBy: "usr-chanc",
      createdAt: "2026-06-25T11:00:00Z",
      updatedBy: "usr-chanc",
      updatedAt: "2026-06-25T11:30:00Z"
    },
    {
      id: "doc-2",
      category: DocumentCategory.INTERNAL,
      documentType: DocumentType.MEMO,
      subject: "IT ინფრასტრუქტურის განახლება დეპარტამენტში",
      description: "მოხსენებითი ბარათი ახალი სერვერული აღჭურვილობის შესყიდვის შესახებ.",
      body: `<h3>საინფორმაციო ტექნოლოგიების დეპარტამენტის მოხსენებითი ბარათი</h3>
<p>გაცნობებთ, რომ სამინისტროს შიდა სერვერებზე დატვირთვა ბოლო თვეების განმავლობაში მნიშვნელოვნად გაიზარდა ელექტრონული დოკუმენტბრუნვის ახალი სისტემის (DocFlow Georgia) გაშვებასთან დაკავშირებით.</p>
<p>სისტემის გამართული მუშაობისა და მომხმარებელთა შეუფერხებელი მომსახურებისთვის, აუცილებელია IT ინფრასტრუქტურის განახლება და დამატებითი მეხსიერების მოდულების შეძენა.</p>
<p>გთხოვთ, დაავალოთ საფინანსო დეპარტამენტს შესაბამისი სახსრების მობილიზება.</p>`,
      authorId: "usr-manager",
      departmentId: "dep-it",
      priority: "NORMAL",
      confidentiality: "PUBLIC",
      status: DocumentStatus.DRAFT,
      pageCount: 1,
      attachmentCount: 0,
      createdBy: "usr-manager",
      createdAt: "2026-06-26T09:15:00Z",
      updatedBy: "usr-manager",
      updatedAt: "2026-06-26T09:15:00Z"
    },
    {
      id: "doc-3",
      documentNumber: "MES 2 26 0000805304",
      registrationNumber: "REG-2026-000215",
      entryNumber: "OUT-2026-000045",
      documentDate: "2026-06-26",
      registrationDate: "2026-06-26",
      category: DocumentCategory.OUTGOING,
      documentType: DocumentType.LETTER,
      subject: "ანგარიში პარლამენტს საფინანსო აუდიტის შესახებ",
      description: "გასული წერილი საქართველოს პარლამენტისთვის საფინანსო აუდიტის დასკვნის წარდგენაზე.",
      body: `<h3>საქართველოს პარლამენტის თავმჯდომარეს,</h3>
<p>წარმოგიდგენთ საქართველოს განათლებისა და მეცნიერების სამინისტროს 2025 წლის ბიუჯეტის შესრულების ფინანსური აუდიტის დეტალურ ანგარიშს.</p>
<p>ანგარიშში ასახულია ყველა მიზნობრივი პროგრამის ხარჯვითი ნაწილი, მიღწეული შედეგები და ფინანსური მართვის ეფექტიანობის გაუმჯობესების რეკომენდაციები.</p>
<p>დანართის სახით იხილეთ სრული აუდიტორული დასკვნა 12 გვერდზე.</p>
<p>პატივისცემით,<br/><strong>მარიამ ბერიძე</strong><br/>იურიდიული დეპარტამენტის უფროსი</p>`,
      sender: "საქართველოს განათლების სამინისტრო",
      recipient: "საქართველოს პარლამენტი",
      authorId: "usr-signer",
      departmentId: "dep-legal",
      responsibleId: "usr-signer",
      deadline: "2026-07-15",
      priority: "NORMAL",
      confidentiality: "PUBLIC",
      status: DocumentStatus.SIGNED,
      visaStatus: "APPROVED",
      signatureStatus: "SIGNED",
      printStatus: "NOT_PRINTED",
      archiveStatus: "ACTIVE",
      pageCount: 13,
      attachmentCount: 1,
      createdBy: "usr-signer",
      createdAt: "2026-06-26T10:00:00Z",
      updatedBy: "usr-signer",
      updatedAt: "2026-06-26T11:00:00Z",
      signedAt: "2026-06-26T11:00:00Z"
    }
  ];
  db.documents = docs;

  // 12. Document Versions
  db.document_versions = [
    {
      id: "ver-1",
      documentId: "doc-1",
      body: docs[0].body,
      versionNumber: 1,
      updatedBy: "usr-chanc",
      updatedAt: "2026-06-25T11:00:00Z"
    },
    {
      id: "ver-2",
      documentId: "doc-3",
      body: docs[2].body,
      versionNumber: 1,
      updatedBy: "usr-signer",
      updatedAt: "2026-06-26T10:00:00Z"
    }
  ];

  // 13. External Resolution Link
  db.document_external_resolution_links = [
    {
      id: "link-ext-1",
      documentId: "doc-1",
      externalResolutionId: "ext-res-1",
      relationshipType: "გარე რეზოლუციაზე მიბმული",
      comment: "მთავრობის დადგენილება ციფრულ ტრანსფორმაციაზე",
      linkedBy: "usr-chanc",
      linkedAt: "2026-06-25T11:15:00Z"
    }
  ];

  // 14. Document Files
  db.document_files = [
    {
      id: "file-1",
      documentId: "doc-1",
      filename: "tbilisi_proposal_2026.pdf",
      storageKey: "files/doc-1/proposal.pdf",
      mimeType: "application/pdf",
      size: 1542030,
      hash: "8f7e2a4b9c1d6e5f3a0b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f",
      uploaderId: "usr-chanc",
      uploadDate: "2026-06-25T11:10:00Z",
      fileType: "MAIN"
    },
    {
      id: "file-2",
      documentId: "doc-3",
      filename: "financial_audit_2025.pdf",
      storageKey: "files/doc-3/audit.pdf",
      mimeType: "application/pdf",
      size: 4890220,
      hash: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
      uploaderId: "usr-signer",
      uploadDate: "2026-06-26T10:05:00Z",
      fileType: "MAIN"
    }
  ];

  // 15. Visa Actions (Pre-configured approvals)
  db.visa_actions = [
    {
      id: "visa-1",
      documentId: "doc-1",
      userId: "usr-visa",
      role: "VISA",
      status: VisaActionStatus.APPROVED,
      comment: "პროექტი ძალიან მნიშვნელოვანია, მხარს ვუჭერ იურიდიულად.",
      actionDate: "2026-06-25T12:00:00Z"
    },
    {
      id: "visa-2",
      documentId: "doc-1",
      userId: "usr-signer",
      role: "SIGN",
      status: VisaActionStatus.APPROVED,
      comment: "დამტკიცებულია მინისტრის აპარატის მიერ.",
      actionDate: "2026-06-25T12:30:00Z"
    },
    {
      id: "visa-3",
      documentId: "doc-3",
      userId: "usr-visa",
      role: "VISA",
      status: VisaActionStatus.APPROVED,
      comment: "ფინანსური ანგარიში შეესაბამება სტანდარტებს.",
      actionDate: "2026-06-26T10:30:00Z"
    },
    {
      id: "visa-4",
      documentId: "doc-3",
      userId: "usr-signer",
      role: "SIGN",
      status: VisaActionStatus.APPROVED,
      comment: "ხელმოწერილია გასაგზავნად.",
      actionDate: "2026-06-26T11:00:00Z"
    }
  ];

  // 16. Resolutions
  db.resolutions = [
    {
      id: "res-1",
      documentId: "doc-1",
      text: "საინფორმაციო ტექნოლოგიების დეპარტამენტს (ლადო ახვლედიანი): გთხოვთ განიხილოთ წინადადება, შეისწავლოთ ტექნიკური საჭიროებები თბილისის საჯარო სკოლებისთვის და მოამზადოთ შესაბამისი დასკვნა 2026 წლის 10 ივლისამდე.",
      creatorId: "usr-manager",
      createdAt: "2026-06-25T14:00:00Z",
      deadline: "2026-07-10"
    }
  ];

  // 17. Tasks
  db.tasks = [
    {
      id: "tsk-1",
      documentId: "doc-1",
      resolutionId: "res-1",
      assigneeId: "usr-executor",
      coAssignees: [],
      status: TaskStatus.PROGRESS,
      deadline: "2026-07-08",
      description: "საჯარო სკოლების ტექნიკური ბაზის აღწერა და კოორდინაცია თბილისის მერიის წარმომადგენლებთან.",
      createdBy: "usr-manager",
      createdAt: "2026-06-25T14:15:00Z",
      completionFiles: []
    }
  ];

  // 18. Audit Logs
  db.audit_logs = [
    {
      id: "audit-1",
      userId: "usr-chanc",
      userFullName: "გიორგი მელაძე",
      action: "REGISTER_DOCUMENT",
      entityType: "DOCUMENT",
      entityId: "doc-1",
      newValues: JSON.stringify({ documentNumber: "MES 2 26 0000805303", registrationNumber: "REG-2026-000214" }),
      timestamp: "2026-06-25T11:00:00Z"
    },
    {
      id: "audit-2",
      userId: "usr-signer",
      userFullName: "მარიამ ბერიძე",
      action: "SIGN_DOCUMENT",
      entityType: "DOCUMENT",
      entityId: "doc-3",
      newValues: JSON.stringify({ status: "SIGNED", signedAt: "2026-06-26T11:00:00Z" }),
      timestamp: "2026-06-26T11:00:00Z"
    }
  ];

  // 19. Notifications
  db.notifications = [
    {
      id: "not-1",
      userId: "usr-manager",
      title: "ახალი დოკუმენტი რეზოლუციისთვის",
      message: "თქვენ დაგემორჩილათ დოკუმენტი: MES 2 26 0000805303 საგანმანათლებლო ლაბორატორიებზე.",
      read: false,
      createdAt: "2026-06-25T11:35:00Z"
    },
    {
      id: "not-2",
      userId: "usr-executor",
      title: "ახალი დავალება",
      message: "მენეჯერმა ლადო ახვლედიანმა მოგცათ დავალება დოკუმენტზე: MES 2 26 0000805303.",
      read: false,
      createdAt: "2026-06-25T14:15:00Z"
    }
  ];

  // 20. Delivery records
  db.delivery_records = [
    {
      id: "del-1",
      documentId: "doc-3",
      method: "EMAIL",
      trackingNumber: "EMAIL-2026-00412",
      recipientName: "საქართველოს პარლამენტი (კანცელარია)",
      date: "2026-06-26T11:15:00Z"
    }
  ];

  console.log("Database Seeded Successfully!");
}

// Initialize on Import
loadDatabase();
