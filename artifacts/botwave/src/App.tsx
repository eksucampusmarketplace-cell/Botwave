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
import WhatsAppBotPage from "@/pages/WhatsAppBotPage";
import TelegramBotPage from "@/pages/TelegramBotPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import GuestPostsPage from "@/pages/GuestPostsPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Home */}
      <Route path="/" component={HomePage} />

      {/* Platform landing pages */}
      <Route path="/whatsapp-bot" component={WhatsAppBotPage} />
      <Route path="/telegram-bot" component={TelegramBotPage} />

      {/* Region-specific landing pages (serve same content) */}
      <Route path="/whatsapp-bot-nigeria" component={WhatsAppBotPage} />
      <Route path="/whatsapp-bot-south-africa" component={WhatsAppBotPage} />
      <Route path="/whatsapp-bot-india" component={WhatsAppBotPage} />
      <Route path="/whatsapp-bot-usa" component={WhatsAppBotPage} />
      <Route path="/telegram-bot-nigeria" component={TelegramBotPage} />
      <Route path="/telegram-userbot-commands" component={TelegramBotPage} />

      {/* Features */}
      <Route path="/features" component={FeaturesPage} />
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

      {/* Community / Guest Posts */}
      <Route path="/guest-posts" component={GuestPostsPage} />

      {/* Dashboard (requires auth — shows stub/login prompt) */}
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/dashboard/:section" component={DashboardPage} />
      <Route path="/dashboard/:section/:id" component={DashboardPage} />

      {/* Auth */}
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />

      {/* Admin (redirect to login) */}
      <Route path="/admin" component={LoginPage} />
      <Route path="/admin/:section" component={LoginPage} />

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
