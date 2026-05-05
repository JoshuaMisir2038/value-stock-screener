// Temporary: force supabase = null to isolate whether the TDZ crash
// is from Supabase or from our app code added in the membership commit.
export const supabase = null
