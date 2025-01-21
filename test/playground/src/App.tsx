import { lazy } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
const Home = lazy(() => import('./components/Home'));
const Profile = lazy(() => import('./components/Profile'));
const About = lazy(() => import('./components/About'));

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
  );
}

export default App;