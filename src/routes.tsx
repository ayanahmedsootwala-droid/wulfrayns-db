import React from 'react';
import type { ReactNode } from 'react';
import RpmDashboardPage from './pages/RpmDashboardPage';
import InventoryPage from './pages/InventoryPage';
import VehicleDetailPage from './pages/VehicleDetailPage';
import DealersPage from './pages/DealersPage';
import DealerDetailPage from './pages/DealerDetailPage';
import DealershipsPage from './pages/DealershipsPage';
import DealershipDetailPage from './pages/DealershipDetailPage';
import TasksPage from './pages/TasksPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ActivityLogPage from './pages/ActivityLogPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import InquiriesPage from './pages/InquiriesPage';
import SourceDownloadPage from './pages/SourceDownloadPage';
import VehicleComparison from './components/vehicle/VehicleComparison';
import LeadsPage from './pages/LeadsPage';
import QuotationsPage from './pages/QuotationsPage';
import ImportCalculatorPage from './pages/ImportCalculatorPage';
import ShipmentsPage from './pages/ShipmentsPage';
import MarketingPage from './pages/MarketingPage';
import FinancePage from './pages/FinancePage';
import ExpensesPage from './pages/ExpensesPage';
import DocumentAssistantPage from './pages/DocumentAssistantPage';
import AuctionGuidePage from './pages/AuctionGuidePage';
import TransactionBookPage from './pages/TransactionBookPage';
import NotesPage from './pages/NotesPage';
import ScratchpadPage from './pages/ScratchpadPage';
import InvoicePage from './pages/InvoicePage';
import ImageGalleryPage from './pages/ImageGalleryPage';
import CommandCenterPage from './pages/CommandCenterPage';
import SocialMediaPage from './pages/SocialMediaPage';
import PartiesPage from './pages/PartiesPage';
import CustomsDutyChartPage from './pages/CustomsDutyChartPage';
import DeveloperAPIPage from './pages/DeveloperAPIPage';
import AISyncPage from './pages/AISyncPage';
import BulkCreatePage from './pages/BulkCreatePage';
import LiveSyncPage from './pages/LiveSyncPage';
import LiveDisplayPage from './pages/LiveDisplayPage';
import AIIntegrationGuidePage from './pages/AIIntegrationGuidePage';
import CarKnowledgeLibraryPage from './pages/CarKnowledgeLibraryPage';
import PartnerReferralPage from './pages/PartnerReferralPage';
import ImportCarsGuidePage from './pages/ImportCarsGuidePage';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  public?: boolean;
}

export const routes: RouteConfig[] = [
  { name: 'Login', path: '/login', element: <LoginPage />, public: true },
  { name: 'Dashboard', path: '/', element: <RpmDashboardPage /> },
  { name: 'Command Center', path: '/command-center', element: <CommandCenterPage /> },
  { name: 'Inventory', path: '/inventory', element: <InventoryPage /> },
  { name: 'Vehicle Detail', path: '/inventory/:id', element: <VehicleDetailPage /> },
  { name: 'Compare Vehicles', path: '/compare', element: <VehicleComparison /> },
  { name: 'Leads & CRM', path: '/leads', element: <LeadsPage /> },
  { name: 'Quotations', path: '/quotations', element: <QuotationsPage /> },
  { name: 'Inquiries', path: '/inquiries', element: <InquiriesPage /> },
  { name: 'Import Calculator', path: '/import-calculator', element: <ImportCalculatorPage /> },
  { name: 'Auction Guide', path: '/auction-guide', element: <AuctionGuidePage /> },
  { name: 'Shipments', path: '/shipments', element: <ShipmentsPage /> },
  { name: 'Marketing', path: '/marketing', element: <MarketingPage /> },
  { name: 'Social Media', path: '/social-media', element: <SocialMediaPage /> },
  { name: 'Finance Plans', path: '/finance', element: <FinancePage /> },
  { name: 'Expenses', path: '/expenses', element: <ExpensesPage /> },
  { name: 'Transaction Book', path: '/transactions', element: <TransactionBookPage /> },
  { name: 'Analytics', path: '/analytics', element: <AnalyticsPage /> },
  { name: 'Document Assistant', path: '/documents', element: <DocumentAssistantPage /> },
  { name: 'Dealers', path: '/dealers', element: <DealersPage /> },
  { name: 'Dealer Detail', path: '/dealers/:id', element: <DealerDetailPage /> },
  { name: 'Dealerships', path: '/dealerships', element: <DealershipsPage /> },
  { name: 'Dealership Detail', path: '/dealerships/:id', element: <DealershipDetailPage /> },
  { name: 'Tasks', path: '/tasks', element: <TasksPage /> },
  { name: 'Activity Log', path: '/activity', element: <ActivityLogPage /> },
  { name: 'WhatsApp Notes', path: '/notes', element: <NotesPage /> },
  { name: 'Scratchpad', path: '/scratchpad', element: <ScratchpadPage /> },
  { name: 'Invoicing', path: '/invoices', element: <InvoicePage /> },
  { name: 'Image Gallery', path: '/image-gallery', element: <ImageGalleryPage /> },
  { name: 'Source Download', path: '/source-download', element: <SourceDownloadPage /> },
  { name: 'Settings', path: '/settings', element: <SettingsPage /> },
  { name: 'Parties', path: '/parties', element: <PartiesPage /> },
  { name: 'Customs Duty Chart', path: '/customs-duty-chart', element: <CustomsDutyChartPage /> },
  { name: 'Developer API', path: '/developer-api', element: <DeveloperAPIPage /> },
  { name: 'AI Chatbot', path: '/ai-sync', element: <AISyncPage /> },
  { name: 'Bulk Create', path: '/bulk-create', element: <BulkCreatePage /> },
  { name: 'Live Sync', path: '/live-sync', element: <LiveSyncPage /> },
  { name: 'Live Display', path: '/live-display', element: <LiveDisplayPage /> },
  { name: 'AI Integration Guide', path: '/ai-integration-guide', element: <AIIntegrationGuidePage /> },
  { name: 'Car Knowledge Library', path: '/car-library', element: <CarKnowledgeLibraryPage /> },
  { name: 'Partner Referrals', path: '/referrals', element: <PartnerReferralPage /> },
  { name: 'Import Cars Guide', path: '/import-guide', element: <ImportCarsGuidePage /> },
];


