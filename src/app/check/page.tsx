import { ProductCheckForm } from "@/components/sellermap/product-check-form";
import { PageSection } from "@/components/sellermap/section";
import { Card } from "@/components/ui/card";
import { dataProviders } from "@/lib/providers";

export default function ProductCheckPage() {
  return (
    <main className="bg-off-white">
      <PageSection className="py-10">
        <ProductCheckForm />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {["Wildberries URL", "Product name", "Category / niche"].map((item) => (
            <Card key={item} className="p-4 shadow-none">
              <p className="text-xs font-semibold text-primary-green">Accepted input</p>
              <p className="mt-1 font-semibold">{item}</p>
            </Card>
          ))}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {dataProviders.map((provider) => (
            <Card key={provider.name} className="p-4 shadow-none">
              <p className="text-sm font-semibold">{provider.name}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary-green">
                {provider.status}
              </p>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                {provider.description}
              </p>
            </Card>
          ))}
        </div>
      </PageSection>
    </main>
  );
}
