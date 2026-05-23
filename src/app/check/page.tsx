import { ProductCheckForm } from "@/components/sellermap/product-check-form";
import { PageSection } from "@/components/sellermap/section";

export default function CheckPage() {
  return (
    <main className="min-h-screen bg-[var(--c-bg)]">
      <PageSection className="py-10">
        <ProductCheckForm />
      </PageSection>
    </main>
  );
}
