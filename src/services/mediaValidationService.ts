export type MediaValidationInput = {
  images: Array<{ url: string; source: "supplier_import" | "manual" | "wb_api" }>;
};

export async function validateImages(input: MediaValidationInput) {
  const images = await Promise.all(
    input.images.map(async (image) => {
      const issues: string[] = [];
      let contentType = "";
      try {
        const response = await fetch(image.url, { method: "HEAD", cache: "no-store" });
        contentType = response.headers.get("content-type") ?? "";
        if (!response.ok) issues.push("URL изображения недоступен.");
        if (!contentType.startsWith("image/")) issues.push("URL не возвращает image content-type.");
        if (contentType && !["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
          issues.push("Для WB предпочтительны jpg/png/webp.");
        }
      } catch {
        issues.push("Не удалось проверить публичную доступность изображения.");
      }

      return {
        url: image.url,
        valid: issues.length === 0,
        wbReady: false,
        issues,
        message: "Supplier image imported, but must be validated before WB upload.",
      };
    }),
  );
  return { images };
}
