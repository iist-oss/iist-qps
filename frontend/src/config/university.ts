export const university = {
  name: "Campus QPS",
  tagline: "Search for previous year question papers.",

  contact: {
    email: "iistqps@gmail.com",
    issuesUrl: "https://github.com/iist-oss/iist-qps/issues/new",
  },

  repoUrl: "https://github.com/iist-oss/iist-qps",

  credits: {
    builderName: "Maloth Harsha",
    builderCode: "SC26BTECH",
    builderGithub: "https://github.com/harsha-maloth",
    builtYear: 2026,
    institute: "Indian Institute of Space Science and Technology",
    status: "Final release. This project is no longer actively maintained.",
  },
  allowedEmailDomains: ["iist.ac.in", "ug.iist.ac.in"] as string[],

  courseCodePattern: /[A-Za-z]{2,4}\s?-?\d{3,5}[A-Za-z]?/,

  semesterAliases: {
    odd: "odd", autumn: "odd", monsoon: "odd",
    even: "even", spring: "even",
  } as Record<string, "odd" | "even">,

  maxUploadFiles: 10,
  maxFileMiB: 47,
};
