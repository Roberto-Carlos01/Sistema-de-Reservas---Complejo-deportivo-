import React from 'react';

interface NavbarProps {
  onOpenAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth }) => {
  return (
    <header className="navbar">
      <div className="nav-container">
        <a href="#" className="nav-brand">
          <span className="brand-badge">⚡</span>
          <span className="brand-name">SPORT<span className="brand-accent">PLEX</span></span>
        </a>

        <nav className="nav-links">
          <a href="#canchas" className="nav-link">Canchas</a>
          <a href="#como-funciona" className="nav-link">Cómo Reservar</a>
          <a href="#servicios" className="nav-link">Servicios</a>
          <a href="#contacto" className="nav-link">Ubicación</a>
        </nav>

        <div className="nav-actions">
          <button
            type="button"
            className="btn-outline-sm"
            onClick={onOpenAuth}
          >
            Iniciar Sesión
          </button>
          <a href="#canchas" className="btn-primary-sm">
            Reservar Cancha
          </a>
        </div>
      </div>
    </header>
  );
};
