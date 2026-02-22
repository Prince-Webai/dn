
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './layouts/Layout'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import Customers from './pages/Customers'
import Inventory from './pages/Inventory'
import Invoices from './pages/Invoices'
import InvoiceBuilder from './pages/InvoiceBuilder'
import Quotes from './pages/Quotes'
import DocumentBuilder from './pages/DocumentBuilder'
import Payments from './pages/Payments'
import Reports from './pages/Reports'
import Team from './pages/Team'
import JobDetails from './pages/JobDetails'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './context/AuthContext'

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { session, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFB]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-delaval-blue/30 border-t-delaval-blue rounded-full animate-spin"></div>
                    <div className="text-slate-500 font-medium animate-pulse">Loading Condon Dairy...</div>
                </div>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    {/* Protected Routes */}
                    <Route path="/" element={
                        <ProtectedRoute>
                            <Layout>
                                <Dashboard />
                            </Layout>
                        </ProtectedRoute>
                    } />
                    <Route path="/jobs" element={
                        <ProtectedRoute>
                            <Layout>
                                <Jobs />
                            </Layout>
                        </ProtectedRoute>
                    } />
                    <Route path="/customers" element={
                        <ProtectedRoute>
                            <Layout>
                                <Customers />
                            </Layout>
                        </ProtectedRoute>
                    } />
                    <Route path="/inventory" element={
                        <ProtectedRoute>
                            <Layout>
                                <Inventory />
                            </Layout>
                        </ProtectedRoute>
                    } />
                    <Route path="/invoices" element={
                        <ProtectedRoute>
                            <Layout>
                                <Invoices />
                            </Layout>
                        </ProtectedRoute>
                    } />
                    <Route path="/invoices/builder" element={
                        <ProtectedRoute>
                            <Layout>
                                <InvoiceBuilder />
                            </Layout>
                        </ProtectedRoute>
                    } />
                    <Route path="/quotes" element={
                        <ProtectedRoute>
                            <Layout>
                                <Quotes />
                            </Layout>
                        </ProtectedRoute>
                    } />
                    <Route path="/documents/new" element={
                        <ProtectedRoute>
                            <Layout>
                                <DocumentBuilder />
                            </Layout>
                        </ProtectedRoute>
                    } />
                    <Route path="/payments" element={
                        <ProtectedRoute>
                            <Layout>
                                <Payments />
                            </Layout>
                        </ProtectedRoute>
                    } />
                    <Route path="/reports" element={
                        <ProtectedRoute>
                            <Layout>
                                <Reports />
                            </Layout>
                        </ProtectedRoute>
                    } />
                    <Route path="/team" element={
                        <ProtectedRoute>
                            <Layout>
                                <Team />
                            </Layout>
                        </ProtectedRoute>
                    } />
                    <Route path="/jobs/:id" element={
                        <ProtectedRoute>
                            <Layout>
                                <JobDetails />
                            </Layout>
                        </ProtectedRoute>
                    } />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    )
}

export default App
