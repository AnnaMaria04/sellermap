"use client";

import { createClient } from "@supabase/supabase-js";
import type { SellerInventoryWorkspace } from "./workspace";
import { createDemoWorkspace } from "./workspace";

const STORAGE_KEY = "sellermap.inventory.workspace.v1";

export interface PersistenceStatus {
  mode: "supabase" | "local";
  label: string;
  detail: string;
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return undefined;

  return { url, key };
}

export function getPersistenceStatus(): PersistenceStatus {
  const config = getSupabaseConfig();

  if (config) {
    return {
      mode: "supabase",
      label: "Supabase подключён",
      detail: "Данные сохраняются в таблицу seller_inventory_workspaces.",
    };
  }

  return {
    mode: "local",
    label: "Локальный режим",
    detail: "Нет NEXT_PUBLIC_SUPABASE_URL и publishable key, поэтому демо сохраняется в браузере.",
  };
}

export async function loadWorkspace(): Promise<SellerInventoryWorkspace> {
  const config = getSupabaseConfig();

  if (config) {
    const supabase = createClient(config.url, config.key);
    const { data, error } = await supabase
      .from("seller_inventory_workspaces")
      .select("workspace")
      .eq("seller_id", "demo-seller")
      .maybeSingle();

    if (!error && data?.workspace) {
      return data.workspace as SellerInventoryWorkspace;
    }
  }

  if (typeof window === "undefined") {
    return createDemoWorkspace();
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const workspace = createDemoWorkspace();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    return workspace;
  }

  try {
    return JSON.parse(stored) as SellerInventoryWorkspace;
  } catch {
    const workspace = createDemoWorkspace();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    return workspace;
  }
}

export async function saveWorkspace(workspace: SellerInventoryWorkspace): Promise<PersistenceStatus> {
  const nextWorkspace = {
    ...workspace,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextWorkspace));
  }

  const config = getSupabaseConfig();
  if (config) {
    const supabase = createClient(config.url, config.key);
    const { error } = await supabase.from("seller_inventory_workspaces").upsert({
      seller_id: nextWorkspace.sellerId,
      seller_name: nextWorkspace.sellerName,
      workspace: nextWorkspace,
      updated_at: nextWorkspace.updatedAt,
    });

    if (!error) {
      return getPersistenceStatus();
    }
  }

  return getPersistenceStatus();
}

export function resetWorkspace(): SellerInventoryWorkspace {
  const workspace = createDemoWorkspace();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  }
  return workspace;
}
