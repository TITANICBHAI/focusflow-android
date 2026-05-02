import React, { useState } from 'react'

type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy' | 'standalone-block' | 'import-blocklist'
type Tab = 'privacy' | 'terms'

interface Section { title: string; body: string }

const PRIVACY: Section[] = [
  {
    title: 'No Data Collection',
    body: 'FocusFlow-PC does not collect, transmit, store, or process any personal data on any external server. All data — tasks, settings, focus sessions, stats, notes — is stored exclusively in a local SQLite database on your device. Nothing ever leaves your machine.',
  },
  {
    title: 'What Is Stored Locally',
    body: 'FocusFlow stores the following data locally only: your task list and history, focus session logs, settings and preferences, user profile (name, occupation, goals), daily notes, and productivity statistics. This data is never shared with us, third parties, or analytics services.',
  },
  {
    title: 'No Analytics or Tracking',
    body: 'FocusFlow-PC contains no telemetry, crash-reporting SDKs, usage analytics, or advertising SDKs of any kind. We have zero visibility into how you use the app, what tasks you create, how long you focus, or which websites you block.',
  },
  {
    title: 'Browser / Website Activity',
    body: 'The keyword blocker and website blocking features monitor browser window titles and tab URLs locally on your device to enforce your self-configured blocking rules. This monitoring is performed entirely within the app process on your machine and is never transmitted anywhere.',
  },
  {
    title: 'System Hosts File',
    body: 'Website blocking may modify your system hosts file to redirect blocked domains to 127.0.0.1. This is a local OS-level change on your device. FocusFlow only modifies entries it created and restores them cleanly when you remove a domain from the list.',
  },
  {
    title: 'Backup Exports',
    body: 'If you use the Backup & Export feature, the exported JSON file is saved to a location of your choosing on your device. FocusFlow has no access to this file after you save it. The file contains your tasks, settings, and stats — keep it in a safe location.',
  },
  {
    title: 'Open Source & Auditable',
    body: 'The source code for FocusFlow-PC is publicly available at https://github.com/TITANICBHAI/FocusFlow-pc. You can audit every line of code to verify any of the privacy claims above.',
  },
  {
    title: 'Changes to This Policy',
    body: 'If this privacy policy is ever updated, the new version will be included in the next app release and noted in the changelog. Since we collect no data, any changes will only affect what is documented, not your actual data.',
  },
  {
    title: 'Contact',
    body: 'For privacy questions, reach out via the GitHub repository at https://github.com/TITANICBHAI/FocusFlow-pc or through the app listing contact details.',
  },
]

const TERMS: Section[] = [
  {
    title: 'Acceptance',
    body: 'By installing or using FocusFlow-PC you agree to these Terms. If you do not agree, uninstall the app immediately. These Terms may be changed at any time without prior notice. Continued use after any change constitutes your acceptance of the updated Terms.',
  },
  {
    title: 'What FocusFlow Does',
    body: 'FocusFlow-PC is a personal productivity tool that monitors and enforces self-imposed focus sessions and website restrictions on Windows, macOS, and Linux. All enforcement is performed locally on your device and is subject to OS-level limitations beyond FocusFlow\'s control.',
  },
  {
    title: 'Your Sole Responsibility',
    body: 'You are solely responsible for all consequences of configuring, enabling, or disabling any blocking session. FocusFlow and TBTechs bear no responsibility for missed communications, missed deadlines, financial losses, or any other outcome arising while any feature is active or inactive. Use of FocusFlow is entirely at your own risk.',
  },
  {
    title: 'Hosts File Modification',
    body: 'FocusFlow-PC may modify your system\'s hosts file to enforce website blocking. You grant FocusFlow permission to make these changes when you enable website blocking. FocusFlow will only modify entries it created and restores them when domains are removed. You may revoke this permission by disabling all blocking features.',
  },
  {
    title: 'No Warranty',
    body: 'FocusFlow-PC is provided "AS IS" without any warranty of any kind. TBTechs explicitly disclaims any warranty that the app will function correctly on your OS version or hardware configuration. Blocking may fail at any time for any reason, including OS updates, permission changes, or antivirus interference.',
  },
  {
    title: 'No Data Collection',
    body: 'FocusFlow-PC does not collect, transmit, or share any personal data, usage statistics, or behavioral information. All data is stored locally on your device and never leaves it. See the Privacy Policy tab for full details.',
  },
  {
    title: 'Limitation of Liability',
    body: 'To the maximum extent permitted by applicable law, TBTechs, its affiliates, officers, developers, and contributors shall not be liable for any damages of any kind arising out of or related to your use of or inability to use FocusFlow-PC. The aggregate total liability of TBTechs for any and all claims shall not exceed zero (USD $0).',
  },
  {
    title: 'Changes to These Terms',
    body: 'These Terms may be updated, replaced, or removed at any time without prior notice. Continued use after any change constitutes your unconditional acceptance.',
  },
  {
    title: 'Contact',
    body: 'For questions about these terms, reach out via the GitHub repository at https://github.com/TITANICBHAI/FocusFlow-pc. Questions do not alter or waive any provision of these Terms.',
  },
]

