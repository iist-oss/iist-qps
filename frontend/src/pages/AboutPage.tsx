import { Link } from "react-router-dom";
import { university } from "../config/university";

export default function AboutPage() {
  const c = university.credits;
  return (
    <div className="page doc-page">
      <h1>About {university.name}</h1>
      <p className="subtitle">{university.tagline}</p>

      <p>
        {university.name} is a free archive of old exam papers for students of {c.institute}. Students with an allowed university email can sign in and search the archive.
      </p>

      <h2>How it works</h2>
      <ul>
        <li>Search by course code or name (MA111C, "calculus"), and filter by year, exam type, lab or assignment.</li>
        <li>Students with an institute email can sign in and upload papers. The form fills in the details from the PDF where it can.</li>
        <li>Admins check every upload before it appears, so the archive stays tidy.</li>
      </ul>

      <h2>Papers and removal</h2>
      <p>
        The papers belong to their authors and the institute and are shared for study use. To ask for one to be
        removed, see <Link to="/takedown">Takedown &amp; privacy</Link>.
      </p>

      <p>
        The code is open source at{" "}
        <a href={university.repoUrl} target="_blank" rel="noreferrer">{university.repoUrl.replace("https://", "")}</a>.
        See <Link to="/credits">Credits</Link> for who made it.
      </p>
    </div>
  );
}
