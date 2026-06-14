import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, RefreshCw, Tags } from "lucide-react";
import type { RemoteFile, StorageAdapter } from "../adapters/StorageAdapter";
import type { ProcessingTask, ResourceCheckStatus, ResourceContentCategory } from "../domain/types";
import { useTaskStore } from "../state/taskStore";
import { useStorageMode } from "../state/storageModeStore";
import { Card, StatCard, StatusDot, Tag } from "../components/ui";
import { classifyResource, RESOURCE_LIBRARY_ROOT } from "../services/ResourceMetadataService";

const CATEGORIES: ResourceContentCategory[] = [
  "课程资料",
  "设计素材",
  "文档模板",
  "软件工具",
  "电子书/PDF",
  "图片素材",
  "音频资料",
  "视频素材",
  "综合资料包",
  "未识别"
];

interface LibraryResourceEntry {
  id: string;
  title: string;
  contentCategory: ResourceContentCategory;
  savePath: string;
  checkStatus: ResourceCheckStatus;
  fileCount: number;
  source: "resource_library";
}

export function ArchivePage() {
  const { activeTask, tasks } = useTaskStore();
  const { activeMode, connectionOk, getActiveAdapter } = useStorageMode();
  const [libraryEntries, setLibraryEntries] = useState<LibraryResourceEntry[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | undefined>();
  const category = activeTask?.resource?.contentCategory ?? libraryEntries[0]?.contentCategory ?? "未识别";
  const totalResourceCount = tasks.length + libraryEntries.length;
  const totalFileCount = (activeTask?.summary.recognizedFiles ?? 0) || libraryEntries.reduce((sum, entry) => sum + entry.fileCount, 0);

  const refreshLibrary = useCallback(async () => {
    setLibraryLoading(true);
    setLibraryError(undefined);
    try {
      const entries = await readResourceLibrary(getActiveAdapter());
      setLibraryEntries(entries);
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : "读取资源库失败");
    } finally {
      setLibraryLoading(false);
    }
  }, [getActiveAdapter]);

  useEffect(() => {
    if (connectionOk) {
      void refreshLibrary();
    }
  }, [activeMode, connectionOk, refreshLibrary]);

  const archiveRows = useMemo(() => buildArchiveRows(tasks, libraryEntries), [tasks, libraryEntries]);

  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h2>资源归档</h2>
          <p>读取盘姬资源库里的转存记录，按资源内容做分类；不默认移动、重命名网盘里的文件。</p>
        </div>
        <button className="primary-btn" type="button" onClick={refreshLibrary} disabled={libraryLoading || !connectionOk}>
          <RefreshCw size={18} />
          {libraryLoading ? "读取中" : "刷新资源库"}
        </button>
      </div>

      <div className="kpi-grid">
        <StatCard icon="类" label="当前分类" value={category} tone="blue" />
        <StatCard icon="源" label="资源条目" value={totalResourceCount} tone="green" />
        <StatCard icon="文" label="文件数量" value={totalFileCount} tone="purple" />
        <StatCard icon="检" label="检查状态" value={checkStatusLabel(activeTask?.resource?.checkStatus)} tone="orange" />
      </div>

      {libraryError && <p className="notice">资源库读取失败：{libraryError}</p>}
      {!connectionOk && <p className="notice">CLI 未登录或未连接，登录后才能读取 /{RESOURCE_LIBRARY_ROOT}。</p>}

      <div className="archive-grid">
        <ResourceCategoryPanel task={activeTask} libraryEntries={libraryEntries} />
        <ResourceHistoryTable rows={archiveRows} activeTaskId={activeTask?.id} loading={libraryLoading} />
        <OriginalFilesPanel task={activeTask} libraryEntries={libraryEntries} />
      </div>
    </section>
  );
}

function ResourceCategoryPanel({ task, libraryEntries }: { task?: ProcessingTask; libraryEntries: LibraryResourceEntry[] }) {
  const firstLibraryEntry = libraryEntries[0];
  return (
    <Card title="资源分类结果" action={<Tag tone="green">资源级分类</Tag>}>
      <div className="rename-preview">
        <div>
          <span>资源标题</span>
          <b>{task?.resource?.title ?? firstLibraryEntry?.title ?? "暂无资源"}</b>
        </div>
        <div>
          <span>内容分类</span>
          <b>{task?.resource?.contentCategory ?? firstLibraryEntry?.contentCategory ?? "未识别"}</b>
        </div>
        <div>
          <span>保存路径</span>
          <b>{task?.resource?.savePath ?? firstLibraryEntry?.savePath ?? `${RESOURCE_LIBRARY_ROOT}/{日期}/{任务名}`}</b>
        </div>
        <div>
          <span>检查状态</span>
          <b>{checkStatusLabel(task?.resource?.checkStatus ?? firstLibraryEntry?.checkStatus)}</b>
        </div>
      </div>
    </Card>
  );
}

