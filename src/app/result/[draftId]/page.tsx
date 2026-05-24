import { ResultClient } from "@/components/result/ResultClient";
import { PageSection } from "@/components/sellermap/section";
import { buildInputFromParams } from "@/app/result/page";
import { getAnalysisResultInput } from "@/services/marketplaceIntelligence";

type ResultDraftParams = Promise<{ draftId: string }>;

export default async function ResultDraftPage({ params }: { params: ResultDraftParams }) {
  const { draftId } = await params;
  const storedInput = await getAnalysisResultInput(draftId);
  const initialInput = storedInput ?? buildInputFromParams({});

  return (
    <main className="bg-off-white">
      <PageSection className="py-8">
        <ResultClient initialInput={initialInput} draftId={storedInput ? undefined : draftId} reportId={storedInput ? draftId : undefined} />
      </PageSection>
    </main>
  );
}
