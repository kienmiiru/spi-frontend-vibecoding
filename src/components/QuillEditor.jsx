import { useEffect, useRef } from "react";

export default function QuillEditor({ value = "", onChange, quillInstanceRef }) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  const isInitRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || isInitRef.current) return;

    let script = document.getElementById("quill-js");

    if (window.Quill) {
      initializeQuill();
    } else {
      // Inject Quill styles dynamically if not present
      if (!document.getElementById("quill-css")) {
        const link = document.createElement("link");
        link.id = "quill-css";
        link.href = "https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css";
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }

      // Inject Quill JS dynamically if not present
      if (!script) {
        script = document.createElement("script");
        script.id = "quill-js";
        script.src = "https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js";
        document.body.appendChild(script);
      }

      script.addEventListener("load", initializeQuill);
    }

    function initializeQuill() {
      if (isInitRef.current || !containerRef.current) return;
      const q = new window.Quill(containerRef.current, {
        theme: "snow",
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["clean"],
          ],
        },
      });
      q.format('font', 'serif');

      quillRef.current = q;
      if (quillInstanceRef) {
        quillInstanceRef.current = q;
      }
      isInitRef.current = true;

      // Set initial values
      if (value) {
        try {
          const parsed = JSON.parse(value);
          if (parsed && (parsed.ops || Array.isArray(parsed))) {
            q.setContents(parsed.ops ? parsed : { ops: parsed });
          } else {
            q.setText(value);
          }
        } catch (_) {
          q.setText(value);
        }
      }

      q.on("text-change", () => {
        const delta = q.getContents();
        onChange(JSON.stringify(delta.ops));
      });
    }

    return () => {
      if (script) {
        script.removeEventListener("load", initializeQuill);
      }
    };
  }, []);

  // Sync value from parent if it changes programmatically
  useEffect(() => {
    if (quillRef.current && isInitRef.current) {
      const currentContents = quillRef.current.getContents();
      try {
        const parsed = JSON.parse(value);
        const targetOps = parsed && (parsed.ops || (Array.isArray(parsed) ? parsed : null));
        if (targetOps && JSON.stringify(currentContents.ops) !== JSON.stringify(targetOps)) {
          quillRef.current.setContents(parsed.ops ? parsed : { ops: parsed });
        }
      } catch (_) {
        // Plain text comparison
        const currentText = quillRef.current.getText().trim();
        if (currentText !== value.trim() && value.indexOf('"insert"') === -1) {
          quillRef.current.setText(value);
        }
      }
    }
  }, [value]);

  return (
    <div className="w-full bg-white rounded border border-gray-300">
      <div ref={containerRef} style={{ minHeight: "180px" }} />
    </div>
  );
}
