/** Sentinel UI value — never submit this string to the API. */
export const VA_ROLE_OTHER = 'Other (Specify Your Role)';

export const VA_CUSTOM_ROLE_MAX_LEN = 100;

const ROLE_CANDIDATES = [
  'Administrative Support',
  'Customer Support',
  'Data Entry',
  'Social Media Manager',
  'Content Writer',
  'Email Management',
  'Research Assistant',
  'Technical Support',
  'IT Technical Support',
  'Help Desk Executive',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'React Developer',
  'Node.js Developer',
  'Python Developer',
  'Java Developer',
  'PHP Developer',
  'WordPress Developer',
  'Mobile App Developer',
  'Flutter Developer',
  'Android Developer',
  'iOS Developer',
  'UI Designer',
  'UX Designer',
  'Graphic Designer',
  'Web Designer',
  'Video Editor',
  'Motion Graphics Designer',
  'Animator',
  'SEO Specialist',
  'Digital Marketing Specialist',
  'Performance Marketing Specialist',
  'Google Ads Specialist',
  'Meta Ads Specialist',
  'Email Marketing Specialist',
  'Copywriter',
  'Sales Executive',
  'Business Development Executive',
  'Lead Generation Specialist',
  'CRM Specialist',
  'Project Coordinator',
  'Project Manager',
  'Product Manager',
  'QA Tester',
  'Manual QA Engineer',
  'Automation QA Engineer',
  'DevOps Engineer',
  'Cloud Engineer',
  'AWS Engineer',
  'Cybersecurity Specialist',
  'Network Engineer',
  'System Administrator',
  'Database Administrator',
  'AI Engineer',
  'Machine Learning Engineer',
  'Data Analyst',
  'Data Scientist',
  'Business Analyst',
  'Virtual Personal Assistant',
  'Executive Assistant',
  'Bookkeeper',
  'Accountant',
  'HR Executive',
  'Recruiter',
  'Legal Assistant',
  'Translator',
  'Interpreter',
  'Customer Success Manager',
  'Operations Executive',
  'Procurement Executive',
  'Supply Chain Coordinator',
  'Ecommerce Manager',
  'Shopify Developer',
  'Amazon Marketplace Specialist',
  // Unique legacy labels not covered above
  'Sales Support',
  'Personal Assistance',
  'Calendar Management',
];

function uniqueSorted(roles) {
  const seen = new Set();
  const out = [];
  for (const role of roles) {
    const name = String(role || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return out;
}

/** Predefined VA roles (no Other). */
export const VIRTUAL_ASSISTANT_ROLES = uniqueSorted(ROLE_CANDIDATES);

/**
 * Resolve the role string to send to the API.
 * @returns {{ role: string|null, error: string|null }}
 */
export function resolveVaApplicationRole(selectedRole, customRole) {
  const selected = String(selectedRole || '').trim();
  if (!selected) {
    return { role: null, error: 'Please select a Virtual Assistant role' };
  }

  if (selected === VA_ROLE_OTHER) {
    const custom = String(customRole || '').trim();
    if (!custom) {
      return { role: null, error: 'Please enter your role' };
    }
    if (custom.length > VA_CUSTOM_ROLE_MAX_LEN) {
      return { role: null, error: `Role must be ${VA_CUSTOM_ROLE_MAX_LEN} characters or fewer` };
    }
    if (custom.includes(',')) {
      return { role: null, error: 'Role cannot contain commas' };
    }
    if (custom === VA_ROLE_OTHER) {
      return { role: null, error: 'Please enter a specific role name' };
    }
    return { role: custom, error: null };
  }

  if (selected.includes(',')) {
    return { role: null, error: 'Role cannot contain commas' };
  }
  if (selected.length > VA_CUSTOM_ROLE_MAX_LEN) {
    return { role: null, error: `Role must be ${VA_CUSTOM_ROLE_MAX_LEN} characters or fewer` };
  }
  return { role: selected, error: null };
}
