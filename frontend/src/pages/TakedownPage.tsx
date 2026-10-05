import { university } from "../config/university";

export default function TakedownPage() {
  const { email, issuesUrl } = university.contact;
  return (
    <div className="page doc-page">
      <h1>Takedown &amp; privacy</h1>
      <p className="subtitle">How to ask for a paper to be removed, and what we store about you.</p>

      <h2>Asking for removal</h2>
      <p>
        {university.name} is a student-run archive of old exam papers. The papers were written by
        teachers and the institute, and were shared by students. If you are the author or rightful owner, or a paper
        shows personal information (a name, roll number, signature or contact details), tell us and we will take it
        down.
      </p>
      <div className="callout">
        <p>Email: <a href={`mailto:${email}?subject=Removal%20request`}>{email}</a> (preferred, private)</p>
        <p>Or open a request on GitHub: <a href={issuesUrl} target="_blank" rel="noreferrer">new issue</a> (public: do not post personal details there)</p>
      </div>
      <p>Please include:</p>
      <ul>
        <li>the course code, year and exam type, or a link to the search result;</li>
        <li>why it should be removed (you own it, it shows personal data, it was shared by mistake);</li>
        <li>who you are, if you are the owner, so we can check the request.</li>
      </ul>
      <p>We remove the paper from the public site first and ask questions afterwards.</p>

      <h2>What we store</h2>
      <ul>
        <li>Searching the archive requires a signed-in university account. The site does not use ads, trackers or analytics.</li>
        <li>To upload you sign in with your institute email. We keep that email, and which files you uploaded and when, to stop abuse. It is never shown publicly. Admins can see it.</li>
        <li>Your browser keeps your sign-in session on your own device. There are no ads, trackers or analytics.</li>
        <li>An uploaded PDF is private until an admin approves it. Approved PDFs are accessible to signed-in users through short-lived signed links, so do not upload papers with your own name or ID on them.</li>
      </ul>

      <h2>Deleting your own uploads or account</h2>
      <p>Write to <a href={`mailto:${email}?subject=Delete%20my%20data`}>{email}</a> from your institute address and say what to delete.</p>
    </div>
  );
}
