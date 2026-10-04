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
    /** Times (IST, approximate) come from file timestamps in the repo zips + docs/AI_LOG.md session order. */
    timeline: [
      { when: "About 9 pm, 4 Oct 2026", what: "Started. Planned it and wrote the first database and code." },
      { when: "About 10:30 pm", what: "University-only email login working, and the first live site." },
      { when: "About 11:50 pm", what: "Upload page with automatic detail filling from the PDF." },
      { when: "About 12:30 am, 5 Oct", what: "Admin review page for approving papers." },
      { when: "About 12:50 am", what: "Tried the first real IIST papers on the live site." },
    ],
    buildSummary: "I built the first version in about four hours, in one evening: from about 9 pm on 4 October to about 1 am on 5 October 2026.",
    message: [
      "Hi, I'm Harsha Maloth, a student at IIST. I built Campus QPS, from the first idea to a working site, together with Claude, an AI assistant that wrote the code while I made the decisions and tested it on real IIST papers.",
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
