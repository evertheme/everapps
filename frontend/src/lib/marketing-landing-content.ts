import type { LucideIcon } from 'lucide-react';
import {
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
} from 'lucide-react';

export const USE_CASES: {
  icon: LucideIcon;
  color: string;
  title: string;
  description: string;
}[] = [
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

export const FEATURES: {
  icon: LucideIcon;
  color: string;
  title: string;
  description: string;
}[] = [
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

export const HOW_IT_WORKS = [
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

export const FAQS = [
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

export { Sparkles } from 'lucide-react';
