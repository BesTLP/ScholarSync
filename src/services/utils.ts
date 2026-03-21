import * as XLSX from 'xlsx';
import { FacultyRecord, FacultyProject } from '../../types';

/**
 * Normalization utilities for faculty classification
 */

export const normalizeCountry = (country: string): string => {
  if (!country) return '未分类';
  const c = country.trim().toLowerCase();
  
  // China aliases
  if (c === 'china' || c === 'prc' || c === '中国' || c === '中华人民共和国') return '中国';
  if (c === 'hong kong' || c === 'hk' || c === '香港' || c === '中国香港') return '中国香港';
  if (c === 'macau' || c === 'macao' || c === '澳门' || c === '中国澳门') return '中国澳门';
  if (c === 'taiwan' || c === 'tw' || c === '台湾' || c === '中国台湾') return '中国台湾';
  
  // USA aliases
  if (c === 'usa' || c === 'united states' || c === 'us' || c === '美国' || c === '美利坚合众国') return '美国';
  
  // UK aliases
  if (c === 'uk' || c === 'united kingdom' || c === 'britain' || c === '英国' || c === '大不列颠及北爱尔兰联合王国') return '英国';
  
  // Australia aliases
  if (c === 'australia' || c === 'au' || c === '澳洲' || c === '澳大利亚') return '澳大利亚';
  
  // Canada aliases
  if (c === 'canada' || c === 'ca' || c === '加拿大') return '加拿大';
  
  // Singapore aliases
  if (c === 'singapore' || c === 'sg' || c === '新加坡') return '新加坡';

  // Japan aliases
  if (c === 'japan' || c === 'jp' || c === '日本') return '日本';

  // Germany aliases
  if (c === 'germany' || c === 'de' || c === '德国') return '德国';

  // France aliases
  if (c === 'france' || c === 'fr' || c === '法国') return '法国';

  // Default: return trimmed original if not matched
  return country.trim();
};

export const normalizeProvinceState = (province: string, country: string): string => {
  if (!province) return '';
  const p = province.trim().toLowerCase();
  const c = normalizeCountry(country);

  if (c === '中国') {
    // Common Chinese provinces
    if (p.includes('北京')) return '北京';
    if (p.includes('上海')) return '上海';
    if (p.includes('天津')) return '天津';
    if (p.includes('重庆')) return '重庆';
    if (p.includes('广东')) return '广东';
    if (p.includes('浙江')) return '浙江';
    if (p.includes('江苏')) return '江苏';
    if (p.includes('福建')) return '福建';
    if (p.includes('山东')) return '山东';
    if (p.includes('河南')) return '河南';
    if (p.includes('湖北')) return '湖北';
    if (p.includes('湖南')) return '湖南';
    if (p.includes('河北')) return '河北';
    if (p.includes('山西')) return '山西';
    if (p.includes('陕西')) return '陕西';
    if (p.includes('四川')) return '四川';
    if (p.includes('辽宁')) return '辽宁';
    if (p.includes('吉林')) return '吉林';
    if (p.includes('黑龙江')) return '黑龙江';
    if (p.includes('安徽')) return '安徽';
    if (p.includes('江西')) return '江西';
    if (p.includes('广西')) return '广西';
    if (p.includes('贵州')) return '贵州';
    if (p.includes('云南')) return '云南';
    if (p.includes('内蒙古')) return '内蒙古';
    if (p.includes('西藏')) return '西藏';
    if (p.includes('甘肃')) return '甘肃';
    if (p.includes('青海')) return '青海';
    if (p.includes('宁夏')) return '宁夏';
    if (p.includes('新疆')) return '新疆';
    if (p.includes('海南')) return '海南';
  }

  if (c === '美国') {
    // Common US states
    if (p === 'ca' || p.includes('california') || p.includes('加州') || p.includes('加利福尼亚')) return '加利福尼亚州';
    if (p === 'ny' || p.includes('new york') || p.includes('纽约')) return '纽约州';
    if (p === 'tx' || p.includes('texas') || p.includes('德州') || p.includes('德克萨斯')) return '德克萨斯州';
    if (p === 'ma' || p.includes('massachusetts') || p.includes('麻省') || p.includes('马萨诸塞')) return '马萨诸塞州';
    if (p === 'wa' || p.includes('washington') || p.includes('华盛顿')) return '华盛顿州';
    if (p === 'il' || p.includes('illinois') || p.includes('伊利诺伊')) return '伊利诺伊州';
    if (p === 'pa' || p.includes('pennsylvania') || p.includes('宾州') || p.includes('宾夕法尼亚')) return '宾夕法尼亚州';
    if (p === 'nj' || p.includes('new jersey') || p.includes('新泽西')) return '新泽西州';
    if (p === 'ga' || p.includes('georgia') || p.includes('佐治亚')) return '佐治亚州';
    if (p === 'mi' || p.includes('michigan') || p.includes('密歇根')) return '密歇根州';
  }

  return province.trim();
};