function ResourceHistoryTable({
  rows,
  activeTaskId,
  loading
}: {
  rows: ArchiveRow[];
  activeTaskId?: string;
  loading: boolean;
}) {
  return (
    <Card title="资源库记录" className="span-2" action={<Tag>读取 /{RESOURCE_LIBRARY_ROOT}</Tag>}>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>资源标题</th>
              <th>内容分类</th>
              <th>保存路径</th>
              <th>检查状态</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={row.id === activeTaskId ? "selected" : ""}>
                <td>{row.title}</td>
                <td>{row.contentCategory}</td>
                <td>{row.savePath}</td>
                <td>{checkStatusLabel(row.checkStatus)}</td>
                <td>
                  <StatusDot tone={row.statusTone} />
                  {row.statusLabel}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5}>
                  {loading ? "正在读取资源库..." : "暂无资源记录。完成一次原样转存，或点击刷新资源库读取已有目录。"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function OriginalFilesPanel({ task, libraryEntries }: { task?: ProcessingTask; libraryEntries: LibraryResourceEntry[] }) {
  return (
    <Card title="归档说明" action={<ClipboardList size={18} />}>
      <div className="rename-preview">
        <div>
          <span>文件名</span>
          <b>默认保持原名</b>
        </div>
        <div>
          <span>目录结构</span>
          <b>默认保持原结构</b>
        </div>
        <div>
          <span>可选分类</span>
          <b>{CATEGORIES.join(" / ")}</b>
        </div>
      </div>
      <p className="notice">这里的分类是“这份资源属于什么内容”，用于转发文案和导出，不是把文件塞进视频/文档/图片文件夹。</p>
      <p className="muted">当前任务文件数：{task?.summary.recognizedFiles ?? 0}；资源库已读取：{libraryEntries.length} 条。</p>
    </Card>
  );
}

interface ArchiveRow {
  id: string;
  title: string;
  contentCategory: ResourceContentCategory;
  savePath: string;
  checkStatus: ResourceCheckStatus;
  statusLabel: string;
  statusTone: "green" | "orange" | "red" | "blue";
}

function buildArchiveRows(tasks: ProcessingTask[], libraryEntries: LibraryResourceEntry[]): ArchiveRow[] {
  const taskRows: ArchiveRow[] = tasks.map((task) => ({
    id: task.id,
    title: task.resource?.title ?? task.name,
    contentCategory: task.resource?.contentCategory ?? "未识别",
    savePath: task.resource?.savePath ?? task.rawDirectory ?? "未生成",
    checkStatus: task.resource?.checkStatus ?? "unchecked",
    statusLabel: task.status === "partial_completed" ? "部分完成" : task.status === "failed" ? "失败" : "已完成",
    statusTone: task.status === "failed" ? "red" : task.status === "partial_completed" ? "orange" : "green"
  }));

  const knownPaths = new Set(taskRows.map((row) => row.savePath));
  const libraryRows = libraryEntries
    .filter((entry) => !knownPaths.has(entry.savePath))
    .map<ArchiveRow>((entry) => ({
      id: entry.id,
      title: entry.title,
      contentCategory: entry.contentCategory,
      savePath: entry.savePath,
      checkStatus: entry.checkStatus,
      statusLabel: "资源库",
      statusTone: "blue"
    }));

  return [...taskRows, ...libraryRows];
}

async function readResourceLibrary(adapter: StorageAdapter): Promise<LibraryResourceEntry[]> {
  const rootPath = `/${RESOURCE_LIBRARY_ROOT}`;
  const rootItems = await adapter.listFiles({ remoteDirectory: rootPath });
  const dateDirectories = rootItems.filter((item) => item.isDirectory && /^\d{4}-\d{2}-\d{2}$/.test(item.name));
  const parentDirectories = dateDirectories.length > 0 ? dateDirectories : rootItems.filter((item) => item.isDirectory);
  const entries: LibraryResourceEntry[] = [];

  for (const dateDirectory of parentDirectories.slice(0, 30)) {
    const children = await adapter.listFiles({ remoteDirectory: dateDirectory.path }).catch(() => []);
    for (const child of children.slice(0, 100)) {
      entries.push(toLibraryResourceEntry(child));
    }
  }

  if (entries.length === 0) {
    return rootItems.slice(0, 100).map((item) => toLibraryResourceEntry(item));
  }
  return entries;
}

function toLibraryResourceEntry(file: RemoteFile): LibraryResourceEntry {
  const metadata = classifyResource({ rawText: file.name, files: [file], savePath: file.path });
  return {
    id: `library:${file.path}`,
    title: metadata.title,
    contentCategory: metadata.contentCategory,
    savePath: file.path,
    checkStatus: "unchecked",
    fileCount: file.isDirectory ? 0 : 1,
    source: "resource_library"
  };
}

function checkStatusLabel(status?: ResourceCheckStatus): string {
  if (status === "checked") return "已检查";
  if (status === "pending") return "等待检查";
  if (status === "unsupported") return "功能未接线";
  return "未检查";
}
