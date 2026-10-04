import { Link } from "react-router-dom";
import { university } from "../config/university";

export default function CreatorPage() {
  const c = university.credits;
  return (
    <div className="page doc-page">
      <h1>About the builder</h1>
      <p className="subtitle">{c.builderName} · {c.institute} · {c.builtYear}</p>

      {c.message.map((text) => (
        <p key={text}>{text}</p>
      ))}

      <h2>How long it took</h2>
      <p>{c.buildSummary}</p>
      <ul>
        {c.timeline.map((t) => (
          <li key={t.what}><b>{t.when}.</b> {t.what}</li>
        ))}
      </ul>

      <div className="callout">
        <p>GitHub: <a href={c.builderGithub} target="_blank" rel="noreferrer">{c.builderGithub.replace("https://", "")}</a></p>
        <p>Email: <a href={`mailto:${university.contact.email}`}>{university.contact.email}</a></p>
      </div>
      <p><Link to="/about">About {university.name}</Link></p>
    </div>
  );
}