export const normalizeUniversity = (university: string): string => {
  if (!university) return '未知大学';
  const u = university.trim().toLowerCase();

  // Common University Aliases
  if (u.includes('stanford') || u.includes('斯坦福')) return '斯坦福大学';
  if (u.includes('harvard') || u.includes('哈佛')) return '哈佛大学';
  if (u.includes('mit') || u.includes('massachusetts institute of technology') || u.includes('麻省理工')) return '麻省理工学院';
  if (u.includes('oxford') || u.includes('牛津')) return '牛津大学';
  if (u.includes('cambridge') || u.includes('剑桥')) return '剑桥大学';
  if (u.includes('berkeley') || u.includes('ucb') || u.includes('university of california, berkeley')) return '加州大学伯克利分校';
  if (u.includes('cmu') || u.includes('carnegie mellon') || u.includes('卡内基梅隆')) return '卡内基梅隆大学';
  if (u.includes('tsinghua') || u.includes('清华')) return '清华大学';
  if (u.includes('peking') || u.includes('pku') || u.includes('北京大学')) return '北京大学';
  if (u.includes('zhejiang') || u.includes('zju') || u.includes('浙江大学')) return '浙江大学';
  if (u.includes('fudan') || u.includes('复旦')) return '复旦大学';
  if (u.includes('sjtu') || u.includes('shanghai jiao tong') || u.includes('上海交通大学')) return '上海交通大学';

  return university.trim();
};

export const extractEmail = (text: string): { email: string, raw: string } => {
  if (!text) return { email: '', raw: '' };
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  const email = matches ? matches[0] : '';
  return { email, raw: text };
};

export const splitResearchDirection = (text: string): { 
  name: string, 
  title: string, 
  researchAreas: string[], 
  papers: string[],
  raw: string 
} => {
  if (!text) return { name: '', title: '', researchAreas: [], papers: [], raw: '' };
  
  // Heuristic split: Name usually comes first, then title, then research
  const parts = text.split(/[,，\n\r]+/).map(s => s.trim()).filter(Boolean);
  
  let name = '';
  let title = '';
  let researchAreas: string[] = [];
  let papers: string[] = [];
  
  if (parts.length > 0) name = parts[0];
  if (parts.length > 1) {
    const titles = ['professor', 'associate professor', 'assistant professor', 'lecturer', '教授', '副教授', '助理教授', '讲师', '研究员', '副研究员'];
    let titleIdx = -1;
    for (let i = 1; i < Math.min(parts.length, 3); i++) {
        if (titles.some(t => parts[i].toLowerCase().includes(t))) {
            titleIdx = i;
            title = parts[i];
            break;
        }
    }
    
    const startIdx = titleIdx !== -1 ? titleIdx + 1 : 1;
    const remaining = parts.slice(startIdx);
    
    // Try to find papers
    const paperKeywords = ['paper', 'publication', '论文', '发表', 'journal', 'conference'];
    let paperStartIdx = -1;
    for (let i = 0; i < remaining.length; i++) {
        if (paperKeywords.some(k => remaining[i].toLowerCase().includes(k))) {
            paperStartIdx = i;
            break;
        }
    }
    
    if (paperStartIdx !== -1) {
        researchAreas = remaining.slice(0, paperStartIdx);
        papers = remaining.slice(paperStartIdx);
    } else {
        researchAreas = remaining;
    }
  }
  
  return { name, title, researchAreas, papers, raw: text };
};

