import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ThemeProvider from "@/components/ui/ThemeProvider";

import HomePage from "@/pages/HomePage";
import CommandsPage from "@/pages/CommandsPage";
import FAQPage from "@/pages/FAQPage";
import FAQDetailPage from "@/pages/FAQDetailPage";
import BlogPage from "@/pages/BlogPage";
import BlogDetailPage from "@/pages/BlogDetailPage";
import DocsPage from "@/pages/DocsPage";
import DocsDetailPage from "@/pages/DocsDetailPage";
import FeaturesPage from "@/pages/FeaturesPage";
import ComparePage from "@/pages/ComparePage";
import CompareDetailPage from "@/pages/CompareDetailPage";
import HowToPage from "@/pages/HowToPage";
import HowToDetailPage from "@/pages/HowToDetailPage";
import FixPage from "@/pages/FixPage";
import FixDetailPage from "@/pages/FixDetailPage";
import PricingPage from "@/pages/PricingPage";
import UseCasesPage from "@/pages/UseCasesPage";
import IntegrationsPage from "@/pages/IntegrationsPage";
import TemplatesPage from "@/pages/TemplatesPage";
import ChangelogPage from "@/pages/ChangelogPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import TelegramBotPage from "@/pages/TelegramBotPage";
import TelegramBotForGroupsPage from "@/pages/TelegramBotForGroupsPage";
import TelegramAutoReplyPage from "@/pages/TelegramAutoReplyPage";
import TelegramGroupAnalyticsPage from "@/pages/TelegramGroupAnalyticsPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import GuestPostsPage from "@/pages/GuestPostsPage";
import AboutPage from "@/pages/AboutPage";
import AcademyPage from "@/pages/AcademyPage";
import CommunityPage from "@/pages/CommunityPage";
import CommunityCommandsPage from "@/pages/CommunityCommandsPage";
import SecurityPage from "@/pages/SecurityPage";
import StatusPage from "@/pages/StatusPage";
import TycoonPage from "@/pages/TycoonPage";
import WhatIsBotWavePage from "@/pages/WhatIsBotWavePage";
import CaseStudiesPage from "@/pages/CaseStudiesPage";
import FeatureSuggestionsPage from "@/pages/FeatureSuggestionsPage";
import MailboxPage from "@/pages/MailboxPage";
import SearchEnginesPage from "@/pages/SearchEnginesPage";
import DeployTelegramBotPage from "@/pages/DeployTelegramBotPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import GamePage from "@/pages/GamePage";
import LandingSlugPage from "@/pages/LandingSlugPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Home */}
      <Route path="/" component={HomePage} />

      {/* About / What is BotWave */}
      <Route path="/about" component={AboutPage} />
      <Route path="/what-is-botwave" component={WhatIsBotWavePage} />

      {/* Platform landing pages */}
      <Route path="/telegram-bot" component={TelegramBotPage} />
      <Route path="/telegram-bot-for-groups" component={TelegramBotForGroupsPage} />
      <Route path="/telegram-auto-reply" component={TelegramAutoReplyPage} />
      <Route path="/telegram-group-analytics" component={TelegramGroupAnalyticsPage} />
      <Route path="/deploy-telegram-bot" component={DeployTelegramBotPage} />

      {/* Region-specific landing pages */}
      <Route path="/telegram-bot-nigeria" component={TelegramBotPage} />

      {/* Features */}
      <Route path="/features" component={FeaturesPage} />
      <Route path="/features/ai" component={FeaturesPage} />
      <Route path="/features/media" component={FeaturesPage} />
      <Route path="/features/moderation" component={FeaturesPage} />
      <Route path="/features/:slug" component={FeaturesPage} />

      {/* Pricing */}
      <Route path="/pricing" component={PricingPage} />
      <Route path="/pricing/:tier" component={PricingPage} />

      {/* Commands */}
      <Route path="/commands" component={CommandsPage} />
      <Route path="/commands/telegram" component={CommandsPage} />
      <Route path="/commands/:platform" component={CommandsPage} />
      <Route path="/commands/:platform/:slug" component={CommandsPage} />

      {/* Docs */}
      <Route path="/docs" component={DocsPage} />
      <Route path="/docs/:slug" component={DocsDetailPage} />

      {/* How-To / Guides */}
      <Route path="/how-to" component={HowToPage} />
      <Route path="/how-to/:slug" component={HowToDetailPage} />

      {/* Compare */}
      <Route path="/compare" component={ComparePage} />
      <Route path="/compare/:slug" component={CompareDetailPage} />

      {/* Use Cases */}
      <Route path="/use-cases" component={UseCasesPage} />
      <Route path="/use-cases/:slug" component={UseCasesPage} />

      {/* Blog */}
      <Route path="/blog" component={BlogPage} />
      <Route path="/blog/:slug" component={BlogDetailPage} />

      {/* FAQ */}
      <Route path="/faq" component={FAQPage} />
      <Route path="/faq/:slug" component={FAQDetailPage} />

      {/* Fix / Troubleshooting */}
      <Route path="/fix" component={FixPage} />
      <Route path="/fix/:slug" component={FixDetailPage} />

      {/* Integrations, Templates, Changelog */}
      <Route path="/integrations" component={IntegrationsPage} />
      <Route path="/templates" component={TemplatesPage} />
      <Route path="/changelog" component={ChangelogPage} />

      {/* Legal */}
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />

      {/* Community */}
      <Route path="/community" component={CommunityPage} />
      <Route path="/community-commands" component={CommunityCommandsPage} />
      <Route path="/guest-posts" component={GuestPostsPage} />
      <Route path="/feature-suggestions" component={FeatureSuggestionsPage} />
      <Route path="/case-studies" component={CaseStudiesPage} />

      {/* Academy & Learning */}
      <Route path="/academy" component={AcademyPage} />

      {/* Security & Status */}
      <Route path="/security" component={SecurityPage} />
      <Route path="/status" component={StatusPage} />

      {/* Mailbox */}
      <Route path="/mailbox" component={MailboxPage} />
      <Route path="/mailbox/:slug" component={MailboxPage} />

      {/* Search engines */}
      <Route path="/search-engines" component={SearchEnginesPage} />
      <Route path="/search-engines/:slug" component={SearchEnginesPage} />

      {/* Tycoon game lander */}
      <Route path="/tycoon" component={TycoonPage} />

      {/* Game routes */}
      <Route path="/play/:roomId" component={GamePage} />
      <Route path="/review/:roomId" component={GamePage} />
      <Route path="/spectate/:roomId" component={GamePage} />
      <Route path="/tournament/:tournamentId" component={GamePage} />
      <Route path="/puzzle" component={GamePage} />
      <Route path="/profile/:userId" component={AboutPage} />
      <Route path="/miniapp/:sessionId/:chatId" component={GamePage} />
      <Route path="/study-login" component={LoginPage} />

      {/* Dashboard */}
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/dashboard/:section" component={DashboardPage} />
      <Route path="/dashboard/telegram/:sessionId" component={DashboardPage} />
      <Route path="/dashboard/:section/:id" component={DashboardPage} />

      {/* Auth */}
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />

      {/* Admin */}
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/admin" component={AdminLoginPage} />
      <Route path="/admin/dashboard" component={AdminLoginPage} />
      <Route path="/admin/dashboard/:section" component={AdminLoginPage} />

      {/* Dynamic landing pages — must come last before 404 */}
      <Route path="/:slug" component={LandingSlugPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div id="gtx-wrapper" className="gtx-collapsed">
          <div id="google_translate_element" />
        </div>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
