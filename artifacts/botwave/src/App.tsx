import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ThemeProvider from "@/components/ui/ThemeProvider";
import HomePage from "@/pages/HomePage";
import CommandsPage from "@/pages/CommandsPage";
import FAQPage from "@/pages/FAQPage";
import BlogPage from "@/pages/BlogPage";
import DocsPage from "@/pages/DocsPage";
import FeaturesPage from "@/pages/FeaturesPage";
import ComparePage from "@/pages/ComparePage";
import HowToPage from "@/pages/HowToPage";
import FixPage from "@/pages/FixPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import GuestPostsPage from "@/pages/GuestPostsPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/features" component={FeaturesPage} />
      <Route path="/features/:slug" component={FeaturesPage} />
      <Route path="/pricing" component={HomePage} />
      <Route path="/commands" component={CommandsPage} />
      <Route path="/commands/:platform" component={CommandsPage} />
      <Route path="/commands/:platform/:slug" component={CommandsPage} />
      <Route path="/docs" component={DocsPage} />
      <Route path="/docs/:slug" component={DocsPage} />
      <Route path="/how-to" component={HowToPage} />
      <Route path="/how-to/:slug" component={HowToPage} />
      <Route path="/compare" component={ComparePage} />
      <Route path="/compare/:slug" component={ComparePage} />
      <Route path="/blog" component={BlogPage} />
      <Route path="/blog/:slug" component={BlogPage} />
      <Route path="/faq" component={FAQPage} />
      <Route path="/faq/:slug" component={FAQPage} />
      <Route path="/fix" component={FixPage} />
      <Route path="/fix/:slug" component={FixPage} />
      <Route path="/guest-posts" component={GuestPostsPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
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
