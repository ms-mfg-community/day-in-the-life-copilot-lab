import { openWorkspaceFile, saveOpenFile } from "../controller";
import { useStudio } from "../store";
import type { TreeNode } from "../types";

function Node({ node, depth }: { node: TreeNode; depth: number }): JSX.Element {
  const selected = useStudio((s) => s.selectedFile);
  if (node.kind === "dir") {
    return (
      <div>
        <button
          className="file-node dir"
          style={{ paddingLeft: 8 + depth * 14 }}
          disabled
        >
          {node.name}/
        </button>
        {node.children?.map((child) => (
          <Node key={child.path} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  }
  return (
    <button
      className={`file-node${selected === node.path ? " selected" : ""}`}
      style={{ paddingLeft: 8 + depth * 14 }}
      onClick={() => void openWorkspaceFile(node.path)}
    >
      {node.name}
    </button>
  );
}

export function FilesPanel(): JSX.Element {
  const tree = useStudio((s) => s.tree);
  const selectedFile = useStudio((s) => s.selectedFile);
  const fileContent = useStudio((s) => s.fileContent);
  const fileDirty = useStudio((s) => s.fileDirty);
  const setFileContent = useStudio((s) => s.setFileContent);

  return (
    <div className="files">
      <div className="file-tree">
        {tree.map((node) => (
          <Node key={node.path} node={node} depth={0} />
        ))}
      </div>
      <div className="file-editor">
        {selectedFile ? (
          <>
            <div className="file-editor-head">
              <span>
                {selectedFile}
                {fileDirty ? " — unsaved changes" : ""}
              </span>
              <button
                className="action run"
                disabled={!fileDirty}
                onClick={() => void saveOpenFile()}
              >
                Save ▸
              </button>
            </div>
            <textarea
              value={fileContent}
              spellCheck={false}
              onChange={(e) => setFileContent(e.target.value, true)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                  e.preventDefault();
                  void saveOpenFile();
                }
              }}
              aria-label={`Editing ${selectedFile}`}
            />
          </>
        ) : (
          <div className="file-empty">
            Select a file from the workspace tree.
            <br />
            Changes you save here are what Copilot reads.
          </div>
        )}
      </div>
    </div>
  );
}
