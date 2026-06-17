// Mailbox / temp email feature content pages.
// SEO-focused public marketing pages explaining what the BotWave inbox does,
// mirroring the /commands/telegram/[slug] pattern.

export interface MailboxPage {
  slug: string;
  title: string;
  heading: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  category: 'overview' | 'use-case' | 'how-to' | 'comparison';
  bullets: string[];
  primaryCTA: string;
  secondaryCTA?: string;
}

export const mailboxPages: MailboxPage[] = [
  {
    slug: 'overview',
    title: 'BotWave Mailbox',
    heading: 'A real inbox at @mail.botwave.online, free, with each BotWave account',
    description:
      'Every BotWave user gets a real, persistent email address at @mail.botwave.online with a full inbox right inside the dashboard. Use it for signups, newsletters, support replies, or a clean separation from your main email, no install, no setup.',
    seoTitle: 'BotWave Mailbox, Free Email Address at @mail.botwave.online',
    seoDescription:
      'Free persistent email inbox built into BotWave. Get an @mail.botwave.online address, receive mail in real time, send replies, organize folders. No setup.',
    keywords: ['botwave mailbox', 'free email inbox', '@mail.botwave.online', 'free email address', 'persistent email', 'web inbox'],
    category: 'overview',
    bullets: [
      'Free @mail.botwave.online address linked to your BotWave account',
      'Real inbox with sent, spam and trash folders, not a one-shot temp mail',
      'Send and receive HTML emails directly from the dashboard',
      'Generate extra alias addresses for different sites or projects',
      'Star, mark read, move to spam, delete, like a real email client',
      'Polls inbox every 30 seconds so new mail appears without refresh',
    ],
    primaryCTA: 'Open your mailbox',
    secondaryCTA: 'Create an account',
  },
  {
    slug: 'temp-email-for-signups',
    title: 'Temp email for signups',
    heading: 'Use BotWave Mailbox as a free temp email for any signup',
    description:
      'Skip filling your real inbox with marketing spam. Generate a fresh @mail.botwave.online address, use it to sign up anywhere, and read the confirmation in your BotWave dashboard. The address stays alive as long as you do, unlike disposable services that expire in 10 minutes.',
    seoTitle: 'Free Temp Email for Signups, Persistent Inbox | BotWave',
    seoDescription:
      'Use BotWave Mailbox as a free temp email for any signup. Real, persistent @mail.botwave.online address. Read confirmation emails from any signup, in your dashboard.',
    keywords: ['temp email', 'temp mail for signups', 'free temp email', 'temporary email address', 'disposable email signup', 'signup email'],
    category: 'use-case',
    bullets: [
      'Use it on any site that requires an email to register',
      'Confirmation emails arrive in seconds, no waiting for a one-time code SMS',
      'Address never expires (unlike 10minutemail / guerrillamail)',
      'No risk of someone else getting your inbox, it is yours, tied to your account',
      'Switch between multiple alias addresses for different signups',
    ],
    primaryCTA: 'Generate a temp address',
  },
  {
    slug: 'burner-email-address',
    title: 'Burner email address',
    heading: 'Burner email for sites you do not fully trust',
    description:
      'When a site looks shady or you do not want to give it your real email, generate a burner alias at @mail.botwave.online. If the site sells the address to spammers, you can simply abandon that alias and create another one, your real inbox stays clean.',
    seoTitle: 'Burner Email Address, Free Alias Inbox | BotWave',
    seoDescription:
      'Generate burner email aliases for sites you do not trust. Each alias has its own inbox in your BotWave dashboard. Free, no expiration.',
    keywords: ['burner email', 'burner email address', 'throwaway email', 'alias email', 'email privacy', 'email aliases'],
    category: 'use-case',
    bullets: [
      'Create multiple alias addresses, each with their own filtered view',
      'Burn an alias if it starts getting spam, your account stays intact',
      'See exactly which signup leaked your email, each alias is unique',
      'No real-name linkage to your main email',
    ],
    primaryCTA: 'Make a burner address',
  },
  {
    slug: 'aliases-for-projects',
    title: 'Aliases for projects',
    heading: 'One alias per project, keep your inbox clean',
    description:
      'Working on a side project? Run multiple shops, blogs or experiments? Give each project its own @mail.botwave.online alias. All mail still lands in your BotWave dashboard, but you can filter by alias, mark spam per-alias, and burn one without affecting the others.',
    seoTitle: 'Email Aliases for Multiple Projects, BotWave Mailbox',
    seoDescription:
      'Give each side project, shop, or blog its own @mail.botwave.online alias. Switch between inboxes in the BotWave dashboard. Free.',
    keywords: ['email aliases', 'multiple email addresses', 'email per project', 'project email', 'side project email'],
    category: 'use-case',
    bullets: [
      'Generate as many alias addresses as your plan allows',
      'Each alias has its own inbox view, switch in one click',
      'Daily send count tracked per alias',
      'Friendly labels: tag aliases as "shop", "blog", "github", etc.',
    ],
    primaryCTA: 'Add a project alias',
  },
  {
    slug: 'newsletter-inbox',
    title: 'Newsletter inbox',
    heading: 'Dedicated alias for newsletter subscriptions',
    description:
      'Stop newsletters drowning your real inbox. Create a "newsletters" alias at @mail.botwave.online and use it for every Substack, Hacker News digest, or product update mail. Read them when you want, in one place, without polluting your main email.',
    seoTitle: 'Newsletter-only Inbox, Dedicated Email for Subscriptions',
    seoDescription:
      'Use a dedicated @mail.botwave.online alias for newsletters. Keep your main inbox clean. Free, persistent, with a real reader UI.',
    keywords: ['newsletter inbox', 'newsletter email', 'dedicated newsletter address', 'rss for newsletters', 'newsletter reader'],
    category: 'use-case',
    bullets: [
      'One alias, one inbox view, all your newsletters in chronological order',
      'Mark as read in bulk, star the ones you care about',
      'HTML emails render properly (not stripped to plain text)',
      'No mobile notifications, read on your own schedule',
    ],
    primaryCTA: 'Set up a newsletter alias',
  },
  {
    slug: 'verify-account-email',
    title: 'Account verification email',
    heading: 'Receive any verification email at @mail.botwave.online',
    description:
      'Need to verify an account but do not want to expose your real email? Use your BotWave mailbox. Verification emails from Discord, GitHub, Reddit, dev tools and SaaS products all arrive in seconds, with the activation link clickable from your dashboard.',
    seoTitle: 'Receive Account Verification Emails, BotWave Mailbox',
    seoDescription:
      'Use BotWave Mailbox to receive verification and activation emails for any service. Real, persistent inbox at @mail.botwave.online.',
    keywords: ['account verification email', 'receive verification email', 'verify email free', 'free email for verification', 'signup verification'],
    category: 'use-case',
    bullets: [
      'Most providers (Discord, GitHub, Reddit, etc.) accept @mail.botwave.online',
      'Activation links are clickable, no copy-paste from a code box',
      'Search bar finds the verification email even after months',
      'Folder system means trial signups never crowd out real mail',
    ],
    primaryCTA: 'Get a verification address',
  },
  {
    slug: 'how-to-create-mailbox',
    title: 'How to create your BotWave mailbox',
    heading: 'How to create your BotWave mailbox in 30 seconds',
    description:
      'Step-by-step: sign up at botwave.online, open the dashboard, click "Mailbox" in the side nav, pick a local part (the bit before @mail.botwave.online), confirm. Done. You now have a real inbox.',
    seoTitle: 'How to Create a Free Email Inbox on BotWave',
    seoDescription:
      'Step-by-step guide to creating your @mail.botwave.online inbox. 30 seconds, no payment, no install.',
    keywords: ['how to create email', 'free email inbox setup', 'create temp email', 'free email account', 'how to make an email'],
    category: 'how-to',
    bullets: [
      'Sign up at botwave.online (Google login works)',
      'Open dashboard → Mailbox',
      'Click "Generate New Address"',
      'Choose anything: e.g. john, lola, devhunter, followed by @mail.botwave.online',
      'Optionally add a friendly label like "shop" or "newsletters"',
      'Done, emails sent to that address show up in your dashboard',
    ],
    primaryCTA: 'Open the mailbox',
  },
  {
    slug: 'how-to-send-email',
    title: 'How to send email from BotWave',
    heading: 'How to send an email from your BotWave mailbox',
    description:
      'Sending is just as simple as receiving. Click Compose, type recipient, subject and body, hit send. Your message goes out from your @mail.botwave.online address with a proper From header, so the recipient can reply, and the reply lands back in your dashboard.',
    seoTitle: 'How to Send Email from BotWave Mailbox',
    seoDescription:
      'Send real emails from your @mail.botwave.online address with the Compose button. HTML supported, replies routed back to your dashboard.',
    keywords: ['how to send email', 'send email from temp email', 'free email sender', 'send mail dashboard'],
    category: 'how-to',
    bullets: [
      'Click Compose in the top right of the mailbox',
      'Recipient, subject, body, submit',
      'Daily send limit visible at the top of the inbox',
      'Replies route back to your @mail.botwave.online inbox automatically',
    ],
    primaryCTA: 'Compose an email',
  },
  {
    slug: 'how-to-add-extra-address',
    title: 'How to add an extra alias',
    heading: 'How to add a second @mail.botwave.online alias',
    description:
      'Each plan includes a number of alias addresses. To add one: click the email address at the top of the mailbox to open the switcher, then "Generate New Address". You can choose a separate label so the switcher shows "shop", "newsletters", "personal", whatever helps.',
    seoTitle: 'How to Add Extra Email Aliases on BotWave',
    seoDescription:
      'Step-by-step guide to adding additional @mail.botwave.online alias addresses on your BotWave account.',
    keywords: ['add email alias', 'add email address', 'second email account', 'extra inbox', 'email alias setup'],
    category: 'how-to',
    bullets: [
      'Click your current email in the mailbox header',
      'Choose "+ Generate New Address" at the bottom of the switcher',
      'Pick a local part and an optional label',
      'Switch instantly between aliases in the same dashboard',
    ],
    primaryCTA: 'Add an alias',
  },
  {
    slug: 'mobile-inbox',
    title: 'Mobile inbox',
    heading: 'A full email inbox that actually works on your phone',
    description:
      'BotWave Mailbox is a true mobile-first inbox. Folder strip across the top, full-width email list, tap to read, swipe-style actions for star / spam / delete. Same dashboard URL, no separate app required.',
    seoTitle: 'Mobile-Friendly Email Inbox, Free | BotWave Mailbox',
    seoDescription:
      'Mobile-first inbox with full email reading, sending, folders and aliases. No app install, works from any browser.',
    keywords: ['mobile email inbox', 'mobile temp email', 'phone email inbox', 'email on mobile browser', 'mobile webmail'],
    category: 'use-case',
    bullets: [
      'One-tap folder switching at the top of the screen',
      'Full-width email list, no cramped sidebar',
      'Detail view slides over with a Back button',
      'Compose modal sized for phone screens',
      'Polls every 30s so new mail appears as you scroll',
    ],
    primaryCTA: 'Open mailbox on phone',
  },
  {
    slug: 'unlimited-aliases',
    title: 'Multiple email aliases',
    heading: 'One BotWave account, multiple @mail.botwave.online aliases',
    description:
      'Stop juggling Gmail accounts. With BotWave Mailbox you can hold several @mail.botwave.online aliases under one login, each with its own folder view, daily send counter and label. Switch between them like Slack workspaces.',
    seoTitle: 'Multiple Email Aliases on One Account, BotWave Mailbox',
    seoDescription:
      'Run multiple @mail.botwave.online aliases from one BotWave login. Each alias has its own inbox view. Free.',
    keywords: ['multiple email aliases', 'email alias account', 'multi inbox', 'multiple addresses one account', 'alias switcher'],
    category: 'use-case',
    bullets: [
      'Up to several aliases per account, depending on plan',
      'Each alias has independent inbox / sent / spam / trash',
      'Per-alias daily send limit',
      'Address switcher in the header, one click between inboxes',
      'Label aliases for easy identification',
    ],
    primaryCTA: 'Add another alias',
  },
  {
    slug: 'free-email-without-phone',
    title: 'Free email without phone',
    heading: 'Get a free email address, no phone number, no SMS code',
    description:
      'Gmail and Outlook now demand a phone number, and Yahoo blocks half the world. BotWave Mailbox does not. Sign up with Google or email + password, get your @mail.botwave.online address immediately, no SMS, no phone verification, no waiting list.',
    seoTitle: 'Free Email Without Phone Number, BotWave Mailbox',
    seoDescription:
      'Get a free real email address at @mail.botwave.online without giving a phone number. No SMS verification, no waitlist.',
    keywords: ['free email without phone', 'email no phone number', 'email no sms verification', 'email without phone', 'no phone email'],
    category: 'use-case',
    bullets: [
      'No phone number required to sign up',
      'No SMS verification step',
      'Available in every country where BotWave is available',
      'Works even on networks where Gmail / Outlook are restricted',
    ],
    primaryCTA: 'Sign up without phone',
  },
  {
    slug: 'mailbox-vs-gmail',
    title: 'BotWave Mailbox vs Gmail',
    heading: 'BotWave Mailbox vs Gmail, what is different?',
    description:
      'Gmail is great for primary email. BotWave Mailbox is built for the secondary / disposable use case: a free, persistent @mail.botwave.online address you spin up for signups, side projects, newsletters and verifications, without putting them in your real inbox.',
    seoTitle: 'BotWave Mailbox vs Gmail, Which to Use? | BotWave',
    seoDescription:
      'Side-by-side comparison: BotWave Mailbox vs Gmail. When to use a free @mail.botwave.online alias instead of (or alongside) Gmail.',
    keywords: ['botwave mailbox vs gmail', 'gmail alternative', 'alternative to gmail', 'email vs gmail', 'gmail compare'],
    category: 'comparison',
    bullets: [
      'Gmail: ideal for daily primary email, all your important contacts',
      'BotWave Mailbox: ideal for signups, burners, newsletters, side projects',
      'BotWave does not need a phone number',
      'BotWave lets you spin up multiple aliases without juggling accounts',
      'Use them together, BotWave handles all the noise, Gmail stays clean',
    ],
    primaryCTA: 'Create a BotWave mailbox',
  },
  {
    slug: 'mailbox-vs-10minutemail',
    title: 'BotWave Mailbox vs 10minutemail',
    heading: 'BotWave Mailbox vs 10minutemail / Guerrilla Mail',
    description:
      'Disposable email services like 10minutemail and Guerrilla Mail give you an inbox for 10 minutes, then wipe everything. Great for one-time codes, terrible for anything you might need to come back to. BotWave Mailbox is persistent, same address forever, same inbox forever.',
    seoTitle: 'BotWave Mailbox vs 10minutemail / Guerrilla Mail | BotWave',
    seoDescription:
      'Compare BotWave Mailbox with disposable email services like 10minutemail and Guerrilla Mail. Persistent address vs 10-minute expiry.',
    keywords: ['10minutemail alternative', 'guerrilla mail alternative', 'persistent disposable email', 'temp mail vs 10minutemail', 'better than 10minutemail'],
    category: 'comparison',
    bullets: [
      '10minutemail: expires in 10 minutes, no history, no aliases',
      'BotWave: never expires, full history, multiple aliases per account',
      '10minutemail: cannot send replies',
      'BotWave: can send and receive',
      '10minutemail: anyone else can get the same address later',
      'BotWave: your alias is uniquely yours forever',
    ],
    primaryCTA: 'Try the persistent alternative',
  },
  {
    slug: 'mailbox-vs-protonmail',
    title: 'BotWave Mailbox vs ProtonMail',
    heading: 'BotWave Mailbox vs ProtonMail',
    description:
      'ProtonMail is encrypted at rest and pitched at privacy-conscious users. BotWave Mailbox is a free convenience inbox for signups, aliases and side projects. They solve different problems, and many people use both, Proton for sensitive correspondence, BotWave for everything else.',
    seoTitle: 'BotWave Mailbox vs ProtonMail, When to Use Each',
    seoDescription:
      'Compare BotWave Mailbox (free signup / alias inbox) with ProtonMail (encrypted private email). When each one is the right tool.',
    keywords: ['protonmail alternative', 'protonmail vs', 'mailbox vs protonmail', 'free email vs protonmail', 'email comparison'],
    category: 'comparison',
    bullets: [
      'ProtonMail: end-to-end encryption, private email, paid for full features',
      'BotWave: convenience inbox, no encryption guarantees, free',
      'ProtonMail: one address per account by default',
      'BotWave: multiple aliases per account',
      'Use both, Proton for sensitive, BotWave for noise',
    ],
    primaryCTA: 'Pick the right one for you',
  },
  {
    slug: 'spam-folder',
    title: 'Spam folder',
    heading: 'Spam folder you actually control',
    description:
      'BotWave Mailbox has a real Spam folder, not a black hole. Mark anything as spam, review the spam folder periodically, restore mistakes. Same with Trash: deleting is reversible until you empty the folder yourself.',
    seoTitle: 'Spam Folder, Reviewable, Recoverable | BotWave Mailbox',
    seoDescription:
      'Mark, review and recover spam in your BotWave mailbox. Same with trash, nothing disappears silently.',
    keywords: ['email spam folder', 'review spam', 'recover spam email', 'free spam filter', 'mailbox spam'],
    category: 'use-case',
    bullets: [
      'Spam button on every message',
      'Spam folder fully browsable',
      'Restore from spam if you marked the wrong message',
      'Same recover-from-trash flow',
    ],
    primaryCTA: 'See spam controls',
  },
  {
    slug: 'starred-emails',
    title: 'Starred emails',
    heading: 'Star the messages you care about',
    description:
      'Hit the star icon to flag any email. Stars survive moves between folders, so you can star important verifications, login codes or contract emails without worrying about losing them under a pile of newsletters.',
    seoTitle: 'Starred Emails in BotWave Mailbox',
    seoDescription:
      'Star important emails in your BotWave mailbox. Stars stay with the message across folders.',
    keywords: ['starred email', 'flagged email', 'important email', 'star email', 'email favorites'],
    category: 'use-case',
    bullets: [
      'One-click star / unstar from list or detail view',
      'Stars stay attached to the message even if you move folder',
      'Filter starred messages first',
    ],
    primaryCTA: 'Star your first email',
  },
  {
    slug: 'free-email-for-students',
    title: 'Free email for students',
    heading: 'Free, no-phone email for students',
    description:
      'BotWave originated in the campus community, and Mailbox is built for students who need a clean email for course signups, internship applications, and side hustles, without ever using their personal address.',
    seoTitle: 'Free Email for Students, No Phone Required | BotWave',
    seoDescription:
      'Free email inbox built for African students. @mail.botwave.online address, no phone, persistent. Use it for internships, signups and side hustles.',
    keywords: ['free email for students', 'student email', 'free student email', 'campus email', 'free email no phone'],
    category: 'use-case',
    bullets: [
      'No phone number needed at signup',
      'Works on slow / mobile data',
      'Mobile-first inbox',
      'Use for internship applications, online courses, scholarships',
    ],
    primaryCTA: 'Create your student mailbox',
  },
  {
    slug: 'free-email-for-side-projects',
    title: 'Free email for side projects',
    heading: 'A real email for every side project, no extra Gmail accounts',
    description:
      'Every indie hacker, freelancer or microsaas owner ends up creating fake Gmail accounts for each project. Stop. Create a @mail.botwave.online alias per project, keep them all in one dashboard, get a real From address for transactional and reply emails.',
    seoTitle: 'Email for Side Projects, Aliases Without New Gmail Accounts',
    seoDescription:
      'Use BotWave Mailbox to give every side project / microsaas its own email, without juggling Gmail accounts. Free, persistent, mobile-first.',
    keywords: ['email for side projects', 'email for indie hackers', 'email for microsaas', 'email aliases for projects', 'project inbox'],
    category: 'use-case',
    bullets: [
      'One alias per project, labelled and switchable',
      'Reply from the project address (proper From header)',
      'Per-alias send limit visible in the UI',
      'No risk of crossing wires between projects',
    ],
    primaryCTA: 'Spin up a project mailbox',
  },
  {
    slug: 'free-email-for-shopping',
    title: 'Free email for shopping',
    heading: 'A shopping-only inbox to keep deals (and spam) out of your main email',
    description:
      'Use one @mail.botwave.online alias dedicated to online shopping. Track orders, receive receipts, manage coupons, without ever giving a marketplace your real email. If a shop turns spammy, burn the alias.',
    seoTitle: 'Free Shopping-Only Email Inbox | BotWave Mailbox',
    seoDescription:
      'Free email alias dedicated to online shopping. Track orders and coupons, keep your real email clean.',
    keywords: ['email for shopping', 'shopping email alias', 'email for online shopping', 'email for ecommerce', 'shop email'],
    category: 'use-case',
    bullets: [
      'One alias for all shopping receipts',
      'Filter, search and star orders inside the dashboard',
      'Replies from shops go back to the same alias',
      'Burn the alias if a shop sells your address',
    ],
    primaryCTA: 'Create a shopping alias',
  },
];

export const mailboxCategories: { key: MailboxPage['category']; label: string; description: string }[] = [
  { key: 'overview', label: 'Overview', description: 'What BotWave Mailbox is and why it exists' },
  { key: 'use-case', label: 'Use cases', description: 'Real ways people use their @mail.botwave.online inbox' },
  { key: 'how-to', label: 'How-to', description: 'Step-by-step guides for mailbox features' },
  { key: 'comparison', label: 'Compare', description: 'BotWave Mailbox vs Gmail, ProtonMail, 10minutemail' },
];
