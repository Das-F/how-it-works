import { useRef, useState } from "react";
import { useDeleteGallery, useGallery, useUploadGallery } from "@/hooks/use-gallery";
import styles from "./Gallery.module.css";

interface Props {
  userId: string | undefined;
  dashboardId: string | undefined;
}

export function GalleryColumn({ userId, dashboardId }: Props) {
  const { data: items = [], isLoading } = useGallery(userId, dashboardId);
  const uploadMut = useUploadGallery();
  const deleteMut = useDeleteGallery();
  const inputRef = useRef<HTMLInputElement>(null);
  const [landscapeIds, setLandscapeIds] = useState<Record<string, boolean>>({});

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
    </div>
  );
}
