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
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import GuestPostsPage from "@/pages/GuestPostsPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Home */}
      <Route path="/" component={HomePage} />

      {/* Features */}
      <Route path="/features" component={FeaturesPage} />
      <Route path="/features/:slug" component={FeaturesPage} />

      {/* Pricing */}
      <Route path="/pricing" component={PricingPage} />
      <Route path="/pricing/:tier" component={PricingPage} />

      {/* Commands */}
      <Route path="/commands" component={CommandsPage} />
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

      {/* Community / Guest Posts */}
      <Route path="/guest-posts" component={GuestPostsPage} />

      {/* Auth */}
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/forgot-password" component={LoginPage} />

      {/* Location-specific landing pages */}
      <Route path="/telegram-bot-nigeria" component={HomePage} />
      <Route path="/telegram-userbot-commands" component={HomePage} />
      <Route path="/whatsapp-bot-nigeria" component={HomePage} />
      <Route path="/whatsapp-bot-south-africa" component={HomePage} />
      <Route path="/whatsapp-bot-india" component={HomePage} />

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