export const parseXlsxFile = async (file: File): Promise<{
  newFaculty: number,
  mergedFaculty: number,
  appendedProjects: number,
  failedRows: number,
  data: FacultyRecord[]
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with raw headers
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (rows.length < 2) {
          resolve({ newFaculty: 0, mergedFaculty: 0, appendedProjects: 0, failedRows: 0, data: [] });
          return;
        }

        const headers = rows[0].map(h => String(h || '').trim());
        const dataRows = rows.slice(1);
        
        // Find column indices
        const idx = {
          university: headers.findIndex(h => h.includes('学校') || h.includes('University')),
          qs: headers.findIndex(h => h.includes('QS') || h.includes('排名')),
          country: headers.findIndex(h => h.includes('国家') || h.includes('地区') || h.includes('Country')),
          location: headers.findIndex(h => h.includes('地点') || h.includes('城市') || h.includes('Location')),
          facultyInfo: headers.findIndex(h => h.includes('导师') || h.includes('研究方向') || h.includes('Faculty')),
          email: headers.findIndex(h => h.includes('邮箱') || h.includes('Email')),
          profile: headers.findIndex(h => h.includes('主页') || h.includes('Profile')),
          program: headers.findIndex(h => h.includes('项目') || h.includes('专业') || h.includes('Program')),
          deadline: headers.findIndex(h => h.includes('截止') || h.includes('DDL') || h.includes('Deadline')),
          reqs: headers.findIndex(h => h.includes('要求') || h.includes('Requirements')),
          rp: headers.findIndex(h => h.includes('RP')),
          tuition: headers.findIndex(h => h.includes('学费') || h.includes('Tuition')),
          scholarship: headers.findIndex(h => h.includes('奖学金') || h.includes('Scholarship')),
          url: headers.findIndex(h => h.includes('链接') || h.includes('URL'))
        };

        const facultyMap = new Map<string, FacultyRecord>();
        let lastUni = '', lastQs = '', lastCountry = '', lastLocation = '';
        let failedRows = 0;
        let newFacultyCount = 0;
        let mergedFacultyCount = 0;
        let appendedProjectsCount = 0;

        dataRows.forEach(row => {
          // Upward inheritance for blank columns
          const currentUni = String(row[idx.university] || '').trim() || lastUni;
          const currentQs = String(row[idx.qs] || '').trim() || lastQs;
          const currentCountry = String(row[idx.country] || '').trim() || lastCountry;
          const currentLocation = String(row[idx.location] || '').trim() || lastLocation;
          
          lastUni = currentUni;
          lastQs = currentQs;
          lastCountry = currentCountry;
          lastLocation = currentLocation;

          if (!currentUni || idx.facultyInfo === -1) {
            failedRows++;
            return;
          }

          const facultyRaw = String(row[idx.facultyInfo] || '').trim();
          if (!facultyRaw) {
            failedRows++;
            return;
          }

          const { name, title, researchAreas, papers, raw: rawResearch } = splitResearchDirection(facultyRaw);
          const { email, raw: rawEmail } = extractEmail(String(row[idx.email] || ''));
          
          const loc = parseLocationString(currentLocation || currentCountry);
          const country = normalizeCountry(currentCountry || loc.country);
          const university = normalizeUniversity(currentUni);

          // Unique key for faculty: Name + University
          const facultyKey = `${name}_${university}`.toLowerCase();
          
          const project: FacultyProject = {
            id: crypto.randomUUID(),
            programName: String(row[idx.program] || '').trim() || 'Unknown Program',
            programNameEn: String(row[idx.program] || '').trim() || 'Unknown Program',
            deadline: String(row[idx.deadline] || '').trim(),
            applicationReqs: String(row[idx.reqs] || '').trim(),
            rpReqs: String(row[idx.rp] || '').trim(),
            tuition: String(row[idx.tuition] || '').trim(),
            scholarship: String(row[idx.scholarship] || '').trim(),
            programUrl: String(row[idx.url] || '').trim()
          };

          if (facultyMap.has(facultyKey)) {
            const existing = facultyMap.get(facultyKey)!;
            existing.projects.push(project);
            appendedProjectsCount++;
          } else {
            const newFaculty: FacultyRecord = {
              id: crypto.randomUUID(),
              name,
              title,
              university,
              universityEn: currentUni, // Keep original as En if not matched
              qsRanking: currentQs,
              email,
              profileUrl: String(row[idx.profile] || '').trim(),
              researchAreas,
              recentActivities: papers, // Map papers to recentActivities
              rawResearchText: rawResearch,
              country,
              provinceState: loc.provinceState,
              city: loc.city,
              regionPath: [country, loc.provinceState, loc.city].filter(Boolean),
              department: String(row[idx.program] || '').trim(),
              projects: [project],
              fieldCategory: '未分类',
              addedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              source: 'import',
              classificationSource: 'import'
            };
            facultyMap.set(facultyKey, newFaculty);
            newFacultyCount++;
          }
        });

        resolve({
          newFaculty: newFacultyCount,
          mergedFaculty: mergedFacultyCount, // In this logic, merged is when we find existing
          appendedProjects: appendedProjectsCount,
          failedRows,
          data: Array.from(facultyMap.values())
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

export const parseLocationString = (location: string): { country: string, provinceState: string, city: string } => {
  if (!location) return { country: '未分类', provinceState: '', city: '' };
  
  const parts = location.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean);
  
  // Heuristic parsing
  // If "美国德克萨斯州", we want country="美国", provinceState="德克萨斯州"
  let country = '未分类';
  let provinceState = '';
  let city = '';

  const fullStr = location.toLowerCase();

  // Detect Country
  if (fullStr.includes('china') || fullStr.includes('中国')) country = '中国';
  else if (fullStr.includes('usa') || fullStr.includes('united states') || fullStr.includes('美国')) country = '美国';
  else if (fullStr.includes('uk') || fullStr.includes('united kingdom') || fullStr.includes('英国')) country = '英国';
  else if (fullStr.includes('australia') || fullStr.includes('澳洲') || fullStr.includes('澳大利亚')) country = '澳大利亚';
  else if (fullStr.includes('canada') || fullStr.includes('加拿大')) country = '加拿大';
  else if (fullStr.includes('singapore') || fullStr.includes('新加坡')) country = '新加坡';
  else if (parts.length > 0) country = normalizeCountry(parts[parts.length - 1]);

  // Detect Province/State and City
  if (country === '美国') {
    const states = ['california', 'new york', 'texas', 'massachusetts', 'washington', 'illinois', 'pennsylvania', 'new jersey', 'georgia', 'michigan', '加州', '纽约', '德州', '麻省', '华盛顿', '加利福尼亚', '德克萨斯'];
    for (const s of states) {
      if (fullStr.includes(s)) {
        provinceState = normalizeProvinceState(s, '美国');
        break;
      }
    }
  } else if (country === '中国') {
    const provinces = ['北京', '上海', '天津', '重庆', '广东', '浙江', '江苏', '福建', '山东', '河南', '湖北', '湖南', '河北', '山西', '陕西', '四川', '辽宁', '吉林', '黑龙江', '安徽', '江西', '广西', '贵州', '云南', '内蒙古', '西藏', '甘肃', '青海', '宁夏', '新疆', '海南'];
    for (const p of provinces) {
      if (fullStr.includes(p)) {
        provinceState = p;
        break;
      }
    }
    
    const cities = ['西安', '南京', '广州', '深圳', '成都', '武汉', '合肥', '哈尔滨', '杭州', '苏州', '大连', '青岛', '厦门'];
    for (const c of cities) {
      if (fullStr.includes(c)) {
        city = c;
        if (!provinceState) {
          // Infer province from city if needed
          if (c === '西安') provinceState = '陕西';
          if (c === '南京' || c === '苏州') provinceState = '江苏';
          if (c === '广州' || c === '深圳') provinceState = '广东';
          if (c === '成都') provinceState = '四川';
          if (c === '武汉') provinceState = '湖北';
          if (c === '合肥') provinceState = '安徽';
          if (c === '哈尔滨') provinceState = '黑龙江';
          if (c === '杭州') provinceState = '浙江';
        }
        break;
      }
    }
  }

  return { country, provinceState, city };
};
