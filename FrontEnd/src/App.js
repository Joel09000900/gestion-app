import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import PrivateRoute from './components/PrivateRoute';
import Inscription from './PAGES/Inscription';
import Connexion from './PAGES/Connexion';
import Acceuil from './PAGES/acceuil';
import Client from './PAGES/PClient/Client';
import Client2 from './PAGES/PClient/Client2';
import Entreprise from './PAGES/PEntreprise/Entreprise';
import EntrepriseAccueil from './PAGES/PEntreprise/EntrepriseAccueil';
import PAdmin from './PAGES/PAdministrator/PAdmin';
import DashbordClient from './PAGES/PClient/DashbordClient';
import Service2 from './PAGES/PClient/Service2';
import Coiffeur from './PAGES/Services/Coiffeur';
import Tresseuses from './PAGES/Services/Tresseuses';
import Pressing from './PAGES/Services/Pressing';
import LavageAuto from './PAGES/Services/LavageAuto';
import Residence from './PAGES/Services/Residence';
import AgenceWaves from './PAGES/Services/AgenceWaves';

function App() {
  return (
    <AuthProvider>
    <SocketProvider>
    <Router>
      <Routes>
        {/* Routes publiques */}
        <Route path="/" element={<Acceuil />} />
        <Route path="/inscription" element={<Inscription />} />
        <Route path="/connexion" element={<Connexion />} />

        {/* Routes CLIENT uniquement */}
        <Route path="/Client" element={
          <PrivateRoute roles={['CLIENT', 'ADMIN']}><Client /></PrivateRoute>
        } />
        <Route path="/Client2" element={
          <PrivateRoute roles={['CLIENT', 'ADMIN']}><Client2 /></PrivateRoute>
        } />
        <Route path="/Service2" element={
          <PrivateRoute roles={['CLIENT', 'ADMIN']}><Service2 /></PrivateRoute>
        } />
        <Route path="/DashbordClient" element={
          <PrivateRoute roles={['CLIENT', 'ADMIN']}><DashbordClient /></PrivateRoute>
        } />
        <Route path="/service/coiffure" element={
          <PrivateRoute roles={['CLIENT', 'ADMIN']}><Coiffeur /></PrivateRoute>
        } />
        <Route path="/service/tresseuses" element={
          <PrivateRoute roles={['CLIENT', 'ADMIN']}><Tresseuses /></PrivateRoute>
        } />
        <Route path="/service/pressings" element={
          <PrivateRoute roles={['CLIENT', 'ADMIN']}><Pressing /></PrivateRoute>
        } />
        <Route path="/service/lavage-auto" element={
          <PrivateRoute roles={['CLIENT', 'ADMIN']}><LavageAuto /></PrivateRoute>
        } />

        {/* Catégories réservées à l'ADMIN — retirées du parcours client
            et de l'inscription entreprise (cf. TYPES_ADMIN côté serveur) */}
        <Route path="/service/residence" element={
          <PrivateRoute roles={['ADMIN']}><Residence /></PrivateRoute>
        } />
        <Route path="/service/agence-waves" element={
          <PrivateRoute roles={['ADMIN']}><AgenceWaves /></PrivateRoute>
        } />

        {/* Routes ENTREPRISE uniquement */}
        <Route path="/EntrepriseAccueil" element={
          <PrivateRoute roles={['ENTREPRISE', 'ADMIN']}><EntrepriseAccueil /></PrivateRoute>
        } />
        <Route path="/Entreprise" element={
          <PrivateRoute roles={['ENTREPRISE', 'ADMIN']}><Entreprise /></PrivateRoute>
        } />
        <Route path="/EntrepriseService/:serviceId" element={
          <PrivateRoute roles={['ENTREPRISE', 'ADMIN']}><Entreprise /></PrivateRoute>
        } />

        {/* Route ADMIN uniquement */}
        <Route path="/Administrateur" element={
          <PrivateRoute roles={['ADMIN']}><PAdmin /></PrivateRoute>
        } />
      </Routes>
    </Router>
    </SocketProvider>
    </AuthProvider>
  );
}

export default App;
