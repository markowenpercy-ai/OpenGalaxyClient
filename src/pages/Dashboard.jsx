import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStatus, getUsers, logout, playUser, createUser } from '../services/api';
import { useRandomBackground } from '../hooks/useRandomBackground';

export default function Dashboard({ onLogout }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlanetName, setNewPlanetName] = useState('');
  const [newPlanetGround, setNewPlanetGround] = useState(1);
  const [createError, setCreateError] = useState('');
  const background = useRandomBackground();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statusRes, usersRes] = await Promise.all([
        getStatus(),
        getUsers()
      ]);
      setStatus(statusRes);
      setUsers(usersRes.data || []);
      if (usersRes.data?.length > 0) {
        setSelectedUser(usersRes.data[0]);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    onLogout();
  };

  const handlePlay = async () => {
    if (!selectedUser) return;
    window.open(`/play/${selectedUser.userId}`, '_blank');
  };

  const handlePlayAll = async () => {
    window.location.href = '/play-all';
  };

  const handleCreatePlanet = async (e) => {
    e.preventDefault();
    setCreateError('');
    try {
      const result = await createUser(newPlanetName, newPlanetGround);
      if (result.success) {
        setUsers(result.users || []);
        setShowCreateModal(false);
        setNewPlanetName('');
        setNewPlanetGround(1);
      } else {
        setCreateError(result.error || 'Failed to create planet');
      }
    } catch (err) {
      setCreateError('Failed to create planet');
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ 
          backgroundImage: `url(${background})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-space-dark/90 via-space-dark/70 to-space-dark/90" />
        <div className="text-space-accent text-xl animate-pulse relative z-10">Loading...</div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen p-8 relative"
      style={{ 
        backgroundImage: `url(${background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-space-dark/90 via-space-dark/70 to-space-dark/90" />
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-space-accent glow-text">
            OpenGalaxy
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-300">{status?.username}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Select Planet</h2>
          <span className="text-sm text-gray-400">{users.length} planet{users.length !== 1 ? 's' : ''} available</span>
        </div>

        {users.length === 0 ? (
          <div className="bg-space-panel/90 backdrop-blur-md border border-space-border rounded-xl p-12 text-center">
            <div className="text-gray-400 mb-4">No planets found</div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-space-accent text-space-dark font-semibold rounded-lg hover:bg-space-accent-dim transition-colors"
            >
              Create New Planet
            </button>
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            <div className="grid gap-4">
            {users.map((user) => (
              <button
                key={user.userId}
                onClick={() => setSelectedUser(user)}
                className={`w-full p-6 rounded-xl border transition-all text-left backdrop-blur-md ${
                  selectedUser?.userId === user.userId
                    ? 'border-space-accent bg-space-accent/20'
                    : 'border-space-border bg-space-panel/80 hover:bg-space-panel'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-white font-semibold text-lg">{user.username}</div>
                    <div className="text-gray-400 text-sm mt-1">Planet #{users.indexOf(user) + 1}</div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-yellow-400">{user.resources?.gold?.toLocaleString() || 0} Gold</div>
                    <div className="text-gray-400 text-sm">
                      {user.resources?.metal?.toLocaleString() || 0} Metal
                    </div>
                  </div>
                </div>
              </button>
            ))}
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full py-3 border-2 border-dashed border-space-border rounded-xl text-gray-400 hover:text-white hover:border-space-accent transition-all"
            >
              + Create New Planet
            </button>
          </div>
        )}

        <button
          onClick={handlePlay}
          disabled={!selectedUser || loading}
          className="w-full py-4 bg-space-accent text-space-dark font-bold text-lg rounded-xl hover:bg-space-accent-dim transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Launch Planet'}
        </button>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-space-panel border border-space-border rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">Create New Planet</h3>
              <form onSubmit={handleCreatePlanet}>
                <div className="mb-4">
                  <label className="block text-gray-300 text-sm mb-2">Planet Name</label>
                  <input
                    type="text"
                    value={newPlanetName}
                    onChange={(e) => setNewPlanetName(e.target.value)}
                    className="w-full px-4 py-2 bg-space-dark border border-space-border rounded-lg text-white focus:outline-none focus:border-space-accent"
                    placeholder="Enter planet name"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-300 text-sm mb-2">Ground Type</label>
                  <select
                    value={newPlanetGround}
                    onChange={(e) => setNewPlanetGround(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-space-dark border border-space-border rounded-lg text-white focus:outline-none focus:border-space-accent"
                  >
                    <option value={1}>Desert</option>
                    <option value={2}>Snow</option>
                    <option value={3}>Lava</option>
                  </select>
                </div>
                {createError && (
                  <div className="mb-4 text-red-400 text-sm">{createError}</div>
                )}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-space-accent text-space-dark font-semibold rounded-lg hover:bg-space-accent-dim transition-colors"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateError('');
                      setNewPlanetName('');
                      setNewPlanetGround(1);
                    }}
                    className="flex-1 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
