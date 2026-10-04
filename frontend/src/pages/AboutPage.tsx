import { Link } from "react-router-dom";
import { university } from "../config/university";

export default function AboutPage() {
  const c = university.credits;
  return (
    <div className="page doc-page">
      <h1>About {university.name}</h1>
      <p className="subtitle">{university.tagline}</p>

      <p>
        {university.name} is a free archive of old exam papers for students of {c.institute}. Anyone can search it,
        with no account.
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
        <a href="https://github.com/iist-oss/iist-qps" target="_blank" rel="noreferrer">github.com/iist-oss/iist-qps</a>.
        Want to know who made it? See <Link to="/creator">About the builder</Link>.
      </p>
    </div>
  );
}
