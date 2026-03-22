import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  FileText,
  Bot,
  Plug,
  ClipboardCheck,
  Download,
  Wand2,
  LayoutDashboard,
  GitBranch,
  Users,
  Rocket,
  CheckCircle,
  ArrowRight,
  Zap,
} from 'lucide-react';
import FaqAccordion from '@/components/marketing/FaqAccordion';

/* ─── Data ─────────────────────────────────────────────────────────────────── */

const USE_CASES = [
  {
    icon: LayoutDashboard,
    color: 'bg-violet-100 text-violet-600',
    title: 'Product Managers',
    description:
      'Turn PRDs, specs, and stakeholder notes into a fully structured backlog in seconds — no manual story writing required.',
  },
  {
    icon: GitBranch,
    color: 'bg-blue-100 text-blue-600',
    title: 'Engineering Teams',
    description:
      'Get consistently formatted stories with clear acceptance criteria so engineers can start sprinting without back-and-forth clarifications.',
  },
  {
    icon: Users,
    color: 'bg-emerald-100 text-emerald-600',
    title: 'Agile Coaches',
    description:
      'Enforce story quality standards automatically. Every story is AI-reviewed for clarity, completeness, testability, and business value.',
  },
  {
    icon: Rocket,
    color: 'bg-amber-100 text-amber-600',
    title: 'Startups',
    description:
      'Move from idea to sprint-ready backlog without a dedicated BA. Bring your own LLM key and keep costs minimal.',
  },
];

const FEATURES = [
  {
    icon: Wand2,
    color: 'bg-brand-100 text-brand-600',
    title: 'AI Story Generation',
    description:
      'Upload requirement documents and get a full backlog of well-structured user stories with acceptance criteria and story points — instantly.',
  },
  {
    icon: FileText,
    color: 'bg-indigo-100 text-indigo-600',
    title: 'Multi-format Document Parsing',
    description:
      'Import requirements from .docx, .pdf, .txt, and .md files. everapps extracts the content and feeds it to your chosen LLM.',
  },
  {
    icon: Bot,
    color: 'bg-cyan-100 text-cyan-600',
    title: 'Multi-LLM Support',
    description:
      'Bring your own API key for OpenAI, Anthropic Claude, Azure OpenAI, or run fully local models via Ollama.',
  },
  {
    icon: Plug,
    color: 'bg-rose-100 text-rose-600',
    title: 'PM Tool Integrations',
    description:
      'Push stories directly to JIRA, Asana, Trello, or Azure DevOps with one click — no copy-pasting, no manual imports.',
  },
  {
    icon: ClipboardCheck,
    color: 'bg-teal-100 text-teal-600',
    title: 'AI Story Review',
    description:
      'Every story is scored on clarity, completeness, testability, independence, and business value so you ship quality backlogs.',
  },
  {
    icon: Download,
    color: 'bg-orange-100 text-orange-600',
    title: 'Bulk Export',
    description:
      'Select any number of stories and export them to your PM tool in a single operation. Version history is tracked throughout.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Upload your requirements',
    description:
      'Drag and drop a Word doc, PDF, markdown file, or plain text. everapps parses the content automatically.',
  },
  {
    step: '02',
    title: 'AI generates your stories',
    description:
      'Your chosen LLM reads the requirements and produces user stories complete with acceptance criteria, priority, and point estimates.',
  },
  {
    step: '03',
    title: 'Review, refine, and export',
    description:
      'AI reviews each story for quality. Edit inline, then push the entire backlog to JIRA, Asana, Trello, or Azure DevOps.',
  },
];

