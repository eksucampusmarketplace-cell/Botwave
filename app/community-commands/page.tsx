import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Community Commands - User-Shared Bot Automations | BotWave',
  description: 'Discover bot automations shared by the BotWave community. Custom command workflows, auto-reply setups, group management configs, and creative bot uses. Submit your own!',
  keywords: ['botwave community', 'whatsapp bot commands', 'custom bot commands', 'shared automations', 'bot command library', 'community automations'],
  openGraph: {
    title: 'Community Commands - BotWave',
    description: 'Discover and share bot automations with the BotWave community.',
    url: 'https://www.botwave.online/community-commands',
    type: 'website',
  },
  alternates: { canonical: '/community-commands' },
};

interface CommunityCommand {
  id: string;
  title: string;
  description: string;
  author: string;
  platform: 'WhatsApp' | 'Telegram' | 'Both';
  category: string;
  commands: string[];
  setup: string;
  likes: number;
  verified: boolean;
}

const communityCommands: CommunityCommand[] = [
  {
    id: 'welcome-quiz',
    title: 'Welcome Quiz Gate',
    description: 'New members must answer a trivia question within 60 seconds or get removed. Stops spam bots cold.',
    author: 'GroupAdmin_NG',
    platform: 'WhatsApp',
    category: 'Moderation',
    commands: ['!welcome-quiz on', '!welcome-quiz set "What is 2+2?"', '!welcome-quiz timeout 60'],
    setup: 'Enable the welcome quiz, set your question, and configure the timeout. Wrong answers get a second chance, then auto-remove.',
    likes: 247,
    verified: true,
  },
  {
    id: 'daily-motivation',
    title: 'Daily Motivation Bot',
    description: 'Auto-posts an inspirational quote every morning at 7 AM in your timezone. Members can also request quotes anytime.',
    author: 'ChurchGroup_KE',
    platform: 'Both',
    category: 'Engagement',
    commands: ['!quote schedule 07:00', '!quote category motivation', '!quote'],
    setup: 'Schedule the daily quote with your preferred time. Works with the built-in !quote command and adds scheduling on top.',
    likes: 189,
    verified: true,
  },
  {
    id: 'study-timer',
    title: 'Group Study Timer',
    description: 'Set a Pomodoro-style study timer for the group. Bot mutes non-study chat during focus sessions and sends break reminders.',
    author: 'EKSU_StudyGroup',
    platform: 'WhatsApp',
    category: 'Education',
    commands: ['!study start 25', '!study break', '!study stats'],
    setup: 'Start a 25-minute focus session. The bot will remind everyone to stay on topic and announce breaks. Track total study hours with !study stats.',
    likes: 156,
    verified: true,
  },
  {
    id: 'vendor-catalog',
    title: 'Vendor Product Catalog',
    description: 'Small business owners can list products with prices. Customers type !shop to browse and !order to place orders.',
    author: 'MarketPlace_GH',
    platform: 'WhatsApp',
    category: 'Business',
    commands: ['!shop add "iPhone 15" 450000', '!shop list', '!order "iPhone 15"', '!shop remove "iPhone 15"'],
    setup: 'Add your products with !shop add. Customers browse with !shop list and order with !order. All orders are DM\'d to the group admin.',
    likes: 312,
    verified: true,
  },
  {
    id: 'attendance-tracker',
    title: 'Class Attendance Tracker',
    description: 'Students check in with !present during class hours. Admin gets a CSV report of who attended each session.',
    author: 'LecturerBot_ZA',
    platform: 'Both',
    category: 'Education',
    commands: ['!attendance start "MAT101"', '!present', '!attendance end', '!attendance report'],
    setup: 'Start a session with the course code. Students type !present to mark attendance. End the session and download the report.',
    likes: 203,
    verified: true,
  },
  {
    id: 'music-queue',
    title: 'Group Music Queue',
    description: 'Members queue song requests. The bot maintains a playlist and auto-downloads the next track when requested.',
    author: 'DJ_Bot_NG',
    platform: 'WhatsApp',
    category: 'Entertainment',
    commands: ['!queue add "Burna Boy - Last Last"', '!queue list', '!queue next', '!queue clear'],
    setup: 'Members add songs to the queue. Use !queue next to download and share the next track. Admin can clear the queue anytime.',
    likes: 145,
    verified: false,
  },
  {
    id: 'expense-splitter',
    title: 'Group Expense Splitter',
    description: 'Track shared expenses in group trips or events. The bot calculates who owes whom automatically.',
    author: 'TravelGroup_IN',
    platform: 'Both',
    category: 'Utility',
    commands: ['!expense add 5000 "dinner" @user1 @user2', '!expense summary', '!expense settle @user1'],
    setup: 'Add expenses as they happen. The bot keeps a running tab and calculates the optimal settlement when the trip ends.',
    likes: 178,
    verified: false,
  },
  {
    id: 'prayer-request',
    title: 'Prayer Request Board',
    description: 'Members submit anonymous prayer requests. The bot collects them and shares a weekly prayer list with the group.',
    author: 'FaithGroup_NG',
    platform: 'WhatsApp',
    category: 'Community',
    commands: ['!pray "Please pray for my exams"', '!prayers list', '!prayers weekly'],
    setup: 'Members DM the bot with prayer requests using !pray. The bot anonymizes and compiles them. Admin triggers the weekly summary.',
    likes: 267,
    verified: true,
  },
];

