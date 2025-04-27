/**
 * License component for displaying the Creative Commons license information.
 * This component provides detailed information about the license terms
 * and conditions for using the photographs.
 */

import { Link } from 'react-router-dom';

function License() {
  return (
    <div className="license-page">
      <div className="license-content">
        <h1>Creative Commons Attribution 4.0 International License</h1>
        <p>
          This work is licensed under the Creative Commons Attribution 4.0 International License.
          To view a copy of this license, visit <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">https://creativecommons.org/licenses/by/4.0/</a>.
        </p>

        <h2>You are free to:</h2>
        <ul>
          <li><strong>Share</strong> — copy and redistribute the material in any medium or format</li>
          <li><strong>Adapt</strong> — remix, transform, and build upon the material for any purpose, even commercially</li>
        </ul>

        <h2>Under the following terms:</h2>
        <ul>
          <li><strong>Attribution</strong> — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.</li>
          <li><strong>No additional restrictions</strong> — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.</li>
        </ul>

        <p>
          Notices:
          You do not have to comply with the license for elements of the material in the public domain or where your use is permitted by an applicable exception or limitation.
          No warranties are given. The license may not give you all of the permissions necessary for your intended use. For example, other rights such as publicity, privacy, or moral rights may limit how you use the material.
        </p>

        <div className="license-links">
          <Link to="/" className="license-link">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}

export default License; 