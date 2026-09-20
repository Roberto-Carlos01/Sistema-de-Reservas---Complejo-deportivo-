import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { ServicesShowcase } from './components/ServicesShowcase';
import { Footer } from './components/Footer';
import { CanchaList } from './iteraciones/iteracion-2-canchas/CanchaList';
import './index.css';

function App() {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* 1. Barra de Navegación Principal */}
      <Navbar onOpenAuth={() => setAuthModalOpen(true)} />

      <main>
        {/* 2. Sección Hero con resumen y estadísticas */}
        <Hero />

        {/* 3. Módulo CRUD Principal: Iteración 2 (Gestión de Canchas) */}
        <CanchaList />

        {/* 4. ¿Cómo funciona la reserva? */}
        <HowItWorks />

        {/* 5. Servicios y Comodidades del complejo */}
        <ServicesShowcase />
      </main>

      {/* 6. Pie de Página */}
      <Footer />

      {/* Modal demostrativo de Autenticación (Iteración 1) */}
      {authModalOpen && (
        <div className="modal-backdrop" onClick={() => setAuthModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2>Iniciar Sesión</h2>
              <button type="button" className="btn-close" onClick={() => setAuthModalOpen(false)}>×</button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Módulo de la <strong>Iteración 1 (Gestión de Usuarios)</strong>. Ingresa con tu correo registrado.
            </p>
            <form onSubmit={e => { e.preventDefault(); alert('Módulo de autenticación en desarrollo por el equipo de Iteración 1'); setAuthModalOpen(false); }}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Correo Electrónico</label>
                <input type="email" placeholder="usuario@gmail.com" required defaultValue="maria.lopez@gmail.com" />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Contraseña</label>
                <input type="password" placeholder="••••••••" required defaultValue="123456" />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Ingresar al Sistema
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
