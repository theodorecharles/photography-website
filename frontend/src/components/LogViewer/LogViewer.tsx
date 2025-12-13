// Logs are now served as standalone HTML from backend
// This component redirects to the backend logs endpoint
import { useEffect } from "react";
import { API_URL } from "../../config";

export default function LogViewer() {
  useEffect(() => {
    // Redirect to backend logs endpoint
    window.location.href = `${API_URL}/logs`;
  }, []);

  return (
    <div style={{ background: '#000', color: '#fff', padding: '1rem' }}>
      Redirecting to logs...
    </div>
  );
}
