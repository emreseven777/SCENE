import { LEGAL_VERSION } from "./legal-documents";
import { requireSupabase } from "./supabase";

export const requestKinds = {
  access: "Bilgi veya veri kopyası",
  correction: "Düzeltme",
  erasure: "Silme veya yok etme",
  transfer: "Aktarılan alıcıları öğrenme",
  objection: "Otomatik değerlendirmeye itiraz",
  other: "Diğer KVKK hakkı",
};

export const requestStatuses: Record<string, string> = { received: "Alındı", resolved: "Yanıtlandı" };

export async function setPushConsent(choice: boolean) {
  const { error } = await requireSupabase().rpc("scene_device_push_consent", { choice, version: LEGAL_VERSION });
  if (error) throw error;
}
