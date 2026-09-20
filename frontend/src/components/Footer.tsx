import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="footer" id="contacto">
      <div className="container footer-content">
        <div className="footer-col brand-col">
          <div className="nav-brand">
            <span className="brand-badge">⚡</span>
            <span className="brand-name">SPORT<span className="brand-accent">PLEX</span></span>
          </div>
          <p className="footer-tagline">
            Plataforma integral de gestión y reserva de instalaciones deportivas de alto rendimiento.
          </p>
          <div className="footer-socials">
            <span>⚽ Fútbol</span>
            <span>🏀 Básquet</span>
            <span>🎾 Tenis</span>
            <span>🏸 Pádel</span>
          </div>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Navegación</h4>
          <ul className="footer-links">
            <li><a href="#canchas">Catálogo de Canchas</a></li>
            <li><a href="#como-funciona">Cómo Reservar</a></li>
            <li><a href="#servicios">Servicios y Utilidades</a></li>
            <li><a href="#contacto">Contacto y Horarios</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Horarios de Atención</h4>
          <p className="footer-info"><strong>Lunes a Sábado:</strong> 07:00 - 23:00</p>
          <p className="footer-info"><strong>Domingos y Feriados:</strong> 07:00 - 21:00</p>
          <p className="footer-info"><strong>Atención WhatsApp:</strong> +591 71234567</p>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Ubicación</h4>
          <p className="footer-info">Av. Busch esq. Calle 12 #123</p>
          <p className="footer-info">Zona Miraflores, La Paz - Bolivia</p>
          <p className="footer-info">info@canchasbo.com</p>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container bottom-row">
          <p>© {new Date().getFullYear()} SPORTPLEX • Sistema de Reservas de Complejo Deportivo. UMSA - Análisis y Diseño de Datos.</p>
          <p className="developer-tag">Arquitectura desacoplada: Express + PostgreSQL + React + Vite</p>
        </div>
      </div>
    </footer>
  );
};