export default function PrivacyScreen({ navigate }: { navigate: (p: Page) => void }) {
  const [tab, setTab] = useState<Tab>('privacy')
  const [selectedIdx, setSelectedIdx] = useState(0)

  const sections = tab === 'privacy' ? PRIVACY : TERMS
  const section = sections[selectedIdx] ?? sections[0]

  const switchTab = (t: Tab) => { setTab(t); setSelectedIdx(0) }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('settings')}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          ←
        </button>
        <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center text-xl flex-shrink-0">🔒</div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Privacy & Terms</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">100% local — your data never leaves this device</p>
        </div>

        {/* Tab switcher in header */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
          {(['privacy', 'terms'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${
                tab === t
                  ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t === 'privacy' ? '🔒 Privacy' : '📋 Terms'}
            </button>
          ))}
        </div>

        <a
          href={tab === 'privacy'
            ? 'https://titanicbhai.github.io/FocusFlow/privacy-policy/'
            : 'https://titanicbhai.github.io/FocusFlow/terms-of-service/'
          }
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold transition-colors"
        >
          Open online ↗
        </a>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 overflow-hidden flex">

        {/* LEFT — section index */}
        <div className="w-56 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto py-3">
          <div className="px-4 pb-2">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              {tab === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
            </p>
            <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">Last updated: April 2026</p>
          </div>
          {sections.map((s, i) => (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-750 transition-all ${
                selectedIdx === i
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-l-indigo-500'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-750 border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className={`text-xs font-black flex-shrink-0 mt-0.5 ${selectedIdx === i ? 'text-indigo-400' : 'text-gray-300 dark:text-gray-600'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className={`text-[13px] font-semibold leading-tight ${selectedIdx === i ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'}`}>
                  {s.title}
                </p>
              </div>
            </button>
          ))}

          <div className="px-4 py-4 space-y-2">
            <a
              href="https://github.com/TITANICBHAI/FocusFlow-pc"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <span>⬡</span> Source code on GitHub ↗
            </a>
          </div>
        </div>

        {/* RIGHT — section content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-2xl">
            {/* Trust hero (first load) */}
            {selectedIdx === 0 && (
              <div className="flex gap-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 mb-6">
                <div className="flex flex-col gap-3 flex-1">
                  <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                    {tab === 'privacy' ? '🔒 100% Local — Zero Servers' : '📋 Your Rights & Our Limits'}
                  </p>
                  {tab === 'privacy' ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { icon: '🙅', text: 'No tracking' },
                        { icon: '📡', text: 'No uploads' },
                        { icon: '📊', text: 'No analytics' },
                        { icon: '🍪', text: 'No cookies' },
                        { icon: '🔑', text: 'No accounts' },
                        { icon: '🖥', text: 'Local only' },
                      ].map(({ icon, text }) => (
                        <div key={text} className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-semibold">
                          <span>{icon}</span>{text}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">
                      FocusFlow-PC is provided as-is for personal use. These terms define what we owe you (nothing beyond the software itself) and what you agree to (responsible use at your own risk).
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Section card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl font-black text-indigo-200 dark:text-indigo-800 flex-shrink-0 leading-none mt-0.5">
                  {String(selectedIdx + 1).padStart(2, '0')}
                </span>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight">{section.title}</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{section.body}</p>
            </div>

            {/* Prev / Next */}
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setSelectedIdx(i => Math.max(0, i - 1))}
                disabled={selectedIdx === 0}
                className="text-sm text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 font-semibold transition-colors"
              >
                ← Previous
              </button>
              <span className="text-xs text-gray-300 dark:text-gray-600">{selectedIdx + 1} / {sections.length}</span>
              <button
                onClick={() => setSelectedIdx(i => Math.min(sections.length - 1, i + 1))}
                disabled={selectedIdx === sections.length - 1}
                className="text-sm text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 font-semibold transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
