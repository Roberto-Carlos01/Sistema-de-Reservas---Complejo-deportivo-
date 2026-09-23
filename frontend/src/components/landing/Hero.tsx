/**
 * ============================================================================
 * ARCHIVO: Hero.tsx
 * COMPONENTE: Sección Principal de Bienvenida del Complejo Deportivo
 * Con animación de partículas interactiva estilo web moderna (mans.im)
 * ============================================================================
 */

import React, { useEffect, useRef } from 'react';

export const Hero: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const section = canvas.parentElement;

    let width = (canvas.width = section?.offsetWidth || window.innerWidth);
    let height = (canvas.height = section?.offsetHeight || 620);

    const handleResize = () => {
      if (!canvas || !section) return;
      width = canvas.width = section.offsetWidth;
      height = canvas.height = section.offsetHeight;
    };

    window.addEventListener('resize', handleResize);

    const mouse = { x: -1000, y: -1000, radius: 140 };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    section?.addEventListener('mousemove', handleMouseMove);
    section?.addEventListener('mouseleave', handleMouseLeave);

    // Paleta de partículas deportivas luminosas
    const colors = ['#10b981', '#34d399', '#38bdf8', '#F1EADA', '#06b6d4'];
    const count = Math.min(Math.floor((width * height) / 16000), 50);

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.65;
        this.vy = (Math.random() - 0.5) * 0.65;
        this.size = Math.random() * 2 + 1;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.alpha = Math.random() * 0.5 + 0.35;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        // Reacción al mouse
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const force = (1 - dist / mouse.radius) * 1.6;
          this.x -= (dx / dist) * force;
          this.y -= (dy / dist) * force;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.globalAlpha = this.alpha;
        ctx.fill();
        ctx.restore();
      }
    }

    const particles: Particle[] = Array.from({ length: count }, () => new Particle());

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Líneas de conexión entre partículas
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 115) {
            const alpha = (1 - dist / 115) * 0.18;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }

        // Conexión hacia el cursor si está cerca
        const dx = mouse.x - particles[i].x;
        const dy = mouse.y - particles[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const alpha = (1 - dist / mouse.radius) * 0.35;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        particles[i].update();
        particles[i].draw();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      section?.removeEventListener('mousemove', handleMouseMove);
      section?.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <section className="hero-section">
      {/* 1. Orbes de luz con movimiento suave */}
      <div className="hero-glow-orb-1" aria-hidden="true" />
      <div className="hero-glow-orb-2" aria-hidden="true" />

      {/* 2. Patrón de rejilla geométrica */}
      <div className="hero-grid-pattern" aria-hidden="true" />

      {/* 3. Canvas de partículas y constelación interactiva */}
      <canvas ref={canvasRef} className="hero-canvas" aria-hidden="true" />

      {/* 4. Contenido Principal */}
      <div className="hero-container">
        {/* Badge superior */}
        <div className="hero-badge">
          <span className="pulsing-dot"></span>
          <span>Instalaciones abiertas hoy • Horario 06:00 a 23:30</span>
        </div>

        {/* Título Principal con Gradiente */}
        <h1 className="hero-title">
          Tu espacio ideal para <br />
          <span className="text-gradient">jugar, entrenar y competir</span>
        </h1>

        {/* Descripción */}
        <p className="hero-description">
          El complejo deportivo más completo de la ciudad. Reserva canchas de fútbol, básquetbol, 
          voleibol, tenis y pádel con disponibilidad en tiempo real y confirmación instantánea.
        </p>

        {/* Grupo de Botones de Acción */}
        <div className="hero-cta-group">
          <a href="#canchas" className="btn-hero-primary">
            Explorar Canchas
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </a>
          <a href="#como-funciona" className="btn-hero-secondary">
            ¿Cómo reservar?
          </a>
        </div>

        {/* Barra de Estadísticas Rápidas */}
        <div className="hero-stats">
          <div className="stat-card">
            <span className="stat-number">6+</span>
            <span className="stat-title">Canchas Profesionales</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-card">
            <span className="stat-number">7</span>
            <span className="stat-title">Disciplinas Deportivas</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-card">
            <span className="stat-number">100%</span>
            <span className="stat-title">Gestión en Línea</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-card">
            <span className="stat-number">4.9 ★</span>
            <span className="stat-title">Calificación Usuarios</span>
          </div>
        </div>
      </div>
    </section>
  );
};
export default Hero;
