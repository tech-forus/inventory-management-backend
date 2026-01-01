import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Only use StrictMode in development, disable in production for better performance
const isDevelopment = import.meta.env.DEV;

const root = ReactDOM.createRoot(document.getElementById('root')!);

if (isDevelopment) {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  root.render(<App />);
}