const categories = ['All', 'Moderation', 'Engagement', 'Education', 'Business', 'Entertainment', 'Utility', 'Community'];

const categoryColors: Record<string, string> = {
  Moderation: 'badge-error',
  Engagement: 'badge-success',
  Education: 'badge-info',
  Business: 'badge-warning',
  Entertainment: 'badge-secondary',
  Utility: 'badge-primary',
  Community: 'badge-accent',
};

export default function CommunityCommandsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-base-100">
        {/* Hero */}
        <section className="py-16 px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Community <span className="text-primary">Commands</span>
            </h1>
            <p className="text-lg text-base-content/70 max-w-2xl mx-auto mb-8">
              Discover creative bot automations built by the BotWave community. From study timers
              to vendor catalogs — see how others are using BotWave and share your own setups.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="#submit"
                className="btn btn-primary"
              >
                Submit Your Command
              </a>
              <Link
                href="/commands"
                className="btn btn-ghost"
              >
                View Official Commands
              </Link>
            </div>
          </div>
        </section>

        {/* Category filters */}
        <section className="px-4 pb-4">
          <div className="max-w-6xl mx-auto flex flex-wrap gap-2 justify-center">
            {categories.map((cat) => (
              <span
                key={cat}
                className={`badge badge-lg cursor-pointer hover:badge-primary ${cat === 'All' ? 'badge-primary' : 'badge-outline'}`}
              >
                {cat}
              </span>
            ))}
          </div>
        </section>

        {/* Commands Grid */}
        <section className="py-8 px-4">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
            {communityCommands.map((cmd) => (
              <div
                key={cmd.id}
                className="bg-base-200 rounded-2xl p-6 border border-base-300 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      {cmd.title}
                      {cmd.verified && (
                        <span className="tooltip tooltip-right" data-tip="Verified by BotWave team">
                          <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-base-content/60">by {cmd.author}</p>
                  </div>
                  <div className="flex items-center gap-1 text-base-content/50 text-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                    </svg>
                    {cmd.likes}
                  </div>
                </div>

                <p className="text-sm text-base-content/70 mb-4">{cmd.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`badge badge-sm ${categoryColors[cmd.category] || 'badge-ghost'}`}>
                    {cmd.category}
                  </span>
                  <span className="badge badge-sm badge-outline">{cmd.platform}</span>
                </div>

                <div className="bg-base-300 rounded-lg p-3 mb-3">
                  <p className="text-xs font-mono text-base-content/80 mb-1 font-semibold">Commands:</p>
                  {cmd.commands.map((c, i) => (
                    <code key={i} className="block text-xs text-primary/80 font-mono">
                      {c}
                    </code>
                  ))}
                </div>

                <p className="text-xs text-base-content/60">
                  <strong>Setup:</strong> {cmd.setup}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Submit Section */}
        <section id="submit" className="py-16 px-4 bg-base-200/50">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">
              Share Your Command Setup
            </h2>
            <p className="text-base-content/70 text-center mb-8">
              Built something cool with BotWave? Share it with the community! All submissions are
              reviewed by our team before publishing.
            </p>

            <div className="bg-base-100 rounded-2xl p-6 md:p-8 border border-base-300">
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Command Title</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Group Study Timer"
                    className="input input-bordered w-full"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Description</span>
                  </label>
                  <textarea
                    placeholder="What does your automation do? How does it help group members?"
                    className="textarea textarea-bordered w-full h-24"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">Platform</span>
                    </label>
                    <select className="select select-bordered w-full">
                      <option>WhatsApp</option>
                      <option>Telegram</option>
                      <option>Both</option>
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">Category</span>
                    </label>
                    <select className="select select-bordered w-full">
                      <option>Moderation</option>
                      <option>Engagement</option>
                      <option>Education</option>
                      <option>Business</option>
                      <option>Entertainment</option>
                      <option>Utility</option>
                      <option>Community</option>
                    </select>
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Commands Used</span>
                  </label>
                  <textarea
                    placeholder="List the commands (one per line):&#10;!study start 25&#10;!study break&#10;!study stats"
                    className="textarea textarea-bordered w-full h-24 font-mono text-sm"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Setup Instructions</span>
                  </label>
                  <textarea
                    placeholder="How should someone set this up? Step by step."
                    className="textarea textarea-bordered w-full h-20"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Your Name / Handle</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., GroupAdmin_NG"
                    className="input input-bordered w-full"
                  />
                </div>

                <button className="btn btn-primary w-full mt-2">
                  Submit for Review
                </button>
                <p className="text-xs text-base-content/50 text-center">
                  Submissions are reviewed by the BotWave team within 48 hours. We may edit for
                  clarity before publishing.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-base-content/70 mb-4">
              Don&apos;t have a bot yet? Create your free account and start automating.
            </p>
            <Link href="/signup" className="btn btn-primary">
              Get Started Free
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
