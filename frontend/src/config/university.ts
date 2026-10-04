// ALL university-specific settings live here.
export const university = {
  name: "Campus QPS",
  tagline: "Search for previous year question papers.",

  /** Who to contact for removal requests (takedown page). */
  contact: {
    email: "iistqps@gmail.com",
    issuesUrl: "https://github.com/iist-oss/iist-qps/issues/new",
  },

  /** Public source repository (shown on the About and Credits pages). */
  repoUrl: "https://github.com/iist-oss/iist-qps",

  /** Credit shown on the Credits page, the footer and the README. */
  credits: {
    builderName: "Maloth Harsha",
    builderCode: "SC26BTECH",
    builderGithub: "https://github.com/harsha-maloth",
    builtYear: 2026,
    institute: "Indian Institute of Space Science and Technology",
    status: "Final release. This project is no longer actively maintained.",
  },
  /** Shown on the login page. Real enforcement is in the DB:
   *  app_settings.allowed_email_domain (comma-separated) + the sign-up trigger from migration 0005 + email_domain_ok (0006). Keep in sync. */
  allowedEmailDomains: ["iist.ac.in", "ug.iist.ac.in"] as string[],

  /** Institute course codes look like MA111C / CH112H / AA131V (answers Q3). Used by upload autofill; keep in sync with
   *  supabase/functions/_shared/validate.ts, lib/upload.ts and lib/autofill.ts */
  courseCodePattern: /[A-Za-z]{2,4}\s?-?\d{3,5}[A-Za-z]?/,

  /** Words found in PDFs/filenames -> stored semester value (D12). Used in B4. */
  semesterAliases: {
    odd: "odd", autumn: "odd", monsoon: "odd",
    even: "even", spring: "even",
  } as Record<string, "odd" | "even">,

  maxUploadFiles: 10,
  maxFileMiB: 47, // = bucket limit (migration 0009); stays under a 50,000,000-byte Supabase Free project cap
};
