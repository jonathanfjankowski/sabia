import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';

// Chat
import { ChatPage } from './pages/chat/ChatPage';

// Knowledge Base
import { KnowledgeBase } from './pages/kb/KnowledgeBase';
import { ArticleView } from './pages/kb/ArticleView';

// Admin Pages
import { ArticlesList } from './pages/admin/ArticlesList';
import { ArticleEditor } from './pages/admin/ArticleEditor';
import { CategoriesList } from './pages/admin/CategoriesList';
import { UsersList } from './pages/admin/UsersList';
import { AiSettingsPage } from './pages/admin/AiSettingsPage';
import { CompanySettingsPage } from './pages/admin/CompanySettingsPage';
import { KnowledgeGapsList } from './pages/admin/KnowledgeGapsList';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<PrivateRoute><AppLayout><Dashboard /></AppLayout></PrivateRoute>} />

        {/* Chat */}
        <Route path="/conversations" element={<PrivateRoute><AppLayout><ChatPage /></AppLayout></PrivateRoute>} />

        {/* Knowledge Base */}
        <Route path="/kb" element={<PrivateRoute><AppLayout><KnowledgeBase /></AppLayout></PrivateRoute>} />
        <Route path="/kb/:slug" element={<PrivateRoute><AppLayout><ArticleView /></AppLayout></PrivateRoute>} />

        {/* Admin - Articles */}
        <Route path="/admin/articles" element={<PrivateRoute><AppLayout><ArticlesList /></AppLayout></PrivateRoute>} />
        <Route path="/admin/articles/new" element={<PrivateRoute><AppLayout><ArticleEditor /></AppLayout></PrivateRoute>} />
        <Route path="/admin/articles/:id" element={<PrivateRoute><AppLayout><ArticleEditor /></AppLayout></PrivateRoute>} />

        {/* Admin - Categories */}
        <Route path="/admin/categories" element={<PrivateRoute><AppLayout><CategoriesList /></AppLayout></PrivateRoute>} />

        {/* Admin - Users */}
        <Route path="/admin/users" element={<PrivateRoute><AppLayout><UsersList /></AppLayout></PrivateRoute>} />

        {/* Admin - Settings */}
        <Route path="/admin/settings/ai" element={<PrivateRoute><AppLayout><AiSettingsPage /></AppLayout></PrivateRoute>} />
        <Route path="/admin/settings/company" element={<PrivateRoute><AppLayout><CompanySettingsPage /></AppLayout></PrivateRoute>} />

        {/* Admin - Knowledge Gaps */}
        <Route path="/admin/knowledge-gaps" element={<PrivateRoute><AppLayout><KnowledgeGapsList /></AppLayout></PrivateRoute>} />

        {/* Admin - Audit Logs */}
        <Route path="/admin/audit-logs" element={<PrivateRoute><AppLayout><AuditLogsPage /></AppLayout></PrivateRoute>} />

        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
