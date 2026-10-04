// ALL university-specific settings live here (see docs/DECISIONS.md D6–D9, D12).
export const university = {
  name: "Campus QPS",
  tagline: "Search for previous year question papers.",

  /** Who to contact for removal requests (takedown page). */
  contact: {
    email: "iistqps@gmail.com",
    issuesUrl: "https://github.com/iist-oss/iist-qps/issues/new",
  },

  /** Credit shown on the About page, the footer, README and humans.txt. CONFIRM the full name. */
  credits: {
    builderName: "Harsha Maloth",
    builderGithub: "https://github.com/harsha-maloth",
    builtYear: 2026,
    institute: "IIST",
    /** First-person message shown on the "About the builder" page (one string per paragraph). EDIT FREELY. */
    message: [
      "Hi, I'm Harsha Maloth, a student at IIST. I designed and built Campus QPS myself, from the first sketch to the last line of code.",
      "I wanted old question papers to be easy to find for everyone here, without asking around or digging through chats. If you have a paper that is not on the site, please upload it, so the next batch has it too.",
      "If something is broken, wrong or missing, write to me at iistqps@gmail.com and I will look into it.",
    ],
  },
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
  maxFileMiB: 47, // = bucket limit (migration 0009); stays under a 50,000,000-byte Supabase Free project cap
};
