import { Link } from "react-router-dom";
import { university } from "../config/university";

export default function CreditsPage() {
  const c = university.credits;
  return (
    <div className="page doc-page">
      <h1>Credits</h1>
      <p className="subtitle">{university.name} · {c.builtYear}</p>

      <p>
        {university.name} was created by {c.builderName} ({c.builderCode}), a student at {c.institute}, in {c.builtYear}.
      </p>

      <h2>Source code</h2>
      <p>
        The code is open source at{" "}
        <a href={university.repoUrl} target="_blank" rel="noreferrer">{university.repoUrl.replace("https://", "")}</a>.
      </p>

      <h2>Project status</h2>
      <p>{c.status}</p>

      <div className="callout">
        <p>GitHub: <a href={c.builderGithub} target="_blank" rel="noreferrer">{c.builderGithub.replace("https://", "")}</a></p>
        <p>Removal requests: <a href={`mailto:${university.contact.email}`}>{university.contact.email}</a></p>
      </div>
      <p><Link to="/about">About {university.name}</Link></p>
    </div>
  );
}
