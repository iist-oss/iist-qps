import { useAuth } from "../auth/AuthContext";

// B4 will implement: drag & drop, OCR autofill, edit modal, upload to Storage + insert row.
export default function UploadPage() {
  const { user, signIn } = useAuth();
  return (
    <div className="page">
      <h1>Upload question papers</h1>
      {user ? <p className="message">Upload is coming soon (build step B4).</p>
        : <p className="message">Please <button className="link-btn" onClick={signIn}>sign in</button> to upload papers.</p>}
    </div>
  );
}
