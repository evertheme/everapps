import { Zap } from 'lucide-react';
import FaqAccordion from '@/components/marketing/FaqAccordion';
import {
  FEATURES,
  FAQS,
  HOW_IT_WORKS,
  Sparkles,
  USE_CASES,
} from '@/lib/marketing-landing-content';

export default function ComingSoonLanding() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white pt-20 pb-28 sm:pt-28 sm:pb-36">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-brand-200/30 blur-3xl"
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 rounded-full px-4 py-1.5 text-sm font-medium mb-8 ring-1 ring-brand-200">
            <Sparkles className="w-3.5 h-3.5" />
            Coming soon
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.08] mb-6">
            From requirements
            <br />
            <span className="text-brand-600">to user stories</span>
            <br />
            in seconds
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-6 leading-relaxed">
            Upload your product docs, let AI generate a structured backlog, review story quality
            automatically, and push everything straight to JIRA, Asana, Trello, or Azure DevOps.
          </p>

          <p className="text-base text-gray-600 max-w-xl mx-auto leading-relaxed">
            everapps is launching soon. We&apos;re putting the finishing touches on the product;
            check back here for updates.
          </p>
        </div>
      </section>

      <section className="py-24 bg-gray-50">
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

      <section className="py-24 bg-white">
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
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${item.color}`}
                  >
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

      <section className="py-24 bg-gray-50">
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
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${feature.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-14 bg-white rounded-2xl border border-gray-200 p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-brand-600" />
              <span className="font-semibold text-gray-900">Compatible with your existing stack</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-gray-500">
              {['JIRA', 'Asana', 'Trello', 'Azure DevOps', 'OpenAI', 'Anthropic', 'Azure AI', 'Ollama'].map(
                (name) => (
                  <span key={name} className="px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                    {name}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Frequently asked questions
            </h2>
            <p className="text-lg text-gray-500">
              Questions? Reach us at hello@everapps.io
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-8 py-2">
            <FaqAccordion items={FAQS} />
          </div>
        </div>
      </section>
    </>
  );
}
