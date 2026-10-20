/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta base del Complejo Deportivo
        palette: {
          wine: '#261211',
          petroleum: '#1C3034',
          ivory: '#F1EADA',
          dark: '#101010',
        },

        // ========================================
        // MODO CLARO — base IVORY (#F1EADA) + PETROLEUM (#1C3034)
        // ========================================
        claro: {
          primario: '#1C3034',   
          hover: '#142326',     
          tinte: '#E5DDCB',    
          acento: '#261211',     
          fondo: '#F1EADA',     
          tarjeta: '#FAF5EC',   
          borde: '#DCD3C1',     
          texto: '#101010',      
          texto2: '#4A4643',  
        },

        // ========================================
        // MODO OSCURO — base OBSIDIAN (#101010) + PETROLEUM (#1C3034) + IVORY (#F1EADA)
        // ========================================
        oscuro: {
          primario: '#5DA797',   
          hover: '#4C8F80',      
          tinte: '#1C3034',      
          acento: '#261211',    
          fondo: '#101010',      
          tarjeta: '#151d20',   
          borde: '#26383c',      
          texto: '#F1EADA',      
          texto2: '#A8A296',     
        }
      }
    },
  },
  plugins: [],
}