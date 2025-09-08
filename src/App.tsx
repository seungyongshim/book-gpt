import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import BookList from './features/books/BookList';
import BookDashboard from './features/books/BookDashboard';
import WorldBuilder from './features/world/WorldBuilder';
import PageEditor from './features/pages/PageEditor';
import VersionTimeline from './features/pages/VersionTimeline';
import DiffView from './features/pages/DiffView';
import ToastHost from './components/ToastHost';
import FloatingGPTButton from './components/FloatingGPTButton';
import GPTOverlay from './components/GPTOverlay';
import GPTChatPanel from './components/GPTChatPanel';
import ReactDOM from 'react-dom';

const Placeholder: React.FC<{ title: string }> = ({ title }) => (
  <div className="p-4">
    <h2 className="text-xl font-semibold mb-2">{title}</h2>
    <p className="text-sm text-text-dim">구현 예정...</p>
    <Link to="/" className="text-primary underline text-sm">책 목록으로</Link>
  </div>
);

const App: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="min-h-screen bg-bg text-text">
      <Routes>
        <Route path="/" element={<BookList />} />
        <Route path="/books/:bookId" element={<BookDashboard />} />
        <Route path="/books/:bookId/world" element={<WorldBuilder />} />
        <Route path="/books/:bookId/pages/:pageIndex" element={<PageEditor />} />
        <Route path="/books/:bookId/pages/:pageIndex/versions" element={<VersionTimeline />} />
        <Route path="/books/:bookId/pages/:pageIndex/diff/:versionId" element={<DiffView />} />
        <Route path="*" element={<Placeholder title="Not Found" />} />
      </Routes>
      <ToastHost />
      <FloatingGPTButton onOpen={()=>setOpen(true)} />
      {ReactDOM.createPortal(
        <GPTOverlay open={open} onClose={()=>setOpen(false)}>
          <GPTChatPanel />
        </GPTOverlay>,
        document.body
      )}
    </div>
  );
};

export default App;
