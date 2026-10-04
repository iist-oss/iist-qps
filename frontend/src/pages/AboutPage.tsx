import { Link } from "react-router-dom";
import { university } from "../config/university";

export default function AboutPage() {
  const c = university.credits;
  return (
    <div className="page doc-page">
      <h1>About {university.name}</h1>
      <p className="subtitle">{university.tagline}</p>

      <p>
        {university.name} is a free archive of old exam papers for students of {c.institute}. Anyone can search it.
        Students with an institute email can add papers, and admins check each one before it goes public.
      </p>

      <h2>Built by</h2>
      <div className="callout">
        <p>
          <b>{c.builderName}</b>, a student at {c.institute}, designed and built this site in {c.builtYear}.
        </p>
        <p><a href={c.builderGithub} target="_blank" rel="noreferrer">{c.builderGithub.replace("https://", "")}</a></p>
      </div>
      <p>
        The code is open source at <a href="https://github.com/iist-oss/iist-qps" target="_blank" rel="noreferrer">github.com/iist-oss/iist-qps</a>.
        The search idea comes from IIT Kharagpur's IQPS; this site is a new implementation, not a copy.
      </p>

      <h2>Papers and removal</h2>
      <p>
        The papers belong to their authors and the institute. See <Link to="/takedown">Takedown &amp; privacy</Link> to
        ask for one to be removed.
      </p>
    </div>
  );
}
