export const siteConfig = {
  name: 'Applied Robotics Lab',
  shortName: 'ARL',
  tagline: 'Building intelligent systems that act in the real world.',
  description:
    'Applied Robotics Lab builds AI automation tools and robotic systems — from desktop workflow agents to autonomous vehicles.',
  url: 'https://arl.lab',
  email: 'hello@arl.lab',
  github: 'https://github.com/applied-robotics-lab',
};

export const navLinks = [
  {
    label: 'Products',
    href: '/products',
    children: [
      { label: 'All Products', href: '/products' },
      { label: 'Workflow Agent', href: '/products/workflow-agent' },
      { label: '3D Printing', href: '/products/printing-3d-models' },
      { label: 'Autonomous Robot Vehicle', href: '/products/autonomous-robot-vehicle' },
    ],
  },
  {
    label: 'Solutions',
    href: '/solutions',
    children: [
      { label: 'Desktop & Web Automation', href: '/solutions#desktop-automation' },
      { label: 'Robotics Automation', href: '/solutions#robotics' },
      { label: 'Zalo AI Agents', href: '/solutions#zalo-agents' },
    ],
  },
  {
    label: 'Research',
    href: '/research',
    children: [
      { label: 'Research Areas', href: '/research' },
      { label: 'Publications', href: '/research?type=publication' },
      { label: 'Open Source', href: '/research?type=open-source' },
    ],
  },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export const footerLinks = {
  Products: [
    { label: 'All Products', href: '/products' },
    { label: 'Workflow Agent', href: '/products/workflow-agent' },
    { label: '3D Printing', href: '/products/printing-3d-models' },
    { label: 'Autonomous Robot Vehicle', href: '/products/autonomous-robot-vehicle' },
  ],
  Solutions: [
    { label: 'Desktop Automation', href: '/solutions#desktop-automation' },
    { label: 'Robotics Automation', href: '/solutions#robotics' },
    { label: 'Zalo AI Agents', href: '/solutions#zalo-agents' },
  ],
  Research: [
    { label: 'Research Areas', href: '/research' },
    { label: 'AI Agents', href: '/research/ai-agents' },
    { label: 'Autonomous Navigation', href: '/research/autonomous-navigation' },
    { label: 'Computer Vision', href: '/research/computer-vision' },
  ],
  Lab: [
    { label: 'About ARL', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms of Use', href: '/terms-of-use' },
  ],
};
