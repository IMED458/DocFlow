import React, { useState, useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Table,
  Heading1,
  Heading2,
  Link as LinkIcon,
  Minus,
  RotateCcw,
  RotateCw,
  Save,
  Clock,
  LayoutTemplate,
  FileCheck,
  CheckCircle,
  HelpCircle
} from "lucide-react";
import { Document, DocumentType, DocumentCategory } from "../types.js";

interface DocumentEditorProps {
  document?: Document;
  onSaveBody: (body: string) => void;
  versions: any[];
  isReadOnly: boolean;
  onRollback: (version: any) => void;
}

export default function DocumentEditor({
  document,
  onSaveBody,
  versions,
  isReadOnly,
  onRollback
}: DocumentEditorProps) {
  const [body, setBody] = useState(document?.body || "");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"SAVED" | "SAVING" | "IDLE">("IDLE");
  const [showTemplates, setShowTemplates] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const lastSavedBodyRef = useRef(document?.body || "");
  const pendingBodyRef = useRef(document?.body || "");

  useEffect(() => {
    if (document) {
      const nextBody = document.body || "";
      setBody(nextBody);
      lastSavedBodyRef.current = nextBody;
      pendingBodyRef.current = nextBody;
      if (editorRef.current && editorRef.current.innerHTML !== nextBody) {
        editorRef.current.innerHTML = nextBody;
      }
    }
  }, [document?.id]);

  useEffect(() => {
    if (isReadOnly) return;
    const delayDebounce = setTimeout(() => {
      const nextBody = pendingBodyRef.current;
      if (nextBody !== lastSavedBodyRef.current) {
        setAutoSaveStatus("SAVING");
        setTimeout(() => {
          onSaveBody(nextBody);
          lastSavedBodyRef.current = nextBody;
          setAutoSaveStatus("SAVED");
          setTimeout(() => setAutoSaveStatus("IDLE"), 2000);
        }, 1000);
      }
    }, 3000);

    return () => clearTimeout(delayDebounce);
  }, [body, isReadOnly]);

  // Exec HTML editor commands
  const execCommand = (command: string, value: string = "") => {
    if (isReadOnly) return;
    window.document.execCommand(command, false, value);
    if (editorRef.current) {
      pendingBodyRef.current = editorRef.current.innerHTML;
      setBody(editorRef.current.innerHTML);
    }
  };

  // Standard official Georgian templates
  const insertTemplate = (tplType: string) => {
    let tplContent = "";
    if (tplType === "MEMO") {
      tplContent = `
        <h3 style="text-align: center; font-family: Outfit, sans-serif;">მოხსენებითი ბარათი</h3>
        <p><strong>ვის:</strong> საინფორმაციო ტექნოლოგიების დეპარტამენტის უფროსს</p>
        <p><strong>ვისგან:</strong> მთავარი სპეციალისტისგან</p>
        <p><strong>თარიღი:</strong> ${new Date().toISOString().split("T")[0]}</p>
        <hr/>
        <p>მოგახსენებთ, რომ სამინისტროს შენობაში დაზიანდა ქსელური კაბელები, რის გამოც მესამე სართულზე თანამშრომლებს არ მიეწოდებათ ინტერნეტი.</p>
        <p>გთხოვთ დაავალოთ შესაბამის ჯგუფს საკითხის შესწავლა და ქსელის აღდგენა.</p>
        <br/><br/>
        <p>პატივისცემით,</p>
      `;
    } else if (tplType === "ORDER") {
      tplContent = `
        <h3 style="text-align: center; font-family: Outfit, sans-serif;">ინდივიდუალური ადმინისტრაციულ-სამართლებრივი აქტი</h3>
        <p style="text-align: center; font-weight: bold;">ბრძანება #01-26</p>
        <p style="text-align: right;">${new Date().toISOString().split("T")[0]}</p>
        <hr/>
        <p>„საქართველოს საჯარო სამსახურის შესახებ“ კანონის მე-12 მუხლის შესაბამისად, <strong>ვბრძანებ:</strong></p>
        <ol>
          <li>შეიქმნას სამუშაო ჯგუფი ელექტრონული მმართველობის ახალი პლატფორმის დასანერგად.</li>
          <li>კონტროლი ბრძანების შესრულებაზე დაეკისროს საინფორმაციო ტექნოლოგიების დეპარტამენტს.</li>
          <li>ბრძანება ძალაში შედის ხელმოწერისთანავე.</li>
        </ol>
        <br/><br/>
        <p>მინისტრი:</p>
      `;
    } else {
      tplContent = `
        <h3>ოფიციალური მიმართვა</h3>
        <p><strong>ადრესატი:</strong> საქართველოს პარლამენტი</p>
        <p>გაცნობებთ, რომ სამინისტროში განხილულ იქნა თქვენი წერილი საგანმანათლებლო პროგრამების დაფინანსებასთან დაკავშირებით.</p>
        <p>დეტალური ანგარიში წარმოდგენილია წინამდებარე დოკუმენტის დანართში.</p>
      `;
    }
    if (editorRef.current) {
      editorRef.current.innerHTML = tplContent;
      pendingBodyRef.current = tplContent;
      setBody(tplContent);
    }
  };

  const handleManualSave = () => {
    const nextBody = editorRef.current?.innerHTML ?? pendingBodyRef.current;
    pendingBodyRef.current = nextBody;
    onSaveBody(nextBody);
    lastSavedBodyRef.current = nextBody;
    setAutoSaveStatus("SAVED");
    setTimeout(() => setAutoSaveStatus("IDLE"), 2000);
  };

  const insertTable = () => {
    execCommand("insertHTML", "<table style=\"width:100%;border-collapse:collapse;margin:12px 0\"><tbody><tr><td style=\"border:1px solid #94a3b8;padding:8px\"> </td><td style=\"border:1px solid #94a3b8;padding:8px\"> </td></tr><tr><td style=\"border:1px solid #94a3b8;padding:8px\"> </td><td style=\"border:1px solid #94a3b8;padding:8px\"> </td></tr></tbody></table><p></p>");
  };

  const insertLink = () => {
    const url = window.prompt("ბმულის მისამართი");
    if (url) execCommand("createLink", url);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col min-h-[75vh] overflow-hidden">
      {/* Editor Toolbar */}
      <div className="bg-slate-50 border-b border-slate-100 p-3 flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="flex items-center flex-wrap gap-1">
          {/* Style Controls */}
	          <button
	            type="button"
            disabled={isReadOnly}
            onClick={() => execCommand("bold")}
            className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-40"
            title="სქელი"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => execCommand("italic")}
            className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-40"
            title="დახრილი"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => execCommand("underline")}
            className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-40"
            title="ხაზგასმული"
          >
            <Underline className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-slate-200 mx-1"></span>

          {/* Align Controls */}
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => execCommand("justifyLeft")}
            className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-40"
            title="მარცხნივ სწორება"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => execCommand("justifyCenter")}
            className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-40"
            title="ცენტრში სწორება"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => execCommand("justifyRight")}
            className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-40"
            title="მარჯვნივ სწორება"
	          >
	            <AlignRight className="w-4 h-4" />
	          </button>
	          <button
	            type="button"
	            disabled={isReadOnly}
	            onClick={() => execCommand("justifyFull")}
	            className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-40"
	            title="ორივე მხარეს სწორება"
	          >
	            <AlignJustify className="w-4 h-4" />
	          </button>

	          <span className="w-px h-5 bg-slate-200 mx-1"></span>

	          <button type="button" disabled={isReadOnly} onClick={() => execCommand("formatBlock", "h1")} className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-40" title="სათაური 1">
	            <Heading1 className="w-4 h-4" />
	          </button>
	          <button type="button" disabled={isReadOnly} onClick={() => execCommand("formatBlock", "h2")} className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-40" title="სათაური 2">
	            <Heading2 className="w-4 h-4" />
	          </button>
	          <button type="button" disabled={isReadOnly} onClick={() => execCommand("formatBlock", "p")} className="px-2 py-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-40 text-xs font-bold" title="პარაგრაფი">
	            P
	          </button>

	          <span className="w-px h-5 bg-slate-200 mx-1"></span>

          {/* Lists */}
	          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => execCommand("insertUnorderedList")}
            className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-40"
            title="სია"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => execCommand("insertOrderedList")}
            className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-40"
            title="დანომრილი სია"
          >
	            <ListOrdered className="w-4 h-4" />
	          </button>
	          <button type="button" disabled={isReadOnly} onClick={insertTable} className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-40" title="ცხრილის ჩასმა">
	            <Table className="w-4 h-4" />
	          </button>
	          <button type="button" disabled={isReadOnly} onClick={() => execCommand("insertHorizontalRule")} className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-40" title="გამყოფი ხაზი">
	            <Minus className="w-4 h-4" />
	          </button>
	          <button type="button" disabled={isReadOnly} onClick={insertLink} className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-40" title="ბმული">
	            <LinkIcon className="w-4 h-4" />
	          </button>

          <span className="w-px h-5 bg-slate-200 mx-1"></span>

          {/* Templates Selector */}
          {!isReadOnly && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-sans font-medium hover:bg-slate-200 text-slate-700 rounded-lg transition"
                title="შაბლონები"
              >
                <LayoutTemplate className="w-4 h-4 text-indigo-500" />
                შაბლონები
              </button>
              {showTemplates && (
                <div className="absolute top-9 left-0 bg-white border border-slate-200 rounded-xl shadow-lg p-2 w-56 z-50">
                  <span className="text-xxs font-bold text-slate-400 font-sans px-2 block mb-1">
                    სამინისტროს შაბლონები
                  </span>
                  <button
                    onClick={() => {
                      insertTemplate("MEMO");
                      setShowTemplates(false);
                    }}
                    className="w-full text-left text-xs font-sans px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-700"
                  >
                    მოხსენებითი ბარათი
                  </button>
                  <button
                    onClick={() => {
                      insertTemplate("ORDER");
                      setShowTemplates(false);
                    }}
                    className="w-full text-left text-xs font-sans px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-700"
                  >
                    ინდივიდუალური ბრძანება
                  </button>
                  <button
                    onClick={() => {
                      insertTemplate("LETTER");
                      setShowTemplates(false);
                    }}
                    className="w-full text-left text-xs font-sans px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-700"
                  >
                    ოფიციალური მიმართვა
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Statuses / Manual save */}
        <div className="flex items-center gap-3">
          {isReadOnly ? (
            <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg text-xs font-sans">
              <FileCheck className="w-4 h-4" />
              ხელმოწერილი (Read-Only)
            </div>
          ) : (
            <>
              {autoSaveStatus === "SAVING" && (
                <span className="text-xxs font-sans text-amber-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  ინახება...
                </span>
              )}
              {autoSaveStatus === "SAVED" && (
                <span className="text-xxs font-sans text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  შენახულია
                </span>
              )}

              <button
                type="button"
                onClick={handleManualSave}
                className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-sans font-medium px-3 py-1.5 rounded-lg transition"
              >
                <Save className="w-3.5 h-3.5" />
                შენახვა
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor Body and Versions Sidebar Split Pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor Writing Board */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 flex justify-center">
          <div className="bg-white w-full max-w-5xl p-6 sm:p-12 min-h-[70vh] border border-slate-200/60 rounded-xl shadow-xs focus:outline-hidden">
            {isReadOnly ? (
              <div
                className="prose max-w-none text-slate-800 font-sans leading-relaxed whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{ __html: body || "<p className='text-slate-400 italic'>ტექსტი ცარიელია</p>" }}
              ></div>
            ) : (
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={e => {
                  pendingBodyRef.current = e.currentTarget.innerHTML;
                  setBody(e.currentTarget.innerHTML);
                }}
                className="min-h-[64vh] focus:outline-hidden font-sans text-slate-800 leading-relaxed text-sm outline-hidden whitespace-pre-wrap break-words"
                placeholder="დაწერეთ დოკუმენტის შინაარსი ქართულად აქ..."
              ></div>
            )}
          </div>
        </div>

        {/* Versions List (If any) */}
        {versions.length > 0 && (
          <div className="w-64 border-l border-slate-100 bg-slate-50 flex flex-col overflow-y-auto">
            <div className="p-4 bg-slate-100 border-b border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 font-display flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                ცვლილებების ისტორია
              </h4>
            </div>
            <div className="p-2 space-y-2 flex-1">
              {versions.map((ver, idx) => (
                <div
                  key={ver.id}
                  className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xxs hover:shadow-xs transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-700 font-sans">ვერსია {ver.versionNumber}</span>
                    <span className="text-xxs font-mono text-slate-400">{ver.updatedAt.split("T")[0]}</span>
                  </div>
                  <p className="text-xxs font-sans text-slate-500 mt-1.5 truncate">რედაქტორი: {ver.updatedBy}</p>
                  {!isReadOnly && ver.body !== body && (
                    <button
                      onClick={() => {
                        onRollback(ver);
                        setBody(ver.body);
                        if (editorRef.current) editorRef.current.innerHTML = ver.body;
                      }}
                      className="text-xxs text-indigo-600 hover:text-indigo-800 font-bold font-sans mt-2.5 block text-right"
                    >
                      ამ ვერსიაზე დაბრუნება
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
