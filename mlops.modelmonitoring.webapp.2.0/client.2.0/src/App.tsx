import React from 'react';
import './App.css';
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import AppRouter from './AppRouter';
import Navbar from './components/navbar/Navbar';
import { theme } from './theme';
import { UseUser } from './auth/UseUser';
import Footer from './components/footer/Footer';

const App = () => {
  const user = UseUser();
  return (
    <MantineProvider theme={theme}>
      <div className="app-container">
        {user ? <Navbar /> : ''}
        <div className="main-content">
          <AppRouter />
        </div>
      </div>
      <div>
        <Footer />
      </div>
    </MantineProvider>
  );
};

export default App;
