// ALL university-specific settings live here (see docs/DECISIONS.md D6–D9, D12).
export const university = {
  name: "Campus QPS",
  tagline: "Search for previous year question papers.",
  /** UI hint only (Google account chooser). Real enforcement: app_settings.allowed_email_domain in the DB. */
  allowedEmailDomain: "" as string,

  /** Used by upload autofill in B4. Keep in sync with supabase/functions/_shared/validate.ts */
  courseCodePattern: /[A-Za-z]{2,4}\s?-?\d{3,5}/,

  /** Words found in PDFs/filenames -> stored semester value (D12). Used in B4. */
  semesterAliases: {
    odd: "odd", autumn: "odd", monsoon: "odd",
    even: "even", spring: "even",
  } as Record<string, "odd" | "even">,

  maxUploadFiles: 10,
  maxFileMiB: 10,
};
