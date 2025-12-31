import { LogOut, Upload, Image } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function EmployeeDashboardPage() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {user?.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {user?.name}
                </h1>
                <p className="text-sm text-gray-500">Employee Dashboard</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name}!
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition cursor-pointer group">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Upload Screenshot
              </h3>
              <p className="text-gray-600 mb-4">
                Upload new screenshots to track your activity
              </p>
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Start Upload
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition cursor-pointer group">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 transition">
                <Image className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                My Screenshots
              </h3>
              <p className="text-gray-600 mb-4">
                View all your uploaded screenshots and activity history
              </p>
              <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                View History
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Total Screenshots</div>
            <div className="text-3xl font-bold text-gray-900">0</div>
            <div className="text-sm text-gray-500 mt-1">All time</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">This Week</div>
            <div className="text-3xl font-bold text-gray-900">0</div>
            <div className="text-sm text-gray-500 mt-1">
              Screenshots uploaded
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Last Upload</div>
            <div className="text-3xl font-bold text-gray-900">-</div>
            <div className="text-sm text-gray-500 mt-1">Never</div>
          </div>
        </div>
      </main>
    </div>
  );
}
