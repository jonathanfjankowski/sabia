import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Sabiá</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user?.name}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6 bg-white border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to Sabiá!
              </h2>
              <p className="text-gray-600">
                You are successfully logged in. This is your dashboard where you can manage your AI-powered business insights.
              </p>
              
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Profile</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Name: {user?.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Email: {user?.email}
                  </p>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Status</h3>
                  <p className="mt-2 text-sm text-green-600 font-medium">
                    ✓ Authenticated
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Connected to Supabase PostgreSQL
                  </p>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Next Steps</h3>
                  <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                    <li>Configure AI services</li>
                    <li>Set up company settings</li>
                    <li>Create your first insight</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
