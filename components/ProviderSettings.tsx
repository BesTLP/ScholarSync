import React, { useMemo, useState } from 'react';
import { KeyRound, RefreshCw, Save, Server, Sparkles } from 'lucide-react';
import type { ScholarSyncDesktopConfig } from '../desktop';
import { getDesktopPaths, getRuntimeConfig, updateRuntimeConfig } from '../services/persistentStorage';

type ProviderOption = ScholarSyncDesktopConfig['preferredProvider'];

const providerOptions: Array<{ value: ProviderOption; label: string; description: string }> = [
  { value: 'openai', label: 'OpenAI / GPT', description: '优先用于文书、解析、聊天等文本任务。' },
  { value: 'gemini', label: 'Google Gemini', description: '适合联网检索、图片、多模态等 Gemini 能力。' },
];

const ProviderSettings: React.FC = () => {
  const [form, setForm] = useState<ScholarSyncDesktopConfig>(() => getRuntimeConfig());
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const desktopPaths = useMemo(() => getDesktopPaths(), []);

  const handleChange = <K extends keyof ScholarSyncDesktopConfig>(key: K, value: ScholarSyncDesktopConfig[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleReset = () => {
    setForm(getRuntimeConfig());
    setStatusMessage('已重新读取当前配置。');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage('');
    try {
      const next = await updateRuntimeConfig(form);
      setForm(next);
      setStatusMessage('AI 配置已保存。新的请求会按当前 provider 顺序生效。');
    } catch (error) {
      console.error('Failed to save runtime config:', error);
      setStatusMessage('保存失败，请稍后重试。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-blue-50/60 p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                <Sparkles size={14} />
                AI Settings
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">模型与 API 配置</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                这里可以直接配置默认 provider、回退 provider、模型名和 API Key。用户以后只需要在界面里填写，不需要再去改本地配置文件。
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 px-5 py-4 text-sm text-slate-600">
              <div className="font-bold text-slate-900">当前策略</div>
              <div className="mt-2">默认：{form.preferredProvider === 'openai' ? 'GPT' : 'Gemini'}</div>
              <div>回退：{form.fallbackProvider === 'openai' ? 'GPT' : 'Gemini'}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-6 rounded-[32px] border border-white/70 bg-white/85 p-8 shadow-sm backdrop-blur">
            <div>
              <div className="flex items-center gap-3 text-slate-900">
                <Server size={20} />
                <h2 className="text-xl font-black">Provider 顺序</h2>
              </div>
              <p className="mt-2 text-sm text-slate-500">建议保持 GPT 为默认，Gemini 为回退。这样文书与聊天优先走 GPT，OpenAI 出现额度或请求失败时再退回 Gemini。</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">默认 Provider</div>
                <select
                  value={form.preferredProvider}
                  onChange={(event) => handleChange('preferredProvider', event.target.value as ProviderOption)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
                >
                  {providerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">回退 Provider</div>
                <select
                  value={form.fallbackProvider}
                  onChange={(event) => handleChange('fallbackProvider', event.target.value as ProviderOption)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
                >
                  {providerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">OpenAI 模型</div>
                <input
                  value={form.openaiModel}
                  onChange={(event) => handleChange('openaiModel', event.target.value)}
                  placeholder="gpt-5"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
                />
              </label>
              <label className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Gemini 模型</div>
                <input
                  value={form.geminiModel}
                  onChange={(event) => handleChange('geminiModel', event.target.value)}
                  placeholder="gemini-2.5-flash"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
                />
              </label>
            </div>

            <div className="space-y-4">
              <label className="space-y-2 block">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  <KeyRound size={14} />
                  OpenAI API Key
                </div>
                <input
                  type="password"
                  value={form.openaiApiKey}
                  onChange={(event) => handleChange('openaiApiKey', event.target.value)}
                  placeholder="sk-..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800"
                />
              </label>

              <label className="space-y-2 block">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  <KeyRound size={14} />
                  Gemini API Key
                </div>
                <input
                  type="password"
                  value={form.geminiApiKey}
                  onChange={(event) => handleChange('geminiApiKey', event.target.value)}
                  placeholder="AIza..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                保存配置
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                <RefreshCw size={16} />
                重新读取
              </button>
              {statusMessage && <div className="text-sm font-medium text-slate-500">{statusMessage}</div>}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/70 bg-white/85 p-7 shadow-sm backdrop-blur">
              <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Provider 说明</div>
              <div className="mt-4 space-y-4">
                {providerOptions.map((option) => (
                  <div key={option.value} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="text-sm font-bold text-slate-900">{option.label}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-600">{option.description}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/70 bg-white/85 p-7 shadow-sm backdrop-blur">
              <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">配置落点</div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <div>桌面版会同步写入本地 provider 配置。</div>
                {desktopPaths?.configPath && (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 font-mono text-xs text-slate-500">
                    {desktopPaths.configPath}
                  </div>
                )}
                <div>如果是纯浏览器模式，会回退保存到当前浏览器的本地存储。</div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProviderSettings;
