import React, { useMemo, useState } from 'react';
import { Building2, Globe, Mail, MapPin, Save, User, X } from 'lucide-react';
import { FacultyMember, FacultyProject, FacultyRecord } from '../types';
import { createEmptyMatchReasoning } from '../services/facultyNormalization';

interface FacultyManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (faculty: FacultyMember, country: string, fieldCategory: string, extra?: Partial<FacultyRecord>) => void;
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-1.5 block">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

const initialForm = {
  name: '',
  title: '',
  university: '',
  universityUrl: '',
  school: '',
  department: '',
  email: '',
  profileUrl: '',
  photoUrl: '',
  country: '',
  provinceState: '',
  city: '',
  fieldCategory: '',
  subFieldCategory: '',
  researchAreas: '',
  classificationNote: '',
  programName: '',
  programUrl: '',
  deadlineRaw: '',
  deadlineSourceUrls: '',
  applicationRequirementsRaw: '',
  applicationRequirementsSourceUrls: '',
  rpRequirementsRaw: '',
  rpRequirementsSourceUrls: '',
  tuitionRaw: '',
  tuitionSourceUrls: '',
  scholarshipRaw: '',
  scholarshipSourceUrls: '',
  recommendationReason: '',
};

const FacultyManualEntryModal: React.FC<FacultyManualEntryModalProps> = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState(initialForm);

  const disabled = useMemo(() => !form.name.trim() || !form.university.trim(), [form.name, form.university]);

  if (!isOpen) return null;

  const update = (key: keyof typeof initialForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (disabled) {
      window.alert('请至少填写导师姓名和大学名称。');
      return;
    }

    const researchAreas = form.researchAreas
      .split(/[\n,;，；、]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    const faculty: FacultyMember = {
      name: form.name.trim(),
      title: form.title.trim() || '未知职称',
      university: form.university.trim(),
      school: form.school.trim(),
      department: form.department.trim(),
      matchScore: 0,
      researchAreas,
      alignmentDetails: '',
      activitySummary: '',
      recentActivities: [],
      isActive: true,
      profileUrl: form.profileUrl.trim(),
      photoUrl: form.photoUrl.trim(),
      email: form.email.trim(),
      matchReasoning: createEmptyMatchReasoning(),
    };

    const parseUrlList = (value: string) =>
      value
        .split(/[\n,;，；]+/)
        .map((item) => item.trim())
        .filter(Boolean);

    const shouldCreateProject =
      Boolean(form.programName.trim()) ||
      Boolean(form.programUrl.trim()) ||
      Boolean(form.deadlineRaw.trim()) ||
      Boolean(form.applicationRequirementsRaw.trim()) ||
      Boolean(form.rpRequirementsRaw.trim()) ||
      Boolean(form.tuitionRaw.trim()) ||
      Boolean(form.scholarshipRaw.trim()) ||
      Boolean(form.recommendationReason.trim());

    const projects: FacultyProject[] = shouldCreateProject
      ? [
          {
            id: crypto.randomUUID(),
            programName: form.programName.trim() || '未命名项目',
            programUrl: form.programUrl.trim() || undefined,
            deadlineRaw: form.deadlineRaw.trim() || undefined,
            deadlineSourceUrls: parseUrlList(form.deadlineSourceUrls),
            applicationRequirementsRaw: form.applicationRequirementsRaw.trim() || undefined,
            applicationRequirementsSourceUrls: parseUrlList(form.applicationRequirementsSourceUrls),
            rpRequirementsRaw: form.rpRequirementsRaw.trim() || undefined,
            rpRequirementsSourceUrls: parseUrlList(form.rpRequirementsSourceUrls),
            tuitionRaw: form.tuitionRaw.trim() || undefined,
            tuitionSourceUrls: parseUrlList(form.tuitionSourceUrls),
            scholarshipRaw: form.scholarshipRaw.trim() || undefined,
            scholarshipSourceUrls: parseUrlList(form.scholarshipSourceUrls),
            recommendationReason: form.recommendationReason.trim() || undefined,
          },
        ]
      : [];

    onSave(faculty, form.country.trim(), form.fieldCategory.trim(), {
      source: 'manual',
      universityUrl: form.universityUrl.trim(),
      school: form.school.trim(),
      department: form.department.trim(),
      provinceState: form.provinceState.trim(),
      city: form.city.trim(),
      subFieldCategory: form.subFieldCategory.trim(),
      classificationNote: form.classificationNote.trim(),
      classificationSource: 'manual',
      projects,
    });

    setForm(initialForm);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-3xl border border-white/50 bg-white/90 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <div className="text-lg font-black text-slate-900">手动录入导师</div>
            <div className="text-sm text-slate-500">直接按国家 / 州省 / 城市 / 大学 / 学院 / 系维护规范字段。</div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InputField label="导师姓名" value={form.name} onChange={(value) => update('name', value)} placeholder="例如：Emily Wilson" required />
            <InputField label="职称" value={form.title} onChange={(value) => update('title', value)} placeholder="例如：Associate Professor" />
            <InputField label="大学" value={form.university} onChange={(value) => update('university', value)} placeholder="例如：The University of Melbourne" required />
            <InputField label="院校官网" value={form.universityUrl} onChange={(value) => update('universityUrl', value)} placeholder="https://..." />
            <InputField label="学院 / School" value={form.school} onChange={(value) => update('school', value)} placeholder="例如：Fine Arts and Music" />
            <InputField label="系 / Department" value={form.department} onChange={(value) => update('department', value)} placeholder="例如：Music" />
            <InputField label="邮箱" value={form.email} onChange={(value) => update('email', value)} placeholder="例如：name@university.edu" />
            <InputField label="国家" value={form.country} onChange={(value) => update('country', value)} placeholder="例如：中国 / 美国 / 澳大利亚" />
            <InputField label="州 / 省" value={form.provinceState} onChange={(value) => update('provinceState', value)} placeholder="例如：北京 / 纽约州" />
            <InputField label="城市" value={form.city} onChange={(value) => update('city', value)} placeholder="例如：北京 / 罗彻斯特" />
            <InputField label="一级学科" value={form.fieldCategory} onChange={(value) => update('fieldCategory', value)} placeholder="例如：计算机科学 / 音乐" />
            <InputField label="二级学科" value={form.subFieldCategory} onChange={(value) => update('subFieldCategory', value)} placeholder="例如：人工智能 / 音乐学" />
            <InputField label="导师主页" value={form.profileUrl} onChange={(value) => update('profileUrl', value)} placeholder="https://..." />
            <div className="md:col-span-2">
              <InputField label="头像 URL" value={form.photoUrl} onChange={(value) => update('photoUrl', value)} placeholder="https://..." />
            </div>
            <div className="md:col-span-2">
              <label className="space-y-1.5 block">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">研究方向</div>
                <textarea
                  value={form.researchAreas}
                  onChange={(event) => update('researchAreas', event.target.value)}
                  placeholder="用逗号、分号或换行分隔多个研究方向"
                  className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="space-y-1.5 block">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">分类备注</div>
                <textarea
                  value={form.classificationNote}
                  onChange={(event) => update('classificationNote', event.target.value)}
                  placeholder="记录人工判断依据，便于后续校验。"
                  className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4">
                <div className="text-sm font-bold text-slate-900">项目记录</div>
                <div className="text-xs text-slate-500">手动录入项目名称、申请要求和来源链接。留空则只创建导师主档案。</div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InputField label="项目名称" value={form.programName} onChange={(value) => update('programName', value)} placeholder="例如：PhD Marketing" />
                <InputField label="项目链接" value={form.programUrl} onChange={(value) => update('programUrl', value)} placeholder="https://..." />
                <div className="md:col-span-2">
                  <label className="space-y-1.5 block">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">申请截止日期</div>
                    <textarea
                      value={form.deadlineRaw}
                      onChange={(event) => update('deadlineRaw', event.target.value)}
                      className="min-h-[72px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="space-y-1.5 block">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">截止日期来源 URL</div>
                    <textarea
                      value={form.deadlineSourceUrls}
                      onChange={(event) => update('deadlineSourceUrls', event.target.value)}
                      placeholder="每行一个链接"
                      className="min-h-[72px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="space-y-1.5 block">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">申请要求及材料</div>
                    <textarea
                      value={form.applicationRequirementsRaw}
                      onChange={(event) => update('applicationRequirementsRaw', event.target.value)}
                      className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="space-y-1.5 block">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">申请要求来源 URL</div>
                    <textarea
                      value={form.applicationRequirementsSourceUrls}
                      onChange={(event) => update('applicationRequirementsSourceUrls', event.target.value)}
                      placeholder="每行一个链接"
                      className="min-h-[72px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="space-y-1.5 block">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">RP 要求</div>
                    <textarea
                      value={form.rpRequirementsRaw}
                      onChange={(event) => update('rpRequirementsRaw', event.target.value)}
                      className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="space-y-1.5 block">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">RP 要求来源 URL</div>
                    <textarea
                      value={form.rpRequirementsSourceUrls}
                      onChange={(event) => update('rpRequirementsSourceUrls', event.target.value)}
                      placeholder="每行一个链接"
                      className="min-h-[72px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
                <div>
                  <label className="space-y-1.5 block">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">学费</div>
                    <textarea
                      value={form.tuitionRaw}
                      onChange={(event) => update('tuitionRaw', event.target.value)}
                      className="min-h-[72px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
                <div>
                  <label className="space-y-1.5 block">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">奖学金</div>
                    <textarea
                      value={form.scholarshipRaw}
                      onChange={(event) => update('scholarshipRaw', event.target.value)}
                      className="min-h-[72px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
                <div>
                  <label className="space-y-1.5 block">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">学费来源 URL</div>
                    <textarea
                      value={form.tuitionSourceUrls}
                      onChange={(event) => update('tuitionSourceUrls', event.target.value)}
                      placeholder="每行一个链接"
                      className="min-h-[72px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
                <div>
                  <label className="space-y-1.5 block">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">奖学金来源 URL</div>
                    <textarea
                      value={form.scholarshipSourceUrls}
                      onChange={(event) => update('scholarshipSourceUrls', event.target.value)}
                      placeholder="每行一个链接"
                      className="min-h-[72px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="space-y-1.5 block">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">推荐理由</div>
                    <textarea
                      value={form.recommendationReason}
                      onChange={(event) => update('recommendationReason', event.target.value)}
                      className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><User size={14} /> 导师主实体</span>
            <span className="inline-flex items-center gap-1"><Building2 size={14} /> 组织层级</span>
            <span className="inline-flex items-center gap-1"><MapPin size={14} /> 地理层级</span>
            <span className="inline-flex items-center gap-1"><Mail size={14} /> 联系方式</span>
            <span className="inline-flex items-center gap-1"><Globe size={14} /> 主页链接</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">取消</button>
            <button onClick={handleSave} disabled={disabled} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
              <span className="inline-flex items-center gap-2"><Save size={16} />保存导师</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyManualEntryModal;
