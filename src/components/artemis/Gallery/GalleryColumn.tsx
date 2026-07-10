import { useEffect, useRef, useState } from "react";
import { useDeleteGallery, useGallery, useUploadGallery } from "@/hooks/use-gallery";
import { useUpdateDashboardDriveUrl } from "@/hooks/use-dashboards";
import styles from "./Gallery.module.css";

interface Props {
  userId: string | undefined;
  dashboardId: string | undefined;
  driveUrl: string | null;
  canEditDrive: boolean;
}

function normalizeUrl(raw: string): string {
  const u = raw.trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) return `https://${u}`;
  return u;
}

export function GalleryColumn({ userId, dashboardId, driveUrl, canEditDrive }: Props) {
  const { data: items = [], isLoading } = useGallery(userId, dashboardId);
  const uploadMut = useUploadGallery();
  const deleteMut = useDeleteGallery();
  const updateDrive = useUpdateDashboardDriveUrl();
  const inputRef = useRef<HTMLInputElement>(null);
  const [landscapeIds, setLandscapeIds] = useState<Record<string, boolean>>({});
  const [editingDrive, setEditingDrive] = useState(false);
  const [driveDraft, setDriveDraft] = useState(driveUrl ?? "");

  useEffect(() => setDriveDraft(driveUrl ?? ""), [driveUrl]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId || !dashboardId) return;
    try {
      await uploadMut.mutateAsync({ userId, dashboardId, file });
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'upload");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string, storage_path: string) => {
    if (!userId || !dashboardId) return;
    if (!confirm("Supprimer cette photo ?")) return;
    await deleteMut.mutateAsync({ id, storage_path, userId, dashboardId });
  };

  const handleImgLoad = (id: string) => (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const isLandscape = img.naturalWidth > img.naturalHeight * 1.05;
    setLandscapeIds((prev) =>
      prev[id] === isLandscape ? prev : { ...prev, [id]: isLandscape }
    );
  };

  const saveDrive = () => {
    if (!dashboardId) return;
    const v = normalizeUrl(driveDraft);
    updateDrive.mutate(
      { dashboardId, url: v === "" ? null : v },
      { onSuccess: () => setEditingDrive(false) },
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>Ma galerie</div>
        <button
          className={styles.uploadBtn}
          onClick={() => inputRef.current?.click()}
          disabled={uploadMut.isPending || !dashboardId}
        >
          {uploadMut.isPending ? "..." : "+ Ajouter"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className={styles.hiddenInput}
          onChange={handleUpload}
        />
      </div>

      {isLoading ? (
        <div className={styles.empty}>Chargement...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          Aucune photo encore.<br />Ajoute ta première image !
        </div>
      ) : (
        <div className={styles.grid}>
          {items.map((it) => {
            const isLandscape = landscapeIds[it.id];
            return (
              <div
                key={it.id}
                className={`${styles.item} ${isLandscape ? styles.itemLandscape : ""}`}
              >
                {it.signedUrl && (
                  <img
                    className={`${styles.img} ${isLandscape ? styles.imgContain : ""}`}
                    src={it.signedUrl}
                    alt={it.caption ?? "Photo"}
                    loading="lazy"
                    onLoad={handleImgLoad(it.id)}
                  />
                )}
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(it.id, it.storage_path)}
                  aria-label="Supprimer"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.driveBlock}>
        {driveUrl && !editingDrive ? (
          <div className={styles.driveRow}>
            <a
              href={driveUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.driveLink}
            >
              <span>🗂️</span>
              <span>Ouvrir le Google Drive</span>
              <span className={styles.driveArrow}>↗</span>
            </a>
            {canEditDrive && (
              <button
                type="button"
                className={styles.driveEditBtn}
                onClick={() => setEditingDrive(true)}
                aria-label="Modifier le lien Drive"
                title="Modifier"
              >
                ✎
              </button>
            )}
          </div>
        ) : canEditDrive ? (
          <div className={styles.driveEdit}>
            <input
              className={styles.driveInput}
              placeholder="URL du Google Drive…"
              value={driveDraft}
              onChange={(e) => setDriveDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveDrive();
                if (e.key === "Escape") {
                  setDriveDraft(driveUrl ?? "");
                  setEditingDrive(false);
                }
              }}
              autoFocus={editingDrive}
            />
            <button
              type="button"
              className={styles.driveSaveBtn}
              disabled={updateDrive.isPending}
              onClick={saveDrive}
            >
              {updateDrive.isPending ? "…" : "OK"}
            </button>
            {editingDrive && (
              <button
                type="button"
                className={styles.driveCancelBtn}
                onClick={() => {
                  setDriveDraft(driveUrl ?? "");
                  setEditingDrive(false);
                }}
              >
                Annuler
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
