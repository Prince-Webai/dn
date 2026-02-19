
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './layouts/Layout'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import Customers from './pages/Customers'
import Inventory from './pages/Inventory'
import Invoices from './pages/Invoices'
import Quotes from './pages/Quotes'
import Payments from './pages/Payments'
import Reports from './pages/Reports'
import Team from './pages/Team'
import JobDetails from './pages/JobDetails'

function App() {
    return (
        <BrowserRouter>
            <Layout>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/jobs" element={<Jobs />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/quotes" element={<Quotes />} />
                    <Route path="/payments" element={<Payments />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/team" element={<Team />} />
                    <Route path="/jobs/:id" element={<JobDetails />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Layout>
        </BrowserRouter>
    )
}

export default App
