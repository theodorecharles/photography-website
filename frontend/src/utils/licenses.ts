/**
 * Photo license options and descriptions
 */

export interface LicenseOption {
  id: string;
  name: string;
  shortName: string;
  description: string;
  url?: string;
  fullText: string;
}

export const LICENSE_OPTIONS: LicenseOption[] = [
  {
    id: 'all-rights-reserved',
    name: 'All Rights Reserved',
    shortName: 'All Rights Reserved',
    description: 'Traditional copyright - visitors cannot use these photos without permission',
    fullText: 'All rights reserved. No part of these photographs may be reproduced, distributed, or used in any form without express written permission from the copyright holder. If you would like to use any of these photographs, please contact me to request permission.',
  },
  {
    id: 'cc-by',
    name: 'Creative Commons Attribution 4.0 (CC BY 4.0)',
    shortName: 'CC BY 4.0',
    description: 'Visitors can use, share, and modify these photos, even commercially, as long as they provide attribution',
    url: 'https://creativecommons.org/licenses/by/4.0/',
    fullText: 'These photographs are licensed under a Creative Commons Attribution 4.0 International License. You are free to share (copy and redistribute) and adapt (remix, transform, and build upon) these photographs for any purpose, even commercially, as long as you give appropriate credit, provide a link to the license, and indicate if changes were made.',
  },
  {
    id: 'cc-by-sa',
    name: 'Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)',
    shortName: 'CC BY-SA 4.0',
    description: 'Visitors can use and modify these photos, but derivative works must use the same license',
    url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    fullText: 'These photographs are licensed under a Creative Commons Attribution-ShareAlike 4.0 International License. You are free to share and adapt these photographs, even commercially, as long as you give appropriate credit and distribute derivative works under the same license.',
  },
  {
    id: 'cc-by-nd',
    name: 'Creative Commons Attribution-NoDerivs 4.0 (CC BY-ND 4.0)',
    shortName: 'CC BY-ND 4.0',
    description: 'Visitors can share these photos but cannot modify them',
    url: 'https://creativecommons.org/licenses/by-nd/4.0/',
    fullText: 'These photographs are licensed under a Creative Commons Attribution-NoDerivatives 4.0 International License. You are free to share these photographs for any purpose, even commercially, as long as you give appropriate credit and do not make any modifications.',
  },
  {
    id: 'cc-by-nc',
    name: 'Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0)',
    shortName: 'CC BY-NC 4.0',
    description: 'Visitors can use and modify these photos for non-commercial purposes only',
    url: 'https://creativecommons.org/licenses/by-nc/4.0/',
    fullText: 'These photographs are licensed under a Creative Commons Attribution-NonCommercial 4.0 International License. You are free to share and adapt these photographs for non-commercial purposes only, as long as you give appropriate credit.',
  },
  {
    id: 'cc-by-nc-sa',
    name: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 (CC BY-NC-SA 4.0)',
    shortName: 'CC BY-NC-SA 4.0',
    description: 'Non-commercial use only, and derivative works must use the same license',
    url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    fullText: 'These photographs are licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License. You are free to share and adapt these photographs for non-commercial purposes only, as long as you give appropriate credit and distribute derivative works under the same license.',
  },
  {
    id: 'cc-by-nc-nd',
    name: 'Creative Commons Attribution-NonCommercial-NoDerivs 4.0 (CC BY-NC-ND 4.0)',
    shortName: 'CC BY-NC-ND 4.0',
    description: 'Most restrictive Creative Commons license - non-commercial sharing only, no modifications allowed',
    url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    fullText: 'These photographs are licensed under a Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License. You are free to share these photographs for non-commercial purposes only, as long as you give appropriate credit and do not make any modifications.',
  },
  {
    id: 'cc0',
    name: 'Creative Commons Zero (CC0 1.0) - Public Domain',
    shortName: 'CC0 1.0',
    description: 'All rights waived - visitors can use these photos for any purpose without attribution',
    url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    fullText: 'These photographs have been dedicated to the public domain under the Creative Commons CC0 1.0 Universal Public Domain Dedication. To the extent possible under law, I have waived all copyright and related rights to these photographs. You can copy, modify, distribute and perform the work, even for commercial purposes, all without asking permission.',
  },
  {
    id: 'public-domain',
    name: 'Public Domain',
    shortName: 'Public Domain',
    description: 'These photographs are in the public domain - free for anyone to use without restrictions',
    fullText: 'These photographs are in the public domain. They are free for anyone to use, modify, and distribute for any purpose without restriction.',
  },
];

export function getLicenseById(id: string): LicenseOption | undefined {
  return LICENSE_OPTIONS.find(license => license.id === id);
}

export function getDefaultLicense(): LicenseOption {
  return LICENSE_OPTIONS.find(license => license.id === 'cc-by') || LICENSE_OPTIONS[0];
}
