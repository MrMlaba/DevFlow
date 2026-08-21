"use client";

import { useEffect, useRef, useState } from "react";
import { Download, File as FileIcon, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteTaskAttachmentAction,
  getAttachmentDownloadUrlAction,
  listTaskAttachmentsAction,
  uploadTaskAttachmentAction,
} from "@/features/attachments/actions";
import { initialFormState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TaskAttachment } from "@/services/attachments";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskAttachments({ taskId }: { taskId: string }) {
  const [items, setItems] = useState<TaskAttachment[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    listTaskAttachmentsAction(taskId).then((data) => {
      if (!cancelled) setItems(data);
    });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.set("taskId", taskId);
    formData.set("file", file);

    const result = await uploadTaskAttachmentAction(initialFormState, formData);
    if (inputRef.current) inputRef.current.value = "";

    if (result.status === "error") {
      setUploading(false);
      toast.error(result.message ?? "Upload failed.");
      return;
    }
    const fresh = await listTaskAttachmentsAction(taskId);
    setItems(fresh);
    setUploading(false);
    toast.success(`"${file.name}" attached.`);
  }

  async function onDownload(attachment: TaskAttachment) {
    try {
      const url = await getAttachmentDownloadUrlAction(attachment.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Couldn't generate a download link.");
    }
  }

  async function onDelete(attachment: TaskAttachment) {
    setPendingDelete(attachment.id);
    try {
      await deleteTaskAttachmentAction({ attachmentId: attachment.id });
      setItems((prev) => prev && prev.filter((a) => a.id !== attachment.id));
      toast.success(`"${attachment.file_name}" removed.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't remove attachment.");
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Attachments {items && items.length > 0 && `(${items.length})`}
        </h3>
        <Button
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading && <Loader2 className="size-3.5 animate-spin" />}
          {uploading ? "Uploading..." : "Add file"}
        </Button>
        <Input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={onFileChange}
          disabled={uploading}
        />
      </div>

      {items === null ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">No files attached yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm"
            >
              <FileIcon className="text-muted-foreground size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{attachment.file_name}</span>
              <span className="text-muted-foreground shrink-0 text-xs">
                {formatSize(attachment.size_bytes)}
              </span>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Download ${attachment.file_name}`}
                onClick={() => onDownload(attachment)}
              >
                <Download className="size-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Delete ${attachment.file_name}`}
                disabled={pendingDelete === attachment.id}
                onClick={() => onDelete(attachment)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
