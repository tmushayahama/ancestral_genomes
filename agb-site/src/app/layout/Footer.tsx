import type React from 'react'
import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/about', label: 'About' },
  { to: '/release-info', label: 'Release Information' },
  { to: '/contact-us', label: 'Contact Us' },
  { to: '/privacy-policy', label: 'Privacy Policy' },
  { to: '/disclaimer', label: 'Disclaimer' },
]

const Footer: React.FC = () => (
  <footer className="flex shrink-0 flex-col items-center gap-1 border-t border-gray-200 bg-white px-4 py-3 text-xs text-gray-600">
    <nav className="flex flex-wrap justify-center gap-4">
      {LINKS.map(link => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            isActive ? 'text-accent-800 font-medium' : 'text-gray-600 hover:underline'
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
    <div>© Copyright {new Date().getFullYear()} Paul Thomas. All Rights Reserved.</div>
  </footer>
)

export default Footer
