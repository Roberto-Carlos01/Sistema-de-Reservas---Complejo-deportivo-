import React from 'react';

export const ServicesShowcase: React.FC = () => {
  const servicios = [
    {
      icon: '💡',
      title: 'Iluminación LED Profesional',
      description: 'Canchas equipadas con reflectores de alta potencia para partidos nocturnos con máxima visibilidad.',
    },
    {
      icon: '🚿',
      title: 'Vestuarios y Duchas',
      description: 'Zonas de cambio limpias, lockers con seguridad y duchas con agua caliente en cada bloque.',
    },
    {
      icon: '⚽',
      title: 'Material y Utilidades',
      description: 'Alquiler de balones oficiales, chalecos numerados, cronómetros y paletas de pádel.',
    },
    {
      icon: '🏁',
      title: 'Arbitraje y Planillaje',
      description: 'Servicio de árbitros certificados para campeonatos y partidos amistosos.',
    },
    {
      icon: '☕',
      title: 'Cafetería & Snack Bar',
      description: 'Bebidas isotónicas, batidos de proteínas, café y snacks saludables para el post-partido.',
    },
    {
      icon: '🅿️',
      title: 'Estacionamiento Privado',
      description: 'Parqueo amplio, asfaltado y con circuito cerrado de vigilancia para tu total tranquilidad.',
    },
  ];

  return (
    <section className="services-section" id="servicios">
      <div className="container">
        <div className="text-center">
          <span className="section-pill">Instalaciones & Servicios</span>
          <h2 className="section-title">Comodidades de primer nivel</h2>
          <p className="section-subtitle">
            Todo lo necesario para que tu experiencia deportiva sea cómoda, segura y profesional.
          </p>
        </div>

        <div className="services-grid">
          {servicios.map((s, idx) => (
            <div key={idx} className="service-card">
              <div className="service-icon">{s.icon}</div>
              <h3 className="service-title">{s.title}</h3>
              <p className="service-description">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
