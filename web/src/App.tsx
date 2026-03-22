import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ContentGenerator from './pages/ContentGenerator';
import VideoStudio from './pages/VideoStudio';
import Studio from './pages/Studio';
import Campaigns from './pages/Campaigns';
import Calendar from './pages/Calendar';
import BrandVoice from './pages/BrandVoice';
import History from './pages/History';
import Workflow from './pages/Workflow';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="workflow" element={<Workflow />} />
        <Route path="studio" element={<Studio />} />
        <Route path="content" element={<ContentGenerator />} />
        <Route path="video" element={<VideoStudio />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="brand" element={<BrandVoice />} />
        <Route path="history" element={<History />} />
      </Route>
    </Routes>
  );
}

export default App;