const FAQS = [
  {
    question: 'What document formats does everapps support?',
    answer:
      'everapps parses .docx (Word), .pdf, .txt, and .md files. You can upload multiple documents per project and everapps will track each version separately.',
  },
  {
    question: 'Which LLM providers can I use?',
    answer:
      'You can connect OpenAI (GPT-4 / GPT-3.5), Anthropic Claude, Azure OpenAI, or a locally-hosted Ollama model. Just provide your API key in Settings — everapps never stores it in plaintext.',
  },
  {
    question: 'Which project management tools are supported?',
    answer:
      'everapps integrates with JIRA, Asana, Trello, and Azure DevOps. You can configure multiple integrations and choose which one to export to on a per-story basis.',
  },
  {
    question: 'How does the AI story review work?',
    answer:
      'After stories are generated, you can trigger an AI review that scores each story across five dimensions: clarity, completeness, testability, independence, and business value. It also surfaces specific improvement suggestions.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Yes. Integration credentials are encrypted at rest using AES-256 (Fernet). Your documents are stored only within your own deployment. We never train models on your data.',
  },
  {
    question: "What's the difference between plans?",
    answer:
      'The Free plan is great for individuals and small experiments. Hobby unlocks AI review and more projects. Growth gives unlimited usage for growing teams. Enterprise adds SSO, custom integrations, dedicated support, and an SLA.',
  },
];

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token');
  if (token?.value) {
    redirect('/dashboard');
  }

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white pt-20 pb-28 sm:pt-28 sm:pb-36">
        {/* Subtle background orb */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-brand-200/30 blur-3xl"
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 rounded-full px-4 py-1.5 text-sm font-medium mb-8 ring-1 ring-brand-200">
            <Sparkles className="w-3.5 h-3.5" />
            AI-powered backlog generation
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.08] mb-6">
            From requirements
            <br />
            <span className="text-brand-600">to user stories</span>
            <br />
            in seconds
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your product docs, let AI generate a structured backlog, review story quality
            automatically, and push everything straight to JIRA, Asana, Trello, or Azure DevOps.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-8 py-3.5 text-base font-semibold text-white shadow-md hover:bg-brand-700 transition-colors"
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-300 px-8 py-3.5 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              View pricing
            </Link>
          </div>

          <p className="mt-5 text-sm text-gray-400">
            No credit card required &middot; Free tier available
          </p>
        </div>
      </section>

      {/* ── Overview / How it works ──────────────────────────────────────── */}
      <section id="overview" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">How it works</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Three steps from messy requirement docs to a clean, reviewed, exported backlog.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step) => (
              <div
                key={step.step}
                className="relative bg-white rounded-2xl border border-gray-200 p-8 shadow-sm"
              >
                <div className="text-5xl font-black text-brand-100 mb-4 leading-none select-none">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use Cases ───────────────────────────────────────────────────── */}
      <section id="use-cases" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Built for every team</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Whether you&apos;re a solo PM or a growing engineering org, everapps fits your workflow.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {USE_CASES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to ship faster
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              everapps handles the entire journey from raw requirements to a PM-tool-ready backlog.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${feature.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>

          {/* Social proof strip */}
          <div className="mt-14 bg-white rounded-2xl border border-gray-200 p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-brand-600" />
              <span className="font-semibold text-gray-900">Compatible with your existing stack</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-gray-500">
              {['JIRA', 'Asana', 'Trello', 'Azure DevOps', 'OpenAI', 'Anthropic', 'Azure AI', 'Ollama'].map(
                (name) => (
                  <span
                    key={name}
                    className="px-3 py-1 rounded-full bg-gray-100 text-gray-600"
                  >
                    {name}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQs ────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Frequently asked questions
            </h2>
            <p className="text-lg text-gray-500">
              Still have questions?{' '}
              <Link href="mailto:hello@everapps.io" className="text-brand-600 hover:underline">
                Drop us a line.
              </Link>
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-8 py-2">
            <FaqAccordion items={FAQS} />
          </div>
        </div>
      </section>

      {/* ── Signup CTA ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-brand-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Sparkles className="w-10 h-10 text-brand-200 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5 tracking-tight">
            Start building better backlogs today
          </h2>
          <p className="text-lg text-brand-200 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join product teams that have replaced hours of manual story writing with minutes of AI-powered generation. Free to start, no credit card needed.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-brand-600 shadow-md hover:bg-brand-50 transition-colors"
            >
              Create a free account
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-400 bg-transparent px-8 py-3.5 text-base font-semibold text-white hover:bg-brand-500 transition-colors"
            >
              See pricing
            </Link>
          </div>

          <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-brand-200">
            {[
              'Free tier — always',
              'No credit card required',
              'Cancel anytime',
              'Bring your own LLM key',
            ].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
