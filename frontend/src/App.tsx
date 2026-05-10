import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tarjetas from './pages/Tarjetas';
import Movimientos from './pages/Movimientos';
import Proyeccion from './pages/Proyeccion';
import Configuracion from './pages/Configuracion';
import Simulador from './pages/Simulador';
import ListaCompras from './pages/ListaCompras';
import WhatsappLogs from './pages/WhatsappLogs';
import { useThemeStore } from './stores/themeStore';

function App() {
  const isDark = useThemeStore((state) => state.isDark);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes Wrapper */}
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/movimientos" element={<Movimientos />} />
          {/* Redirecciones de compatibilidad */}
          <Route path="/gastos" element={<Navigate to="/movimientos?tab=egresos" replace />} />
          <Route path="/nuevo" element={<Navigate to="/movimientos?tab=tarjetas" replace />} />
          <Route path="/tarjetas" element={<Tarjetas />} />
          <Route path="/proyeccion" element={<Proyeccion />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="/simulador" element={<Simulador />} />
          <Route path="/lista-compras" element={<ListaCompras />} />
          <Route path="/whatsapp" element={<WhatsappLogs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
