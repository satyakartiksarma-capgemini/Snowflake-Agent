
// @ts-nocheck
// components/admin_v2.tsx

import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { yaml as yamlLang } from "@codemirror/lang-yaml";
import { EditorView } from "@uiw/react-codemirror";
import YAML from "js-yaml";

/** ===== Types ===== */
interface RuleRow {
  ruleName: string;
  enabled: boolean;
  description: string;
}
type ViewMode = "table" | "yaml";

/** ===== Props ===== */
type AdminProps = {
  onClose: () => void;
  // ✅ prefer values passed from App.tsx
  baseUrl?: string;
  database?: string;
  schema?: string;
  warehouse?: string;
  token?: string;
  stage?: string; // optional override (defaults to AGENT_STAGE)
};

/** ===== Utility ===== */
const safe = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** ===== Component ===== */
export function AdminConfigEditor(props: AdminProps) {
  // ---- Env / Config: props first, then env fallback ----
  const BASE_URL = (safe(props.baseUrl) || safe(import.meta.env.VITE_SF_BASE_URL)).replace(/\/+$/, "");
  const DATABASE = safe(props.database) || safe(import.meta.env.VITE_SF_DATABASE);
  const SCHEMA = safe(props.schema) || safe(import.meta.env.VITE_SF_SCHEMA);
  const WAREHOUSE = safe(props.warehouse) || safe(import.meta.env.VITE_SF_WAREHOUSE) || undefined;
  const TOKEN = safe(props.token) || safe(import.meta.env.VITE_SF_BEARER_TOKEN);
  const STAGE = props.stage || "AGENT_STAGE";

  // Build Snowflake API details
  const STATEMENTS_URL = `${BASE_URL}/api/v2/statements`;
  const SF_HEADERS: Record<string, string> = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  /** ===== Helpers ===== */

  // Single normalization for ANY path that comes from LIST, user selection, or code.
  function normalizePath(input: string): string {
    let p = (input || "").trim().replace(/^'+|'+$/g, "");
    const fullPrefix = `@${DATABASE}.${SCHEMA}.${STAGE}/`;
    if (p.startsWith(fullPrefix)) p = p.slice(fullPrefix.length);
    const seg0 = p.split("/")[0] ?? "";
    if (seg0.toLowerCase() === STAGE.toLowerCase()) {
      p = p.split("/").slice(1).join("/");
    }
    while (p.startsWith("/")) p = p.slice(1);
    return p;
  }

  function unescapeHtml(s: string): string {
    return (s || "")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&quot;", '"')
      .replaceAll("&#39;", "'")
      .replaceAll("&amp;", "&");
  }

  async function runSql(
    statement: string,
    timeout: number = 120,
    context: { database?: string; schema?: string; warehouse?: string } = {
      database: DATABASE,
      schema: SCHEMA,
      warehouse: WAREHOUSE,
    }
  ): Promise<any[]> {
    const payload: Record<string, any> = {
      statement,
      timeout,
      database: context.database,
      schema: context.schema,
    };
    if (context.warehouse) payload.warehouse = context.warehouse;

    const resp = await fetch(STATEMENTS_URL, {
      method: "POST",
      headers: SF_HEADERS,
      body: JSON.stringify(payload),
      cache: "no-store"
    });
    if (!resp.ok) {
      const msg = await resp.text().catch(() => "");
      throw new Error(`SQL POST failed: ${resp.status} ${msg}`);
    }
    const data = await resp.json();

    // Synchronous result
    if (data?.data) return data.data;

    // Otherwise poll once (as in your original)
    const statusUrl: string | undefined = data?.statementStatusUrl;
    if (!statusUrl) {
      throw new Error(`No data and no statusUrl:\n${JSON.stringify(data, null, 2)}`);
    }
    const pollResp = await fetch(BASE_URL + statusUrl, { headers: SF_HEADERS, cache: "no-store" });
    if (!pollResp.ok) {
      const msg = await pollResp.text().catch(() => "");
      throw new Error(`SQL GET status failed: ${pollResp.status} ${msg}`);
    }
    const j = await pollResp.json();
    if (!j?.data) throw new Error(`Polled status but no data:\n${JSON.stringify(j, null, 2)}`);
    return j.data;
  }

  /** ===== SQL helpers (existing and new) ===== */

  // Whole-file format used for reading entire file content as $1
  async function ensureWholeFileFormat() {
    const sql = `
      create or replace file format ${SCHEMA}.FF_WHOLEFILE
      type = csv
      field_delimiter = '\\u0001'
      record_delimiter = 'NONE'
      skip_header = 0;
    `;
    await runSql(sql);
  }

  // NEW: Table to hold YAML content for each path (used to write back to stage)
  async function ensureConfigTable() {
    const sql = `
      create table if not exists ${SCHEMA}.CONFIG_FILES (
        path string primary key,
        content string,
        updated_at timestamp_ntz default current_timestamp()
      );
    `;
    await runSql(sql);
  }

  // NEW: Upsert content for a given normalized path
  async function upsertConfigContent(path: string, content: string) {
    // Escape single quotes for SQL literal
    const escaped = content.replace(/'/g, "''");
    const escapedPath = path.replace(/'/g, "''");
    const sql = `
      merge into ${SCHEMA}.CONFIG_FILES t
      using (select '${escapedPath}' as path, '${escaped}' as content) s
      on t.path = s.path
      when matched then update set content = s.content, updated_at = current_timestamp()
      when not matched then insert (path, content) values (s.path, s.content);
    `;
    await runSql(sql);
  }

  // NEW: Materialize table row as a single-record file at EXACT same stage/path

  async function copyTableRowToStage(path: string) {
    const escapedPath = path.replace(/'/g, "''");

    const sql = `
    copy into @${DATABASE}.${SCHEMA}.${STAGE}/"${escapedPath}"
    from (
      select content 
      from ${SCHEMA}.CONFIG_FILES 
      where path = '${escapedPath}'
    )
    file_format = (type = csv field_delimiter='\\u0001' record_delimiter='NONE' skip_header=0)
    overwrite = true;
  `;

    await runSql(sql);
  }


  // LIST files from the stage and produce normalized relative paths (only .yml/.yaml)
  async function listStageFiles(): Promise<string[]> {
    const sql = `LIST @${DATABASE}.${SCHEMA}.${STAGE}`;
    const rows = await runSql(sql);
    const re = /^(dq_config|config_s|config_agg).*\.ya?ml$/i;
    return (rows ?? [])
      .map((r: any[]) => r?.[0])
      .filter(Boolean)
      .map((name: string) => normalizePath(name))
      .filter((name: string) => re.test(name));
  }

  // Read entire file content from stage using the whole-file format

  async function readStageFileText(filename: string): Promise<string> {
    const safeName = normalizePath(filename);
    if (!safeName) throw new Error(`Resolved empty path from '${filename}' after normalization.`);

    // 1) Try table first (latest saved content)
    const escapedPath = safeName.replace(/'/g, "''");
    const tableSql = `
    select content
    from ${SCHEMA}.CONFIG_FILES
    where path = '${escapedPath}'
    limit 1;
  `;
    const tableRows = await runSql(tableSql);
    if (tableRows?.[0]?.[0]) {
      return unescapeHtml(tableRows[0][0]);
    }

    // 2) Fall back to reading the original stage file
    const stageSql = `
    select $1 as content
    from @${DATABASE}.${SCHEMA}.${STAGE}/${safeName} (file_format => ${SCHEMA}.FF_WHOLEFILE);
  `;
    const rows = await runSql(stageSql);
    if (!rows?.[0]?.[0]) {
      throw new Error(`No content returned for ${safeName}. Check path and FF_WHOLEFILE.`);
    }
    return unescapeHtml(rows[0][0]);
  }


  /** ===== UI state ===== */
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [fileContent, setFileContent] = useState<string>("");
  const [rows, setRows] = useState<RuleRow[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false);
  const [loadingDoc, setLoadingDoc] = useState<boolean>(false);

  const dirty = useMemo(() => {
    const yamlFromRows = convertRowsToYaml(rows);
    return Boolean(selectedFile && yamlFromRows !== fileContent);
  }, [rows, fileContent, selectedFile]);

  useEffect(() => {
    (async () => {
      setLoadingFiles(true);
      try {
        await ensureWholeFileFormat();
        const items = await listStageFiles();
        setFiles(items);
      } catch (err) {
        console.error(err);
        setFiles([]);
      } finally {
        setLoadingFiles(false);
      }
    })();
  }, []);

  function parseYamlToRows(yamlString: string) {
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
      // keep rows unchanged
    }
  }

  function convertRowsToYaml(list: RuleRow[]) {
    const dqChecks: Record<string, { enabled: boolean; description: string }> = {};
    list.forEach((row) => {
      if (!row.ruleName) return;
      dqChecks[row.ruleName] = {
        enabled: !!row.enabled,
        description: row.description ?? "",
      };
    });
    return YAML.dump({ dq_checks: dqChecks });
  }

  const loadFile = async (filename: string) => {
    setLoadingDoc(true);
    try {
      const normalized = normalizePath(filename);
      const content = await readStageFileText(normalized);
      setSelectedFile(normalized);
      setFileContent(content);
      parseYamlToRows(content);
      setViewMode("table");
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDoc(false);
    }
  };

  // ✨ NEW SAVE: writes directly to Snowflake (table -> stage overwrite), then refreshes UI.
  const save = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      const path = normalizePath(selectedFile);
      const toSave = viewMode === "table" ? convertRowsToYaml(rows) : fileContent;

      await ensureWholeFileFormat();
      await ensureConfigTable();

      // 1) Persist to table
      await upsertConfigContent(path, toSave);

      // 2) Overwrite file at EXACT same stage path
      await copyTableRowToStage(path);

      // 3) Update local editor state
      setFileContent(toSave);

      // 4) Refresh left pane list and re-read file from stage to reflect true bytes on disk
      setLoadingFiles(true);
      const items = await listStageFiles();
      setFiles(items);
      setLoadingFiles(false);

      setLoadingDoc(true);
      const fresh = await readStageFileText(path);
      setSelectedFile(path);
      setFileContent(fresh);
      parseYamlToRows(fresh);
      setLoadingDoc(false);

      // setTimeout(() => {
      //   window.location.reload();
      // }, 150);

    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const addRow = () =>
    setRows((prev) => [...prev, { ruleName: `new_rule_${prev.length + 1}`, enabled: false, description: "" }]);

  const deleteRow = (index: number) =>
    setRows((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });

  const updateRow = (index: number, field: keyof RuleRow, value: RuleRow[keyof RuleRow]) =>
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

  // ===== Render =====
  return (
    <div className="fixed inset-0 z-50 bg-white overflow-auto p-4">
      <div className="flex items-center justify-between p-2 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800">
          {selectedFile ? `Editing: ${selectedFile}` : "Config Editor"}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (viewMode === "table") {
                const updatedYaml = convertRowsToYaml(rows);
                setFileContent(updatedYaml);
              }
              setViewMode((m) => (m === "yaml" ? "table" : "yaml"));
            }}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            {viewMode === "yaml" ? "Table View" : "YAML View"}
          </button>
          <button
            onClick={save}
            disabled={!selectedFile || saving}
            className={`px-6 py-2 font-semibold rounded-lg text-white ${saving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
          >
            {saving ? "Saving..." : dirty ? "Save *" : "Save"}
          </button>
          <button
            onClick={() => {
              if (dirty && !window.confirm("You have unsaved changes. Close anyway?")) return;
              props.onClose();
            }}
            className="px-6 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600"
          >
            Close
          </button>
        </div>
      </div>

      <div className="flex h-[80vh]">
        {/* Sidebar */}
        <div className="w-1/4 max-w-xs bg-gray-50 border-r border-gray-200 p-5 overflow-y-auto rounded-md">
          <h3 className="font-semibold text-lg text-gray-700 mb-3">Config Files</h3>
          {loadingFiles && <div className="text-gray-500 text-sm mb-2">Loading...</div>}
          <ul className="space-y-1">
            {(files ?? []).map((file) => (
              <li key={file}>
                <button
                  onClick={() => loadFile(file)}
                  className={`block w-full text-left p-2 rounded-md transition-colors duration-150 ${selectedFile === file
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

        {/* Editor panel */}
        <div className="w-4/5 p-4 border border-gray-300 rounded overflow-y-auto">
          {!selectedFile ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-xl">
              Select a file from the left to edit.
            </div>
          ) : loadingDoc ? (
            <div className="text-gray-600">Loading document...</div>
          ) : viewMode === "yaml" ? (
            <CodeMirror
              value={fileContent}
              onChange={(value) => {
                setFileContent(value ?? "");
                try {
                  parseYamlToRows(value ?? "");
                } catch { }
              }}
              height="70vh"
              extensions={[yamlLang(), EditorView.lineWrapping]}
              basicSetup={{ lineNumbers: true, highlightActiveLine: true }}
              style={{ fontFamily: "monospace", textAlign: "left", width: "100%" }}
            />
          ) : (
            <div>
              <table className="min-w-full border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Rule Name</th>
                    <th className="border p-2 text-left">Description</th>
                    <th className="border p-2 text-left">Enabled</th>
                    <th className="border p-2 text-left">Actions</th>
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
                          className="mx-auto block"
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

              <div className="mt-3 flex items-center justify-center">
                <button
                  onClick={addRow}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Add Rule
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}