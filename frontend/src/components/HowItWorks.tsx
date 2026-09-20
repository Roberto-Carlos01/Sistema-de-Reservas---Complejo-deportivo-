import React from 'react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Elige tu Cancha',
      description: 'Filtra por disciplina, revisa las dimensiones, precio y características de cada escenario deportivo.',
      icon: '🏟️',
    },
    {
      step: '02',
      title: 'Selecciona Horario',
      description: 'Elige la fecha y turno que mejor te acomode. Puedes añadir utilidades como balones o chalecos.',
      icon: '⏱️',
    },
    {
      step: '03',
      title: 'Confirma y Juega',
      description: 'Realiza el pago digital por QR, tarjeta o confirma para abonar en recepción. ¡Recibe tu comprobante al instante!',
      icon: '🏆',
    },
  ];

  return (
    <section className="how-it-works-section" id="como-funciona">
      <div className="container">
        <div className="text-center">
          <span className="section-pill">Paso a Paso</span>
          <h2 className="section-title">Reserva tu turno en menos de 2 minutos</h2>
          <p className="section-subtitle">
            Un sistema ágil diseñado para jugadores individuales, grupos de amigos y academias.
          </p>
        </div>

        <div className="steps-grid">
          {steps.map((s, idx) => (
            <div key={idx} className="step-card">
              <div className="step-top">
                <span className="step-number">{s.step}</span>
                <span className="step-icon">{s.icon}</span>
              </div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-description">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
