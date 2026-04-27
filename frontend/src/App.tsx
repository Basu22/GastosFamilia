import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NuevoGasto from './pages/NuevoGasto';
import Tarjetas from './pages/Tarjetas';
import Gastos from './pages/Gastos';
import Proyeccion from './pages/Proyeccion';
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
          <Route path="/gastos" element={<Gastos />} />
          <Route path="/nuevo" element={<NuevoGasto />} />
          <Route path="/tarjetas" element={<Tarjetas />} />
          <Route path="/proyeccion" element={<Proyeccion />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
