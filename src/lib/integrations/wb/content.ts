import "server-only";

import { WB_API_BASES, wbFetch } from "./client";

export type WbContentResponse = Record<string, unknown>;

export function getWbSubjects() {
  return wbFetch<WbContentResponse>("/content/v2/object/all", {
    baseUrl: WB_API_BASES.content,
  });
}

export function getWbSubjectCharacteristics(subjectId: string | number) {
  return wbFetch<WbContentResponse>(`/content/v2/object/charcs/${subjectId}`, {
    baseUrl: WB_API_BASES.content,
  });
}

