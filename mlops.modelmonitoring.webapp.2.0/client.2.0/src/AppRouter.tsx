import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard/Dashboard';
import Login from './pages/Login/Login';
import ProtectedRoute from './auth/ProtectedRoute';
import Navbar from './components/navbar/Navbar';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          ></Route>
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default AppRouter;
