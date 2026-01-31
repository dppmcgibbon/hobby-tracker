import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cache } from "react";

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const requireAuth = async () => {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  return user;
};

export const getProfile = cache(async () => {
  const user = await requireAuth();
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return profile;
});
