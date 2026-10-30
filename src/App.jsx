import { Routes, Route, Navigate } from 'react-router-dom'

// Auth
import Login from './pages/auth/Login.jsx'
import Signup from './pages/auth/Signup.jsx'
import ForgotPassword from './pages/auth/ForgotPassword.jsx'

// Layouts
import UserLayout from './layouts/UserLayout.jsx'
import ProfessionalLayout from './layouts/ProfessionalLayout.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'

// User portal
import Dashboard from './pages/user/Dashboard.jsx'
import CheckIn from './pages/user/CheckIn.jsx'
import AssessmentResult from './pages/user/AssessmentResult.jsx'
import FindProfessional from './pages/user/FindProfessional.jsx'
import ProfessionalProfile from './pages/user/ProfessionalProfile.jsx'
import BookConsultation from './pages/user/BookConsultation.jsx'
import WellbeingJourney from './pages/user/WellbeingJourney.jsx'
import MindoraAI from './pages/user/MindoraAI.jsx'
import Resources from './pages/user/Resources.jsx'
import UserAppointments from './pages/user/Appointments.jsx'
import UserMessages from './pages/user/Messages.jsx'
import Groups from './pages/user/Groups.jsx'
import GroupDetail from './pages/user/GroupDetail.jsx'
import StudentRate from './pages/user/StudentRate.jsx'
import TriageList from './pages/user/TriageList.jsx'
import Welcome from './pages/user/Welcome.jsx'
import TriageStart from './pages/user/TriageStart.jsx'
import Triage from './pages/user/Triage.jsx'
import UserSettings from './pages/user/Settings.jsx'

// Professional portal
import ProfessionalDashboard from './pages/professional/Dashboard.jsx'
import ReferralDetail from './pages/professional/ReferralDetail.jsx'
import ClientView from './pages/professional/ClientView.jsx'
import Clients from './pages/professional/Clients.jsx'
import ProAppointments from './pages/professional/Appointments.jsx'
import ProMessages from './pages/professional/Messages.jsx'
import ProGroups from './pages/professional/Groups.jsx'
import ProGroupManage from './pages/professional/GroupManage.jsx'
import Earnings from './pages/professional/Earnings.jsx'
import ProAssessments from './pages/professional/Assessments.jsx'
import FollowUps from './pages/professional/FollowUps.jsx'
import Reports from './pages/professional/Reports.jsx'
import ClinicalResources from './pages/professional/ClinicalResources.jsx'
import ProSettings from './pages/professional/Settings.jsx'
import TriageQueue from './pages/professional/TriageQueue.jsx'
import TriageDetail from './pages/professional/TriageDetail.jsx'

// Admin portal
import Overview from './pages/admin/Overview.jsx'
import AdminUsers from './pages/admin/Users.jsx'
import AdminProfessionals from './pages/admin/Professionals.jsx'
import AdminReferrals from './pages/admin/Referrals.jsx'
import AdminAppointments from './pages/admin/Appointments.jsx'
import Safety from './pages/admin/Safety.jsx'
import Analytics from './pages/admin/Analytics.jsx'
import Payouts from './pages/admin/Payouts.jsx'
import Prices from './pages/admin/Prices.jsx'
import AdminTriage from './pages/admin/Triage.jsx'
import StudentRateReview from './pages/admin/StudentRateReview.jsx'
import Institutions from './pages/admin/Institutions.jsx'
import DeletionRequests from './pages/admin/DeletionRequests.jsx'
import AdminSettings from './pages/admin/Settings.jsx'

import RequireAuth from './components/RequireAuth.jsx'

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* User portal */}
      <Route path="/app" element={<RequireAuth><UserLayout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="check-in" element={<CheckIn />} />
        <Route path="check-in/result" element={<AssessmentResult />} />
        <Route path="welcome" element={<Welcome />} />
        <Route path="triage" element={<TriageList />} />
        <Route path="triage/new/:checkInId" element={<TriageStart />} />
        <Route path="triage/:id" element={<Triage />} />
        <Route path="find-a-professional" element={<FindProfessional />} />
        <Route path="find-a-professional/:id" element={<ProfessionalProfile />} />
        <Route path="book" element={<BookConsultation />} />
        <Route path="wellbeing" element={<WellbeingJourney />} />
        <Route path="mindora-ai" element={<MindoraAI />} />
        <Route path="resources" element={<Resources />} />
        <Route path="appointments" element={<UserAppointments />} />
        <Route path="messages" element={<UserMessages />} />
        <Route path="groups" element={<Groups />} />
        <Route path="groups/:groupId" element={<GroupDetail />} />
        <Route path="student-rate" element={<StudentRate />} />
        <Route path="settings" element={<UserSettings />} />
      </Route>

      {/* Professional portal */}
      <Route path="/pro" element={<RequireAuth><ProfessionalLayout /></RequireAuth>}>
        <Route index element={<ProfessionalDashboard />} />
        <Route path="triage" element={<TriageQueue />} />
        <Route path="triage/:id" element={<TriageDetail />} />
        <Route path="referrals" element={<ProfessionalDashboard />} />
        <Route path="referrals/:id" element={<ReferralDetail />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:userId" element={<ClientView />} />
        <Route path="appointments" element={<ProAppointments />} />
        <Route path="messages" element={<ProMessages />} />
        <Route path="groups" element={<ProGroups />} />
        <Route path="groups/:groupId" element={<ProGroupManage />} />
        <Route path="earnings" element={<Earnings />} />
        <Route path="assessments" element={<ProAssessments />} />
        <Route path="follow-ups" element={<FollowUps />} />
        <Route path="reports" element={<Reports />} />
        <Route path="resources" element={<ClinicalResources />} />
        <Route path="settings" element={<ProSettings />} />
      </Route>

      {/* Admin portal */}
      <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
        <Route index element={<Overview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="professionals" element={<AdminProfessionals />} />
        <Route path="referrals" element={<AdminReferrals />} />
        <Route path="appointments" element={<AdminAppointments />} />
        <Route path="safety" element={<Safety />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="payouts" element={<Payouts />} />
        <Route path="prices" element={<Prices />} />
        <Route path="triage" element={<AdminTriage />} />
        <Route path="student-rate" element={<StudentRateReview />} />
        <Route path="institutions" element={<Institutions />} />
        <Route path="deletion-requests" element={<DeletionRequests />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
