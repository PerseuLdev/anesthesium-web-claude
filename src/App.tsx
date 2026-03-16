/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Gasometria } from './pages/Gasometria';
import { Drogas } from './pages/Drogas';
import { Escores } from './pages/Escores';
import { PreAnestesica } from './pages/PreAnestesica';
import { Navigate } from 'react-router-dom';
import { Calculadoras } from './pages/Calculadoras';
import { Historico } from './pages/Historico';
import { Hemodinamica } from './pages/Hemodinamica';
import { Cirurgias } from './pages/Cirurgias';
import { Paciente } from './pages/Paciente';
import { NovoPatiente } from './pages/NovoPatiente';
import { EditarPaciente } from './pages/EditarPaciente';
import './lib/i18n'; // Initialize i18n

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Gasometria />} />
          <Route path="gasometria" element={<Gasometria />} />
          <Route path="drogas" element={<Drogas />} />
          <Route path="escores" element={<Navigate to="/pre-anestesica" replace />} />
          <Route path="pre-anestesica" element={<PreAnestesica />} />
          <Route path="calculadoras" element={<Calculadoras />} />
          <Route path="historico" element={<Historico />} />
          <Route path="hemodinamica" element={<Hemodinamica />} />
          <Route path="cirurgias" element={<Cirurgias />} />
          <Route path="paciente" element={<Paciente />} />
          <Route path="paciente/novo" element={<NovoPatiente />} />
          <Route path="paciente/editar" element={<EditarPaciente />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
