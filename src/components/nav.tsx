const navStyles = {
  nav: {
    background: 'linear-gradient(90deg, #1e3c72 0%, #2a5298 100%)',
    padding: '16px 32px',
    borderBottom: 'none',
    boxShadow: '0 2px 8px rgba(44, 62, 80, 0.07)',
  },
  ul: {
    display: 'flex',
    listStyle: 'none',
    margin: 0,
    padding: 0,
    alignItems: 'center',
    gap: '32px',
  },
  li: {
    margin: 0,
  },
  link: {
    textDecoration: 'none',
    color: '#fff',
    fontSize: '1.07rem',
    fontWeight: 500,
    padding: '8px 18px',
    borderRadius: '6px',
    transition: 'background 0.18s, color 0.18s, box-shadow 0.16s',
    boxShadow: '0 1px 3px rgba(44, 62, 80, 0.04)',
    display: 'inline-block',
  },
  linkHover: {
    background: 'rgba(255,255,255,0.13)',
    color: '#ffd86b',
    boxShadow: '0 2px 8px rgba(44,62,80,0.08)',
  }
};

import { useState } from 'react';

const Nav = () => {
  const [hovered, setHovered] = useState<number | null>(null);

  const links = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' }
  ];

  return (
    <nav style={navStyles.nav}>
      <ul style={navStyles.ul}>
        {links.map((link, idx) => (
          <li style={navStyles.li} key={link.href}>
            <a
              href={link.href}
              style={{
                ...navStyles.link,
                ...(hovered === idx ? navStyles.linkHover : {})
              }}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Nav;