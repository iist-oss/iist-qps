// ALL university-specific settings live here (see docs/DECISIONS.md D6–D9, D12).
export const university = {
  name: "Campus QPS",
  tagline: "Search for previous year question papers.",
  /** Shown on the login page. Real enforcement is in the DB:
   *  app_settings.allowed_email_domain (comma-separated) + the sign-up trigger from migration 0005 + email_domain_ok (0006). Keep in sync. */
  allowedEmailDomains: ["iist.ac.in", "ug.iist.ac.in"] as string[],

  /** IIST codes look like MA111C / CH112H / AA131V (answers Q3). Used by upload autofill; keep in sync with
   *  supabase/functions/_shared/validate.ts, lib/upload.ts and lib/autofill.ts */
  courseCodePattern: /[A-Za-z]{2,4}\s?-?\d{3,5}[A-Za-z]?/,

  /** Words found in PDFs/filenames -> stored semester value (D12). Used in B4. */
  semesterAliases: {
    odd: "odd", autumn: "odd", monsoon: "odd",
    even: "even", spring: "even",
  } as Record<string, "odd" | "even">,

  maxUploadFiles: 10,
  maxFileMiB: 100, // keep <= bucket limit (migration 0007) and the Supabase project-wide upload limit
};
