import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GalleryItem = {
  id: string;
  user_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  signedUrl?: string;
};

export function useGallery(userId: string | undefined) {
  return useQuery({
    queryKey: ["gallery", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_items")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const items = data ?? [];
      const paths = items.map((i) => i.storage_path);
      if (!paths.length) return [] as GalleryItem[];

      const { data: signed } = await supabase.storage
        .from("gallery")
        .createSignedUrls(paths, 60 * 60);

      return items.map((it, idx) => ({
        ...it,
        signedUrl: signed?.[idx]?.signedUrl,
      })) as GalleryItem[];
    },
  });
}

export function useUploadGallery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { userId: string; file: File; caption?: string }) => {
      const ext = args.file.name.split(".").pop() || "jpg";
      const path = `${args.userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("gallery")
        .upload(path, args.file, { contentType: args.file.type });
      if (upErr) throw upErr;

      const { error } = await supabase.from("gallery_items").insert({
        user_id: args.userId,
        storage_path: path,
        caption: args.caption ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["gallery", vars.userId] }),
  });
}

export function useDeleteGallery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; storage_path: string; userId: string }) => {
      await supabase.storage.from("gallery").remove([args.storage_path]);
      const { error } = await supabase.from("gallery_items").delete().eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["gallery", vars.userId] }),
  });
}
