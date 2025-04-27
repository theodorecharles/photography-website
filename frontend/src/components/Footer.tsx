import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>© Ted Charles 2025. All images are licensed under the Creative Commons Attribution 4.0 International License.</p>
        <div className="footer-links">
          <Link to="/license" className="footer-link">View License</Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer; 