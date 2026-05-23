import { ResultClient } from "@/components/result/ResultClient";
import { PageSection } from "@/components/sellermap/section";
import { buildInputFromParams } from "@/app/result/page";

type ResultDraftParams = Promise<{ draftId: string }>;

export default async function ResultDraftPage({ params }: { params: ResultDraftParams }) {
  const { draftId } = await params;
  const initialInput = buildInputFromParams({});

  return (
    <main className="bg-off-white">
      <PageSection className="py-8">
        <ResultClient initialInput={initialInput} draftId={draftId} />
      </PageSection>
    </main>
  );
}
