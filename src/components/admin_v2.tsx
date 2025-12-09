
import { useState, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { yaml as yamlLang } from "@codemirror/lang-yaml";
import { EditorView } from "@uiw/react-codemirror";
import { CheckCheck, Table, FileText } from "lucide-react";
import YAML from "js-yaml";

interface RuleRow {
  ruleName: string;
  enabled: boolean;
  description: string;
}

function AdminConfigEditor({ onClose }: { onClose: () => void }) {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [viewMode, setViewMode] = useState<"yaml" | "table">("yaml");
  const [rows, setRows] = useState<RuleRow[]>([]);

  // Use env-configured Snowflake base & bearer token everywhere
  const SF_BASE = import.meta.env.VITE_SF_BASE_URL!;
  const SF_TOKEN = import.meta.env.VITE_SF_BEARER_TOKEN!;

  // --- List files in the stage (Left panel) ---
  useEffect(() => {
    const listUrl = `https://PIHJDMO-SFCOECORTEX.snowflakecomputing.com/v1/data/stages/MY_DB/PUBLIC/AGENT_STAGE/files`;

    fetch(listUrl, {
      headers: {
        Authorization: `Bearer ${SF_TOKEN}`,
        Accept: "application/json",
        "X-Snowflake-Authorization-Token-Type": "OAUTH",
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(`List files failed: ${res.status} ${msg}`);
        }
        return res.json();
      })
      .then((data) => {
        // Normalize to a string[]
        const items =
          Array.isArray(data?.files)
            ? data.files
            : Array.isArray(data?.files?.items)
            ? data.files.items.map((f: any) => f.path ?? f.name)
            : [];
        setFiles(items.filter(Boolean));
      })
      .catch((err) => {
        console.error(err);
        setFiles([]); // keep UI stable
      });
  }, [SF_BASE, SF_TOKEN]);

  // --- Load a file’s raw YAML (Right panel) ---
  const loadFile = (filename: string) => {
    const stagePath = filename?.trim() || "dq_config.yaml";

    const readUrl = `https://PIHJDMO-SFCOECORTEX.snowflakecomputing.com/v1/data/stages/MY_DB/PUBLIC/AGENT_STAGE/files/dq_check.yaml`;

    fetch(readUrl, {
      headers: {
        Authorization: `Bearer ${SF_TOKEN}`,
        Accept: "text/plain", // we want raw YAML
        "X-Snowflake-Authorization-Token-Type": "OAUTH",
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(`Load failed for ${stagePath}: ${res.status} ${msg}`);
        }
        return res.text(); // IMPORTANT: read as text
      })
      .then((content) => {
        setSelectedFile(stagePath);
        setFileContent(content);
        parseYamlToRows(content);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  // --- Parse YAML into table rows ---
  const parseYamlToRows = (yamlString: string) => {
    try {
      const parsed: any = YAML.load(yamlString) ?? {};
      const dqChecks = parsed?.dq_checks ?? {};
      const newRows: RuleRow[] = Object.entries(dqChecks).map(([key, value]: any) => ({
        ruleName: key,
        enabled: Boolean(value?.enabled),
        description: value?.description ?? "",
      }));
      setRows(newRows);
    } catch (err) {
      console.error("Invalid YAML:", err);
      // keep rows as-is so UI doesn't crash
    }
  };

  // --- Convert table rows back to YAML ---
  const convertRowsToYaml = () => {
    const dqChecks: Record<string, { enabled: boolean; description: string }> = {};
    rows.forEach((row) => {
      if (!row.ruleName) return;
      dqChecks[row.ruleName] = {
        enabled: !!row.enabled,
        description: row.description ?? "",
      };
    });
    return YAML.dump({ dq_checks: dqChecks });
  };

  // --- Save: post to your backend (round-trip handled server-side) ---
  const saveFile = async () => {
    if (!selectedFile) return;
    setSaveStatus("saving");
    try {
      const contentToSave = viewMode === "table" ? convertRowsToYaml() : fileContent;

      const res = await fetch(`/api/admin/config/${encodeURIComponent(selectedFile)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contentToSave),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        throw new Error((data as any)?.message ?? "Save failed");
      }
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
    }
  };

  // --- Table helpers ---
  const addRow = () => {
    setRows([...rows, { ruleName: "", enabled: false, description: "" }]);
  };
  const deleteRow = (index: number) => {
    const updated = [...rows];
    updated.splice(index, 1);
    setRows(updated);
  };
  const updateRow = (index: number, field: keyof RuleRow, value: RuleRow[keyof RuleRow]) => {
    setRows((prevRows) => {
      const updated = [...prevRows];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // --- Editor extensions (spread to avoid nested arrays) ---
  const getEditorExtension = () => {
    if (!selectedFile) return [];
    if (selectedFile.endsWith(".yaml") || selectedFile.endsWith(".yml")) return [yamlLang()];
    return [];
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800">
          {selectedFile ? `Editing: ${selectedFile}` : "Config Editor"}
        </h2>
        <div className="flex space-x-3">
          {selectedFile && (
            <>
              <button
                onClick={() => {
                  if (viewMode === "table") {
                    // Convert updated rows back to YAML before switching
                    const updatedYaml = convertRowsToYaml();
                    setFileContent(updatedYaml);
                  }
                  setViewMode(viewMode === "yaml" ? "table" : "yaml");
                }}
                className="px-4 py-2 bg-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-300"
              >
                {viewMode === "yaml" ? <Table size={18} /> : <FileText size={18} />}
                {viewMode === "yaml" ? "Table View" : "YAML View"}
              </button>

              <button
                onClick={saveFile}
                className={`px-6 py-2 font-semibold rounded-lg transition-colors duration-200 shadow-md flex items-center gap-2
                ${saveStatus === "success" ? "bg-green-600 hover:bg-green-700 text-white" :
                  saveStatus === "error" ? "bg-red-600 hover:bg-red-700 text-white" :
                  "bg-blue-600 hover:bg-blue-700 text-white"}`}
              >
                {saveStatus === "success" ? (
                  <>
                    <CheckCheck size={18} />
                    <span>Saved</span>
                  </>
                ) : saveStatus === "saving" ? "Saving..." : "Save"}
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors duration-200 shadow-md cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      <div className="flex h-[80vh]">
        {/* Left Panel */}
        <div className="w-1/4 max-w-xs bg-gray-50 border-r border-gray-200 p-5 overflow-y-auto rounded-md">
          <h3 className="font-semibold text-lg text-gray-700 mb-3">Config Files</h3>
          <ul className="space-y-1">
            {(files ?? []).map((file) => (
              <li key={file}>
                <button
                  onClick={() => loadFile(file)}
                  className={`block w-full text-left p-2 rounded-md transition-colors duration-150 ${
                    selectedFile === file
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {file}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Panel */}
        <div className="w-4/5 p-4 max-h-[500px] overflow-y-auto border border-gray-300 rounded">
          {selectedFile ? (
            viewMode === "yaml" ? (
              <CodeMirror
                value={fileContent}
                onChange={(value) => {
                  setFileContent(value);
                  try {
                    parseYamlToRows(value);
                  } catch (e) {
                    console.error("YAML parse error:", e);
                  }
                }}
                height="100%"
                extensions={[...getEditorExtension(), EditorView.lineWrapping]} // <-- spread to avoid nested arrays
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLine: true,
                }}
                style={{
                  fontFamily: "monospace",
                  textAlign: "left",
                  width: "100%",
                }}
              />
            ) : (
              <div>
                <table className="min-w-full border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2">Rule Name</th>
                      <th className="border p-2">Description</th>
                      <th className="border p-2">Enabled</th>
                      <th className="border p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={index}>
                        <td className="border p-2">
                          <input
                            type="text"
                            value={row.ruleName}
                            onChange={(e) => updateRow(index, "ruleName", e.target.value)}
                            className="w-full border rounded px-2"
                          />
                        </td>
                        <td className="border p-2">
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => updateRow(index, "description", e.target.value)}
                            className="w-full border rounded px-2"
                          />
                        </td>
                        <td className="border p-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            onChange={(e) => updateRow(index, "enabled", e.target.checked)}
                          />
                        </td>
                        <td className="border p-2 text-center">
                          <button
                            onClick={() => deleteRow(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={addRow}
                  className="mt-3 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Add Rule
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center font-semibold text-2xl justify-center h-full text-gray-500">
              <p>Please select the file to configure.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { AdminConfigEditor };
